# ──────────────────────────────────────────────
# KnotEngine — Dashboard (Production)
# ──────────────────────────────────────────────

FROM node:20-alpine AS base
WORKDIR /app

# ── Dependencies ──
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/types/package.json ./packages/types/
RUN corepack enable && pnpm install --frozen-lockfile --filter dashboard --filter @qodinger/knot-types

# ── Build ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY . .
RUN corepack enable && pnpm --filter dashboard build

# ── Production ──
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# Next.js needs these for standalone output
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public

EXPOSE 5052
CMD ["dumb-init", "--", "node", "apps/dashboard/server.js"]
