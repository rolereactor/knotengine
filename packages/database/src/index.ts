import mongoose from "mongoose";

export * from "./models";
export { MerchantMember } from "./models/merchant-member.model";
export { ApiKey } from "./models/api-key.model";
export { WebhookEndpoint } from "./models/webhook-endpoint.model";
export { Refund } from "./models/refund.model";
export { Store } from "./models/store.model";
export { mongoose };
export {
  runMigrations,
  revertMigration,
  getAppliedMigrations,
} from "./migrations/index.js";
export type { Migration } from "./migrations/types.js";

export const connectToDatabase = async (uri: string) => {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoCreate: false,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", (error as Error).message);
    console.warn(
      "⚠️  Server will start without database. Some features will be unavailable.",
    );
    console.warn("   Run 'docker-compose up -d' to start MongoDB.");
  }
};
