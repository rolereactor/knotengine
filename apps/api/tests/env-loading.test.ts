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
      // CI fallback: dummy values so tests can exercise loading logic without
      // real secrets (only loaded when neither of the above files exists).
      path.resolve(__dirname, "fixtures/.env.test"),
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
    // .env.local is a developer-created secrets file — it intentionally does
    // not exist in CI. Skip this check there; it is meaningful only locally.
    it.skipIf(!!process.env.CI)(
      ".env.local should exist at monorepo root",
      () => {
        const monorepoRoot = path.resolve(__dirname, "../../..");
        const envLocalPath = path.resolve(monorepoRoot, ".env.local");
        expect(fs.existsSync(envLocalPath)).toBe(true);
      },
    );

    it(".env.example should exist at monorepo root", () => {
      const monorepoRoot = path.resolve(__dirname, "../../..");
      const envExamplePath = path.resolve(monorepoRoot, ".env.example");
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    it(".env.production.example should exist at monorepo root", () => {
      const monorepoRoot = path.resolve(__dirname, "../../..");
      const envProdPath = path.resolve(monorepoRoot, ".env.production.example");
      expect(fs.existsSync(envProdPath)).toBe(true);
    });
  });

  describe("Environment-specific env files", () => {
    it("should support env-specific files (.env.development or .env.production.example)", () => {
      const monorepoRoot = path.resolve(__dirname, "../../..");
      const envDevPath = path.resolve(monorepoRoot, ".env.development");
      const envProdPath = path.resolve(monorepoRoot, ".env.production.example");
      expect(fs.existsSync(envDevPath) || fs.existsSync(envProdPath)).toBe(
        true,
      );
    });
  });
});
