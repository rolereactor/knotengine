import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 💳 POS REGISTER MODEL
// Physical or virtual registers (terminals) used for checkout.
// ============================================================

export interface IPosRegister extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Human-readable register identifier (e.g. reg_abc123) */
  registerId: string;
  /** Display name for this register */
  name: string;
  /** Optional physical location description */
  location?: string;
  /** Whether this register is active and accepting transactions */
  isActive: boolean;
  /** Optional session identifier for the current shift */
  currentSessionId?: string;
  /** Total number of transactions processed */
  totalTransactions: number;
  /** Total USD volume processed */
  totalVolumeUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

const PosRegisterSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    registerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    location: { type: String },
    isActive: { type: Boolean, default: true },
    currentSessionId: { type: String },
    totalTransactions: { type: Number, default: 0 },
    totalVolumeUsd: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PosRegisterSchema.index({ merchantId: 1, isActive: 1 });

export const PosRegister = mongoose.model<IPosRegister>(
  "PosRegister",
  PosRegisterSchema,
);
