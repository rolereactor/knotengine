import packageJson from "../../package.json" with { type: "json" };

const INVOICE_SCHEMA = {
  type: "object",
  properties: {
    object: { type: "string", example: "invoice" },
    invoice_id: { type: "string", example: "inv_a1b2c3d4e5f6a7b8c9d0e1f2" },
    amount_usd: { type: "number", example: 100.0 },
    crypto_amount: { type: "number", example: 0.00152 },
    crypto_currency: { type: "string", example: "BTC" },
    pay_address: {
      type: "string",
      example: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    expires_at: {
      type: "string",
      format: "date-time",
      example: "2024-12-01T00:30:00.000Z",
    },
    status: { type: "string", example: "pending" },
    checkout_url: {
      type: "string",
      example:
        "https://pay.knotengine.com/checkout/inv_a1b2c3d4e5f6a7b8c9d0e1f2",
    },
    is_testnet: { type: "boolean", example: false },
  },
  required: [
    "object",
    "invoice_id",
    "amount_usd",
    "crypto_amount",
    "crypto_currency",
    "status",
  ],
};

const INVOICE_DETAIL_SCHEMA = {
  type: "object",
  properties: {
    object: { type: "string", example: "invoice" },
    invoice_id: { type: "string", example: "inv_a1b2c3d4e5f6a7b8c9d0e1f2" },
    amount_usd: { type: "number", example: 100.0 },
    crypto_amount: { type: "number", example: 0.00152 },
    crypto_amount_received: { type: "string", example: "0.0000" },
    crypto_currency: { type: "string", example: "BTC" },
    status: { type: "string", example: "pending" },
    confirmations: { type: "number", example: 0 },
    fee_usd: { type: "number", example: 0.5 },
    fee_crypto: { type: "number", example: 0.0000076 },
    required_confirmations: { type: "number", example: 1 },
    expires_at: {
      type: "string",
      format: "date-time",
      example: "2024-12-01T00:30:00.000Z",
    },
    paid_at: { type: ["string", "null"], format: "date-time", example: null },
    created_at: {
      type: "string",
      format: "date-time",
      example: "2024-12-01T00:00:00.000Z",
    },
    metadata: { type: "object", example: {} },
    description: { type: ["string", "null"], example: "Order #1234" },
    checkout_url: {
      type: "string",
      example:
        "https://pay.knotengine.com/checkout/inv_a1b2c3d4e5f6a7b8c9d0e1f2",
    },
    pay_address: {
      type: "string",
      example: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    },
    tx_hash: { type: ["string", "null"], example: null },
  },
  required: [
    "object",
    "invoice_id",
    "amount_usd",
    "crypto_amount",
    "crypto_currency",
    "status",
  ],
};

const ERROR_SCHEMA = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "authentication_error",
            "invalid_request_error",
            "api_error",
            "rate_limit_error",
          ],
          example: "invalid_request_error",
        },
        code: { type: "string", example: "invoice_not_found" },
        message: {
          type: "string",
          example: "No invoice found with ID 'inv_abc'.",
        },
        param: { type: "string", example: "id" },
        doc_url: {
          type: "string",
          example: "https://docs.knotengine.com/api/errors#invoice_not_found",
        },
      },
      required: ["type", "code", "message", "doc_url"],
    },
  },
  required: ["error"],
};

export function generateOpenAPISpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "KnotEngine API",
      description:
        "Non-custodial crypto payment infrastructure. Merchants receive crypto directly to their own wallets; the platform never holds funds.",
      version: packageJson.version,
      contact: {
        name: "KnotEngine Support",
        url: "https://docs.knotengine.com",
      },
    },
    servers: [
      {
        url: "https://api.knotengine.com",
        description: "Production",
      },
      {
        url: "http://localhost:5050",
        description: "Local development",
      },
    ],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Merchant API key. Obtain from the dashboard.",
        },
      },
      schemas: {
        Invoice: INVOICE_SCHEMA,
        InvoiceDetail: INVOICE_DETAIL_SCHEMA,
        Error: ERROR_SCHEMA,
      },
    },
    paths: {
      "/v1/invoices": {
        post: {
          tags: ["Invoices"],
          summary: "Create an invoice",
          description:
            "Creates a new crypto invoice. A unique payment address is derived via HD wallet (BIP32). The invoice expires after the merchant's configured TTL (default 30 minutes).",
          operationId: "createInvoice",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: false,
              schema: { type: "string", maxLength: 255 },
              description:
                "Unique key for idempotent requests. Cached for 24 hours.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount_usd", "currency"],
                  properties: {
                    amount_usd: {
                      type: "number",
                      exclusiveMinimum: 0,
                      example: 100.0,
                      description: "Invoice amount in USD.",
                    },
                    currency: {
                      type: "string",
                      enum: [
                        "BTC",
                        "LTC",
                        "ETH",
                        "USDT_ERC20",
                        "USDT_POLYGON",
                        "USDC_ERC20",
                        "USDC_POLYGON",
                      ],
                      example: "BTC",
                      description: "Cryptocurrency to accept for payment.",
                    },
                    ttl_minutes: {
                      type: "integer",
                      minimum: 15,
                      maximum: 1440,
                      example: 30,
                      description:
                        "Invoice time-to-live in minutes. Falls back to merchant setting.",
                    },
                    metadata: {
                      type: "object",
                      additionalProperties: true,
                      example: {
                        orderId: "order_12345",
                        customerEmail: "alice@example.com",
                      },
                      description:
                        "Arbitrary key-value metadata attached to the invoice.",
                    },
                    description: {
                      type: "string",
                      maxLength: 500,
                      example: "Order #12345",
                      description:
                        "Customer-facing description. HTML tags are stripped.",
                    },
                    is_testnet: {
                      type: "boolean",
                      example: false,
                      description: "Create a testnet invoice (no real funds).",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Invoice created successfully.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Invoice" },
                  example: {
                    object: "invoice",
                    invoice_id: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                    amount_usd: 100.0,
                    crypto_amount: 0.00152,
                    crypto_currency: "BTC",
                    pay_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                    expires_at: "2024-12-01T00:30:00.000Z",
                    status: "pending",
                    checkout_url:
                      "https://pay.knotengine.com/checkout/inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                    is_testnet: false,
                  },
                },
              },
            },
            "400": {
              description:
                "Invalid request (e.g., below minimum amount, unsupported testnet currency).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Authentication required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "402": {
              description: "Insufficient credit balance.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "429": {
              description:
                "Plan limit reached (monthly invoice count or volume cap).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "500": {
              description: "Internal server error.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
        get: {
          tags: ["Invoices"],
          summary: "List invoices",
          description:
            "Returns a paginated list of invoices for the authenticated merchant. Results are sorted by creation date (newest first).",
          operationId: "listInvoices",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              required: false,
              schema: { type: "string" },
              description:
                "Filter by invoice status (e.g., pending, confirmed, expired).",
            },
            {
              name: "include_testnet",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["true", "false"] },
              description: "Include testnet invoices in results.",
            },
            {
              name: "only_testnet",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["true", "false"] },
              description: "Return only testnet invoices.",
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string", maxLength: 200 },
              description: "Search by description or metadata.email.",
            },
            {
              name: "page",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1 },
              description: "Page number (default: 1).",
            },
            {
              name: "limit",
              in: "query",
              required: false,
              schema: { type: "integer", minimum: 1, maximum: 100 },
              description: "Results per page (default: 20, max: 100).",
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of invoices.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", example: "list" },
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/InvoiceDetail" },
                      },
                      pagination: {
                        type: "object",
                        properties: {
                          total: { type: "integer", example: 42 },
                          page: { type: "integer", example: 1 },
                          limit: { type: "integer", example: 20 },
                          pages: { type: "integer", example: 3 },
                        },
                      },
                    },
                  },
                  example: {
                    object: "list",
                    data: [
                      {
                        object: "invoice",
                        invoice_id: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                        amount_usd: 100.0,
                        crypto_amount: 0.00152,
                        crypto_amount_received: "0.0000",
                        crypto_currency: "BTC",
                        pay_address:
                          "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                        status: "pending",
                        confirmations: 0,
                        required_confirmations: 1,
                        tx_hash: null,
                        expires_at: "2024-12-01T00:30:00.000Z",
                        paid_at: null,
                        created_at: "2024-12-01T00:00:00.000Z",
                        metadata: { orderId: "order_12345" },
                      },
                    ],
                    pagination: {
                      total: 42,
                      page: 1,
                      limit: 20,
                      pages: 3,
                    },
                  },
                },
              },
            },
            "401": {
              description: "Authentication required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/v1/invoices/{id}": {
        get: {
          tags: ["Invoices"],
          summary: "Get invoice status",
          description:
            "Retrieves the current status and details of an invoice. This endpoint is public (no API key required).",
          operationId: "getInvoiceStatus",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The invoice ID (e.g., inv_a1b2c3d4...).",
            },
          ],
          responses: {
            "200": {
              description: "Invoice details.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/InvoiceDetail" },
                  example: {
                    object: "invoice",
                    invoice_id: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                    amount_usd: 100.0,
                    crypto_amount: 0.00152,
                    crypto_amount_received: "0.0000",
                    crypto_currency: "BTC",
                    status: "pending",
                    confirmations: 0,
                    fee_usd: 0.5,
                    fee_crypto: 0.0000076,
                    required_confirmations: 1,
                    expires_at: "2024-12-01T00:30:00.000Z",
                    paid_at: null,
                    created_at: "2024-12-01T00:00:00.000Z",
                    metadata: {},
                    description: "Order #12345",
                    checkout_url:
                      "https://pay.knotengine.com/checkout/inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                    pay_address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                    tx_hash: null,
                  },
                },
              },
            },
            "404": {
              description: "Invoice not found.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/v1/invoices/{id}/cancel": {
        post: {
          tags: ["Invoices"],
          summary: "Cancel an invoice",
          description:
            "Cancels a pending invoice. Only invoices with status 'pending' can be cancelled.",
          operationId: "cancelInvoice",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The invoice ID.",
            },
          ],
          responses: {
            "200": {
              description: "Invoice cancelled.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", example: "invoice" },
                      invoice_id: {
                        type: "string",
                        example: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                      },
                      status: { type: "string", example: "expired" },
                      cancelled: { type: "boolean", example: true },
                      expires_at: { type: "string", format: "date-time" },
                      created_at: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Authentication required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Invoice not found.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "409": {
              description: "Invoice is not in a cancellable state.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/v1/invoices/{id}/resolve": {
        post: {
          tags: ["Invoices"],
          summary: "Manually resolve an invoice",
          description:
            "Manually marks an invoice as confirmed. Use this when a payment was made outside the monitored channels.",
          operationId: "resolveInvoice",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The invoice ID.",
            },
          ],
          responses: {
            "200": {
              description: "Invoice resolved.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", example: "invoice" },
                      invoice_id: {
                        type: "string",
                        example: "inv_a1b2c3d4e5f6a7b8c9d0e1f2",
                      },
                      status: { type: "string", example: "confirmed" },
                      resolved: { type: "boolean", example: true },
                      paid_at: { type: "string", format: "date-time" },
                      created_at: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Authentication required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "404": {
              description: "Invoice not found.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "409": {
              description: "Invoice is already completed.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/v1/invoices/bulk-cancel": {
        post: {
          tags: ["Invoices"],
          summary: "Bulk cancel invoices",
          description:
            "Cancels multiple pending invoices at once. Maximum 100 invoices per request.",
          operationId: "bulkCancelInvoices",
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["invoice_ids"],
                  properties: {
                    invoice_ids: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 1,
                      maxItems: 100,
                      example: ["inv_abc123", "inv_def456"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Bulk cancel result.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", example: "bulk_cancel" },
                      cancelled_count: { type: "integer", example: 2 },
                      requested_count: { type: "integer", example: 2 },
                      note: {
                        type: "string",
                        example: "1 invoice(s) were not cancelled.",
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description:
                "Invalid request (empty array or exceeds max bulk size).",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
            "401": {
              description: "Authentication required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/v1/invoices/export": {
        get: {
          tags: ["Invoices"],
          summary: "Export invoices",
          description:
            "Exports invoices as CSV or JSON. Returns all matching invoices (no pagination).",
          operationId: "exportInvoices",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              required: false,
              schema: { type: "string" },
              description: "Filter by status.",
            },
            {
              name: "include_testnet",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["true", "false"] },
            },
            {
              name: "only_testnet",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["true", "false"] },
            },
            {
              name: "search",
              in: "query",
              required: false,
              schema: { type: "string", maxLength: 200 },
            },
            {
              name: "format",
              in: "query",
              required: false,
              schema: {
                type: "string",
                enum: ["csv", "json"],
                default: "json",
              },
              description: "Export format.",
            },
          ],
          responses: {
            "200": {
              description: "Exported invoices.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      object: { type: "string", example: "list" },
                      data: { type: "array", items: { type: "object" } },
                      total: { type: "integer", example: 42 },
                    },
                  },
                },
              },
              headers: {
                "Content-Type": {
                  schema: { type: "string", example: "text/csv" },
                },
                "Content-Disposition": {
                  schema: {
                    type: "string",
                    example: 'attachment; filename="invoices-1234567890.csv"',
                  },
                },
              },
            },
            "401": {
              description: "Authentication required.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/v1/price/{currency}": {
        get: {
          tags: ["Price"],
          summary: "Get asset price",
          description:
            "Returns the current USD price for a cryptocurrency. Uses CoinGecko (primary) or Binance (fallback).",
          operationId: "getPrice",
          parameters: [
            {
              name: "currency",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Cryptocurrency symbol (e.g., BTC, ETH, LTC).",
            },
          ],
          responses: {
            "200": {
              description: "Current price.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      asset: { type: "string", example: "BTC" },
                      price_usd: { type: "number", example: 67500.0 },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Unable to retrieve price.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          description:
            "Returns service health status. Returns 200 when healthy or degraded, 503 when critical.",
          operationId: "healthCheck",
          security: [],
          responses: {
            "200": {
              description: "Service is healthy or degraded.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: {
                        type: "string",
                        enum: ["ok", "degraded", "unhealthy"],
                        example: "ok",
                      },
                      engine: { type: "string", example: "Knot v0.5.0" },
                      timestamp: { type: "string", format: "date-time" },
                      uptime: { type: "number", example: 12345.67 },
                      selfHosted: { type: "boolean", example: false },
                      checks: { type: "object" },
                    },
                  },
                },
              },
            },
            "503": {
              description: "Critical dependency (MongoDB) is unreachable.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "unhealthy" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: "Invoices", description: "Invoice lifecycle management." },
      { name: "Price", description: "Real-time cryptocurrency price oracle." },
      { name: "System", description: "Health and monitoring endpoints." },
    ],
  };
}
