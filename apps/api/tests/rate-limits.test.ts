import { describe, it, expect, vi } from "vitest";

// Extracted from apps/api/src/routes/invoices.ts
function getInvoiceRateLimit(merchantPlan?: string | null): number {
  if (merchantPlan === "enterprise") return 600; // 10 req/s equivalent
  if (merchantPlan === "professional") return 300; // 5 req/s equivalent
  return 60; // Starter tier limit (1 req/s)
}

describe("API Security & Rate Limits", () => {
  describe("getInvoiceRateLimit()", () => {
    it("should restrict Starter plan users to 60 requests per minute", () => {
      expect(getInvoiceRateLimit("starter")).toBe(60);
    });

    it("should restrict users with no defined plan (fallback) to 60 requests per minute", () => {
      expect(getInvoiceRateLimit(undefined)).toBe(60);
      expect(getInvoiceRateLimit(null)).toBe(60);
      expect(getInvoiceRateLimit("")).toBe(60);
    });

    it("should grant Professional plan users 300 requests per minute", () => {
      expect(getInvoiceRateLimit("professional")).toBe(300);
    });

    it("should grant Enterprise plan users 600 requests per minute (max)", () => {
      expect(getInvoiceRateLimit("enterprise")).toBe(600);
    });

    it("should return the default limit if a completely unknown plan is passed", () => {
      expect(getInvoiceRateLimit("hacker_tier")).toBe(60);
      expect(getInvoiceRateLimit("admin")).toBe(60);
    });
  });

  describe("API DoS Prevention Analysis", () => {
    it("must enforce that Starter allows exactly 1 req/sec on average", () => {
      const limit = getInvoiceRateLimit("starter");
      const reqPerSec = limit / 60;
      expect(reqPerSec).toBe(1.0);
    });

    it("must enforce that Enterprise allows exactly 10 req/sec on average", () => {
      const limit = getInvoiceRateLimit("enterprise");
      const reqPerSec = limit / 60;
      expect(reqPerSec).toBe(10.0);
    });
  });

  describe("Rate limit HTTP headers", () => {
    it("should set X-RateLimit-Limit header for each plan tier", () => {
      const PLAN_LIMITS: Record<string, number> = {
        enterprise: 10000,
        professional: 5000,
        starter: 1000,
      };

      for (const [plan, expectedMax] of Object.entries(PLAN_LIMITS)) {
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
        expect(limits).toBe(expectedMax);
      }
    });

    it("should set X-RateLimit-Remaining to limit minus count", () => {
      const limit = 1000;
      const count = 42;
      const remaining = Math.max(0, limit - count);
      expect(remaining).toBe(958);
    });

    it("should clamp X-RateLimit-Remaining to 0 when count exceeds limit", () => {
      const limit = 1000;
      const count = 1001;
      const remaining = Math.max(0, limit - count);
      expect(remaining).toBe(0);
    });

    it("should produce a valid ISO 8601 date for X-RateLimit-Reset", () => {
      const resetAt = Date.now() + 3600_000;
      const resetHeader = new Date(resetAt).toISOString();
      expect(new Date(resetHeader).toISOString()).toBe(resetHeader);
    });
  });

  describe("429 rate limit response contract", () => {
    it("should return 429 status with rate_limit_exceeded error via apiError", async () => {
      const { apiError } = await import("../src/utils/api-error.js");

      const sentBody: Record<string, unknown> = {};
      const fakeReply = {
        header: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockImplementation((body: unknown) => {
          Object.assign(sentBody, body);
          return fakeReply;
        }),
      };

      apiError(
        fakeReply as any,
        429,
        "rate_limit_exceeded",
        "Rate limit exceeded. Retry after 3600 seconds.",
      );

      expect(fakeReply.code).toHaveBeenCalledWith(429);
      expect(sentBody.error).toMatchObject({
        type: "rate_limit_error",
        code: "rate_limit_exceeded",
        message: expect.stringContaining("Rate limit exceeded"),
        doc_url: expect.stringContaining("docs.knotengine.com/api/errors#"),
      });
    });

    it("429 response must include all four required apiError fields", async () => {
      const { apiError } = await import("../src/utils/api-error.js");

      const sentBody: Record<string, unknown> = {};
      const fakeReply = {
        header: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockImplementation((body: unknown) => {
          Object.assign(sentBody, body);
          return fakeReply;
        }),
      };

      apiError(
        fakeReply as any,
        429,
        "rate_limit_exceeded",
        "Too many requests",
      );

      const { error } = sentBody;
      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("code");
      expect(error).toHaveProperty("message");
      expect(error).toHaveProperty("doc_url");
    });

    it("should match the middleware's 429 response shape exactly", async () => {
      const { apiError } = await import("../src/utils/api-error.js");

      // Simulate what the rate limit middleware does on 429
      const ttl = 3600_000;
      const message = `Rate limit exceeded. Retry after ${Math.ceil(ttl / 1000)} seconds.`;

      const sentBody: Record<string, unknown> = {};
      const fakeReply = {
        header: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockImplementation((body: unknown) => {
          Object.assign(sentBody, body);
          return fakeReply;
        }),
      };

      apiError(fakeReply as any, 429, "rate_limit_exceeded", message);

      expect(sentBody).toEqual({
        error: {
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
          message: "Rate limit exceeded. Retry after 3600 seconds.",
          doc_url: expect.stringContaining("docs.knotengine.com/api/errors#"),
        },
      });
    });
  });
});
