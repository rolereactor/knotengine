import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 📡 WEBHOOK EVENT MODEL
// Audit trail for all incoming blockchain events.
// ============================================================

export interface IWebhookEvent extends Document {
  /** Source provider: 'alchemy' | 'tatum' | 'manual' */
  source: string;
  /** Raw event type from provider */
  eventType: string;
  /** The address that received the transaction */
  toAddress: string;
  /** Transaction hash */
  txHash: string;
  /** Amount in the native/token unit */
  amount: string;
  /** Asset symbol (ETH, BTC, USDT, etc.) */
  asset: string;
  /** Block number (-1 for mempool/pending) */
  blockNumber: number;
  /** Number of confirmations at time of event */
  confirmations: number;
  /** Whether this event was processed */
  processed: boolean;
  /** Linked Invoice ID (if matched) */
  invoiceId?: mongoose.Types.ObjectId;
  /** Full raw payload from provider */
  rawPayload: Record<string, unknown>;
  createdAt: Date;
}

const WebhookEventSchema: Schema = new Schema(
  {
    source: { type: String, required: true },
    eventType: { type: String, required: true },
    toAddress: { type: String, required: true },
    txHash: { type: String, required: true },
    amount: { type: String, required: true },
    asset: { type: String, required: true },
    blockNumber: { type: Number, default: -1 },
    confirmations: { type: Number, default: 0 },
    processed: { type: Boolean, default: false },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    rawPayload: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

WebhookEventSchema.index({ toAddress: 1 });
WebhookEventSchema.index({ txHash: 1 });
WebhookEventSchema.index({ processed: 1 });
// Composite index for idempotency check: prevents replay of same (txHash, invoiceId, asset)
WebhookEventSchema.index(
  { txHash: 1, invoiceId: 1, asset: 1 },
  { unique: true },
);
// 30-day Retention: MongoDB will auto-delete events older than 30 days
WebhookEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 },
);

export const WebhookEvent = mongoose.model<IWebhookEvent>(
  "WebhookEvent",
  WebhookEventSchema,
);
