import { FastifyRequest, FastifyReply } from "fastify";
import { Merchant } from "@qodinger/knot-database";
import * as crypto from "crypto";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const requireAuth = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // API Key auth
  const apiKey = request.headers["x-api-key"] as string;
  if (apiKey) {
    const apiKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const merchant = await Merchant.findOne({ apiKeyHash, isActive: true });
    if (merchant) {
      request.merchant = merchant;
      return;
    }
    return reply.code(401).send({ error: "Invalid API Key" });
  }

  // Internal OAuth proxy auth
  const oauthId = request.headers["x-oauth-id"] as string;
  const merchantId = request.headers["x-merchant-id"] as string;
  const secret = request.headers["x-internal-secret"] as string;

  if (oauthId && secret === process.env.INTERNAL_SECRET) {
    const query: Record<string, unknown> = {
      oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
      isActive: true,
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
