# 🚀 KnotEngine

**Minimalist, Non-Custodial Crypto Payment Infrastructure for Humans.**

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/qodinger/knotengine/releases)
[![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0-orange.svg)](https://pnpm.io)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

KnotEngine is a professional-grade, open-source crypto payment gateway. It lets developers accept Bitcoin, Ethereum, and stablecoins without ever losing custody of their private keys. Every invoice generates a unique on-chain address — funds flow directly to your wallet, never through KnotEngine's servers.

---

## ✨ Features

- **🛡️ 100% Non-Custodial** — HD Wallet derivation (BIP44) sends funds straight to your cold or hot wallet.
- **🔐 Enterprise-Grade Security** — Two-Factor Authentication (TOTP), `mid_` prefixed Merchant IDs, and HMAC-signed webhooks.
- **🚥 High Availability** — Dual-provider blockchain monitoring (Tatum + Alchemy) with automatic failover.
- **📊 Professional Dashboard** — Modular Next.js merchant console with real-time Analytics and Activity History.
- **⚡ Instant Alerts** — Mempool detection and confirmation notifications pushed instantly via Socket.io.
- **🔌 Developer-First SDK** — Typed `@qodinger/knot-sdk` with full TypeScript support.
- **✉️ Hybrid Email Engine** — Resend for production deliverability and Gmail SMTP for frictionless local development.
- **🧹 Automatic Cleanup** — 30-day TTL policy on notification and webhook event collections keeps your database lean.

---

## 🛠️ Prerequisites

- **Node.js** v20 or later
- **pnpm** `npm install -g pnpm`
- **Docker** (for running MongoDB and Redis locally)

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/qodinger/knotengine.git
cd knotengine
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

| Variable          | Description                           |
| :---------------- | :------------------------------------ |
| `DATABASE_URL`    | MongoDB connection string             |
| `TATUM_API_KEY`   | Tatum provider key (primary monitor)  |
| `ALCHEMY_API_KEY` | Alchemy key (EVM redundancy provider) |
| `JWT_SECRET`      | Random secret for session signing     |
| `INTERNAL_SECRET` | Shared secret between API & Dashboard |

### 3. Start Infrastructure

```bash
pnpm docker:up
```

This starts **MongoDB** and **Redis** via plain Docker containers (no Compose required).

### 4. Launch All Services

```bash
pnpm dev
```

Or run services individually:

| Command              | Service     | Port |
| :------------------- | :---------- | :--- |
| `pnpm dev:api`       | API Engine  | 5050 |
| `pnpm dev:checkout`  | Checkout UI | 5051 |
| `pnpm dev:dashboard` | Dashboard   | 5052 |

---

## 📡 Port Mapping

| Service         | Port | Description                  |
| :-------------- | :--- | :--------------------------- |
| **API Engine**  | 5050 | Core API & Socket.io Server  |
| **Checkout UI** | 5051 | Customer-facing payment page |
| **Dashboard**   | 5052 | Merchant Console & Analytics |

---

## 🛒 Integration Guide

### 1. Set Up Your Merchant Account

Open the **Dashboard** at `http://localhost:5052`, register, and configure:

- Your settlement wallet address (BTC xPub or EVM address)
- Your webhook endpoint URL
- Two-Factor Authentication (optional but recommended)

### 2. Install the SDK

```bash
npm install @qodinger/knot-sdk
# or
pnpm add @qodinger/knot-sdk
```

### 3. Create an Invoice

```javascript
import { KnotClient } from "@qodinger/knot-sdk";

const knot = new KnotClient({
  apiKey: "knot_sk_your_api_key",
  baseUrl: "http://localhost:5050", // default for dev
});

const invoice = await knot.createInvoice({
  amount_usd: 49.99,
  currency: "BTC",
  metadata: { orderId: "order_abc123" },
});

// Redirect customer to the hosted checkout page
console.log(invoice.checkout_url);
```

### 4. Verify Webhooks

```javascript
const isValid = knot.verifyWebhook(rawBody, signature);
if (!isValid) return res.status(401).send("Invalid signature");
```

---

## 🧪 Testing & Simulation

Run the full test suite:

```bash
pnpm test
```

To test local webhooks via a public tunnel:

```bash
pnpm tunnel  # Uses cloudflared to expose localhost:5050
```

Use the **Simulator** tab in the Dashboard to trigger test payment events (Mempool → Confirming → Confirmed) against any active testnet invoice.

---

## 💰 Transparent Pricing

| Plan             | Transaction Fee | Monthly Cost | Support               |
| :--------------- | :-------------- | :----------- | :-------------------- |
| **Starter**      | 1.0%            | $0           | Community             |
| **Professional** | 0.5%            | $39          | Email (1-2 days)      |
| **Enterprise**   | 0.25%           | $149         | Priority Inbox + Call |

**No hidden spreads. No recapture mechanics.** Merchants receive 100% of invoice value; fees are transparently deducted from prepaid credit balance.

See [PRICING_MODEL.md](PRICING_MODEL.md) for details.

---

## 🏗️ Project Structure

```
knotengine/
├── apps/
│   ├── api/          # Fastify-based payment engine (Port 5050)
│   ├── checkout/     # Next.js customer payment interface (Port 5051)
│   └── dashboard/    # Next.js merchant console (Port 5052)
└── packages/
    ├── crypto/       # BIP32/BIP44 HD wallet derivation engine
    ├── database/     # Mongoose models with TTL auto-pruning
    ├── types/        # Shared TypeScript definitions
    └── sdk/          # Official @qodinger/knot-sdk
```

---

## 🏠 Self-Hosting

KnotEngine is fully self-hostable under the AGPL-3.0 license. Deploy everything on a single VPS with one command.

### Minimum Requirements

| Resource | Minimum                  | Recommended  |
| :------- | :----------------------- | :----------- |
| CPU      | 1 vCPU                   | 2 vCPU       |
| RAM      | 1 GB                     | 2 GB         |
| Disk     | 10 GB                    | 20 GB        |
| OS       | Ubuntu 24.04 / Debian 12 | Alpine Linux |

### Quick Deploy

```bash
# 1. Clone the repository
git clone https://github.com/qodinger/knotengine.git
cd knotengine

# 2. Configure environment
cp .env.production .env
# Edit .env and replace all <placeholder> values with your secrets

# 3. Generate secrets
openssl rand -hex 32  # for JWT_SECRET, WEBHOOK_SECRET, etc.

# 4. Build and start everything
docker compose -f docker-compose.prod.yml up -d --build
```

### Services

| Service   | URL                       | Port  |
| :-------- | :------------------------ | :---- |
| API       | `http://your-server:5050` | 5050  |
| Dashboard | `http://your-server:5052` | 5052  |
| Checkout  | `http://your-server:5051` | 5051  |
| MongoDB   | Internal (not exposed)    | 27017 |
| Redis     | Internal (not exposed)    | 6379  |

### Reverse Proxy (Recommended)

Set up Nginx with SSL to route traffic:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # WebSocket support
    }
}

server {
    listen 80;
    server_name dashboard.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5052;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name checkout.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:5051;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then add SSL with Certbot:

```bash
sudo certbot --nginx -d api.yourdomain.com -d dashboard.yourdomain.com -d checkout.yourdomain.com
```

### Management

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f api

# Restart a service
docker compose -f docker-compose.prod.yml restart dashboard

# Update to latest version
git pull && docker compose -f docker-compose.prod.yml up -d --build

# Stop everything
docker compose -f docker-compose.prod.yml down
```

---

## 🤝 Contributing

Contributions are welcome! Please follow [Conventional Commits](https://www.conventionalcommits.org) for all commit messages — enforced via `commitlint`.

```bash
git checkout -b feat/my-feature
# ... make changes ...
git commit -m "feat(api): add support for Lightning Network"
git push origin feat/my-feature
```

Open a Pull Request to the `main` branch.

---

## 📄 License

KnotEngine is licensed under the [GNU Affero General Public License v3.0](LICENSE).
