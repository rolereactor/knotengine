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
import { merchantRateLimit } from "../middleware/rate-limit.middleware.js";
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
      preHandler: [requireAuth, merchantRateLimit],
      schema: {
        headers: z
          .object({
            "idempotency-key": z.string().max(255).optional(),
          })
          .passthrough(),
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
        response: {
          201: {
            type: "object",
            properties: {
              object: { type: "string" },
              invoice_id: { type: "string" },
              amount_usd: { type: "number" },
              crypto_amount: { type: "number" },
              crypto_currency: { type: "string" },
              pay_address: { type: "string" },
              expires_at: { type: "string" },
              status: { type: "string" },
              checkout_url: { type: "string" },
              is_testnet: { type: "boolean" },
            },
            example: {
              object: "invoice",
              invoice_id: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
              amount_usd: 100.0,
              crypto_amount: 0.00152,
              crypto_currency: "BTC",
              pay_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
              expires_at: "2024-12-01T00:30:00.000Z",
              status: "pending",
              checkout_url:
                "https://pay.knotengine.com/checkout/inv_a1b2c3d4e5f6a7b8c9d0e1f2",
              is_testnet: false,
            },
          },
          400: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                  doc_url: { type: "string" },
                },
              },
            },
            example: {
              error: {
                type: "invalid_request_error",
                code: "below_minimum_amount",
                message: "Minimum invoice amount is $1.00.",
                doc_url:
                  "https://docs.knotengine.com/api/errors#below_minimum_amount",
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                  doc_url: { type: "string" },
                },
              },
            },
            example: {
              error: {
                type: "authentication_error",
                code: "unauthorized",
                message: "Authentication required. Provide a valid API key.",
                doc_url: "https://docs.knotengine.com/api/errors#unauthorized",
              },
            },
          },
          402: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                  doc_url: { type: "string" },
                },
              },
            },
            example: {
              error: {
                type: "invalid_request_error",
                code: "insufficient_credit",
                message:
                  "Insufficient credit balance. Please top up your account to continue creating invoices.",
                doc_url:
                  "https://docs.knotengine.com/api/errors#insufficient_credit",
              },
            },
          },
          429: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                  doc_url: { type: "string" },
                },
              },
            },
            example: {
              error: {
                type: "rate_limit_error",
                code: "invoice_limit_reached",
                message:
                  "Monthly invoice limit reached (500/500). Upgrade your plan to increase limits.",
                doc_url:
                  "https://docs.knotengine.com/api/errors#invoice_limit_reached",
              },
            },
          },
          500: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                  doc_url: { type: "string" },
                },
              },
            },
            example: {
              error: {
                type: "api_error",
                code: "internal_error",
                message:
                  "An unexpected error occurred while creating the invoice. Please try again.",
                doc_url:
                  "https://docs.knotengine.com/api/errors#internal_error",
              },
            },
          },
        },
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
      schema: {
        querystring: z.object({
          status: z.string().optional(),
          include_testnet: z.enum(["true", "false"]).optional(),
          only_testnet: z.enum(["true", "false"]).optional(),
          search: z.string().max(200).optional(),
          format: z.enum(["csv", "json"]).optional(),
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        }),
        response: {
          200: {
            type: "object",
            properties: {
              object: { type: "string" },
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    object: { type: "string" },
                    invoice_id: { type: "string" },
                    amount_usd: { type: "number" },
                    crypto_amount: { type: "number" },
                    crypto_amount_received: { type: "string" },
                    crypto_currency: { type: "string" },
                    pay_address: { type: "string" },
                    status: { type: "string" },
                    confirmations: { type: "number" },
                    required_confirmations: { type: "number" },
                    tx_hash: { type: ["string", "null"] },
                    expires_at: { type: "string" },
                    paid_at: { type: ["string", "null"] },
                    created_at: { type: "string" },
                    metadata: { type: "object" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  pages: { type: "integer" },
                },
              },
            },
            example: {
              object: "list",
              data: [
                {
                  object: "invoice",
                  invoice_id: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                  amount_usd: 100.0,
                  crypto_amount: 0.00152,
                  crypto_amount_received: "0.0000",
                  crypto_currency: "BTC",
                  pay_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                  status: "pending",
                  confirmations: 0,
                  required_confirmations: 1,
                  tx_hash: null,
                  expires_at: "2024-12-01T00:30:00.000Z",
                  paid_at: null,
                  created_at: "2024-12-01T00:00:00.000Z",
                  metadata: { orderId: "order_12345" },
                },
                {
                  object: "invoice",
                  invoice_id: "inv_b2c3d4e5f6a7b8c9d0e1f2a3",
                  amount_usd: 250.0,
                  crypto_amount: 0.0038,
                  crypto_amount_received: "0.0038",
                  crypto_currency: "BTC",
                  pay_address: "bc1q7f2z6y8x0w1v2u3t4s5r6q7p8n9m0l1k2j3h",
                  status: "confirmed",
                  confirmations: 3,
                  required_confirmations: 1,
                  tx_hash:
                    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
                  expires_at: "2024-12-01T00:30:00.000Z",
                  paid_at: "2024-12-01T00:15:00.000Z",
                  created_at: "2024-12-01T00:00:00.000Z",
                  metadata: {},
                },
              ],
              pagination: {
                total: 42,
                page: 1,
                limit: 20,
                pages: 3,
              },
            },
          },
          401: {
            type: "object",
            properties: {
              error: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  code: { type: "string" },
                  message: { type: "string" },
                  doc_url: { type: "string" },
                },
              },
            },
            example: {
              error: {
                type: "authentication_error",
                code: "unauthorized",
                message: "Authentication required. Provide a valid API key.",
                doc_url: "https://docs.knotengine.com/api/errors#unauthorized",
              },
            },
          },
        },
      },
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

  // ──────────────────────────────────────────────
  // GET /v1/invoices/export — Export Invoices (CSV/JSON)
  // ──────────────────────────────────────────────
  server.get(
    "/v1/invoices/export",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          status: z.string().optional(),
          include_testnet: z.enum(["true", "false"]).optional(),
          only_testnet: z.enum(["true", "false"]).optional(),
          search: z.string().max(200).optional(),
          format: z.enum(["csv", "json"]).optional(),
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        }),
      },
    },
    InvoicesController.listInvoicesExport,
  );

  // ──────────────────────────────────────────────
  // POST /v1/invoices/bulk-cancel — Bulk Cancel Invoices
  // ──────────────────────────────────────────────
  server.post(
    "/v1/invoices/bulk-cancel",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          invoice_ids: z.array(z.string()).min(1).max(100),
        }),
      },
    },
    InvoicesController.bulkCancelInvoices,
  );
}
