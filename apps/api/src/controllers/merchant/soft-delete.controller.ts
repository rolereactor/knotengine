import { FastifyReply, FastifyRequest } from "fastify";
import { Merchant, MerchantMember, User } from "@qodinger/knot-database";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { safeCompare } from "../../utils/crypto.js";

export const MerchantSoftDeleteController = {
  softDelete: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;

    if (merchant.isDeleted) {
      return reply.code(400).send({ error: "Merchant is already deleted" });
    }

    const ownerCount = await MerchantMember.countDocuments({
      merchantId: merchant._id,
      role: "owner",
      accepted: true,
    });

    if (ownerCount > 1) {
      return reply.code(400).send({
        error:
          "Cannot delete merchant while multiple owners exist. Transfer ownership first.",
      });
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
      request as any,
      { merchantId: merchant.merchantId, reason: "soft_delete" },
    );

    return {
      success: true,
      message:
        "Merchant deleted successfully. All data is preserved for compliance.",
      note: "Invoices, webhooks, and audit logs are retained. API keys are revoked.",
    };
  },

  restore: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    if (!merchant.isDeleted) {
      return reply.code(400).send({ error: "Merchant is not deleted" });
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

  getDeletedStatus: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    return {
      isDeleted: merchant.isDeleted,
      deletedAt: merchant.deletedAt,
      canRestore: merchant.isDeleted,
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
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }

  const user = await User.findOne({
    oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
  });
  if (!user) {
    reply.code(404).send({ error: "User not found" });
    return null;
  }

  const merchantId = request.params.merchantId;
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    reply.code(404).send({ error: "Merchant not found" });
    return null;
  }

  const membership = await MerchantMember.findOne({
    merchantId: merchant._id,
    userId: user._id,
    role: "owner",
    accepted: true,
  });

  if (!membership) {
    reply.code(403).send({ error: "Only owners can delete merchants" });
    return null;
  }

  return { merchant, user };
}
