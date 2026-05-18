#!/bin/bash
# ══════════════════════════════════════════════
# KnotEngine — One-Command Self-Host Install
# ══════════════════════════════════════════════
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/qodinger/knotengine/main/scripts/install.sh | bash
# ══════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 KnotEngine Self-Host Installer${NC}"
echo ""

# ── Check Prerequisites ──
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}❌ $1 is required but not installed.${NC}"
    echo "Please install $1 and try again."
    exit 1
  fi
}

check_command "docker"
check_command "docker compose"

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"

# ── Setup Directory ──
INSTALL_DIR="${KNOTENGINE_DIR:-$HOME/knotengine}"

if [ -d "$INSTALL_DIR" ]; then
  echo -e "${YELLOW}⚠️  Directory $INSTALL_DIR already exists${NC}"
  read -p "Use existing directory? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 1
  fi
else
  mkdir -p "$INSTALL_DIR"
  echo -e "${GREEN}📁 Created $INSTALL_DIR${NC}"
fi

cd "$INSTALL_DIR"

# ── Clone or Pull ──
if [ -d ".git" ]; then
  echo -e "${YELLOW}📦 Updating existing installation...${NC}"
  git pull origin main
else
  echo -e "${YELLOW}📦 Cloning KnotEngine...${NC}"
  git clone https://github.com/qodinger/knotengine.git .
fi

# ── Configure Environment ──
if [ ! -f ".env" ]; then
  echo -e "${GREEN}🔧 Creating .env from template...${NC}"
  cp .env.production .env

  # Generate secrets
  JWT_SECRET=$(openssl rand -hex 32)
  WEBHOOK_SECRET=$(openssl rand -hex 32)
  INTERNAL_SECRET="knot_internal_$(openssl rand -hex 16)"
  NEXTAUTH_SECRET="knot_secret_$(openssl rand -hex 16)"
  AUTH_SECRET="knot_auth_$(openssl rand -hex 16)"
  MONGO_PASSWORD=$(openssl rand -hex 16)
  REDIS_PASSWORD=$(openssl rand -hex 16)
  MONGO_USER="knotadmin"

  # Replace placeholders
  sed -i.bak "s/<CHANGE_PASSWORD>/$MONGO_PASSWORD/g" .env
  sed -i.bak "s/<CHANGE_REDIS_PASSWORD>/$REDIS_PASSWORD/g" .env
  sed -i.bak "s/<CHANGE_THIS_TO_A_LONG_RANDOM_STRING>/$JWT_SECRET/g" .env
  sed -i.bak "s/<CHANGE_ADD_YOUR_TATUM_KEY>/your_tatum_api_key/g" .env
  sed -i.bak "s/<CHANGE_ADD_YOUR_WEBHOOK_SECRET>/$WEBHOOK_SECRET/g" .env
  sed -i.bak "s/<CHANGE_ADD_YOUR_ALCHEMY_KEY>/your_alchemy_api_key/g" .env
  sed -i.bak "s/<CHANGE_ADD_YOUR_ETH_ADDRESS>/your_eth_wallet_address/g" .env
  rm -f .env.bak

  echo -e "${GREEN}✅ Secrets generated automatically (SELF_HOSTED=true)${NC}"
  echo -e "${YELLOW}⚠️  Please edit .env and configure:${NC}"
  echo "   - TATUM_API_KEY (get free at https://dashboard.tatum.io)"
  echo "   - ALCHEMY_API_KEY (get free at https://www.alchemy.com)"
  echo "   - PLATFORM_FEE_WALLET_EVM (your Ethereum wallet address)"
  echo "   - PUBLIC_URL (your public domain)"
  echo ""
else
  echo -e "${GREEN}✅ .env already exists, skipping${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env: cd $INSTALL_DIR && nano .env"
echo "     - Add your Tatum API key"
echo "     - Add your Alchemy API key"
echo "     - Add your Ethereum wallet address"
echo "  2. Start services: docker compose up -d --build"
echo "  3. Seed demo data: docker compose exec api node dist/src/scripts/seed.js"
echo "  4. View logs: docker compose logs -f api"
echo ""
echo "Once running:"
echo "  API:       http://localhost:5050"
echo "  Dashboard: http://localhost:5052"
echo "  Checkout:  http://localhost:5051"
