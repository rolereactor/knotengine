import { Queue, Worker, Job } from "bullmq";
import { RedisClient } from "./redis-client.js";

/**
 * 🗓️ Scheduled Jobs
 *
 * Manages durable background jobs using BullMQ.
 * Replaces in-memory setInterval-based jobs for crash resilience.
 */
export class ScheduledJobs {
  private static invoiceExpirationQueue: Queue | null = null;
  private static billingQueue: Queue | null = null;
  private static floatManagementQueue: Queue | null = null;
  private static invoiceExpirationWorker: Worker | null = null;
  private static billingWorker: Worker | null = null;
  private static floatManagementWorker: Worker | null = null;
  private static isInitialized = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) {
      console.log("🗓️ ScheduledJobs already initialized");
      return;
    }

    const connection = RedisClient.getInstance();
    if (!connection) {
      console.warn("⚠️ Redis not available, scheduled jobs will be disabled");
      return;
    }

    const isConnected = await RedisClient.testConnection();
    if (!isConnected) {
      console.warn(
        "⚠️ Redis connection test failed, scheduled jobs will be disabled",
      );
      return;
    }

    console.log("🔴 Redis connected, initializing scheduled jobs...");

    const bullmqConnection = {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
    } as any;

    this.invoiceExpirationQueue = new Queue("invoice-expiration", {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.billingQueue = new Queue("billing", {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 60000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.floatManagementQueue = new Queue("float-management", {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 60000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.invoiceExpirationWorker = new Worker(
      "invoice-expiration",
      async (_job: Job) => {
        const { ConfirmationEngine } =
          await import("../core/confirmation-engine.js");
        const { updateActiveInvoicesMetrics } = await import("./metrics.js");
        await ConfirmationEngine.expireStaleInvoices();
        await updateActiveInvoicesMetrics();
        return { processed: true };
      },
      {
        connection: bullmqConnection,
        concurrency: 1,
      },
    );

    this.billingWorker = new Worker(
      "billing",
      async (_job: Job) => {
        const { SubscriptionBilling } =
          await import("../core/subscription-billing.js");
        await SubscriptionBilling.getInstance().checkAndProcessBilling();
        return { processed: true };
      },
      {
        connection: bullmqConnection,
        concurrency: 1,
      },
    );

    this.floatManagementWorker = new Worker(
      "float-management",
      async (job: Job) => {
        const { FloatManager } = await import("../core/float-manager.js");
        const action = job.data.action;
        if (action === "invest") {
          await FloatManager.getInstance().investFloat();
        } else if (action === "accrue") {
          await FloatManager.getInstance().accrueYield();
        }
        return { processed: true, action };
      },
      {
        connection: bullmqConnection,
        concurrency: 1,
      },
    );

    this.invoiceExpirationWorker.on("failed", (job, err) => {
      console.error(
        `❌ Invoice expiration job ${job?.id} failed:`,
        err.message,
      );
    });

    this.billingWorker.on("failed", (job, err) => {
      console.error(`❌ Billing job ${job?.id} failed:`, err.message);
    });

    this.floatManagementWorker.on("failed", (job, err) => {
      console.error(`❌ Float management job ${job?.id} failed:`, err.message);
    });

    await this.scheduleRecurringJobs();

    this.isInitialized = true;
    console.log("✅ ScheduledJobs initialized");
  }

  private static async scheduleRecurringJobs(): Promise<void> {
    if (
      !this.invoiceExpirationQueue ||
      !this.billingQueue ||
      !this.floatManagementQueue
    ) {
      return;
    }

    await this.invoiceExpirationQueue.add(
      "expire-invoices",
      {},
      {
        repeat: { every: 60 * 1000 },
        jobId: "invoice-expiration-recurring",
        removeOnComplete: true,
      },
    );

    await this.billingQueue.add(
      "monthly-billing",
      {},
      {
        repeat: { pattern: "0 0 * * *" },
        jobId: "billing-recurring",
        removeOnComplete: true,
      },
    );

    await this.floatManagementQueue.add(
      "invest-float",
      { action: "invest" },
      {
        repeat: { every: 24 * 60 * 60 * 1000 },
        jobId: "float-invest-recurring",
        removeOnComplete: true,
      },
    );

    await this.floatManagementQueue.add(
      "accrue-yield",
      { action: "accrue" },
      {
        repeat: { every: 24 * 60 * 60 * 1000 },
        jobId: "float-accrue-recurring",
        removeOnComplete: true,
      },
    );

    console.log("🗓️ Recurring jobs scheduled");
  }

  public static isReady(): boolean {
    return this.isInitialized;
  }

  public static async getStats(): Promise<{
    invoiceExpiration: { waiting: number; active: number } | null;
    billing: { waiting: number; active: number } | null;
    floatManagement: { waiting: number; active: number } | null;
  } | null> {
    if (!this.isInitialized) return null;

    const [ie, billing, float] = await Promise.all([
      this.invoiceExpirationQueue?.getJobCounts(),
      this.billingQueue?.getJobCounts(),
      this.floatManagementQueue?.getJobCounts(),
    ]);

    return {
      invoiceExpiration: ie
        ? { waiting: ie.waiting || 0, active: ie.active || 0 }
        : null,
      billing: billing
        ? { waiting: billing.waiting || 0, active: billing.active || 0 }
        : null,
      floatManagement: float
        ? { waiting: float.waiting || 0, active: float.active || 0 }
        : null,
    };
  }

  public static async shutdown(): Promise<void> {
    await Promise.all([
      this.invoiceExpirationWorker?.close(),
      this.billingWorker?.close(),
      this.floatManagementWorker?.close(),
    ]);

    await Promise.all([
      this.invoiceExpirationQueue?.close(),
      this.billingQueue?.close(),
      this.floatManagementQueue?.close(),
    ]);

    this.invoiceExpirationWorker = null;
    this.billingWorker = null;
    this.floatManagementWorker = null;
    this.invoiceExpirationQueue = null;
    this.billingQueue = null;
    this.floatManagementQueue = null;
    this.isInitialized = false;

    console.log("🗓️ ScheduledJobs shutdown complete");
  }
}
