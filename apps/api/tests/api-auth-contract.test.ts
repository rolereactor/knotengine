/**
 * API Auth & Response Contract Tests
 *
 * Spins up a real Fastify instance (no live DB, no network) using Vitest's
 * module mocking and Fastify's built-in `inject()` to fire HTTP requests.
 *
 * Design notes:
 *
 * - ApiKey.findOne().populate() uses Mongoose query chaining, so the mock
 *   must return an object with a `.populate()` method — not a raw value.
 *
 * - In Fastify's lifecycle, body validation (Zod schema) runs BEFORE
 *   preHandlers. Routes with required body schemas will return 400 on a
 *   body-less request before auth runs. All POST/PATCH tests therefore
 *   send a minimal valid body so auth is actually reached.
 *
 * - Fastify's built-in 404 (unknown route) has its own non-standard shape —
 *   we don't own that response, so we only test it separately and assert it
 *   does not contain our bad legacy format.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { validatorCompiler } from "fastify-type-provider-zod";

// ─── Module mocks ─────────────────────────────────────────────────────────────
//
// ApiKey.findOne is always chained with .populate("merchantId") in the
// auth hooks. Mongoose returns a Query object from findOne(); .populate()
// modifies it, then await resolves the result.  We replicate that chain.
//
// vi.mock() factories are hoisted to the top of the file before any other
// code runs. Any variable they reference must be created via vi.hoisted() so
// it too is hoisted and is therefore defined before the factory executes.

const makePopulateChain = vi.hoisted(() => (resolved: unknown) => ({
  populate: vi.fn().mockResolvedValue(resolved),
}));

vi.mock("@qodinger/knot-database", () => ({
  Merchant: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
  ApiKey: {
    // Default: key not found → invalid_api_key path
    findOne: vi.fn().mockReturnValue(makePopulateChain(null)),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    create: vi.fn(),
  },
  MerchantMember: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
  Invoice: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
  WebhookEndpoint: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
  WebhookDelivery: {
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
  Notification: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
    countDocuments: vi.fn(),
  },
  VerificationToken: {
    create: vi.fn(),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  },
  AuditLog: { countDocuments: vi.fn() },
  TopUpClaim: { findOne: vi.fn(), create: vi.fn() },
  PromoCode: { findOne: vi.fn(), create: vi.fn(), findByIdAndUpdate: vi.fn() },
  Refund: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    updateOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  connectToDatabase: vi.fn(),
  mongoose: { connection: { db: { command: vi.fn() } } },
}));

vi.mock("../src/core/audit-logger.js", () => ({
  AuditLogger: {
    auth: vi.fn(),
    account: vi.fn(),
    security: vi.fn(),
    billing: vi.fn(),
    settings: vi.fn(),
    getUserLogs: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../src/infra/ip-allowlist.js", () => ({
  ipAllowlistMiddleware: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/infra/email-service.js", () => ({
  EmailService: {
    sendMagicLink: vi.fn().mockResolvedValue({ success: true }),
    sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock("../src/infra/notification-service.js", () => ({
  NotificationService: { create: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("../src/infra/price-feed.js", () => ({
  PriceOracle: { getPrice: vi.fn().mockResolvedValue(50000) },
}));

vi.mock("../src/infra/tx-verifier.js", () => ({
  TxVerifier: { verifyTx: vi.fn() },
}));

vi.mock("../src/infra/webhook-dispatcher.js", () => ({
  WebhookDispatcher: {
    dispatchTest: vi.fn(),
    dispatchPending: vi.fn(),
  },
}));

vi.mock("../src/core/float-manager.js", () => ({
  FloatManager: {
    getInstance: vi.fn(() => ({
      // Return numbers that satisfy the JSON Schema response serializer
      getFloatStats: vi.fn().mockResolvedValue({
        totalBalance: 0,
        investedAmount: 0,
        availableAmount: 0,
        estimatedYield: 0,
        yieldAPY: 0,
      }),
      investFloat: vi.fn().mockResolvedValue({ invested: 0, success: true }),
      getHealthMetrics: vi.fn().mockResolvedValue({
        healthScore: 100,
        riskLevel: "low",
        recommendations: [],
      }),
      emergencyWithdraw: vi
        .fn()
        .mockResolvedValue({ withdrawn: 0, success: true }),
    })),
  },
}));

vi.mock("../src/core/self-hosted-mode.js", () => ({
  isSelfHosted: vi.fn().mockReturnValue(false),
}));

vi.mock("../src/infra/redis-client.js", () => ({
  RedisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    testConnection: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
  },
}));

vi.mock("../src/infra/socket-service.js", () => ({
  SocketService: { init: vi.fn(), emitToMerchant: vi.fn() },
}));

vi.mock("../src/core/confirmation-engine.js", () => ({
  ConfirmationEngine: {
    processBlockchainEvent: vi.fn(),
    expireStaleInvoices: vi.fn(),
  },
}));

// ─── Route imports (resolved after mocks are hoisted) ────────────────────────

import { merchantRoutes } from "../src/routes/merchants.js";
import { authRoutes } from "../src/routes/auth.js";
import { invoiceRoutes } from "../src/routes/invoices.js";
import { floatRoutes } from "../src/routes/float.js";
import { twoFactorRoutes } from "../src/routes/two-factor.js";
import { refundRoutes } from "../src/routes/refunds.js";

// ─── Test app factory ─────────────────────────────────────────────────────────

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  // Only set validatorCompiler (for request body / param validation via Zod).
  // We deliberately skip serializerCompiler: some routes use plain JSON Schema
  // for their response schemas, and fastify-type-provider-zod's serializer
  // calls schema.safeParse() which only exists on Zod objects. For auth/contract
  // testing we only care that auth guards and error envelopes are correct —
  // response serialization fidelity is not the concern here.
  app.setValidatorCompiler(validatorCompiler);
  await app.register(merchantRoutes);
  await app.register(authRoutes);
  await app.register(invoiceRoutes);
  await app.register(floatRoutes);
  await app.register(twoFactorRoutes);
  await app.register(refundRoutes);
  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Assert a response body is a valid apiError envelope. */
function expectApiErrorEnvelope(body: unknown, context = "") {
  const label = context ? ` (${context})` : "";
  expect(body, `expected apiError envelope${label}`).toMatchObject({
    error: {
      type: expect.stringMatching(
        /^(authentication_error|invalid_request_error|api_error|rate_limit_error)$/,
      ),
      code: expect.any(String),
      message: expect.any(String),
      doc_url: expect.stringContaining("docs.knotengine.com/api/errors#"),
    },
  });
  // No extra top-level keys
  expect(Object.keys(body as object)).toEqual(["error"]);
}

/** True when body matches the legacy { error: "string" } shape we eliminated. */
function isLegacyShape(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as any).error === "string"
  );
}

/** Helper: make ApiKey.findOne return a chained `.populate()` result. */
async function mockApiKey(resolved: unknown) {
  const { ApiKey } = await import("@qodinger/knot-database");
  vi.mocked((ApiKey as any).findOne).mockReturnValue(
    makePopulateChain(resolved),
  );
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("API Auth & Response Contract", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset ApiKey.findOne to default: key not found → invalid_api_key path.
    // vi.clearAllMocks() only clears call history, NOT implementations, so a
    // previous test's mockApiKey() call would bleed through without this reset.
    await mockApiKey(null);
  });

  // ─── 1. Auth guards: no credentials → 401 apiError ─────────────────────────

  describe("No credentials → 401 with apiError envelope", () => {
    /**
     * Every route listed here must:
     *   a) have preHandler: requireAuth (or an equivalent inline guard)
     *   b) receive a minimal valid body when the route has a required Zod schema,
     *      so that Zod validation passes and auth actually runs.
     *
     * Fastify runs body validation BEFORE preHandlers, so a missing/invalid body
     * returns 400 before auth is checked.
     *
     * Routes NOT listed here (intentionally excluded):
     *   - /v1/webhooks/*          — HMAC signature auth, different pattern
     *   - /v1/config/assets       — fully public, no auth
     *   - /v1/upload/logo         — dashboard OAuth hook, not API-key auth
     *   - GET /v1/invoices/:id    — explicitly public (payment page lookup)
     *   - POST /v1/merchants      — public merchant creation
     *   - POST /v1/auth/*         — public auth endpoints
     */
    const cases: Array<{
      method: "GET" | "POST" | "PATCH" | "DELETE";
      url: string;
      body?: object;
    }> = [
      // ── /v1/merchants/me — profile & settings ──────────────────────────────
      { method: "GET", url: "/v1/merchants/me" },
      { method: "PATCH", url: "/v1/merchants/me", body: {} },
      { method: "DELETE", url: "/v1/merchants/me" },
      { method: "GET", url: "/v1/merchants/me/stats" },

      // ── /v1/merchants/me — keys ─────────────────────────────────────────────
      { method: "POST", url: "/v1/merchants/me/keys" },
      { method: "POST", url: "/v1/merchants/me/keys/generate", body: {} },
      { method: "POST", url: "/v1/merchants/me/keys/webhook", body: {} },

      // ── /v1/merchants/me — plan & billing ──────────────────────────────────
      {
        method: "POST",
        url: "/v1/merchants/me/plan",
        body: { plan: "starter" },
      },
      { method: "POST", url: "/v1/merchants/me/charge-plan" },
      {
        method: "POST",
        url: "/v1/merchants/me/topup",
        body: { txHash: "abcdef1234567890abcd", currency: "BTC" },
      },
      {
        method: "POST",
        url: "/v1/merchants/me/promo/redeem",
        body: { code: "PROMO123" },
      },

      // ── /v1/merchants/me — wallet & security ───────────────────────────────
      { method: "POST", url: "/v1/merchants/me/wallet/generate-testnet" },
      { method: "GET", url: "/v1/merchants/me/ip-allowlist" },
      {
        method: "POST",
        url: "/v1/merchants/me/ip-allowlist",
        body: { enabled: false },
      },
      {
        method: "POST",
        url: "/v1/merchants/me/ip-allowlist/validate",
        body: { ip: "1.2.3.4" },
      },

      // ── /v1/merchants/me — notifications ───────────────────────────────────
      { method: "GET", url: "/v1/merchants/me/notifications" },
      { method: "PATCH", url: "/v1/merchants/me/notifications/mark-read" },
      { method: "PATCH", url: "/v1/merchants/me/notifications/notif_test" },

      // ── /v1/merchants/me — webhooks ─────────────────────────────────────────
      { method: "POST", url: "/v1/merchants/me/webhooks/test", body: {} },
      { method: "GET", url: "/v1/merchants/me/webhooks/deliveries" },
      { method: "GET", url: "/v1/merchants/me/webhooks/deliveries/del_test" },
      { method: "GET", url: "/v1/merchants/me/webhooks/stats" },

      // ── /v1/merchants/:merchantId — team management ─────────────────────────
      { method: "GET", url: "/v1/merchants/mid_test/team" },
      {
        method: "POST",
        url: "/v1/merchants/mid_test/team/invite",
        body: { email: "a@b.com", role: "admin" },
      },
      {
        method: "PATCH",
        url: "/v1/merchants/mid_test/team/mem_test/role",
        body: { role: "admin" },
      },
      { method: "DELETE", url: "/v1/merchants/mid_test/team/mem_test" },
      {
        method: "POST",
        url: "/v1/merchants/mid_test/team/transfer-ownership",
        body: { newOwnerId: "oid_123" },
      },
      { method: "POST", url: "/v1/merchants/mid_test/team/leave" },
      {
        method: "POST",
        url: "/v1/merchants/team/accept-invite",
        body: { inviteToken: "tok123" },
      },
      { method: "GET", url: "/v1/merchants/team/default" },
      {
        method: "POST",
        url: "/v1/merchants/team/default",
        body: { merchantId: "mid_123" },
      },

      // ── /v1/merchants/:merchantId — suspension & soft-delete ───────────────
      {
        method: "POST",
        url: "/v1/merchants/mid_test/suspend",
        body: { reason: "manual" },
      },
      { method: "POST", url: "/v1/merchants/mid_test/reinstate" },
      { method: "GET", url: "/v1/merchants/mid_test/suspension-status" },
      { method: "POST", url: "/v1/merchants/mid_test/delete" },
      { method: "POST", url: "/v1/merchants/mid_test/restore" },
      { method: "GET", url: "/v1/merchants/mid_test/delete-status" },

      // ── /v1/merchants/:merchantId — API key management ─────────────────────
      { method: "GET", url: "/v1/merchants/mid_test/keys" },
      { method: "POST", url: "/v1/merchants/mid_test/keys", body: {} },
      {
        method: "PATCH",
        url: "/v1/merchants/mid_test/keys/key_test",
        body: {},
      },
      {
        method: "POST",
        url: "/v1/merchants/mid_test/keys/key_test/revoke",
        body: {},
      },
      {
        method: "POST",
        url: "/v1/merchants/mid_test/keys/key_test/rotate",
      },

      // ── /v1/merchants/:merchantId — webhook endpoint management ────────────
      { method: "GET", url: "/v1/merchants/mid_test/webhooks/endpoints" },
      {
        method: "POST",
        url: "/v1/merchants/mid_test/webhooks/endpoints",
        body: { url: "https://example.com/wh" },
      },
      {
        method: "PATCH",
        url: "/v1/merchants/mid_test/webhooks/endpoints/ep_test",
        body: {},
      },
      {
        method: "DELETE",
        url: "/v1/merchants/mid_test/webhooks/endpoints/ep_test",
      },
      {
        method: "POST",
        url: "/v1/merchants/mid_test/webhooks/endpoints/ep_test/test",
      },
      {
        method: "GET",
        url: "/v1/merchants/mid_test/webhooks/endpoints/ep_test/secret",
      },

      // ── /v1/merchants — merchant list (requireAuth) ─────────────────────────
      { method: "GET", url: "/v1/merchants" },

      // ── /v1/merchants/me/2fa — two-factor auth (twoFactorRoutes) ───────────
      { method: "GET", url: "/v1/merchants/me/2fa/status" },
      { method: "POST", url: "/v1/merchants/me/2fa/setup" },
      {
        method: "POST",
        url: "/v1/merchants/me/2fa/enable",
        body: { code: "123456" },
      },
      {
        method: "POST",
        url: "/v1/merchants/me/2fa/validate",
        body: { code: "123456" },
      },
      {
        method: "POST",
        url: "/v1/merchants/me/2fa/disable",
        body: { code: "123456" },
      },

      // ── /v1/invoices — invoice lifecycle ────────────────────────────────────
      {
        method: "POST",
        url: "/v1/invoices",
        body: { amount_usd: 10, currency: "BTC" },
      },
      { method: "GET", url: "/v1/invoices" },
      { method: "POST", url: "/v1/invoices/inv_test/cancel" },
      { method: "POST", url: "/v1/invoices/inv_test/resolve" },

      // ── /v1/refunds — refund lifecycle ─────────────────────────────────────
      {
        method: "POST",
        url: "/v1/refunds",
        body: { invoice_id: "inv_test", amount_usd: 10, reason: "test" },
      },
      { method: "GET", url: "/v1/refunds" },
      { method: "GET", url: "/v1/refunds/ref_test" },
      { method: "POST", url: "/v1/refunds/ref_test/cancel" },

      // ── /v1/float — float management ─────────────────────────────────────
      { method: "POST", url: "/v1/float/invest", body: {} },
      { method: "GET", url: "/v1/float/health" },
      { method: "POST", url: "/v1/float/emergency-withdraw" },

      // ── /v1/auth/me — internal auth routes ─────────────────────────────────
      { method: "GET", url: "/v1/auth/me" },
      { method: "GET", url: "/v1/auth/me/audit-logs" },
    ];

    for (const tc of cases) {
      it(`${tc.method} ${tc.url}`, async () => {
        const response = await app.inject({
          method: tc.method,
          url: tc.url,
          headers:
            tc.body !== undefined ? { "content-type": "application/json" } : {},
          payload: tc.body !== undefined ? JSON.stringify(tc.body) : undefined,
        });

        expect(response.statusCode).toBe(401);
        const body = response.json();
        expectApiErrorEnvelope(body, `${tc.method} ${tc.url}`);
        expect(body.error.type).toBe("authentication_error");
        expect(body.error.code).toMatch(/^(unauthorized|invalid_api_key)$/);
        expect(isLegacyShape(body)).toBe(false);
      });
    }
  });

  // ─── 2. Invalid API key → 401 invalid_api_key ───────────────────────────────

  describe("Invalid API key → 401 invalid_api_key", () => {
    it("GET /v1/merchants/me with an unrecognised key", async () => {
      // ApiKey.findOne returns null (key not in DB) — this is the default mock
      const response = await app.inject({
        method: "GET",
        url: "/v1/merchants/me",
        headers: { "x-api-key": "knot_sk_unknown" },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expectApiErrorEnvelope(body);
      expect(body.error.code).toBe("invalid_api_key");
    });

    it("GET /v1/invoices with an unrecognised key", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/invoices",
        headers: { "x-api-key": "knot_sk_unknown" },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expectApiErrorEnvelope(body);
    });
  });

  // ─── 3. Suspended/deleted merchant → 403 merchant_suspended ─────────────────

  describe("Suspended merchant API key → 403 merchant_suspended", () => {
    it("returns 403 with apiError envelope", async () => {
      await mockApiKey({
        merchantId: {
          _id: "oid_123",
          merchantId: "mid_abc",
          isActive: false, // suspended
          isDeleted: false,
          plan: "starter",
          ipAllowlistEnabled: false,
        },
        isActive: true,
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/merchants/me",
        headers: { "x-api-key": "knot_sk_suspended" },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expectApiErrorEnvelope(body);
      expect(body.error.code).toBe("merchant_suspended");
    });

    it("deleted merchant key also → 403 merchant_suspended", async () => {
      await mockApiKey({
        merchantId: {
          _id: "oid_456",
          merchantId: "mid_def",
          isActive: true,
          isDeleted: true, // deleted
          plan: "starter",
        },
        isActive: true,
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/merchants/me",
        headers: { "x-api-key": "knot_sk_deleted" },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expectApiErrorEnvelope(body);
      expect(body.error.code).toBe("merchant_suspended");
    });
  });

  // ─── 4. Public auth routes ───────────────────────────────────────────────────

  describe("Public auth routes: accessible without merchant credentials", () => {
    it("POST /v1/auth/magic-link is NOT blocked with 401", async () => {
      const { VerificationToken } = await import("@qodinger/knot-database");
      vi.mocked((VerificationToken as any).create).mockResolvedValue({});

      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/magic-link",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ email: "user@example.com" }),
      });

      // Auth magic-link is a public route — no 401 for missing merchant creds
      expect(response.statusCode).not.toBe(401);
    });

    it("POST /v1/auth/link-oauth is NOT blocked with 401", async () => {
      const { User } = await import("@qodinger/knot-database");
      vi.mocked((User as any).findOne).mockResolvedValue(null);
      vi.mocked((User as any).create).mockResolvedValue({
        oauthId: "google:123",
        email: "u@example.com",
        emailVerified: true,
      });

      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/link-oauth",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({
          email: "u@example.com",
          provider: "google",
          providerId: "123",
        }),
      });

      expect(response.statusCode).not.toBe(401);
    });

    it("POST /v1/auth/verify is a public route (no 401)", async () => {
      const { VerificationToken, User, Merchant, MerchantMember } =
        await import("@qodinger/knot-database");

      // Return a valid, non-expired token so the controller proceeds past the
      // token check (the route is public — no merchant API key required).
      vi.mocked((VerificationToken as any).findOne).mockResolvedValue({
        _id: "vt_id",
        identifier: "user@example.com",
        token: "tok_valid_1234567890",
        expires: new Date(Date.now() + 60_000),
      });
      vi.mocked((VerificationToken as any).deleteOne).mockResolvedValue({});
      vi.mocked((User as any).findOne).mockResolvedValue(null);
      vi.mocked((User as any).create).mockResolvedValue({
        _id: { toString: () => "uid_123" },
        oauthId: "email:user@example.com",
        email: "user@example.com",
        emailVerified: true,
        referralCode: "REF_ABCD1234",
        creditBalance: 5,
        welcomeBonusClaimed: true,
      });
      vi.mocked((Merchant as any).create).mockResolvedValue({
        _id: { toString: () => "mid_obj_123" },
        merchantId: "mid_abc123",
        name: "",
        isActive: true,
        isDeleted: false,
        plan: "starter",
      });
      vi.mocked((MerchantMember as any).create).mockResolvedValue({});

      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/verify",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({
          email: "user@example.com",
          token: "tok_valid_1234567890",
        }),
      });

      // verify is a public route — no merchant API key required
      expect(response.statusCode).not.toBe(401);
    });

    it("POST /v1/auth/send-verification is a public route (no 401)", async () => {
      const { User } = await import("@qodinger/knot-database");
      vi.mocked((User as any).findOne).mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/v1/auth/send-verification",
        headers: { "content-type": "application/json" },
        payload: JSON.stringify({ email: "user@example.com" }),
      });

      // send-verification is a public route — no 401 for missing merchant credentials
      expect(response.statusCode).not.toBe(401);
    });
  });

  // ─── 5. Error format: never raw { error: "string" } ─────────────────────────

  describe("Error responses never use legacy { error: 'string' } shape", () => {
    it("401 from no-credentials has apiError shape", async () => {
      const routes: Array<{ method: "GET"; url: string }> = [
        { method: "GET", url: "/v1/merchants/me" },
        { method: "GET", url: "/v1/merchants/me/stats" },
        { method: "GET", url: "/v1/auth/me" },
      ];

      for (const route of routes) {
        const response = await app.inject({
          method: route.method,
          url: route.url,
        });

        expect(response.statusCode).toBe(401);
        const body = response.json();
        expect(isLegacyShape(body), `${route.url} returned legacy shape`).toBe(
          false,
        );
        expectApiErrorEnvelope(body);
      }
    });

    it("401 from invalid API key has apiError shape, not legacy shape", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/merchants/me",
        headers: { "x-api-key": "knot_sk_garbage" },
      });

      const body = response.json();
      expect(isLegacyShape(body)).toBe(false);
      expectApiErrorEnvelope(body);
    });

    it("403 from suspended merchant has apiError shape", async () => {
      await mockApiKey({
        merchantId: { isActive: false, isDeleted: false, plan: "starter" },
        isActive: true,
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/merchants/me",
        headers: { "x-api-key": "knot_sk_suspended" },
      });

      const body = response.json();
      expect(isLegacyShape(body)).toBe(false);
      expectApiErrorEnvelope(body);
    });
  });

  // ─── 6. Float plan guard ─────────────────────────────────────────────────────

  describe("Float routes: Enterprise-only plan guard", () => {
    it("starter merchant → 403 plan_limit_reached with apiError envelope", async () => {
      const { ipAllowlistMiddleware } =
        await import("../src/infra/ip-allowlist.js");
      vi.mocked(ipAllowlistMiddleware).mockResolvedValue(undefined as any);

      await mockApiKey({
        merchantId: {
          _id: "oid_starter",
          merchantId: "mid_starter",
          isActive: true,
          isDeleted: false,
          plan: "starter",
          ipAllowlistEnabled: false,
        },
        isActive: true,
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/float/stats",
        headers: { "x-api-key": "knot_sk_starter" },
      });

      expect(response.statusCode).toBe(403);
      const body = response.json();
      expectApiErrorEnvelope(body);
      expect(body.error.code).toBe("plan_limit_reached");
    });

    it("enterprise merchant → 200 with float stats", async () => {
      const { ipAllowlistMiddleware } =
        await import("../src/infra/ip-allowlist.js");
      vi.mocked(ipAllowlistMiddleware).mockResolvedValue(undefined as any);

      await mockApiKey({
        merchantId: {
          _id: "oid_ent",
          merchantId: "mid_ent",
          isActive: true,
          isDeleted: false,
          plan: "enterprise",
          ipAllowlistEnabled: false,
        },
        isActive: true,
      });

      const response = await app.inject({
        method: "GET",
        url: "/v1/float/stats",
        headers: { "x-api-key": "knot_sk_enterprise" },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ─── 7. List response contract ───────────────────────────────────────────────

  describe("List response contract: { object: 'list', data: [...] }", () => {
    it("GET /v1/invoices returns { object: 'list', data: [] }", async () => {
      const { Invoice } = await import("@qodinger/knot-database");
      const { ipAllowlistMiddleware } =
        await import("../src/infra/ip-allowlist.js");

      vi.mocked(ipAllowlistMiddleware).mockResolvedValue(undefined as any);

      await mockApiKey({
        merchantId: {
          _id: "oid_inv",
          merchantId: "mid_inv",
          isActive: true,
          isDeleted: false,
          plan: "starter",
          ipAllowlistEnabled: false,
        },
        isActive: true,
      });

      vi.mocked((Invoice as any).find).mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });
      vi.mocked((Invoice as any).countDocuments).mockResolvedValue(0);

      const response = await app.inject({
        method: "GET",
        url: "/v1/invoices",
        headers: { "x-api-key": "knot_sk_list_test" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({ object: "list", data: [] });
    });
  });

  // ─── 8. apiError code semantics ──────────────────────────────────────────────

  describe("Error code semantics", () => {
    it("auth errors always have type: authentication_error", async () => {
      const authErrors = [
        // no credentials
        await app.inject({ method: "GET", url: "/v1/merchants/me" }),
        // bad API key
        await app.inject({
          method: "GET",
          url: "/v1/merchants/me",
          headers: { "x-api-key": "knot_sk_bad" },
        }),
      ];

      for (const response of authErrors) {
        expect(response.statusCode).toBeGreaterThanOrEqual(401);
        expect(response.statusCode).toBeLessThan(500);
        const body = response.json();
        expect(body.error.type).toBe("authentication_error");
        expect(body.error.doc_url).toMatch(
          /^https:\/\/docs\.knotengine\.com\/api\/errors#/,
        );
      }
    });

    it("every error response has all four required fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/v1/merchants/me",
      });

      const { error } = response.json();
      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("code");
      expect(error).toHaveProperty("message");
      expect(error).toHaveProperty("doc_url");
    });
  });
});
