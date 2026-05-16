# KnotEngine API Reference

> **Base URL:** `https://api.yourdomain.com` (or `http://localhost:5050` for local dev)  
> **Authentication:** API key via `x-api-key` header  
> **Content Type:** `application/json`

## Authentication

All authenticated endpoints require an API key passed in the `x-api-key` header:

```bash
curl -H "x-api-key: knot_sk_live_your_key" https://api.yourdomain.com/v1/invoices
```

API keys are prefixed with:

- `knot_sk_live_` — Production keys
- `knot_sk_test_` — Testnet keys

Keys are generated in the Dashboard → Developers → API Keys tab. Each key is shown only once upon creation.

---

## Invoices

### Create Invoice

```
POST /v1/invoices
```

Create a new payment invoice. Requires authentication.

**Request Body:**

| Field         | Type    | Required | Description                                                                             |
| ------------- | ------- | -------- | --------------------------------------------------------------------------------------- |
| `amount_usd`  | number  | Yes      | USD amount (minimum $1.00)                                                              |
| `currency`    | string  | Yes      | One of: `BTC`, `LTC`, `ETH`, `USDT_ERC20`, `USDT_POLYGON`, `USDC_ERC20`, `USDC_POLYGON` |
| `metadata`    | object  | No       | Custom data (e.g., `{ orderId: "12345" }`)                                              |
| `ttl_minutes` | number  | No       | Invoice TTL in minutes (15-1440, default: 30)                                           |
| `description` | string  | No       | Invoice description                                                                     |
| `is_testnet`  | boolean | No       | Use testnet for testing (default: false)                                                |

**Response:**

```json
{
  "invoice_id": "inv_abc123...",
  "amount_usd": 49.99,
  "crypto_amount": 0.00075,
  "crypto_currency": "BTC",
  "pay_address": "bc1q...",
  "status": "pending",
  "checkout_url": "https://checkout.yourdomain.com/checkout/inv_abc123...",
  "expires_at": "2026-05-16T12:00:00Z",
  "created_at": "2026-05-16T11:30:00Z",
  "is_testnet": false
}
```

**Rate Limits:**

- Starter: 60 req/min
- Professional: 300 req/min
- Enterprise: 600 req/min

---

### Get Invoice

```
GET /v1/invoices/:id
```

Get invoice status. **Public endpoint** (no authentication required).

**Response:** Same as Create Invoice response, plus merchant branding info.

---

### List Invoices

```
GET /v1/invoices
```

List invoices for the authenticated merchant. Requires authentication.

**Query Parameters:**

| Parameter         | Type    | Description                                                   |
| ----------------- | ------- | ------------------------------------------------------------- |
| `status`          | string  | Filter by status: `pending`, `confirmed`, `expired`, `failed` |
| `include_testnet` | boolean | Include testnet invoices                                      |
| `only_testnet`    | boolean | Only return testnet invoices                                  |
| `page`            | number  | Page number (default: 1)                                      |
| `limit`           | number  | Items per page (default: 20, max: 100)                        |

**Response:**

```json
{
  "invoices": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

---

### Cancel Invoice

```
POST /v1/invoices/:id/cancel
```

Cancel a pending invoice (sets status to "expired"). Requires authentication.

---

### Resolve Invoice

```
POST /v1/invoices/:id/resolve
```

Manually resolve an invoice to "confirmed" state. Requires authentication.

---

## Merchants

### Get Profile

```
GET /v1/merchants/me
```

Get current merchant profile. Requires authentication.

**Response:**

```json
{
  "merchant_id": "mid_abc123",
  "webhook_url": "https://api.myapp.com/webhooks",
  "currencies": ["BTC", "ETH"],
  "confirmation_policy": { "BTC": 2, "ETH": 12 },
  "branding": { "name": "My Store", "color": "#ffffff" },
  "fee_responsibility": "merchant",
  "created_at": "2026-01-15T10:00:00Z"
}
```

---

### Update Profile

```
PATCH /v1/merchants/me
```

Update merchant settings. Requires authentication.

**Request Body (all fields optional):**

| Field                 | Type     | Description                 |
| --------------------- | -------- | --------------------------- |
| `webhook_url`         | string   | Webhook endpoint URL        |
| `xpub`                | string   | Bitcoin extended public key |
| `currencies`          | string[] | Supported currencies        |
| `confirmation_policy` | object   | Confirmations per currency  |
| `branding`            | object   | Branding settings           |
| `fee_responsibility`  | string   | `"merchant"` or `"client"`  |

---

### Get Stats

```
GET /v1/merchants/me/stats?period=7d
```

Get dashboard statistics. Requires authentication.

**Query Parameters:**

- `period`: `24h`, `7d`, or `30d` (default: `7d`)

**Response:**

```json
{
  "totalVolume": 15000.00,
  "totalInvoices": 150,
  "confirmedInvoices": 120,
  "pendingInvoices": 15,
  "feesAccrued": { "usd": 75.00 },
  "successRate": "80.0%",
  "chartData": [...],
  "topCurrencies": [...]
}
```

---

### Rotate API Key

```
POST /v1/merchants/me/keys
```

Generate new API key (old key is immediately invalidated). Requires authentication.

**Response:**

```json
{
  "key_id": "key_abc123",
  "key": "knot_sk_live_newkey...",
  "created_at": "2026-05-16T12:00:00Z"
}
```

⚠️ The key is shown only once. Store it securely.

---

### Rotate Webhook Secret

```
POST /v1/merchants/me/keys/webhook
```

Generate new webhook secret. Requires authentication.

---

### Send Test Webhook

```
POST /v1/merchants/me/webhooks/test
```

Send a test webhook to configured endpoint. Requires authentication.

---

### Get Webhook Deliveries

```
GET /v1/merchants/me/webhooks/deliveries?page=1&limit=20&status=success
```

List webhook delivery logs. Requires authentication.

**Query Parameters:**

| Parameter   | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| `page`      | number | Page number (default: 1)               |
| `limit`     | number | Items per page (default: 20, max: 100) |
| `status`    | string | Filter: `pending`, `success`, `failed` |
| `invoiceId` | string | Filter by invoice ID                   |

---

### Get Webhook Stats

```
GET /v1/merchants/me/webhooks/stats
```

Get webhook delivery statistics. Requires authentication.

**Response:**

```json
{
  "total": 500,
  "success": 480,
  "failed": 15,
  "pending": 5,
  "successRate": 96.0
}
```

---

### IP Allowlist

```
GET /v1/merchants/me/ip-allowlist
POST /v1/merchants/me/ip-allowlist
```

Manage IP allowlist for API access. Requires authentication.

**POST Body:**

```json
{
  "enabled": true,
  "allowedIps": ["192.168.1.1", "10.0.0.0/8"]
}
```

---

### Additional Endpoints

| Method   | Endpoint                                   | Description                              |
| -------- | ------------------------------------------ | ---------------------------------------- |
| `DELETE` | `/v1/merchants/me`                         | Delete merchant profile                  |
| `POST`   | `/v1/merchants/me/plan`                    | Update subscription plan                 |
| `POST`   | `/v1/merchants/me/topup`                   | Verify and claim top-up credits          |
| `POST`   | `/v1/merchants/me/promo/redeem`            | Redeem promo code                        |
| `GET`    | `/v1/merchants/me/notifications`           | Get notifications                        |
| `PATCH`  | `/v1/merchants/me/notifications/mark-read` | Mark all notifications read              |
| `PATCH`  | `/v1/merchants/me/notifications/:id`       | Mark one notification read               |
| `POST`   | `/v1/merchants/me/charge-plan`             | Charge for plan during grace period      |
| `POST`   | `/v1/merchants/me/wallet/generate-testnet` | Generate testnet wallet                  |
| `POST`   | `/v1/merchants/me/ip-allowlist/validate`   | Validate IP address                      |
| `POST`   | `/v1/merchants/me/keys/generate`           | Generate first API key (OAuth merchants) |
| `POST`   | `/v1/webhooks/simulate`                    | Simulate webhook (dev only)              |
| `GET`    | `/v1/merchants/me/webhooks/deliveries/:id` | Get delivery details                     |
| `GET`    | `/v1/merchants`                            | List all merchants for current user      |

---

## Configuration

### Get Supported Assets

```
GET /v1/config/assets
```

Get supported currencies, networks, and assets. **Public endpoint**.

**Response:**

```json
{
  "assets": {
    "BTC": {
      "symbol": "BTC",
      "network": "bitcoin",
      "type": "hd_wallet",
      "confirmations": 2
    },
    "ETH": {
      "symbol": "ETH",
      "network": "ethereum",
      "type": "static",
      "confirmations": 12
    }
  },
  "networks": ["bitcoin", "litecoin", "ethereum", "polygon"],
  "supportedCurrencies": [
    "BTC",
    "LTC",
    "ETH",
    "USDT_ERC20",
    "USDT_POLYGON",
    "USDC_ERC20",
    "USDC_POLYGON"
  ]
}
```

---

## Health Check

```
GET /health
```

Check API health status. **Public endpoint**.

**Response:**

```json
{
  "status": "ok",
  "engine": "Knot v0.5.0",
  "timestamp": "2026-05-16T12:00:00.000Z",
  "uptime": 3600
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "error_code"
}
```

| HTTP Status | Error Code             | Description                |
| ----------- | ---------------------- | -------------------------- |
| 400         | `validation_error`     | Invalid request parameters |
| 401         | `authentication_error` | Invalid or missing API key |
| 404         | `not_found_error`      | Resource not found         |
| 429         | `rate_limit_error`     | Rate limit exceeded        |
| 500         | `internal_error`       | Server error               |

---

## Webhooks

KnotEngine sends webhook notifications to your configured endpoint when invoice events occur.

### Headers

| Header             | Description                            |
| ------------------ | -------------------------------------- |
| `x-knot-signature` | HMAC-SHA256 signature of the raw body  |
| `x-knot-event`     | Event type (e.g., `invoice.confirmed`) |
| `x-knot-invoice`   | Invoice ID                             |
| `Content-Type`     | `application/json`                     |

### Payload

```json
{
  "id": "evt_abc123...",
  "event": "invoice.confirmed",
  "created": 1700000000,
  "invoice_id": "inv_abc123...",
  "status": "confirmed",
  "amount": {
    "usd": 49.99,
    "crypto": 0.00075,
    "crypto_received": 0.00075,
    "currency": "BTC",
    "fee_usd": 0.5
  },
  "payment": {
    "address": "bc1q...",
    "tx_hash": "0x...",
    "confirmations": 2,
    "paid_at": "2026-05-16T12:00:00Z"
  },
  "metadata": {
    "orderId": "12345"
  }
}
```

### Event Types

| Event                      | Description                            |
| -------------------------- | -------------------------------------- |
| `invoice.confirmed`        | Invoice reached required confirmations |
| `invoice.mempool_detected` | Transaction seen in mempool (0-conf)   |
| `invoice.confirming`       | Invoice is confirming                  |
| `invoice.expired`          | Invoice timed out                      |
| `invoice.failed`           | Invoice unpaid                         |
| `invoice.partially_paid`   | Partial payment received               |
| `invoice.overpaid`         | Overpayment detected                   |

### Retry Policy

- Up to 10 attempts with exponential backoff
- Backoff: 2, 4, 8, 16, 32... minutes
- ~24 hours of total retry time
- First failure triggers a dashboard notification

---

## SDK Usage

Install the SDK:

```bash
npm install @qodinger/knot-sdk
```

Initialize:

```typescript
import { KnotClient } from "@qodinger/knot-sdk";

const knot = new KnotClient({
  apiKey: "knot_sk_live_your_key",
  baseUrl: "https://api.yourdomain.com",
  webhookSecret: "knot_wh_your_secret",
});
```

Create invoice:

```typescript
const invoice = await knot.createInvoice({
  amount_usd: 49.99,
  currency: "BTC",
  metadata: { orderId: "12345" },
});
```

Verify webhook:

```typescript
const isValid = knot.verifyWebhook(rawBody, signature);
```

See [SDK README](../packages/sdk/README.md) for full documentation.
