import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

describe("Environment Loading", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };

    const monorepoRoot = path.resolve(__dirname, "../../..");
    const envPaths = [
      path.resolve(monorepoRoot, ".env.local"),
      path.resolve(monorepoRoot, ".env"),
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
      }
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Required env vars", () => {
    it("should have DATABASE_URL defined", () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toMatch(/^mongodb/);
    });

    it("should have AUTH_SECRET defined for NextAuth", () => {
      expect(process.env.AUTH_SECRET).toBeDefined();
      expect(process.env.AUTH_SECRET!.length).toBeGreaterThanOrEqual(16);
    });

    it("should have INTERNAL_SECRET defined", () => {
      expect(process.env.INTERNAL_SECRET).toBeDefined();
      expect(process.env.INTERNAL_SECRET!.length).toBeGreaterThanOrEqual(16);
    });

    it("should have NEXT_PUBLIC_API_URL defined", () => {
      expect(process.env.NEXT_PUBLIC_API_URL).toBeDefined();
    });

    it("should have REDIS_URL or fallback", () => {
      expect(process.env.REDIS_URL).toBeDefined();
    });
  });

  describe("Env var format validation", () => {
    it("should validate DATABASE_URL format", () => {
      expect(process.env.DATABASE_URL).toMatch(/^mongodb/);
    });

    it("should validate AUTH_SECRET is not empty string", () => {
      expect(process.env.AUTH_SECRET).not.toBe("");
    });

    it("should validate INTERNAL_SECRET is not empty string", () => {
      expect(process.env.INTERNAL_SECRET).not.toBe("");
    });
  });

  describe("Monorepo root env files", () => {
    it(".env.local should exist at monorepo root", () => {
      const monorepoRoot = path.resolve(__dirname, "../../..");
      const envLocalPath = path.resolve(monorepoRoot, ".env.local");
      expect(fs.existsSync(envLocalPath)).toBe(true);
    });

    it(".env.example should exist at monorepo root", () => {
      const monorepoRoot = path.resolve(__dirname, "../../..");
      const envExamplePath = path.resolve(monorepoRoot, ".env.example");
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });
  });
});
