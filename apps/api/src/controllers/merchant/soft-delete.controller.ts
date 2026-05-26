import { FastifyReply } from "fastify";
import { Merchant, MerchantMember, User } from "@qodinger/knot-database";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { safeCompare } from "../../utils/crypto.js";
import { apiError } from "../../utils/api-error.js";

export const MerchantSoftDeleteController = {
  softDelete: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;

    if (merchant.isDeleted) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This merchant is already deleted.",
      );
    }

    const ownerCount = await MerchantMember.countDocuments({
      merchantId: merchant._id,
      role: "owner",
      accepted: true,
    });

    if (ownerCount > 1) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Cannot delete a merchant with multiple owners. Transfer ownership to a single owner first.",
      );
    }

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user._id,
        isActive: false,
      },
      $unset: { apiKeyHash: "" },
    });

    await AuditLogger.account(
      user._id.toString(),
      "merchant_deleted",
      request,
      { merchantId: merchant.merchantId, reason: "soft_delete" },
    );

    return {
      success: true,
      message:
        "Merchant deleted successfully. All data is preserved for compliance.",
      note: "Invoices, webhooks, and audit logs are retained. API keys are revoked.",
    };
  },

  restore: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    if (!merchant.isDeleted) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This merchant is not deleted.",
      );
    }

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        isDeleted: false,
        isActive: true,
      },
      $unset: { deletedAt: "", deletedBy: "" },
    });

    return {
      success: true,
      message:
        "Merchant restored successfully. You will need to generate a new API key.",
    };
  },

  getDeletedStatus: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    return {
      is_deleted: merchant.isDeleted,
      deleted_at: merchant.deletedAt,
      can_restore: merchant.isDeleted,
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

  const merchantId = request.params.merchantId;
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
      "Only owners can delete or restore a merchant.",
    );
    return null;
  }

  return { merchant, user };
}
