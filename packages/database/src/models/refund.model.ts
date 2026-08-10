import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 💸 REFUND MODEL
// Tracks refund / pull-payment requests issued against invoices.
// ============================================================

export type RefundStatus = "pending" | "processing" | "completed" | "failed";

export interface IRefund extends Document {
  /** Human-readable refund identifier (e.g. ref_abc123) */
  refundId: string;
  /** The invoice this refund is issued against */
  invoiceId: string;
  /** Merchant who owns the invoice */
  merchantId: mongoose.Types.ObjectId;
  /** Refund amount in USD */
  amountUsd: number;
  /** Crypto currency used for the refund payout */
  cryptoCurrency: string;
  /** Amount in crypto sent to the customer */
  cryptoAmount?: number;
  /** Reason the refund was issued */
  reason: string;
  /** Refund lifecycle status */
  status: RefundStatus;
  /** On-chain transaction hash once the refund is broadcast */
  txHash?: string;
  /** Destination address the refund was sent to */
  refundAddress?: string;
  /** Block number of the refund transaction */
  blockNumber?: number;
  /** Failure reason if the refund failed */
  failureReason?: string;
  /** When the refund was processed / broadcast */
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema: Schema = new Schema(
  {
    refundId: { type: String, required: true, unique: true },
    invoiceId: { type: String, required: true },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    amountUsd: { type: Number, required: true, min: 0 },
    cryptoCurrency: { type: String, required: true },
    cryptoAmount: { type: Number, min: 0 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    txHash: { type: String },
    refundAddress: { type: String },
    blockNumber: { type: Number },
    failureReason: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

RefundSchema.index({ invoiceId: 1, status: 1 });
RefundSchema.index({ merchantId: 1, status: 1 });
RefundSchema.index({ merchantId: 1, createdAt: -1 });
RefundSchema.index({ status: 1, createdAt: 1 });

export const Refund = mongoose.model<IRefund>("Refund", RefundSchema);
