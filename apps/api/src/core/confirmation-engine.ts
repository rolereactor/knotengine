import {
  Invoice,
  IInvoice,
  InvoiceStatus,
  Merchant,
  WebhookEvent,
  User,
} from "@qodinger/knot-database";
import { SocketService } from "../infra/socket-service.js";
import { WebhookDispatcher } from "../infra/webhook-dispatcher.js";
import { DEFAULT_CONFIRMATIONS, EVM_CURRENCIES } from "@qodinger/knot-types";
import { BlockchainProviderPool } from "../infra/provider-pool.js";
import { NotificationService } from "../infra/notification-service.js";
import { CryptoMath } from "./crypto-math.js";
import * as Metrics from "../infra/metrics.js";
import { childLogger } from "../infra/logger.js";
import { EmailService } from "../infra/email-service.js";

const logger = childLogger("confirmation-engine");

/**
 * 🔒 ConfirmationEngine
 *
 * Handles the core confirmation logic for the Knot Engine.
 * Implements configurable block-depth checks per currency,
 * respecting merchant-level overrides.
 */
export class ConfirmationEngine {
  /**
   * Processes a new blockchain event and updates the invoice state.
   * This is the heart of the payment confirmation pipeline.
   *
   * State Machine:
   *   pending → mempool_detected → confirming → confirmed
   *   pending → expired (via TTL check)
   */
  public static async processBlockchainEvent(event: {
    toAddress: string;
    txHash: string;
    blockNumber: number;
    confirmations: number;
    amount: string;
    asset: string;
    source: string;
    invoiceId?: string;
    rawPayload: Record<string, unknown>;
  }): Promise<{
    matched: boolean;
    invoiceId?: string;
    newStatus?: string;
  }> {
    try {
      // 1. Find the matching invoice using a single optimized query
      // Tries exact invoiceId first, then exact address, then case-insensitive (EVM only)
      let invoice: IInvoice | null = null;
      const statusFilter = {
        $in: [
          "pending",
          "mempool_detected",
          "confirming",
          "partially_paid",
          "overpaid",
        ],
      };

      // Single query that handles all cases efficiently
      const escapedAddress = event.toAddress.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      invoice = await Invoice.findOne({
        $or: [
          { invoiceId: event.invoiceId, status: statusFilter },
          { payAddress: event.toAddress, status: statusFilter },
          {
            payAddress: { $regex: `^${escapedAddress}$`, $options: "i" },
            status: statusFilter,
            cryptoCurrency: { $in: EVM_CURRENCIES },
          },
        ],
      }).sort({ createdAt: 1 });

      if (!invoice) {
        await WebhookEvent.create({
          ...event,
          eventType: "unmatched_tx",
          processed: false,
          rawPayload: event.rawPayload,
        });
        return { matched: false } as const;
      }

      // 2. Idempotency check: Has this exact (txHash, invoiceId, asset) combination already been processed?
      // This prevents replay attacks where the same txHash is submitted with different assets.
      const existingEvent = await WebhookEvent.findOne({
        txHash: event.txHash,
        invoiceId: invoice._id,
        asset: event.asset,
      });

      // Fetch merchant once for both branches
      const merchant = await Merchant.findById(invoice.merchantId);
      if (!merchant) return { matched: false } as const;

      if (!existingEvent) {
        // 1.5. Validate Asset

        // Asset validation: Must match exactly
        const isAssetMatch =
          event.asset === invoice.cryptoCurrency ||
          (invoice.cryptoCurrency.startsWith(event.asset) &&
            [
              "USDT_ERC20",
              "USDT_POLYGON",
              "USDC_ERC20",
              "USDC_POLYGON",
            ].includes(invoice.cryptoCurrency));

        if (!isAssetMatch) {
          logger.warn(
            {
              invoiceId: invoice.invoiceId,
              received: event.asset,
              expected: invoice.cryptoCurrency,
            },
            "⚠️  Asset mismatch",
          );
          return { matched: false } as const;
        }

        const receivedAmount = parseFloat(event.amount);
        const totalCryptoReceived = CryptoMath.add(
          invoice.cryptoAmountReceived || 0,
          receivedAmount,
        );

        await WebhookEvent.create({
          source: event.source,
          eventType: "address_activity",
          toAddress: event.toAddress,
          txHash: event.txHash,
          amount: event.amount,
          asset: event.asset,
          blockNumber: event.blockNumber,
          confirmations: event.confirmations,
          processed: true,
          invoiceId: invoice._id,
          rawPayload: event.rawPayload,
        });

        await Invoice.findByIdAndUpdate(invoice._id, {
          $inc: { cryptoAmountReceived: receivedAmount },
          $set: {
            lastReceivedAmount: receivedAmount,
            lastReceivedAt: new Date(),
          },
        });

        const { status: newStatus, amountStatus } = this.resolveStatus(
          invoice,
          totalCryptoReceived,
          event.confirmations,
          merchant.underpaymentTolerancePercentage,
        );

        const isTerminalSuccess =
          newStatus === "confirmed" || newStatus === "overpaid";

        const updateData: Partial<Record<string, unknown>> = {
          txHash: event.txHash,
          confirmations: event.confirmations,
          status: newStatus,
        };

        if (event.blockNumber > 0) {
          updateData.blockNumber = event.blockNumber;
        }

        if (isTerminalSuccess && !invoice.paidAt) {
          updateData.paidAt = new Date();
        }

        if (Object.keys(updateData).length > 0) {
          await Invoice.findByIdAndUpdate(invoice._id, { $set: updateData });
        }

        const isTestnet = invoice.metadata?.isTestnet === true;
        const isNewTransaction = true;
        const statusChanged = invoice.status !== newStatus;

        SocketService.emitStatusUpdate(invoice.invoiceId, newStatus, {
          confirmations: event.confirmations,
          requiredConfirmations: invoice.requiredConfirmations,
          txHash: event.txHash,
          cryptoAmountReceived: totalCryptoReceived,
        });

        if (isNewTransaction || statusChanged) {
          if (isTerminalSuccess) {
            WebhookDispatcher.dispatch(invoice.invoiceId, "invoice.confirmed");
            return { matched: true, invoiceId: invoice.invoiceId, newStatus };
          }
          const webhookEvent = `invoice.${newStatus}`;
          WebhookDispatcher.dispatch(invoice.invoiceId, webhookEvent);
        }

        if (amountStatus === "partially_paid") {
          NotificationService.notifyPartialPayment(
            invoice.merchantId.toString(),
            invoice.invoiceId,
            event.amount,
            totalCryptoReceived.toString(),
            invoice.cryptoAmount.toString(),
            event.asset,
            newStatus,
            isTestnet,
          );
        } else if (amountStatus === "overpaid") {
          NotificationService.notifyOverpayment(
            invoice.merchantId.toString(),
            invoice.invoiceId,
            event.amount,
            totalCryptoReceived.toString(),
            invoice.cryptoAmount.toString(),
            event.asset,
            newStatus,
            isTestnet,
          );
        } else {
          const stage =
            newStatus === "mempool_detected"
              ? "mempool"
              : newStatus === "confirming"
                ? "confirming"
                : "confirmed";

          NotificationService.create({
            merchantId: invoice.merchantId.toString(),
            title: isTestnet ? "[TEST] New Transaction" : "New Transaction",
            description: `Detected ${event.amount} ${event.asset} for invoice ${invoice.invoiceId} (${stage}).`,
            type: "info",
            link: `/dashboard/payments`,
            meta: {
              invoiceId: invoice.invoiceId,
              txHash: event.txHash,
              isTestnet,
            },
          });
        }

        if (isTerminalSuccess && statusChanged) {
          if (invoice.tatumSubscriptionId && invoice.providerName) {
            BlockchainProviderPool.getInstance().deleteSubscription(
              invoice.providerName,
              invoice.tatumSubscriptionId,
            );
          }

          if (!invoice.paidAt && !isTestnet) {
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

            const confirmationSeconds =
              (Date.now() - new Date(invoice.createdAt).getTime()) / 1000;
            Metrics.recordPayment(
              invoice.cryptoCurrency,
              "mainnet",
              invoice.amountUsd,
              confirmationSeconds,
            );

            NotificationService.notifyPaymentConfirmed(
              invoice.merchantId.toString(),
              invoice.invoiceId,
              invoice.amountUsd,
              isTestnet,
            );

            // U8: Send email notification for confirmed invoice
            if (merchant.emailNotifications?.paymentConfirmed !== false) {
              const merchantUser = merchant.userId
                ? await User.findById(merchant.userId)
                : null;
              if (merchantUser?.email) {
                const merchantName =
                  merchant.name || merchantUser.email.split("@")[0];
                EmailService.sendPaymentAlert({
                  to: merchantUser.email,
                  merchantName,
                  invoiceId: invoice.invoiceId,
                  amount: invoice.amountUsd.toFixed(2),
                  currency: "USD",
                  status: "confirmed",
                  checkoutUrl: `${process.env.DASHBOARD_URL || "http://localhost:5052"}/dashboard/payments`,
                }).catch((err) =>
                  logger.error(
                    { err, invoiceId: invoice.invoiceId },
                    "❌ Failed to send confirmed email",
                  ),
                );
              }
            }

            const user = merchant.userId
              ? await User.findById(merchant.userId)
              : null;
            if (user && user.creditBalance < 3.0) {
              NotificationService.notifyLowBalance(
                invoice.merchantId.toString(),
                user.creditBalance,
              );
            }
          }
        }

        logger.info(
          {
            invoiceId: invoice.invoiceId,
            from: invoice.status,
            to: newStatus,
            confirmations: event.confirmations,
            required: invoice.requiredConfirmations,
          },
          "📦 Invoice status update",
        );

        return { matched: true, invoiceId: invoice.invoiceId, newStatus };
      }

      // Update confirmation count for existing event
      await WebhookEvent.findByIdAndUpdate(existingEvent._id, {
        confirmations: event.confirmations,
        blockNumber: event.blockNumber,
      });

      const totalCryptoReceived = invoice.cryptoAmountReceived || 0;

      const { status: newStatus, amountStatus } = this.resolveStatus(
        invoice,
        totalCryptoReceived,
        event.confirmations,
        merchant?.underpaymentTolerancePercentage,
      );

      SocketService.emitStatusUpdate(invoice.invoiceId, newStatus, {
        confirmations: event.confirmations,
        requiredConfirmations: invoice.requiredConfirmations,
        txHash: event.txHash,
        cryptoAmountReceived: totalCryptoReceived,
      });

      const statusChanged = invoice.status !== newStatus;
      if (statusChanged) {
        const webhookEvent =
          amountStatus === "overpaid"
            ? "invoice.confirmed"
            : `invoice.${newStatus}`;
        WebhookDispatcher.dispatch(invoice.invoiceId, webhookEvent);
      }

      logger.info(
        {
          invoiceId: invoice.invoiceId,
          from: invoice.status,
          to: newStatus,
          confirmations: event.confirmations,
          required: invoice.requiredConfirmations,
        },
        "📦 Invoice status update",
      );

      return { matched: true, invoiceId: invoice.invoiceId, newStatus };
    } catch (err) {
      logger.error({ err }, "❌ ConfirmationEngine Error");
      return { matched: false };
    }
  }

  /**
   * Determines the invoice status based on current confirmation count.
   */
  private static determineStatus(
    invoice: IInvoice,
    confirmations: number,
  ): InvoiceStatus {
    if (confirmations <= 0) {
      return "mempool_detected";
    }

    if (confirmations >= invoice.requiredConfirmations) {
      return "confirmed";
    }

    return "confirming";
  }

  /**
   * Resolves the final invoice status by combining confirmation depth
   * with the payment amount status (under/overpaid).
   */
  private static resolveStatus(
    invoice: IInvoice,
    totalCryptoReceived: number,
    confirmations: number,
    underpaymentTolerancePercentage?: number,
  ): { status: InvoiceStatus; amountStatus: InvoiceStatus } {
    const tolerance = underpaymentTolerancePercentage ?? 1;
    const minRequired = CryptoMath.multiply(
      invoice.cryptoAmount,
      CryptoMath.divide(CryptoMath.subtract(100, tolerance), 100),
    );
    const isOverpayment = CryptoMath.greaterThan(
      totalCryptoReceived,
      CryptoMath.multiply(invoice.cryptoAmount, 1.05),
    );

    let amountStatus: InvoiceStatus = "confirming";
    if (CryptoMath.lessThan(totalCryptoReceived, minRequired)) {
      amountStatus = "partially_paid";
    } else if (isOverpayment) {
      amountStatus = "overpaid";
    }

    let status = this.determineStatus(invoice, confirmations);

    if (amountStatus === "partially_paid") {
      status = "partially_paid";
    } else if (amountStatus === "overpaid") {
      if (status === "confirmed") {
        status = "overpaid";
      }
    }

    return { status, amountStatus };
  }

  /**
   * Gets the required confirmation count for a currency,
   * optionally overridden by merchant-level policy.
   */
  public static async getRequiredConfirmations(
    merchantId: string,
    currency: string,
  ): Promise<number> {
    const merchant = await Merchant.findById(merchantId);

    if (merchant?.confirmationPolicy) {
      const policy = merchant.confirmationPolicy as Record<string, number>;
      const key = currency.split("_")[0]; // BTC, LTC, ETH
      if (policy[key] !== undefined) {
        return policy[key];
      }
    }

    return DEFAULT_CONFIRMATIONS[currency] || 6;
  }

  /**
   * Expires old invoices that have passed their TTL.
   * Should be called periodically (e.g., every 60 seconds).
   * Uses pagination to prevent memory spikes with large datasets.
   */
  public static async expireStaleInvoices(): Promise<number> {
    const BATCH_SIZE = 100;
    let expired = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const staleInvoices = await Invoice.find({
        status: {
          $in: ["pending", "mempool_detected", "confirming", "partially_paid"],
        },
        expiresAt: { $lt: new Date() },
      })
        .select(
          "_id invoiceId status merchantId txHash confirmations tatumSubscriptionId providerName webhookDelivered metadata",
        )
        .limit(BATCH_SIZE)
        .sort({ expiresAt: 1 });

      if (staleInvoices.length === 0) break;

      const toExpire = staleInvoices.filter(
        (inv) => inv.status !== "expired" || !inv.webhookDelivered,
      );

      if (toExpire.length === 0) break;

      await Invoice.updateMany(
        { _id: { $in: toExpire.map((inv) => inv._id) } },
        { $set: { status: "expired" } },
      );

      for (const invoice of toExpire) {
        try {
          const prevStatus = invoice.status;

          SocketService.emitStatusUpdate(invoice.invoiceId, "expired", {
            txHash: invoice.txHash,
            confirmations: invoice.confirmations,
          });

          if (!invoice.webhookDelivered) {
            WebhookDispatcher.dispatch(invoice.invoiceId, "invoice.expired");
          }

          if (invoice.tatumSubscriptionId && invoice.providerName) {
            BlockchainProviderPool.getInstance().deleteSubscription(
              invoice.providerName,
              invoice.tatumSubscriptionId,
            );
          }

          if (prevStatus !== "pending") {
            const isTestnet = invoice.metadata?.isTestnet === true;
            await NotificationService.create({
              merchantId: invoice.merchantId.toString(),
              title: isTestnet ? "[TEST] Invoice Expired" : "Invoice Expired",
              description: `Invoice ${invoice.invoiceId} has expired after receiving partial or unconfirmed funds.`,
              type: "error",
              link: "/dashboard/payments",
              meta: { invoiceId: invoice.invoiceId, isTestnet },
            });

            // U8: Send email notification for expired invoice
            const expiredMerchant = await Merchant.findById(
              invoice.merchantId,
            ).populate("userId");
            if (
              expiredMerchant &&
              expiredMerchant.emailNotifications?.paymentExpired !== false
            ) {
              const expiredUser = expiredMerchant.userId as any;
              if (expiredUser?.email) {
                const merchantName =
                  expiredMerchant.name || expiredUser.email.split("@")[0];
                EmailService.sendPaymentAlert({
                  to: expiredUser.email,
                  merchantName,
                  invoiceId: invoice.invoiceId,
                  amount: "0.00",
                  currency: invoice.cryptoCurrency || "USD",
                  status: "expired",
                  checkoutUrl: `${process.env.DASHBOARD_URL || "http://localhost:5052"}/dashboard/payments`,
                }).catch((err) =>
                  logger.error(
                    { err, invoiceId: invoice.invoiceId },
                    "❌ Failed to send expired email",
                  ),
                );
              }
            }
          }

          logger.info({ invoiceId: invoice.invoiceId }, "⏰ Invoice expired");
          expired++;
        } catch (err) {
          logger.error(
            { invoiceId: invoice.invoiceId, err },
            "❌ Error expiring invoice",
          );
        }
      }

      if (staleInvoices.length < BATCH_SIZE) break;
    }

    return expired;
  }
}
