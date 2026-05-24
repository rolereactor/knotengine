import { FastifyReply, FastifyRequest } from "fastify";
import { Merchant, User } from "@qodinger/knot-database";
import { AuditLogger } from "../../core/audit-logger.js";
import { safeCompare } from "../../utils/crypto.js";

type SuspensionReason =
  | "payment_failed"
  | "policy_violation"
  | "fraud"
  | "manual"
  | "other";

export const MerchantSuspensionController = {
  suspendMerchant: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
      Body: { reason: SuspensionReason; note?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const internalSecret = request.headers["x-internal-secret"] as string;

    if (
      !oauthId ||
      !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
    ) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await User.findOne({
      oauthId: {
        $regex: new RegExp(
          `^${oauthId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(:|$)`,
        ),
      },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const { merchantId } = request.params;
    const { reason, note } = request.body;

    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) return reply.code(404).send({ error: "Merchant not found" });

    if (!merchant.isActive) {
      return reply.code(400).send({ error: "Merchant is already suspended" });
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
      request as any,
      {
        merchantId,
        reason: "merchant_suspended",
        suspensionReason: reason,
        note,
      },
    );

    return {
      success: true,
      message: `Merchant ${merchantId} has been suspended`,
    };
  },

  reinstateMerchant: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const internalSecret = request.headers["x-internal-secret"] as string;

    if (
      !oauthId ||
      !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
    ) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const user = await User.findOne({
      oauthId: {
        $regex: new RegExp(
          `^${oauthId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(:|$)`,
        ),
      },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });

    const { merchantId } = request.params;

    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) return reply.code(404).send({ error: "Merchant not found" });

    if (merchant.isActive) {
      return reply.code(400).send({ error: "Merchant is not suspended" });
    }

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { isActive: true },
      $unset: { suspendedAt: "", suspendedReason: "", suspendedBy: "" },
    });

    await AuditLogger.security(
      user._id.toString(),
      "api_key_generated",
      request as any,
      {
        merchantId,
        reason: "merchant_reinstated",
      },
    );

    return {
      success: true,
      message: `Merchant ${merchantId} has been reinstated. API key must be regenerated.`,
    };
  },

  getSuspensionStatus: async (
    request: FastifyRequest<{
      Params: { merchantId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const oauthId = request.headers["x-oauth-id"] as string;
    const internalSecret = request.headers["x-internal-secret"] as string;

    if (
      !oauthId ||
      !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
    ) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const { merchantId } = request.params;

    const merchant = await Merchant.findOne({ merchantId }).select(
      "isActive suspendedAt suspendedReason suspendedBy",
    );
    if (!merchant) return reply.code(404).send({ error: "Merchant not found" });

    return {
      isActive: merchant.isActive,
      suspendedAt: merchant.suspendedAt,
      suspendedReason: merchant.suspendedReason,
    };
  },
};
