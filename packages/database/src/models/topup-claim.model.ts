import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 💰 TOPUP CLAIM MODEL
// Tracks merchant top-up TX IDs to prevent double-claiming.
// ============================================================

export interface ITopUpClaim extends Document {
  merchantId: mongoose.Types.ObjectId;
  txHash: string;
  currency: string;
  amountCrypto: number;
  amountUsd: number;
  status: "approved" | "rejected" | "pending";
  createdAt: Date;
  updatedAt: Date;
}

const TopUpClaimSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    txHash: { type: String, required: true, unique: true }, // Prevent double-claiming globally
    currency: { type: String, required: true },
    amountCrypto: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    status: {
      type: String,
      enum: ["approved", "rejected", "pending"],
      default: "pending",
    },
  },
  { strict: true, timestamps: true },
);

export const TopUpClaim = mongoose.model<ITopUpClaim>(
  "TopUpClaim",
  TopUpClaimSchema,
);
