# 🧶 @qodinger/knot-sdk

The official Node.js SDK for [KnotEngine](https://github.com/qodinger/knotengine) — a minimalist, non-custodial crypto payment gateway.

[![npm version](https://img.shields.io/npm/v/@qodinger/knot-sdk)](https://www.npmjs.com/package/@qodinger/knot-sdk)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)](../../LICENSE)

## 🚀 Installation

```bash
npm install @qodinger/knot-sdk
# or
pnpm add @qodinger/knot-sdk
```

## 🛠️ Usage

### Initialize the Client

```typescript
import { KnotClient } from "@qodinger/knot-sdk";

const knot = new KnotClient({
  // Use knot_sk_live_... for production or knot_sk_test_... for development
  apiKey: "knot_sk_your_api_key",
  // In production, point to your deployed API: https://api.yourdomain.com
  baseUrl: process.env.KNOT_API_URL || "http://localhost:5050",
  // Optional: set the webhook secret for signature verification
  webhookSecret: "knot_wh_your_webhook_secret",
  // Optional: request timeout in milliseconds (default: 30000)
  timeout: 30000,
});
```

### Create an Invoice

```typescript
const invoice = await knot.createInvoice({
  amount_usd: 49.99,
  currency: "BTC", // or "ETH", "LTC", "USDT_ERC20", "USDT_POLYGON", "USDC_ERC20", "USDC_POLYGON"
  metadata: {
    orderId: "order_12345",
  },
  ttl_minutes: 30, // optional: invoice TTL (15-1440 min, default 30)
  description: "Payment for order #12345", // optional
  is_testnet: false, // optional: use testnet for testing
});

console.log(`Invoice ID: ${invoice.invoice_id}`);
console.log(`Pay to: ${invoice.pay_address}`);
console.log(`Amount: ${invoice.crypto_amount} ${invoice.crypto_currency}`);
console.log(`Checkout: ${invoice.checkout_url}`);
```

### Get Invoice Status

```typescript
const invoice = await knot.getInvoice("inv_abc123...");
console.log(`Status: ${invoice.status}`);
// Status can be: "pending", "mempool_detected", "confirming", "confirmed", "expired", "failed"
```

### List Invoices

```typescript
const { invoices, total, page, limit } = await knot.listInvoices({
  status: "confirmed",
  page: 1,
  limit: 20,
  include_testnet: false,
});

console.log(`Found ${total} invoices`);
```

### Cancel an Invoice

```typescript
const cancelled = await knot.cancelInvoice("inv_abc123...");
console.log(`Invoice status: ${cancelled.status}`); // "expired"
```

### Merchant Management

```typescript
// Get merchant profile
const merchant = await knot.getMerchant();
console.log(`Merchant ID: ${merchant.merchant_id}`);

// Update merchant settings
await knot.updateMerchant({
  webhook_url: "https://yourdomain.com/webhooks/knot",
  branding: {
    name: "My Store",
    color: "#ffffff",
  },
});

// Get dashboard stats
const stats = await knot.getMerchantStats("7d"); // "24h", "7d", or "30d"

// Rotate API key (old key is immediately invalidated)
const newKey = await knot.rotateApiKey();
console.log(`New API key: ${newKey.key}`); // Only shown once!

// Rotate webhook secret
const newSecret = await knot.rotateWebhookSecret();
console.log(`New webhook secret: ${newSecret.secret}`);

// Send a test webhook
const result = await knot.sendTestWebhook();
console.log(`Test webhook: ${result.message}`);
```

### Get Supported Assets

```typescript
const config = await knot.getAssetConfig();
console.log(config.currencies); // ["BTC", "LTC", "ETH", "USDT_ERC20", ...]
console.log(config.networks); // ["bitcoin", "litecoin", "ethereum", "polygon"]
```

### Verify a Webhook Signature

```typescript
// In your webhook endpoint handler:
const isValid = knot.verifyWebhook(rawBody, signature);

// Or pass the secret manually
const isValidManual = knot.verifyWebhook(rawBody, signature, "knot_wh_secret");

if (!isValid) {
  return res.status(401).send("Unauthorized");
}

// Handle the verified event
const event = JSON.parse(rawBody);
if (event.event === "invoice.confirmed") {
  // Fulfill the order
  console.log(`Payment confirmed for invoice: ${event.invoice_id}`);
}
```

## 📦 API Reference

### `KnotClient` Class

| Method                                 | Description                   | Returns                            |
| -------------------------------------- | ----------------------------- | ---------------------------------- |
| `createInvoice(data)`                  | Create a new payment invoice  | `Promise<InvoiceResponse>`         |
| `getInvoice(invoiceId)`                | Get invoice status            | `Promise<InvoiceResponse>`         |
| `listInvoices(params?)`                | List invoices with pagination | `Promise<ListInvoicesResponse>`    |
| `cancelInvoice(invoiceId)`             | Cancel a pending invoice      | `Promise<InvoiceResponse>`         |
| `resolveInvoice(invoiceId)`            | Manually confirm an invoice   | `Promise<InvoiceResponse>`         |
| `getMerchant()`                        | Get merchant profile          | `Promise<MerchantProfile>`         |
| `updateMerchant(data)`                 | Update merchant settings      | `Promise<MerchantProfile>`         |
| `rotateApiKey()`                       | Generate new API key          | `Promise<ApiKeyResponse>`          |
| `rotateWebhookSecret()`                | Generate new webhook secret   | `Promise<WebhookSecretResponse>`   |
| `sendTestWebhook()`                    | Send test webhook             | `Promise<{success, message}>`      |
| `getAssetConfig()`                     | Get supported currencies      | `Promise<AssetConfig>`             |
| `getMerchantStats(period?)`            | Get dashboard stats           | `Promise<Record<string, unknown>>` |
| `verifyWebhook(payload, sig, secret?)` | Verify webhook HMAC signature | `boolean`                          |

### Error Classes

| Class                     | HTTP Status | Description                                 |
| ------------------------- | ----------- | ------------------------------------------- |
| `KnotError`               | Any         | Base error class                            |
| `KnotAuthenticationError` | 401         | Invalid or missing API key                  |
| `KnotValidationError`     | 400         | Invalid request parameters                  |
| `KnotNotFoundError`       | 404         | Resource not found                          |
| `KnotRateLimitError`      | 429         | Rate limit exceeded (includes `retryAfter`) |

### Constants

```typescript
import {
  WEBHOOK_EVENTS,
  CURRENCIES,
  INVOICE_STATUSES,
} from "@qodinger/knot-sdk";

// Webhook event types
WEBHOOK_EVENTS.INVOICE_CONFIRMED; // "invoice.confirmed"
WEBHOOK_EVENTS.INVOICE_MEMPOOL_DETECTED; // "invoice.mempool_detected"
WEBHOOK_EVENTS.INVOICE_CONFIRMING; // "invoice.confirming"
WEBHOOK_EVENTS.INVOICE_EXPIRED; // "invoice.expired"
WEBHOOK_EVENTS.INVOICE_FAILED; // "invoice.failed"
WEBHOOK_EVENTS.INVOICE_PARTIALLY_PAID; // "invoice.partially_paid"
WEBHOOK_EVENTS.INVOICE_OVERPAID; // "invoice.overpaid"

// Supported currencies
CURRENCIES.BTC; // "BTC"
CURRENCIES.LTC; // "LTC"
CURRENCIES.ETH; // "ETH"
CURRENCIES.USDT_ERC20; // "USDT_ERC20"
CURRENCIES.USDT_POLYGON; // "USDT_POLYGON"
CURRENCIES.USDC_ERC20; // "USDC_ERC20"
CURRENCIES.USDC_POLYGON; // "USDC_POLYGON"

// Invoice statuses
INVOICE_STATUSES.PENDING; // "pending"
INVOICE_STATUSES.MEMPOOL_DETECTED; // "mempool_detected"
INVOICE_STATUSES.CONFIRMING; // "confirming"
INVOICE_STATUSES.CONFIRMED; // "confirmed"
INVOICE_STATUSES.EXPIRED; // "expired"
INVOICE_STATUSES.FAILED; // "failed"
```

## 🔀 Complete Payment Flow

```
1. Create Invoice
   const invoice = await knot.createInvoice({ amount_usd: 49.99, currency: "BTC" });
   ↓
2. Redirect customer to checkout
   res.redirect(invoice.checkout_url);
   ↓
3. Customer pays crypto to invoice.pay_address
   ↓
4. KnotEngine detects payment via blockchain provider
   ↓
5. Receive webhook notification
   POST https://yourdomain.com/webhooks/knot
   ↓
6. Verify webhook & fulfill order
   if (knot.verifyWebhook(body, sig) && event.event === "invoice.confirmed") {
     fulfillOrder(event.metadata.orderId);
   }
```

## 🛡️ Trust & Security

KnotEngine is strictly **non-custodial**. This SDK interacts with the KnotEngine API to manage invoices and merchant configurations, but **never handles your private keys or seed phrases**. All funds are derived from your public `xPub` and deposited directly into your wallet.

### Security Best Practices

1. **Never expose your API key** — only use `knot_sk_live_...` keys server-side
2. **Always verify webhook signatures** — use `verifyWebhook()` before processing events
3. **Use IP allowlisting** — restrict API access to your server IPs via dashboard
4. **Rotate keys regularly** — use `rotateApiKey()` and `rotateWebhookSecret()` periodically
5. **Enable 2FA** — protect your merchant account with TOTP two-factor authentication

## 📄 License

AGPL-3.0 — see [LICENSE](../../LICENSE) for details.
