import {
  Merchant,
  User,
  WebhookDelivery,
  ApiKey,
} from "@qodinger/knot-database";
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
import { safeCompare } from "../utils/crypto.js";
import { apiError } from "../utils/api-error.js";
import { MerchantBillingController } from "../controllers/merchant/billing.controller.js";
import { MerchantCoreController } from "../controllers/merchant/core.controller.js";
import { MerchantNotificationController } from "../controllers/merchant/notification.controller.js";
import { MerchantPromoController } from "../controllers/merchant/promo.controller.js";
import { MerchantSecurityController } from "../controllers/merchant/security.controller.js";
import { MerchantSuspensionController } from "../controllers/merchant/suspension.controller.js";
import { MerchantSoftDeleteController } from "../controllers/merchant/soft-delete.controller.js";
import { ApiKeyController } from "../controllers/merchant/api-key.controller.js";
import { WebhookEndpointController } from "../controllers/merchant/webhook-endpoint.controller.js";
import { MerchantTeamController } from "../controllers/merchant-team.controller.js";
import { ipAllowlistMiddleware } from "../infra/ip-allowlist.js";
import { escapeRegExp } from "../middleware/auth.middleware.js";

const sanitizeString = (val?: string) =>
  val ? limitLength(stripHtmlTags(val).trim(), MAX_TEXT_LENGTH) : val;

const isValidHex = (val: string) => /^[a-fA-F0-9]+$/.test(val);

// ──────────────────────────────────────────────
// Rate limiting for merchant creation (per oauthId)
// ──────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const createMerchantRateLimit = new Map<string, RateLimitEntry>();
const CREATE_MERCHANT_MAX = 5;
const CREATE_MERCHANT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of createMerchantRateLimit.entries()) {
    if (entry.resetAt < now) createMerchantRateLimit.delete(key);
  }
}, 60_000);

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
    const foundKey = await ApiKey.findOne({
      keyHash: apiKeyHash,
      isActive: true,
    }).populate("merchantId");

    if (foundKey) {
      const merchant = foundKey.merchantId as any;
      if (!merchant.isActive || merchant.isDeleted) {
        return apiError(
          reply,
          403,
          "merchant_suspended",
          "This merchant account is suspended or deleted.",
        );
      }
      request.merchant = merchant;
      return;
    }

    return apiError(reply, 401, "invalid_api_key", "Invalid API key.");
  };

  // ──────────────────────────────────────────────
  // Internal: OAuth session hook — authenticates via x-oauth-id header
  // Used by the dashboard's server actions (not exposed publicly)
  // ──────────────────────────────────────────────
  const oauthHook = async (request: FastifyRequest, reply: FastifyReply) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const merchantId = request.headers["x-merchant-id"] as string;
    const secret = request.headers["x-internal-secret"] as string;

    if (
      !oauthId ||
      !secret ||
      !safeCompare(secret, process.env.INTERNAL_SECRET || "")
    ) {
      return apiError(reply, 401, "unauthorized", "Authentication required.");
    }

    const query: Record<string, unknown> = {
      oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
      isActive: true,
      isDeleted: { $ne: true },
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
      return apiError(
        reply,
        401,
        "merchant_not_found",
        "No merchant found for this identity.",
      );
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
        return apiError(reply, 401, "invalid_api_key", "Invalid API key.");
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
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as { oauthId?: string };
        const oauthId = body.oauthId;
        if (!oauthId) return;

        const isDev =
          process.env.NODE_ENV !== "production" &&
          (request.ip === "127.0.0.1" || request.ip === "::1");
        if (isDev) return;

        const now = Date.now();
        let entry = createMerchantRateLimit.get(oauthId);
        if (!entry || entry.resetAt < now) {
          entry = { count: 0, resetAt: now + CREATE_MERCHANT_WINDOW_MS };
          createMerchantRateLimit.set(oauthId, entry);
        }
        entry.count++;
        if (entry.count > CREATE_MERCHANT_MAX) {
          return apiError(
            reply,
            429,
            "rate_limit_exceeded",
            `Too many merchant creation attempts. Please wait ${Math.ceil((entry.resetAt - now) / 60000)} minutes before trying again.`,
          );
        }
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
    async (request: any, reply: FastifyReply) => {
      const merchant = request.merchant;
      if (!merchant)
        return apiError(reply, 401, "unauthorized", "Authentication required.");

      const existingKeys = await ApiKey.countDocuments({
        merchantId: merchant._id,
        isActive: true,
      });

      if (existingKeys > 0) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "API keys already exist. Use the Developers page to manage keys.",
        );
      }

      return ApiKeyController.createKey(
        {
          ...request,
          params: { merchantId: merchant.merchantId },
          body: { label: "Default Key", scope: "full_access" },
        } as any,
        reply,
      );
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/merchants/me/keys — Rotate Key (API key auth)
  // Deprecated: Use /v1/merchants/:merchantId/keys instead
  // ──────────────────────────────────────────────
  server.post(
    "/v1/merchants/me/keys",
    { preHandler: requireAuth },
    async (request: any, reply: FastifyReply) => {
      const merchant = request.merchant;
      if (!merchant)
        return apiError(reply, 401, "unauthorized", "Authentication required.");

      return ApiKeyController.createKey(
        {
          ...request,
          params: { merchantId: merchant.merchantId },
          body: { label: "Rotated Key", scope: "full_access" },
        } as any,
        reply,
      );
    },
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
        headers: z
          .object({ "idempotency-key": z.string().max(255).optional() })
          .passthrough(),
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
          period: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
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
      preHandler: requireAuth,
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
        return apiError(reply, 401, "unauthorized", "Authentication required.");
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
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }
      const params = request.params as { id: string };

      const delivery = await WebhookDelivery.findOne({
        _id: params.id,
        merchantId: merchant.merchantId,
      }).lean();

      if (!delivery) {
        return apiError(
          reply,
          404,
          "not_found",
          "No webhook delivery found with that ID.",
        );
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
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const [result] = await WebhookDelivery.aggregate([
        { $match: { merchantId: merchant.merchantId } },
        {
          $facet: {
            total: [{ $count: "count" }],
            success: [{ $match: { status: "success" } }, { $count: "count" }],
            failed: [{ $match: { status: "failed" } }, { $count: "count" }],
            pending: [{ $match: { status: "pending" } }, { $count: "count" }],
          },
        },
      ]);

      const total = result.total[0]?.count || 0;
      const success = result.success[0]?.count || 0;
      const failed = result.failed[0]?.count || 0;
      const pending = result.pending[0]?.count || 0;

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

  // ──────────────────────────────────────────────
  // Team Management Routes
  // ──────────────────────────────────────────────

  // GET /v1/merchants/:merchantId/team
  server.get(
    "/v1/merchants/:merchantId/team",
    { preHandler: requireAuth },
    MerchantTeamController.getMembers,
  );

  // POST /v1/merchants/:merchantId/team/invite
  server.post(
    "/v1/merchants/:merchantId/team/invite",
    {
      preHandler: requireAuth,
      schema: {
        headers: z
          .object({ "idempotency-key": z.string().max(255).optional() })
          .passthrough(),
        body: z.object({
          email: z
            .string()
            .email("Invalid email format")
            .max(MAX_EMAIL_LENGTH)
            .transform((val) =>
              limitLength(
                stripHtmlTags(val).toLowerCase().trim(),
                MAX_EMAIL_LENGTH,
              ),
            ),
          role: z.enum(["admin", "developer", "viewer", "billing"]),
        }),
      },
    },
    MerchantTeamController.inviteMember,
  );

  // PATCH /v1/merchants/:merchantId/team/:memberId/role
  server.patch(
    "/v1/merchants/:merchantId/team/:memberId/role",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          role: z.enum(["admin", "developer", "viewer", "billing"]),
          reason: z.string().max(MAX_TEXT_LENGTH).optional(),
        }),
      },
    },
    MerchantTeamController.updateMemberRole,
  );

  // DELETE /v1/merchants/:merchantId/team/:memberId
  server.delete(
    "/v1/merchants/:merchantId/team/:memberId",
    { preHandler: requireAuth },
    MerchantTeamController.removeMember,
  );

  // POST /v1/merchants/team/accept-invite
  server.post(
    "/v1/merchants/team/accept-invite",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          inviteToken: z.string().min(1),
        }),
      },
    },
    MerchantTeamController.acceptInvite,
  );

  // POST /v1/merchants/:merchantId/team/transfer-ownership
  server.post(
    "/v1/merchants/:merchantId/team/transfer-ownership",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          newOwnerId: z.string().min(1),
          reason: z.string().max(MAX_TEXT_LENGTH).optional(),
        }),
      },
    },
    MerchantTeamController.transferOwnership,
  );

  // POST /v1/merchants/:merchantId/team/leave
  server.post(
    "/v1/merchants/:merchantId/team/leave",
    { preHandler: requireAuth },
    MerchantTeamController.leaveMerchant,
  );

  // GET /v1/merchants/team/default
  server.get(
    "/v1/merchants/team/default",
    { preHandler: requireAuth },
    MerchantTeamController.getDefaultMerchant,
  );

  // POST /v1/merchants/team/default
  server.post(
    "/v1/merchants/team/default",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          merchantId: z.string().min(1),
        }),
      },
    },
    MerchantTeamController.setDefaultMerchant,
  );

  // ──────────────────────────────────────────────
  // Merchant Suspension Routes
  // ──────────────────────────────────────────────

  // POST /v1/merchants/:merchantId/suspend
  server.post(
    "/v1/merchants/:merchantId/suspend",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          reason: z.enum([
            "payment_failed",
            "policy_violation",
            "fraud",
            "manual",
            "other",
          ]),
          note: z.string().max(MAX_TEXT_LENGTH).optional(),
        }),
      },
    },
    MerchantSuspensionController.suspendMerchant,
  );

  // POST /v1/merchants/:merchantId/reinstate
  server.post(
    "/v1/merchants/:merchantId/reinstate",
    { preHandler: requireAuth },
    MerchantSuspensionController.reinstateMerchant,
  );

  // GET /v1/merchants/:merchantId/suspension-status
  server.get(
    "/v1/merchants/:merchantId/suspension-status",
    { preHandler: requireAuth },
    MerchantSuspensionController.getSuspensionStatus,
  );

  // ──────────────────────────────────────────────
  // Multiple API Key Management Routes
  // ──────────────────────────────────────────────

  // GET /v1/merchants/:merchantId/keys
  server.get(
    "/v1/merchants/:merchantId/keys",
    { preHandler: requireAuth },
    ApiKeyController.listKeys,
  );

  // POST /v1/merchants/:merchantId/keys
  server.post(
    "/v1/merchants/:merchantId/keys",
    {
      preHandler: requireAuth,
      schema: {
        headers: z
          .object({ "idempotency-key": z.string().max(255).optional() })
          .passthrough(),
        body: z.object({
          label: z.string().max(MAX_TEXT_LENGTH).optional(),
          scope: z
            .enum(["full_access", "read_only", "invoices", "webhooks"])
            .default("full_access"),
        }),
      },
    },
    ApiKeyController.createKey,
  );

  // PATCH /v1/merchants/:merchantId/keys/:keyId
  server.patch(
    "/v1/merchants/:merchantId/keys/:keyId",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          label: z.string().max(MAX_TEXT_LENGTH).optional(),
          scope: z
            .enum(["full_access", "read_only", "invoices", "webhooks"])
            .optional(),
        }),
      },
    },
    ApiKeyController.updateKey,
  );

  // POST /v1/merchants/:merchantId/keys/:keyId/revoke
  server.post(
    "/v1/merchants/:merchantId/keys/:keyId/revoke",
    {
      preHandler: requireAuth,
      schema: {
        body: z
          .object({
            reason: z.string().max(MAX_TEXT_LENGTH).optional(),
          })
          .nullish(),
      },
    },
    ApiKeyController.revokeKey,
  );

  // ──────────────────────────────────────────────
  // Multiple Webhook Endpoint Routes
  // ──────────────────────────────────────────────

  // GET /v1/merchants/:merchantId/webhooks/endpoints
  server.get(
    "/v1/merchants/:merchantId/webhooks/endpoints",
    { preHandler: requireAuth },
    WebhookEndpointController.listEndpoints,
  );

  // POST /v1/merchants/:merchantId/webhooks/endpoints
  server.post(
    "/v1/merchants/:merchantId/webhooks/endpoints",
    {
      preHandler: requireAuth,
      schema: {
        headers: z
          .object({ "idempotency-key": z.string().max(255).optional() })
          .passthrough(),
        body: z.object({
          url: z.string().url().max(MAX_URL_LENGTH),
          description: z.string().max(MAX_TEXT_LENGTH).optional(),
          events: z.array(z.string()).optional(),
          eventMode: z.enum(["all", "filtered"]).default("filtered"),
        }),
      },
    },
    WebhookEndpointController.createEndpoint,
  );

  // PATCH /v1/merchants/:merchantId/webhooks/endpoints/:endpointId
  server.patch(
    "/v1/merchants/:merchantId/webhooks/endpoints/:endpointId",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          url: z.string().url().max(MAX_URL_LENGTH).optional(),
          description: z.string().max(MAX_TEXT_LENGTH).optional(),
          events: z.array(z.string()).optional(),
          eventMode: z.enum(["all", "filtered"]).optional(),
        }),
      },
    },
    WebhookEndpointController.updateEndpoint,
  );

  // DELETE /v1/merchants/:merchantId/webhooks/endpoints/:endpointId
  server.delete(
    "/v1/merchants/:merchantId/webhooks/endpoints/:endpointId",
    { preHandler: requireAuth },
    WebhookEndpointController.deleteEndpoint,
  );

  // POST /v1/merchants/:merchantId/webhooks/endpoints/:endpointId/test
  server.post(
    "/v1/merchants/:merchantId/webhooks/endpoints/:endpointId/test",
    { preHandler: requireAuth },
    WebhookEndpointController.testEndpoint,
  );

  // GET /v1/merchants/:merchantId/webhooks/endpoints/:endpointId/secret
  server.get(
    "/v1/merchants/:merchantId/webhooks/endpoints/:endpointId/secret",
    { preHandler: requireAuth },
    WebhookEndpointController.getEndpointSecret,
  );

  // ──────────────────────────────────────────────
  // Merchant Soft Delete Routes
  // ──────────────────────────────────────────────

  // POST /v1/merchants/:merchantId/delete
  server.post(
    "/v1/merchants/:merchantId/delete",
    { preHandler: requireAuth },
    MerchantSoftDeleteController.softDelete,
  );

  // POST /v1/merchants/:merchantId/restore
  server.post(
    "/v1/merchants/:merchantId/restore",
    { preHandler: requireAuth },
    MerchantSoftDeleteController.restore,
  );

  // GET /v1/merchants/:merchantId/delete-status
  server.get(
    "/v1/merchants/:merchantId/delete-status",
    { preHandler: requireAuth },
    MerchantSoftDeleteController.getDeletedStatus,
  );
}

// ──────────────────────────────────────────────
// Helper: Check if IP is in CIDR range
// ──────────────────────────────────────────────
