# 🚀 Deployment Guide — KnotEngine

KnotEngine uses a **hybrid deployment** approach to balance performance, cost, and reliability.

| Component       | Deployment Platform | Reason                                                              |
| :-------------- | :------------------ | :------------------------------------------------------------------ |
| **Dashboard**   | Vercel              | Automatic CI/CD, global edge caching, Next.js optimization.         |
| **Checkout UI** | Vercel              | Fast loading for customers, edge delivery.                          |
| **API Engine**  | DigitalOcean VPS    | Persistent WebSocket support (Socket.io) and heavy background jobs. |

---

## 🏗️ Prerequisites

### Infrastructure

- **Node.js**: v20.x or higher
- **Package Manager**: pnpm (v9 recommended)
- **Database**: MongoDB v6.0+ (Atlas recommended for production)
- **Cache**: Redis v6.0+
- **Droplet/VPS**: Ubuntu 24.04 (minimum 1GB RAM, 1 vCPU)

### External Services

- **Tatum API Key**: For multi-chain monitoring.
- **Alchemy API Key**: For EVM specific failover.
- **Gmail App Passwords**: For local development testing (free tier).
- **Resend API Key**: For production emails and Magic Links.
- **CoinGecko/Binance**: Public endpoints (no keys required).

---

## 🛠️ Part 1: Backend Deployment (DigitalOcean)

### 1. Initial Setup

```bash
# Install Node.js & pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pnpm pm2

# Clone & Install
git clone https://github.com/qodinger/knotengine.git
cd knotengine
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
# Environment
NODE_ENV=production

# Core
PORT=5050
DATABASE_URL=mongodb+srv://...
REDIS_URL=redis://...

# Security
INTERNAL_SECRET=<GENERATE_WITH_openssl_rand_hex_32>
AUTH_SECRET=<GENERATE_WITH_openssl_rand_hex_32>

# URLs
PUBLIC_URL=https://api.yourdomain.com
DASHBOARD_URL=https://dashboard.yourdomain.com
CHECKOUT_BASE_URL=https://checkout.yourdomain.com

# Blockchain
BITCOIN_NETWORK=mainnet
TATUM_API_KEY=...
TATUM_WEBHOOK_SECRET=...
ALCHEMY_API_KEY=...
ALCHEMY_AUTH_TOKEN=...
ALCHEMY_NOTIFY_WEBHOOK_ID=...
ALCHEMY_WEBHOOK_SIGNING_KEY=...

# Email (Resend for production)
RESEND_API_KEY=...
FROM_EMAIL="KnotEngine <noreply@yourdomain.com>"
```

### 3. Build & Launch

```bash
# Build the API
pnpm build --filter api

# Start with PM2
pm2 start "pnpm --filter api start" --name knot-api
pm2 save
```

---

## 🌐 Part 2: Frontend Deployment (Vercel)

Deploy `apps/dashboard` and `apps/checkout` as separate projects on Vercel.

### Project 1: Dashboard

- **Framework Preset**: Next.js
- **Root Directory**: `apps/dashboard`
- **Build Command**: `pnpm build --filter dashboard`
- **Environment Variables**:
  - `AUTH_SECRET`: Generate a random string.
  - `NEXT_PUBLIC_API_URL`: Your production API URL.

### Project 2: Checkout

- **Framework Preset**: Next.js
- **Root Directory**: `apps/checkout`
- **Build Command**: `pnpm build --filter checkout`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Your production API URL.

---

## 🔒 Post-Deployment Security

1. **Firewall**: Ensure port `5050` is only open to your Nginx proxy or restricted to Vercel's IP ranges if not using a proxy.
2. **Reverse Proxy**: Use Nginx with Certbot (SSL) for `api.yourdomain.com`.
3. **Webhooks**: Update your Alchemy and Tatum dashboards with the new `PUBLIC_URL` for webhooks.
   - `[PUBLIC_URL]/v1/webhooks/alchemy`
   - `[PUBLIC_URL]/v1/webhooks/tatum`

---

## 📊 Monitoring & Maintenance

- **Logs**: Use `pm2 logs knot-api` to monitor production logs.
- **Background Jobs**: The system automatically runs:
  - Invoice Expiration (Every 1 min)
  - Webhook Catchup (Every 5 mins)
  - Billing Cycle (Daily)
- **Updating**:
  ```bash
  git pull
  pnpm install
  pnpm build --filter api
  pm2 restart knot-api
  ```
