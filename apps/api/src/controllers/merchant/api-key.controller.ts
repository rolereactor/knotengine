import { FastifyReply, FastifyRequest } from "fastify";
import { Merchant, ApiKey, User } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { getPlanLimits, checkPlanLimit } from "@qodinger/knot-types";
import { safeCompare } from "../../utils/crypto.js";

type ApiKeyScope = "full_access" | "read_only" | "invoices" | "webhooks";

export const ApiKeyController = {
  listKeys: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    const keys = await ApiKey.find({
      merchantId: merchant._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    return {
      keys: keys.map((k: any) => ({
        id: k._id.toString(),
        keyId: k.keyId,
        label: k.label,
        scope: k.scope,
        lastFour: k.lastFour,
        lastUsedAt: k.lastUsedAt,
        lastUsedIp: k.lastUsedIp,
        requestCount: k.requestCount,
        createdAt: k.createdAt,
      })),
      limits: getPlanLimits(merchant.plan),
    };
  },

  createKey: async (
    request: FastifyRequest<{
      Body: { label: string; scope: ApiKeyScope };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const { label, scope } = (request as any).body;

    const limits = getPlanLimits(merchant.plan);
    const currentCount = await ApiKey.countDocuments({
      merchantId: merchant._id,
      isActive: true,
    });

    const limitCheck = checkPlanLimit(
      merchant.plan,
      "maxApiKeys",
      currentCount,
    );
    if (!limitCheck.allowed) {
      return reply.code(403).send({
        error: `API key limit reached for ${merchant.plan} plan (${limits.maxApiKeys} max). Upgrade to add more.`,
        code: "LIMIT_EXCEEDED",
        limit: limits.maxApiKeys,
        current: currentCount,
      });
    }

    const secretKey = `knot_sk_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(secretKey).digest("hex");
    const keyId = `key_${crypto.randomBytes(8).toString("hex")}`;
    const lastFour = secretKey.slice(-4);

    const apiKey = await ApiKey.create({
      merchantId: merchant._id,
      keyId,
      keyHash,
      label: label || `API Key ${lastFour}`,
      scope: scope || "full_access",
      lastFour,
      createdBy: user._id,
      isActive: true,
    });

    await AuditLogger.security(
      user._id.toString(),
      "api_key_generated",
      request as any,
      {
        merchantId: merchant.merchantId,
        keyId,
        label: apiKey.label,
        scope: apiKey.scope,
      },
    );

    return {
      success: true,
      message: "API key created successfully",
      key: {
        id: apiKey._id.toString(),
        keyId: apiKey.keyId,
        secretKey,
        label: apiKey.label,
        scope: apiKey.scope,
        lastFour: apiKey.lastFour,
      },
      warning: "Store this secret key securely. It will not be shown again.",
    };
  },

  revokeKey: async (
    request: FastifyRequest<{
      Params: { merchantId: string; keyId: string };
      Body: { reason?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const reason = (request as any).body?.reason;

    const apiKey = await ApiKey.findOne({
      _id: request.params.keyId,
      merchantId: merchant._id,
      isActive: true,
    });

    if (!apiKey) {
      return reply.code(404).send({ error: "API key not found" });
    }

    apiKey.isActive = false;
    apiKey.revokedAt = new Date();
    apiKey.revokedReason = reason || "Manually revoked";
    await apiKey.save();

    await AuditLogger.security(
      user._id.toString(),
      "api_key_revoked",
      request as any,
      {
        merchantId: merchant.merchantId,
        keyId: apiKey.keyId,
        label: apiKey.label,
        reason: apiKey.revokedReason,
      },
    );

    return {
      success: true,
      message: "API key revoked successfully",
    };
  },

  updateKey: async (
    request: FastifyRequest<{
      Params: { merchantId: string; keyId: string };
      Body: { label?: string; scope?: ApiKeyScope };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant } = ctx;
    const { label, scope } = (request as any).body;

    const apiKey = await ApiKey.findOne({
      _id: request.params.keyId,
      merchantId: merchant._id,
      isActive: true,
    });

    if (!apiKey) {
      return reply.code(404).send({ error: "API key not found" });
    }

    if (label) apiKey.label = label;
    if (scope) apiKey.scope = scope;
    await apiKey.save();

    return {
      success: true,
      message: "API key updated successfully",
      key: {
        id: apiKey._id.toString(),
        keyId: apiKey.keyId,
        label: apiKey.label,
        scope: apiKey.scope,
        lastFour: apiKey.lastFour,
      },
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

  const merchantId = request.params.merchantId || request.merchant?.merchantId;
  if (!merchantId) {
    reply.code(400).send({ error: "Merchant ID required" });
    return null;
  }

  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    reply.code(404).send({ error: "Merchant not found" });
    return null;
  }

  if (!merchant.isActive) {
    reply.code(403).send({ error: "Merchant account suspended" });
    return null;
  }

  return { merchant, user };
}
