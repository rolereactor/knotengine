#!/bin/bash
# ══════════════════════════════════════════════
# KnotEngine — Kill All Services
# ══════════════════════════════════════════════

echo "🛑 Stopping all services..."

# Kill all app ports
lsof -ti :5050,:5051,:5052,:5053,:3000 2>/dev/null | xargs kill -9 2>/dev/null

# Kill Turborepo watcher
pkill -f "turbo run dev" 2>/dev/null

# Kill individual dev processes
pkill -f "next dev" 2>/dev/null
pkill -f "node.*src/main.ts" 2>/dev/null

echo "✅ All services stopped"
echo ""
echo "Ports freed:"
echo "  5050 - API"
echo "  5051 - Checkout"
echo "  5052 - Dashboard"
echo "  5053 - Turborepo UI"
echo "  3000 - Dashboard (alt)"