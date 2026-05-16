# ──────────────────────────────────────────────
# KnotEngine — Checkout (Production)
# ──────────────────────────────────────────────

FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/checkout/package.json ./apps/checkout/
COPY packages/types/package.json ./packages/types/
RUN corepack enable && pnpm install --frozen-lockfile --filter checkout --filter @qodinger/knot-types

# ── Build ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/checkout/node_modules ./apps/checkout/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .
RUN corepack enable && pnpm --filter checkout build

# ── Production ──
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

COPY --from=builder /app/apps/checkout/.next/standalone ./
COPY --from=builder /app/apps/checkout/.next/static ./apps/checkout/.next/static
COPY --from=builder /app/apps/checkout/public ./apps/checkout/public

EXPOSE 5051
CMD ["dumb-init", "--", "node", "apps/checkout/server.js"]
