import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { RefundsController } from "../controllers/refunds.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

/**
 * 💸 Refund Routes — /v1/refunds
 *
 * Full refund lifecycle management:
 *   POST   /v1/refunds         → Create a refund for an invoice
 *   GET    /v1/refunds         → List refunds (merchant-scoped)
 *   GET    /v1/refunds/:id     → Get refund details
 *   POST   /v1/refunds/:id/cancel → Cancel a pending refund
 */
export async function refundRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // POST /v1/refunds — Create Refund
  // ──────────────────────────────────────────────
  server.post(
    "/v1/refunds",
    {
      preHandler: requireAuth,
      schema: {
        headers: z
          .object({
            "idempotency-key": z.string().max(255).optional(),
          })
          .passthrough(),
        body: z.object({
          invoice_id: z.string().min(1),
          amount_usd: z.number().positive(),
          reason: z.string().min(1).max(500),
          refund_address: z.string().optional(),
        }),
        response: {
          201: {
            type: "object",
            properties: {
              object: { type: "string" },
              refund_id: { type: "string" },
              invoice_id: { type: "string" },
              amount_usd: { type: "number" },
              crypto_currency: { type: "string" },
              status: { type: "string" },
              reason: { type: "string" },
              created_at: { type: "string" },
            },
            example: {
              object: "refund",
              refund_id: "ref_a1b2c3d4e5f6a7b8c9d0e1f2",
              invoice_id: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
              amount_usd: 50.0,
              crypto_currency: "BTC",
              status: "pending",
              reason: "Customer requested full refund",
              created_at: "2024-12-01T00:00:00.000Z",
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
          },
          404: {
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
          },
        },
      },
    },
    RefundsController.createRefund,
  );

  // ──────────────────────────────────────────────
  // GET /v1/refunds — List Refunds (Merchant-Scoped)
  // ──────────────────────────────────────────────
  server.get(
    "/v1/refunds",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          status: z.string().optional(),
          invoice_id: z.string().optional(),
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
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
                    refund_id: { type: "string" },
                    invoice_id: { type: "string" },
                    amount_usd: { type: "number" },
                    crypto_currency: { type: "string" },
                    crypto_amount: { type: ["number", "null"] },
                    status: { type: "string" },
                    reason: { type: "string" },
                    tx_hash: { type: ["string", "null"] },
                    refund_address: { type: ["string", "null"] },
                    failure_reason: { type: ["string", "null"] },
                    processed_at: { type: ["string", "null"] },
                    created_at: { type: "string" },
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
          },
        },
      },
    },
    RefundsController.listRefunds,
  );

  // ──────────────────────────────────────────────
  // GET /v1/refunds/:id — Get Refund Details
  // ──────────────────────────────────────────────
  server.get<{ Params: { id: string } }>(
    "/v1/refunds/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    RefundsController.getRefund,
  );

  // ──────────────────────────────────────────────
  // POST /v1/refunds/:id/cancel — Cancel Refund
  // ──────────────────────────────────────────────
  server.post<{ Params: { id: string } }>(
    "/v1/refunds/:id/cancel",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    RefundsController.cancelRefund,
  );
}
