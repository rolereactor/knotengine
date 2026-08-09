import {
  SUPPORTED_CURRENCIES,
  stripHtmlTags,
  limitLength,
  MAX_TEXT_LENGTH,
} from "@qodinger/knot-types";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { PaymentLink } from "@qodinger/knot-database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { apiError } from "../utils/api-error.js";
import * as crypto from "crypto";

const sanitizeDescription = (val?: string) =>
  val ? limitLength(stripHtmlTags(val).trim(), MAX_TEXT_LENGTH) : val;

/**
 * 🔗 Payment Link Routes — /v1/payment-links
 *
 * Reusable, shareable payment links that create invoices on-the-fly.
 *   POST   /v1/payment-links              → Create a payment link
 *   GET    /v1/payment-links              → List payment links
 *   GET    /v1/payment-links/public/:slug → Get link details (public)
 *   PATCH  /v1/payment-links/:linkId      → Update a payment link
 *   DELETE /v1/payment-links/:linkId      → Deactivate a payment link
 *   GET    /v1/payment-links/:linkId/stats → Get usage statistics
 */
export async function paymentLinkRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // POST /v1/payment-links — Create Payment Link
  // ──────────────────────────────────────────────
  server.post(
    "/v1/payment-links",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          title: z.string().min(1).max(100),
          description: z
            .string()
            .max(MAX_TEXT_LENGTH)
            .transform(sanitizeDescription)
            .optional(),
          amount: z.number().positive().optional(),
          currency: z.enum(SUPPORTED_CURRENCIES).optional(),
          slug: z
            .string()
            .min(3)
            .max(50)
            .regex(
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              "Slug must be lowercase alphanumeric with hyphens",
            )
            .optional(),
          max_uses: z.number().int().positive().optional(),
          expires_at: z.string().datetime().optional(),
          redirect_url: z.string().url().optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const {
        title,
        description,
        amount,
        currency,
        slug,
        max_uses,
        expires_at,
        redirect_url,
      } = request.body;

      const linkId = `link_${crypto.randomBytes(12).toString("hex")}`;
      const finalSlug = slug || `pay_${crypto.randomBytes(8).toString("hex")}`;

      // Check slug uniqueness
      const existing = await PaymentLink.findOne({ slug: finalSlug });
      if (existing) {
        return apiError(
          reply,
          409,
          "conflict",
          "This slug is already taken. Please choose another.",
          "slug",
        );
      }

      const link = await PaymentLink.create({
        merchantId: merchant._id,
        linkId,
        slug: finalSlug,
        title,
        description,
        amount,
        currency,
        maxUses: max_uses,
        expiresAt: expires_at ? new Date(expires_at) : undefined,
        redirectUrl: redirect_url,
      });

      const checkoutUrl = `${process.env.CHECKOUT_URL || "http://localhost:5051"}/pay/${link.slug}`;

      return reply.code(201).send({
        object: "payment_link",
        id: link.linkId,
        slug: link.slug,
        url: checkoutUrl,
        title: link.title,
        description: link.description,
        amount: link.amount,
        currency: link.currency,
        is_active: link.isActive,
        max_uses: link.maxUses,
        expires_at: link.expiresAt,
        redirect_url: link.redirectUrl,
        usage_count: link.usageCount,
        total_amount_usd: link.totalAmountUsd,
        created_at: link.createdAt,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/payment-links — List Payment Links
  // ──────────────────────────────────────────────
  server.get(
    "/v1/payment-links",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const links = await PaymentLink.find({ merchantId: merchant._id }).sort({
        createdAt: -1,
      });

      const checkoutBase = process.env.CHECKOUT_URL || "http://localhost:5051";

      return reply.send({
        object: "list",
        data: links.map((l) => ({
          object: "payment_link",
          id: l.linkId,
          slug: l.slug,
          url: `${checkoutBase}/pay/${l.slug}`,
          title: l.title,
          amount: l.amount,
          currency: l.currency,
          is_active: l.isActive,
          usage_count: l.usageCount,
          total_amount_usd: l.totalAmountUsd,
          max_uses: l.maxUses,
          expires_at: l.expiresAt,
          created_at: l.createdAt,
        })),
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/payment-links/public/:slug — Get Link (Public)
  // ──────────────────────────────────────────────
  server.get<{ Params: { slug: string } }>(
    "/v1/payment-links/public/:slug",
    async (request, reply) => {
      const { slug } = request.params;
      const link = await PaymentLink.findOne({ slug, isActive: true });

      if (!link) {
        return apiError(
          reply,
          404,
          "payment_link_not_found",
          "Payment link not found or inactive.",
        );
      }

      if (link.expiresAt && link.expiresAt < new Date()) {
        return apiError(
          reply,
          410,
          "payment_link_expired",
          "This payment link has expired.",
        );
      }

      if (link.maxUses && link.usageCount >= link.maxUses) {
        return apiError(
          reply,
          410,
          "payment_link_limit_reached",
          "This payment link has reached its usage limit.",
        );
      }

      return reply.send({
        object: "payment_link",
        id: link.linkId,
        title: link.title,
        description: link.description,
        amount: link.amount,
        currency: link.currency,
        suggested_amounts: link.amount ? undefined : [5, 10, 25, 50, 100],
      });
    },
  );

  // ──────────────────────────────────────────────
  // PATCH /v1/payment-links/:linkId — Update Link
  // ──────────────────────────────────────────────
  server.patch<{ Params: { linkId: string } }>(
    "/v1/payment-links/:linkId",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          linkId: z.string(),
        }),
        body: z.object({
          title: z.string().min(1).max(100).optional(),
          description: z
            .string()
            .max(MAX_TEXT_LENGTH)
            .transform(sanitizeDescription)
            .optional(),
          amount: z.number().positive().nullable().optional(),
          currency: z.enum(SUPPORTED_CURRENCIES).nullable().optional(),
          is_active: z.boolean().optional(),
          max_uses: z.number().int().positive().nullable().optional(),
          expires_at: z.string().datetime().nullable().optional(),
          redirect_url: z.string().url().nullable().optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { linkId } = request.params;
      const link = await PaymentLink.findOne({
        linkId,
        merchantId: merchant._id,
      });

      if (!link) {
        return apiError(
          reply,
          404,
          "payment_link_not_found",
          "Payment link not found.",
        );
      }

      const updates = request.body as Record<string, any>;

      // Map snake_case to camelCase
      const fieldMap: Record<string, string> = {
        is_active: "isActive",
        max_uses: "maxUses",
        expires_at: "expiresAt",
        redirect_url: "redirectUrl",
      };

      for (const [key, value] of Object.entries(updates)) {
        const field = fieldMap[key] || key;
        (link as any)[field] = value === null ? undefined : value;
      }

      await link.save();

      const checkoutBase = process.env.CHECKOUT_URL || "http://localhost:5051";

      return reply.send({
        object: "payment_link",
        id: link.linkId,
        slug: link.slug,
        url: `${checkoutBase}/pay/${link.slug}`,
        title: link.title,
        description: link.description,
        amount: link.amount,
        currency: link.currency,
        is_active: link.isActive,
        max_uses: link.maxUses,
        expires_at: link.expiresAt,
        redirect_url: link.redirectUrl,
        usage_count: link.usageCount,
        total_amount_usd: link.totalAmountUsd,
      });
    },
  );

  // ──────────────────────────────────────────────
  // DELETE /v1/payment-links/:linkId — Deactivate Link
  // ──────────────────────────────────────────────
  server.delete<{ Params: { linkId: string } }>(
    "/v1/payment-links/:linkId",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          linkId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { linkId } = request.params;
      const link = await PaymentLink.findOneAndUpdate(
        { linkId, merchantId: merchant._id },
        { isActive: false },
        { new: true },
      );

      if (!link) {
        return apiError(
          reply,
          404,
          "payment_link_not_found",
          "Payment link not found.",
        );
      }

      return reply.send({
        object: "payment_link",
        id: link.linkId,
        is_active: link.isActive,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/payment-links/:linkId/stats — Get Stats
  // ──────────────────────────────────────────────
  server.get<{ Params: { linkId: string } }>(
    "/v1/payment-links/:linkId/stats",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          linkId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { linkId } = request.params;
      const link = await PaymentLink.findOne({
        linkId,
        merchantId: merchant._id,
      });

      if (!link) {
        return apiError(
          reply,
          404,
          "payment_link_not_found",
          "Payment link not found.",
        );
      }

      return reply.send({
        object: "payment_link_stats",
        id: link.linkId,
        usage_count: link.usageCount,
        total_amount_usd: link.totalAmountUsd,
        avg_amount_usd:
          link.usageCount > 0
            ? Math.round((link.totalAmountUsd / link.usageCount) * 100) / 100
            : 0,
        max_uses: link.maxUses,
        remaining_uses: link.maxUses
          ? Math.max(0, link.maxUses - link.usageCount)
          : null,
        expires_at: link.expiresAt,
        is_active: link.isActive,
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/payment-links/:linkId/invoice — Create Invoice from Link
  // ──────────────────────────────────────────────
  server.post<{ Params: { linkId: string } }>(
    "/v1/payment-links/:linkId/invoice",
    {
      schema: {
        params: z.object({
          linkId: z.string(),
        }),
        body: z.object({
          amount_usd: z.number().positive(),
          currency: z.enum(SUPPORTED_CURRENCIES),
        }),
      },
    },
    async (request, reply) => {
      const { linkId } = request.params;
      const body = request.body as { amount_usd: number; currency: string };
      const { amount_usd, currency } = body;

      const link = await PaymentLink.findOne({ linkId, isActive: true });

      if (!link) {
        return apiError(
          reply,
          404,
          "payment_link_not_found",
          "Payment link not found or inactive.",
        );
      }

      if (link.expiresAt && link.expiresAt < new Date()) {
        return apiError(
          reply,
          410,
          "payment_link_expired",
          "This payment link has expired.",
        );
      }

      if (link.maxUses && link.usageCount >= link.maxUses) {
        return apiError(
          reply,
          410,
          "payment_link_limit_reached",
          "This payment link has reached its usage limit.",
        );
      }

      // Use link's fixed amount if set, otherwise use provided amount
      const finalAmount = link.amount || amount_usd;

      // Use link's fixed currency if set, otherwise use provided currency
      const finalCurrency = link.currency || currency;

      // Increment usage count
      link.usageCount += 1;
      link.totalAmountUsd += finalAmount;
      await link.save();

      // Create invoice via the InvoicesController logic
      // We'll create a minimal invoice here and let the merchant handle the rest
      const { Invoice, Merchant } = await import("@qodinger/knot-database");
      const merchant = await Merchant.findById(link.merchantId);

      if (!merchant) {
        return apiError(
          reply,
          500,
          "internal_error",
          "Merchant not found for this payment link.",
        );
      }

      const invoiceId = `inv_${crypto.randomBytes(12).toString("hex")}`;

      // Get price to calculate crypto amount
      const { PriceOracle } = await import("../infra/price-feed.js");
      const price = await PriceOracle.getPrice(finalCurrency as any);
      const cryptoAmount = finalAmount / price;

      const invoice = await Invoice.create({
        merchantId: merchant._id,
        invoiceId,
        amountUsd: finalAmount,
        cryptoAmount,
        cryptoAmountReceived: 0,
        cryptoCurrency: finalCurrency,
        payAddress: "", // Will be set by wallet derivation
        feeUsd:
          finalAmount *
          (merchant.plan === "enterprise"
            ? 0.0025
            : merchant.plan === "professional"
              ? 0.005
              : 0.01),
        feeCrypto: 0,
        derivationIndex: merchant.derivationIndex || 0,
        status: "pending",
        confirmations: 0,
        requiredConfirmations:
          (merchant.confirmationPolicy as Record<string, number>)?.[
            finalCurrency
          ] || 2,
        expiresAt: new Date(
          Date.now() + (merchant.invoiceExpirationMinutes || 30) * 60 * 1000,
        ),
        metadata: {
          paymentLinkId: link.linkId,
          paymentLinkSlug: link.slug,
        },
        description: link.description || link.title,
      });

      const checkoutUrl = `${process.env.CHECKOUT_URL || "http://localhost:5051"}/checkout/${invoice.invoiceId}`;

      return reply.code(201).send({
        object: "invoice",
        invoice_id: invoice.invoiceId,
        checkout_url: checkoutUrl,
        amount_usd: finalAmount,
        currency: finalCurrency,
      });
    },
  );
}
