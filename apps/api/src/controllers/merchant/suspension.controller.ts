import { FastifyReply } from "fastify";
import { Merchant, MerchantMember, User } from "@qodinger/knot-database";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { safeCompare } from "../../utils/crypto.js";
import { apiError } from "../../utils/api-error.js";

export const MerchantSuspensionController = {
  suspendMerchant: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const { reason, note } = request.body;

    if (!merchant.isActive) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This merchant is already suspended.",
      );
    }

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        isActive: false,
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedBy: user._id,
      },
      $unset: { apiKeyHash: "" },
    });

    await AuditLogger.security(
      user._id.toString(),
      "api_key_revoked",
      request,
      {
        merchantId: merchant.merchantId,
        reason: "merchant_suspended",
        suspensionReason: reason,
        note,
      },
    );

    return {
      success: true,
      message: `Merchant ${merchant.merchantId} has been suspended`,
    };
  },

  reinstateMerchant: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;

    if (merchant.isActive) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This merchant is not suspended.",
      );
    }

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { isActive: true },
      $unset: { suspendedAt: "", suspendedReason: "", suspendedBy: "" },
    });

    await AuditLogger.security(
      user._id.toString(),
      "api_key_generated",
      request,
      {
        merchantId: merchant.merchantId,
        reason: "merchant_reinstated",
      },
    );

    return {
      success: true,
      message: `Merchant ${merchant.merchantId} has been reinstated. API key must be regenerated.`,
    };
  },

  getSuspensionStatus: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    return {
      is_active: merchant.isActive,
      suspended_at: merchant.suspendedAt,
      suspended_reason: merchant.suspendedReason,
    };
  },
};

async function resolveAuth(
  request: any,
  reply: FastifyReply,
): Promise<{ merchant: any; user: any } | null> {
  const oauthId = request.headers["x-oauth-id"] as string;
  const internalSecret = request.headers["x-internal-secret"] as string;

  if (
    !oauthId ||
    !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
  ) {
    apiError(reply, 401, "unauthorized", "Authentication required.");
    return null;
  }

  const user = await User.findOne({
    oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
  });
  if (!user) {
    apiError(reply, 404, "user_not_found", "No user found for this identity.");
    return null;
  }

  const { merchantId } = request.params;
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    apiError(
      reply,
      404,
      "merchant_not_found",
      "No merchant found with that ID.",
    );
    return null;
  }

  const membership = await MerchantMember.findOne({
    merchantId: merchant._id,
    userId: user._id,
    role: "owner",
    accepted: true,
  });
  if (!membership) {
    apiError(
      reply,
      403,
      "forbidden",
      "Only owners can manage merchant suspension.",
    );
    return null;
  }

  return { merchant, user };
}
