import { FastifyRequest, FastifyReply } from "fastify";
import { apiError } from "../utils/api-error.js";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const PLAN_LIMITS: Record<string, { max: number; windowMs: number }> = {
  enterprise: { max: 10000, windowMs: 60 * 60 * 1000 },
  professional: { max: 5000, windowMs: 60 * 60 * 1000 },
  starter: { max: 1000, windowMs: 60 * 60 * 1000 },
};

const DEFAULT_LIMIT = { max: 1000, windowMs: 60 * 60 * 1000 };

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
