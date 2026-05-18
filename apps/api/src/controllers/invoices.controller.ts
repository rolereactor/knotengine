import { Derivator } from "@qodinger/knot-crypto";
import { IInvoice, Invoice, Merchant, User } from "@qodinger/knot-database";
import {
  Currency,
  SUPPORTED_CURRENCIES,
  checkPlanLimit,
} from "@qodinger/knot-types";
import { getEffectivePlan } from "../core/self-hosted-mode.js";
import * as crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { ConfirmationEngine } from "../core/confirmation-engine.js";
import { PriceOracle } from "../infra/price-feed.js";
import { BlockchainProviderPool } from "../infra/provider-pool.js";
import * as Metrics from "../infra/metrics.js";

export const InvoicesController = {
  createInvoice: async (request: any, reply: FastifyReply) => {
    const stopTimer = Metrics.startTimer();

    try {
      const merchant = request.merchant;
      if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

      const {
        amount_usd,
        currency,
        ttl_minutes,
        metadata,
        description,
        is_testnet,
      } = request.body;

      // Determine network context: is it a testnet invoice?
      const isTestnet = is_testnet === true;
      const network = isTestnet ? "testnet" : "mainnet";

      const envNetwork =
        (process.env.BITCOIN_NETWORK as "bitcoin" | "testnet" | "regtest") ||
        "bitcoin";

      // Safety Rail: Only BTC, LTC, ETH and USDT supported on Testnet
      if (isTestnet && !SUPPORTED_CURRENCIES.includes(currency as Currency)) {
        return reply.code(400).send({
          error: `Testnet is currently only supported for: ${SUPPORTED_CURRENCIES.join(", ")}.`,
        });
      }

      // 🚦 Plan Limit Enforcement: Monthly Invoice Quota
      if (!isTestnet) {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const invoiceCount = await Invoice.countDocuments({
          merchantId: merchant._id,
          createdAt: { $gte: currentMonth },
          "metadata.isTestnet": { $ne: true },
        });

        const effectivePlan = getEffectivePlan(merchant.plan || "starter");
        const { allowed, limit } = checkPlanLimit(
          effectivePlan,
          "maxInvoicesPerMonth",
          invoiceCount,
        );

        if (!allowed) {
          return reply.code(429).send({
            error: `Monthly invoice limit reached (${invoiceCount}/${limit}). Upgrade your plan to increase limits.`,
            limit,
            current: invoiceCount,
            plan: merchant.plan || "starter",
          });
        }

        // 🚦 Plan Limit Enforcement: Monthly Volume Cap
        const volumeResult = await Invoice.aggregate<{
          _id: null;
          total: number;
        }>([
          {
            $match: {
              merchantId: merchant._id,
              createdAt: { $gte: currentMonth },
              status: "confirmed",
              "metadata.isTestnet": { $ne: true },
            },
          },
          { $group: { _id: null, total: { $sum: "$amountUsd" } } },
        ]);

        const currentVolume =
          volumeResult.length > 0 ? volumeResult[0].total : 0;

        const { allowed: volumeAllowed, limit: volumeLimit } = checkPlanLimit(
          effectivePlan,
          "maxMonthlyVolume",
          currentVolume + amount_usd,
        );

        if (!volumeAllowed) {
          return reply.code(429).send({
            error: `Monthly volume cap reached ($${currentVolume.toFixed(2)}/$${volumeLimit.toFixed(2)}). Upgrade your plan to increase limits.`,
            limit: volumeLimit,
            current: currentVolume,
            plan: merchant.plan || "starter",
          });
        }
      }

      // ✅ PERFORMANCE FIX: Parallelize independent operations
      // Price fetching and address derivation don't depend on each other
      const [marketPrice, nextIndex] = await Promise.all([
        PriceOracle.getPrice(currency as Currency),
        (async () => {
          const next = merchant.derivationIndex + 1;
          // Optimistically increment derivation index
          await Merchant.findByIdAndUpdate(merchant._id, {
            $set: { derivationIndex: next },
          });
          return next;
        })(),
      ]);

      // Transparent Pricing: Customer pays exact market rate
      const customerPrice = marketPrice;
      const cryptoAmount = parseFloat((amount_usd / customerPrice).toFixed(8));

      // Derive a unique payment address
      let payAddress: string;

      // Safety Rail: Minimum Invoice Amount
      const minInvoiceAmount = parseFloat(
        process.env.MIN_INVOICE_AMOUNT || "1.00",
      );
      if (amount_usd < minInvoiceAmount) {
        return reply.code(400).send({
          error: `Minimum invoice amount is $${minInvoiceAmount.toFixed(2)}`,
        });
      }

      // Credit Balance Gate
      const user = merchant.userId
        ? await User.findById(merchant.userId)
        : null;
      if (!isTestnet && (!user || user.creditBalance <= 0)) {
        return reply.code(402).send({
          error:
            "Insufficient credit balance. Please top up your account to continue creating invoices.",
          creditBalance: user?.creditBalance || 0,
          topUpWallets: {
            EVM_STABLECOIN: process.env.PLATFORM_FEE_WALLET_EVM || null,
          },
        });
      }

      try {
        if (currency === "BTC" || currency === "LTC") {
          const xpub = isTestnet ? merchant.btcXpubTestnet : merchant.btcXpub;

          if (!xpub) {
            return reply.code(400).send({
              error: `Merchant has no ${currency} ${isTestnet ? "Testnet" : "Mainnet"} xPub configured.`,
            });
          }

          // Map currency and testnet flag to internal network name
          let targetNetwork:
            | "bitcoin"
            | "testnet"
            | "litecoin"
            | "litecoin-testnet";
          if (currency === "BTC") {
            targetNetwork = isTestnet ? "testnet" : "bitcoin";
          } else {
            targetNetwork = isTestnet ? "litecoin-testnet" : "litecoin";
          }

          payAddress = Derivator.deriveUTXOAddress(
            xpub,
            nextIndex,
            targetNetwork,
          );
        } else {
          const ethXpub = isTestnet
            ? merchant.ethXpubTestnet
            : merchant.ethXpub;
          const ethStaticAddr = isTestnet
            ? merchant.ethAddressTestnet
            : merchant.ethAddress;

          if (ethXpub) {
            payAddress = Derivator.deriveEthereumAddress(ethXpub, nextIndex);
          } else if (ethStaticAddr) {
            payAddress = ethStaticAddr;
          } else {
            return reply.code(400).send({
              error: `Merchant has no ETH ${isTestnet ? "Testnet" : "Mainnet"} configuration.`,
            });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Address derivation error: ${message}`);
        return reply.code(400).send({
          error: `Invalid xPub or address configuration: ${message}`,
        });
      }

      // Get required confirmations
      const requiredConfirmations =
        await ConfirmationEngine.getRequiredConfirmations(
          merchant._id.toString(),
          currency,
        );

      // 5. Generate unique invoice ID
      const invoiceId = `inv_${crypto.randomBytes(12).toString("hex")}`;

      // 6. Calculate Fees and Totals
      // Determine the rate based on the plan: Starter: 1.0%, Pro: 0.5%, Enterprise: 0.25%
      const planRates: Record<string, number> = {
        starter: 0.01,
        professional: 0.005,
        enterprise: 0.0025,
      };

      const activeFeeRate = planRates[merchant.plan] || 0.01;
      const minFeeUsd = parseFloat(process.env.MIN_FEE_USD || "0.05");

      let feeUsd = 0;
      let feeCrypto = 0;
      let totalAmountUsd = amount_usd;
      let totalCryptoAmount = cryptoAmount;

      // A. Calculate Base Platform Fee
      const rawBaseFeeUsd = amount_usd * activeFeeRate;
      feeUsd = parseFloat(Math.max(rawBaseFeeUsd, minFeeUsd).toFixed(2));

      // B. Determine logic based on Fee Responsibility
      const feePayer = merchant.feeResponsibility || "merchant";

      if (feePayer === "client") {
        // Add the fee to the invoice amount (pass to client as a hidden spread)
        totalAmountUsd = amount_usd + feeUsd;

        // Recalculate the crypto amount the client actually needs to pay
        totalCryptoAmount = parseFloat(
          (totalAmountUsd / customerPrice).toFixed(8),
        );
      } else {
        // Merchant pays the fee out of their own balance (transparent)
        totalAmountUsd = amount_usd;
        totalCryptoAmount = cryptoAmount;
      }

      // feeCrypto is just for tracking/display relative to the payment
      feeCrypto = parseFloat(
        ((feeUsd / amount_usd) * totalCryptoAmount).toFixed(8),
      );

      // 7. Create the invoice
      const expirationMinutes =
        ttl_minutes || merchant.invoiceExpirationMinutes || 30;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      const invoice = await Invoice.create({
        merchantId: merchant._id,
        invoiceId,
        amountUsd: totalAmountUsd,
        cryptoAmount: totalCryptoAmount,
        cryptoCurrency: currency,
        payAddress,
        feeUsd, // Platform internal tracking
        feeCrypto,
        derivationIndex: nextIndex,
        requiredConfirmations,
        expiresAt,
        description,
        metadata: {
          ...metadata,
          network: envNetwork,
          isTestnet,
          baseAmountUsd: amount_usd, // Track base amount for transparency
          feeResponsibility: merchant.feeResponsibility || "merchant",
        },
      });

      // 8. Update derivation index on merchant (UTXO assets only)
      if (currency === "BTC" || currency === "LTC") {
        await Merchant.findByIdAndUpdate(merchant._id, {
          $set: { derivationIndex: nextIndex },
        });
      }

      console.info(
        `[Invoice] Created ${invoiceId} for ${merchant.name} (Address: ${payAddress})`,
      );

      const checkoutBaseUrl =
        process.env.CHECKOUT_BASE_URL || "http://localhost:5051";
      const checkoutUrl = `${checkoutBaseUrl}/checkout/${invoice.invoiceId}`;

      // Record metrics
      const duration = stopTimer();
      Metrics.invoicesCreatedTotal.inc({ currency, network });
      Metrics.invoiceCreationLatency.observe({ currency }, duration);
      Metrics.invoiceAmountUsd.observe(amount_usd);

      return reply.code(201).send({
        invoice_id: invoice.invoiceId,
        amount_usd: invoice.amountUsd,
        crypto_amount: invoice.cryptoAmount,
        crypto_currency: invoice.cryptoCurrency,
        pay_address: invoice.payAddress,
        expires_at: invoice.expiresAt,
        status: invoice.status,
        checkout_url: checkoutUrl,
        is_testnet: isTestnet,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      stopTimer(); // Stop timer even on error
      return reply.code(500).send({
        error: `Failed to create invoice: ${message}`,
      });
    }
  },

  getInvoiceStatus: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;

    const invoice = await Invoice.findOne({ invoiceId: id }).populate<{
      merchantId: {
        name: string;
        logoUrl?: string;
        returnUrl?: string;
        theme?: string;
        brandColor?: string;
        brandingEnabled: boolean;
        removeBranding: boolean;
        brandingAlignment?: "left" | "center";
        bip21Enabled: boolean;
        plan: string;
      };
    }>(
      "merchantId",
      "name logoUrl returnUrl theme brandColor brandingEnabled removeBranding brandingAlignment bip21Enabled plan",
    );

    if (!invoice) {
      return reply.code(404).send({ error: "Invoice not found" });
    }

    // ON-DEMAND MONITORING: Only subscribe if the invoice is being viewed and is still pending
    const now = new Date();
    const cooldownMs = 5 * 60 * 1000; // 5 minutes
    const isCoolingDown =
      invoice.lastMonitoringAttempt &&
      now.getTime() - invoice.lastMonitoringAttempt.getTime() < cooldownMs;

    if (
      invoice.status === "pending" &&
      !invoice.tatumSubscriptionId &&
      !isCoolingDown &&
      process.env.PUBLIC_URL
    ) {
      // Atomic update to mark attempt and prevent race conditions
      Invoice.findByIdAndUpdate(invoice._id, {
        $set: { lastMonitoringAttempt: now },
        $inc: { monitoringAttempts: 1 },
      }).exec();

      const tatumWebhookUrl = `${process.env.PUBLIC_URL}/v1/webhooks/tatum`;
      const useDualProvider = invoice.merchantId.plan === "enterprise";

      BlockchainProviderPool.getInstance()
        .subscribeAddress(
          invoice.payAddress,
          invoice.cryptoCurrency,
          tatumWebhookUrl,
          useDualProvider,
        )
        .then((result) => {
          if (result) {
            Invoice.findByIdAndUpdate(invoice._id, {
              $set: {
                tatumSubscriptionId: result.subscriptionId,
                providerName: result.providerName,
              },
            }).exec();
          }
        });
    }

    return {
      invoice_id: invoice.invoiceId,
      amount_usd: invoice.amountUsd,
      crypto_amount: invoice.cryptoAmount,
      crypto_amount_received: parseFloat(
        (invoice.cryptoAmountReceived || 0).toFixed(8),
      ),
      crypto_currency: invoice.cryptoCurrency,
      pay_address: invoice.payAddress,
      status: invoice.status,
      confirmations: invoice.confirmations,
      fee_usd: invoice.feeUsd,
      fee_crypto: invoice.feeCrypto,
      required_confirmations: invoice.requiredConfirmations,
      tx_hash: invoice.txHash || null,
      expires_at: invoice.expiresAt.toISOString(),
      paid_at: invoice.paidAt?.toISOString() || null,
      created_at: invoice.createdAt.toISOString(),
      metadata: invoice.metadata,
      description: invoice.description || null,
      checkout_url: `${process.env.CHECKOUT_BASE_URL || "http://localhost:5051"}/checkout/${invoice.invoiceId}`,
      merchant: {
        name: invoice.merchantId.name,
        logo_url: invoice.merchantId.logoUrl || null,
        return_url: invoice.merchantId.returnUrl || null,
        theme: invoice.merchantId.theme || "system",
        brand_color: invoice.merchantId.brandColor || "#ffffff",
        branding_enabled: invoice.merchantId.brandingEnabled ?? true,
        // Enforce plan restriction: Starter tier CANNOT remove branding
        remove_branding:
          (invoice.merchantId.plan || "starter") !== "starter"
            ? (invoice.merchantId.removeBranding ?? false)
            : false,
        branding_alignment: invoice.merchantId.brandingAlignment ?? "left",
        bip21_enabled: invoice.merchantId.bip21Enabled ?? true,
        plan: invoice.merchantId.plan || "starter",
      },
    };
  },

  listInvoices: async (request: any, reply: FastifyReply) => {
    // Rely on type augmentation for the attached merchant from preHandler
    const merchant = request.merchant;

    if (!merchant) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    const {
      status,
      include_testnet = "false",
      only_testnet = "false",
      page = "1",
      limit = "20",
    } = request.query;

    const filter: Record<string, unknown> = { merchantId: merchant._id };
    if (status) {
      filter.status = status;
    }
    if (only_testnet === "true") {
      // Exclusively testnet invoices
      filter["metadata.isTestnet"] = true;
    } else if (include_testnet !== "true") {
      // Default: exclude testnet invoices
      filter["metadata.isTestnet"] = { $ne: true };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Invoice.countDocuments(filter),
    ]);

    return {
      data: invoices.map((inv) => ({
        invoice_id: inv.invoiceId,
        amount_usd: inv.amountUsd,
        crypto_amount: inv.cryptoAmount,
        crypto_amount_received: parseFloat(
          (inv.cryptoAmountReceived || 0).toFixed(8),
        ),
        crypto_currency: inv.cryptoCurrency,
        pay_address: inv.payAddress,
        status: inv.status,
        confirmations: inv.confirmations,
        required_confirmations: inv.requiredConfirmations,
        tx_hash: inv.txHash || null,
        expires_at: inv.expiresAt.toISOString(),
        paid_at: inv.paidAt?.toISOString() || null,
        created_at: inv.createdAt.toISOString(),
        metadata: inv.metadata,
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  },

  cancelInvoice: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });
    const { id } = request.params;

    const invoice = await Invoice.findOne({
      invoiceId: id,
      merchantId: merchant._id,
    });

    if (!invoice) {
      return reply.code(404).send({ error: "Invoice not found" });
    }

    if (invoice.status !== "pending") {
      return reply.code(409).send({
        error: `Cannot cancel invoice with status '${invoice.status}'`,
      });
    }

    await Invoice.findByIdAndUpdate(invoice._id, {
      $set: { status: "expired" },
    });

    console.info(`🚫 Invoice cancelled: ${id}`);

    return { invoice_id: id, status: "expired", cancelled: true };
  },

  resolveInvoice: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });
    const { id } = request.params;

    const invoice = await Invoice.findOne({
      invoiceId: id,
      merchantId: merchant._id,
    });

    if (!invoice) {
      return reply.code(404).send({ error: "Invoice not found" });
    }

    if (["confirmed", "overpaid"].includes(invoice.status)) {
      return reply.code(409).send({
        error: `Invoice is already in a completed state (${invoice.status}).`,
      });
    }

    // Manual Resolution Logic
    const updateData: Partial<IInvoice> = {
      status: "confirmed",
      paidAt: new Date(),
      cryptoAmountReceived: invoice.cryptoAmount,
    };

    await Invoice.findByIdAndUpdate(invoice._id, { $set: updateData });

    // Emit socket update for real-time frontend reactivity
    const SocketService = (await import("../infra/socket-service.js"))
      .SocketService;
    SocketService.emitStatusUpdate(invoice.invoiceId, "confirmed", {
      cryptoAmountReceived: invoice.cryptoAmount,
    });

    // Trigger standard confirmation side-effects
    const WebhookDispatcher = (await import("../infra/webhook-dispatcher.js"))
      .WebhookDispatcher;
    WebhookDispatcher.dispatch(invoice.invoiceId, "invoice.confirmed");

    // Deduct Fees (since the merchant has "accepted" this payment)
    if (!invoice.metadata?.isTestnet) {
      await Merchant.findByIdAndUpdate(invoice.merchantId, {
        $inc: {
          "feesAccrued.usd": invoice.feeUsd,
          [`feesAccrued.${invoice.cryptoCurrency}`]: invoice.feeCrypto,
        },
      });

      if (merchant.userId) {
        await User.findByIdAndUpdate(merchant.userId, {
          $inc: { creditBalance: -invoice.feeUsd },
        });
      }
    }

    const NotificationService = (
      await import("../infra/notification-service.js")
    ).NotificationService;
    await NotificationService.create({
      merchantId: invoice.merchantId.toString(),
      title: invoice.metadata?.isTestnet
        ? "[TEST] Invoice Manually Resolved"
        : "Invoice Manually Resolved",
      description: `You have manually marked invoice ${invoice.invoiceId} as paid.`,
      type: "success",
      link: "/dashboard/payments",
      meta: {
        invoiceId: invoice.invoiceId,
        isTestnet: invoice.metadata?.isTestnet,
      },
    });

    console.info(`✅ Invoice manually resolved: ${id}`);

    return { invoice_id: id, status: "confirmed", resolved: true };
  },
};
