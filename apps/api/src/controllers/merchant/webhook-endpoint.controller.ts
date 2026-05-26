import { FastifyReply } from "fastify";
import {
  Merchant,
  MerchantMember,
  WebhookEndpoint,
  User,
} from "@qodinger/knot-database";
import * as crypto from "crypto";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { getPlanLimits, checkPlanLimit } from "@qodinger/knot-types";
import { safeCompare } from "../../utils/crypto.js";
import { apiError } from "../../utils/api-error.js";
import { RedisClient } from "../../infra/redis-client.js";

const DEFAULT_EVENTS = [
  "invoice.confirmed",
  "invoice.mempool_detected",
  "invoice.partially_paid",
  "invoice.overpaid",
  "invoice.expired",
  "invoice.failed",
];

export const WebhookEndpointController = {
  listEndpoints: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    const endpoints = await WebhookEndpoint.find({
      merchantId: merchant._id,
    }).sort({ createdAt: -1 });

    return {
      object: "list",
      data: endpoints.map((e: any) => ({
        object: "endpoint",
        id: e.endpointId,
        url: e.url,
        description: e.description,
        events: e.events,
        event_mode: e.eventMode,
        is_active: e.isActive,
        last_success_at: e.lastSuccessAt,
        last_failure_at: e.lastFailureAt,
        consecutive_failures: e.consecutiveFailures,
        disabled_at: e.disabledAt,
        created_at: e.createdAt,
      })),
      limits: getPlanLimits(merchant.plan),
    };
  },

  createEndpoint: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const { url, description, events, eventMode } = request.body;

    // Idempotency: a retry with the same key must return the same endpoint secret.
    // Without this, each retry would create a duplicate endpoint with a new secret.
    const idempotencyKey = request.headers["idempotency-key"] as
      | string
      | undefined;
    if (idempotencyKey) {
      const cacheKey = `idempotency:webhook_endpoint:${merchant._id}:${idempotencyKey}`;
      const cached = await RedisClient.get<object>(cacheKey);
      if (cached) {
        return reply
          .code(201)
          .header("Idempotent-Replayed", "true")
          .send(cached);
      }
    }

    const limits = getPlanLimits(merchant.plan);
    const currentCount = await WebhookEndpoint.countDocuments({
      merchantId: merchant._id,
    });

    const limitCheck = checkPlanLimit(
      merchant.plan,
      "maxWebhookEndpoints",
      currentCount,
    );
    if (!limitCheck.allowed) {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        `Webhook endpoint limit reached for the ${merchant.plan} plan (${limits.maxWebhookEndpoints} max). Upgrade to add more.`,
      );
    }

    const secret = `knot_wh_${crypto.randomBytes(24).toString("hex")}`;
    const endpointId = `we_${crypto.randomBytes(8).toString("hex")}`;

    const endpoint = await WebhookEndpoint.create({
      merchantId: merchant._id,
      endpointId,
      url,
      secret,
      description,
      events: events || DEFAULT_EVENTS,
      eventMode: eventMode || "filtered",
      isActive: true,
    });

    await AuditLogger.settings(
      user._id.toString(),
      "webhook_updated",
      request,
      {
        merchantId: merchant.merchantId,
        action: "endpoint_created",
        endpointId,
        url,
      },
    );

    const responseBody = {
      object: "endpoint",
      id: endpoint.endpointId,
      url: endpoint.url,
      secret,
      description: endpoint.description,
      events: endpoint.events,
      event_mode: endpoint.eventMode,
      is_active: endpoint.isActive,
      created_at: endpoint.createdAt,
      warning:
        "Store this webhook secret securely. It will not be shown again.",
    };

    if (idempotencyKey) {
      const cacheKey = `idempotency:webhook_endpoint:${merchant._id}:${idempotencyKey}`;
      RedisClient.set(cacheKey, responseBody, 86400).catch(() => {});
    }

    return reply.code(201).send(responseBody);
  },

  updateEndpoint: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;
    const { url, description, events, eventMode } = request.body;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return apiError(
        reply,
        404,
        "webhook_endpoint_not_found",
        "No webhook endpoint found with that ID.",
      );
    }

    if (url) endpoint.url = url;
    if (description !== undefined) endpoint.description = description;
    if (events) endpoint.events = events;
    if (eventMode) endpoint.eventMode = eventMode;
    await endpoint.save();

    return {
      success: true,
      message: "Webhook endpoint updated successfully",
    };
  },

  deleteEndpoint: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return apiError(
        reply,
        404,
        "webhook_endpoint_not_found",
        "No webhook endpoint found with that ID.",
      );
    }

    await WebhookEndpoint.deleteOne({ _id: endpoint._id });

    await AuditLogger.settings(
      user._id.toString(),
      "webhook_updated",
      request,
      {
        merchantId: merchant.merchantId,
        action: "endpoint_deleted",
        endpointId: endpoint.endpointId,
        url: endpoint.url,
      },
    );

    return {
      success: true,
      message: "Webhook endpoint deleted successfully",
    };
  },

  testEndpoint: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return apiError(
        reply,
        404,
        "webhook_endpoint_not_found",
        "No webhook endpoint found with that ID.",
      );
    }

    const testPayload = {
      id: `test_${crypto.randomBytes(8).toString("hex")}`,
      type: "test.ping",
      created_at: new Date().toISOString(),
      merchant_id: merchant.merchantId,
      data: { message: "This is a test webhook from KnotEngine" },
    };

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KnotEngine-Signature": signPayload(
            JSON.stringify(testPayload),
            endpoint.secret,
          ),
          "X-KnotEngine-Event": "test.ping",
          "User-Agent": "KnotEngine-Webhook/1.0",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
          $set: { lastSuccessAt: new Date(), consecutiveFailures: 0 },
        });

        return {
          success: true,
          message: "Test webhook sent successfully",
          statusCode: response.status,
        };
      } else {
        await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
          $set: {
            lastFailureAt: new Date(),
            consecutiveFailures: endpoint.consecutiveFailures + 1,
          },
        });

        return apiError(
          reply,
          400,
          "invalid_request",
          `Endpoint returned an unsuccessful status code: ${response.status}.`,
        );
      }
    } catch {
      await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
        $set: {
          lastFailureAt: new Date(),
          consecutiveFailures: endpoint.consecutiveFailures + 1,
        },
      });

      return apiError(
        reply,
        400,
        "invalid_request",
        "Failed to deliver the test webhook. Check that the endpoint URL is reachable.",
      );
    }
  },

  getEndpointSecret: async (request: any, reply: FastifyReply) => {
    const ctx = await resolveAuth(request, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return apiError(
        reply,
        404,
        "webhook_endpoint_not_found",
        "No webhook endpoint found with that ID.",
      );
    }

    return {
      secret: endpoint.secret,
      endpointId: endpoint.endpointId,
    };
  },
};

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

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
