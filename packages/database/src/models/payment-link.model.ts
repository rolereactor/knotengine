import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🔗 PAYMENT LINK MODEL
// Reusable, shareable payment links that create invoices on-the-fly.
// ============================================================

export interface IPaymentLink extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Human-readable link identifier (e.g. link_abc123) */
  linkId: string;
  /** Custom or auto-generated URL slug */
  slug: string;
  /** Display title for the payment link */
  title: string;
  /** Optional description shown to payers */
  description?: string;
  /** Fixed amount in USD (null = customer chooses amount) */
  amount?: number;
  /** Restrict to a single currency (null = all enabled currencies) */
  currency?: string;
  /** Whether the link is active and accepting payments */
  isActive: boolean;
  /** Number of times this link has been used */
  usageCount: number;
  /** Total USD volume processed through this link */
  totalAmountUsd: number;
  /** Maximum number of uses (null = unlimited) */
  maxUses?: number;
  /** Link expiration time (null = never) */
  expiresAt?: Date;
  /** URL to redirect after successful payment */
  redirectUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    linkId: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, min: 0 },
    currency: { type: String },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    totalAmountUsd: { type: Number, default: 0 },
    maxUses: { type: Number },
    expiresAt: { type: Date },
    redirectUrl: { type: String },
  },
  { strict: true, timestamps: true },
);

PaymentLinkSchema.index({ merchantId: 1, isActive: 1 });

export const PaymentLink = mongoose.model<IPaymentLink>(
  "PaymentLink",
  PaymentLinkSchema,
);
