import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 👥 MERCHANT MEMBER MODEL
// Links Users to Merchants with role-based access control.
// ============================================================

export type MerchantMemberRole =
  | "owner"
  | "admin"
  | "developer"
  | "viewer"
  | "billing";

export interface IRoleHistoryEntry {
  from: MerchantMemberRole;
  to: MerchantMemberRole;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

export interface IMerchantMember extends Document {
  merchantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: MerchantMemberRole;
  /** Email used for invites (before user accepts) */
  email?: string;
  /** Whether the membership has been accepted */
  accepted: boolean;
  /** Invite token for email-based invitations */
  inviteToken?: string;
  inviteExpiresAt?: Date;
  invitedBy?: mongoose.Types.ObjectId;
  invitedAt: Date;
  acceptedAt?: Date;
  /** Audit trail of role changes */
  roleHistory: IRoleHistoryEntry[];
  /** Optimistic concurrency control version */
  __v: number;
  createdAt: Date;
  updatedAt: Date;
}

const RoleHistorySchema: Schema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
  },
  { _id: false },
);

const MerchantMemberSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    role: {
      type: String,
      enum: ["owner", "admin", "developer", "viewer", "billing"],
      default: "viewer",
    },
    email: { type: String },
    accepted: { type: Boolean, default: false },
    inviteToken: { type: String },
    inviteExpiresAt: { type: Date },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    roleHistory: { type: [RoleHistorySchema], default: [] },
  },
  { strict: true, timestamps: true, versionKey: "__v" },
);

// Indexes
MerchantMemberSchema.index({ merchantId: 1, userId: 1 }, { unique: true });
MerchantMemberSchema.index({ merchantId: 1, role: 1 });

export const MerchantMember = mongoose.model<IMerchantMember>(
  "MerchantMember",
  MerchantMemberSchema,
);
