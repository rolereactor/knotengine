import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 💝 DONATION MODEL
// Public donation pages with goal tracking, messages, and streaming alerts.
// ============================================================

export interface IDonation extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Human-readable donation page identifier (e.g. don_abc123) */
  donationId: string;
  /** Custom or auto-generated URL slug */
  slug: string;
  /** Display title for the donation page */
  title: string;
  /** Optional description shown to donors */
  description?: string;
  /** Fundraising goal in USD (null = no goal) */
  goalAmount?: number;
  /** Current amount raised in USD */
  currentAmount: number;
  /** Number of donations received */
  donorCount: number;
  /** Preset donation amounts in USD */
  suggestedAmounts: number[];
  /** Whether to allow custom donation amounts */
  allowCustomAmount: boolean;
  /** Whether to display the progress bar publicly */
  showProgress: boolean;
  /** Thank you message shown after donation */
  thankYouMessage?: string;
  /** URL to redirect after successful donation */
  redirectUrl?: string;
  /** Whether the donation page is active */
  isActive: boolean;
  /** Maximum donations (null = unlimited) */
  maxDonations?: number;
  /** Page expiration time (null = never) */
  expiresAt?: Date;
  // Streaming features
  /** Whether to accept donation messages */
  allowMessages: boolean;
  /** Maximum message length (0 = unlimited) */
  maxMessageLength: number;
  /** Whether to show messages on donation page */
  showMessages: boolean;
  /** Whether to enable OBS alerts */
  alertsEnabled: boolean;
  /** Alert sound URL (null = default sound) */
  alertSoundUrl?: string;
  /** Alert color (hex) */
  alertColor: string;
  /** Alert duration in seconds */
  alertDuration: number;
  /** Whether to show donor name publicly */
  showDonorName: boolean;
  /** Minimum donation for alert (0 = always alert) */
  alertMinimumAmount: number;
  /** Top donors leaderboard enabled */
  leaderboardEnabled: boolean;
  /** Number of top donors to show */
  leaderboardSize: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDonationMessage extends Document {
  donationId: mongoose.Types.ObjectId;
  /** Unique message identifier (e.g. msg_abc123) */
  messageId: string;
  /** Donor name (optional, "Anonymous" if not provided) */
  donorName: string;
  /** Donation amount in USD */
  amountUsd: number;
  /** Crypto currency used */
  cryptoCurrency: string;
  /** Donation message */
  message: string;
  /** Whether this message has been read/shown on stream */
  read: boolean;
  /** Whether to show on leaderboard */
  showOnLeaderboard: boolean;
  createdAt: Date;
}

const DonationSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    donationId: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    goalAmount: { type: Number, min: 0 },
    currentAmount: { type: Number, default: 0, min: 0 },
    donorCount: { type: Number, default: 0, min: 0 },
    suggestedAmounts: { type: [Number], default: [5, 10, 25, 50, 100] },
    allowCustomAmount: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    thankYouMessage: { type: String },
    redirectUrl: { type: String },
    isActive: { type: Boolean, default: true },
    maxDonations: { type: Number },
    expiresAt: { type: Date },
    // Streaming features
    allowMessages: { type: Boolean, default: true },
    maxMessageLength: { type: Number, default: 500 },
    showMessages: { type: Boolean, default: true },
    alertsEnabled: { type: Boolean, default: true },
    alertSoundUrl: { type: String },
    alertColor: { type: String, default: "#10b981" },
    alertDuration: { type: Number, default: 5 },
    showDonorName: { type: Boolean, default: true },
    alertMinimumAmount: { type: Number, default: 0 },
    leaderboardEnabled: { type: Boolean, default: true },
    leaderboardSize: { type: Number, default: 10 },
  },
  { timestamps: true },
);

DonationSchema.index({ slug: 1, isActive: 1 });

const DonationMessageSchema: Schema = new Schema(
  {
    donationId: {
      type: Schema.Types.ObjectId,
      ref: "Donation",
      required: true,
    },
    messageId: { type: String, required: true, unique: true },
    donorName: { type: String, default: "Anonymous" },
    amountUsd: { type: Number, required: true },
    cryptoCurrency: { type: String, required: true },
    message: { type: String, default: "" },
    read: { type: Boolean, default: false },
    showOnLeaderboard: { type: Boolean, default: true },
  },
  { timestamps: true },
);

DonationMessageSchema.index({ donationId: 1, createdAt: -1 });
DonationMessageSchema.index({ donationId: 1, amountUsd: -1 });

export const Donation = mongoose.model<IDonation>("Donation", DonationSchema);

export const DonationMessage = mongoose.model<IDonationMessage>(
  "DonationMessage",
  DonationMessageSchema,
);
