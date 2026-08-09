import { Connection, Model } from "mongoose";

export interface Migration {
  name: string;
  up: (connection: Connection) => Promise<void>;
  down: (connection: Connection) => Promise<void>;
}

export interface MigrationRecord {
  _id: string;
  name: string;
  appliedAt: Date;
}

export interface MigrationModule {
  default: Migration;
}

export interface RunnerOptions {
  connection: Connection;
  migrationsDir: string;
}

export type MigrationRecordModel = Model<MigrationRecord>;
