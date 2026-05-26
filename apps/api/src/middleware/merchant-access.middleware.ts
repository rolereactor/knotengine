import { FastifyRequest, FastifyReply } from "fastify";
import { MerchantMember } from "@qodinger/knot-database";
import { escapeRegExp } from "./auth.middleware.js";
import { safeCompare } from "../utils/crypto.js";
import { apiError } from "../utils/api-error.js";

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
    return apiError(
      reply,
      400,
      "invalid_request",
      "Merchant ID is required.",
      "merchant_id",
    );
  }

  if (request.authType === "api_key") {
    const requestMerchant = (request as any).merchant;
    if (!requestMerchant) {
      return apiError(reply, 401, "unauthorized", "Authentication required.");
    }

    if (
      requestMerchant.merchantId !== targetMerchantId &&
      requestMerchant._id.toString() !== targetMerchantId
    ) {
      return apiError(
        reply,
        403,
        "forbidden",
        "This API key does not have access to the requested merchant.",
      );
    }
    return;
  }

  const oauthId = request.headers["x-oauth-id"] as string;
  const internalSecret = request.headers["x-internal-secret"] as string;

  if (
    !oauthId ||
    !safeCompare(internalSecret, process.env.INTERNAL_SECRET || "")
  ) {
    return apiError(reply, 401, "unauthorized", "Authentication required.");
  }

  const User = (await import("@qodinger/knot-database")).User;
  const Merchant = (await import("@qodinger/knot-database")).Merchant;

  const user = await User.findOne({
    oauthId: { $regex: new RegExp(`^${escapeRegExp(oauthId)}(:|$)`) },
  });

  if (!user) {
    return apiError(
      reply,
      404,
      "user_not_found",
      "No user found for this identity.",
    );
  }

  const merchant = await Merchant.findOne({ merchantId: targetMerchantId });
  if (!merchant) {
    return apiError(
      reply,
      404,
      "merchant_not_found",
      "No merchant found with that ID.",
    );
  }

  if (!merchant.isActive || merchant.isDeleted) {
    return apiError(
      reply,
      403,
      "merchant_suspended",
      "This merchant account is suspended or deleted.",
    );
  }

  const membership = await MerchantMember.findOne({
    merchantId: merchant._id,
    userId: user._id,
    accepted: true,
  });

  if (!membership) {
    return apiError(
      reply,
      403,
      "forbidden",
      "You do not have access to this merchant.",
    );
  }

  request.membership = membership;
};
