import {
  SUPPORTED_CURRENCIES,
  stripHtmlTags,
  limitLength,
  MAX_TEXT_LENGTH,
} from "@qodinger/knot-types";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { InvoicesController } from "../controllers/invoices.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import rateLimit from "@fastify/rate-limit";

const sanitizeDescription = (val?: string) =>
  val ? limitLength(stripHtmlTags(val).trim(), MAX_TEXT_LENGTH) : val;

/**
 * 🧾 Invoice Routes — /v1/invoices
 *
 * Full invoice lifecycle management:
 *   POST   /v1/invoices         → Create a new invoice
 *   GET    /v1/invoices/:id     → Get invoice status
 *   GET    /v1/invoices         → List invoices (merchant-scoped)
 *   POST   /v1/invoices/:id/cancel → Cancel a pending invoice
 */
export async function invoiceRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // Rate Limiting: Per-Merchant Invoice Creation (10 req/min)
  // Prevents individual merchants from spamming invoice creation
  // ──────────────────────────────────────────────
  server.register(rateLimit, {
    max: (request) => {
      const merchant = (request as any).merchant;
      // Define tier-based rate limits (Invoices created per minute)
      if (merchant?.plan === "enterprise") return 600; // 10 req/s equivalent
      if (merchant?.plan === "professional") return 300; // 5 req/s equivalent
      return 60; // Starter tier limit (1 req/s)
    },
    timeWindow: "1 minute",
    keyGenerator: (request) => {
      // Use merchant ID if authenticated, otherwise IP
      const merchant = (request as any).merchant;
      return merchant?._id?.toString() || request.ip;
    },
    allowList: ["127.0.0.1", "::1"], // Whitelist localhost for development
    errorResponseBuilder: (request, context) => {
      return {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Maximum ${context.max} invoices per minute. Please wait or upgrade your plan.`,
        retryAfter: context.after,
      };
    },
  });

  // ──────────────────────────────────────────────
  // POST /v1/invoices — Create Invoice
  // ──────────────────────────────────────────────
  server.post(
    "/v1/invoices",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          amount_usd: z.number().positive(),
          currency: z.enum(SUPPORTED_CURRENCIES),
          /** Invoice TTL in minutes (optional, falls back to merchant setting) */
          ttl_minutes: z.number().int().min(15).max(1440).optional(),
          metadata: z.record(z.unknown()).optional(),
          description: z
            .string()
            .max(
              MAX_TEXT_LENGTH,
              `Description must be ${MAX_TEXT_LENGTH} characters or less`,
            )
            .transform(sanitizeDescription)
            .optional(),
          is_testnet: z.boolean().optional(),
        }),
      },
    },
    InvoicesController.createInvoice,
  );

  // ──────────────────────────────────────────────
  // GET /v1/invoices/:id — Get Invoice Status
  // ──────────────────────────────────────────────
  server.get<{ Params: { id: string } }>(
    "/v1/invoices/:id",
    // Public route, no preHandler required
    InvoicesController.getInvoiceStatus,
  );

  // ──────────────────────────────────────────────
  // GET /v1/invoices — List Invoices (Merchant-Scoped)
  // ──────────────────────────────────────────────
  server.get(
    "/v1/invoices",
    {
      preHandler: requireAuth,
    },
    InvoicesController.listInvoices,
  );

  // ──────────────────────────────────────────────
  // POST /v1/invoices/:id/cancel — Cancel Invoice
  // ──────────────────────────────────────────────
  server.post<{ Params: { id: string } }>(
    "/v1/invoices/:id/cancel",
    {
      preHandler: requireAuth,
    },
    InvoicesController.cancelInvoice,
  );

  // ──────────────────────────────────────────────
  // POST /v1/invoices/:id/resolve — Manual Resolve
  // ──────────────────────────────────────────────
  server.post<{ Params: { id: string } }>(
    "/v1/invoices/:id/resolve",
    {
      preHandler: requireAuth,
    },
    InvoicesController.resolveInvoice,
  );
}
