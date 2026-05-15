import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AuthController } from "../controllers/auth.controller.js";
import {
  stripHtmlTags,
  limitLength,
  isValidEmail,
  MAX_EMAIL_LENGTH,
} from "@qodinger/knot-types";

const sanitizeEmailInput = (val: string) =>
  limitLength(stripHtmlTags(val).toLowerCase().trim(), MAX_EMAIL_LENGTH);

// In-memory rate limiting (simple, no Redis required)
const authRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkAuthRateLimit(ip: string): {
  allowed: boolean;
  retryAfter?: number;
} {
  const now = Date.now();
  const limit = authRateLimits.get(ip);

  if (!limit || now > limit.resetAt) {
    authRateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return { allowed: true };
  }

  if (limit.count >= 5) {
    return {
      allowed: false,
      retryAfter: Math.ceil((limit.resetAt - now) / 1000),
    };
  }

  limit.count++;
  return { allowed: true };
}

export async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // Rate Limiting for Auth Endpoints (5 req/min - Prevent brute force)
  // ──────────────────────────────────────────────
  server.addHook("preHandler", async (request, reply) => {
    // Skip rate limiting for localhost in development
    if (request.ip === "127.0.0.1" || request.ip === "::1") {
      return;
    }

    const result = checkAuthRateLimit(request.ip);
    if (!result.allowed) {
      return reply.code(429).send({
        error: "Too Many Requests",
        message: "Too many authentication attempts. Please try again later.",
        retryAfter: `${result.retryAfter}s`,
      });
    }
  });

  // ──────────────────────────────────────────────
  // POST /v1/auth/magic-link — Request a Login Link
  // ──────────────────────────────────────────────
  server.post(
    "/v1/auth/magic-link",
    {
      schema: {
        body: z.object({
          email: z
            .string()
            .email("Invalid email format")
            .max(
              MAX_EMAIL_LENGTH,
              `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
            )
            .transform(sanitizeEmailInput)
            .refine(isValidEmail, { message: "Invalid email format" }),
        }),
      },
    },
    AuthController.requestMagicLink,
  );

  // ──────────────────────────────────────────────
  // POST /v1/auth/verify — Exchange Token for Identity
  // ──────────────────────────────────────────────
  server.post(
    "/v1/auth/verify",
    {
      schema: {
        body: z.object({
          email: z
            .string()
            .email("Invalid email format")
            .max(MAX_EMAIL_LENGTH)
            .transform(sanitizeEmailInput)
            .refine(isValidEmail, { message: "Invalid email format" }),
          token: z.string().min(6, "Token must be 6 characters").max(128),
        }),
      },
    },
    AuthController.verifyMagicLink,
  );

  // ──────────────────────────────────────────────
  // POST /v1/auth/send-verification — Resend Verification Email
  // ──────────────────────────────────────────────
  server.post(
    "/v1/auth/send-verification",
    {
      schema: {
        body: z.object({
          email: z
            .string()
            .email("Invalid email format")
            .max(MAX_EMAIL_LENGTH)
            .transform(sanitizeEmailInput)
            .refine(isValidEmail, { message: "Invalid email format" }),
        }),
      },
    },
    AuthController.sendVerificationEmail,
  );

  // ──────────────────────────────────────────────
  // GET /v1/auth/me — Get Current User Status
  // ──────────────────────────────────────────────
  server.get("/v1/auth/me", AuthController.getCurrentUser);

  // ──────────────────────────────────────────────
  // GET /v1/auth/me/audit-logs — Get User Audit Logs
  // ──────────────────────────────────────────────
  server.get(
    "/v1/auth/me/audit-logs",
    {
      schema: {
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).default(20),
          offset: z.coerce.number().int().min(0).default(0),
          category: z
            .enum(["auth", "account", "security", "billing", "settings"])
            .optional(),
        }),
      },
    },
    AuthController.getUserAuditLogs,
  );
}
