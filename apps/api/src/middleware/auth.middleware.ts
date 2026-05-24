import { FastifyRequest, FastifyReply } from "fastify";
import { Merchant, ApiKey } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { safeCompare } from "../utils/crypto.js";

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
      const merchant = foundKey.merchantId as any;
      if (!merchant.isActive || merchant.isDeleted) {
        return reply
          .code(403)
          .send({ error: "Merchant account suspended or deleted" });
      }
      request.merchant = merchant;
      return;
    }

    return reply.code(401).send({ error: "Invalid API Key" });
  }

  // Internal OAuth proxy auth
  const oauthId = request.headers["x-oauth-id"] as string;
  const merchantId = request.headers["x-merchant-id"] as string;
  const secret = request.headers["x-internal-secret"] as string;

  if (oauthId && safeCompare(secret, process.env.INTERNAL_SECRET || "")) {
    const query: Record<string, unknown> = {
      oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
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
      request.merchant = merchant;
      return;
    }
    return reply.code(401).send({ error: "Merchant not found" });
  }

  return reply.code(401).send({ error: "Unauthorized" });
};
