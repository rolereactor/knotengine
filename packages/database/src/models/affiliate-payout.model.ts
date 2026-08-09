import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 💰 AFFILIATE PAYOUT MODEL
// Tracks payout requests from affiliates for their referral earnings.
// ============================================================

export interface IAffiliatePayout extends Document {
  userId: mongoose.Types.ObjectId;
  amountUsd: number;
  method: "crypto" | "usd_balance";
  currency?: string;
  walletAddress?: string;
  status: "pending" | "processing" | "completed" | "failed";
  txHash?: string;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AffiliatePayoutSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amountUsd: { type: Number, required: true, min: 10 },
    method: {
      type: String,
      enum: ["crypto", "usd_balance"],
      required: true,
    },
    currency: { type: String },
    walletAddress: { type: String },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    txHash: { type: String },
    failureReason: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

AffiliatePayoutSchema.index({ userId: 1, status: 1 });

export const AffiliatePayout = mongoose.model<IAffiliatePayout>(
  "AffiliatePayout",
  AffiliatePayoutSchema,
);
