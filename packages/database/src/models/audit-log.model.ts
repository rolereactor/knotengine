import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 📋 AUDIT LOG MODEL
// Tracks all account changes and security events for compliance.
// ============================================================

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  /** Merchant this event relates to (optional for user-level events) */
  merchantId?: mongoose.Types.ObjectId;
  action: string;
  category: "auth" | "account" | "security" | "billing" | "settings";
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      index: true,
    },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ["auth", "account", "security", "billing", "settings"],
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { strict: true, timestamps: true },
);

// Indexes for efficient querying
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ merchantId: 1, createdAt: -1 });
AuditLogSchema.index({ category: 1, createdAt: -1 });
AuditLogSchema.index({ userId: 1, merchantId: 1, createdAt: -1 });
// 90-day Retention: MongoDB will auto-delete audit logs older than 90 days
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
