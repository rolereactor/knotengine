import { describe, it, expect, beforeAll } from "vitest";
import {
  KnotClient,
  KnotAuthenticationError,
  KnotValidationError,
} from "@qodinger/knot-sdk";
import * as crypto from "crypto";

/**
 * E2E Tests for KnotEngine API
 *
 * These tests require a running API server and MongoDB instance.
 * Run with: pnpm test:e2e
 *
 * Environment variables:
 * - KNOT_API_URL: API base URL (default: http://localhost:5050)
 * - KNOT_API_KEY: API key for authentication
 */

const API_URL = process.env.KNOT_API_URL || "http://localhost:5050";
const API_KEY = process.env.KNOT_API_KEY || "knot_sk_test_e2e";

describe("KnotEngine E2E Tests", () => {
  let knot: KnotClient;

  beforeAll(() => {
    knot = new KnotClient({
      apiKey: API_KEY,
      baseUrl: API_URL,
    });
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await fetch(`${API_URL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.engine).toContain("Knot");
    });
  });

  describe("Public Endpoints", () => {
    it("should get supported assets", async () => {
      const response = await fetch(`${API_URL}/v1/config/assets`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.currencies).toContain("BTC");
      expect(data.currencies).toContain("ETH");
      expect(data.networks).toContain("bitcoin");
    });

    it("should require auth for merchants endpoint", async () => {
      const response = await fetch(`${API_URL}/v1/merchants/me`);
      expect(response.status).toBe(401);
    });
  });

  describe("Invoice Creation", () => {
    it("should reject requests without API key", async () => {
      const response = await fetch(`${API_URL}/v1/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_usd: 10,
          currency: "BTC",
        }),
      });
      expect(response.status).toBe(401);
    });

    it("should reject invalid amount", async () => {
      try {
        await knot.createInvoice({
          amount_usd: 0.5,
          currency: "BTC",
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(KnotValidationError);
      }
    });

    it("should create a testnet invoice", async () => {
      if (API_KEY === "knot_sk_test_e2e") {
        console.log("Skipping: No valid API key configured");
        return;
      }

      const invoice = await knot.createInvoice({
        amount_usd: 10.0,
        currency: "BTC",
        is_testnet: true,
        metadata: { orderId: "e2e_test_001" },
      });

      expect(invoice.invoice_id).toBeDefined();
      expect(invoice.invoice_id).toMatch(/^inv_/);
      expect(invoice.amount_usd).toBe(10.0);
      expect(invoice.crypto_currency).toBe("BTC");
      expect(invoice.pay_address).toBeDefined();
      expect(invoice.checkout_url).toBeDefined();
      expect(invoice.status).toBe("pending");
      expect(invoice.is_testnet).toBe(true);
    });
  });

  describe("Invoice Retrieval", () => {
    it("should get invoice by ID", async () => {
      if (API_KEY === "knot_sk_test_e2e") {
        console.log("Skipping: No valid API key configured");
        return;
      }

      const created = await knot.createInvoice({
        amount_usd: 25.0,
        currency: "BTC",
        is_testnet: true,
      });

      const retrieved = await knot.getInvoice(created.invoice_id);
      expect(retrieved.invoice_id).toBe(created.invoice_id);
      expect(retrieved.amount_usd).toBe(25.0);
    });

    it("should return 404 for non-existent invoice", async () => {
      try {
        await knot.getInvoice("inv_nonexistent_123456");
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toContain("not found");
      }
    });
  });

  describe("Invoice Listing", () => {
    it("should list invoices", async () => {
      if (API_KEY === "knot_sk_test_e2e") {
        console.log("Skipping: No valid API key configured");
        return;
      }

      const result = await knot.listInvoices({
        page: 1,
        limit: 10,
        include_testnet: true,
      });

      expect(result.invoices).toBeDefined();
      expect(Array.isArray(result.invoices)).toBe(true);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe("Invoice Cancellation", () => {
    it("should cancel a pending invoice", async () => {
      if (API_KEY === "knot_sk_test_e2e") {
        console.log("Skipping: No valid API key configured");
        return;
      }

      const invoice = await knot.createInvoice({
        amount_usd: 15.0,
        currency: "BTC",
        is_testnet: true,
      });

      const cancelled = await knot.cancelInvoice(invoice.invoice_id);
      expect(cancelled.status).toBe("expired");
    });
  });

  describe("Webhook Verification", () => {
    it("should verify valid webhook signature", () => {
      const webhookSecret = "whsec_test_secret";
      const client = new KnotClient({
        apiKey: "test",
        webhookSecret,
      });

      const payload = JSON.stringify({
        event: "invoice.confirmed",
        invoice_id: "inv_test",
      });

      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      expect(client.verifyWebhook(payload, signature)).toBe(true);
    });

    it("should reject invalid webhook signature", () => {
      const client = new KnotClient({
        apiKey: "test",
        webhookSecret: "whsec_test",
      });

      expect(client.verifyWebhook("{}", "invalid_signature")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should throw KnotAuthenticationError for invalid key", async () => {
      const badClient = new KnotClient({
        apiKey: "knot_sk_invalid_key",
        baseUrl: API_URL,
      });

      try {
        await badClient.createInvoice({
          amount_usd: 10,
          currency: "BTC",
        });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(KnotAuthenticationError);
      }
    });
  });
});
