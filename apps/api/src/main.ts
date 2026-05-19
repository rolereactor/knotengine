import Fastify from "fastify";
import cors from "@fastify/cors";
import csrf from "@fastify/csrf-protection";
import metrics from "fastify-metrics";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { merchantRoutes } from "./routes/merchants.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { twoFactorRoutes } from "./routes/two-factor.js";
import { configRoutes } from "./routes/config.js";
import { authRoutes } from "./routes/auth.js";
import { uploadRoutes } from "./routes/upload.js";
import { floatRoutes } from "./routes/float.js";
import { PriceOracle } from "./infra/price-feed.js";
import { ConfirmationEngine } from "./core/confirmation-engine.js";
import { WebhookDispatcher } from "./infra/webhook-dispatcher.js";
import { SubscriptionBilling } from "./core/subscription-billing.js";
import { FloatManager } from "./core/float-manager.js";
import { Currency } from "@qodinger/knot-types";
import { connectToDatabase } from "@qodinger/knot-database";
import { SocketService } from "./infra/socket-service.js";
import { WebhookQueue } from "./infra/webhook-queue.js";
import { RedisClient } from "./infra/redis-client.js";
import { ScheduledJobs } from "./infra/scheduled-jobs.js";
import { isSelfHosted } from "./core/self-hosted-mode.js";
import * as Metrics from "./infra/metrics.js";

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import packageJson from "../package.json" with { type: "json" };

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files from monorepo root (Next.js convention)
const env = process.env.NODE_ENV || "development";
const baseDir = path.resolve(__dirname, "..");

const envFiles = [
  path.resolve(baseDir, `../../.env.${env}.local`),
  path.resolve(baseDir, "../../.env.local"),
  path.resolve(baseDir, `../../.env.${env}`),
  path.resolve(baseDir, "../../.env"),
];

let envLoaded = false;
for (const envPath of envFiles) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded ${path.basename(envPath)} from ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn(
    "⚠️  No .env file found. Relying on system environment variables.",
  );
}

const server = Fastify({
  logger: true,
});

// Zod validation integration
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Swagger Documentation
server.register(swagger, {
  swagger: {
    info: {
      title: "KnotEngine API",
      description: "Non-custodial crypto payment infrastructure API",
      version: packageJson.version,
    },
    host: "localhost:5050",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
  },
});

server.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const corsOptions =
  process.env.NODE_ENV === "production"
    ? ({
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(
            new Error(`Origin '${origin}' not allowed by CORS policy`),
            false,
          );
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as const,
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "x-api-key",
          "x-oauth-id",
          "x-merchant-id",
          "x-internal-secret",
        ],
        credentials: true,
      } as any)
    : {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as const,
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "x-api-key",
          "x-oauth-id",
          "x-merchant-id",
          "x-internal-secret",
        ],
      };

server.register(cors, corsOptions);

// CSRF Protection: Prevents cross-site request forgery on state-changing requests
// Only applies to non-API-key authenticated endpoints (browser-based sessions)
server.register(csrf, {
  // @ts-expect-error - cookie options not in types but valid at runtime
  cookie: {
    key: "csrf-token",
    httpOnly: true,
    sameSite: "strict",
  },
  // Skip CSRF for API-key authenticated routes (those use cryptographic signatures)
  skipRoutes: (req: any) => {
    const apiKey = req.headers["x-api-key"];
    if (apiKey) return true;
    // Skip for webhook callbacks (external systems)
    if (req.url?.includes("/v1/webhooks/")) return true;
    // Skip for simulation endpoints (development only)
    if (req.url?.includes("/v1/simulation/")) return true;
    return false;
  },
});

// 📊 Prometheus Monitoring
// @ts-expect-error - fastify-metrics types are incompatible with our Fastify version
server.register(metrics as any, {
  endpoint: "/metrics",
  defaultMetrics: { enabled: true },
  routeMetrics: { enabled: true },
});

// ──────────────────────────────────────────────
// Rate Limiting - Tiered Protection
// ──────────────────────────────────────────────

// 1. Global Default Rate Limit (General API endpoints)
server.register(rateLimit, {
  max: 100, // 100 requests
  timeWindow: "1 minute",
  allowList: ["127.0.0.1", "::1"], // Whitelist localhost for development
  errorResponseBuilder: (request, context) => {
    return {
      error: "Too Many Requests",
      message: `Rate limit exceeded. Maximum ${context.max} requests per minute.`,
      retryAfter: context.after,
    };
  },
});

// Initialize real-time updates
SocketService.init(server.server);

// ──────────────────────────────────────────────
// Health Check
server.get("/health", async () => {
  return {
    status: "ok",
    engine: `Knot v${packageJson.version}`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    selfHosted: isSelfHosted(),
  };
});

// ──────────────────────────────────────────────
// Route Registration
// ──────────────────────────────────────────────
server.register(merchantRoutes);
server.register(invoiceRoutes);
server.register(webhookRoutes);
server.register(twoFactorRoutes);
server.register(configRoutes);
server.register(authRoutes);
server.register(uploadRoutes);
server.register(floatRoutes);

// ──────────────────────────────────────────────
// Price Oracle Endpoint (Phase 1)
// ──────────────────────────────────────────────
server.get<{ Params: { currency: string } }>(
  "/v1/price/:currency",
  async (request, reply) => {
    const { currency } = request.params;
    try {
      const price = await PriceOracle.getPrice(
        currency.toUpperCase() as Currency,
      );
      return {
        asset: currency.toUpperCase(),
        price_usd: price,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({
        error: "Price Fetch Failed",
        details: message,
      });
    }
  },
);

// ──────────────────────────────────────────────
// Background Jobs
// ──────────────────────────────────────────────
let webhookMetricsInterval: NodeJS.Timeout;

function startBackgroundJobs() {
  // Initialize BullMQ Scheduled Jobs (durable, crash-resilient)
  ScheduledJobs.init().catch((err) => {
    console.warn(
      "⚠️ Failed to initialize ScheduledJobs, falling back to in-memory jobs:",
      err,
    );
    startInMemoryJobs();
  });

  // Initialize Webhook Queue (if Redis available)
  WebhookQueue.init().catch((err) => {
    console.warn(
      "⚠️ Failed to initialize WebhookQueue, using synchronous delivery:",
      err,
    );
  });

  // Update webhook queue metrics every 10 seconds
  // (BullMQ handles job scheduling; we just monitor)
  webhookMetricsInterval = setInterval(async () => {
    try {
      await Metrics.updateWebhookQueueMetrics();
    } catch (err) {
      console.warn("Failed to update webhook queue metrics:", err);
    }
  }, 10 * 1000);

  console.log(
    "⏰ Background jobs started (durable BullMQ + webhook monitoring)",
  );
}

function startInMemoryJobs() {
  // Fallback for environments without Redis
  console.log("⚠️ Using in-memory job fallback (less resilient)");

  // Expire stale invoices every 60 seconds
  const expirationInterval = setInterval(async () => {
    try {
      await ConfirmationEngine.expireStaleInvoices();
      await Metrics.updateActiveInvoicesMetrics();
    } catch (err) {
      console.error("Expiration job error:", err);
    }
  }, 60 * 1000);

  // Retry failed webhook deliveries every 5 minutes
  const webhookCatchupInterval = setInterval(
    async () => {
      try {
        if (!WebhookQueue.isReady()) {
          await WebhookDispatcher.dispatchPending();
        }
      } catch (err) {
        console.error("Webhook catchup job error:", err);
      }
    },
    5 * 60 * 1000,
  );

  // Check for monthly billing daily
  const billingCheckInterval = setInterval(
    async () => {
      try {
        await SubscriptionBilling.getInstance().checkAndProcessBilling();
      } catch (err) {
        console.error("Billing check error:", err);
      }
    },
    24 * 60 * 60 * 1000,
  );

  // Float management daily
  const floatInterval = setInterval(
    async () => {
      try {
        await FloatManager.getInstance().investFloat();
        await FloatManager.getInstance().accrueYield();
      } catch (err) {
        console.error("Float management error:", err);
      }
    },
    24 * 60 * 60 * 1000,
  );

  // Store intervals for cleanup (needed for in-memory fallback)
  (globalThis as any).__jobIntervals = {
    expirationInterval,
    webhookCatchupInterval,
    billingCheckInterval,
    floatInterval,
  };
}

// ──────────────────────────────────────────────
// Graceful Shutdown
// ──────────────────────────────────────────────
async function gracefulShutdown() {
  console.log("\n🛑 Shutting down gracefully...");

  // Clear any in-memory job intervals
  const intervals = (globalThis as any).__jobIntervals;
  if (intervals) {
    Object.values(intervals).forEach((interval) =>
      clearInterval(interval as any),
    );
  }
  clearInterval(webhookMetricsInterval);

  // Close scheduled jobs
  await ScheduledJobs.shutdown();

  // Close webhook queue
  await WebhookQueue.shutdown();

  // Close Redis connection
  await RedisClient.disconnect();

  // Close Fastify server
  await server.close();

  console.log("✅ Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// ──────────────────────────────────────────────
// Server Startup
// ──────────────────────────────────────────────
const start = async () => {
  try {
    const mongoUri =
      process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/knotengine";

    await connectToDatabase(mongoUri);

    startBackgroundJobs();

    const port = parseInt(process.env.PORT || "3000", 10);
    await server.listen({ port, host: "0.0.0.0" });
    console.log(
      `🚀 KnotEngine v${packageJson.version} running on http://localhost:${port}`,
    );

    console.log("⚡ Socket.io ready for real-time updates");
    console.log("📋 Phase 2: Monitoring & Persistence — ACTIVE");
  } catch (err) {
    server.log.error(err);
    gracefulShutdown();
  }
};

start();
