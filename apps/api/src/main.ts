import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import csrf from "@fastify/csrf-protection";
import metrics from "fastify-metrics";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "crypto";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { merchantRoutes } from "./routes/merchants.js";
import { apiError } from "./utils/api-error.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { twoFactorRoutes } from "./routes/two-factor.js";
import { configRoutes } from "./routes/config.js";
import { authRoutes } from "./routes/auth.js";
import { uploadRoutes } from "./routes/upload.js";
import { floatRoutes } from "./routes/float.js";
import { paymentLinkRoutes } from "./routes/payment-links.js";
import { donationRoutes } from "./routes/donations.js";
import { affiliateRoutes } from "./routes/affiliates.js";
import { whiteLabelRoutes } from "./routes/white-label.js";
import { posRoutes } from "./routes/pos.js";
import { healthRoutes } from "./routes/health.js";
import { refundRoutes } from "./routes/refunds.js";
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

import * as Metrics from "./infra/metrics.js";
import { initSentry, captureException } from "./infra/sentry.js";

import { logger } from "./infra/logger.js";
import { generateOpenAPISpec } from "./docs/openapi.js";

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
    logger.info(`✅ Loaded ${path.basename(envPath)} from ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  logger.warn(
    "⚠️  No .env file found. Relying on system environment variables.",
  );
}

// ──────────────────────────────────────────────
// Validate required environment variables (fail fast)
// ──────────────────────────────────────────────
function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  // ── Core Infrastructure (always required) ──
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required (MongoDB connection string)");
  } else if (!process.env.DATABASE_URL.startsWith("mongodb")) {
    errors.push("DATABASE_URL must start with 'mongodb' or 'mongodb+srv'");
  }

  if (!process.env.AUTH_SECRET) {
    errors.push("AUTH_SECRET is required (NextAuth secret, min 16 chars)");
  } else if (process.env.AUTH_SECRET.length < 16) {
    errors.push("AUTH_SECRET must be at least 16 characters");
  }

  if (!process.env.INTERNAL_SECRET) {
    errors.push(
      "INTERNAL_SECRET is required (Dashboard <-> API communication secret, min 16 chars)",
    );
  } else if (process.env.INTERNAL_SECRET.length < 16) {
    errors.push("INTERNAL_SECRET must be at least 16 characters");
  }

  // ── Blockchain Providers (at least one webhook secret required) ──
  const hasAlchemy = !!process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
  const hasTatum = !!process.env.TATUM_WEBHOOK_SECRET;

  if (!hasAlchemy && !hasTatum) {
    errors.push(
      "At least one of ALCHEMY_WEBHOOK_SIGNING_KEY or TATUM_WEBHOOK_SECRET is required for webhook verification",
    );
  }

  // Conditional: full Alchemy setup requires API key + auth token + notify webhook ID
  if (hasAlchemy) {
    if (!process.env.ALCHEMY_API_KEY) {
      errors.push(
        "ALCHEMY_API_KEY is required when ALCHEMY_WEBHOOK_SIGNING_KEY is set",
      );
    }
    if (!process.env.ALCHEMY_AUTH_TOKEN) {
      warnings.push(
        "ALCHEMY_AUTH_TOKEN is recommended for Alchemy webhook management",
      );
    }
    if (!process.env.ALCHEMY_NOTIFY_WEBHOOK_ID) {
      warnings.push(
        "ALCHEMY_NOTIFY_WEBHOOK_ID is recommended for Alchemy webhook management",
      );
    }
  }

  // Conditional: full Tatum setup requires API key
  if (hasTatum && !process.env.TATUM_API_KEY) {
    errors.push("TATUM_API_KEY is required when TATUM_WEBHOOK_SECRET is set");
  }

  // ── Service URLs ──
  if (!process.env.PUBLIC_URL) {
    warnings.push(
      "PUBLIC_URL is not set — Tatum webhook callbacks will use localhost",
    );
  }

  if (!process.env.CHECKOUT_URL && !process.env.NEXT_PUBLIC_CHECKOUT_URL) {
    warnings.push(
      "Neither CHECKOUT_URL nor NEXT_PUBLIC_CHECKOUT_URL is set — payment links will fall back to http://localhost:5051",
    );
  }

  if (!process.env.DASHBOARD_URL && !process.env.NEXT_PUBLIC_DASHBOARD_URL) {
    warnings.push(
      "Neither DASHBOARD_URL nor NEXT_PUBLIC_DASHBOARD_URL is set — email links will fall back to http://localhost:5052",
    );
  }

  // ── Production-only validations ──
  if (isProd) {
    if (!process.env.ALLOWED_ORIGINS) {
      errors.push(
        "ALLOWED_ORIGINS is required in production (comma-separated list of allowed origins)",
      );
    }

    const hasEmail =
      !!process.env.RESEND_API_KEY ||
      (!!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD);
    if (!hasEmail) {
      warnings.push(
        "No email provider configured (RESEND_API_KEY or GMAIL_USER + GMAIL_APP_PASSWORD) — transactional emails will not be sent",
      );
    }

    if (!process.env.SENTRY_DSN) {
      warnings.push(
        "SENTRY_DSN is not set — production errors will not be reported to Sentry",
      );
    }
  }

  // ── Output results ──
  if (warnings.length > 0) {
    for (const warn of warnings) {
      logger.warn(`⚠️  ${warn}`);
    }
  }

  if (errors.length > 0) {
    logger.error("❌ Missing or invalid environment variables:");
    for (const err of errors) {
      logger.error(`   • ${err}`);
    }
    logger.error(
      "\n💡 Copy .env.example to .env.local and fill in the required values.",
    );
    process.exit(1);
  }
}

validateEnv();

// Initialize Sentry before anything else so unhandled exceptions are captured
initSentry(packageJson.version);

const server = Fastify({
  logger: true,
  trustProxy: true,
});

// Zod validation integration
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Security Headers
server.register(helmet);

// X-Request-Id for debugging
server.addHook("onRequest", async (request) => {
  request.id = (request.headers["x-request-id"] as string) || randomUUID();
});

server.addHook("onSend", async (request, reply) => {
  reply.header("X-Request-Id", request.id);
});

// Capture unhandled Fastify errors in Sentry
server.setErrorHandler((err, request, reply) => {
  if (reply.statusCode >= 500) {
    captureException(err, {
      url: request.url,
      method: request.method,
      merchant: (request as any).merchant?._id?.toString(),
    });
  }
  reply.send(err);
});

// Swagger Documentation — disabled in production
if (process.env.NODE_ENV !== "production") {
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
}

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
  allowList: process.env.NODE_ENV !== "production" ? ["127.0.0.1", "::1"] : [],
  errorResponseBuilder: (_request, context) => ({
    error: {
      type: "rate_limit_error",
      code: "rate_limit_exceeded",
      message: `Rate limit exceeded. Maximum ${context.max} requests per minute. Retry after ${context.after}.`,
      doc_url: "https://docs.knotengine.com/api/errors#rate_limit_exceeded",
    },
  }),
});

// Initialize real-time updates
SocketService.init(server.server);

// ──────────────────────────────────────────────
// Route Registration
// ──────────────────────────────────────────────
server.register(healthRoutes);
server.register(merchantRoutes);
server.register(invoiceRoutes);
server.register(webhookRoutes);
server.register(twoFactorRoutes);
server.register(configRoutes);
server.register(authRoutes);
server.register(uploadRoutes);
server.register(floatRoutes);
server.register(paymentLinkRoutes);
server.register(donationRoutes);
server.register(affiliateRoutes);
server.register(whiteLabelRoutes);
server.register(posRoutes);
server.register(refundRoutes);

// ──────────────────────────────────────────────
// OpenAPI Spec — served at /openapi.json
// ──────────────────────────────────────────────
server.get("/openapi.json", async (_request, reply) => {
  reply.header("Content-Type", "application/json; charset=utf-8");
  return reply.send(generateOpenAPISpec());
});

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
      server.log.warn(`Price fetch failed for ${currency}: ${message}`);
      return apiError(
        reply,
        400,
        "invalid_request",
        "Unable to retrieve price for the requested asset.",
      );
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
    logger.warn(
      "⚠️ Failed to initialize ScheduledJobs, falling back to in-memory jobs:",
      err,
    );
    startInMemoryJobs();
  });

  // Initialize Webhook Queue (if Redis available)
  WebhookQueue.init().catch((err) => {
    logger.warn(
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
      logger.warn("Failed to update webhook queue metrics:", err);
    }
  }, 10 * 1000);

  logger.info(
    "⏰ Background jobs started (durable BullMQ + webhook monitoring)",
  );
}

function startInMemoryJobs() {
  // Fallback for environments without Redis
  logger.info("⚠️ Using in-memory job fallback (less resilient)");

  // Expire stale invoices every 60 seconds
  const expirationInterval = setInterval(async () => {
    try {
      await ConfirmationEngine.expireStaleInvoices();
      await Metrics.updateActiveInvoicesMetrics();
    } catch (err) {
      logger.error("Expiration job error:", err);
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
        logger.error("Webhook catchup job error:", err);
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
        logger.error("Billing check error:", err);
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
        logger.error("Float management error:", err);
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
  logger.info("\n🛑 Shutting down gracefully...");

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

  logger.info("✅ Shutdown complete");
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

    // Wire up database query metrics
    Metrics.instrumentMongoose();

    startBackgroundJobs();

    const port = parseInt(process.env.PORT || "3000", 10);
    await server.listen({ port, host: "0.0.0.0" });
    logger.info(
      `🚀 KnotEngine v${packageJson.version} running on http://localhost:${port}`,
    );

    logger.info("⚡ Socket.io ready for real-time updates");
    logger.info("📋 Phase 2: Monitoring & Persistence — ACTIVE");
  } catch (err) {
    server.log.error(err);
    gracefulShutdown();
  }
};

start();
