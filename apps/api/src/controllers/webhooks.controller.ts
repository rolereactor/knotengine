import * as crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { ConfirmationEngine } from "../core/confirmation-engine.js";
import { apiError } from "../utils/api-error.js";
import { safeCompare } from "../utils/crypto.js";

// ============================================================
// Provider-specific types
// ============================================================

export interface AlchemyActivity {
  category: string;
  fromAddress: string;
  toAddress: string;
  hash: string;
  blockNum: string;
  value: number;
  asset: string;
  rawContract?: {
    address: string;
    decimals: number;
  };
}

export interface AlchemyWebhookBody {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    network: string;
    activity: AlchemyActivity[];
  };
}

export interface TatumWebhookBody {
  address: string;
  txId: string;
  blockNumber?: number;
  confirmations?: number;
  amount?: number;
  asset?: string;
  currency?: string;
  type?: string;
}

export interface SimulateWebhookBody {
  toAddress: string;
  txHash: string;
  blockNumber?: number;
  confirmations?: number;
  amount?: string;
  asset?: string;
}

export const WebhooksController = {
  alchemyHealthCheck: async () => {
    return { status: "ok", message: "Alchemy Webhook Listener is live!" };
  },

  alchemyWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    request.server.log.info("📡 Incoming Alchemy webhook request...");
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;

    // 1. Verify signature — required in production
    if (!signingKey) {
      if (process.env.NODE_ENV === "production") {
        request.server.log.error(
          "ALCHEMY_WEBHOOK_SIGNING_KEY is not configured",
        );
        return apiError(
          reply,
          503,
          "internal_error",
          "Webhook receiver not configured.",
        );
      }
      request.server.log.warn(
        "⚠️ Alchemy webhook signature verification disabled (no signing key)",
      );
    } else {
      const signature = request.headers["x-alchemy-signature"] as string;
      const rawBody = JSON.stringify(request.body);

      const expectedSig = crypto
        .createHmac("sha256", signingKey)
        .update(rawBody)
        .digest("hex");

      if (!safeCompare(signature, expectedSig)) {
        // Alchemy's "Test" button sends a request with no signature.
        // We allow it to return 200 so the button turns green, but we log a warning.
        if (!signature) {
          request.server.log.info(
            "🧪 Alchemy test ping (no signature) received.",
          );
          return reply.code(200).send({ message: "Test ping received" });
        }

        request.server.log.warn(
          `⚠️ Alchemy signature mismatch. Header: ${signature}`,
        );
        return apiError(reply, 401, "unauthorized", "Invalid signature.");
      }
    }

    const body = request.body as AlchemyWebhookBody;

    // Handle Alchemy "Test Webhook" ping which might be empty or different
    if (
      !body ||
      (!body.event && (body as unknown as Record<string, unknown>).webhookId)
    ) {
      request.server.log.info("🧪 Alchemy test ping received.");
      return reply.code(200).send({ message: "Test received" });
    }

    if (!body?.event?.activity) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Invalid webhook payload.",
      );
    }

    const results = [];

    // 2. Process each activity in the event
    for (const activity of body.event.activity) {
      // We only care about incoming transfers (to our payment addresses)
      if (activity.category === "external" || activity.category === "erc20") {
        try {
          const result = await ConfirmationEngine.processBlockchainEvent({
            toAddress: activity.toAddress?.toLowerCase() || "",
            txHash: activity.hash,
            blockNumber: parseInt(activity.blockNum, 16) || -1,
            confirmations: 0, // Alchemy ADDRESS_ACTIVITY fires at 0-conf
            amount: activity.value?.toString() || "0",
            asset: activity.asset || activity.rawContract?.address || "ETH",
            source: "alchemy",
            rawPayload: activity as unknown as Record<string, unknown>,
          });

          results.push(result);

          if (result.matched) {
            request.server.log.info(
              `✅ Alchemy event matched invoice ${result.invoiceId} → ${result.newStatus}`,
            );
          }
        } catch (err) {
          request.server.log.error(
            `❌ Error processing Alchemy activity: ${err}`,
          );
        }
      }
    }

    return reply.code(200).send({
      processed: results.length,
      matched: results.filter((r) => r.matched).length,
    });
  },

  tatumWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    const signingKey = process.env.TATUM_WEBHOOK_SECRET;

    // 1. Verify signature — required in production
    if (!signingKey) {
      if (process.env.NODE_ENV === "production") {
        request.server.log.error("TATUM_WEBHOOK_SECRET is not configured");
        return apiError(
          reply,
          503,
          "internal_error",
          "Webhook receiver not configured.",
        );
      }
      request.server.log.warn(
        "⚠️ Tatum webhook signature verification disabled (no signing key)",
      );
    } else {
      const signature = request.headers["x-payload-hash"] as string;
      const rawBody = JSON.stringify(request.body);

      if (!signature) {
        request.server.log.warn("⚠️ Tatum webhook missing signature header");
        return apiError(reply, 401, "unauthorized", "Missing signature.");
      }

      const expectedSigBase64 = crypto
        .createHmac("sha512", signingKey)
        .update(rawBody)
        .digest("base64");
      const expectedSigHex = crypto
        .createHmac("sha512", signingKey)
        .update(rawBody)
        .digest("hex");

      if (
        !safeCompare(signature, expectedSigBase64) &&
        !safeCompare(signature, expectedSigHex)
      ) {
        request.server.log.warn("⚠️ Tatum webhook signature mismatch");
        return apiError(reply, 401, "unauthorized", "Invalid signature.");
      }
    }

    const body = request.body as TatumWebhookBody;

    if (!body?.address || !body?.txId) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Invalid Tatum webhook payload.",
      );
    }

    try {
      const result = await ConfirmationEngine.processBlockchainEvent({
        toAddress: body.address.toLowerCase(),
        txHash: body.txId,
        blockNumber: body.blockNumber || -1,
        confirmations: body.confirmations || 0,
        amount: body.amount?.toString() || "0",
        asset: body.asset || body.currency || "BTC",
        source: "tatum",
        rawPayload: body as unknown as Record<string, unknown>,
      });

      if (result.matched) {
        request.server.log.info(
          `✅ Tatum event matched invoice ${result.invoiceId} → ${result.newStatus}`,
        );
      }

      return reply.code(200).send(result);
    } catch (err) {
      request.server.log.error(`❌ Error processing Tatum webhook: ${err}`);
      return apiError(
        reply,
        500,
        "internal_error",
        "Internal processing error.",
      );
    }
  },

  simulateWebhook: async (request: FastifyRequest, reply: FastifyReply) => {
    if (
      process.env.NODE_ENV === "production" &&
      !process.env.ALLOW_SIMULATION
    ) {
      return apiError(
        reply,
        403,
        "forbidden",
        "Webhook simulation is not available in production.",
      );
    }

    const body = request.body as SimulateWebhookBody & { invoiceId?: string };
    let targetAddress = body.toAddress;

    // 1. If invoiceId is provided, look up the payAddress
    if (body.invoiceId && !targetAddress) {
      const { Invoice } = await import("@qodinger/knot-database");
      const invoice = await Invoice.findOne({ invoiceId: body.invoiceId });
      if (!invoice) {
        return apiError(
          reply,
          404,
          "invoice_not_found",
          "No invoice found with that ID.",
        );
      }
      targetAddress = invoice.payAddress;
    }

    if (!targetAddress || !body.txHash) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "toAddress (or invoiceId) and txHash are required.",
        "to_address",
      );
    }

    const result = await ConfirmationEngine.processBlockchainEvent({
      toAddress: targetAddress.toLowerCase(),
      txHash: body.txHash,
      blockNumber: body.blockNumber || -1,
      confirmations: body.confirmations || 0,
      amount: body.amount || "0",
      asset: body.asset || "BTC",
      source: "manual",
      invoiceId: body.invoiceId,
      rawPayload: body as unknown as Record<string, unknown>,
    });

    return reply.code(200).send(result);
  },
};
