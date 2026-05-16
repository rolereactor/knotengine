import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  KnotClient,
  WEBHOOK_EVENTS,
  CURRENCIES,
  INVOICE_STATUSES,
} from "./index";
import * as crypto from "crypto";

const mockInterceptors = {
  response: {
    use: vi.fn(),
  },
};

const mockAxiosInstance = {
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  interceptors: mockInterceptors,
};

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe("KnotClient SDK", () => {
  const config = {
    apiKey: "knot_test_123",
    webhookSecret: "whsec_test_123",
    baseUrl: "http://localhost:5050",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.patch.mockReset();
    mockInterceptors.response.use.mockReset();
  });

  describe("Initialization", () => {
    it("should initialize with correct config", () => {
      const sdk = new KnotClient(config);
      expect(sdk).toBeDefined();
    });

    it("should use default baseUrl if not provided", () => {
      const sdk = new KnotClient({ apiKey: "test" });
      expect(sdk).toBeDefined();
    });

    it("should use custom timeout if provided", () => {
      const sdk = new KnotClient({ ...config, timeout: 5000 });
      expect(sdk).toBeDefined();
    });
  });

  describe("Webhook Verification", () => {
    it("should verify a valid webhook signature", () => {
      const sdk = new KnotClient(config);
      const payload = JSON.stringify({ event: "invoice.confirmed" });

      const hmac = crypto.createHmac("sha256", config.webhookSecret);
      hmac.update(payload);
      const signature = hmac.digest("hex");

      const isValid = sdk.verifyWebhook(payload, signature);
      expect(isValid).toBe(true);
    });

    it("should reject an invalid webhook signature", () => {
      const sdk = new KnotClient(config);
      const payload = JSON.stringify({ event: "invoice.confirmed" });
      const isValid = sdk.verifyWebhook(payload, "invalid_signature");
      expect(isValid).toBe(false);
    });

    it("should throw error if webhookSecret is missing during verification", () => {
      const sdk = new KnotClient({ apiKey: "test" });
      expect(() => sdk.verifyWebhook("{}", "sig")).toThrow(
        "Webhook secret not provided",
      );
    });

    it("should allow manual secret override", () => {
      const sdk = new KnotClient(config);
      const payload = JSON.stringify({ event: "invoice.confirmed" });
      const customSecret = "custom_secret";

      const hmac = crypto.createHmac("sha256", customSecret);
      hmac.update(payload);
      const signature = hmac.digest("hex");

      const isValid = sdk.verifyWebhook(payload, signature, customSecret);
      expect(isValid).toBe(true);
    });
  });

  describe("Invoice Operations", () => {
    const mockInvoice = {
      invoice_id: "inv_test_123",
      amount_usd: 49.99,
      crypto_amount: 0.00075,
      crypto_currency: "BTC",
      pay_address: "bc1qtestaddress",
      status: "pending",
      checkout_url: "http://localhost:5051/checkout/inv_test_123",
      expires_at: "2026-05-16T12:00:00Z",
      created_at: "2026-05-16T11:30:00Z",
      is_testnet: false,
    };

    describe("createInvoice", () => {
      it("should create an invoice successfully", async () => {
        mockAxiosInstance.post.mockResolvedValue({ data: mockInvoice });

        const sdk = new KnotClient(config);
        const invoice = await sdk.createInvoice({
          amount_usd: 49.99,
          currency: "BTC",
          metadata: { orderId: "order_123" },
        });

        expect(invoice.invoice_id).toBe("inv_test_123");
        expect(invoice.status).toBe("pending");
      });
    });

    describe("getInvoice", () => {
      it("should retrieve an invoice by ID", async () => {
        mockAxiosInstance.get.mockResolvedValue({ data: mockInvoice });

        const sdk = new KnotClient(config);
        const invoice = await sdk.getInvoice("inv_test_123");

        expect(invoice.invoice_id).toBe("inv_test_123");
      });
    });

    describe("listInvoices", () => {
      it("should list invoices with pagination", async () => {
        const mockListResponse = {
          invoices: [mockInvoice],
          total: 1,
          page: 1,
          limit: 10,
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockListResponse });

        const sdk = new KnotClient(config);
        const result = await sdk.listInvoices({ page: 1, limit: 10 });

        expect(result.invoices).toHaveLength(1);
        expect(result.total).toBe(1);
      });
    });

    describe("cancelInvoice", () => {
      it("should cancel an invoice", async () => {
        const cancelledInvoice = { ...mockInvoice, status: "expired" };
        mockAxiosInstance.post.mockResolvedValue({ data: cancelledInvoice });

        const sdk = new KnotClient(config);
        const result = await sdk.cancelInvoice("inv_test_123");

        expect(result.status).toBe("expired");
      });
    });
  });

  describe("Constants", () => {
    it("should export webhook event constants", () => {
      expect(WEBHOOK_EVENTS.INVOICE_CONFIRMED).toBe("invoice.confirmed");
      expect(WEBHOOK_EVENTS.INVOICE_MEMPOOL_DETECTED).toBe(
        "invoice.mempool_detected",
      );
      expect(WEBHOOK_EVENTS.INVOICE_EXPIRED).toBe("invoice.expired");
      expect(WEBHOOK_EVENTS.INVOICE_FAILED).toBe("invoice.failed");
    });

    it("should export currency constants", () => {
      expect(CURRENCIES.BTC).toBe("BTC");
      expect(CURRENCIES.ETH).toBe("ETH");
      expect(CURRENCIES.USDT_POLYGON).toBe("USDT_POLYGON");
      expect(CURRENCIES.USDC_ERC20).toBe("USDC_ERC20");
    });

    it("should export invoice status constants", () => {
      expect(INVOICE_STATUSES.PENDING).toBe("pending");
      expect(INVOICE_STATUSES.CONFIRMED).toBe("confirmed");
      expect(INVOICE_STATUSES.EXPIRED).toBe("expired");
    });
  });
});
