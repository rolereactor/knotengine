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
    console.log(`[next.config] Loaded env from ${path.basename(envPath)}`);
  }
}

// Ensure AUTH_SECRET is available for NextAuth
if (!process.env.AUTH_SECRET) {
  console.warn(
    "[next.config] AUTH_SECRET not found, using fallback (dev only)",
  );
  process.env.AUTH_SECRET = "dev-secret-do-not-use-in-production";
}

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
