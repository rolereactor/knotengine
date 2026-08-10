import { Queue, Worker, Job } from "bullmq";
import { RedisClient } from "./redis-client.js";
import { WebhookDispatcher } from "./webhook-dispatcher.js";

/**
 * 📬 Webhook Job Queue
 *
 * Manages asynchronous webhook delivery using BullMQ.
 * Provides:
 * - Parallel processing (10 concurrent jobs)
 * - Priority queue (confirmed > expired)
 * - Automatic retries with exponential backoff
 * - Job observability (metrics, logs)
 */
export class WebhookQueue {
  private static queue: Queue | null = null;
  private static worker: Worker | null = null;
  private static isInitialized = false;

  /**
   * Priority levels for webhook jobs
   * Lower number = Higher priority
   * Format: [Starter, Professional, Enterprise]
   */
  public static readonly Priority = {
    // Event-based priorities (base values)
    CONFIRMED: [10, 5, 1], // Starter, Pro, Enterprise
    EXPIRED: [30, 15, 5],
    FAILED: [30, 15, 5],
    OTHER: [50, 25, 10],
  };

  /**
   * Gets priority based on event type and merchant plan
   */
  public static getPriorityForEvent(
    event: string,
    merchantPlan: "starter" | "professional" | "enterprise" = "starter",
  ): number {
    const planIndex =
      {
        starter: 0,
        professional: 1,
        enterprise: 2,
      }[merchantPlan] || 0;

    switch (event) {
      case "invoice.confirmed":
        return this.Priority.CONFIRMED[planIndex];
      case "invoice.expired":
      case "invoice.failed":
        return this.Priority.EXPIRED[planIndex];
      case "refund.created":
      case "refund.completed":
      case "refund.failed":
        return this.Priority.OTHER[planIndex];
      default:
        return this.Priority.OTHER[planIndex];
    }
  }

  /**
   * Initializes the webhook queue and worker.
   * Should be called once during application startup.
   */
  public static async init(): Promise<void> {
    if (this.isInitialized) {
      console.log("📬 WebhookQueue already initialized");
      return;
    }

    const connection = RedisClient.getInstance();
    if (!connection) {
      console.warn(
        "⚠️ Redis not available, webhooks will use synchronous delivery",
      );
      return;
    }

    // Test Redis connection
    const isConnected = await RedisClient.testConnection();
    if (!isConnected) {
      console.warn(
        "⚠️ Redis connection test failed, webhooks will use synchronous delivery",
      );
      return;
    }

    console.log("🔴 Redis connected, initializing BullMQ queue...");

    // BullMQ requires maxRetriesPerRequest: null and longer timeouts
    const bullmqConnection = {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
    } as any;

    // Create the queue
    this.queue = new Queue("webhooks", {
      connection: bullmqConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000, // 2s, 4s, 8s...
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 500, // Keep last 500 failed jobs
        },
      },
    });

    // Create the worker with concurrency
    this.worker = new Worker(
      "webhooks",
      async (job: Job) => {
        const { invoiceId, event, priority } = job.data;
        console.log(
          `📬 Processing webhook job ${job.id}: ${event} for ${invoiceId} (priority: ${priority})`,
        );

        const success = await WebhookDispatcher.dispatchSync(invoiceId, event);

        if (!success) {
          throw new Error(`Webhook delivery failed for ${invoiceId}`);
        }

        return { success, invoiceId, event };
      },
      {
        connection: bullmqConnection,
        concurrency: 10, // Process 10 webhooks in parallel
        limiter: {
          max: 50, // Max 50 jobs
          duration: 1000, // per second
        },
      },
    );

    // Event handlers
    this.worker.on("completed", (job) => {
      console.log(
        `✅ Webhook job ${job?.id} completed: ${job?.returnvalue?.event} for ${job?.returnvalue?.invoiceId}`,
      );
    });

    this.worker.on("failed", (job, err) => {
      console.error(
        `❌ Webhook job ${job?.id} failed: ${err.message}`,
        `Attempts: ${job?.attemptsMade}`,
      );
    });

    this.worker.on("error", (err) => {
      console.error("🔥 WebhookQueue worker error:", err);
    });

    this.worker.on("closing", () => {
      console.log("🔒 WebhookQueue worker closing...");
    });

    this.isInitialized = true;
    console.log("✅ WebhookQueue initialized (concurrency: 10)");
  }

  /**
   * Adds a webhook job to the queue.
   *
   * @param invoiceId - The invoice ID
   * @param event - The webhook event type
   * @param merchantPlan - Merchant's pricing plan (affects priority)
   */
  public static async dispatch(
    invoiceId: string,
    event: string,
    merchantPlan: "starter" | "professional" | "enterprise" = "starter",
  ): Promise<Job | null> {
    // If queue not initialized, fall back to synchronous delivery
    if (!this.queue || !this.isInitialized) {
      console.log("📬 WebhookQueue not ready, using synchronous delivery");
      await WebhookDispatcher.dispatch(invoiceId, event);
      return null;
    }

    const priority = this.getPriorityForEvent(event, merchantPlan);
    const job = await this.queue.add(
      "webhook",
      { invoiceId, event, priority, merchantPlan },
      {
        priority,
        jobId: `${invoiceId}:${event}:${Date.now()}`, // Unique job ID
      },
    );

    console.log(
      `📬 Webhook job ${job.id} queued: ${event} for ${invoiceId} (plan: ${merchantPlan}, priority: ${priority})`,
    );

    return job;
  }

  /**
   * Dispatches a confirmed event with plan-based priority.
   */
  public static async dispatchConfirmed(
    invoiceId: string,
    merchantPlan: "starter" | "professional" | "enterprise" = "starter",
  ): Promise<Job | null> {
    return this.dispatch(invoiceId, "invoice.confirmed", merchantPlan);
  }

  /**
   * Dispatches an expired event with plan-based priority.
   */
  public static async dispatchExpired(
    invoiceId: string,
    merchantPlan: "starter" | "professional" | "enterprise" = "starter",
  ): Promise<Job | null> {
    return this.dispatch(invoiceId, "invoice.expired", merchantPlan);
  }

  /**
   * Dispatches a failed event with plan-based priority.
   */
  public static async dispatchFailed(
    invoiceId: string,
    merchantPlan: "starter" | "professional" | "enterprise" = "starter",
  ): Promise<Job | null> {
    return this.dispatch(invoiceId, "invoice.failed", merchantPlan);
  }

  /**
   * Dispatches a refund webhook event with plan-based priority.
   */
  public static async dispatchRefund(
    refundId: string,
    event: string,
    merchantPlan: "starter" | "professional" | "enterprise" = "starter",
  ): Promise<Job | null> {
    if (!this.queue || !this.isInitialized) {
      console.log(
        "📬 WebhookQueue not ready, using synchronous delivery for refund",
      );
      await WebhookDispatcher.dispatchRefund(refundId, event);
      return null;
    }

    const priority = this.getPriorityForEvent(event, merchantPlan);
    const job = await this.queue.add(
      "webhook",
      { refundId, event, priority, merchantPlan },
      {
        priority,
        jobId: `refund:${refundId}:${event}:${Date.now()}`,
      },
    );

    console.log(
      `📬 Refund webhook job ${job.id} queued: ${event} for ${refundId} (plan: ${merchantPlan}, priority: ${priority})`,
    );

    return job;
  }

  /**
   * Gets queue statistics.
   */
  public static async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null> {
    if (!this.queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Gets all jobs in the queue (for debugging).
   */
  public static async getJobs(
    start: number = 0,
    end: number = 100,
  ): Promise<Job[]> {
    if (!this.queue) return [];
    return this.queue.getJobs(["waiting", "active", "delayed"], start, end);
  }

  /**
   * Removes a specific job from the queue.
   */
  public static async removeJob(jobId: string): Promise<boolean> {
    if (!this.queue) return false;
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  /**
   * Drains the queue (useful for testing or maintenance).
   */
  public static async drain(): Promise<void> {
    if (!this.queue) return;
    await this.queue.drain();
    console.log("🧹 WebhookQueue drained");
  }

  /**
   * Gracefully shuts down the queue and worker.
   */
  public static async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log("🔒 WebhookQueue worker closed");
    }

    if (this.queue) {
      await this.queue.close();
      this.queue = null;
      console.log("🔒 WebhookQueue closed");
    }

    this.isInitialized = false;
  }

  /**
   * Checks if the queue is initialized and ready.
   */
  public static isReady(): boolean {
    return this.isInitialized && this.queue !== null && this.worker !== null;
  }
}
