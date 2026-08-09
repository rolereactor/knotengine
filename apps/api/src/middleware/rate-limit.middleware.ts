import { FastifyRequest, FastifyReply } from "fastify";
import { apiError } from "../utils/api-error.js";
import { RedisClient } from "../infra/redis-client.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const PLAN_LIMITS: Record<string, { max: number; windowMs: number }> = {
  enterprise: { max: 10000, windowMs: 60 * 60 * 1000 },
  professional: { max: 5000, windowMs: 60 * 60 * 1000 },
  starter: { max: 1000, windowMs: 60 * 60 * 1000 },
};

const DEFAULT_LIMIT = { max: 1000, windowMs: 60 * 60 * 1000 };

// In-memory fallback when Redis is unavailable
const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export const merchantRateLimit = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const merchant = (request as any).merchant;
  if (!merchant) return;

  const plan = merchant.plan || "starter";
  const limits = PLAN_LIMITS[plan] || DEFAULT_LIMIT;
  const key = `rate:${merchant.merchantId || merchant._id}`;
  const now = Date.now();

  // Try Redis-backed rate limiting first
  if (RedisClient.isReady()) {
    try {
      const redis = (RedisClient as any).getInstance();
      if (redis) {
        const multi = redis.multi();
        multi.incr(key);
        multi.pexpire(key, limits.windowMs);
        const results = await multi.exec();

        const count = results[0]?.[1] as number;
        const ttl = await redis.pttl(key);
        const resetAt = ttl > 0 ? now + ttl : now + limits.windowMs;

        reply.header("X-RateLimit-Limit", limits.max);
        reply.header("X-RateLimit-Remaining", Math.max(0, limits.max - count));
        reply.header("X-RateLimit-Reset", new Date(resetAt).toISOString());

        if (count > limits.max) {
          return apiError(
            reply,
            429,
            "rate_limit_exceeded",
            `Rate limit exceeded. Retry after ${Math.ceil(ttl / 1000)} seconds.`,
          );
        }
        return;
      }
    } catch {
      // Fall through to in-memory
    }
  }

  // In-memory fallback
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + limits.windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;

  reply.header("X-RateLimit-Limit", limits.max);
  reply.header("X-RateLimit-Remaining", Math.max(0, limits.max - entry.count));
  reply.header("X-RateLimit-Reset", new Date(entry.resetAt).toISOString());

  if (entry.count > limits.max) {
    return apiError(
      reply,
      429,
      "rate_limit_exceeded",
      `Rate limit exceeded. Retry after ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
    );
  }
};
