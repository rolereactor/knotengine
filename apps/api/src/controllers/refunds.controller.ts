import * as crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { Invoice, Refund } from "@qodinger/knot-database";
import { apiError } from "../utils/api-error.js";
import { RedisClient } from "../infra/redis-client.js";
import { childLogger } from "../infra/logger.js";

export const RefundsController = {
  createRefund: async (request: any, reply: FastifyReply) => {
    try {
      const merchant = request.merchant;
      if (!merchant)
        return apiError(
          reply,
          401,
          "unauthorized",
          "Authentication required. Provide a valid API key.",
        );

      const { invoice_id, amount_usd, reason, refund_address } = request.body;

      // Idempotency: if client sends Idempotency-Key, return cached response on replay
      const idempotencyKey = request.headers["idempotency-key"] as
        | string
        | undefined;
      if (idempotencyKey) {
        const cacheKey = `idempotency:refund:${merchant._id}:${idempotencyKey}`;
        const cached = await RedisClient.get<object>(cacheKey);
        if (cached) {
          return reply
            .code(200)
            .header("Idempotent-Replayed", "true")
            .send(cached);
        }
      }

      // Find the invoice
      const invoice = await Invoice.findOne({
        invoiceId: invoice_id,
        merchantId: merchant._id,
      });

      if (!invoice) {
        return apiError(
          reply,
          404,
          "invoice_not_found",
          `No invoice found with ID '${invoice_id}'.`,
          "invoice_id",
        );
      }

      // Validate invoice is in a refundable state
      if (invoice.status !== "confirmed" && invoice.status !== "overpaid") {
        return apiError(
          reply,
          400,
          "refund_not_allowed",
          `Invoice with status '${invoice.status}' cannot be refunded. Only 'confirmed' or 'overpaid' invoices can be refunded.`,
          "invoice_id",
        );
      }

      // Validate refund amount does not exceed the original payment
      if (amount_usd > invoice.amountUsd) {
        return apiError(
          reply,
          400,
          "refund_exceeds_amount",
          `Refund amount ($${amount_usd}) exceeds the original invoice amount ($${invoice.amountUsd}).`,
          "amount_usd",
        );
      }

      // Check for existing pending refunds on this invoice
      const existingPendingRefund = await Refund.findOne({
        invoiceId: invoice.invoiceId,
        merchantId: merchant._id,
        status: { $in: ["pending", "processing"] },
      });

      if (existingPendingRefund) {
        return apiError(
          reply,
          409,
          "refund_already_pending",
          `A pending refund already exists for this invoice (${existingPendingRefund.refundId}). Cancel it before creating a new one.`,
          "invoice_id",
        );
      }

      // Generate refund ID
      const refundId = `ref_${crypto.randomBytes(12).toString("hex")}`;

      // Create the refund
      const refund = await Refund.create({
        refundId,
        invoiceId: invoice.invoiceId,
        merchantId: merchant._id,
        amountUsd: amount_usd,
        cryptoCurrency: invoice.cryptoCurrency,
        reason,
        refundAddress: refund_address,
        status: "pending",
      });

      // Emit webhook for refund.created
      try {
        const { WebhookDispatcher } =
          await import("../infra/webhook-dispatcher.js");
        WebhookDispatcher.dispatchRefund(
          refundId,
          "refund.created",
          merchant._id.toString(),
        );
      } catch {
        // Non-critical: webhook dispatch failure should not block refund creation
      }

      childLogger("refunds").info(
        `💸 Refund created: ${refundId} for invoice ${invoice_id} ($${amount_usd})`,
      );

      const responseBody = {
        object: "refund",
        refund_id: refund.refundId,
        invoice_id: refund.invoiceId,
        amount_usd: refund.amountUsd,
        crypto_currency: refund.cryptoCurrency,
        status: refund.status,
        reason: refund.reason,
        refund_address: refund.refundAddress || null,
        created_at: refund.createdAt.toISOString(),
      };

      // Cache the response for idempotency replay (24-hour TTL)
      if (idempotencyKey) {
        const cacheKey = `idempotency:refund:${merchant._id}:${idempotencyKey}`;
        RedisClient.set(cacheKey, responseBody, 86400).catch(() => {});
      }

      return reply.code(201).send(responseBody);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      childLogger("refunds").error(`Refund creation error: ${message}`);
      return apiError(
        reply,
        500,
        "internal_error",
        "An unexpected error occurred while creating the refund. Please try again.",
      );
    }
  },

  listRefunds: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;

    if (!merchant) {
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );
    }

    const { status, invoice_id, page = "1", limit = "20" } = request.query;

    const filter: Record<string, unknown> = { merchantId: merchant._id };
    if (status) {
      filter.status = status;
    }
    if (invoice_id) {
      filter.invoiceId = invoice_id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Refund.countDocuments(filter),
    ]);

    return {
      object: "list",
      data: refunds.map((r) => ({
        object: "refund",
        refund_id: r.refundId,
        invoice_id: r.invoiceId,
        amount_usd: r.amountUsd,
        crypto_currency: r.cryptoCurrency,
        crypto_amount: r.cryptoAmount ?? null,
        status: r.status,
        reason: r.reason,
        tx_hash: r.txHash ?? null,
        refund_address: r.refundAddress ?? null,
        failure_reason: r.failureReason ?? null,
        processed_at: r.processedAt?.toISOString() ?? null,
        created_at: r.createdAt.toISOString(),
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  },

  getRefund: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const merchant = (request as any).merchant;
    if (!merchant)
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );

    const { id } = request.params;

    const refund = await Refund.findOne({
      refundId: id,
      merchantId: merchant._id,
    });

    if (!refund) {
      return apiError(
        reply,
        404,
        "refund_not_found",
        `No refund found with ID '${id}'.`,
        "id",
      );
    }

    return {
      object: "refund",
      refund_id: refund.refundId,
      invoice_id: refund.invoiceId,
      amount_usd: refund.amountUsd,
      crypto_currency: refund.cryptoCurrency,
      crypto_amount: refund.cryptoAmount ?? null,
      status: refund.status,
      reason: refund.reason,
      tx_hash: refund.txHash ?? null,
      refund_address: refund.refundAddress ?? null,
      failure_reason: refund.failureReason ?? null,
      processed_at: refund.processedAt?.toISOString() ?? null,
      created_at: refund.createdAt.toISOString(),
    };
  },

  cancelRefund: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const merchant = (request as any).merchant;
    if (!merchant)
      return apiError(
        reply,
        401,
        "unauthorized",
        "Authentication required. Provide a valid API key.",
      );

    const { id } = request.params;

    const refund = await Refund.findOne({
      refundId: id,
      merchantId: merchant._id,
    });

    if (!refund) {
      return apiError(
        reply,
        404,
        "refund_not_found",
        `No refund found with ID '${id}'.`,
        "id",
      );
    }

    if (refund.status !== "pending") {
      return apiError(
        reply,
        409,
        "refund_not_cancellable",
        `Cannot cancel refund with status '${refund.status}'. Only 'pending' refunds can be cancelled.`,
        "id",
      );
    }

    await Refund.findByIdAndUpdate(refund._id, {
      $set: { status: "failed", failureReason: "Cancelled by merchant" },
    });

    childLogger("refunds").info(`🚫 Refund cancelled: ${id}`);

    return {
      object: "refund",
      refund_id: refund.refundId,
      invoice_id: refund.invoiceId,
      status: "failed",
      cancelled: true,
      created_at: refund.createdAt.toISOString(),
    };
  },
};
