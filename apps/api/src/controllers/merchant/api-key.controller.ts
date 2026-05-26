import { FastifyReply } from "fastify";
import {
  Merchant,
  ApiKey,
  MerchantMember,
  User,
} from "@qodinger/knot-database";
import * as crypto from "crypto";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { getPlanLimits, checkPlanLimit } from "@qodinger/knot-types";
import { safeCompare } from "../../utils/crypto.js";
import { apiError } from "../../utils/api-error.js";
import { RedisClient } from "../../infra/redis-client.js";

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
      object: "list",
      data: keys.map((k: any) => ({
        object: "key",
        id: k.keyId,
        label: k.label,
        scope: k.scope,
        last_four: k.lastFour,
        last_used_at: k.lastUsedAt,
        last_used_ip: k.lastUsedIp,
        request_count: k.requestCount,
        created_at: k.createdAt,
      })),
      limits: getPlanLimits(merchant.plan),
    };
  },

  createKey: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const { label, scope } = request.body;

    // Idempotency: a retry with the same key must return the same secret.
    // Without this, each retry would create a new key and expose a new secret.
    const idempotencyKey = request.headers["idempotency-key"] as
      | string
      | undefined;
    if (idempotencyKey) {
      const cacheKey = `idempotency:api_key:${merchant._id}:${idempotencyKey}`;
      const cached = await RedisClient.get<object>(cacheKey);
      if (cached) {
        return reply
          .code(201)
          .header("Idempotent-Replayed", "true")
          .send(cached);
      }
    }

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
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        `API key limit reached for the ${merchant.plan} plan (${limits.maxApiKeys} max). Upgrade to add more.`,
      );
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
      request,
      {
        merchantId: merchant.merchantId,
        keyId,
        label: apiKey.label,
        scope: apiKey.scope,
      },
    );

    const responseBody = {
      object: "key",
      id: apiKey.keyId,
      secret: secretKey,
      label: apiKey.label,
      scope: apiKey.scope,
      last_four: apiKey.lastFour,
      created_at: apiKey.createdAt,
      warning: "Store this secret key securely. It will not be shown again.",
    };

    if (idempotencyKey) {
      const cacheKey = `idempotency:api_key:${merchant._id}:${idempotencyKey}`;
      RedisClient.set(cacheKey, responseBody, 86400).catch(() => {});
    }

    return reply.code(201).send(responseBody);
  },

  revokeKey: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const reason = request.body?.reason;

    const apiKey = await ApiKey.findOne({
      _id: request.params.keyId,
      merchantId: merchant._id,
      isActive: true,
    });

    if (!apiKey) {
      return apiError(
        reply,
        404,
        "api_key_not_found",
        "No active API key found with that ID.",
      );
    }

    apiKey.isActive = false;
    apiKey.revokedAt = new Date();
    apiKey.revokedReason = reason || "Manually revoked";
    await apiKey.save();

    await AuditLogger.security(
      user._id.toString(),
      "api_key_revoked",
      request,
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

  updateKey: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;
    const { label, scope } = request.body;

    const apiKey = await ApiKey.findOne({
      _id: request.params.keyId,
      merchantId: merchant._id,
      isActive: true,
    });

    if (!apiKey) {
      return apiError(
        reply,
        404,
        "api_key_not_found",
        "No active API key found with that ID.",
      );
    }

    if (label) apiKey.label = label;
    if (scope) apiKey.scope = scope;
    await apiKey.save();

    return {
      object: "key",
      id: apiKey.keyId,
      label: apiKey.label,
      scope: apiKey.scope,
      last_four: apiKey.lastFour,
      created_at: apiKey.createdAt,
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

  const merchantId = request.params.merchantId || request.merchant?.merchantId;
  if (!merchantId) {
    apiError(
      reply,
      400,
      "invalid_request",
      "Merchant ID is required.",
      "merchant_id",
    );
    return null;
  }

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

  if (!merchant.isActive) {
    apiError(
      reply,
      403,
      "merchant_suspended",
      "This merchant account is suspended.",
    );
    return null;
  }

  const membership = await MerchantMember.findOne({
    merchantId: merchant._id,
    userId: user._id,
    accepted: true,
  });
  if (!membership) {
    apiError(
      reply,
      403,
      "forbidden",
      "You do not have access to this merchant.",
    );
    return null;
  }

  return { merchant, user };
}
