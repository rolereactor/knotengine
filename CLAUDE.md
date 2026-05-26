# KnotEngine — Claude Code Guide

Non-custodial crypto payment infrastructure. Merchants receive crypto directly to their own wallets; the platform never holds funds.

## Repo layout

```
apps/
  api/        Fastify REST API (port 5050) — the core engine
  dashboard/  Next.js merchant portal (port 5052)
  checkout/   Next.js customer payment page (port 5051)
packages/
  database/   Mongoose models + connectToDatabase()
  types/      Shared constants, types, and input sanitizers
  crypto/     HD wallet derivation (BIP32/BIP39)
  sdk/        TypeScript client SDK
```

## Dev commands

```bash
pnpm dev                    # all apps in parallel (Turborepo)
pnpm dev:api                # API only
pnpm docker:up              # start MongoDB + Redis via Docker
pnpm typecheck              # tsc --noEmit across all packages
pnpm test                   # vitest across all packages
pnpm --filter api typecheck # typecheck a single package
```

Copy `.env.example` → `.env.local` before running.

## Architecture: invoice lifecycle

```
POST /v1/invoices
  → HD wallet derivation (packages/crypto)
  → Price oracle (CoinGecko primary, Binance fallback)
  → Address subscribed via BlockchainProviderPool
      └─ TatumProvider  (BTC, LTC)
      └─ AlchemyProvider (ETH, EVM tokens)
  → Invoice stored as "pending"

Blockchain webhook arrives
  → ConfirmationEngine processes event
  → Status: pending → mempool_detected → confirming → confirmed
  → WebhookDispatcher fires merchant webhook
  → SocketService emits real-time update
```

## Key conventions

**API errors** — always use `apiError()` from `src/utils/api-error.ts`. Never return `{ error: "string" }`. Every error response must have `type`, `code`, `message`, and `doc_url`. The static scan in `tests/api-error-format.test.ts` will fail the build if a raw error response is introduced anywhere in `src/`.

**Idempotency** — mutating endpoints (`POST /v1/invoices`) check Redis for a cached response keyed by `idempotency:invoice:{merchantId}:{key}` with 24h TTL. New mutating endpoints should follow the same pattern.

**Response shapes** — every invoice response includes `object: "invoice"`. List responses wrap in `{ object: "list", data: [...] }`.

**Mongoose field names** — always camelCase (`webhookAttempts`, not `webhook_attempts`). MongoDB silently accepts unknown fields in `$set`; a snake_case typo creates an orphan field that is never read back.

**EVM currency sync** — `EVM_CURRENCIES` in `packages/types/index.ts`, AlchemyProvider's `supportedChains`, and ConfirmationEngine's asset validation list must all stay in sync. Adding a new EVM token requires updating all three, plus `mapCurrencyToCoinGeckoId` and `mapCurrencyToBinanceSymbol` in `price-feed.ts`.

**Redis is optional** — `RedisClient.get/set` return `null`/`false` silently when Redis is unavailable. Never assume Redis is present; always gracefully degrade.

**No breaking changes** — existing API response fields cannot be removed or have their types changed. Additions are fine. If a significant reshape is needed, version the endpoint.

## Test suite (apps/api)

248 tests across 12 files, run with `pnpm test`.

| File                                     | What it covers                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `tests/api-error-format.test.ts`         | Static source scan for raw errors + `apiError()` unit tests              |
| `tests/api-auth-contract.test.ts`        | Auth guards on every `requireAuth`-protected route; error envelope shape |
| `tests/engine-math.test.ts`              | Confirmation status, fee calculation, amount tolerance                   |
| `tests/rate-limits.test.ts`              | Per-plan invoice rate limits                                             |
| `tests/auth-flow.test.ts`                | Magic link + OAuth account linking flows                                 |
| `tests/merchant-team-edge-cases.test.ts` | Ownership transfer, invite expiry, cross-merchant access                 |
| `tests/webhook-signatures.test.ts`       | HMAC signature generation and verification                               |
| `tests/merchant-model.test.ts`           | Mongoose schema validation for Merchant                                  |
| `tests/user-model.test.ts`               | Mongoose schema validation for User                                      |
| `tests/env-loading.test.ts`              | Required env vars + file presence                                        |

**Adding a new protected route** — add a `{ method, url, body? }` entry to the `cases` array in `tests/api-auth-contract.test.ts`. The test loop automatically verifies the auth guard returns 401 with the correct `apiError` envelope.

**Adding a new error path** — use `apiError()`. The static scan in `tests/api-error-format.test.ts` will catch any `reply.code(N).send({ error: ... })` bypass at CI time.

**Test mock patterns**

- `ApiKey.findOne().populate()` chain → use `makePopulateChain(resolved)` helper (defined via `vi.hoisted` in the test file)
- `vi.clearAllMocks()` clears call history only, not implementations; `beforeEach` re-sets `ApiKey.findOne` default to `makePopulateChain(null)`
- Float/invoice routes use Fastify's response schema (JSON Schema, not Zod) — the test app intentionally omits `serializerCompiler` to avoid `safeParse` crashes on non-Zod schemas

## Infra notes

- **BlockchainProviderPool** — singleton, circuit-breaker-wrapped. Call `getInstance().getProviderHealth()` to inspect breaker states.
- **BullMQ** — durable scheduled jobs (invoice expiry, webhook retries, billing). Falls back to `setInterval` when Redis is absent.
- **Sentry** — opt-in via `SENTRY_DSN` env var. No-ops silently without it. `captureException()` in `src/infra/sentry.ts` is safe to call anywhere.
- **Prometheus** — metrics exposed at `/metrics`. Use `src/infra/metrics.ts` helpers; don't create ad-hoc `prom-client` counters.

## Explicitly out of scope

- DeFi yield / AAVE float integration
- Terms of Service / Privacy Policy
- Load testing
- Security audit
