import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🧾 INVOICE MODEL
// Tracks individual payment requests and their full lifecycle.
// ============================================================

export type InvoiceStatus =
  | "pending"
  | "mempool_detected"
  | "confirming"
  | "confirmed"
  | "expired"
  | "failed"
  | "partially_paid"
  | "overpaid";

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Human-readable invoice identifier (e.g. inv_abc123) */
  invoiceId: string;
  amountUsd: number;
  /** Optional line items for itemized invoices */
  lineItems?: ILineItem[];
  cryptoAmount: number;
  cryptoAmountReceived: number;
  /** Last received amount for incremental tracking */
  lastReceivedAmount?: number;
  /** Timestamp of last payment received */
  lastReceivedAt?: Date;
  cryptoCurrency: string;
  payAddress: string;
  /** Payment method used for this invoice */
  paymentMethod?: "onchain" | "lightning";
  /** Lightning invoice BOLT11 string */
  lightningPaymentRequest?: string;
  /** Lightning payment hash for tracking settlement */
  lightningPaymentHash?: string;
  /** Lightning payment preimage (proof of payment) */
  lightningPaymentPreimage?: string;
  /** KnotEngine Fee (Platform Fee) */
  feeUsd: number;
  feeCrypto: number;
  derivationIndex: number;
  status: InvoiceStatus;
  /** Number of block confirmations received */
  confirmations: number;
  /** Required confirmations for this invoice */
  requiredConfirmations: number;
  expiresAt: Date;
  txHash?: string;
  /** Block number where the transaction was first seen */
  blockNumber?: number;
  /** Webhook delivery tracking */
  webhookDelivered: boolean;
  webhookAttempts: number;
  lastWebhookAttempt?: Date;
  /** Tatum Notification Subscription ID */
  tatumSubscriptionId?: string;
  /** Name of the provider used for monitoring (e.g. 'tatum') */
  providerName?: string;
  /** Tracking for On-Demand monitoring attempts */
  lastMonitoringAttempt?: Date;
  monitoringAttempts: number;
  /** Arbitrary metadata from merchant */
  metadata?: Record<string, unknown>;
  /** Optional description/memo for the invoice */
  description?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    invoiceId: { type: String, required: true, unique: true },
    amountUsd: { type: Number, required: true },
    lineItems: {
      type: [
        {
          description: { type: String, required: true },
          quantity: { type: Number, required: true, min: 0 },
          unitPrice: { type: Number, required: true, min: 0 },
          total: { type: Number, required: true, min: 0 },
        },
      ],
      default: undefined,
    },
    cryptoAmount: { type: Number, required: true },
    cryptoAmountReceived: { type: Number, default: 0 },
    lastReceivedAmount: { type: Number },
    lastReceivedAt: { type: Date },
    cryptoCurrency: { type: String, required: true },
    payAddress: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["onchain", "lightning"],
      default: "onchain",
    },
    lightningPaymentRequest: { type: String },
    lightningPaymentHash: { type: String },
    lightningPaymentPreimage: { type: String },
    feeUsd: { type: Number, required: true, default: 0 },
    feeCrypto: { type: Number, required: true, default: 0 },
    derivationIndex: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "mempool_detected",
        "confirming",
        "confirmed",
        "expired",
        "failed",
        "partially_paid",
        "overpaid",
      ],
      default: "pending",
    },
    confirmations: { type: Number, default: 0 },
    requiredConfirmations: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    txHash: { type: String },
    blockNumber: { type: Number },
    webhookDelivered: { type: Boolean, default: false },
    webhookAttempts: { type: Number, default: 0 },
    lastWebhookAttempt: { type: Date },
    tatumSubscriptionId: { type: String },
    providerName: { type: String },
    lastMonitoringAttempt: { type: Date },
    monitoringAttempts: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
    description: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

InvoiceSchema.index({ merchantId: 1, status: 1 });
InvoiceSchema.index({ invoiceId: 1, status: 1 });
InvoiceSchema.index({ merchantId: 1, "metadata.isTestnet": 1, createdAt: -1 });
InvoiceSchema.index({ payAddress: 1, status: 1 });
InvoiceSchema.index({ expiresAt: 1, status: 1 });
InvoiceSchema.index({ webhookDelivered: 1, webhookAttempts: 1, status: 1 });
InvoiceSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
// payAddress + invoiceId indexes are auto-created by unique: true
InvoiceSchema.index({ status: 1, expiresAt: 1 });

export const Invoice = mongoose.model<IInvoice>("Invoice", InvoiceSchema);
