import mongoose, { Schema, Document } from "mongoose";

// ============================================================
// 🔔 WEBHOOK ENDPOINT MODEL
// Multiple webhook endpoints per merchant with event filters.
// ============================================================

export interface IWebhookEndpoint extends Document {
  merchantId: mongoose.Types.ObjectId;
  /** Store this endpoint belongs to */
  storeId?: mongoose.Types.ObjectId;
  /** Unique endpoint ID e.g. 'we_abc123' */
  endpointId: string;
  /** Destination URL */
  url: string;
  /** Secret for signing webhook payloads */
  secret: string;
  /** Events to send to this endpoint */
  events: string[];
  /** Whether to send all events or only specified */
  eventMode: "all" | "filtered";
  /** Whether the endpoint is active */
  isActive: boolean;
  /** Description for identification */
  description?: string;
  /** Last successful delivery */
  lastSuccessAt?: Date;
  /** Last failed delivery */
  lastFailureAt?: Date;
  /** Consecutive failure count */
  consecutiveFailures: number;
  /** When the endpoint was disabled due to failures */
  disabledAt?: Date;
  /** API version for webhook payloads */
  apiVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEndpointSchema: Schema = new Schema(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
    },
    endpointId: { type: String, unique: true },
    url: { type: String, required: true },
    secret: { type: String, required: true },
    events: { type: [String], default: [] },
    eventMode: {
      type: String,
      enum: ["all", "filtered"],
      default: "filtered",
    },
    isActive: { type: Boolean, default: true },
    description: { type: String },
    lastSuccessAt: { type: Date },
    lastFailureAt: { type: Date },
    consecutiveFailures: { type: Number, default: 0 },
    disabledAt: { type: Date },
    apiVersion: { type: String, default: "v1" },
  },
  { timestamps: true },
);

export const WebhookEndpoint = mongoose.model<IWebhookEndpoint>(
  "WebhookEndpoint",
  WebhookEndpointSchema,
);
