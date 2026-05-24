import { FastifyRequest, FastifyReply } from "fastify";
import { MerchantMember } from "@qodinger/knot-database";
import { escapeRegExp } from "./auth.middleware.js";
import { safeCompare } from "../utils/crypto.js";

export type AuthType = "api_key" | "oauth";

declare module "fastify" {
  interface FastifyRequest {
    authType?: AuthType;
    membership?: any;
  }
}

export const requireMerchantAccess = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const targetMerchantId = (request.params as Record<string, string>)
    .merchantId;
  if (!targetMerchantId) {
    return reply.code(400).send({ error: "Merchant ID required" });
  }

  if (request.authType === "api_key") {
    const requestMerchant = (request as any).merchant;
    if (!requestMerchant) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    if (
      requestMerchant.merchantId !== targetMerchantId &&
      requestMerchant._id.toString() !== targetMerchantId
    ) {
      return reply.code(403).send({
        error: "API key does not match requested merchant",
        code: "MERCHANT_MISMATCH",
      });
    }
    return;
  }

  const oauthId = request.headers["x-oauth-id"] as string;
  const internalSecret = request.headers["x-internal-secret"] as string;

  if (
    !oauthId ||
    !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
  ) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const User = (await import("@qodinger/knot-database")).User;
  const Merchant = (await import("@qodinger/knot-database")).Merchant;

  const user = await User.findOne({
    oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
  });

  if (!user) {
    return reply.code(404).send({ error: "User not found" });
  }

  const merchant = await Merchant.findOne({ merchantId: targetMerchantId });
  if (!merchant) {
    return reply.code(404).send({ error: "Merchant not found" });
  }

  if (!merchant.isActive || merchant.isDeleted) {
    return reply.code(403).send({
      error: "Merchant account suspended",
      code: "MERCHANT_SUSPENDED",
    });
  }

  const membership = await MerchantMember.findOne({
    merchantId: merchant._id,
    userId: user._id,
    accepted: true,
  });

  if (!membership) {
    return reply.code(403).send({
      error: "Access denied to this merchant",
      code: "ACCESS_DENIED",
    });
  }

  request.membership = membership;
};
