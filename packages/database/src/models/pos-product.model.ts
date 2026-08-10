import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🛍️ POS PRODUCT MODEL
// Products available in the Point-of-Sale system.
// ============================================================

export interface IPosProduct extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Store this product belongs to */
  storeId?: mongoose.Types.ObjectId;
  /** Human-readable product identifier (e.g. prod_abc123) */
  productId: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Price in USD (cents to avoid floating-point issues) */
  priceUsd: number;
  /** Reference to the product's category */
  categoryId?: mongoose.Types.ObjectId;
  /** URL to product image */
  imageUrl?: string;
  /** Whether this product is active and available for sale */
  isActive: boolean;
  /** Optional SKU or barcode */
  sku?: string;
  /** Optional display order within category */
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PosProductSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
    },
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    priceUsd: { type: Number, required: true, min: 0 },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "PosCategory",
    },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    sku: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { strict: true, timestamps: true },
);

PosProductSchema.index({ merchantId: 1, isActive: 1 });
PosProductSchema.index({ merchantId: 1, storeId: 1, isActive: 1 });
PosProductSchema.index({ merchantId: 1, categoryId: 1 });
PosProductSchema.index({ merchantId: 1, sortOrder: 1 });

export const PosProduct = mongoose.model<IPosProduct>(
  "PosProduct",
  PosProductSchema,
);
