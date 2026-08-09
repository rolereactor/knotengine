import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { User, AffiliatePayout } from "@qodinger/knot-database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { apiError } from "../utils/api-error.js";

const TIER_THRESHOLDS = {
  standard: 0,
  silver: 10,
  gold: 50,
  platinum: 200,
} as const;

const TIER_COMMISSIONS = {
  standard: 0.1,
  silver: 0.15,
  gold: 0.2,
  platinum: 0.25,
} as const;

const TIER_LABELS = {
  standard: "Standard",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
} as const;

/**
 * 🤝 Affiliate Routes — /v1/affiliates
 *
 * Enhanced affiliate program with tiered commissions and payout management.
 *   GET    /v1/affiliates/stats      → Get affiliate statistics
 *   GET    /v1/affiliates/referrals  → List referred users
 *   GET    /v1/affiliates/earnings   → Earnings breakdown
 *   GET    /v1/affiliates/tier       → Current tier and progress
 *   POST   /v1/affiliates/payout     → Request payout
 *   GET    /v1/affiliates/payouts    → Payout history
 *   GET    /v1/affiliates/materials  → Marketing materials
 */
export async function affiliateRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // GET /v1/affiliates/stats — Affiliate Stats
  // ──────────────────────────────────────────────
  server.get(
    "/v1/affiliates/stats",
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: z.object({
            object: z.literal("affiliate_stats"),
            referral_code: z.string().nullable(),
            total_referrals: z.number(),
            total_earnings_usd: z.number(),
            monthly_earnings_usd: z.number(),
            pending_payout_usd: z.number(),
            tier: z.string(),
            commission_rate: z.number(),
            affiliate_link: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const user = await User.findById(merchant.userId);
      if (!user) {
        return apiError(reply, 404, "user_not_found", "User not found");
      }

      const tier = user.affiliateTier || "standard";
      const commissionRate =
        TIER_COMMISSIONS[tier as keyof typeof TIER_COMMISSIONS];

      const pendingPayouts = await AffiliatePayout.aggregate([
        { $match: { userId: user._id, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amountUsd" } } },
      ]);
      const pendingPayoutUsd = pendingPayouts[0]?.total || 0;

      const origin = request.headers.origin || "https://app.knotengine.com";
      const affiliateLink = `${origin}/register?ref=${user.referralCode || ""}`;

      return reply.send({
        object: "affiliate_stats",
        referral_code: user.referralCode || null,
        total_referrals: user.totalReferrals || 0,
        total_earnings_usd: user.referralEarningsUsd || 0,
        monthly_earnings_usd: user.monthlyReferralEarnings || 0,
        pending_payout_usd: pendingPayoutUsd,
        tier: TIER_LABELS[tier as keyof typeof TIER_LABELS] || "Standard",
        commission_rate: commissionRate,
        affiliate_link: affiliateLink,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/affiliates/referrals — List Referred Users
  // ──────────────────────────────────────────────
  server.get(
    "/v1/affiliates/referrals",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            object: z.literal("list"),
            data: z.array(
              z.object({
                object: z.literal("referral"),
                id: z.string(),
                email: z.string().nullable(),
                created_at: z.string(),
                earned_usd: z.number(),
              }),
            ),
            has_more: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const userId = merchant.userId;
      const { page, limit } = request.query;

      const user = await User.findById(userId);
      if (!user) {
        return apiError(reply, 404, "user_not_found", "User not found");
      }

      const referrals = await User.find({ referredBy: userId })
        .select("email createdAt referralEarningsUsd")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit + 1);

      const hasMore = referrals.length > limit;
      const data = referrals.slice(0, limit).map((r) => ({
        object: "referral" as const,
        id: r._id.toString(),
        email: r.email || null,
        created_at: r.createdAt.toISOString(),
        earned_usd: r.referralEarningsUsd || 0,
      }));

      return reply.send({
        object: "list",
        data,
        has_more: hasMore,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/affiliates/earnings — Earnings Breakdown
  // ──────────────────────────────────────────────
  server.get(
    "/v1/affiliates/earnings",
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: z.object({
            object: z.literal("affiliate_earnings"),
            total_earnings_usd: z.number(),
            lifetime_earnings_usd: z.number(),
            current_balance_usd: z.number(),
            commission_rate: z.number(),
            tier: z.string(),
            max_referral_earnings: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const user = await User.findById(merchant.userId);
      if (!user) {
        return apiError(reply, 404, "user_not_found", "User not found");
      }

      const tier = user.affiliateTier || "standard";
      const commissionRate =
        TIER_COMMISSIONS[tier as keyof typeof TIER_COMMISSIONS];

      return reply.send({
        object: "affiliate_earnings",
        total_earnings_usd: user.referralEarningsUsd || 0,
        lifetime_earnings_usd: user.referralEarningsUsd || 0,
        current_balance_usd: user.creditBalance || 0,
        commission_rate: commissionRate,
        tier: TIER_LABELS[tier as keyof typeof TIER_LABELS] || "Standard",
        max_referral_earnings: 500,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/affiliates/tier — Tier Info & Progress
  // ──────────────────────────────────────────────
  server.get(
    "/v1/affiliates/tier",
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: z.object({
            object: z.literal("affiliate_tier"),
            current_tier: z.string(),
            current_tier_key: z.string(),
            commission_rate: z.number(),
            total_referrals: z.number(),
            next_tier: z.string().nullable(),
            next_tier_commission: z.number().nullable(),
            referrals_to_next_tier: z.number().nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const user = await User.findById(merchant.userId);
      if (!user) {
        return apiError(reply, 404, "user_not_found", "User not found");
      }

      const tier = user.affiliateTier || "standard";
      const totalReferrals = user.totalReferrals || 0;
      const commissionRate =
        TIER_COMMISSIONS[tier as keyof typeof TIER_COMMISSIONS];

      let nextTier: string | null = null;
      let nextTierCommission: number | null = null;
      let referralsToNext: number | null = null;

      if (tier === "standard") {
        nextTier = "Silver";
        nextTierCommission = 0.15;
        referralsToNext = Math.max(0, TIER_THRESHOLDS.silver - totalReferrals);
      } else if (tier === "silver") {
        nextTier = "Gold";
        nextTierCommission = 0.2;
        referralsToNext = Math.max(0, TIER_THRESHOLDS.gold - totalReferrals);
      } else if (tier === "gold") {
        nextTier = "Platinum";
        nextTierCommission = 0.25;
        referralsToNext = Math.max(
          0,
          TIER_THRESHOLDS.platinum - totalReferrals,
        );
      }

      return reply.send({
        object: "affiliate_tier",
        current_tier:
          TIER_LABELS[tier as keyof typeof TIER_LABELS] || "Standard",
        current_tier_key: tier,
        commission_rate: commissionRate,
        total_referrals: totalReferrals,
        next_tier: nextTier,
        next_tier_commission: nextTierCommission,
        referrals_to_next_tier: referralsToNext,
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/affiliates/payout — Request Payout
  // ──────────────────────────────────────────────
  server.post(
    "/v1/affiliates/payout",
    {
      preHandler: requireAuth,
      schema: {
        body: z.object({
          amount_usd: z.number().min(10),
          method: z.enum(["crypto", "usd_balance"]),
          currency: z.string().optional(),
          wallet_address: z.string().optional(),
        }),
        response: {
          201: z.object({
            object: z.literal("affiliate_payout"),
            id: z.string(),
            amount_usd: z.number(),
            method: z.string(),
            status: z.string(),
            created_at: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const userId = merchant.userId;
      const { amount_usd, method, currency, wallet_address } = request.body;

      const user = await User.findById(userId);
      if (!user) {
        return apiError(reply, 404, "user_not_found", "User not found");
      }

      if (user.referralEarningsUsd < amount_usd) {
        return apiError(
          reply,
          400,
          "affiliate_payout_insufficient_balance",
          `Insufficient balance. Available: $${user.referralEarningsUsd.toFixed(2)}`,
        );
      }

      if (method === "crypto" && !wallet_address) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Wallet address is required for crypto payouts",
        );
      }

      if (method === "crypto" && !currency) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Currency is required for crypto payouts",
        );
      }

      const payout = await AffiliatePayout.create({
        userId: user._id,
        amountUsd: amount_usd,
        method,
        currency,
        walletAddress: wallet_address,
        status: "pending",
      });

      // Deduct from earnings
      await User.findByIdAndUpdate(userId, {
        $inc: { referralEarningsUsd: -amount_usd },
      });

      return reply.code(201).send({
        object: "affiliate_payout",
        id: payout._id.toString(),
        amount_usd: payout.amountUsd,
        method: payout.method,
        status: payout.status,
        created_at: payout.createdAt.toISOString(),
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/affiliates/payouts — Payout History
  // ──────────────────────────────────────────────
  server.get(
    "/v1/affiliates/payouts",
    {
      preHandler: requireAuth,
      schema: {
        querystring: z.object({
          page: z.coerce.number().min(1).default(1),
          limit: z.coerce.number().min(1).max(100).default(20),
        }),
        response: {
          200: z.object({
            object: z.literal("list"),
            data: z.array(
              z.object({
                object: z.literal("affiliate_payout"),
                id: z.string(),
                amount_usd: z.number(),
                method: z.string(),
                currency: z.string().nullable(),
                status: z.string(),
                tx_hash: z.string().nullable(),
                created_at: z.string(),
                processed_at: z.string().nullable(),
              }),
            ),
            has_more: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const userId = merchant.userId;
      const { page, limit } = request.query;

      const payouts = await AffiliatePayout.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit + 1);

      const hasMore = payouts.length > limit;
      const data = payouts.slice(0, limit).map((p) => ({
        object: "affiliate_payout" as const,
        id: p._id.toString(),
        amount_usd: p.amountUsd,
        method: p.method,
        currency: p.currency || null,
        status: p.status,
        tx_hash: p.txHash || null,
        created_at: p.createdAt.toISOString(),
        processed_at: p.processedAt?.toISOString() || null,
      }));

      return reply.send({
        object: "list",
        data,
        has_more: hasMore,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/affiliates/materials — Marketing Materials
  // ──────────────────────────────────────────────
  server.get(
    "/v1/affiliates/materials",
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: z.object({
            object: z.literal("affiliate_materials"),
            referral_code: z.string().nullable(),
            affiliate_link: z.string(),
            banner_html: z.string(),
            email_template: z.string(),
            social_share_text: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      const user = await User.findById(merchant.userId);
      if (!user) {
        return apiError(reply, 404, "user_not_found", "User not found");
      }

      const origin = request.headers.origin || "https://app.knotengine.com";
      const affiliateLink = `${origin}/register?ref=${user.referralCode || ""}`;

      const bannerHtml = `<a href="${affiliateLink}" target="_blank" rel="noopener noreferrer"><img src="${origin}/banners/affiliate-banner-728x90.png" alt="Join KnotEngine" width="728" height="90" /></a>`;

      const emailTemplate = `Hey!\n\nI've been using KnotEngine for crypto payments and it's been great. Non-custodial, so you receive crypto directly to your own wallet.\n\nSign up with my referral link and we'll both get a bonus:\n${affiliateLink}\n\nBest!`;

      const socialShareText = `Accept crypto payments with KnotEngine - non-custodial, instant settlements, and you control your keys. Sign up with my link: ${affiliateLink}`;

      return reply.send({
        object: "affiliate_materials",
        referral_code: user.referralCode || null,
        affiliate_link: affiliateLink,
        banner_html: bannerHtml,
        email_template: emailTemplate,
        social_share_text: socialShareText,
      });
    },
  );
}
