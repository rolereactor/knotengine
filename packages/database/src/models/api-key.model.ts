import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🔑 API KEY MODEL
// Multiple API keys per merchant with labels, scopes, and usage tracking.
// ============================================================

export type ApiKeyScope = "full_access" | "read_only" | "invoices" | "webhooks";

export interface IApiKey extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Public-facing key ID e.g. 'key_abc123' */
  keyId: string;
  /** Hashed version of the actual secret key */
  keyHash: string;
  /** Human-readable label for identification */
  label: string;
  /** Access scope */
  scope: ApiKeyScope;
  /** Last 4 characters of the actual key for display */
  lastFour: string;
  /** When the key was last used */
  lastUsedAt?: Date;
  /** IP that last used this key */
  lastUsedIp?: string;
  /** Total requests made with this key */
  requestCount: number;
  /** Whether the key is active */
  isActive: boolean;
  /** When the key was revoked */
  revokedAt?: Date;
  revokedReason?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    keyId: { type: String, unique: true },
    keyHash: { type: String, required: true },
    label: { type: String, required: true },
    scope: {
      type: String,
      enum: ["full_access", "read_only", "invoices", "webhooks"],
      default: "full_access",
    },
    lastFour: { type: String, required: true },
    lastUsedAt: { type: Date },
    lastUsedIp: { type: String },
    requestCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    revokedAt: { type: Date },
    revokedReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const ApiKey = mongoose.model<IApiKey>("ApiKey", ApiKeySchema);
