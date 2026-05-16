# 🗄️ @qodinger/knot-database

Mongoose models and database utilities for the [KnotEngine](https://github.com/qodinger/knotengine) ecosystem.

## Models

| Model               | Description                                 |
| ------------------- | ------------------------------------------- |
| `User`              | User accounts with OAuth identities         |
| `Merchant`          | Merchant profiles, API keys, webhook config |
| `Invoice`           | Payment invoices with lifecycle tracking    |
| `WebhookEvent`      | Incoming blockchain events from providers   |
| `WebhookDelivery`   | Outgoing webhook delivery attempt logs      |
| `Notification`      | In-app notifications for merchants          |
| `AuditLog`          | Security and system event audit trail       |
| `PromoCode`         | Promotional credit codes                    |
| `TopUpClaim`        | Top-up transaction claims                   |
| `VerificationToken` | Email verification and magic link tokens    |

## Features

- **TTL Auto-Cleanup**: 30-day TTL on notifications and webhook events
- **90-day TTL**: Webhook delivery logs auto-pruned after 90 days
- **Compound Indexes**: Optimized queries for webhook retries and invoice lookups
- **Type Safety**: Full TypeScript interfaces for all models

## Usage

```typescript
import { Invoice, Merchant, connectToDatabase } from "@qodinger/knot-database";

await connectToDatabase("mongodb://localhost:27017/knotengine");

// Create an invoice
const invoice = await Invoice.create({
  invoiceId: "inv_abc123",
  merchantId: "mid_xyz789",
  amountUsd: 49.99,
  cryptoCurrency: "BTC",
  status: "pending",
});

// Find merchant
const merchant = await Merchant.findOne({ merchantId: "mid_xyz789" });
```

## License

AGPL-3.0
