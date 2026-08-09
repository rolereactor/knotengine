import { FastifyInstance } from "fastify";
import { mongoose } from "@qodinger/knot-database";
import { RedisClient } from "../infra/redis-client.js";
import { BlockchainProviderPool } from "../infra/provider-pool.js";
import { isSelfHosted } from "../core/self-hosted-mode.js";

/**
 * Health / Readiness Check
 * Returns 200 when healthy or degraded (non-critical deps down),
 * 503 when a critical dependency (MongoDB) is unreachable.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const checks: Record<
      string,
      { status: "ok" | "degraded" | "error"; latencyMs?: number }
    > = {};

    // MongoDB — critical
    const mongoStart = Date.now();
    try {
      await mongoose.connection.db?.command({ ping: 1 });
      checks.mongodb = { status: "ok", latencyMs: Date.now() - mongoStart };
    } catch {
      checks.mongodb = {
        status: "error",
        latencyMs: Date.now() - mongoStart,
      };
    }

    // Redis — non-critical (graceful degradation is expected)
    const redisStart = Date.now();
    const redisOk = await RedisClient.testConnection();
    checks.redis = {
      status: redisOk ? "ok" : "degraded",
      latencyMs: Date.now() - redisStart,
    };

    // Blockchain providers — non-critical
    const providerHealth =
      BlockchainProviderPool.getInstance().getProviderHealth();
    for (const p of providerHealth) {
      checks[`provider_${p.name}`] = {
        status:
          p.state === "closed"
            ? "ok"
            : p.state === "halfOpen"
              ? "degraded"
              : "error",
      };
    }

    const isCriticalDown = checks.mongodb.status === "error";
    const hasAnyDegraded = Object.values(checks).some((c) => c.status !== "ok");
    const overallStatus = isCriticalDown
      ? "unhealthy"
      : hasAnyDegraded
        ? "degraded"
        : "ok";

    return reply.code(isCriticalDown ? 503 : 200).send({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      selfHosted: isSelfHosted(),
      checks,
    });
  });
}
