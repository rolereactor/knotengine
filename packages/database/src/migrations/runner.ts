import * as fs from "node:fs";
import * as path from "node:path";
import { Connection, Schema, Model } from "mongoose";
import type { Migration, MigrationRecord } from "./types.js";

const MIGRATION_COLLECTION = "migrations";

const MigrationRecordSchema = new Schema<MigrationRecord>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false },
);

function getMigrationModel(connection: Connection): Model<MigrationRecord> {
  const existing = connection.models["MigrationRecord"];
  if (existing) return existing as Model<MigrationRecord>;
  return connection.model<MigrationRecord>(
    "MigrationRecord",
    MigrationRecordSchema,
    MIGRATION_COLLECTION,
  );
}

export async function getAppliedMigrations(
  connection: Connection,
): Promise<Set<string>> {
  const MigrationRecordModel = getMigrationModel(connection);
  const records = await MigrationRecordModel.find({}).select({ _id: 1 });
  return new Set(records.map((r) => r._id));
}

export async function loadMigrations(
  migrationsDir: string,
): Promise<Migration[]> {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".js") || f.endsWith(".ts"))
    .sort();

  const migrations: Migration[] = [];
  for (const file of files) {
    const filePath = path.resolve(migrationsDir, file);
    const mod = await import(filePath);
    const migration = mod.default || mod;
    if (!migration.name || !migration.up || !migration.down) {
      console.warn(`Skipping ${file}: missing name/up/down exports`);
      continue;
    }
    migrations.push(migration);
  }
  return migrations;
}

export async function runMigrations(
  connection: Connection,
  migrationsDir: string,
): Promise<{ executed: string[]; skipped: string[] }> {
  const MigrationRecordModel = getMigrationModel(connection);
  const applied = await getAppliedMigrations(connection);
  const migrations = await loadMigrations(migrationsDir);

  const executed: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      skipped.push(migration.name);
      continue;
    }

    console.log(`Running migration: ${migration.name}`);
    await migration.up(connection);

    await MigrationRecordModel.create({
      _id: migration.name,
      name: migration.name,
      appliedAt: new Date(),
    });

    executed.push(migration.name);
    console.log(`Completed migration: ${migration.name}`);
  }

  return { executed, skipped };
}

export async function revertMigration(
  connection: Connection,
  migrationsDir: string,
  targetName: string,
): Promise<void> {
  const MigrationRecordModel = getMigrationModel(connection);
  const applied = await getAppliedMigrations(connection);

  if (!applied.has(targetName)) {
    console.warn(`Migration "${targetName}" has not been applied`);
    return;
  }

  const migrations = await loadMigrations(migrationsDir);
  const migration = migrations.find((m) => m.name === targetName);

  if (!migration) {
    throw new Error(`Migration file not found for "${targetName}"`);
  }

  console.log(`Reverting migration: ${migration.name}`);
  await migration.down(connection);

  await MigrationRecordModel.deleteOne({ _id: migration.name });
  console.log(`Reverted migration: ${migration.name}`);
}
