import Fastify from "fastify";
import cors from "@fastify/cors";
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
import * as Metrics from "./infra/metrics.js";

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import packageJson from "../package.json" with { type: "json" };

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment-specific .env file from monorepo root
const envSuffix =
  process.env.NODE_ENV === "production" ? "production" : "development";
const envFileName = `.env.${envSuffix}`;

const possibleEnvPaths = [
  path.resolve(__dirname, `../../../${envFileName}`), // Monorepo root from built dist/
  path.resolve(process.cwd(), envFileName), // Current working directory
  path.resolve(process.cwd(), `../../${envFileName}`), // Two levels up from CWD
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded ${envFileName} from ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn(
    `⚠️  No ${envFileName} file found. Relying on system environment variables.`,
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

server.register(cors, {
  origin: "*",
});

// 📊 Prometheus Monitoring
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
// ──────────────────────────────────────────────
server.get("/health", async () => {
  return {
    status: "ok",
    engine: `Knot v${packageJson.version}`,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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
let expirationInterval: NodeJS.Timeout;
let webhookCatchupInterval: NodeJS.Timeout;
let billingCheckInterval: NodeJS.Timeout;

function startBackgroundJobs() {
  // Initialize Webhook Queue (if Redis available)
  WebhookQueue.init().catch((err) => {
    console.warn(
      "⚠️ Failed to initialize WebhookQueue, using synchronous delivery:",
      err,
    );
  });

  // Expire stale invoices every 60 seconds
  expirationInterval = setInterval(async () => {
    try {
      await ConfirmationEngine.expireStaleInvoices();
      await Metrics.updateActiveInvoicesMetrics();
    } catch (err) {
      console.error("Expiration job error:", err);
    }
  }, 60 * 1000);

  // Update webhook queue metrics every 10 seconds
  setInterval(async () => {
    try {
      await Metrics.updateWebhookQueueMetrics();
    } catch (err) {
      console.warn("Failed to update webhook queue metrics:", err);
    }
  }, 10 * 1000);

  // Retry failed webhook deliveries every 5 minutes
  // Only needed if queue is not available (fallback mode)
  webhookCatchupInterval = setInterval(
    async () => {
      try {
        // If queue is ready, it handles retries automatically
        if (!WebhookQueue.isReady()) {
          await WebhookDispatcher.dispatchPending();
        }
      } catch (err) {
        console.error("Webhook catchup job error:", err);
      }
    },
    5 * 60 * 1000,
  );

  // Check for monthly billing every day at midnight
  billingCheckInterval = setInterval(
    async () => {
      try {
        await SubscriptionBilling.getInstance().checkAndProcessBilling();
      } catch (err) {
        console.error("Billing check error:", err);
      }
    },
    24 * 60 * 60 * 1000, // Run daily
  );

  // Invest float and accrue yield daily
  setInterval(
    async () => {
      try {
        await FloatManager.getInstance().investFloat();
        await FloatManager.getInstance().accrueYield();
      } catch (err) {
        console.error("Float management error:", err);
      }
    },
    24 * 60 * 60 * 1000, // Run daily
  );

  console.log(
    "⏰ Background jobs started (expiration + webhook catchup + billing)",
  );
}

// ──────────────────────────────────────────────
// Graceful Shutdown
// ──────────────────────────────────────────────
async function gracefulShutdown() {
  console.log("\n🛑 Shutting down gracefully...");

  // Stop background jobs
  clearInterval(expirationInterval);
  clearInterval(webhookCatchupInterval);
  clearInterval(billingCheckInterval);

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
