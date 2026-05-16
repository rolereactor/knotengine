import { Merchant, User, WebhookDelivery } from "@qodinger/knot-database";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  SUPPORTED_CURRENCIES,
  stripHtmlTags,
  limitLength,
  MAX_TEXT_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_URL_LENGTH,
  MAX_TXHASH_LENGTH,
} from "@qodinger/knot-types";
import * as crypto from "crypto";
import { MerchantBillingController } from "../controllers/merchant/billing.controller.js";
import { MerchantCoreController } from "../controllers/merchant/core.controller.js";
import { MerchantNotificationController } from "../controllers/merchant/notification.controller.js";
import { MerchantPromoController } from "../controllers/merchant/promo.controller.js";
import { MerchantSecurityController } from "../controllers/merchant/security.controller.js";
import { ipAllowlistMiddleware } from "../infra/ip-allowlist.js";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sanitizeString = (val?: string) =>
  val ? limitLength(stripHtmlTags(val).trim(), MAX_TEXT_LENGTH) : val;

const isValidHex = (val: string) => /^[a-fA-F0-9]+$/.test(val);

export async function merchantRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // Middleware: API Key Authentication for me/ routes
  // ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authHook = async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers["x-api-key"] as string;

    if (!apiKey) {
      throw new Error("Missing API Key");
    }

    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const merchant = await Merchant.findOne({ apiKeyHash, isActive: true });

    if (!merchant) {
      return reply.code(401).send({ error: "Invalid API Key" });
    }

    // Attach to request
    request.merchant = merchant;
  };

  // ──────────────────────────────────────────────
  // Internal: OAuth session hook — authenticates via x-oauth-id header
  // Used by the dashboard's server actions (not exposed publicly)
  // ──────────────────────────────────────────────
  const oauthHook = async (request: FastifyRequest, reply: FastifyReply) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const merchantId = request.headers["x-merchant-id"] as string;
    const secret = request.headers["x-internal-secret"] as string;

    if (!oauthId || secret !== process.env.INTERNAL_SECRET) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const query: Record<string, unknown> = {
      oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
      isActive: true,
    };
    if (merchantId) {
      // Support both the new public mid_... format and legacy MongoDB _id
      // (existing sessions may still carry the old _id until they refresh)
      if (merchantId.startsWith("mid_")) {
        query.merchantId = merchantId;
      } else {
        query._id = merchantId;
      }
    }

    // If multiple merchants exist and no ID provided, this defaults to the first one found.
    // Ideally, dashboard should always send x-merchant-id.
    const merchant = await Merchant.findOne(query);

    if (!merchant) {
      return reply.code(401).send({ error: "Merchant not found" });
    }

    // Lazy Migration: Sync to User
    if (!merchant.userId) {
      let user = await User.findOne({ oauthId });
      if (!user) {
        user = await User.create({
          oauthId,
          creditBalance: parseFloat(
            process.env.WELCOME_CREDIT_AMOUNT || "5.00",
          ),
          welcomeBonusClaimed: true,
        });
      }
      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: { userId: user._id },
      });
      merchant.userId = user._id;
    }

    request.merchant = merchant;
  };

  // ──────────────────────────────────────────────
  // Middleware: Unified Auth (API Key OR Internal OAuth)
  // ──────────────────────────────────────────────
  const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers["x-api-key"];
    if (apiKey) {
      try {
        await authHook(request, reply);
      } catch {
        return reply.code(401).send({ error: "Invalid API Key" });
      }
    } else {
      await oauthHook(request, reply);
      // If oauthHook already sent an error reply, stop here
      if (reply.sent) return;
    }

    // IP Allowlist Check (after successful auth)
    await ipAllowlistMiddleware(request, reply);
  };

  server.post(
    "/v1/merchants",
    {
      schema: {
        body: z.object({
          name: z
            .string()
            .max(MAX_TEXT_LENGTH)
            .transform(sanitizeString)
            .optional(),
          email: z.string().email().max(MAX_EMAIL_LENGTH).optional(),
          btcXpub: z.string().max(300).optional(),
          btcXpubTestnet: z.string().max(300).optional(),
          ethAddress: z.string().max(50).optional(),
          ethAddressTestnet: z.string().max(50).optional(),
          logoUrl: z.string().url().max(MAX_URL_LENGTH).optional(),
          webhookUrl: z.string().url().max(MAX_URL_LENGTH).optional(),
          oauthId: z.string().max(100).optional(),
          referredBy: z.string().max(20).optional(),
        }),
      },
    },
    MerchantCoreController.createMerchant,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants — List all merchants for current user
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants",
    { preHandler: requireAuth },
    MerchantCoreController.listMerchants,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/by-oauth/:oauthId — Internal OAuth lookup
  // Used by NextAuth to find an existing merchant by OAuth identity
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/by-oauth/:oauthId",
    MerchantCoreController.getMerchantByOauth,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me — Get Profile
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me",
    { preHandler: requireAuth },
    MerchantCoreController.getProfile,
  );

  // ──────────────────────────────────────────────
  // DELETE /v1/merchants/me — Delete Profile
  // ──────────────────────────────────────────────
  server.delete(
    "/v1/merchants/me",
    {
      preHandler: requireAuth,
    },
    MerchantCoreController.deleteProfile,
  );

  // ──────────────────────────────────────────────
  // PATCH /v1/merchants/me — Update Profile
  // ──────────────────────────────────────────────
  server.patch(
    "/v1/merchants/me",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          name: z
            .string()
            .max(MAX_TEXT_LENGTH)
            .transform(sanitizeString)
            .optional(),
          email: z
            .string()
            .email()
            .max(MAX_EMAIL_LENGTH)
            .optional()
            .or(z.literal("")),
          btcXpub: z.string().max(300).nullable().optional(),
          btcXpubTestnet: z.string().max(300).nullable().optional(),
          ethAddress: z.string().max(50).nullable().optional(),
          ethAddressTestnet: z.string().max(50).nullable().optional(),
          webhookUrl: z
            .string()
            .url()
            .max(MAX_URL_LENGTH)
            .nullable()
            .optional()
            .or(z.literal("")),
          webhookEvents: z.array(z.string()).optional(),
          logoUrl: z
            .string()
            .url()
            .max(MAX_URL_LENGTH)
            .nullable()
            .optional()
            .or(z.literal("")),
          returnUrl: z
            .string()
            .url()
            .max(MAX_URL_LENGTH)
            .nullable()
            .optional()
            .or(z.literal("")),
          theme: z.enum(["light", "dark", "system"]).optional(),
          brandColor: z.string().max(7).optional(),
          brandingEnabled: z.boolean().optional(),
          removeBranding: z.boolean().optional(),
          brandingAlignment: z.enum(["left", "center"]).optional(),
          feeResponsibility: z.enum(["merchant", "client"]).optional(),
          invoiceExpirationMinutes: z.number().min(15).max(43200).optional(),
          underpaymentTolerancePercentage: z.number().min(0).max(10).optional(),
          bip21Enabled: z.boolean().optional(),
          confirmationPolicy: z
            .object({
              BTC: z.number().int().min(0),
              LTC: z.number().int().min(0),
              ETH: z.number().int().min(0),
            })
            .optional(),
          enabledCurrencies: z.array(z.string()).optional(),
        }),
      },
    },
    MerchantCoreController.updateProfile,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/webhooks/test — Dispatch Test Webhook
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/webhooks/test",
    { preHandler: requireAuth },
    MerchantSecurityController.testWebhook,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/keys/generate — Generate First API Key (OAuth merchants)
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/keys/generate",
    { preHandler: requireAuth },
    MerchantSecurityController.generateKey,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/keys — Rotate Key (API key auth)
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/keys",
    { preHandler: requireAuth },
    MerchantSecurityController.rotateKey,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/keys/webhook — Rotate Webhook Secret
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/keys/webhook",
    { preHandler: requireAuth },
    MerchantSecurityController.rotateWebhookSecret,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/plan — Update Plan (Upgrade/Downgrade)
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/plan",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          plan: z.enum(["starter", "professional", "enterprise"]),
        }),
      },
    },
    MerchantBillingController.updatePlan,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/stats — Dashboard Stats
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/stats",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          period: z.enum(["24h", "7d", "30d"]).default("7d"),
        }),
      },
    },
    MerchantBillingController.getStats,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/topup — Verify & Claim Top-Up Credits
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/topup",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          txHash: z
            .string()
            .min(10, "Transaction hash must be at least 10 characters")
            .max(MAX_TXHASH_LENGTH)
            .refine(isValidHex, {
              message: "Transaction hash must be hexadecimal",
            }),
          currency: z.enum(SUPPORTED_CURRENCIES),
        }),
      },
    },
    MerchantBillingController.topUp,
  );
  // ──────────────────────────────────────────────
  // POST /v1/merchants/promo/generate — Internal: Generate Promo Code
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/promo/generate",
    {
      schema: {
        body: z.object({
          amountUsd: z.number().positive(),
          maxUses: z.number().int().min(1).optional(),
          expiresInDays: z.number().int().min(1).optional(),
          customCode: z.string().min(4).optional(),
        }),
      },
    },
    MerchantPromoController.generatePromo,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/promo/redeem — Redeem Promo Code
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/promo/redeem",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          code: z.string().min(1),
        }),
      },
    },
    MerchantPromoController.redeemPromo,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/notifications — Get Notifications
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/notifications",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).default(20),
          offset: z.coerce.number().int().min(0).default(0),
          invoiceId: z.string().optional(),
        }),
      },
    },
    MerchantNotificationController.getNotifications,
  );

  // ──────────────────────────────────────────────
  // PATCH /v1/merchants/me/notifications/mark-read — Mark all as read
  // ──────────────────────────────────────────────
  server.patch(
    "/v1/merchants/me/notifications/mark-read",
    {
      preHandler: requireAuth,
    },
    MerchantNotificationController.markAllNotificationsRead,
  );

  // ──────────────────────────────────────────────
  // PATCH /v1/merchants/me/notifications/:id — Mark one as read
  // ──────────────────────────────────────────────
  server.patch(
    "/v1/merchants/me/notifications/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    MerchantNotificationController.markNotificationRead,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/charge-plan — Charge for plan during grace period
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/charge-plan",
    { preHandler: requireAuth },
    MerchantBillingController.chargePlan,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/wallet/generate-testnet — Generate Testnet Wallet
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/wallet/generate-testnet",
    { preHandler: requireAuth },
    MerchantSecurityController.generateTestnetWallet,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/ip-allowlist — Get IP Allowlist
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/ip-allowlist",
    {
      preHandler: requireAuth,
    },
    MerchantSecurityController.getIpAllowlist,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/ip-allowlist — Update IP Allowlist
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/ip-allowlist",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          enabled: z.boolean(),
          allowedIps: z.array(z.string()).optional(),
        }),
      },
    },
    MerchantSecurityController.updateIpAllowlist,
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/ip-allowlist/validate — Validate IP
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/ip-allowlist/validate",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          ip: z.string().ip(),
        }),
      },
    },
    MerchantSecurityController.validateIp,
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/webhooks/deliveries — List webhook delivery logs
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/webhooks/deliveries",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
          status: z.enum(["pending", "success", "failed"]).optional(),
          invoiceId: z.string().optional(),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const merchant = request.merchant;
      if (!merchant) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const query = request.query as {
        page: number;
        limit: number;
        status?: string;
        invoiceId?: string;
      };

      const filter: Record<string, unknown> = {
        merchantId: merchant.merchantId,
      };
      if (query.status) filter.status = query.status;
      if (query.invoiceId) filter.invoiceId = query.invoiceId;

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const [deliveries, total] = await Promise.all([
        WebhookDelivery.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        WebhookDelivery.countDocuments(filter),
      ]);

      return reply.send({
        deliveries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/webhooks/deliveries/:id — Get delivery details
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/webhooks/deliveries/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const merchant = request.merchant;
      if (!merchant) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const params = request.params as { id: string };

      const delivery = await WebhookDelivery.findOne({
        _id: params.id,
        merchantId: merchant.merchantId,
      }).lean();

      if (!delivery) {
        return reply.code(404).send({ error: "Delivery not found" });
      }

      return reply.send(delivery);
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/merchants/me/webhooks/stats — Get webhook delivery stats
  // ──────────────────────────────────────────────
  server.get(
    "/v1/merchants/me/webhooks/stats",
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const merchant = request.merchant;
      if (!merchant) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const [total, success, failed, pending] = await Promise.all([
        WebhookDelivery.countDocuments({ merchantId: merchant.merchantId }),
        WebhookDelivery.countDocuments({
          merchantId: merchant.merchantId,
          status: "success",
        }),
        WebhookDelivery.countDocuments({
          merchantId: merchant.merchantId,
          status: "failed",
        }),
        WebhookDelivery.countDocuments({
          merchantId: merchant.merchantId,
          status: "pending",
        }),
      ]);

      const successRate = total > 0 ? (success / total) * 100 : 0;

      return reply.send({
        total,
        success,
        failed,
        pending,
        successRate: parseFloat(successRate.toFixed(2)),
      });
    },
  );
}

// ──────────────────────────────────────────────
// Helper: Check if IP is in CIDR range
// ──────────────────────────────────────────────
