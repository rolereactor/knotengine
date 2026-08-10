import {
  Invoice,
  IInvoice,
  Merchant,
  Refund,
  WebhookDelivery,
  WebhookEndpoint,
} from "@qodinger/knot-database";
import { Derivator } from "@qodinger/knot-crypto";
import * as crypto from "crypto";
import { NotificationService } from "./notification-service.js";
import * as Metrics from "./metrics.js";
import { WebhookQueue } from "./webhook-queue.js";
import { childLogger } from "./logger.js";

const logger = childLogger("webhook-dispatcher");

/**
 * 📡 WebhookDispatcher
 *
 * Delivers payment status updates to merchant webhook endpoints.
 * Supports multiple endpoints per merchant with event filtering.
 * Features:
 *   - HMAC-SHA256 signed payloads
 *   - Retry tracking (up to 5 attempts)
 *   - Idempotency via invoice state checks
 *   - Queue-based delivery (BullMQ) for scale
 *   - Auto-disables endpoints after 10 consecutive failures
 */
export class WebhookDispatcher {
  /** Max retries: ~24 hours of total retry time with exponential backoff */
  private static MAX_ATTEMPTS = 10;
  private static INITIAL_BACKOFF_MINUTES = 2;
  private static MAX_CONSECUTIVE_FAILURES = 10;

  /**
   * Dispatches a webhook notification to the merchant for an invoice event.
   * Uses queue-based delivery if available, falls back to synchronous.
   * Priority is based on merchant's pricing plan.
   */
  public static async dispatch(
    invoiceId: string,
    event: string,
  ): Promise<boolean> {
    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      logger.error({ invoiceId }, "Invoice not found");
      return false;
    }

    const merchant = await Merchant.findById(invoice.merchantId);
    const merchantPlan = merchant?.plan || "starter";

    if (WebhookQueue.isReady()) {
      await WebhookQueue.dispatch(invoiceId, event, merchantPlan);
      return true;
    }

    return this.dispatchSync(invoiceId, event);
  }

  /**
   * Synchronous webhook delivery to all matching endpoints.
   */
  public static async dispatchSync(
    invoiceId: string,
    event: string,
  ): Promise<boolean> {
    const invoice = await Invoice.findOne({ invoiceId });

    if (!invoice) {
      logger.error({ invoiceId }, "Invoice not found");
      return false;
    }

    if (
      invoice.webhookDelivered &&
      ["invoice.confirmed", "invoice.expired", "invoice.failed"].includes(event)
    ) {
      logger.info({ invoiceId }, "📡 Webhook already delivered, skipping");
      return true;
    }

    const merchant = await Merchant.findById(invoice.merchantId);
    if (!merchant) return false;

    // Fetch all active webhook endpoints for this merchant
    const endpoints = await WebhookEndpoint.find({
      merchantId: merchant._id,
      isActive: true,
    });

    if (endpoints.length === 0) {
      return false;
    }

    const payload = {
      id: `evt_${crypto.randomBytes(12).toString("hex")}`,
      event,
      created: Math.floor(Date.now() / 1000),
      invoice_id: invoice.invoiceId,
      status: invoice.status,
      amount: {
        usd: invoice.amountUsd,
        crypto: invoice.cryptoAmount,
        crypto_received: invoice.cryptoAmountReceived || 0,
        currency: invoice.cryptoCurrency,
        fee_usd: invoice.feeUsd,
      },
      payment: {
        address: invoice.payAddress,
        tx_hash: invoice.txHash || null,
        confirmations: invoice.confirmations,
        paid_at: invoice.paidAt?.toISOString() || null,
      },
      metadata: invoice.metadata || {},
    };

    const payloadString = JSON.stringify(payload);
    let anySuccess = false;
    const deliveryRecords: Array<{
      merchantId: string;
      invoiceId: string;
      eventType: string;
      url: string;
      attempt: number;
      status: "success" | "failed";
      statusCode?: number;
      responseBody?: string;
      errorMessage?: string;
      duration: number;
    }> = [];
    const endpointUpdates: Array<{
      filter: { _id: string };
      update: { $set: Record<string, unknown> };
    }> = [];

    for (const endpoint of endpoints) {
      // Check if endpoint should receive this event
      if (
        endpoint.eventMode === "filtered" &&
        !endpoint.events.includes(event)
      ) {
        continue;
      }

      const secret = endpoint.secret;
      const signature = Derivator.signWebhookPayload(payloadString, secret);
      const startTime = Date.now();

      try {
        logger.info(
          { event, url: endpoint.url, endpointId: endpoint.endpointId },
          "📡 Dispatching webhook",
        );

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-knot-signature": signature,
            "x-knot-event": event,
            "x-knot-invoice": invoice.invoiceId,
            "x-knot-endpoint": endpoint.endpointId,
            "User-Agent": "KnotEngine-Webhook-Dispatcher/2.0",
          },
          body: payloadString,
          signal: AbortSignal.timeout(15000),
        });

        const duration = Date.now() - startTime;
        const attempt = (invoice.webhookAttempts || 0) + 1;
        const responseBody = await response.text();

        if (response.ok) {
          anySuccess = true;

          endpointUpdates.push({
            filter: { _id: endpoint._id.toString() },
            update: {
              $set: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
            },
          });

          const updateSet: Record<string, unknown> = {
            webhookAttempts: attempt,
            lastWebhookAttempt: new Date(),
          };

          if (event === "invoice.confirmed" || event === "invoice.failed") {
            updateSet.webhookDelivered = true;
          }

          await Invoice.findByIdAndUpdate(invoice._id, { $set: updateSet });

          deliveryRecords.push({
            merchantId: invoice.merchantId.toString(),
            invoiceId: invoice.invoiceId,
            eventType: event,
            url: endpoint.url,
            attempt,
            status: "success",
            statusCode: response.status,
            responseBody: responseBody.substring(0, 1000),
            duration,
          });

          Metrics.recordWebhookDelivery(event, true, duration / 1000);

          logger.info(
            { invoiceId, event, url: endpoint.url },
            "✅ Webhook SUCCESS",
          );
        } else {
          throw new Error(`Endpoint returned ${response.status}`);
        }
      } catch (error: unknown) {
        const attempts = (invoice.webhookAttempts || 0) + 1;
        const duration = Date.now() - startTime;

        await Invoice.findByIdAndUpdate(invoice._id, {
          $set: {
            webhookAttempts: attempts,
            lastWebhookAttempt: new Date(),
          },
        });

        const message = error instanceof Error ? error.message : String(error);
        const statusCode =
          error instanceof Error && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : undefined;

        const newFailures = endpoint.consecutiveFailures + 1;
        const shouldDisable = newFailures >= this.MAX_CONSECUTIVE_FAILURES;

        endpointUpdates.push({
          filter: { _id: endpoint._id.toString() },
          update: {
            $set: {
              lastFailureAt: new Date(),
              consecutiveFailures: newFailures,
              ...(shouldDisable
                ? { isActive: false, disabledAt: new Date() }
                : {}),
            },
          },
        });

        deliveryRecords.push({
          merchantId: invoice.merchantId.toString(),
          invoiceId: invoice.invoiceId,
          eventType: event,
          url: endpoint.url,
          attempt: attempts,
          status: "failed",
          statusCode,
          errorMessage: message.substring(0, 500),
          duration,
        });

        Metrics.recordWebhookDelivery(event, false, duration / 1000);

        logger.error(
          {
            attempts,
            maxAttempts: this.MAX_ATTEMPTS,
            invoiceId,
            url: endpoint.url,
            message,
          },
          "❌ Webhook FAILURE",
        );

        if (endpoint.consecutiveFailures === 0) {
          const isTestnet = invoice.metadata?.isTestnet === true;
          NotificationService.create({
            merchantId: invoice.merchantId.toString(),
            title: isTestnet
              ? "[TEST] Webhook Delivery Failed"
              : "Webhook Delivery Failed",
            description: `Failed to notify ${endpoint.url || "your webhook"} for invoice ${invoice.invoiceId}: ${message}`,
            type: "error",
            link: "/dashboard/developers",
            meta: {
              invoiceId: invoice.invoiceId,
              error: message,
              isTestnet,
              endpointId: endpoint.endpointId,
            },
          });
        }
      }
    }

    if (deliveryRecords.length > 0) {
      await WebhookDelivery.insertMany(deliveryRecords);
    }

    if (endpointUpdates.length > 0) {
      await WebhookEndpoint.bulkWrite(
        endpointUpdates.map(({ filter, update }) => ({
          updateOne: { filter, update },
        })),
      );
    }

    return anySuccess;
  }

  /**
   * Dispatches a test webhook to a specific endpoint.
   */
  public static async dispatchTest(
    merchantId: string,
    endpointId?: string,
  ): Promise<boolean> {
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    let endpoint;
    if (endpointId) {
      endpoint = await WebhookEndpoint.findOne({
        _id: endpointId,
        merchantId: merchant._id,
      });
    } else {
      endpoint = await WebhookEndpoint.findOne({
        merchantId: merchant._id,
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    if (!endpoint) {
      throw new Error("No webhook endpoint configured");
    }

    const event = "invoice.confirmed";
    const payload = {
      id: `evt_test_${crypto.randomBytes(8).toString("hex")}`,
      event,
      created: Math.floor(Date.now() / 1000),
      invoice_id: "inv_test_1234567890",
      status: "confirmed",
      amount: {
        usd: 100.0,
        crypto: 0.0015,
        currency: "BTC",
        fee_usd: 1.0,
      },
      payment: {
        address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        tx_hash:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        confirmations: 2,
        paid_at: new Date().toISOString(),
      },
      metadata: { is_test: true },
    };

    const payloadString = JSON.stringify(payload);
    const signature = Derivator.signWebhookPayload(
      payloadString,
      endpoint.secret,
    );

    try {
      logger.info({ url: endpoint.url }, "📡 Dispatching TEST webhook");

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-knot-signature": signature,
          "x-knot-event": event,
          "x-knot-invoice": payload.invoice_id,
          "x-knot-endpoint": endpoint.endpointId,
          "User-Agent": "KnotEngine-Webhook-Dispatcher/2.0",
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Endpoint returned ${response.status}`);
      }

      await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
        $set: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
      });

      logger.info("✅ TEST Webhook SUCCESS");
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ message }, "❌ TEST Webhook FAILURE");
      throw error;
    }
  }

  /**
   * Dispatches a webhook notification for a refund event.
   * Supports: refund.created, refund.completed, refund.failed
   */
  public static async dispatchRefund(
    refundId: string,
    event: string,
    merchantIdOverride?: string,
  ): Promise<boolean> {
    const refund = await Refund.findOne({ refundId });
    if (!refund) {
      logger.error({ refundId }, "Refund not found");
      return false;
    }

    const merchantId = merchantIdOverride || refund.merchantId.toString();
    const merchant = await Merchant.findById(merchantId);
    const merchantPlan = merchant?.plan || "starter";

    if (WebhookQueue.isReady()) {
      await WebhookQueue.dispatchRefund(refundId, event, merchantPlan);
      return true;
    }

    return this.dispatchRefundSync(refundId, event);
  }

  /**
   * Synchronous webhook delivery for refund events to all matching endpoints.
   */
  public static async dispatchRefundSync(
    refundId: string,
    event: string,
  ): Promise<boolean> {
    const refund = await Refund.findOne({ refundId });

    if (!refund) {
      logger.error({ refundId }, "Refund not found");
      return false;
    }

    const merchant = await Merchant.findById(refund.merchantId);
    if (!merchant) return false;

    const endpoints = await WebhookEndpoint.find({
      merchantId: merchant._id,
      isActive: true,
    });

    if (endpoints.length === 0) {
      return false;
    }

    const payload = {
      id: `evt_${crypto.randomBytes(12).toString("hex")}`,
      event,
      created: Math.floor(Date.now() / 1000),
      refund_id: refund.refundId,
      invoice_id: refund.invoiceId,
      status: refund.status,
      amount_usd: refund.amountUsd,
      crypto_currency: refund.cryptoCurrency,
      crypto_amount: refund.cryptoAmount || null,
      refund_address: refund.refundAddress || null,
      tx_hash: refund.txHash || null,
      reason: refund.reason,
      failure_reason: refund.failureReason || null,
      processed_at: refund.processedAt?.toISOString() || null,
    };

    const payloadString = JSON.stringify(payload);
    let anySuccess = false;
    const deliveryRecords: Array<{
      merchantId: string;
      invoiceId: string;
      eventType: string;
      url: string;
      attempt: number;
      status: "success" | "failed";
      statusCode?: number;
      responseBody?: string;
      errorMessage?: string;
      duration: number;
    }> = [];
    const endpointUpdates: Array<{
      filter: { _id: string };
      update: { $set: Record<string, unknown> };
    }> = [];

    for (const endpoint of endpoints) {
      if (
        endpoint.eventMode === "filtered" &&
        !endpoint.events.includes(event)
      ) {
        continue;
      }

      const secret = endpoint.secret;
      const signature = Derivator.signWebhookPayload(payloadString, secret);
      const startTime = Date.now();

      try {
        logger.info(
          { event, url: endpoint.url, endpointId: endpoint.endpointId },
          "📡 Dispatching refund webhook",
        );

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-knot-signature": signature,
            "x-knot-event": event,
            "x-knot-refund": refund.refundId,
            "x-knot-endpoint": endpoint.endpointId,
            "User-Agent": "KnotEngine-Webhook-Dispatcher/2.0",
          },
          body: payloadString,
          signal: AbortSignal.timeout(15000),
        });

        const duration = Date.now() - startTime;

        if (response.ok) {
          anySuccess = true;

          endpointUpdates.push({
            filter: { _id: endpoint._id.toString() },
            update: {
              $set: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
            },
          });

          deliveryRecords.push({
            merchantId: refund.merchantId.toString(),
            invoiceId: refund.invoiceId,
            eventType: event,
            url: endpoint.url,
            attempt: 1,
            status: "success",
            statusCode: response.status,
            responseBody: (await response.text()).substring(0, 1000),
            duration,
          });

          Metrics.recordWebhookDelivery(event, true, duration / 1000);

          logger.info(
            { refundId, event, url: endpoint.url },
            "✅ Refund webhook SUCCESS",
          );
        } else {
          throw new Error(`Endpoint returned ${response.status}`);
        }
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);
        const statusCode =
          error instanceof Error && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : undefined;

        const newFailures = endpoint.consecutiveFailures + 1;
        const shouldDisable = newFailures >= this.MAX_CONSECUTIVE_FAILURES;

        endpointUpdates.push({
          filter: { _id: endpoint._id.toString() },
          update: {
            $set: {
              lastFailureAt: new Date(),
              consecutiveFailures: newFailures,
              ...(shouldDisable
                ? { isActive: false, disabledAt: new Date() }
                : {}),
            },
          },
        });

        deliveryRecords.push({
          merchantId: refund.merchantId.toString(),
          invoiceId: refund.invoiceId,
          eventType: event,
          url: endpoint.url,
          attempt: 1,
          status: "failed",
          statusCode,
          errorMessage: message.substring(0, 500),
          duration,
        });

        Metrics.recordWebhookDelivery(event, false, duration / 1000);

        logger.error(
          { refundId, url: endpoint.url, message },
          "❌ Refund webhook FAILURE",
        );
      }
    }

    if (deliveryRecords.length > 0) {
      await WebhookDelivery.insertMany(deliveryRecords);
    }

    if (endpointUpdates.length > 0) {
      await WebhookEndpoint.bulkWrite(
        endpointUpdates.map(({ filter, update }) => ({
          updateOne: { filter, update },
        })),
      );
    }

    return anySuccess;
  }

  /**
   * Catch-up mechanism: finds all invoices that failed delivery and retries them.
   */
  public static async dispatchPending(): Promise<number> {
    const BATCH_SIZE = 50;
    const now = new Date();
    let dispatched = 0;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const candidates = await Invoice.find({
        webhookDelivered: false,
        webhookAttempts: { $lt: this.MAX_ATTEMPTS },
        status: { $in: ["confirmed", "expired"] },
      })
        .limit(BATCH_SIZE)
        .skip(skip)
        .sort({ lastWebhookAttempt: 1 });

      if (candidates.length === 0) {
        hasMore = false;
        break;
      }

      for (const invoice of candidates) {
        const attempts = invoice.webhookAttempts || 0;

        try {
          if (attempts === 0) {
            await this.triggerInvoiceWebhook(invoice);
            dispatched++;
            continue;
          }

          const lastAttempt = invoice.lastWebhookAttempt
            ? new Date(invoice.lastWebhookAttempt).getTime()
            : 0;
          const waitMinutes =
            Math.pow(2, attempts) * this.INITIAL_BACKOFF_MINUTES;
          const nextAllowedAttempt = lastAttempt + waitMinutes * 60 * 1000;

          if (now.getTime() >= nextAllowedAttempt) {
            await this.triggerInvoiceWebhook(invoice);
            dispatched++;
          }
        } catch (err) {
          logger.error(
            { invoiceId: invoice.invoiceId, err },
            "❌ Error processing webhook",
          );
        }
      }

      skip += BATCH_SIZE;

      if (candidates.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    return dispatched;
  }

  private static async triggerInvoiceWebhook(invoice: IInvoice) {
    const event =
      invoice.status === "confirmed" ? "invoice.confirmed" : "invoice.failed";
    await this.dispatch(invoice.invoiceId, event);
  }
}
