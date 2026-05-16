# Integration Guide

> Learn how to integrate KnotEngine into your application to accept cryptocurrency payments.

## Quick Start

### 1. Install the SDK

```bash
npm install @qodinger/knot-sdk
```

### 2. Initialize the Client

```typescript
import { KnotClient } from "@qodinger/knot-sdk";

const knot = new KnotClient({
  apiKey: process.env.KNOT_API_KEY!,
  baseUrl: process.env.KNOT_API_URL || "http://localhost:5050",
  webhookSecret: process.env.KNOT_WEBHOOK_SECRET,
});
```

### 3. Create an Invoice

```typescript
// In your checkout handler
app.post("/checkout", async (req, res) => {
  const { amount, currency } = req.body;

  const invoice = await knot.createInvoice({
    amount_usd: amount,
    currency: currency || "BTC",
    metadata: {
      orderId: generateOrderId(),
      customerId: req.user.id,
    },
  });

  // Redirect to hosted checkout
  res.json({ checkout_url: invoice.checkout_url });
});
```

### 4. Handle Webhooks

```typescript
// In your webhook endpoint
app.post("/webhooks/knot", async (req, res) => {
  const signature = req.headers["x-knot-signature"] as string;
  const rawBody = req.rawBody; // Important: use raw body, not parsed JSON

  // Verify signature
  if (!knot.verifyWebhook(rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  const event = JSON.parse(rawBody);

  switch (event.event) {
    case "invoice.confirmed":
      await fulfillOrder(event.metadata.orderId);
      break;
    case "invoice.mempool_detected":
      await notifyCustomer(event.invoice_id, "Payment detected");
      break;
    case "invoice.expired":
      await cancelOrder(event.metadata.orderId);
      break;
  }

  res.status(200).send("OK");
});
```

---

## Complete Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Your App   │     │ KnotEngine  │     │  Customer   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  POST /v1/invoices│                   │
       │──────────────────>│                   │
       │                   │                   │
       │  Invoice Response │                   │
       │<──────────────────│                   │
       │  {checkout_url}   │                   │
       │                   │                   │
       │  Redirect customer│                   │
       │───────────────────────────────────────>│
       │                   │                   │
       │                   │  Customer pays    │
       │                   │<──────────────────│
       │                   │                   │
       │                   │  Blockchain       │
       │                   │  detects payment  │
       │                   │                   │
       │  POST webhook     │                   │
       │<──────────────────│                   │
       │  {event:          │                   │
       │   "confirmed"}    │                   │
       │                   │                   │
       │  Fulfill order    │                   │
       │                   │                   │
```

---

## Self-Hosting

### Docker Compose

Use the provided `docker-compose.yml` in the repository root:

```bash
git clone https://github.com/qodinger/knotengine.git
cd knotengine
cp .env.production .env
# Edit .env with your Tatum/Alchemy API keys
docker compose up -d --build
```

Or use the one-line install script:

```bash
curl -fsSL https://raw.githubusercontent.com/qodinger/knotengine/main/scripts/install.sh | bash
```

### Environment Variables

| Variable          | Description                             | Required |
| ----------------- | --------------------------------------- | -------- |
| `MONGO_USER`      | MongoDB username                        | Yes      |
| `MONGO_PASSWORD`  | MongoDB password                        | Yes      |
| `MONGO_DB`        | MongoDB database name                   | Yes      |
| `REDIS_PASSWORD`  | Redis password                          | Yes      |
| `TATUM_API_KEY`   | Tatum API key for blockchain monitoring | Yes      |
| `ALCHEMY_API_KEY` | Alchemy API key (failover)              | Yes      |
| `BTC_XPUB`        | Bitcoin extended public key             | Yes      |
| `LTC_XPUB`        | Litecoin extended public key            | Yes      |
| `ETH_ADDRESS`     | Ethereum static address                 | Yes      |
| `WEBHOOK_SECRET`  | HMAC secret for signing webhooks        | Yes      |
| `INTERNAL_SECRET` | Secret for internal API communication   | Yes      |
| `JWT_SECRET`      | Secret for session signing              | Yes      |

```bash
curl -fsSL https://raw.githubusercontent.com/qodinger/knotengine/main/scripts/install.sh | bash
```

---

## Configuration

### Supported Currencies

| Currency     | Network  | Confirmations | Type           |
| ------------ | -------- | ------------- | -------------- |
| BTC          | Bitcoin  | 2             | HD Wallet      |
| LTC          | Litecoin | 6             | HD Wallet      |
| ETH          | Ethereum | 12            | Static Address |
| USDT_ERC20   | Ethereum | 12            | Static Address |
| USDT_POLYGON | Polygon  | 30            | Static Address |
| USDC_ERC20   | Ethereum | 12            | Static Address |
| USDC_POLYGON | Polygon  | 30            | Static Address |

---

## Security Best Practices

1. **Never expose API keys** — Only use `knot_sk_live_...` keys server-side
2. **Always verify webhooks** — Use `verifyWebhook()` before processing events
3. **Use IP allowlisting** — Restrict API access to your server IPs
4. **Rotate keys regularly** — Use `rotateApiKey()` periodically
5. **Enable 2FA** — Protect your merchant account with TOTP

---

## Error Handling

### SDK Errors

```typescript
import {
  KnotClient,
  KnotAuthenticationError,
  KnotValidationError,
  KnotRateLimitError,
  KnotNotFoundError,
} from "@qodinger/knot-sdk";

try {
  const invoice = await knot.createInvoice({ ... });
} catch (error) {
  if (error instanceof KnotAuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof KnotValidationError) {
    console.error("Invalid parameters:", error.details);
  } else if (error instanceof KnotRateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof KnotNotFoundError) {
    console.error("Invoice not found");
  } else {
    console.error("Unknown error:", error);
  }
}
```

---

## Testing

### Testnet Mode

Create testnet invoices to test without real funds:

```typescript
const invoice = await knot.createInvoice({
  amount_usd: 10.0,
  currency: "BTC",
  is_testnet: true, // Use testnet
});
```

### Test Webhooks

Send a test webhook to verify your endpoint:

```typescript
const result = await knot.sendTestWebhook();
console.log(result.message);
```

---

## Troubleshooting

### Webhook Not Received

1. Check your webhook URL is accessible from the internet
2. Verify the URL in Dashboard → Developers → Webhooks
3. Check webhook delivery logs in Dashboard → Developers → Webhooks → Delivery Logs
4. Use the "Test" button to send a test webhook

### Invoice Not Confirming

1. Check blockchain provider status (Tatum/Alchemy)
2. Verify confirmations required for the currency
3. Check the invoice status via `GET /v1/invoices/:id`

### Rate Limited

- Starter: 60 req/min
- Professional: 300 req/min
- Enterprise: 600 req/min

Implement exponential backoff when rate limited:

```typescript
async function createWithRetry(data: CreateInvoiceRequest, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await knot.createInvoice(data);
    } catch (error) {
      if (error instanceof KnotRateLimitError && error.retryAfter) {
        await sleep(error.retryAfter * 1000);
      } else {
        throw error;
      }
    }
  }
}
```

---

## Support

- **Documentation:** See [API Reference](./API_REFERENCE.md) and [SDK README](../packages/sdk/README.md)
- **GitHub:** https://github.com/qodinger/knotengine
- **SDK:** `@qodinger/knot-sdk` on npm
