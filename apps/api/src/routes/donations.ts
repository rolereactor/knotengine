import {
  SUPPORTED_CURRENCIES,
  stripHtmlTags,
  limitLength,
  MAX_TEXT_LENGTH,
} from "@qodinger/knot-types";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Donation, DonationMessage } from "@qodinger/knot-database";
import { requireAuth } from "../middleware/auth.middleware.js";
import { merchantRateLimit } from "../middleware/rate-limit.middleware.js";
import { apiError } from "../utils/api-error.js";
import { RedisClient } from "../infra/redis-client.js";
import * as crypto from "crypto";

const sanitizeDescription = (val?: string) =>
  val ? limitLength(stripHtmlTags(val).trim(), MAX_TEXT_LENGTH) : val;

/**
 * 💝 Donation Routes — /v1/donations
 *
 * Public donation pages with goal tracking, messages, and streaming alerts.
 *   POST   /v1/donations                  → Create a donation page
 *   GET    /v1/donations                  → List donation pages
 *   GET    /v1/donations/public/:slug     → Get page details (public)
 *   PATCH  /v1/donations/:id              → Update a donation page
 *   DELETE /v1/donations/:id              → Deactivate a donation page
 *   POST   /v1/donations/:id/donate       → Make a donation (creates invoice)
 *   GET    /v1/donations/:id/stats        → Get donation statistics
 *   GET    /v1/donations/:id/messages     → Get donation messages
 *   GET    /v1/donations/:id/leaderboard  → Get top donors
 *   GET    /v1/donations/:id/alerts       → Get latest alerts (OBS)
 *   POST   /v1/donations/:id/alerts/:msgId/read → Mark alert as read
 */
export async function donationRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // ──────────────────────────────────────────────
  // POST /v1/donations — Create Donation Page
  // ──────────────────────────────────────────────
  server.post(
    "/v1/donations",
    {
      preHandler: [requireAuth, merchantRateLimit],
      schema: {
        body: z.object({
          title: z.string().min(1).max(100),
          description: z
            .string()
            .max(MAX_TEXT_LENGTH)
            .transform(sanitizeDescription)
            .optional(),
          goal_amount: z.number().positive().optional(),
          suggested_amounts: z.array(z.number().positive()).max(10).optional(),
          allow_custom_amount: z.boolean().optional(),
          show_progress: z.boolean().optional(),
          thank_you_message: z.string().max(500).optional(),
          slug: z
            .string()
            .min(3)
            .max(50)
            .regex(
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              "Slug must be lowercase alphanumeric with hyphens",
            )
            .optional(),
          max_donations: z.number().int().positive().optional(),
          expires_at: z.string().datetime().optional(),
          redirect_url: z.string().url().optional(),
          // Streaming features
          allow_messages: z.boolean().optional(),
          max_message_length: z.number().int().min(0).max(2000).optional(),
          show_messages: z.boolean().optional(),
          alerts_enabled: z.boolean().optional(),
          alert_sound_url: z.string().url().nullable().optional(),
          alert_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
          alert_duration: z.number().int().min(1).max(30).optional(),
          show_donor_name: z.boolean().optional(),
          alert_minimum_amount: z.number().min(0).optional(),
          leaderboard_enabled: z.boolean().optional(),
          leaderboard_size: z.number().int().min(1).max(50).optional(),
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
        goal_amount,
        suggested_amounts,
        allow_custom_amount,
        show_progress,
        thank_you_message,
        slug,
        max_donations,
        expires_at,
        redirect_url,
        allow_messages,
        max_message_length,
        show_messages,
        alerts_enabled,
        alert_sound_url,
        alert_color,
        alert_duration,
        show_donor_name,
        alert_minimum_amount,
        leaderboard_enabled,
        leaderboard_size,
      } = request.body;

      const donationId = `don_${crypto.randomBytes(12).toString("hex")}`;
      const finalSlug =
        slug || `donate_${crypto.randomBytes(8).toString("hex")}`;

      // Check slug uniqueness
      const existing = await Donation.findOne({ slug: finalSlug });
      if (existing) {
        return apiError(
          reply,
          409,
          "conflict",
          "This slug is already taken. Please choose another.",
          "slug",
        );
      }

      const donation = await Donation.create({
        merchantId: merchant._id,
        donationId,
        slug: finalSlug,
        title,
        description,
        goalAmount: goal_amount,
        suggestedAmounts: suggested_amounts || [5, 10, 25, 50, 100],
        allowCustomAmount: allow_custom_amount ?? true,
        showProgress: show_progress ?? true,
        thankYouMessage: thank_you_message,
        maxDonations: max_donations,
        expiresAt: expires_at ? new Date(expires_at) : undefined,
        redirectUrl: redirect_url,
        // Streaming features
        allowMessages: allow_messages ?? true,
        maxMessageLength: max_message_length ?? 500,
        showMessages: show_messages ?? true,
        alertsEnabled: alerts_enabled ?? true,
        alertSoundUrl: alert_sound_url ?? undefined,
        alertColor: alert_color ?? "#10b981",
        alertDuration: alert_duration ?? 5,
        showDonorName: show_donor_name ?? true,
        alertMinimumAmount: alert_minimum_amount ?? 0,
        leaderboardEnabled: leaderboard_enabled ?? true,
        leaderboardSize: leaderboard_size ?? 10,
      });

      const checkoutUrl = `${process.env.CHECKOUT_URL || "http://localhost:5051"}/donate/${donation.slug}`;
      const overlayUrl = `${process.env.CHECKOUT_URL || "http://localhost:5051"}/overlay/${donation.slug}`;

      return reply.code(201).send({
        object: "donation",
        id: donation.donationId,
        slug: donation.slug,
        url: checkoutUrl,
        overlay_url: overlayUrl,
        title: donation.title,
        description: donation.description,
        goal_amount: donation.goalAmount,
        current_amount: donation.currentAmount,
        donor_count: donation.donorCount,
        suggested_amounts: donation.suggestedAmounts,
        allow_custom_amount: donation.allowCustomAmount,
        show_progress: donation.showProgress,
        thank_you_message: donation.thankYouMessage,
        is_active: donation.isActive,
        max_donations: donation.maxDonations,
        expires_at: donation.expiresAt,
        redirect_url: donation.redirectUrl,
        // Streaming features
        allow_messages: donation.allowMessages,
        max_message_length: donation.maxMessageLength,
        show_messages: donation.showMessages,
        alerts_enabled: donation.alertsEnabled,
        alert_sound_url: donation.alertSoundUrl,
        alert_color: donation.alertColor,
        alert_duration: donation.alertDuration,
        show_donor_name: donation.showDonorName,
        alert_minimum_amount: donation.alertMinimumAmount,
        leaderboard_enabled: donation.leaderboardEnabled,
        leaderboard_size: donation.leaderboardSize,
        created_at: donation.createdAt,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/donations — List Donation Pages
  // ──────────────────────────────────────────────
  server.get(
    "/v1/donations",
    {
      preHandler: requireAuth,
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const donations = await Donation.find({
        merchantId: merchant._id,
      }).sort({ createdAt: -1 });

      const checkoutBase = process.env.CHECKOUT_URL || "http://localhost:5051";

      return reply.send({
        object: "list",
        data: donations.map((d) => ({
          object: "donation",
          id: d.donationId,
          slug: d.slug,
          url: `${checkoutBase}/donate/${d.slug}`,
          title: d.title,
          description: d.description,
          goal_amount: d.goalAmount,
          current_amount: d.currentAmount,
          donor_count: d.donorCount,
          suggested_amounts: d.suggestedAmounts,
          allow_custom_amount: d.allowCustomAmount,
          show_progress: d.showProgress,
          is_active: d.isActive,
          max_donations: d.maxDonations,
          expires_at: d.expiresAt,
          alerts_enabled: d.alertsEnabled,
          allow_messages: d.allowMessages,
          created_at: d.createdAt,
        })),
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/donations/public/:slug — Get Page (Public)
  // ──────────────────────────────────────────────
  server.get<{ Params: { slug: string } }>(
    "/v1/donations/public/:slug",
    async (request, reply) => {
      const { slug } = request.params;
      const donation = await Donation.findOne({ slug, isActive: true });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found or inactive.",
        );
      }

      if (donation.expiresAt && donation.expiresAt < new Date()) {
        return apiError(
          reply,
          410,
          "donation_expired",
          "This donation page has expired.",
        );
      }

      if (
        donation.maxDonations &&
        donation.donorCount >= donation.maxDonations
      ) {
        return apiError(
          reply,
          410,
          "donation_limit_reached",
          "This donation page has reached its limit.",
        );
      }

      // Get recent messages if enabled
      let recentMessages: any[] = [];
      if (donation.showMessages) {
        const messages = await DonationMessage.find({
          donationId: donation._id,
          message: { $ne: "" },
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .select("donorName amountUsd message createdAt");
        recentMessages = messages;
      }

      return reply.send({
        object: "donation",
        id: donation.donationId,
        title: donation.title,
        description: donation.description,
        goal_amount: donation.goalAmount,
        current_amount: donation.currentAmount,
        donor_count: donation.donorCount,
        suggested_amounts: donation.suggestedAmounts,
        allow_custom_amount: donation.allowCustomAmount,
        show_progress: donation.showProgress,
        thank_you_message: donation.thankYouMessage,
        allow_messages: donation.allowMessages,
        max_message_length: donation.maxMessageLength,
        show_messages: donation.showMessages,
        alert_color: donation.alertColor,
        recent_messages: recentMessages,
      });
    },
  );

  // ──────────────────────────────────────────────
  // PATCH /v1/donations/:id — Update Donation Page
  // ──────────────────────────────────────────────
  server.patch<{ Params: { id: string } }>(
    "/v1/donations/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          title: z.string().min(1).max(100).optional(),
          description: z
            .string()
            .max(MAX_TEXT_LENGTH)
            .transform(sanitizeDescription)
            .optional(),
          goal_amount: z.number().positive().nullable().optional(),
          suggested_amounts: z.array(z.number().positive()).max(10).optional(),
          allow_custom_amount: z.boolean().optional(),
          show_progress: z.boolean().optional(),
          thank_you_message: z.string().max(500).nullable().optional(),
          is_active: z.boolean().optional(),
          max_donations: z.number().int().positive().nullable().optional(),
          expires_at: z.string().datetime().nullable().optional(),
          redirect_url: z.string().url().nullable().optional(),
          // Streaming features
          allow_messages: z.boolean().optional(),
          max_message_length: z.number().int().min(0).max(2000).optional(),
          show_messages: z.boolean().optional(),
          alerts_enabled: z.boolean().optional(),
          alert_sound_url: z.string().url().nullable().optional(),
          alert_color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
          alert_duration: z.number().int().min(1).max(30).optional(),
          show_donor_name: z.boolean().optional(),
          alert_minimum_amount: z.number().min(0).optional(),
          leaderboard_enabled: z.boolean().optional(),
          leaderboard_size: z.number().int().min(1).max(50).optional(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { id } = request.params;
      const donation = await Donation.findOne({
        donationId: id,
        merchantId: merchant._id,
      });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      const updates = request.body as Record<string, any>;

      // Map snake_case to camelCase
      const fieldMap: Record<string, string> = {
        goal_amount: "goalAmount",
        suggested_amounts: "suggestedAmounts",
        allow_custom_amount: "allowCustomAmount",
        show_progress: "showProgress",
        thank_you_message: "thankYouMessage",
        is_active: "isActive",
        max_donations: "maxDonations",
        expires_at: "expiresAt",
        redirect_url: "redirectUrl",
        allow_messages: "allowMessages",
        max_message_length: "maxMessageLength",
        show_messages: "showMessages",
        alerts_enabled: "alertsEnabled",
        alert_sound_url: "alertSoundUrl",
        alert_color: "alertColor",
        alert_duration: "alertDuration",
        show_donor_name: "showDonorName",
        alert_minimum_amount: "alertMinimumAmount",
        leaderboard_enabled: "leaderboardEnabled",
        leaderboard_size: "leaderboardSize",
      };

      for (const [key, value] of Object.entries(updates)) {
        const field = fieldMap[key] || key;
        (donation as any)[field] = value === null ? undefined : value;
      }

      await donation.save();

      const checkoutBase = process.env.CHECKOUT_URL || "http://localhost:5051";

      return reply.send({
        object: "donation",
        id: donation.donationId,
        slug: donation.slug,
        url: `${checkoutBase}/donate/${donation.slug}`,
        title: donation.title,
        description: donation.description,
        goal_amount: donation.goalAmount,
        current_amount: donation.currentAmount,
        donor_count: donation.donorCount,
        suggested_amounts: donation.suggestedAmounts,
        allow_custom_amount: donation.allowCustomAmount,
        show_progress: donation.showProgress,
        thank_you_message: donation.thankYouMessage,
        is_active: donation.isActive,
        max_donations: donation.maxDonations,
        expires_at: donation.expiresAt,
        redirect_url: donation.redirectUrl,
        // Streaming features
        allow_messages: donation.allowMessages,
        max_message_length: donation.maxMessageLength,
        show_messages: donation.showMessages,
        alerts_enabled: donation.alertsEnabled,
        alert_sound_url: donation.alertSoundUrl,
        alert_color: donation.alertColor,
        alert_duration: donation.alertDuration,
        show_donor_name: donation.showDonorName,
        alert_minimum_amount: donation.alertMinimumAmount,
        leaderboard_enabled: donation.leaderboardEnabled,
        leaderboard_size: donation.leaderboardSize,
      });
    },
  );

  // ──────────────────────────────────────────────
  // DELETE /v1/donations/:id — Deactivate Donation Page
  // ──────────────────────────────────────────────
  server.delete<{ Params: { id: string } }>(
    "/v1/donations/:id",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { id } = request.params;
      const donation = await Donation.findOneAndUpdate(
        { donationId: id, merchantId: merchant._id },
        { isActive: false },
        { new: true },
      );

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      return reply.send({
        object: "donation",
        id: donation.donationId,
        is_active: donation.isActive,
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/donations/:id/donate — Make a Donation
  // ──────────────────────────────────────────────
  server.post<{ Params: { id: string } }>(
    "/v1/donations/:id/donate",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          amount_usd: z.number().positive(),
          currency: z.enum(SUPPORTED_CURRENCIES),
          donor_name: z.string().max(100).optional(),
          message: z.string().max(2000).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body as {
        amount_usd: number;
        currency: string;
        donor_name?: string;
        message?: string;
      };
      const { amount_usd, currency, donor_name, message } = body;

      const donation = await Donation.findOne({
        donationId: id,
        isActive: true,
      });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found or inactive.",
        );
      }

      if (donation.expiresAt && donation.expiresAt < new Date()) {
        return apiError(
          reply,
          410,
          "donation_expired",
          "This donation page has expired.",
        );
      }

      if (
        donation.maxDonations &&
        donation.donorCount >= donation.maxDonations
      ) {
        return apiError(
          reply,
          410,
          "donation_limit_reached",
          "This donation page has reached its limit.",
        );
      }

      // Validate message length
      if (
        message &&
        donation.maxMessageLength > 0 &&
        message.length > donation.maxMessageLength
      ) {
        return apiError(
          reply,
          400,
          "invalid_request",
          `Message must be ${donation.maxMessageLength} characters or less.`,
          "message",
        );
      }

      // Update donation stats
      donation.donorCount += 1;
      donation.currentAmount += amount_usd;
      await donation.save();

      // Create donation message
      const messageId = `msg_${crypto.randomBytes(12).toString("hex")}`;
      const donationMessage = await DonationMessage.create({
        donationId: donation._id,
        messageId,
        donorName: donor_name || "Anonymous",
        amountUsd: amount_usd,
        cryptoCurrency: currency,
        message: message || "",
        read: false,
        showOnLeaderboard: true,
      });

      // Create invoice
      const { Invoice, Merchant } = await import("@qodinger/knot-database");
      const merchant = await Merchant.findById(donation.merchantId);

      if (!merchant) {
        return apiError(
          reply,
          500,
          "internal_error",
          "Merchant not found for this donation page.",
        );
      }

      const invoiceId = `inv_${crypto.randomBytes(12).toString("hex")}`;

      // Get price to calculate crypto amount
      const { PriceOracle } = await import("../infra/price-feed.js");
      const price = await PriceOracle.getPrice(currency as any);
      const cryptoAmount = amount_usd / price;

      const invoice = await Invoice.create({
        merchantId: merchant._id,
        invoiceId,
        amountUsd: amount_usd,
        cryptoAmount,
        cryptoAmountReceived: 0,
        cryptoCurrency: currency,
        payAddress: "", // Will be set by wallet derivation
        feeUsd:
          amount_usd *
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
          (merchant.confirmationPolicy as Record<string, number>)?.[currency] ||
          2,
        expiresAt: new Date(
          Date.now() + (merchant.invoiceExpirationMinutes || 30) * 60 * 1000,
        ),
        metadata: {
          donationId: donation.donationId,
          donationSlug: donation.slug,
          messageId,
          donorName: donor_name || "Anonymous",
          message: message || "",
        },
        description: donation.description || `Donation: ${donation.title}`,
      });

      const checkoutUrl = `${process.env.CHECKOUT_URL || "http://localhost:5051"}/checkout/${invoice.invoiceId}`;

      return reply.code(201).send({
        object: "invoice",
        invoice_id: invoice.invoiceId,
        checkout_url: checkoutUrl,
        amount_usd,
        currency,
        donation: {
          id: donation.donationId,
          current_amount: donation.currentAmount,
          goal_amount: donation.goalAmount,
          donor_count: donation.donorCount,
        },
        message: {
          id: donationMessage.messageId,
          donor_name: donationMessage.donorName,
          message: donationMessage.message,
        },
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/donations/:id/stats — Get Donation Stats
  // ──────────────────────────────────────────────
  server.get<{ Params: { id: string } }>(
    "/v1/donations/:id/stats",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { id } = request.params;
      const donation = await Donation.findOne({
        donationId: id,
        merchantId: merchant._id,
      });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      const progress =
        donation.goalAmount && donation.goalAmount > 0
          ? Math.min(
              100,
              Math.round((donation.currentAmount / donation.goalAmount) * 100),
            )
          : null;

      // Get unread message count
      const unreadCount = await DonationMessage.countDocuments({
        donationId: donation._id,
        read: false,
      });

      return reply.send({
        object: "donation_stats",
        id: donation.donationId,
        current_amount: donation.currentAmount,
        goal_amount: donation.goalAmount,
        donor_count: donation.donorCount,
        avg_donation:
          donation.donorCount > 0
            ? Math.round((donation.currentAmount / donation.donorCount) * 100) /
              100
            : 0,
        progress,
        is_active: donation.isActive,
        max_donations: donation.maxDonations,
        remaining_donations: donation.maxDonations
          ? Math.max(0, donation.maxDonations - donation.donorCount)
          : null,
        expires_at: donation.expiresAt,
        unread_messages: unreadCount,
        alerts_enabled: donation.alertsEnabled,
        allow_messages: donation.allowMessages,
        leaderboard_enabled: donation.leaderboardEnabled,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/donations/:id/messages — Get Messages
  // ──────────────────────────────────────────────
  server.get<{
    Params: { id: string };
    Querystring: { limit: number; offset: number };
  }>(
    "/v1/donations/:id/messages",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(100).default(50),
          offset: z.coerce.number().int().min(0).default(0),
        }),
      },
    },
    async (request, reply) => {
      const merchant = (request as any).merchant;
      if (!merchant) {
        return apiError(reply, 401, "unauthorized", "Authentication required.");
      }

      const { id } = request.params;
      const { limit, offset } = request.query;

      const donation = await Donation.findOne({
        donationId: id,
        merchantId: merchant._id,
      });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      const messages = await DonationMessage.find({ donationId: donation._id })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .select(
          "messageId donorName amountUsd cryptoCurrency message read showOnLeaderboard createdAt",
        );

      const total = await DonationMessage.countDocuments({
        donationId: donation._id,
      });

      return reply.send({
        object: "list",
        data: messages.map((m) => ({
          object: "donation_message",
          id: m.messageId,
          donor_name: m.donorName,
          amount_usd: m.amountUsd,
          currency: m.cryptoCurrency,
          message: m.message,
          read: m.read,
          show_on_leaderboard: m.showOnLeaderboard,
          created_at: m.createdAt,
        })),
        total,
        limit,
        offset,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/donations/:id/leaderboard — Get Top Donors
  // ──────────────────────────────────────────────
  server.get<{ Params: { id: string } }>(
    "/v1/donations/:id/leaderboard",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const donation = await Donation.findOne({ donationId: id });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      const limit = donation.leaderboardEnabled ? donation.leaderboardSize : 0;

      if (limit === 0) {
        return reply.send({
          object: "list",
          data: [],
        });
      }

      // Check Redis cache first (60s TTL)
      const cacheKey = `leaderboard:${donation._id}:${limit}`;
      const cached = await RedisClient.get<
        {
          rank: number;
          donor_name: string;
          total_amount: number;
          donation_count: number;
          last_donation: string;
        }[]
      >(cacheKey);
      if (cached) {
        return reply.send({ object: "list", data: cached });
      }

      // Aggregate top donors by name
      const topDonors = await DonationMessage.aggregate([
        {
          $match: {
            donationId: donation._id,
            showOnLeaderboard: true,
            message: { $ne: "" },
          },
        },
        {
          $group: {
            _id: "$donorName",
            totalAmount: { $sum: "$amountUsd" },
            donationCount: { $sum: 1 },
            lastDonation: { $max: "$createdAt" },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: limit },
      ]);

      const leaderboard = topDonors.map((d, i) => ({
        rank: i + 1,
        donor_name: d._id,
        total_amount: d.totalAmount,
        donation_count: d.donationCount,
        last_donation: d.lastDonation,
      }));

      // Cache for 60 seconds
      await RedisClient.set(cacheKey, leaderboard, 60);

      return reply.send({
        object: "list",
        data: leaderboard,
      });
    },
  );

  // ──────────────────────────────────────────────
  // GET /v1/donations/:id/alerts — Get Latest Alerts (OBS)
  // ──────────────────────────────────────────────
  server.get<{ Params: { id: string }; Querystring: { since?: string } }>(
    "/v1/donations/:id/alerts",
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
        querystring: z.object({
          since: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { since } = request.query;

      const donation = await Donation.findOne({ donationId: id });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      if (!donation.alertsEnabled) {
        return reply.send({ object: "list", data: [] });
      }

      // Build query
      const query: Record<string, any> = {
        donationId: donation._id,
      };

      if (donation.alertMinimumAmount > 0) {
        query.amountUsd = { $gte: donation.alertMinimumAmount };
      }

      if (since) {
        query.createdAt = { $gt: new Date(since) };
      }

      // Get unread messages as alerts
      const alerts = await DonationMessage.find({
        ...query,
        read: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "messageId donorName amountUsd cryptoCurrency message createdAt",
        );

      return reply.send({
        object: "list",
        data: alerts.map((a) => ({
          object: "donation_alert",
          id: a.messageId,
          donor_name: donation.showDonorName ? a.donorName : "Anonymous",
          amount_usd: a.amountUsd,
          currency: a.cryptoCurrency,
          message: a.message,
          alert_color: donation.alertColor,
          alert_duration: donation.alertDuration,
          alert_sound_url: donation.alertSoundUrl,
          created_at: a.createdAt,
        })),
      });
    },
  );

  // ──────────────────────────────────────────────
  // POST /v1/donations/:id/alerts/:msgId/read — Mark Alert as Read
  // ──────────────────────────────────────────────
  server.post<{ Params: { id: string; msgId: string } }>(
    "/v1/donations/:id/alerts/:msgId/read",
    {
      preHandler: requireAuth,
      schema: {
        params: z.object({
          id: z.string(),
          msgId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id, msgId } = request.params;

      const donation = await Donation.findOne({ donationId: id });

      if (!donation) {
        return apiError(
          reply,
          404,
          "donation_not_found",
          "Donation page not found.",
        );
      }

      const message = await DonationMessage.findOneAndUpdate(
        { donationId: donation._id, messageId: msgId },
        { read: true },
        { new: true },
      );

      if (!message) {
        return apiError(reply, 404, "donation_not_found", "Message not found.");
      }

      return reply.send({
        object: "donation_alert",
        id: message.messageId,
        read: message.read,
      });
    },
  );
}
