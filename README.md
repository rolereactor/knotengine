<p align="center">
  <h1 align="center">KnotEngine</h1>
  <p align="center">
    <strong>Minimalist, Non-Custodial Crypto Payment Infrastructure</strong>
  </p>
  <p align="center">
    Accept Bitcoin, Ethereum & stablecoins without ever touching private keys.
  </p>
</p>

<p align="center">
  <a href="https://github.com/qodinger/knotengine/releases"><img src="https://img.shields.io/github/v/release/qodinger/knotengine?color=blue&label=version&style=flat-square" alt="Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-green?style=flat-square" alt="License" /></a>
  <a href="https://pnpm.io"><img src="https://img.shields.io/badge/pnpm-9.0.0-orange?style=flat-square" alt="pnpm" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%E2%89%A520-brightgreen?style=flat-square" alt="Node.js" /></a>
  <a href="https://github.com/qodinger/knotengine/actions"><img src="https://img.shields.io/github/actions/workflow/status/qodinger/knotengine/ci.yml?branch=main&style=flat-square" alt="CI" /></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-integration">Integration</a> •
  <a href="#-docs">Docs</a> •
  <a href="#-self-hosting">Self-Hosting</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## What is KnotEngine?

KnotEngine is an open-source crypto payment gateway that lets you accept crypto payments **without custody**. Every invoice generates a unique on-chain address — funds flow directly to your wallet, never through our servers.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Customer   │────▶│  Checkout UI │────▶│  Blockchain     │
│  (Browser)  │     │  (Port 5051) │     │  (BTC/ETH/etc)  │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
┌─────────────┐     ┌──────────────┐     ┌────────▼────────┐
│  Merchant   │◀────│   Dashboard  │◀────│   API Engine    │
│  (Wallet)   │     │  (Port 5052) │     │   (Port 5050)   │
└─────────────┘     └──────────────┘     └─────────────────┘
```

**You keep your keys. We handle the rest.**

---

## ✨ Features

| Category            | Feature                                                            |
| ------------------- | ------------------------------------------------------------------ |
| **🔐 Security**     | HD Wallet derivation (BIP44), 2FA (TOTP), HMAC-signed webhooks     |
| **⚡ Real-time**    | Mempool detection, Socket.io push notifications, instant alerts    |
| **🚥 Reliability**  | Dual-provider monitoring (Tatum + Alchemy) with automatic failover |
| **📊 Dashboard**    | Analytics, payment history, webhook logs, merchant settings        |
| **🔌 Developer**    | Typed SDK (`@qodinger/knot-sdk`), full TypeScript support          |
| **🏠 Self-Host**    | One-command deploy on any VPS with Docker Compose                  |
| **✉️ Email**        | Hybrid engine: Resend (prod) + Gmail SMTP (dev)                    |
| **🧹 Auto-Cleanup** | 30-day TTL on notifications and webhook events                     |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** (`npm install -g pnpm`)
- **Docker** (for MongoDB & Redis)

### 1. Clone & Install

```bash
git clone https://github.com/qodinger/knotengine.git
cd knotengine
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` with your keys:

| Variable             | Description                   |
| -------------------- | ----------------------------- |
| `DATABASE_URL`       | MongoDB connection string     |
| `TATUM_API_KEY`      | Primary blockchain monitor    |
| `ALCHEMY_API_KEY`    | EVM failover provider         |
| `INTERNAL_SECRET`    | API ↔ Dashboard shared secret |
| `AUTH_SECRET`        | NextAuth session secret       |
| `GMAIL_USER`         | Email sender (dev)            |
| `GMAIL_APP_PASSWORD` | Gmail app password (dev)      |
| `RESEND_API_KEY`     | Email API (production)        |

### 3. Start

```bash
pnpm docker:up    # Start MongoDB & Redis
pnpm dev          # Start all apps (API, Checkout, Dashboard)
```

Everything runs locally:

| Service     | URL                     | Port |
| ----------- | ----------------------- | ---- |
| API Engine  | `http://localhost:5050` | 5050 |
| Checkout UI | `http://localhost:5051` | 5051 |
| Dashboard   | `http://localhost:5052` | 5052 |

> **Stop:** Press `Ctrl+C` to stop apps, then `pnpm docker:down` for infrastructure.

---

## 🔌 Integration

### Install SDK

```bash
npm install @qodinger/knot-sdk
# or
pnpm add @qodinger/knot-sdk
```

### Create Invoice

```typescript
import { KnotClient } from "@qodinger/knot-sdk";

const knot = new KnotClient({
  apiKey: "knot_sk_your_api_key",
  baseUrl: "http://localhost:5050",
});

const invoice = await knot.createInvoice({
  amount_usd: 49.99,
  currency: "BTC",
  metadata: { orderId: "order_abc123" },
});

// Redirect customer to checkout
console.log(invoice.checkout_url);
```

### Handle Webhooks

```typescript
app.post("/webhooks/knot", (req, res) => {
  const signature = req.headers["x-knot-signature"];
  const rawBody = JSON.stringify(req.body);

  if (!knot.verifyWebhook(rawBody, signature)) {
    return res.status(401).send("Invalid signature");
  }

  const { event, invoice_id } = req.body;
  if (event === "invoice.confirmed") {
    // Fulfill order
    console.log(`Payment confirmed: ${invoice_id}`);
  }

  res.status(200).send("OK");
});
```

### SDK Methods

| Method                  | Description                    |
| ----------------------- | ------------------------------ |
| `createInvoice()`       | Create a new payment invoice   |
| `listInvoices()`        | List all invoices with filters |
| `cancelInvoice()`       | Cancel a pending invoice       |
| `resolveInvoice()`      | Manually mark as paid          |
| `getMerchant()`         | Get merchant profile           |
| `updateMerchant()`      | Update merchant settings       |
| `rotateApiKey()`        | Rotate API key securely        |
| `rotateWebhookSecret()` | Rotate webhook signing secret  |
| `sendTestWebhook()`     | Test webhook endpoint          |
| `getAssetConfig()`      | Get supported currencies       |
| `getMerchantStats()`    | Get merchant analytics         |

---

## 📚 Docs

| Resource                                       | Description                      |
| ---------------------------------------------- | -------------------------------- |
| [API Reference](docs/API_REFERENCE.md)         | All endpoints, schemas, examples |
| [Integration Guide](docs/INTEGRATION_GUIDE.md) | Step-by-step payment flow        |
| [SDK README](packages/sdk/README.md)           | Full SDK API reference           |
| [Contributing](CONTRIBUTING.md)                | Dev setup & PR guidelines        |
| [Changelog](CHANGELOG.md)                      | Version history                  |

---

## 🏠 Self-Hosting

Deploy on any VPS with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/qodinger/knotengine/main/scripts/install.sh | bash
```

### Requirements

| Resource | Minimum                  | Recommended  |
| -------- | ------------------------ | ------------ |
| CPU      | 1 vCPU                   | 2 vCPU       |
| RAM      | 1 GB                     | 2 GB         |
| Disk     | 10 GB                    | 20 GB        |
| OS       | Ubuntu 24.04 / Debian 12 | Alpine Linux |

### Manual Setup

```bash
git clone https://github.com/qodinger/knotengine.git
cd knotengine
cp .env.production.example .env  # fill in your secrets
docker compose up -d --build
```

### Services

| Service   | Port  | Notes                   |
| --------- | ----- | ----------------------- |
| API       | 5050  | Core engine + WebSocket |
| Dashboard | 5052  | Merchant console        |
| Checkout  | 5051  | Customer payment page   |
| MongoDB   | 27017 | Internal only           |
| Redis     | 6379  | Internal only           |

### Management

```bash
docker compose logs -f api      # View logs
docker compose restart dashboard # Restart service
git pull && docker compose up -d --build  # Update
docker compose down             # Stop all
```

---

## 🏗️ Architecture

```
knotengine/
├── apps/
│   ├── api/          # Fastify payment engine (5050)
│   ├── checkout/     # Next.js customer UI (5051)
│   └── dashboard/    # Next.js merchant console (5052)
├── packages/
│   ├── crypto/       # BIP32/BIP44 HD wallet derivation
│   ├── database/     # Mongoose models + TTL cleanup
│   ├── types/        # Shared TypeScript definitions
│   └── sdk/          # @qodinger/knot-sdk
├── docs/             # API reference & guides
├── scripts/          # Deploy & utility scripts
└── .github/          # CI/CD workflows
```

---

## 🤝 Contributing

We welcome contributions! Please follow [Conventional Commits](https://www.conventionalcommits.org):

```bash
git checkout -b feat/lightning-network
# ... make changes ...
git commit -m "feat(api): add Lightning Network support"
git push origin feat/lightning-network
```

Open a PR to `main`. CI runs lint, tests, and Docker build automatically.

---

## 📄 License

[AGPL-3.0](LICENSE) — Free to use, modify, and self-host.

---
