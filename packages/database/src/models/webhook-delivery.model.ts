import mongoose, { Schema, Document } from "mongoose";

export interface IWebhookDelivery extends Document {
  merchantId: string;
  invoiceId: string;
  eventType: string;
  url: string;
  attempt: number;
  status: "pending" | "success" | "failed";
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    merchantId: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    eventType: { type: String, required: true },
    url: { type: String, required: true },
    attempt: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    statusCode: { type: Number },
    responseBody: { type: String },
    errorMessage: { type: String },
    duration: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);

// Index for querying delivery history by merchant
WebhookDeliverySchema.index({ merchantId: 1, createdAt: -1 });

// Index for querying by invoice
WebhookDeliverySchema.index({ invoiceId: 1, createdAt: -1 });

// 90-day TTL for delivery logs
WebhookDeliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

export const WebhookDelivery = mongoose.model<IWebhookDelivery>(
  "WebhookDelivery",
  WebhookDeliverySchema,
);
