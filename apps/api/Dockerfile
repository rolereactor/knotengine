# ──────────────────────────────────────────────
# KnotEngine — API Engine (Production)
# ──────────────────────────────────────────────

FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
RUN corepack enable && pnpm install --frozen-lockfile

# ── Build ──
FROM base AS builder
COPY --from=deps /app .
COPY . .
RUN corepack enable && pnpm --filter @qodinger/knot-types build && pnpm --filter @qodinger/knot-crypto build && pnpm --filter @qodinger/knot-database build && pnpm --filter api build

# ── Production ──
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init

# Copy built output and all node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/crypto ./packages/crypto
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/types ./packages/types

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 5050

CMD ["dumb-init", "--", "node", "dist/src/main.js"]
