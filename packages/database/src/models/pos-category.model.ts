import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 📂 POS CATEGORY MODEL
// Categories for organizing products in the Point-of-Sale system.
// ============================================================

export interface IPosCategory extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Human-readable category identifier (e.g. cat_abc123) */
  categoryId: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** Display order (lower = appears first) */
  sortOrder: number;
  /** Whether this category is active and visible */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PosCategorySchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    categoryId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

PosCategorySchema.index({ merchantId: 1, isActive: 1 });
PosCategorySchema.index({ merchantId: 1, sortOrder: 1 });

export const PosCategory = mongoose.model<IPosCategory>(
  "PosCategory",
  PosCategorySchema,
);
