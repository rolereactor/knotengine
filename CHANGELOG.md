# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-05-16

### Added

- **SDK v0.5.0** — Major SDK upgrade with 10 new methods:
  - `listInvoices()`, `cancelInvoice()`, `resolveInvoice()`
  - `getMerchant()`, `updateMerchant()`
  - `rotateApiKey()`, `rotateWebhookSecret()`, `sendTestWebhook()`
  - `getAssetConfig()`, `getMerchantStats()`
- **Custom Error Classes** — `KnotAuthenticationError`, `KnotValidationError`, `KnotNotFoundError`, `KnotRateLimitError` with proper HTTP status codes and retry-after headers.
- **SDK Constants** — `WEBHOOK_EVENTS`, `CURRENCIES`, `INVOICE_STATUSES` exported for type-safe development.
- **All 7 Currencies** — Added `USDC_ERC20` and `USDC_POLYGON` support.
- **Analytics Dashboard** — New `/dashboard/analytics` page with volume charts, currency breakdown, status distribution, and hourly pattern visualization.
- **Webhook Delivery Logs** — New `WebhookDelivery` model tracking every delivery attempt with status codes, duration, and error messages.
- **Webhook Stats API** — `GET /v1/merchants/me/webhooks/deliveries` and `GET /v1/merchants/me/webhooks/stats` endpoints.
- **CI/CD Pipeline** — GitHub Actions for CI (lint, test, Docker build), SDK publishing to npm, and Docker image publishing to GHCR.
- **Dependabot** — Automated weekly dependency updates for npm, GitHub Actions, and Docker.
- **Documentation** — `docs/API_REFERENCE.md`, `docs/INTEGRATION_GUIDE.md`, and comprehensive SDK README.
- **E2E Tests** — API integration tests and Docker smoke test script (`scripts/smoke-tests.sh`).

### Changed

- **SDK README** — Complete rewrite with full API reference, error handling guide, and payment flow diagrams.
- **ROADMAP.md** — Updated status for all completed items.

### Fixed

- **Webhook Dispatcher** — Now logs every delivery attempt to the database with status, duration, and error details.
- **API Routes** — Added null-safety checks for merchant context in webhook delivery endpoints.

## [0.4.0] - 2026-03-01

### Added

- **Hybrid Email Service** — Migrated to a hybrid email architecture:
  - **Production:** Uses the `resend` SDK for professional deliverability, bounce tracking, and future React Email templating.
  - **Development:** Uses `nodemailer` + Gmail SMTP for free, frictionless local testing without quota limits or DNS verification.
- **Backend Unit Testing** — Implemented the first `vitest` testing suite with 24 passing tests covering:
  - **Engine Math:** Verifies correct platform fee deductions (1.0%, 0.5%, 0.25%) and partial payment thresholds.
  - **Rate Limiting:** Mathematically proves starter tiers are capped at 1 req/sec.
  - **Security:** Validates that Webhook HMAC-SHA256 signatures correctly reject tampered payloads.
- **Email Test Scripts** — Added `NODE_ENV=production pnpm test:email` to easily test both local and prod email providers.
- **Email Setup Documentation** — Created comprehensive guides in `docs/GMAIL_SETUP.md` and `docs/EMAIL_QUICK_SETUP.md`.
- **Checkout Header Alignment** — Added left/center alignment option for merchant branding header in checkout page.
- **Subscription Grace Period** — Introduced automated grace periods and status UI to prevent immediate suspension when credit balance is low.
- **Animated Sidebar Icons** — Integrated `lucide-animated` with high-performance hover triggers (via React refs) for the primary navigation.
- **Promo Code System** — Launched a new redemption system allowing merchants to claim balance credits via codes. Includes a new `PromoCodeCard` UI and secure backend validation.
- **Referral Rewards** — Implemented 10% instant commission payouts for referrers when their referred merchants perform a top-up.

### Fixed

- **Email Service Initialization** — Fixed lazy-loading of Gmail SMTP transporter to ensure environment variables are loaded before email sending.
- **Checkout Footer Logic** — Fixed "Remove Powered by KnotEngine" toggle to correctly respect merchant plan (Starter plans cannot remove, Pro+ can).
- **Plan Validation** — Added plan-based feature gating for white-label checkout (Pro+ only).
- **Branding Toggle API** — Added `brandingEnabled` and `removeBranding` to merchant update schema (was preventing toggles from saving).
- **Login Hydration Mismatch** — Refactored the login layout into specialized server and client components to resolve Next.js 16/React 19 hydration errors.
- **CSS Import Types** — Added CSS module declarations to resolve TypeScript errors for CSS imports in dashboard layout.
- **Auth Polling Loop** — Resolved a critical infinite API sync loop in NextAuth `jwt` callback occurring for new users with no merchants.
- **Service Worker Interception** — Fixed "ERR_FAILED" browser errors by decommissioning the legacy Service Worker with a self-destruct script.
- **React 19 Rendering** — Fixed "component created during render" and "ref accessed during render" errors in animated UI primitives (`SlidingNumber`, `Slot`).
- **Blockchain ID Collision** — Patched a bug where `mid_` prefixes were incorrectly being assigned to blockchain xPub fields in some edge cases.
- **Linting & Type Safety** — Achieved zero-warning status across the dashboard package by resolving multiple unused variables and implicit `any` types.

### Changed

- **Email Architecture** — Swapped backend email transmission logic from simple SMTP to a dual-provider `EmailService` class (`Resend` | `Gmail`) depending on `NODE_ENV`.
- **Environment Templates** — Updated `.env.example` and `.env.development` to include merged configuration blocks for `GMAIL_APP_PASSWORD` alongside `RESEND_API_KEY`.
- **Dynamic Versioning** — Standardized version display to pull directly from `package.json` build metadata.

### Removed

- **Redundant .env.template** — Consolidated environment configuration to single `.env.example` file.

## [0.3.0] - 2026-02-23

### Added

- **Prettier Tailwind Plugin** — Integrated `prettier-plugin-tailwindcss` for automatic class sorting following official Tailwind recommended order.
- **Two-Factor Authentication (2FA)** — Implemented complete TOTP-based security flow with backup codes and middleware enforcement.
- **Professional Merchant IDs** — Introduced `mid_` prefixed identity system with unique generation retry logic for enhanced API professionalism.
- **Blockchain Redundancy** — Implemented dual-provider support (Tatum + Alchemy) for EVM chains to ensure zero-downtime payment monitoring.
- **Failover Logic** — Built a resilient `ProviderPool` that automatically rotates between Tatum and Alchemy if a subscription fails.
- **Secure Webhooks** — Specialized Alchemy signature verification with automated test ping handling.
- **Automatic Cleanup** — Implemented 30-day Retention (TTL) Policy for `WebhookEvent` and `Notification` collections to prevent database bloat.
- **Dashboard Real-time Alerts** — Production-ready toasts for payments, expirations, and webhook failures via Socket.io.
- **Deduplication Indexing** — Implemented compound database indexing on `Notification` models to maintain high-performance lookups as history grows.
- **Manual Event Metadata** — Enhanced manual resolution logs with consistent metadata linking for better traceability.
- **AGPL-3.0 License** — Adopted the GNU Affero General Public License for enhanced community cooperation and server-side source availability.
- **Organization Migration** — Relocated ecosystem to the `qodinger` GitHub Organization for enhanced trust and scalability.

### Fixed

- **ESM Import Compliance** — Added `.js` extensions to all relative imports in API for Node.js ESM `moduleResolution: "node16"` compatibility.
- **TypeScript Type Safety** — Replaced all `any` types with proper type definitions across balances components and hooks.
- **React Best Practices** — Fixed unescaped apostrophes using `&apos;` entity and added Suspense boundary for `useSearchParams` in login flow.
- **Checkout Type Safety** — Created proper `Invoice` interface to replace `any` types in checkout components.
- **ESLint Configuration** — Disabled non-critical warnings (Tailwind canonical classes, image optimization, React Compiler) for cleaner lint output.
- **Notification Duplication** — Fixed a bug where special regex characters in titles (like `[TEST]`) caused duplicate alert entries.
- **Testnet Visibility** — Resolved inconsistent filtering on the Payments page to correctly show or hide testnet invoices based on active tabs.
- **Type Safety** — Corrected multiple TypeScript compilation and lint errors across the API and Dashboard monorepo.
- **Broken Imports** — Fixed missing asset config imports in the Billing and Balances pages.

### Removed

- **Legacy Dashboard Pages** — Cleaned up unused and deprecated directory structures in the Dashboard application to reduce bundle size.
- **Hardcoded Configurations** — Removed all hardcoded asset and network references, transitioning fully to dynamic shared types.

### Changed

- **Tailwind Class Ordering** — Auto-sorted all Tailwind CSS classes across 63 files following official recommended order for consistency.
- **Settings Architecture** — Relocated technical Merchant IDs to the Developers tab and simplified business settings.
- **Unified Branding** — Consolidated all packages under the `qodinger` scope (e.g., `@qodinger/knot-database`, `@qodinger/knot-types`).
- **Sidebar UX** — Reordered dashboard navigation to prioritize operations (Dashboard, Payments, Activity Log).
- **Modular Dashboard Architecture** — Completely refactored Balances, Billing, Payments, and Settings into a modern, hook-centric component system for better maintainability.
- **Regex-Safe Notifications** — Hardened the deduplication engine with regex escaping to support special characters and labels in log titles.
- **Unified Testnet Experience** — Synchronized `[TEST]` branding across real-time toasts, activity history, and terminal logs for all payment types.
- **Asset-Agnostic Simulations** — Enabled testnet support for all system-configured currencies, removing hardcoded testnet-only restrictions.
- **Notification Logic** — Refined signal-to-noise ratio by deduplicating alerts and optimizing event grouping.
- **Improved Dev DX** — Replaced ngrok with `cloudflared` (Cloudflare Tunnel) for reliable local webhook testing.
- **Reset Utility** — Added a safe database reset script for development with environment guards.

## [0.2.1] - 2026-02-20

### Added

- **Automated Releases** — GitHub Actions workflow for automatic creation of GitHub Releases with changelog extraction.
- **SDK Automation** — Integrated GitHub Packages publishing for the `@tyecode/knotengine-sdk`.

### Changed

- **Branding & Scope** — Renamed official SDK to `@tyecode/knotengine-sdk` for compatibility with GitHub's package registry.
- **Version Syncing** — Updated `sync-versions` script to support both `@knotengine` and `@tyecode` scopes across the monorepo.

## [0.2.0] - 2026-02-18

### Added

- **SaaS Architecture** — Automated merchant onboarding via Tatum API for zero-touch blockchain monitoring.
- **Dynamic Checkout** — Next.js 16 consumer payment interface with cyberpunk aesthetic, QR codes, and live countdowns (Port 5051).
- **Merchant Console** — Scaffolded dashboard app for merchants to track volume and system health (Port 5052).
- **Socket.io Integration** — Instant real-time UI updates for payment detection and confirmation across the ecosystem.
- **Reliable Webhook Dispatcher** — Production-grade delivery engine with exponential backoff and persistent retry state.
- **Monetization Engine** — Built-in 0.5% "KnotEngine Fee" calculation and tracking on all invoices.
- **Port Isolation** — Standardized ecosystem to a unique port range (5050: API, 5051: Checkout, 5052: Dashboard).
- **Dynamic Versioning** — Ecosystem-wide logic to import version strings directly from individual `package.json` files.
- **Tooling** — Husky, lint-staged, Prettier, ESLint, and Commitlint for high-compliance dev workflows.
- **Monorepo scaffold** — Turborepo + pnpm workspaces with clean `apps/` and `packages/` separation.
- **@knotengine/crypto** — HD wallet derivation engine for BTC (P2WPKH) and EVM (ERC-20) monitoring.
- **@knotengine/database** — MongoDB persistence layer with Mongoose models for Merchant and Invoice lifecycle.
- **Price Oracle** — Real-time USD ↔ crypto conversion with 1-minute caching and stale fallbacks.
- **Verification Suite** — Finalized system-wide testing workflow including @knotengine/sdk unit tests and manual simulation endpoints.

### Changed

- **API Engine** — Improved error handling and performance optimizations for the core Knot server.
- **Webhooks** — Enhanced payload security with HMAC signatures and unique event IDs (`evt_...`).

[0.5.0]: https://github.com/qodinger/knotengine/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/qodinger/knotengine/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/qodinger/knotengine/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/qodinger/knotengine/releases/tag/v0.2.1
[0.2.0]: https://github.com/qodinger/knotengine/releases/tag/v0.2.0
