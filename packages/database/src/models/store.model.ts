import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🏬 STORE MODEL
// Sub-entities under a Merchant. Each store has its own branding,
// webhook config, and API key scoping.
// ============================================================

export interface IStore extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Public-facing store ID e.g. 'str_abc123' */
  storeId: string;
  /** Human-readable store name */
  name: string;
  /** Optional store description */
  description?: string;
  /** Store-specific logo */
  logoUrl?: string;
  /** Store-specific return URL */
  returnUrl?: string;
  /** Store-specific webhook URL */
  webhookUrl?: string;
  /** Store-specific webhook secret */
  webhookSecret?: string;
  /** Store-specific enabled currencies (falls back to merchant if empty) */
  enabledCurrencies: string[];
  /** Whether this store is active */
  isActive: boolean;
  /** Soft delete */
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StoreSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    storeId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true },
    description: { type: String },
    logoUrl: { type: String },
    returnUrl: { type: String },
    webhookUrl: { type: String },
    webhookSecret: { type: String },
    enabledCurrencies: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { strict: true, timestamps: true },
);

StoreSchema.index({ merchantId: 1, isActive: 1, isDeleted: 1 });
StoreSchema.index({ merchantId: 1, name: 1 });

export const Store = mongoose.model<IStore>("Store", StoreSchema);
