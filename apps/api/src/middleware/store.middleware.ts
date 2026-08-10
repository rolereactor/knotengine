import { FastifyRequest, FastifyReply } from "fastify";
import { Store } from "@qodinger/knot-database";
import { apiError } from "../utils/api-error.js";

declare module "fastify" {
  interface FastifyRequest {
    storeId?: string;
    store?: any;
  }
}

/**
 * Store-scoping middleware.
 * Reads `x-store-id` header (or `storeId` query param) and attaches
 * the resolved Store document to `request.store`.
 *
 * If no store selector is provided, queries default to all stores
 * (merchant-scoped only). If an invalid store is provided, returns 400.
 */
export const requireStore = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const merchant = request.merchant;
  if (!merchant) {
    return apiError(reply, 401, "unauthorized", "Authentication required.");
  }

  const storeIdentifier =
    (request.headers["x-store-id"] as string) ||
    (request.query as Record<string, string>).storeId;

  if (!storeIdentifier) {
    // No store selected — leave storeId unset so queries remain merchant-wide
    return;
  }

  const store = await Store.findOne({
    merchantId: merchant._id,
    $or: [{ storeId: storeIdentifier }, { _id: storeIdentifier }],
    isActive: true,
  });

  if (!store) {
    return apiError(
      reply,
      404,
      "store_not_found",
      "No active store found with that identifier for this merchant.",
    );
  }

  request.storeId = store.storeId;
  request.store = store;
};
