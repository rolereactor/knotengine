import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "path";

// Load root .env for monorepo development
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
