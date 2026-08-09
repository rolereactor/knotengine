import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🏪 MERCHANT MODEL
// Holds merchant settings, public derivation keys, and API auth.
// ============================================================

export interface IMerchant extends Document {
  /** Public-facing ID e.g. 'mid_abc123' */
  merchantId: string;
  userId?: mongoose.Types.ObjectId;
  name: string;
  apiKeyHash?: string;
  /** OAuth identity string e.g. 'google:1234567890' */
  oauthId?: string;
  email?: string;
  btcXpub?: string;
  btcXpubTestnet?: string;
  ethAddress?: string;
  ethAddressTestnet?: string;
  ethXpub?: string;
  ethXpubTestnet?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  logoUrl?: string;
  returnUrl?: string;
  theme: "light" | "dark" | "system";
  brandColor?: string;
  brandingEnabled: boolean;
  /** Hide "Powered by KnotEngine" footer (Pro/Enterprise only) */
  removeBranding: boolean;
  /** Checkout header alignment */
  brandingAlignment?: "left" | "center";
  /** White Label Settings */
  whiteLabelEnabled: boolean;
  customCss?: string;
  customDomain?: string;
  customDomainVerified: boolean;
  checkoutLayout: "default" | "minimal" | "full";
  invoiceFooterHtml?: string;
  hideNetworkInfo: boolean;
  hideQrCode: boolean;
  redirectAfterPayment?: string;
  customReceiptMessage?: string;
  enabledCurrencies: string[];
  /** Current derivation index for unique address generation */
  derivationIndex: number;
  /** Required confirmations per currency */
  confirmationPolicy: {
    BTC: number;
    LTC: number;
    ETH: number;
  };
  feesAccrued: {
    usd: number;
    BTC: number;
    LTC: number;
    ETH: number;
    USDT_ERC20: number;
    USDT_POLYGON: number;
  };
  /** Payment Configuration */
  feeResponsibility: "merchant" | "client";
  invoiceExpirationMinutes: number;
  underpaymentTolerancePercentage: number;
  bip21Enabled: boolean;
  plan: "starter" | "professional" | "enterprise";
  planStartedAt?: Date;
  /** Track prorated billing for mid-month activations */
  lastProratedAmount?: number;
  lastProratedDate?: Date;
  /** Grace period for insufficient balance */
  gracePeriodStarted?: Date;
  gracePeriodEnds?: Date;
  /** IP Allowlisting for API access */
  allowedIpAddresses?: string[];
  ipAllowlistEnabled: boolean;
  /** Email Notification Preferences */
  emailNotifications: {
    paymentReceived: boolean;
    paymentConfirmed: boolean;
    paymentOverpaid: boolean;
    paymentExpired: boolean;
    subscriptionCharged: boolean;
    lowBalance: boolean;
    securityAlerts: boolean;
  };
  isActive: boolean;
  /** Suspension tracking */
  suspendedAt?: Date;
  suspendedReason?:
    | "payment_failed"
    | "policy_violation"
    | "fraud"
    | "manual"
    | "other";
  suspendedBy?: mongoose.Types.ObjectId;
  /** Soft delete for compliance */
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema: Schema = new Schema(
  {
    merchantId: { type: String, unique: true, sparse: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, default: "" },
    apiKeyHash: { type: String, sparse: true, unique: true },
    oauthId: { type: String, sparse: true },
    email: { type: String, sparse: true },
    btcXpub: { type: String },
    btcXpubTestnet: { type: String },
    ethAddress: { type: String },
    ethAddressTestnet: { type: String },
    ethXpub: { type: String },
    ethXpubTestnet: { type: String },
    webhookUrl: { type: String },
    webhookSecret: { type: String },
    logoUrl: { type: String },
    returnUrl: { type: String },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    brandColor: { type: String, default: "#ffffff" },
    brandingEnabled: { type: Boolean, default: true },
    removeBranding: { type: Boolean, default: false },
    brandingAlignment: {
      type: String,
      enum: ["left", "center"],
      default: "left",
    },
    /** White Label Settings */
    whiteLabelEnabled: { type: Boolean, default: false },
    customCss: { type: String },
    customDomain: { type: String },
    customDomainVerified: { type: Boolean, default: false },
    checkoutLayout: {
      type: String,
      enum: ["default", "minimal", "full"],
      default: "default",
    },
    invoiceFooterHtml: { type: String },
    hideNetworkInfo: { type: Boolean, default: false },
    hideQrCode: { type: Boolean, default: false },
    redirectAfterPayment: { type: String },
    customReceiptMessage: { type: String },
    enabledCurrencies: { type: [String], default: [] },
    webhookEvents: {
      type: [String],
      default: [
        "invoice.confirmed",
        "invoice.mempool_detected",
        "invoice.partially_paid",
        "invoice.overpaid",
        "invoice.expired",
        "invoice.failed",
      ],
    },
    derivationIndex: { type: Number, default: 0 },
    confirmationPolicy: {
      type: {
        BTC: { type: Number, default: 2 },
        LTC: { type: Number, default: 6 },
        ETH: { type: Number, default: 12 },
      },
      default: { BTC: 2, LTC: 6, ETH: 12 },
    },
    feesAccrued: {
      usd: { type: Number, default: 0 },
      BTC: { type: Number, default: 0 },
      LTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      USDT_ERC20: { type: Number, default: 0 },
      USDT_POLYGON: { type: Number, default: 0 },
    },
    feeResponsibility: {
      type: String,
      enum: ["merchant", "client"],
      default: "merchant",
    },
    invoiceExpirationMinutes: { type: Number, default: 30 },
    underpaymentTolerancePercentage: { type: Number, default: 1 },
    bip21Enabled: { type: Boolean, default: true },
    plan: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
      default: "starter",
    },
    planStartedAt: { type: Date, default: Date.now },
    lastProratedAmount: { type: Number },
    lastProratedDate: { type: Date },
    gracePeriodStarted: { type: Date },
    gracePeriodEnds: { type: Date },
    /** IP Allowlisting for API access */
    allowedIpAddresses: { type: [String], default: [] },
    ipAllowlistEnabled: { type: Boolean, default: false },
    /** Email Notification Preferences */
    emailNotifications: {
      type: {
        paymentReceived: { type: Boolean, default: true },
        paymentConfirmed: { type: Boolean, default: true },
        paymentOverpaid: { type: Boolean, default: true },
        paymentExpired: { type: Boolean, default: true },
        subscriptionCharged: { type: Boolean, default: true },
        lowBalance: { type: Boolean, default: true },
        securityAlerts: { type: Boolean, default: true },
      },
      default: {
        paymentReceived: true,
        paymentConfirmed: true,
        paymentOverpaid: true,
        paymentExpired: true,
        subscriptionCharged: true,
        lowBalance: true,
        securityAlerts: true,
      },
    },
    isActive: { type: Boolean, default: true },
    suspendedAt: { type: Date },
    suspendedReason: {
      type: String,
      enum: ["payment_failed", "policy_violation", "fraud", "manual", "other"],
    },
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// apiKeyHash index is auto-created by unique: true

export const Merchant = mongoose.model<IMerchant>("Merchant", MerchantSchema);
