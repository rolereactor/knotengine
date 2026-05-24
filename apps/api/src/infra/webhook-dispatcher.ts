import {
  Invoice,
  IInvoice,
  Merchant,
  WebhookDelivery,
  WebhookEndpoint,
} from "@qodinger/knot-database";
import { Derivator } from "@qodinger/knot-crypto";
import * as crypto from "crypto";
import { NotificationService } from "./notification-service.js";
import * as Metrics from "./metrics.js";
import { WebhookQueue } from "./webhook-queue.js";

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
      console.error(`WebhookDispatcher: Invoice ${invoiceId} not found`);
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
      console.error(`WebhookDispatcher: Invoice ${invoiceId} not found`);
      return false;
    }

    if (
      invoice.webhookDelivered &&
      ["invoice.confirmed", "invoice.expired", "invoice.failed"].includes(event)
    ) {
      console.log(
        `📡 Webhook already delivered for invoice ${invoiceId}. Skipping.`,
      );
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
        console.log(
          `📡 Dispatching ${event} to ${endpoint.url} (${endpoint.endpointId})`,
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

          await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
            $set: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
          });

          const updateSet: Record<string, unknown> = {
            webhookAttempts: attempt,
            lastWebhookAttempt: new Date(),
          };

          if (event === "invoice.confirmed" || event === "invoice.failed") {
            updateSet.webhookDelivered = true;
          }

          await Invoice.findByIdAndUpdate(invoice._id, { $set: updateSet });

          await WebhookDelivery.create({
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

          console.log(
            `✅ Webhook SUCCESS: ${invoiceId} ${event} delivered to ${endpoint.url}`,
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

        await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
          $set: {
            lastFailureAt: new Date(),
            consecutiveFailures: newFailures,
            ...(shouldDisable
              ? { isActive: false, disabledAt: new Date() }
              : {}),
          },
        });

        await WebhookDelivery.create({
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

        console.error(
          `❌ Webhook FAILURE (${attempts}/${this.MAX_ATTEMPTS}) for ${invoiceId} to ${endpoint.url}: ${message}`,
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
      console.log(`📡 Dispatching TEST webhook to ${endpoint.url}`);

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

      console.log(`✅ TEST Webhook SUCCESS`);
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ TEST Webhook FAILURE: ${message}`);
      throw error;
    }
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
          console.error(
            `❌ Error processing webhook for invoice ${invoice.invoiceId}:`,
            err,
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
