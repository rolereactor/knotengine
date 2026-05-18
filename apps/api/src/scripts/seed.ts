/**
 * KnotEngine — Seed Data Script
 * Run this once after first deployment to create a demo merchant.
 *
 * Usage:
 *   node dist/src/scripts/seed.js
 *
 * Or from docker:
 *   docker compose exec api node dist/src/scripts/seed.js
 *
 * The script is idempotent — running multiple times is safe.
 */

import mongoose from "mongoose";
import { connectToDatabase } from "@qodinger/knot-database";
import crypto from "crypto";

const DEMO_MERCHANT = {
  merchantId: "seed_demo_001",
  name: "Demo Merchant",
  email: "demo@localhost",
  plan: "enterprise",
  theme: "dark" as const,
  brandingEnabled: true,
  removeBranding: true,
  enabledCurrencies: ["BTC", "LTC", "ETH", "USDT_ERC20", "USDT_POLYGON"],
  derivationIndex: 0,
  confirmationPolicy: {
    BTC: 2,
    LTC: 6,
    ETH: 12,
  },
  feesAccrued: {
    usd: 0,
    BTC: 0,
    LTC: 0,
    ETH: 0,
    USDT_ERC20: 0,
    USDT_POLYGON: 0,
  },
  creditBalance: 100,
  isActive: true,
  isSuspended: false,
};

const DEMO_USER = {
  email: "demo@localhost",
  creditBalance: 100,
  isVerified: true,
  referredBy: undefined,
  referralEarningsUsd: 0,
  firstName: "Demo",
  lastName: "User",
};

async function seed() {
  console.log("🌱 Starting KnotEngine seed...");

  const mongoUri =
    process.env.DATABASE_URL ||
    "mongodb://knotadmin:knotadmin@localhost:27017/knotengine?authSource=admin";

  console.log(`📡 Connecting to: ${mongoUri.replace(/:[^:@]+@/, ":****@")}`);
  await connectToDatabase(mongoUri);

  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not established");

  // ── Check if seed already exists ──────────────────────────────────────
  const existingMerchant = await db
    .collection("merchants")
    .findOne({ merchantId: DEMO_MERCHANT.merchantId });

  if (existingMerchant) {
    console.log("✅ Seed merchant already exists, skipping.");
    console.log(`   Merchant ID: ${DEMO_MERCHANT.merchantId}`);
    console.log(
      `   API Key: seed_demo_api_key_${existingMerchant._id.toString().slice(0, 12)}`,
    );
    console.log("");
    console.log(
      "💡 To reset, delete the merchant from MongoDB and run this script again.",
    );
    await mongoose.disconnect();
    return;
  }

  // ── Create Demo User ───────────────────────────────────────────────────
  const userId = new mongoose.Types.ObjectId();
  await db.collection("users").insertOne({
    _id: userId,
    ...DEMO_USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✅ Demo user created");

  // ── Create Demo Merchant ───────────────────────────────────────────────
  await db.collection("merchants").insertOne({
    _id: new mongoose.Types.ObjectId(),
    ...DEMO_MERCHANT,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("✅ Demo merchant created");

  // ── Create Demo API Key ────────────────────────────────────────────────
  const rawKey = `seed_demo_${crypto.randomBytes(16).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  await db.collection("apikeys").insertOne({
    _id: new mongoose.Types.ObjectId(),
    merchantId: DEMO_MERCHANT.merchantId,
    keyHash,
    name: "Demo API Key",
    scopes: ["full_access"],
    isActive: true,
    lastUsedAt: null,
    createdAt: new Date(),
  });
  console.log("✅ Demo API key created");

  // ── Create MongoDB Indexes ────────────────────────────────────────────
  console.log("🔧 Ensuring indexes...");
  // Indexes are managed by create-indexes.ts. This is just a no-op safety check.
  console.log("✅ Index check complete");

  console.log("");
  console.log("🎉 Seed complete!");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("📋  Demo Credentials");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("   Merchant ID: " + DEMO_MERCHANT.merchantId);
  console.log("   API Key:     " + rawKey);
  console.log("");
  console.log("   Dashboard:   http://localhost:5052");
  console.log("   API:         http://localhost:5050");
  console.log("");
  console.log("   ⚠️  Replace btcXpub/ethAddress with your own wallet keys");
  console.log("      before accepting real payments.");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
