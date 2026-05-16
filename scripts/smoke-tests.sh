#!/bin/bash
# Smoke tests for KnotEngine Docker deployment
# Run after docker compose up -d --build

set -e

API_URL="${API_URL:-http://localhost:5050}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:5052}"
CHECKOUT_URL="${CHECKOUT_URL:-http://localhost:5051}"

PASS=0
FAIL=0

check_service() {
  local name=$1
  local url=$2
  local expected_status=${3:-200}

  echo -n "Testing $name ($url)... "

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo "✅ PASS (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo "❌ FAIL (Expected $expected_status, got $status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo "  KnotEngine Smoke Tests"
echo "=========================================="
echo ""

# API Health
check_service "API Health" "$API_URL/health" 200

# API Config
check_service "API Config" "$API_URL/v1/config/assets" 200

# API Auth enforcement
echo -n "Testing API Auth enforcement... "
status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/merchants/me" 2>/dev/null || echo "000")
if [ "$status" = "401" ]; then
  echo "✅ PASS (HTTP $status - auth enforced)"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL (Expected 401, got $status)"
  FAIL=$((FAIL + 1))
fi

# Dashboard
check_service "Dashboard" "$DASHBOARD_URL" 200

# Checkout
check_service "Checkout" "$CHECKOUT_URL" 200

# MongoDB
echo -n "Testing MongoDB connection... "
if docker compose exec -T mongo mongosh --eval "db.runCommand({ping: 1})" >/dev/null 2>&1; then
  echo "✅ PASS"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL"
  FAIL=$((FAIL + 1))
fi

# Redis
echo -n "Testing Redis connection... "
if docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
  echo "✅ PASS"
  PASS=$((PASS + 1))
else
  echo "❌ FAIL"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi

echo "All smoke tests passed! ✅"
