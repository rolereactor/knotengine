#!/bin/bash

# ══════════════════════════════════════════════
# 🐳 KnotEngine — Docker Services Startup
# Uses plain `docker run` (no compose required)
# ══════════════════════════════════════════════

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🐳 KnotEngine Docker Services${NC}"
echo ""

# ── Check Docker daemon ──
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker daemon is not running!${NC}"
  echo "   Please start Docker Desktop and try again."
  exit 1
fi

# ── MongoDB ──
MONGO_USER="${MONGO_USER:-knotadmin}"
MONGO_PASS="${MONGO_PASS:-knotadmin_local_password}"

if docker ps --format '{{.Names}}' | grep -q '^knotengine_mongo$'; then
  echo -e "${GREEN}✔ MongoDB${NC} already running"
else
  docker rm -f knotengine_mongo > /dev/null 2>&1

  echo -e "${YELLOW}▶ Starting MongoDB 7...${NC}"
  docker run -d \
    --name knotengine_mongo \
    -p 127.0.0.1:27017:27017 \
    -e MONGO_INITDB_ROOT_USERNAME="$MONGO_USER" \
    -e MONGO_INITDB_ROOT_PASSWORD="$MONGO_PASS" \
    -e MONGO_INITDB_DATABASE=knotengine \
    -v knotengine_mongo_data:/data/db \
    mongo:7-jammy \
    > /dev/null

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ MongoDB${NC} started on 127.0.0.1:27017"
  else
    echo -e "${RED}✖ MongoDB${NC} failed to start"
    exit 1
  fi
fi

# ── Redis ──
REDIS_PASS="${REDIS_PASS:-knotadmin_redis_password}"

if docker ps --format '{{.Names}}' | grep -q '^knotengine_redis$'; then
  echo -e "${GREEN}✔ Redis${NC}   already running"
else
  docker rm -f knotengine_redis > /dev/null 2>&1

  echo -e "${YELLOW}▶ Starting Redis 7...${NC}"
  docker run -d \
    --name knotengine_redis \
    -p 127.0.0.1:6379:6379 \
    -v knotengine_redis_data:/data \
    redis:7-alpine \
    redis-server --requirepass "$REDIS_PASS" \
    > /dev/null

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✔ Redis${NC}   started on 127.0.0.1:6379"
  else
    echo -e "${RED}✖ Redis${NC}   failed to start"
    exit 1
  fi
fi

# ── Wait for MongoDB readiness ──
echo ""
echo -e "${YELLOW}⏳ Waiting for MongoDB to accept connections...${NC}"

for i in {1..10}; do
  if docker exec knotengine_mongo mongosh --quiet \
    -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin \
    --eval "db.runCommand({ ping: 1 })" > /dev/null 2>&1; then
    echo -e "${GREEN}✔ MongoDB is ready${NC}"
    break
  fi

  if [ $i -eq 10 ]; then
    echo -e "${RED}✖ MongoDB did not become ready in time${NC}"
    echo "  Check logs: docker logs knotengine_mongo"
    exit 1
  fi

  sleep 1
done

echo ""
echo -e "${GREEN}🚀 All services are up!${NC}"
echo -e "   MongoDB → mongodb://localhost:27017"
echo -e "   Redis   → redis://localhost:6379"
echo ""
