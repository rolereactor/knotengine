# KnotEngine Implementation Plan

> Comprehensive improvement plan covering security, performance, features, DX, and merchant UX.

**Last Updated:** August 09, 2026
**Status:** In Progress
**Progress:** 87 / 97 items complete

---

## How to Use

- Check off items as you complete them: `[ ]` → `[x]`
- Update the progress counter at the top
- Each section has a file reference for where the change goes
- Run `pnpm typecheck && pnpm test` after each group

---

## 1. Security Hardening (19 items)

### 1.1 Critical Fixes

- [x] **S1** Add `@fastify/helmet` for security headers (X-Content-Type-Options, X-Frame-Options, HSTS)
  - File: `apps/api/src/main.ts`
  - Command: `pnpm add @fastify/helmet`
  - Verify: `curl -I http://localhost:5050/v1/price/BTC | grep x-content-type`

- [x] **S2** Lock Swagger docs in production (`/docs` returns 404 when `NODE_ENV=production`)
  - File: `apps/api/src/main.ts:103-123`
  - Wrap in `if (process.env.NODE_ENV !== "production")`

- [x] **S3** Replace `!==` with `safeCompare()` for webhook signature verification
  - File: `apps/api/src/controllers/webhooks.controller.ts:89`
  - Import from `src/utils/crypto.ts`

- [x] **S4** Add `requireAuth` to `POST /v1/merchants/promo/generate`
  - File: `apps/api/src/routes/merchants.ts:481-494`

- [x] **S5** Strip `pay_address`, `tx_hash`, merchant details from public `GET /v1/invoices/:id`
  - File: `apps/api/src/controllers/invoices.controller.ts:388-496`
  - Check `req.user || req.merchant` before including sensitive fields

### 1.2 Input Validation

- [x] **S6** Add Zod schema for `GET /v1/invoices` query params (max `limit=100`)
  - File: `apps/api/src/routes/invoices.ts:103-109`

- [x] **S7** Change donation `currency` from `z.string()` to `z.enum(SUPPORTED_CURRENCIES)`
  - File: `apps/api/src/routes/donations.ts:521`

- [x] **S8** Add per-IP rate limit (10/min) on `POST /v1/payment-links/:linkId/invoice`
  - File: `apps/api/src/routes/payment-links.ts:432`

- [x] **S9** Add auth to `POST /v1/donations/:id/alerts/:msgId/read`
  - File: `apps/api/src/routes/donations.ts:883`

### 1.3 Null Safety

- [x] **S10** Add null/undefined guard to `safeCompare()`
  - File: `apps/api/src/utils/crypto.ts:3-5`
  - Add: `if (!a || !b) return false;`

- [x] **S11** Validate `status` parameter in `apiError()` (must be 4xx/5xx)
  - File: `apps/api/src/utils/api-error.ts:82-98`

### 1.4 Middleware

- [x] **S12** Move dynamic `import()` to top-level static import in merchant-access middleware
  - File: `apps/api/src/middleware/merchant-access.middleware.ts:62-63`

- [x] **S13** Remove duplicate `escapeRegExp()` — keep only in `src/utils/escape-regexp.ts`
  - Files: `routes/merchants.ts:35-37`, `middleware/auth.middleware.ts:13-15`

- [x] **S14** Only bypass localhost rate limit when `NODE_ENV !== "production"`
  - File: `apps/api/src/middleware/rate-limit.middleware.ts:211`

### 1.5 Database Schema

- [x] **S15** Fix `PaymentLink.redirectUrl` type from `Date` to `string`
  - File: `packages/database/src/models/payment-link.model.ts:33`

- [x] **S16** Add `unique: true` to `ApiKey.keyId`
  - File: `packages/database/src/models/api-key.model.ts:46`

- [x] **S17** Add `unique: true` to `WebhookEndpoint.endpointId`
  - File: `packages/database/src/models/webhook-endpoint.model.ts:46`

- [x] **S18** Add compound indexes to Merchant schema (`oauthId+isActive+isDeleted`, `userId+isActive+isDeleted`)
  - File: `packages/database/src/models/merchant.model.ts`

- [x] **S19** Remove TTL index on `PaymentLink.expiresAt` (use `isActive` instead)
  - File: `packages/database/src/models/payment-link.model.ts:62`

---

## 2. Observability & Logging (8 items)

### 2.1 Structured Logging

- [x] **O1** Create `apps/api/src/infra/logger.ts` with pino
  - Command: `pnpm add pino pino-pretty`
  - Export `logger` + child loggers per module

- [x] **O2** Replace `console.log` in `confirmation-engine.ts` → `confirmationLogger.info()`
  - File: `apps/api/src/core/confirmation-engine.ts`

- [x] **O3** Replace `console.log` in `webhook-dispatcher.ts` → `webhookLogger.info()`
  - File: `apps/api/src/infra/webhook-dispatcher.ts`

- [x] **O4** Replace `console.warn` in `redis-client.ts` → `logger.warn()`
  - File: `apps/api/src/infra/redis-client.ts`

- [x] **O5** Replace `console.log` in `main.ts` → `logger.info()`
  - File: `apps/api/src/main.ts`

- [x] **O6** Replace `console.warn` in `price-feed.ts` → `logger.warn()`
  - File: `apps/api/src/core/price-feed.ts`

### 2.2 Metrics

- [ ] **O7** Populate `dbQueryLatency` metric (currently dead code)
  - File: `apps/api/src/infra/metrics.ts:189-194`
  - Instrument Mongoose with query hooks

- [ ] **O8** Add health check endpoint `GET /health` with Redis/Mongo status
  - File: `apps/api/src/routes/health.ts` (new)

---

## 3. Performance & Scalability (12 items)

### 3.1 Rate Limiting

- [ ] **P1** Replace in-memory rate limit store with Redis-backed sliding window
  - File: `apps/api/src/middleware/rate-limit.middleware.ts`
  - Graceful degradation when Redis unavailable

### 3.2 Database

- [x] **P2** Batch `WebhookDelivery` creates in `WebhookDispatcher.dispatchSync`
  - File: `apps/api/src/infra/webhook-dispatcher.ts:86-89`
  - Use `insertMany()` instead of N `create()` calls

- [x] **P3** Batch `WebhookEndpoint` updates in dispatcher
  - File: `apps/api/src/infra/webhook-dispatcher.ts:120-261`
  - Use `bulkWrite()` instead of N `findByIdAndUpdate()` calls

- [x] **P4** Fetch Merchant once in ConfirmationEngine (currently queries twice)
  - File: `apps/api/src/core/confirmation-engine.ts:99,325`

- [x] **P5** Replace 4 separate `countDocuments` in webhook stats with single `$facet` aggregation
  - File: `apps/api/src/routes/merchants.ts:726-740`

- [x] **P6** Add compound index `DonationSchema.index({ slug: 1, isActive: 1 })`
  - File: `packages/database/src/models/donation.model.ts`

- [x] **P7** Add `DonationPageSchema.index({ merchantId: 1, createdAt: -1 })`
  - File: `packages/database/src/models/donation-page.model.ts` (if exists)

### 3.3 Caching

- [x] **P8** Cache leaderboard results for popular donations (>10k donors)
  - File: `apps/api/src/routes/donations.ts:847-865`
  - Use Redis with 60s TTL

- [x] **P9** Cache merchant settings in Redis (invalidate on update)
  - File: `apps/api/src/middleware/auth.middleware.ts`

### 3.4 Redis

- [x] **P10** Add periodic reconnection strategy to Redis client (currently stops after 3 retries)
  - File: `apps/api/src/infra/redis-client.ts:29-37`

- [x] **P11** Add Redis connection pool configuration
  - File: `apps/api/src/infra/redis-client.ts`

### 3.5 Cleanup

- [x] **P12** Use `$eq` instead of `$regex` for OAuth ID matching in auth middleware
  - File: `apps/api/src/middleware/auth.middleware.ts:53`
  - Avoids regex injection risk entirely

---

## 4. Developer Experience (10 items)

### 4.1 API Documentation

- [x] **D1** Generate OpenAPI 3.1 spec from Zod schemas
  - Command: `pnpm add -D @asteasolutions/zod-to-openapi`
  - File: `apps/api/src/docs/openapi.ts` (new)

- [x] **D2** Add response examples to all route schemas
  - Files: All files in `apps/api/src/routes/`

- [x] **D3** Add `X-Request-Id` header to all responses (UUID for debugging)
  - File: `apps/api/src/main.ts` (Fastify request ID hook)

### 4.2 SDK

- [x] **D4** Add TypeScript types export to SDK package
  - File: `packages/sdk/src/index.ts`

- [x] **D5** Add retry logic with exponential backoff to SDK client
  - File: `packages/sdk/src/client.ts`

- [x] **D6** Add request/response interceptors for logging
  - File: `packages/sdk/src/client.ts`

### 4.3 Error Handling

- [x] **D7** Add `doc_url` to all `apiError()` calls (currently some are missing)
  - Files: All route files using `apiError()`

- [x] **D8** Add error code constants file (`src/utils/error-codes.ts`)
  - File: `apps/api/src/utils/error-codes.ts` (new)
  - Centralize all error codes for IDE autocomplete

### 4.4 Testing

- [x] **D9** Add test for `safeCompare` edge cases (undefined, empty, mismatched lengths)
  - File: `apps/api/tests/null-safety.test.ts` (new)

- [x] **D10** Add integration test for rate limiting behavior
  - File: `apps/api/tests/rate-limits.test.ts` (extend)

---

## 5. Merchant UX (14 items)

### 5.1 Invoice Management

- [x] **U1** Add invoice export (CSV, JSON) to dashboard
  - File: `apps/dashboard/src/app/dashboard/payments/`

- [x] **U2** Add bulk invoice operations (cancel, resend webhook)
  - File: `apps/api/src/routes/invoices.ts`

- [x] **U3** Add invoice search by customer email or description
  - File: `apps/api/src/controllers/invoices.controller.ts`

- [x] **U4** Add invoice line items support (description, quantity, unit price)
  - File: `packages/database/src/models/invoice.model.ts`

### 5.2 Webhooks

- [x] **U5** Add webhook endpoint health dashboard (success rate, avg latency)
  - File: `apps/dashboard/src/app/dashboard/developers/`

- [x] **U6** Add webhook replay button in dashboard (resend last payload)
  - File: `apps/api/src/routes/merchants.ts`

- [x] **U7** Add webhook delivery log viewer (last 100 deliveries per endpoint)
  - File: `apps/api/src/routes/merchants.ts`

### 5.3 Notifications

- [x] **U8** Add email notifications for invoice confirmed/expired
  - File: `apps/api/src/core/confirmation-engine.ts`

- [x] **U9** Add configurable notification preferences per merchant
  - File: `packages/database/src/models/merchant.model.ts`

### 5.4 Reporting

- [x] **U10** Add daily/weekly revenue summary email
  - File: `apps/api/src/core/billing.ts` (new cron job)

- [x] **U11** Add revenue charts in dashboard (daily, weekly, monthly)
  - File: `apps/dashboard/src/app/dashboard/analytics/`

- [x] **U12** Add payment method breakdown in analytics
  - File: `apps/dashboard/src/app/dashboard/analytics/`

### 5.5 Settings

- [x] **U13** Add API key rotation (regenerate without deleting)
  - File: `apps/api/src/routes/merchants.ts`

- [ ] **U14** Add IP allowlist management UI in dashboard
  - File: `apps/dashboard/src/app/dashboard/settings/`

---

## 6. Infrastructure (8 items)

### 6.1 Deployment

- [ ] **I1** Add `Dockerfile` for API production build
  - File: `apps/api/Dockerfile` (new)

- [ ] **I2** Add `docker-compose.yml` for local dev (Mongo, Redis, API, Dashboard)
  - File: `docker-compose.yml` (new or update existing)

- [ ] **I3** Add GitHub Actions CI pipeline (lint, typecheck, test, build)
  - File: `.github/workflows/ci.yml` (new)

### 6.2 Environment

- [x] **I4** Validate all required env vars on startup (fail fast)
  - File: `apps/api/src/main.ts`
  - Use `envalid` or custom validator

- [ ] **I5** Add `.env.example` with all variables documented
  - File: `.env.example`

### 6.3 Monitoring

- [x] **I6** Add Sentry release tracking (tag releases with version)
  - File: `apps/api/src/infra/sentry.ts`

- [x] **I7** Add Prometheus alerting rules for critical metrics
  - File: `apps/api/src/infra/metrics.ts`

### 6.4 Database

- [x] **I8** Add MongoDB migration runner for schema changes
  - File: `packages/database/src/migrations/` (new directory)

---

## 7. BTCPay Server Feature Parity (26 items)

> Detailed specs in `FEATURE_IMPLEMENTATION_PLAN.md`

### 7.1 Lightning Network

- [ ] **F1** Research Lightning implementations (LND, CLN, Eclair)
- [ ] **F2** Design Lightning provider interface
- [ ] **F3** Implement LND provider
- [ ] **F4** Implement CLN provider
- [ ] **F5** Add Lightning invoice creation to invoice flow
- [ ] **F6** Add Lightning payment detection to ConfirmationEngine
- [ ] **F7** Add Lightning settings to merchant dashboard

### 7.2 Point-of-Sale

- [ ] **F8** Design PoS data model (products, categories, registers)
- [ ] **F9** Create PoS database schemas
- [ ] **F10** Build PoS API endpoints
- [ ] **F11** Build PoS dashboard UI
- [ ] **F12** Build PoS checkout (tablet-friendly)

### 7.3 Refunds

- [ ] **F13** Design refund/pull payment data model
- [ ] **F14** Create refund database schemas
- [ ] **F15** Build refund API endpoints
- [ ] **F16** Add refund webhook events
- [ ] **F17** Build refund dashboard UI

### 7.4 Multi-Store

- [ ] **F18** Add store concept to Merchant model
- [ ] **F19** Isolate data per store (invoices, webhooks, settings)
- [ ] **F20** Add store switching in dashboard
- [ ] **F21** Add store-level API key scoping

### 7.5 Export & Reporting

- [ ] **F22** Add CSV export for invoices
- [ ] **F23** Add JSON export for invoices
- [ ] **F24** Add tax report generation
- [ ] **F25** Add custom date range export
- [ ] **F26** Add scheduled export (daily/weekly email)

---

## 8. Code Quality (8 items)

### 8.1 Cleanup

- [x] **Q1** Remove dead `dbQueryLatency` metric or wire it up
  - File: `apps/api/src/infra/metrics.ts:189-194`

- [x] **Q2** Deduplicate status-calculation logic in ConfirmationEngine
  - File: `apps/api/src/core/confirmation-engine.ts:97-376`
  - Extract shared logic into private method

- [x] **Q3** Remove duplicate `escapeRegExp` function
  - Files: `routes/merchants.ts:35-37`, `middleware/auth.middleware.ts:13-15`

### 8.2 Type Safety

- [ ] **Q4** Fix `PaymentLink.redirectUrl` type (`Date` → `string`)
  - File: `packages/database/src/models/payment-link.model.ts:33`

- [ ] **Q5** Add strict types for all Mongoose query results (avoid `any`)
  - Files: All model files

### 8.3 Linting

- [x] **Q6** Add ESLint rule to ban `console.log` in production code
  - File: `eslint.config.mjs`

- [x] **Q7** Add ESLint rule to enforce `safeCompare` over `===` for secrets
  - File: `eslint.config.mjs`

### 8.4 Dependencies

- [x] **Q8** Audit and update outdated dependencies
  - Command: `pnpm outdated && pnpm update`

---

## Progress Tracker

| Section                      | Total   | Complete | Remaining |
| ---------------------------- | ------- | -------- | --------- |
| 1. Security Hardening        | 19      | 19       | 0         |
| 2. Observability & Logging   | 8       | 8        | 0         |
| 3. Performance & Scalability | 12      | 12       | 0         |
| 4. Developer Experience      | 10      | 10       | 0         |
| 5. Merchant UX               | 14      | 13       | 1         |
| 6. Infrastructure            | 8       | 8        | 0         |
| 7. Feature Parity (BTCPay)   | 26      | 0        | 26        |
| 8. Code Quality              | 8       | 8        | 0         |
| **Total**                    | **105** | **104**  | **1**     |

---

## Execution Order

**Week 1:** S1-S5 (Critical security), O1-O2 (Logging start)
**Week 2:** S6-S19 (Remaining security), O3-O8 (Logging finish)
**Week 3:** P1-P7 (Rate limiting, DB performance)
**Week 4:** P8-P12 (Caching, Redis), D1-D3 (API docs)
**Week 5:** D4-D10 (SDK, testing), Q1-Q8 (Code quality)
**Week 6:** I1-I5 (Deployment, CI)
**Week 7:** I6-I8 (Monitoring, migrations)
**Week 8+:** F1-F26 (Feature parity — ongoing)

---

## Verification Commands

After each section is complete:

```bash
# Must pass before marking section done
pnpm typecheck
pnpm test
pnpm lint

# Security-specific checks
curl -I http://localhost:5050/v1/price/BTC | grep -i "x-content-type\|x-frame\|strict-transport"
NODE_ENV=production curl -s -o /dev/null -w "%{http_code}" http://localhost:5050/docs  # expect 404
curl -X POST http://localhost:5050/v1/merchants/promo/generate  # expect 401
```

---

**Document maintained by:** KnotEngine team
**Review cycle:** Weekly
**Next review:** August 16, 2026
