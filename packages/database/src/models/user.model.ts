import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 👤 USER MODEL
// Represents an identity (OAuth user) that can own multiple merchants.
// Holds the shared credit balance and yield earnings.
// ============================================================

export interface IUser extends Document {
  oauthId: string;
  email?: string;
  image?: string;
  /** Email verification status */
  emailVerified: boolean;
  /** Shared prepaid credit balance (USD) across all merchants */
  creditBalance: number;
  /** Total yield accrued by this user's funds */
  yieldAccruedUsd: number;
  lastYieldSyncAt?: Date;
  lastFloatInvestAt?: Date;
  lastFloatAccrueAt?: Date;
  welcomeBonusClaimed: boolean;
  /** TOTP Two-Factor Authentication */
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  /** Referral System */
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  referralEarningsUsd: number;
  /** Default merchant shown on login */
  defaultMerchantId?: string;
  /** Last accessed merchant for quick switching */
  lastActiveMerchantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    oauthId: { type: String, unique: true, required: true },
    email: { type: String, sparse: true },
    image: { type: String },
    emailVerified: { type: Boolean, default: false },
    creditBalance: { type: Number, default: 0 },
    yieldAccruedUsd: { type: Number, default: 0 },
    lastYieldSyncAt: { type: Date },
    lastFloatInvestAt: { type: Date },
    lastFloatAccrueAt: { type: Date },
    welcomeBonusClaimed: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    twoFactorBackupCodes: { type: [String], default: [] },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralEarningsUsd: { type: Number, default: 0 },
    defaultMerchantId: { type: String },
    lastActiveMerchantId: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
