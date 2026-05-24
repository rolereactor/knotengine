import { FastifyReply, FastifyRequest } from "fastify";
import { Merchant, WebhookEndpoint, User } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { AuditLogger } from "../../core/audit-logger.js";
import { escapeRegExp } from "../../middleware/auth.middleware.js";
import { getPlanLimits, checkPlanLimit } from "@qodinger/knot-types";
import { safeCompare } from "../../utils/crypto.js";

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
      endpoints: endpoints.map((e: any) => ({
        id: e._id.toString(),
        endpointId: e.endpointId,
        url: e.url,
        description: e.description,
        events: e.events,
        eventMode: e.eventMode,
        isActive: e.isActive,
        lastSuccessAt: e.lastSuccessAt,
        lastFailureAt: e.lastFailureAt,
        consecutiveFailures: e.consecutiveFailures,
        disabledAt: e.disabledAt,
        createdAt: e.createdAt,
      })),
      limits: getPlanLimits(merchant.plan),
    };
  },

  createEndpoint: async (
    request: FastifyRequest<{
      Body: {
        url: string;
        description?: string;
        events?: string[];
        eventMode?: "all" | "filtered";
      };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;
    const { url, description, events, eventMode } = (request as any).body;

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
      return reply.code(403).send({
        error: `Webhook endpoint limit reached for ${merchant.plan} plan (${limits.maxWebhookEndpoints} max). Upgrade to add more.`,
        code: "LIMIT_EXCEEDED",
        limit: limits.maxWebhookEndpoints,
        current: currentCount,
      });
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
      request as any,
      {
        merchantId: merchant.merchantId,
        action: "endpoint_created",
        endpointId,
        url,
      },
    );

    return {
      success: true,
      message: "Webhook endpoint created successfully",
      endpoint: {
        id: endpoint._id.toString(),
        endpointId: endpoint.endpointId,
        url: endpoint.url,
        secret,
        description: endpoint.description,
        events: endpoint.events,
        eventMode: endpoint.eventMode,
      },
      warning:
        "Store this webhook secret securely. It will not be shown again.",
    };
  },

  updateEndpoint: async (
    request: FastifyRequest<{
      Params: { merchantId: string; endpointId: string };
      Body: {
        url?: string;
        description?: string;
        events?: string[];
        eventMode?: "all" | "filtered";
      };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant } = ctx;
    const { url, description, events, eventMode } = (request as any).body;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return reply.code(404).send({ error: "Webhook endpoint not found" });
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

  deleteEndpoint: async (
    request: FastifyRequest<{
      Params: { merchantId: string; endpointId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant, user } = ctx;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return reply.code(404).send({ error: "Webhook endpoint not found" });
    }

    await WebhookEndpoint.deleteOne({ _id: endpoint._id });

    await AuditLogger.settings(
      user._id.toString(),
      "webhook_updated",
      request as any,
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

  testEndpoint: async (
    request: FastifyRequest<{
      Params: { merchantId: string; endpointId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return reply.code(404).send({ error: "Webhook endpoint not found" });
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

        return reply.code(400).send({
          error: `Endpoint returned ${response.status}`,
          statusCode: response.status,
        });
      }
    } catch (error) {
      await WebhookEndpoint.findByIdAndUpdate(endpoint._id, {
        $set: {
          lastFailureAt: new Date(),
          consecutiveFailures: endpoint.consecutiveFailures + 1,
        },
      });

      return reply.code(400).send({
        error: `Failed to send test webhook: ${(error as Error).message}`,
      });
    }
  },

  getEndpointSecret: async (
    request: FastifyRequest<{
      Params: { merchantId: string; endpointId: string };
    }>,
    reply: FastifyReply,
  ) => {
    const ctx = await resolveAuth(request as any, reply);
    if (!ctx) return;

    const { merchant } = ctx;

    const endpoint = await WebhookEndpoint.findOne({
      _id: request.params.endpointId,
      merchantId: merchant._id,
    });

    if (!endpoint) {
      return reply.code(404).send({ error: "Webhook endpoint not found" });
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
