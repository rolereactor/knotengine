import { FastifyRequest, FastifyReply } from "fastify";
import { Merchant, ApiKey } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { safeCompare } from "../utils/crypto.js";
import { apiError } from "../utils/api-error.js";
import { RedisClient } from "../infra/redis-client.js";

const MERCHANT_CACHE_TTL_SECONDS = 300;

function merchantCacheKey(merchantId: string): string {
  return `merchant:${merchantId}`;
}

export async function invalidateMerchantCache(
  merchantId: string,
): Promise<void> {
  await RedisClient.del(merchantCacheKey(merchantId));
}

declare module "fastify" {
  interface FastifyRequest {
    apiKey?: any;
  }
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // API Key auth (supports multiple keys)
  const apiKey = request.headers["x-api-key"] as string;
  if (apiKey) {
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const foundKey = await ApiKey.findOne({
      keyHash: apiKeyHash,
      isActive: true,
    }).populate("merchantId");
    if (foundKey) {
      const populatedMerchant = foundKey.merchantId as any;
      const merchantId = populatedMerchant?._id?.toString();

      let merchant: any;
      if (merchantId) {
        const cached = await RedisClient.get<any>(merchantCacheKey(merchantId));
        if (cached) {
          merchant = cached;
        } else {
          merchant = populatedMerchant;
          RedisClient.set(
            merchantCacheKey(merchantId),
            merchant,
            MERCHANT_CACHE_TTL_SECONDS,
          ).catch(() => {});
        }
      } else {
        merchant = populatedMerchant;
      }

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
  }

  // Internal OAuth proxy auth
  const oauthId = request.headers["x-oauth-id"] as string;
  const merchantId = request.headers["x-merchant-id"] as string;
  const secret = request.headers["x-internal-secret"] as string;

  if (oauthId && safeCompare(secret, process.env.INTERNAL_SECRET || "")) {
    const query: Record<string, unknown> = {
      oauthId,
      isActive: true,
      isDeleted: { $ne: true },
    };
    if (merchantId) {
      // Support both new public mid_... format and legacy MongoDB _id
      if (merchantId.startsWith("mid_")) {
        query.merchantId = merchantId;
      } else {
        query._id = merchantId;
      }
    }

    const merchant = await Merchant.findOne(query);
    if (merchant) {
      const cacheId = (merchant as any).merchantId || merchant._id.toString();
      const cached = await RedisClient.get<any>(merchantCacheKey(cacheId));
      const result = cached || merchant;
      if (!cached) {
        RedisClient.set(
          merchantCacheKey(cacheId),
          result,
          MERCHANT_CACHE_TTL_SECONDS,
        ).catch(() => {});
      }
      request.merchant = result;
      return;
    }
    return apiError(
      reply,
      401,
      "merchant_not_found",
      "No merchant found for this identity.",
    );
  }

  return apiError(reply, 401, "unauthorized", "Authentication required.");
};
