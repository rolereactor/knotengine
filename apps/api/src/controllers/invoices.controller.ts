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
import { CryptoMath } from "../core/crypto-math.js";
import { apiError } from "../utils/api-error.js";
import { RedisClient } from "../infra/redis-client.js";
import { createLightningProvider } from "../infra/lightning-provider.js";
import { childLogger } from "../infra/logger.js";

export const InvoicesController = {
  createInvoice: async (request: any, reply: FastifyReply) => {
    const stopTimer = Metrics.startTimer();

    try {
      const merchant = request.merchant;
      if (!merchant)
        return apiError(
          reply,
          401,
          "unauthorized",
          "Authentication required. Provide a valid API key.",
        );

      const {
        amount_usd,
        currency,
        ttl_minutes,
        metadata,
        description,
        is_testnet,
        line_items,
        payment_method,
      } = request.body;

      // Line items: calculate total from line items if provided
      let resolvedAmountUsd = amount_usd;
      let resolvedLineItems:
        | {
            description: string;
            quantity: number;
            unitPrice: number;
            total: number;
          }[]
        | undefined;

      if (Array.isArray(line_items) && line_items.length > 0) {
        resolvedLineItems = line_items.map(
          (item: {
            description: string;
            quantity: number;
            unit_price: number;
          }) => {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unit_price);
            if (!item.description || quantity < 0 || unitPrice < 0) {
              throw new Error(
                "Invalid line item: description required, quantity and unit_price must be non-negative",
              );
            }
            return {
              description: item.description,
              quantity,
              unitPrice,
              total: Math.round(quantity * unitPrice * 100) / 100,
            };
          },
        );

        const lineItemsTotal = resolvedLineItems.reduce(
          (sum, item) => sum + item.total,
          0,
        );

        if (amount_usd && Math.abs(amount_usd - lineItemsTotal) > 0.01) {
          return apiError(
            reply,
            400,
            "line_items_mismatch",
            `amount_usd (${amount_usd}) does not match line items total (${lineItemsTotal}). Omit amount_usd to auto-calculate from line items.`,
            "amount_usd",
          );
        }

        resolvedAmountUsd = lineItemsTotal;
      }

      // Idempotency: if client sends Idempotency-Key, return cached response on replay
      const idempotencyKey = request.headers["idempotency-key"] as
        | string
        | undefined;
      if (idempotencyKey) {
        const cacheKey = `idempotency:invoice:${merchant._id}:${idempotencyKey}`;
        const cached = await RedisClient.get<object>(cacheKey);
        if (cached) {
          stopTimer();
          return reply
            .code(200)
            .header("Idempotent-Replayed", "true")
            .send(cached);
        }
      }

      // Determine network context: is it a testnet invoice?
      const isTestnet = is_testnet === true;
      const network = isTestnet ? "testnet" : "mainnet";

      const envNetwork =
        (process.env.BITCOIN_NETWORK as "bitcoin" | "testnet" | "regtest") ||
        "bitcoin";

      // Safety Rail: Only supported currencies on Testnet
      if (isTestnet && !SUPPORTED_CURRENCIES.includes(currency as Currency)) {
        return apiError(
          reply,
          400,
          "testnet_currency_unsupported",
          `Testnet is only supported for: ${SUPPORTED_CURRENCIES.join(", ")}.`,
          "currency",
        );
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
          return apiError(
            reply,
            429,
            "invoice_limit_reached",
            `Monthly invoice limit reached (${invoiceCount}/${limit}). Upgrade your plan to increase limits.`,
          );
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
          currentVolume + resolvedAmountUsd,
        );

        if (!volumeAllowed) {
          return apiError(
            reply,
            429,
            "volume_limit_reached",
            `Monthly volume cap reached ($${currentVolume.toFixed(2)}/$${volumeLimit.toFixed(2)}). Upgrade your plan to increase limits.`,
          );
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
      const cryptoAmount = CryptoMath.divide(resolvedAmountUsd, customerPrice);

      // Derive a unique payment address
      let payAddress: string;

      // Safety Rail: Minimum Invoice Amount
      const minInvoiceAmount = parseFloat(
        process.env.MIN_INVOICE_AMOUNT || "1.00",
      );
      if (resolvedAmountUsd < minInvoiceAmount) {
        return apiError(
          reply,
          400,
          "below_minimum_amount",
          `Minimum invoice amount is $${minInvoiceAmount.toFixed(2)}.`,
          "amount_usd",
        );
      }

      // Credit Balance Gate
      const user = merchant.userId
        ? await User.findById(merchant.userId)
        : null;
      if (!isTestnet && (!user || user.creditBalance <= 0)) {
        return apiError(
          reply,
          402,
          "insufficient_credit",
          "Insufficient credit balance. Please top up your account to continue creating invoices.",
        );
      }

      try {
        if (currency === "BTC" || currency === "LTC") {
          const xpub = isTestnet ? merchant.btcXpubTestnet : merchant.btcXpub;

          if (!xpub) {
            return apiError(
              reply,
              400,
              "address_config_missing",
              `Merchant has no ${currency} ${isTestnet ? "testnet" : "mainnet"} xPub configured.`,
            );
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
            return apiError(
              reply,
              400,
              "address_config_missing",
              `Merchant has no ETH ${isTestnet ? "testnet" : "mainnet"} configuration.`,
            );
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        childLogger("invoices").error(`Address derivation error: ${message}`);
        return apiError(
          reply,
          400,
          "address_config_missing",
          "Invalid or missing wallet configuration. Please check your xPub settings.",
        );
      }

      // Get required confirmations
      const requiredConfirmations =
        await ConfirmationEngine.getRequiredConfirmations(
          merchant._id.toString(),
          currency,
        );

      // 5. Generate unique invoice ID
      const invoiceId = `inv_${crypto.randomBytes(12).toString("hex")}`;

      // 6. Calculate expiration
      const expirationMinutes =
        ttl_minutes || merchant.invoiceExpirationMinutes || 30;
      const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

      // Lightning Invoice Creation
      let lightningPaymentRequest: string | undefined;
      let lightningPaymentHash: string | undefined;
      const resolvedPaymentMethod: "onchain" | "lightning" =
        payment_method === "lightning" ? "lightning" : "onchain";

      if (payment_method === "lightning") {
        const lightningProvider = createLightningProvider(merchant);
        if (!lightningProvider) {
          return apiError(
            reply,
            400,
            "lightning_not_configured",
            "Lightning payments are not configured for this merchant. Please enable Lightning in your settings.",
          );
        }

        // Lightning only supports BTC payments
        if (currency !== "BTC") {
          return apiError(
            reply,
            400,
            "lightning_btc_only",
            "Lightning payments are only supported for BTC.",
            "currency",
          );
        }

        try {
          // Convert USD amount to sats (approximate for Lightning)
          const btcAmount = CryptoMath.divide(resolvedAmountUsd, customerPrice);
          const satAmount = Math.round(btcAmount * 100_000_000);

          const expirySeconds = expirationMinutes * 60;
          const lightningInvoice = await lightningProvider.createInvoice(
            satAmount,
            description || `Invoice ${invoiceId}`,
            expirySeconds,
          );

          lightningPaymentRequest = lightningInvoice.paymentRequest;
          lightningPaymentHash = lightningInvoice.paymentHash;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          childLogger("invoices").error(
            `Lightning invoice creation error: ${message}`,
          );
          return apiError(
            reply,
            500,
            "lightning_invoice_error",
            "Failed to create Lightning invoice. Please try again.",
          );
        }
      }

      // 7. Calculate Fees and Totals
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
      let totalAmountUsd = resolvedAmountUsd;
      let totalCryptoAmount = cryptoAmount;

      // A. Calculate Base Platform Fee
      const rawBaseFeeUsd = CryptoMath.multiply(
        resolvedAmountUsd,
        activeFeeRate,
      );
      feeUsd = CryptoMath.toNumber(Math.max(rawBaseFeeUsd, minFeeUsd), 2);

      // B. Determine logic based on Fee Responsibility
      const feePayer = merchant.feeResponsibility || "merchant";

      if (feePayer === "client") {
        // Add the fee to the invoice amount (pass to client as a hidden spread)
        totalAmountUsd = CryptoMath.add(resolvedAmountUsd, feeUsd);

        // Recalculate the crypto amount the client actually needs to pay
        totalCryptoAmount = CryptoMath.divide(totalAmountUsd, customerPrice);
      } else {
        // Merchant pays the fee out of their own balance (transparent)
        totalAmountUsd = resolvedAmountUsd;
        totalCryptoAmount = cryptoAmount;
      }

      // feeCrypto is just for tracking/display relative to the payment
      feeCrypto = CryptoMath.divide(
        CryptoMath.multiply(feeUsd, totalCryptoAmount),
        resolvedAmountUsd,
      );

      // 8. Create the invoice
      const invoice = await Invoice.create({
        merchantId: merchant._id,
        invoiceId,
        amountUsd: totalAmountUsd,
        ...(resolvedLineItems ? { lineItems: resolvedLineItems } : {}),
        cryptoAmount: totalCryptoAmount,
        cryptoCurrency: currency,
        payAddress,
        paymentMethod: resolvedPaymentMethod,
        lightningPaymentRequest,
        lightningPaymentHash,
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

      childLogger("invoices").info(
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

      const responseBody = {
        object: "invoice",
        invoice_id: invoice.invoiceId,
        amount_usd: invoice.amountUsd,
        ...(resolvedLineItems ? { line_items: resolvedLineItems } : {}),
        crypto_amount: invoice.cryptoAmount,
        crypto_currency: invoice.cryptoCurrency,
        pay_address: invoice.payAddress,
        payment_method: invoice.paymentMethod || "onchain",
        ...(invoice.paymentMethod === "lightning" &&
        invoice.lightningPaymentRequest
          ? { lightning_payment_request: invoice.lightningPaymentRequest }
          : {}),
        expires_at: invoice.expiresAt,
        status: invoice.status,
        checkout_url: checkoutUrl,
        is_testnet: isTestnet,
      };

      // Cache the response for idempotency replay (24-hour TTL)
      if (idempotencyKey) {
        const cacheKey = `idempotency:invoice:${merchant._id}:${idempotencyKey}`;
        RedisClient.set(cacheKey, responseBody, 86400).catch(() => {});
      }

      return reply.code(201).send(responseBody);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      childLogger("invoices").error(`Invoice creation error: ${message}`);
      stopTimer();
      return apiError(
        reply,
        500,
        "internal_error",
        "An unexpected error occurred while creating the invoice. Please try again.",
      );
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
      return apiError(
        reply,
        404,
        "invoice_not_found",
        `No invoice found with ID '${id}'.`,
        "id",
      );
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

    const isAuthenticated =
      !!(request as any).user || !!(request as any).merchant;

    const response: Record<string, unknown> = {
      object: "invoice",
      invoice_id: invoice.invoiceId,
      amount_usd: invoice.amountUsd,
      ...(invoice.lineItems ? { line_items: invoice.lineItems } : {}),
      crypto_amount: invoice.cryptoAmount,
      crypto_amount_received: CryptoMath.toFixed(
        invoice.cryptoAmountReceived || 0,
      ),
      crypto_currency: invoice.cryptoCurrency,
      payment_method: invoice.paymentMethod || "onchain",
      ...(invoice.paymentMethod === "lightning" &&
      invoice.lightningPaymentRequest
        ? { lightning_payment_request: invoice.lightningPaymentRequest }
        : {}),
      status: invoice.status,
      confirmations: invoice.confirmations,
      fee_usd: invoice.feeUsd,
      fee_crypto: invoice.feeCrypto,
      required_confirmations: invoice.requiredConfirmations,
      expires_at: invoice.expiresAt.toISOString(),
      paid_at: invoice.paidAt?.toISOString() || null,
      created_at: invoice.createdAt.toISOString(),
      metadata: invoice.metadata,
      description: invoice.description || null,
      checkout_url: `${process.env.CHECKOUT_BASE_URL || "http://localhost:5051"}/checkout/${invoice.invoiceId}`,
    };

    if (isAuthenticated) {
      response.pay_address = invoice.payAddress;
      response.tx_hash = invoice.txHash || null;
      response.merchant = {
        name: invoice.merchantId.name,
        logo_url: invoice.merchantId.logoUrl || null,
        return_url: invoice.merchantId.returnUrl || null,
        theme: invoice.merchantId.theme || "system",
        brand_color: invoice.merchantId.brandColor || "#ffffff",
        branding_enabled: invoice.merchantId.brandingEnabled ?? true,
        remove_branding:
          (invoice.merchantId.plan || "starter") !== "starter"
            ? (invoice.merchantId.removeBranding ?? false)
            : false,
        branding_alignment: invoice.merchantId.brandingAlignment ?? "left",
        bip21_enabled: invoice.merchantId.bip21Enabled ?? true,
        plan: invoice.merchantId.plan || "starter",
      };
    }

    return response;
  },

  listInvoices: async (request: any, reply: FastifyReply) => {
    // Rely on type augmentation for the attached merchant from preHandler
    const merchant = request.merchant;

    if (!merchant) {
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );
    }

    const {
      status,
      include_testnet = "false",
      only_testnet = "false",
      search,
      from,
      to,
      page = "1",
      limit = "20",
    } = request.query;

    const filter: Record<string, unknown> = { merchantId: merchant._id };
    if (status) {
      filter.status = status;
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) {
        const startDate = new Date(from);
        if (isNaN(startDate.getTime())) {
          return apiError(
            reply,
            400,
            "invalid_request",
            "Invalid 'from' date format. Use ISO 8601 datetime strings.",
          );
        }
        dateFilter.$gte = startDate;
      }
      if (to) {
        const endDate = new Date(to);
        if (isNaN(endDate.getTime())) {
          return apiError(
            reply,
            400,
            "invalid_request",
            "Invalid 'to' date format. Use ISO 8601 datetime strings.",
          );
        }
        dateFilter.$lte = endDate;
      }
      if (
        dateFilter.$gte &&
        dateFilter.$lte &&
        dateFilter.$gte > dateFilter.$lte
      ) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "The 'from' date must be before or equal to the 'to' date.",
        );
      }
      filter.createdAt = dateFilter;
    }
    if (only_testnet === "true") {
      // Exclusively testnet invoices
      filter["metadata.isTestnet"] = true;
    } else if (include_testnet !== "true") {
      // Default: exclude testnet invoices
      filter["metadata.isTestnet"] = { $ne: true };
    }
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { "metadata.email": { $regex: search, $options: "i" } },
      ];
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
      object: "list",
      data: invoices.map((inv) => ({
        object: "invoice",
        invoice_id: inv.invoiceId,
        amount_usd: inv.amountUsd,
        ...(inv.lineItems ? { line_items: inv.lineItems } : {}),
        crypto_amount: inv.cryptoAmount,
        crypto_amount_received: CryptoMath.toFixed(
          inv.cryptoAmountReceived || 0,
        ),
        crypto_currency: inv.cryptoCurrency,
        pay_address: inv.payAddress,
        payment_method: inv.paymentMethod || "onchain",
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
    if (!merchant)
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );
    const { id } = request.params;

    const invoice = await Invoice.findOne({
      invoiceId: id,
      merchantId: merchant._id,
    });

    if (!invoice) {
      return apiError(
        reply,
        404,
        "invoice_not_found",
        `No invoice found with ID '${id}'.`,
        "id",
      );
    }

    if (invoice.status !== "pending") {
      return apiError(
        reply,
        409,
        "invoice_already_cancelled",
        `Cannot cancel invoice with status '${invoice.status}'. Only 'pending' invoices can be cancelled.`,
        "id",
      );
    }

    await Invoice.findByIdAndUpdate(invoice._id, {
      $set: { status: "expired" },
    });

    childLogger("invoices").info(`🚫 Invoice cancelled: ${id}`);

    return {
      object: "invoice",
      invoice_id: id,
      status: "expired",
      cancelled: true,
      expires_at: invoice.expiresAt.toISOString(),
      created_at: invoice.createdAt.toISOString(),
    };
  },

  listInvoicesExport: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;

    if (!merchant) {
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );
    }

    const {
      status,
      include_testnet = "false",
      only_testnet = "false",
      search,
      format = "json",
      from,
      to,
    } = request.query;

    const filter: Record<string, unknown> = { merchantId: merchant._id };
    if (status) {
      filter.status = status;
    }
    if (only_testnet === "true") {
      filter["metadata.isTestnet"] = true;
    } else if (include_testnet !== "true") {
      filter["metadata.isTestnet"] = { $ne: true };
    }
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { "metadata.email": { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) {
        const startDate = new Date(from);
        if (isNaN(startDate.getTime())) {
          return apiError(
            reply,
            400,
            "invalid_request",
            "Invalid 'from' date format. Use ISO 8601 datetime strings.",
          );
        }
        dateFilter.$gte = startDate;
      }
      if (to) {
        const endDate = new Date(to);
        if (isNaN(endDate.getTime())) {
          return apiError(
            reply,
            400,
            "invalid_request",
            "Invalid 'to' date format. Use ISO 8601 datetime strings.",
          );
        }
        dateFilter.$lte = endDate;
      }
      if (
        dateFilter.$gte &&
        dateFilter.$lte &&
        dateFilter.$gte > dateFilter.$lte
      ) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "The 'from' date must be before or equal to the 'to' date.",
        );
      }
      filter.createdAt = dateFilter;
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });

    const rows = invoices.map((inv) => ({
      invoice_id: inv.invoiceId,
      amount_usd: inv.amountUsd,
      line_items: inv.lineItems || null,
      crypto_amount: inv.cryptoAmount,
      crypto_amount_received: inv.cryptoAmountReceived || 0,
      crypto_currency: inv.cryptoCurrency,
      pay_address: inv.payAddress,
      status: inv.status,
      confirmations: inv.confirmations,
      required_confirmations: inv.requiredConfirmations,
      tx_hash: inv.txHash || "",
      fee_usd: inv.feeUsd,
      fee_crypto: inv.feeCrypto,
      expires_at: inv.expiresAt.toISOString(),
      paid_at: inv.paidAt?.toISOString() || "",
      created_at: inv.createdAt.toISOString(),
      description: inv.description || "",
      metadata_email: (inv.metadata?.email as string) || "",
    }));

    if (format === "csv") {
      const headers = Object.keys(rows[0] || {});
      const csvLines = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const val = String(row[h as keyof typeof row] ?? "");
              return val.includes(",") ||
                val.includes('"') ||
                val.includes("\n")
                ? `"${val.replace(/"/g, '""')}"`
                : val;
            })
            .join(","),
        ),
      ];
      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="invoices-${Date.now()}.csv"`,
      );
      return reply.send(csvLines.join("\n"));
    }

    return { object: "list", data: rows, total: rows.length };
  },

  bulkCancelInvoices: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;

    if (!merchant) {
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );
    }

    const { invoice_ids } = request.body;

    if (
      !invoice_ids ||
      !Array.isArray(invoice_ids) ||
      invoice_ids.length === 0
    ) {
      return apiError(
        reply,
        400,
        "bulk_cancel_no_ids",
        "Provide a non-empty array of invoice IDs.",
        "invoice_ids",
      );
    }

    const maxBulkSize = 100;
    if (invoice_ids.length > maxBulkSize) {
      return apiError(
        reply,
        400,
        "invalid_request",
        `Cannot cancel more than ${maxBulkSize} invoices at once.`,
        "invoice_ids",
      );
    }

    const result = await Invoice.updateMany(
      {
        invoiceId: { $in: invoice_ids },
        merchantId: merchant._id,
        status: "pending",
      },
      { $set: { status: "expired" } },
    );

    childLogger("invoices").info(
      `Bulk cancel: ${result.modifiedCount}/${invoice_ids.length} invoices expired for merchant ${merchant._id}`,
    );

    return {
      object: "bulk_cancel",
      cancelled_count: result.modifiedCount,
      requested_count: invoice_ids.length,
      ...(result.modifiedCount < invoice_ids.length
        ? {
            note: `${invoice_ids.length - result.modifiedCount} invoice(s) were not cancelled (not found, not pending, or already processed).`,
          }
        : {}),
    };
  },

  resolveInvoice: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );
    const { id } = request.params;

    const invoice = await Invoice.findOne({
      invoiceId: id,
      merchantId: merchant._id,
    });

    if (!invoice) {
      return apiError(
        reply,
        404,
        "invoice_not_found",
        `No invoice found with ID '${id}'.`,
        "id",
      );
    }

    if (["confirmed", "overpaid"].includes(invoice.status)) {
      return apiError(
        reply,
        409,
        "invoice_already_completed",
        `Invoice is already in a completed state (${invoice.status}) and cannot be resolved again.`,
        "id",
      );
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

    childLogger("invoices").info(`✅ Invoice manually resolved: ${id}`);

    return {
      object: "invoice",
      invoice_id: id,
      status: "confirmed",
      resolved: true,
      paid_at: new Date().toISOString(),
      created_at: invoice.createdAt.toISOString(),
    };
  },
};
