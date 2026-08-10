import { Store } from "@qodinger/knot-database";
import { FastifyInstance, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { apiError } from "../utils/api-error.js";
import { requireStore } from "../middleware/store.middleware.js";

function generateStoreId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "str_";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function storeRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/stores — list stores
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/stores",
    {
      preHandler: [requireStore],
      schema: {
        tags: ["Stores"],
        summary: "List stores for the current merchant",
        response: {
          200: z.object({
            object: z.literal("list"),
            data: z.array(
              z.object({
                _id: z.string(),
                storeId: z.string(),
                name: z.string(),
                description: z.string().optional(),
                logoUrl: z.string().optional(),
                returnUrl: z.string().optional(),
                webhookUrl: z.string().optional(),
                enabledCurrencies: z.array(z.string()),
                isActive: z.boolean(),
                createdAt: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const merchant = request.merchant;
      const stores = await Store.find({
        merchantId: merchant._id,
        isDeleted: { $ne: true },
      }).sort({ createdAt: -1 });

      return reply.send({
        object: "list",
        data: stores.map((s) => ({
          _id: s._id.toString(),
          storeId: s.storeId,
          name: s.name,
          description: s.description,
          logoUrl: s.logoUrl,
          returnUrl: s.returnUrl,
          webhookUrl: s.webhookUrl,
          enabledCurrencies: s.enabledCurrencies,
          isActive: s.isActive,
          createdAt: s.createdAt.toISOString(),
        })),
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/stores — create store
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/stores",
    {
      preHandler: [requireStore],
      schema: {
        tags: ["Stores"],
        summary: "Create a new store",
        body: z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
        }),
        response: {
          201: z.object({
            object: z.literal("store"),
            storeId: z.string(),
            name: z.string(),
          }),
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const merchant = request.merchant;
      const { name, description } = request.body as {
        name: string;
        description?: string;
      };

      const storeId = generateStoreId();
      const store = await Store.create({
        merchantId: merchant._id,
        storeId,
        name,
        description,
      });

      return reply.code(201).send({
        object: "store",
        storeId: store.storeId,
        name: store.name,
      });
    },
  );

  // ──────────────────────────────────────────────
  // PATCH /v1/merchants/me/stores/:storeId — update store
  // ──────────────────────────────────────────────
  server.patch(
    "/v1/merchants/me/stores/:storeId",
    {
      preHandler: [requireStore],
      schema: {
        tags: ["Stores"],
        summary: "Update a store",
        params: z.object({
          storeId: z.string(),
        }),
        body: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().max(500).optional(),
          logoUrl: z.string().url().optional(),
          returnUrl: z.string().url().optional(),
          webhookUrl: z.string().url().optional(),
          enabledCurrencies: z.array(z.string()).optional(),
        }),
        response: {
          200: z.object({
            object: z.literal("store"),
            storeId: z.string(),
            name: z.string(),
          }),
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const merchant = request.merchant;
      const { storeId } = request.params as { storeId: string };
      const updates = request.body as Record<string, unknown>;

      const store = await Store.findOne({
        merchantId: merchant._id,
        storeId,
        isDeleted: { $ne: true },
      });

      if (!store) {
        return apiError(reply, 404, "store_not_found", "Store not found.");
      }

      Object.assign(store, updates);
      await store.save();

      return reply.send({
        object: "store",
        storeId: store.storeId,
        name: store.name,
      });
    },
  );

  // ──────────────────────────────────────────────
  // DELETE /v1/merchants/me/stores/:storeId — soft delete store
  // ──────────────────────────────────────────────
  server.delete(
    "/v1/merchants/me/stores/:storeId",
    {
      preHandler: [requireStore],
      schema: {
        tags: ["Stores"],
        summary: "Delete a store",
        params: z.object({
          storeId: z.string(),
        }),
        response: {
          200: z.object({
            object: z.literal("store"),
            deleted: z.literal(true),
          }),
        },
      },
    },
    async (request: any, reply: FastifyReply) => {
      const merchant = request.merchant;
      const { storeId } = request.params as { storeId: string };

      const store = await Store.findOne({
        merchantId: merchant._id,
        storeId,
        isDeleted: { $ne: true },
      });

      if (!store) {
        return apiError(reply, 404, "store_not_found", "Store not found.");
      }

      store.isDeleted = true;
      store.deletedAt = new Date();
      store.isActive = false;
      await store.save();

      return reply.send({
        object: "store",
        deleted: true,
      });
    },
  );
}
