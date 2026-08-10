import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  PosProduct,
  PosCategory,
  PosRegister,
  Invoice,
} from "@qodinger/knot-database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { apiError } from "../utils/api-error.js";
import { SUPPORTED_CURRENCIES } from "@qodinger/knot-types";
import * as crypto from "crypto";

/**
 * 🏪 PoS Routes — /v1/pos
 *
 * Point-of-Sale management: products, categories, registers, and checkout.
 *   Products
 *     POST   /v1/pos/products           → Create a product
 *     GET    /v1/pos/products           → List products
 *     GET    /v1/pos/products/search    → Search products
 *     GET    /v1/pos/products/:id       → Get a product
 *     PATCH  /v1/pos/products/:id       → Update a product
 *     DELETE /v1/pos/products/:id       → Deactivate a product
 *   Categories
 *     POST   /v1/pos/categories         → Create a category
 *     GET    /v1/pos/categories         → List categories
 *     GET    /v1/pos/categories/:id     → Get a category
 *     PATCH  /v1/pos/categories/:id     → Update a category
 *     DELETE /v1/pos/categories/:id     → Deactivate a category
 *   Registers
 *     POST   /v1/pos/registers          → Create a register
 *     GET    /v1/pos/registers          → List registers
 *     GET    /v1/pos/registers/:id      → Get a register
 *     PATCH  /v1/pos/registers/:id      → Update a register
 *     DELETE /v1/pos/registers/:id      → Deactivate a register
 *   Checkout
 *     POST   /v1/pos/checkout           → Create invoice from PoS cart
 */
export async function posRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ══════════════════════════════════════════════
  // PRODUCTS
  // ══════════════════════════════════════════════

  // ── POST /v1/pos/products ────────────────────
  server.post(
    "/v1/pos/products",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(500).optional(),
          price_usd: z.number().min(0),
          category_id: z.string().optional(),
          image_url: z.string().url().optional(),
          sku: z.string().max(100).optional(),
          sort_order: z.number().int().min(0).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const {
        name,
        description,
        price_usd,
        category_id,
        image_url,
        sku,
        sort_order,
      } = request.body;

      if (category_id) {
        const cat = await PosCategory.findOne({
          categoryId: category_id,
          merchantId: merchant._id,
        });
        if (!cat) {
          return apiError(
            reply,
            404,
            "not_found",
            "Category not found.",
            "category_id",
          );
        }
      }

      const productId = `prod_${crypto.randomBytes(12).toString("hex")}`;

      const product = await PosProduct.create({
        merchantId: merchant._id,
        productId,
        name,
        description,
        priceUsd: price_usd,
        categoryId: category_id || undefined,
        imageUrl: image_url,
        sku,
        sortOrder: sort_order ?? 0,
      });

      return reply.code(201).send({
        object: "pos_product",
        product_id: product.productId,
        name: product.name,
        description: product.description,
        price_usd: product.priceUsd,
        category_id: category_id || null,
        image_url: product.imageUrl,
        is_active: product.isActive,
        sku: product.sku,
        sort_order: product.sortOrder,
        created_at: product.createdAt,
      });
    },
  );

  // ── GET /v1/pos/products ────────────────────
  server.get(
    "/v1/pos/products",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          category_id: z.string().optional(),
          active: z.enum(["true", "false"]).optional(),
          page: z.coerce.number().int().min(1).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const {
        category_id,
        active,
        page = 1,
        limit = 50,
      } = request.query as any;
      const filter: Record<string, any> = { merchantId: merchant._id };

      if (category_id) {
        const cat = await PosCategory.findOne({
          categoryId: category_id,
          merchantId: merchant._id,
        });
        filter.categoryId = cat?._id || null;
      }

      if (active !== undefined) {
        filter.isActive = active === "true";
      }

      const total = await PosProduct.countDocuments(filter);
      const products = await PosProduct.find(filter)
        .sort({ sortOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      return reply.send({
        object: "list",
        data: products.map((p) => ({
          object: "pos_product",
          product_id: p.productId,
          name: p.name,
          description: p.description,
          price_usd: p.priceUsd,
          category_id: p.categoryId?.toString() || null,
          image_url: p.imageUrl,
          is_active: p.isActive,
          sku: p.sku,
          sort_order: p.sortOrder,
          created_at: p.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    },
  );

  // ── GET /v1/pos/products/search ──────────────
  server.get(
    "/v1/pos/products/search",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          q: z.string().min(1).max(200),
          limit: z.coerce.number().int().min(1).max(50).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { q, limit = 20 } = request.query as any;

      const products = await PosProduct.find({
        merchantId: merchant._id,
        isActive: true,
        $or: [
          { name: { $regex: q, $options: "i" } },
          { sku: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ],
      })
        .sort({ name: 1 })
        .limit(limit);

      return reply.send({
        object: "list",
        data: products.map((p) => ({
          object: "pos_product",
          product_id: p.productId,
          name: p.name,
          description: p.description,
          price_usd: p.priceUsd,
          category_id: p.categoryId?.toString() || null,
          image_url: p.imageUrl,
          sku: p.sku,
        })),
      });
    },
  );

  // ── GET /v1/pos/products/:id ────────────────
  server.get<{ Params: { id: string } }>(
    "/v1/pos/products/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const product = await PosProduct.findOne({
        productId: request.params.id,
        merchantId: merchant._id,
      });

      if (!product) {
        return apiError(reply, 404, "not_found", "Product not found.");
      }

      return reply.send({
        object: "pos_product",
        product_id: product.productId,
        name: product.name,
        description: product.description,
        price_usd: product.priceUsd,
        category_id: product.categoryId?.toString() || null,
        image_url: product.imageUrl,
        is_active: product.isActive,
        sku: product.sku,
        sort_order: product.sortOrder,
        created_at: product.createdAt,
      });
    },
  );

  // ── PATCH /v1/pos/products/:id ──────────────
  server.patch<{ Params: { id: string } }>(
    "/v1/pos/products/:id",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(200).optional(),
          description: z.string().max(500).nullable().optional(),
          price_usd: z.number().min(0).optional(),
          category_id: z.string().nullable().optional(),
          image_url: z.string().url().nullable().optional(),
          sku: z.string().max(100).nullable().optional(),
          sort_order: z.number().int().min(0).optional(),
          is_active: z.boolean().optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const product = await PosProduct.findOne({
        productId: request.params.id,
        merchantId: merchant._id,
      });

      if (!product) {
        return apiError(reply, 404, "not_found", "Product not found.");
      }

      const updates = request.body as Record<string, any>;
      const fieldMap: Record<string, string> = {
        price_usd: "priceUsd",
        category_id: "categoryId",
        image_url: "imageUrl",
        sort_order: "sortOrder",
        is_active: "isActive",
      };

      for (const [key, value] of Object.entries(updates)) {
        const field = fieldMap[key] || key;
        (product as any)[field] = value === null ? undefined : value;
      }

      await product.save();

      return reply.send({
        object: "pos_product",
        product_id: product.productId,
        name: product.name,
        description: product.description,
        price_usd: product.priceUsd,
        category_id: product.categoryId?.toString() || null,
        image_url: product.imageUrl,
        is_active: product.isActive,
        sku: product.sku,
        sort_order: product.sortOrder,
      });
    },
  );

  // ── DELETE /v1/pos/products/:id ──────────────
  server.delete<{ Params: { id: string } }>(
    "/v1/pos/products/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const product = await PosProduct.findOneAndUpdate(
        {
          productId: request.params.id,
          merchantId: merchant._id,
        },
        { isActive: false },
        { new: true },
      );

      if (!product) {
        return apiError(reply, 404, "not_found", "Product not found.");
      }

      return reply.send({
        object: "pos_product",
        product_id: product.productId,
        is_active: product.isActive,
      });
    },
  );

  // ══════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════

  // ── POST /v1/pos/categories ──────────────────
  server.post(
    "/v1/pos/categories",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(100),
          description: z.string().max(500).optional(),
          sort_order: z.number().int().min(0).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { name, description, sort_order } = request.body;
      const categoryId = `cat_${crypto.randomBytes(12).toString("hex")}`;

      const category = await PosCategory.create({
        merchantId: merchant._id,
        categoryId,
        name,
        description,
        sortOrder: sort_order ?? 0,
      });

      return reply.code(201).send({
        object: "pos_category",
        category_id: category.categoryId,
        name: category.name,
        description: category.description,
        sort_order: category.sortOrder,
        is_active: category.isActive,
        created_at: category.createdAt,
      });
    },
  );

  // ── GET /v1/pos/categories ──────────────────
  server.get(
    "/v1/pos/categories",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const categories = await PosCategory.find({
        merchantId: merchant._id,
      }).sort({ sortOrder: 1, name: 1 });

      return reply.send({
        object: "list",
        data: categories.map((c) => ({
          object: "pos_category",
          category_id: c.categoryId,
          name: c.name,
          description: c.description,
          sort_order: c.sortOrder,
          is_active: c.isActive,
          created_at: c.createdAt,
        })),
      });
    },
  );

  // ── GET /v1/pos/categories/:id ──────────────
  server.get<{ Params: { id: string } }>(
    "/v1/pos/categories/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const category = await PosCategory.findOne({
        categoryId: request.params.id,
        merchantId: merchant._id,
      });

      if (!category) {
        return apiError(reply, 404, "not_found", "Category not found.");
      }

      return reply.send({
        object: "pos_category",
        category_id: category.categoryId,
        name: category.name,
        description: category.description,
        sort_order: category.sortOrder,
        is_active: category.isActive,
        created_at: category.createdAt,
      });
    },
  );

  // ── PATCH /v1/pos/categories/:id ────────────
  server.patch<{ Params: { id: string } }>(
    "/v1/pos/categories/:id",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(100).optional(),
          description: z.string().max(500).nullable().optional(),
          sort_order: z.number().int().min(0).optional(),
          is_active: z.boolean().optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const category = await PosCategory.findOne({
        categoryId: request.params.id,
        merchantId: merchant._id,
      });

      if (!category) {
        return apiError(reply, 404, "not_found", "Category not found.");
      }

      const updates = request.body as Record<string, any>;
      const fieldMap: Record<string, string> = {
        sort_order: "sortOrder",
        is_active: "isActive",
      };

      for (const [key, value] of Object.entries(updates)) {
        const field = fieldMap[key] || key;
        (category as any)[field] = value === null ? undefined : value;
      }

      await category.save();

      return reply.send({
        object: "pos_category",
        category_id: category.categoryId,
        name: category.name,
        description: category.description,
        sort_order: category.sortOrder,
        is_active: category.isActive,
      });
    },
  );

  // ── DELETE /v1/pos/categories/:id ────────────
  server.delete<{ Params: { id: string } }>(
    "/v1/pos/categories/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const category = await PosCategory.findOneAndUpdate(
        {
          categoryId: request.params.id,
          merchantId: merchant._id,
        },
        { isActive: false },
        { new: true },
      );

      if (!category) {
        return apiError(reply, 404, "not_found", "Category not found.");
      }

      return reply.send({
        object: "pos_category",
        category_id: category.categoryId,
        is_active: category.isActive,
      });
    },
  );

  // ══════════════════════════════════════════════
  // REGISTERS
  // ══════════════════════════════════════════════

  // ── POST /v1/pos/registers ───────────────────
  server.post(
    "/v1/pos/registers",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(100),
          location: z.string().max(200).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { name, location } = request.body;
      const registerId = `reg_${crypto.randomBytes(12).toString("hex")}`;

      const register = await PosRegister.create({
        merchantId: merchant._id,
        registerId,
        name,
        location,
      });

      return reply.code(201).send({
        object: "pos_register",
        register_id: register.registerId,
        name: register.name,
        location: register.location,
        is_active: register.isActive,
        total_transactions: register.totalTransactions,
        total_volume_usd: register.totalVolumeUsd,
        created_at: register.createdAt,
      });
    },
  );

  // ── GET /v1/pos/registers ───────────────────
  server.get(
    "/v1/pos/registers",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const registers = await PosRegister.find({
        merchantId: merchant._id,
      }).sort({ createdAt: -1 });

      return reply.send({
        object: "list",
        data: registers.map((r) => ({
          object: "pos_register",
          register_id: r.registerId,
          name: r.name,
          location: r.location,
          is_active: r.isActive,
          current_session_id: r.currentSessionId,
          total_transactions: r.totalTransactions,
          total_volume_usd: r.totalVolumeUsd,
          created_at: r.createdAt,
        })),
      });
    },
  );

  // ── GET /v1/pos/registers/:id ───────────────
  server.get<{ Params: { id: string } }>(
    "/v1/pos/registers/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const register = await PosRegister.findOne({
        registerId: request.params.id,
        merchantId: merchant._id,
      });

      if (!register) {
        return apiError(reply, 404, "not_found", "Register not found.");
      }

      return reply.send({
        object: "pos_register",
        register_id: register.registerId,
        name: register.name,
        location: register.location,
        is_active: register.isActive,
        current_session_id: register.currentSessionId,
        total_transactions: register.totalTransactions,
        total_volume_usd: register.totalVolumeUsd,
        created_at: register.createdAt,
      });
    },
  );

  // ── PATCH /v1/pos/registers/:id ─────────────
  server.patch<{ Params: { id: string } }>(
    "/v1/pos/registers/:id",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z.string().min(1).max(100).optional(),
          location: z.string().max(200).nullable().optional(),
          is_active: z.boolean().optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const register = await PosRegister.findOne({
        registerId: request.params.id,
        merchantId: merchant._id,
      });

      if (!register) {
        return apiError(reply, 404, "not_found", "Register not found.");
      }

      const updates = request.body as Record<string, any>;
      const fieldMap: Record<string, string> = {
        is_active: "isActive",
      };

      for (const [key, value] of Object.entries(updates)) {
        const field = fieldMap[key] || key;
        (register as any)[field] = value === null ? undefined : value;
      }

      await register.save();

      return reply.send({
        object: "pos_register",
        register_id: register.registerId,
        name: register.name,
        location: register.location,
        is_active: register.isActive,
        total_transactions: register.totalTransactions,
        total_volume_usd: register.totalVolumeUsd,
      });
    },
  );

  // ── DELETE /v1/pos/registers/:id ─────────────
  server.delete<{ Params: { id: string } }>(
    "/v1/pos/registers/:id",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const register = await PosRegister.findOneAndUpdate(
        {
          registerId: request.params.id,
          merchantId: merchant._id,
        },
        { isActive: false },
        { new: true },
      );

      if (!register) {
        return apiError(reply, 404, "not_found", "Register not found.");
      }

      return reply.send({
        object: "pos_register",
        register_id: register.registerId,
        is_active: register.isActive,
      });
    },
  );

  // ══════════════════════════════════════════════
  // CHECKOUT — Create Invoice from PoS Cart
  // ══════════════════════════════════════════════

  server.post(
    "/v1/pos/checkout",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          register_id: z.string().optional(),
          items: z
            .array(
              z.object({
                product_id: z.string(),
                quantity: z.number().int().min(1).max(999),
              }),
            )
            .min(1)
            .max(100),
          currency: z.enum(SUPPORTED_CURRENCIES).optional(),
          metadata: z.record(z.unknown()).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { register_id, items, currency, metadata } = request.body;

      // Validate register if provided
      if (register_id) {
        const register = await PosRegister.findOne({
          registerId: register_id,
          merchantId: merchant._id,
          isActive: true,
        });
        if (!register) {
          return apiError(
            reply,
            404,
            "not_found",
            "Register not found or inactive.",
            "register_id",
          );
        }
      }

      // Resolve products
      const productIds = items.map((i) => i.product_id);
      const products = await PosProduct.find({
        productId: { $in: productIds },
        merchantId: merchant._id,
        isActive: true,
      });

      if (products.length !== productIds.length) {
        const found = new Set(products.map((p) => p.productId));
        const missing = productIds.filter((id) => !found.has(id));
        return apiError(
          reply,
          404,
          "not_found",
          `Products not found or inactive: ${missing.join(", ")}`,
          "items",
        );
      }

      const productMap = new Map(products.map((p) => [p.productId, p]));

      // Calculate total
      let totalUsd = 0;
      const lineItems = items.map((item) => {
        const product = productMap.get(item.product_id)!;
        const lineTotal = product.priceUsd * item.quantity;
        totalUsd += lineTotal;
        return {
          product_id: product.productId,
          name: product.name,
          price_usd: product.priceUsd,
          quantity: item.quantity,
          line_total_usd: lineTotal,
        };
      });

      if (totalUsd <= 0) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Cart total must be greater than zero.",
        );
      }

      // Create invoice
      const { PriceOracle } = await import("../infra/price-feed.js");
      const cryptoCurrency = currency || "BTC";
      const price = await PriceOracle.getPrice(cryptoCurrency as any);
      const cryptoAmount = totalUsd / price;

      const invoiceId = `inv_${crypto.randomBytes(12).toString("hex")}`;
      const feeRate =
        merchant.plan === "enterprise"
          ? 0.0025
          : merchant.plan === "professional"
            ? 0.005
            : 0.01;

      const invoice = await Invoice.create({
        merchantId: merchant._id,
        invoiceId,
        amountUsd: totalUsd,
        cryptoAmount,
        cryptoAmountReceived: 0,
        cryptoCurrency,
        payAddress: "",
        feeUsd: totalUsd * feeRate,
        feeCrypto: 0,
        derivationIndex: merchant.derivationIndex || 0,
        status: "pending",
        confirmations: 0,
        requiredConfirmations:
          (merchant.confirmationPolicy as Record<string, number>)?.[
            cryptoCurrency
          ] || 2,
        expiresAt: new Date(
          Date.now() + (merchant.invoiceExpirationMinutes || 30) * 60 * 1000,
        ),
        metadata: {
          ...metadata,
          posCheckout: true,
          registerId: register_id,
          lineItems,
        },
      });

      // Update register stats if provided
      if (register_id) {
        await PosRegister.findOneAndUpdate(
          { registerId: register_id, merchantId: merchant._id },
          {
            $inc: {
              totalTransactions: 1,
              totalVolumeUsd: totalUsd,
            },
          },
        );
      }

      const checkoutUrl = `${process.env.CHECKOUT_URL || "http://localhost:5051"}/checkout/${invoice.invoiceId}`;

      return reply.code(201).send({
        object: "invoice",
        invoice_id: invoice.invoiceId,
        amount_usd: totalUsd,
        crypto_amount: cryptoAmount,
        crypto_currency: cryptoCurrency,
        checkout_url: checkoutUrl,
        status: invoice.status,
        expires_at: invoice.expiresAt,
        line_items: lineItems,
      });
    },
  );
}
