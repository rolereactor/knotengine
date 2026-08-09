#!/usr/bin/env node

import * as path from "node:path";
import mongoose from "mongoose";
import {
  runMigrations,
  revertMigration,
  getAppliedMigrations,
} from "./runner.js";

async function main() {
  const command = process.argv[2];
  const migrationsDir =
    process.env.MIGRATIONS_DIR || path.resolve(__dirname, "..");

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI environment variable is required");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("Connected to MongoDB");

  const connection = mongoose.connection;

  try {
    switch (command) {
      case "up": {
        const result = await runMigrations(connection, migrationsDir);
        console.log(
          `\nMigration complete: ${result.executed.length} executed, ${result.skipped.length} skipped`,
        );
        if (result.executed.length > 0) {
          console.log("Executed:", result.executed.join(", "));
        }
        break;
      }
      case "down": {
        const targetName = process.argv[3];
        if (!targetName) {
          console.error("Usage: migrate down <migration-name>");
          process.exit(1);
        }
        await revertMigration(connection, migrationsDir, targetName);
        break;
      }
      case "status": {
        const applied = await getAppliedMigrations(connection);
        if (applied.size === 0) {
          console.log("No migrations have been applied");
        } else {
          console.log("Applied migrations:");
          for (const name of applied) {
            console.log(`  - ${name}`);
          }
        }
        break;
      }
      default:
        console.log("Usage: migrate <up|down|status> [migration-name]");
        process.exit(1);
    }
  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
