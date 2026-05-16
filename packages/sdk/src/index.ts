import axios, { AxiosInstance, AxiosError } from "axios";
import * as crypto from "crypto";

// ─── Error Classes ───────────────────────────────────────────────────────────

export class KnotError extends Error {
  public statusCode?: number;
  public code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "KnotError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class KnotAuthenticationError extends KnotError {
  constructor(message: string) {
    super(message, 401, "authentication_error");
    this.name = "KnotAuthenticationError";
  }
}

export class KnotRateLimitError extends KnotError {
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 429, "rate_limit_error");
    this.name = "KnotRateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class KnotValidationError extends KnotError {
  constructor(message: string, errors?: Record<string, string>) {
    super(message, 400, "validation_error");
    this.name = "KnotValidationError";
    if (errors) {
      this.details = errors;
    }
  }

  public details?: Record<string, string>;
}

export class KnotNotFoundError extends KnotError {
  constructor(message: string) {
    super(message, 404, "not_found_error");
    this.name = "KnotNotFoundError";
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = {
  INVOICE_CONFIRMED: "invoice.confirmed",
  INVOICE_MEMPOOL_DETECTED: "invoice.mempool_detected",
  INVOICE_CONFIRMING: "invoice.confirming",
  INVOICE_EXPIRED: "invoice.expired",
  INVOICE_FAILED: "invoice.failed",
  INVOICE_PARTIALLY_PAID: "invoice.partially_paid",
  INVOICE_OVERPAID: "invoice.overpaid",
} as const;

export type WebhookEventType =
  (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

export const CURRENCIES = {
  BTC: "BTC",
  LTC: "LTC",
  ETH: "ETH",
  USDT_ERC20: "USDT_ERC20",
  USDT_POLYGON: "USDT_POLYGON",
  USDC_ERC20: "USDC_ERC20",
  USDC_POLYGON: "USDC_POLYGON",
} as const;

export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES];

export const INVOICE_STATUSES = {
  PENDING: "pending",
  MEMPOOL_DETECTED: "mempool_detected",
  CONFIRMING: "confirming",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
  FAILED: "failed",
} as const;

export type InvoiceStatus =
  (typeof INVOICE_STATUSES)[keyof typeof INVOICE_STATUSES];

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface KnotClientConfig {
  apiKey: string;
  baseUrl?: string;
  webhookSecret?: string;
  timeout?: number;
}

export interface CreateInvoiceRequest {
  amount_usd: number;
  currency: Currency;
  metadata?: Record<string, unknown>;
  ttl_minutes?: number;
  description?: string;
  is_testnet?: boolean;
}

export interface InvoiceResponse {
  invoice_id: string;
  amount_usd: number;
  crypto_amount: number;
  crypto_currency: string;
  pay_address: string;
  status: InvoiceStatus;
  checkout_url: string;
  expires_at: string;
  created_at: string;
  is_testnet: boolean;
  metadata?: Record<string, unknown>;
  description?: string;
}

export interface ListInvoicesParams {
  status?: InvoiceStatus;
  include_testnet?: boolean;
  only_testnet?: boolean;
  page?: number;
  limit?: number;
}

export interface ListInvoicesResponse {
  invoices: InvoiceResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface MerchantProfile {
  merchant_id: string;
  webhook_url?: string;
  currencies: Currency[];
  confirmation_policy: Record<string, number>;
  branding?: {
    name?: string;
    color?: string;
    logo_url?: string;
  };
  fee_responsibility: "merchant" | "client";
  created_at: string;
}

export interface UpdateMerchantRequest {
  webhook_url?: string;
  xpub?: string;
  currencies?: Currency[];
  confirmation_policy?: Record<string, number>;
  branding?: {
    name?: string;
    color?: string;
    logo_url?: string;
  };
  fee_responsibility?: "merchant" | "client";
}

export interface ApiKeyResponse {
  key_id: string;
  key: string;
  created_at: string;
}

export interface WebhookSecretResponse {
  secret: string;
  updated_at: string;
}

export interface AssetConfig {
  assets: Record<
    string,
    {
      symbol: string;
      network: string;
      type: string;
      confirmations: number;
    }
  >;
  networks: string[];
  currencies: Currency[];
}

// ─── SDK Client ──────────────────────────────────────────────────────────────

export class KnotClient {
  private client: AxiosInstance;
  private webhookSecret?: string;

  constructor(config: KnotClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl || "http://localhost:5050",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      timeout: config.timeout || 30000,
    });

    this.webhookSecret = config.webhookSecret;
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (!error.response) {
          throw new KnotError(
            "Network error or server unreachable",
            0,
            "network_error",
          );
        }

        const status = error.response.status;
        const data = error.response.data as Record<string, unknown> | undefined;
        const message = (data?.error as string) || error.message;

        switch (status) {
          case 401:
            throw new KnotAuthenticationError(message);
          case 429: {
            const retryAfter = parseInt(
              (error.response.headers["retry-after"] as string) || "60",
              10,
            );
            throw new KnotRateLimitError(message, retryAfter);
          }
          case 400:
            throw new KnotValidationError(
              message,
              data?.details as Record<string, string>,
            );
          case 404:
            throw new KnotNotFoundError(message);
          default:
            throw new KnotError(message, status, data?.code as string);
        }
      },
    );
  }

  /**
   * Create a new payment invoice
   */
  async createInvoice(data: CreateInvoiceRequest): Promise<InvoiceResponse> {
    const response = await this.client.post("/v1/invoices", data);
    return response.data;
  }

  /**
   * Get the current status of an invoice
   */
  async getInvoice(invoiceId: string): Promise<InvoiceResponse> {
    const response = await this.client.get(`/v1/invoices/${invoiceId}`);
    return response.data;
  }

  /**
   * List invoices with optional filtering and pagination
   */
  async listInvoices(
    params?: ListInvoicesParams,
  ): Promise<ListInvoicesResponse> {
    const response = await this.client.get("/v1/invoices", { params });
    return response.data;
  }

  /**
   * Cancel a pending invoice (sets status to "expired")
   */
  async cancelInvoice(invoiceId: string): Promise<InvoiceResponse> {
    const response = await this.client.post(`/v1/invoices/${invoiceId}/cancel`);
    return response.data;
  }

  /**
   * Manually resolve an invoice to "confirmed" state
   */
  async resolveInvoice(invoiceId: string): Promise<InvoiceResponse> {
    const response = await this.client.post(
      `/v1/invoices/${invoiceId}/resolve`,
    );
    return response.data;
  }

  /**
   * Get current merchant profile
   */
  async getMerchant(): Promise<MerchantProfile> {
    const response = await this.client.get("/v1/merchants/me");
    return response.data;
  }

  /**
   * Update merchant profile settings
   */
  async updateMerchant(data: UpdateMerchantRequest): Promise<MerchantProfile> {
    const response = await this.client.patch("/v1/merchants/me", data);
    return response.data;
  }

  /**
   * Rotate API key (old key is immediately invalidated)
   */
  async rotateApiKey(): Promise<ApiKeyResponse> {
    const response = await this.client.post("/v1/merchants/me/keys");
    return response.data;
  }

  /**
   * Rotate webhook secret
   */
  async rotateWebhookSecret(): Promise<WebhookSecretResponse> {
    const response = await this.client.post("/v1/merchants/me/keys/webhook");
    return response.data;
  }

  /**
   * Send a test webhook to merchant's configured webhook URL
   */
  async sendTestWebhook(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post("/v1/merchants/me/webhooks/test");
    return response.data;
  }

  /**
   * Get supported assets, networks, and currencies
   */
  async getAssetConfig(): Promise<AssetConfig> {
    const response = await this.client.get("/v1/config/assets");
    return response.data;
  }

  /**
   * Get merchant dashboard stats
   */
  async getMerchantStats(
    period: "24h" | "7d" | "30d" = "24h",
  ): Promise<Record<string, unknown>> {
    const response = await this.client.get("/v1/merchants/me/stats", {
      params: { period },
    });
    return response.data;
  }

  /**
   * Verify a webhook signature (HMAC-SHA256)
   */
  verifyWebhook(payload: string, signature: string, secret?: string): boolean {
    const verifSecret = secret || this.webhookSecret;
    if (!verifSecret) {
      throw new Error(
        "Webhook secret not provided. Pass it to verifyWebhook() or set it in the constructor.",
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", verifSecret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }
}
