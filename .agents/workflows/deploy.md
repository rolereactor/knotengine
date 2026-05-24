---
description: How to deploy KnotEngine to production (Vercel + DigitalOcean)
---

# KnotEngine Deployment Workflow

This project uses a **hybrid deployment** strategy:

- **Vercel** → `apps/dashboard` and `apps/checkout` (Next.js frontends)
- **DigitalOcean Droplet** → `apps/api` (Fastify + Socket.io + background jobs)

---

## 🏗️ Architecture Options for the API

| Feature          | Option A: Professional (Domain) | Option B: Fast & Free (No Domain)  |
| :--------------- | :------------------------------ | :--------------------------------- |
| **URL Type**     | `https://api.yourdomain.com`    | `https://unique-id.ngrok-free.dev` |
| **Connectivity** | Nginx Reverse Proxy             | Ngrok Static Tunnel                |
| **SSL/HTTPS**    | Certbot (Manual setup)          | Ngrok (Automatic)                  |
| **Requirement**  | Owning a domain                 | Ngrok Free Account                 |

---

## Part 1: Initial VPS Setup (Same for both)

### Step 1: Create a Droplet

1. Create an Ubuntu 24.04 Droplet (SGP1 region recommended).
2. SSH into your droplet: `ssh root@YOUR_IP`.

### Step 2: Install Core Dependencies

```bash
# Node.js 20 & pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pnpm pm2

# Clone & Build
cd /var/www
git clone https://github.com/qodinger/knotengine.git
cd knotengine
pnpm install
pnpm build --filter api
```

### Step 3: Configure Env

```bash
cp .env.production.example .env
nano .env
```

_Fill in your production variables. Set `PUBLIC_URL` to your future Ngrok or Domain URL._

---

## Part 2: Deployment Strategies

### 🚀 Option A: Using Ngrok (No Domain Required)

_Ideal if you don't want to buy a domain or handle Nginx/SSL._

1. **Install Ngrok:**
   ```bash
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list && \
   sudo apt update && sudo apt install ngrok
   ```
2. **Authenticate:**
   - Get your token from [dashboard.ngrok.com](https://dashboard.ngrok.com)
   - `ngrok config add-authtoken YOUR_TOKEN`
3. **Claim your Free Static Domain:**
   - On Ngrok Dashboard, go to **Cloud Edge → Domains** and create your free `ngrok-free.dev` domain.
4. **Deploy with PM2:**

   ```bash
   # Start the API
   pm2 start "pnpm --filter api start" --name knot-api

   # Start the Tunnel
   pm2 start "ngrok http --url=YOUR-ID.ngrok-free.dev 5050" --name ngrok-tunnel

   pm2 save
   ```

---

### 🌐 Option B: Using a Custom Domain (Nginx + SSL)

_Ideal for professional production brands._

1. **Install Nginx:** `apt install -y nginx`
2. **Configure Nginx:** Create `/etc/nginx/sites-available/knot-api`
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       location / {
           proxy_pass http://localhost:5050;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }
   }
   ```
3. **Enable & SSL:**
   ```bash
   ln -s /etc/nginx/sites-available/knot-api /etc/nginx/sites-enabled/
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d api.yourdomain.com
   ```

---

## Part 3: Deploy Frontends to Vercel

1. Create two projects on Vercel pointed to the same repo.
2. **Project 1 (Dashboard):**
   - Root: `apps/dashboard`
   - Build: `pnpm build --filter dashboard`
   - Env: `NEXT_PUBLIC_API_URL=https://your-ngrok-or-domain.dev`
3. **Project 2 (Checkout):**
   - Root: `apps/checkout`
   - Build: `pnpm build --filter checkout`
   - Env: `NEXT_PUBLIC_API_URL=https://your-ngrok-or-domain.dev`

---

## Part 4: Webhook Configuration

Don't forget to update your Webhook URLs in **Alchemy** and **Tatum** to point to your new public API URL:
`https://your-id.ngrok-free.dev/v1/webhooks/alchemy`
