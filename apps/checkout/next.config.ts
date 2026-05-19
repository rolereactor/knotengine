import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load env files from monorepo root (before anything else)
const envPaths = [
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
