import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load env files from monorepo root (Next.js convention)
const env = process.env.NODE_ENV || "development";
const baseDir = path.resolve(__dirname, "../..");

const envFiles = [
  `.env.${env}.local`, // Highest priority (gitignored)
  `.env.local`, // Machine overrides (gitignored)
  `.env.${env}`, // Environment-specific (committed)
  `.env`, // Base config (committed)
];

for (const file of envFiles) {
  const envPath = path.resolve(baseDir, file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
