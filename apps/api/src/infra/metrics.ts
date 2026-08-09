import { Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

/**
 * 📊 Prometheus Metrics
 *
 * Custom metrics for monitoring KnotEngine performance.
 * Accessible at /metrics endpoint (already configured in main.ts).
 */

// Default metrics (Node.js runtime)
collectDefaultMetrics({
  prefix: "knotengine_",
});

// ──────────────────────────────────────────────
// Invoice Metrics
// ──────────────────────────────────────────────

/**
 * Total number of invoices created
 */
export const invoicesCreatedTotal = new Counter({
  name: "knotengine_invoices_created_total",
  help: "Total number of invoices created",
  labelNames: ["currency", "network"] as const,
});

/**
 * Invoice creation latency (seconds)
 */
export const invoiceCreationLatency = new Histogram({
  name: "knotengine_invoice_creation_latency_seconds",
  help: "Time to create an invoice",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  labelNames: ["currency"] as const,
});

/**
 * Invoice amount distribution (USD)
 */
export const invoiceAmountUsd = new Histogram({
  name: "knotengine_invoice_amount_usd",
  help: "Invoice amount in USD",
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000],
});

/**
 * Current active invoices (pending, mempool_detected, confirming)
 */
export const activeInvoicesGauge = new Gauge({
  name: "knotengine_active_invoices",
  help: "Number of active (non-expired) invoices",
  labelNames: ["status"] as const,
});

// ──────────────────────────────────────────────
// Webhook Metrics
// ──────────────────────────────────────────────

/**
 * Total webhook deliveries
 */
export const webhookDeliveriesTotal = new Counter({
  name: "knotengine_webhook_deliveries_total",
  help: "Total webhook delivery attempts",
  labelNames: ["event", "status"] as const,
});

/**
 * Webhook delivery latency (seconds)
 */
export const webhookDeliveryLatency = new Histogram({
  name: "knotengine_webhook_delivery_latency_seconds",
  help: "Time to deliver a webhook",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  labelNames: ["event"] as const,
});

/**
 * Webhook queue size
 */
export const webhookQueueSize = new Gauge({
  name: "knotengine_webhook_queue_size",
  help: "Number of webhooks waiting in queue",
  labelNames: ["status"] as const,
});

/**
 * Webhook dead letter queue size (failed jobs beyond retry limit)
 */
export const webhookDLQSize = new Gauge({
  name: "knotengine_webhook_dlq_size",
  help: "Number of webhooks in dead letter queue (failed beyond retry)",
});

/**
 * Scheduled jobs queue size
 */
export const scheduledJobsQueueSize = new Gauge({
  name: "knotengine_scheduled_jobs_queue_size",
  help: "Number of scheduled jobs waiting",
  labelNames: ["queue"] as const,
});

// ──────────────────────────────────────────────
// Payment Metrics
// ──────────────────────────────────────────────

/**
 * Total payment volume (USD)
 */
export const paymentVolumeUsdTotal = new Counter({
  name: "knotengine_payment_volume_usd_total",
  help: "Total payment volume in USD",
  labelNames: ["currency", "network"] as const,
});

/**
 * Payment confirmation time (seconds)
 */
export const paymentConfirmationTime = new Histogram({
  name: "knotengine_payment_confirmation_time_seconds",
  help: "Time from invoice creation to payment confirmation",
  buckets: [30, 60, 120, 300, 600, 1200, 3600],
  labelNames: ["currency"] as const,
});

/**
 * Payment success rate
 */
export const paymentSuccessRate = new Gauge({
  name: "knotengine_payment_success_rate",
  help: "Payment success rate (confirmed / total)",
  labelNames: ["currency"] as const,
});

// ──────────────────────────────────────────────
// Blockchain Provider Metrics
// ──────────────────────────────────────────────

/**
 * Blockchain provider health status
 */
export const providerHealth = new Gauge({
  name: "knotengine_provider_health",
  help: "Blockchain provider health status (1=healthy, 0=unhealthy)",
  labelNames: ["provider"] as const,
});

/**
 * Blockchain provider response time (seconds)
 */
export const providerResponseTime = new Histogram({
  name: "knotengine_provider_response_time_seconds",
  help: "Blockchain provider API response time",
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  labelNames: ["provider", "method"] as const,
});

// ──────────────────────────────────────────────
// Price Oracle Metrics
// ──────────────────────────────────────────────

/**
 * Price fetch latency (seconds)
 */
export const priceFetchLatency = new Histogram({
  name: "knotengine_price_fetch_latency_seconds",
  help: "Time to fetch price from oracle",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
  labelNames: ["currency", "source"] as const,
});

/**
 * Price cache hit rate
 */
export const priceCacheHitRate = new Gauge({
  name: "knotengine_price_cache_hit_rate",
  help: "Price cache hit rate (0-1)",
});

// ──────────────────────────────────────────────
// Database Metrics
// ──────────────────────────────────────────────

/**
 * Database query latency (seconds)
 */
export const dbQueryLatency = new Histogram({
  name: "knotengine_db_query_latency_seconds",
  help: "Database query execution time",
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  labelNames: ["collection", "operation"] as const,
});

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

/**
 * Starts a timer for histogram tracking.
 * Call the returned function to stop and record.
 */
export function startTimer(): () => number {
  const start = Date.now();
  return () => {
    const duration = (Date.now() - start) / 1000;
    return duration;
  };
}

/**
 * Updates active invoice counts.
 * Call periodically to refresh the gauge.
 */
export async function updateActiveInvoicesMetrics() {
  try {
    const { Invoice } = await import("@qodinger/knot-database");

    const statuses = [
      "pending",
      "mempool_detected",
      "confirming",
      "partially_paid",
    ];

    for (const status of statuses) {
      const count = await Invoice.countDocuments({ status });
      activeInvoicesGauge.set({ status }, count);
    }
  } catch (err) {
    console.warn("Failed to update active invoices metrics:", err);
  }
}

/**
 * Updates webhook queue metrics.
 */
export async function updateWebhookQueueMetrics() {
  try {
    const { WebhookQueue } = await import("./webhook-queue.js");
    const { ScheduledJobs } = await import("./scheduled-jobs.js");

    if (!WebhookQueue.isReady()) {
      webhookQueueSize.set({ status: "waiting" }, 0);
      webhookDLQSize.set(0);
      return;
    }

    const stats = await WebhookQueue.getStats();
    if (stats) {
      webhookQueueSize.set({ status: "waiting" }, stats.waiting);
      webhookQueueSize.set({ status: "active" }, stats.active);
      webhookQueueSize.set({ status: "delayed" }, stats.delayed);
      webhookQueueSize.set({ status: "failed" }, stats.failed);
      webhookDLQSize.set(stats.failed);
    }

    const scheduledStats = await ScheduledJobs.getStats();
    if (scheduledStats) {
      if (scheduledStats.invoiceExpiration) {
        scheduledJobsQueueSize.set(
          { queue: "invoiceExpiration" },
          scheduledStats.invoiceExpiration.waiting +
            scheduledStats.invoiceExpiration.active,
        );
      }
      if (scheduledStats.billing) {
        scheduledJobsQueueSize.set(
          { queue: "billing" },
          scheduledStats.billing.waiting + scheduledStats.billing.active,
        );
      }
      if (scheduledStats.floatManagement) {
        scheduledJobsQueueSize.set(
          { queue: "floatManagement" },
          scheduledStats.floatManagement.waiting +
            scheduledStats.floatManagement.active,
        );
      }
    }
  } catch (err) {
    console.warn("Failed to update webhook queue metrics:", err);
  }
}

/**
 * Updates provider health metrics.
 */
export function updateProviderHealthMetrics(
  providers: Array<{
    name: string;
    state: string;
  }>,
): void {
  for (const provider of providers) {
    const isHealthy = provider.state === "CLOSED";
    providerHealth.set({ provider: provider.name }, isHealthy ? 1 : 0);
  }
}

/**
 * Records a successful payment.
 */
export function recordPayment(
  currency: string,
  network: "mainnet" | "testnet",
  amountUsd: number,
  confirmationTimeSeconds: number,
): void {
  paymentVolumeUsdTotal.inc({ currency, network }, amountUsd);
  paymentConfirmationTime.observe({ currency }, confirmationTimeSeconds);
}

/**
 * Records a webhook delivery.
 */
export function recordWebhookDelivery(
  event: string,
  success: boolean,
  latencySeconds: number,
): void {
  webhookDeliveriesTotal.inc({
    event,
    status: success ? "success" : "failure",
  });
  webhookDeliveryLatency.observe({ event }, latencySeconds);
}

/**
 * Instruments Mongoose to record query latency.
 * Call once during server startup.
 */
export function instrumentMongoose(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mongoose = require("mongoose");
  mongoose.set("debug", false);

  mongoose.plugin((schema: any) => {
    schema.pre("find", function (this: any) {
      this._startTime = Date.now();
    });
    schema.post("find", function (this: any, _docs: any) {
      const duration = (Date.now() - (this._startTime || Date.now())) / 1000;
      dbQueryLatency.observe(
        {
          collection: this?.constructor?.modelName || "unknown",
          operation: "find",
        },
        duration,
      );
    });
    schema.pre("findOne", function (this: any) {
      this._startTime = Date.now();
    });
    schema.post("findOne", function (this: any, _doc: any) {
      const duration = (Date.now() - (this._startTime || Date.now())) / 1000;
      dbQueryLatency.observe(
        {
          collection: this?.constructor?.modelName || "unknown",
          operation: "findOne",
        },
        duration,
      );
    });
    schema.pre("aggregate", function (this: any) {
      this._startTime = Date.now();
    });
    schema.post("aggregate", function (this: any) {
      const duration = (Date.now() - (this._startTime || Date.now())) / 1000;
      dbQueryLatency.observe(
        {
          collection: this?.constructor?.modelName || "unknown",
          operation: "aggregate",
        },
        duration,
      );
    });
  });
}
