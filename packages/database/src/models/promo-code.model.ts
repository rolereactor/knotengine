import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🎟️ PROMO CODE MODEL
// Stores redeemable codes for credit balance.
// ============================================================

export interface IPromoCode extends Document {
  code: string;
  amountUsd: number;
  /** Maximum number of times this code can be used globally */
  maxUses: number;
  /** Current number of times it has been used */
  uses: number;
  /** Users who have already claimed this code */
  claimedBy: mongoose.Types.ObjectId[];
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema: Schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    amountUsd: { type: Number, required: true },
    maxUses: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },
    claimedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { strict: true, timestamps: true },
);

// Auto-expire codes if expiresAt is set
PromoCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PromoCode = mongoose.model<IPromoCode>(
  "PromoCode",
  PromoCodeSchema,
);
