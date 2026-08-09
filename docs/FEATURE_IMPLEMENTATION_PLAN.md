# KnotEngine Feature Implementation Plan

> Expanding KnotEngine to match Plisio-level capabilities while preserving our non-custodial architecture.

**Last Updated:** June 28, 2026
**Research Source:** [plisio.net](https://plisio.net) (Payment Gateway, Wallet, Invoices, Mass Payouts, White Label, Donations, Affiliate Program)
**Status:** In Progress

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Plisio Feature Comparison](#plisio-feature-comparison)
3. [Feature 1: Payment Links (One-Click Payments)](#feature-1-payment-links-one-click-payments)
4. [Feature 2: Donation Pages](#feature-2-donation-pages)
5. [Feature 3: Enhanced Affiliate Program](#feature-3-enhanced-affiliate-program)
6. [Feature 4: White Label Enhancements](#feature-4-white-label-enhancements)
7. [Feature 5: Mass Payouts](#feature-5-mass-payouts)
8. [Feature 6: Crypto Exchange / Swap](#feature-6-crypto-exchange--swap)
9. [Feature 7: E-Commerce Plugins](#feature-7-e-commerce-plugins)
10. [Implementation Timeline](#implementation-timeline)
11. [Database Schema Changes](#database-schema-changes)
12. [API Route Summary](#api-route-summary)
13. [Dashboard Pages](#dashboard-pages)
14. [Testing Strategy](#testing-strategy)

---

## Executive Summary

KnotEngine is a non-custodial crypto payment infrastructure where merchants receive crypto directly to their own wallets. This plan adds Plisio-inspired features while maintaining our core architectural principle: **the platform never holds merchant funds**.

### Design Principles

1. **Non-custodial first** — Merchants always receive funds directly via HD wallet derivation
2. **Graceful degradation** — Redis optional, BullMQ falls back to in-memory
3. **Idempotent operations** — All mutations use Redis-backed idempotency keys
4. **Consistent API shapes** — `object: "invoice"` / `object: "list"` envelope pattern
5. **`apiError()` only** — No raw error responses (enforced by static scan)

---

## Plisio Feature Comparison

| Feature                      | Plisio                | KnotEngine Current | KnotEngine After    |
| ---------------------------- | --------------------- | ------------------ | ------------------- |
| Crypto Payment Gateway       | ✅                    | ✅                 | ✅                  |
| Invoices (create/send/track) | ✅                    | ✅                 | ✅                  |
| Multi-Currency Support       | 17 coins              | 7 currencies       | 7+ currencies       |
| Payment Links (One-Click)    | ✅                    | ❌                 | ✅ **DONE**         |
| Donation Pages               | ✅                    | ❌                 | ✅ **DONE**         |
| Mass Payouts                 | ✅                    | ❌                 | ✅                  |
| White Label                  | ✅                    | Partial            | ✅ Full             |
| Affiliate Program            | 25% tx + 10% exchange | 10% top-up         | Tiered 10-25%       |
| Exchange / Swap              | ✅                    | ❌                 | ✅                  |
| E-Commerce Plugins           | 15+ platforms         | SDK only           | SDK + Plugins       |
| Mobile App                   | ✅                    | ❌                 | Backlog             |
| Personal Wallet              | ✅ (custodial)        | N/A                | N/A (non-custodial) |

---

## Feature 1: Payment Links (One-Click Payments)

**Priority:** P0 | **Effort:** 2-3 days | **Impact:** High

Reusable, shareable payment links that create invoices on-the-fly. Similar to Stripe Payment Links or Plisio's invoice links.

### What It Does

- Merchant creates a link with optional fixed amount, currency, description
- Customer visits the link, chooses their crypto, pays
- Link can be shared anywhere (email, social, QR code)
- Supports custom amounts (tip jar, fundraising)
- Tracks usage count and total volume

### Database Model

```typescript
// packages/database/src/models/payment-link.model.ts

import { Schema, model, types } from "mongoose";

export interface IPaymentLink {
  merchantId: Schema.Types.ObjectId;
  linkId: string; // unique: link_abc123
  slug: string; // custom or auto-generated
  title: string;
  description?: string;
  amount?: number; // null = customer chooses amount
  currency?: string; // null = all enabled currencies
  isActive: boolean;
  usageCount: number;
  totalAmountUsd: number;
  maxUses?: number; // null = unlimited
  expiresAt?: Date;
  redirectUrl?: string; // post-payment redirect
  createdAt: Date;
  updatedAt: Date;
}

const PaymentLinkSchema = new Schema<IPaymentLink>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    linkId: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, min: 0 },
    currency: { type: String },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
    totalAmountUsd: { type: Number, default: 0 },
    maxUses: { type: Number },
    expiresAt: { type: Date },
    redirectUrl: { type: String },
  },
  { timestamps: true },
);

PaymentLinkSchema.index({ merchantId: 1, isActive: 1 });
PaymentLinkSchema.index({ slug: 1 });
PaymentLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PaymentLink = model<IPaymentLink>(
  "PaymentLink",
  PaymentLinkSchema,
);
```

### API Endpoints

```
POST   /v1/payment-links                     Create a payment link
GET    /v1/payment-links                     List merchant's payment links
GET    /v1/payment-links/:slug               Get link details (public)
PATCH  /v1/payment-links/:linkId             Update a payment link
DELETE /v1/payment-links/:linkId             Deactivate a payment link
GET    /v1/payment-links/:linkId/stats       Get usage statistics
POST   /v1/payment-links/:linkId/invoice     Create invoice from link
```

### Route Implementation

```typescript
// apps/api/src/routes/payment-links.ts

import { type FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { apiError } from "../utils/api-error";
import { z } from "zod";
import crypto from "crypto";
import { PaymentLink } from "@qodinger/database";

const createSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  slug: z.string().min(3).max(50).optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
  redirect_url: z.string().url().optional(),
});

export default async function paymentLinksRoutes(app: FastifyInstance) {
  // Create payment link
  app.post(
    "/v1/payment-links",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send(
          apiError({
            type: "validation_error",
            code: "invalid_request",
            message: parsed.error.issues[0].message,
            doc_url: "https://docs.knotengine.com/api#create-payment-link",
          }),
        );
      }

      const merchant = (req as any).merchant;
      const data = parsed.data;
      const linkId = `link_${crypto.randomBytes(12).toString("hex")}`;
      const slug = data.slug || `pay_${crypto.randomBytes(8).toString("hex")}`;

      const link = await PaymentLink.create({
        merchantId: merchant._id,
        linkId,
        slug,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        maxUses: data.max_uses,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        redirectUrl: data.redirect_url,
      });

      return reply.code(201).send({
        object: "payment_link",
        id: link.linkId,
        slug: link.slug,
        url: `${process.env.CHECKOUT_URL}/pay/${link.slug}`,
        title: link.title,
        amount: link.amount,
        currency: link.currency,
        is_active: link.is_active,
        created_at: link.createdAt,
      });
    },
  );

  // List payment links
  app.get(
    "/v1/payment-links",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const merchant = (req as any).merchant;
      const links = await PaymentLink.find({ merchantId: merchant._id }).sort({
        createdAt: -1,
      });

      return reply.send({
        object: "list",
        data: links.map((l) => ({
          object: "payment_link",
          id: l.linkId,
          slug: l.slug,
          url: `${process.env.CHECKOUT_URL}/pay/${l.slug}`,
          title: l.title,
          amount: l.amount,
          currency: l.currency,
          is_active: l.isActive,
          usage_count: l.usageCount,
          total_amount_usd: l.totalAmountUsd,
          created_at: l.createdAt,
        })),
      });
    },
  );

  // Get link (public)
  app.get("/v1/payment-links/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const link = await PaymentLink.findOne({ slug, isActive: true });

    if (!link) {
      return reply.code(404).send(
        apiError({
          type: "not_found",
          code: "link_not_found",
          message: "Payment link not found or inactive",
          doc_url: "https://docs.knotengine.com/api#get-payment-link",
        }),
      );
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return reply.code(410).send(
        apiError({
          type: "gone",
          code: "link_expired",
          message: "This payment link has expired",
          doc_url: "https://docs.knotengine.com/api#get-payment-link",
        }),
      );
    }

    return reply.send({
      object: "payment_link",
      id: link.linkId,
      title: link.title,
      description: link.description,
      amount: link.amount,
      currency: link.currency,
      suggested_amounts: link.amount ? undefined : [5, 10, 25, 50, 100],
    });
  });

  // Update payment link
  app.patch(
    "/v1/payment-links/:linkId",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const merchant = (req as any).merchant;
      const { linkId } = req.params as { linkId: string };

      const link = await PaymentLink.findOne({
        linkId,
        merchantId: merchant._id,
      });
      if (!link) {
        return reply.code(404).send(
          apiError({
            type: "not_found",
            code: "link_not_found",
            message: "Payment link not found",
            doc_url: "https://docs.knotengine.com/api#update-payment-link",
          }),
        );
      }

      const updates = req.body as Record<string, any>;
      const allowed = [
        "title",
        "description",
        "amount",
        "currency",
        "isActive",
        "maxUses",
        "expiresAt",
        "redirectUrl",
      ];

      for (const key of allowed) {
        if (updates[key] !== undefined) {
          (link as any)[key] = updates[key];
        }
      }

      await link.save();

      return reply.send({
        object: "payment_link",
        id: link.linkId,
        slug: link.slug,
        title: link.title,
        is_active: link.isActive,
      });
    },
  );

  // Deactivate payment link
  app.delete(
    "/v1/payment-links/:linkId",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const merchant = (req as any).merchant;
      const { linkId } = req.params as { linkId: string };

      const link = await PaymentLink.findOneAndUpdate(
        { linkId, merchantId: merchant._id },
        { isActive: false },
        { new: true },
      );

      if (!link) {
        return reply.code(404).send(
          apiError({
            type: "not_found",
            code: "link_not_found",
            message: "Payment link not found",
            doc_url: "https://docs.knotengine.com/api#delete-payment-link",
          }),
        );
      }

      return reply.send({
        object: "payment_link",
        id: link.linkId,
        is_active: false,
      });
    },
  );

  // Get stats
  app.get(
    "/v1/payment-links/:linkId/stats",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const merchant = (req as any).merchant;
      const { linkId } = req.params as { linkId: string };

      const link = await PaymentLink.findOne({
        linkId,
        merchantId: merchant._id,
      });
      if (!link) {
        return reply.code(404).send(
          apiError({
            type: "not_found",
            code: "link_not_found",
            message: "Payment link not found",
            doc_url: "https://docs.knotengine.com/api#payment-link-stats",
          }),
        );
      }

      return reply.send({
        object: "payment_link_stats",
        id: link.linkId,
        usage_count: link.usageCount,
        total_amount_usd: link.totalAmountUsd,
        avg_amount_usd:
          link.usageCount > 0 ? link.totalAmountUsd / link.usageCount : 0,
        max_uses: link.maxUses,
        remaining_uses: link.maxUses ? link.maxUses - link.usageCount : null,
        expires_at: link.expiresAt,
      });
    },
  );
}
```

### Checkout App Route

```tsx
// apps/checkout/src/app/pay/[slug]/page.tsx

// Public payment link page
// 1. Fetch link details from API
// 2. Show title, description, amount (or amount picker)
// 3. Currency selector (from merchant's enabledCurrencies)
// 4. "Pay" button creates invoice via API
// 5. Redirect to /checkout/[invoiceId]
```

### Dashboard Pages

```
apps/dashboard/src/app/dashboard/links/           # Payment links list
apps/dashboard/src/app/dashboard/links/[linkId]/  # Link details & stats
apps/dashboard/src/app/dashboard/links/new/       # Create new link
```

### Tests to Add

```typescript
// tests/payment-links.test.ts

describe("Payment Links", () => {
  it("creates a payment link with auto-generated slug");
  it("creates a payment link with custom slug");
  it("returns 400 for invalid input");
  it("lists merchant payment links");
  it("fetches public link by slug");
  it("returns 404 for inactive link");
  it("returns 410 for expired link");
  it("updates a payment link");
  it("deactivates a payment link");
  it("returns usage statistics");
  it("creates invoice from payment link");
  it("enforces max_uses limit");
  it("prevents cross-merchant link access");
});
```

---

## Feature 2: Donation Pages

**Priority:** P0 | **Effort:** 5-7 days | **Impact:** High

Public-facing donation pages for non-profits, creators, open-source projects, and streamers.

### What It Does

- Merchant creates a donation page with custom branding
- Public URL (e.g., `checkout.knotengine.com/donate/abc123`)
- Supports multiple currencies, suggested amounts
- QR code for easy sharing
- Embeddable donation button for websites
- Real-time donation counter
- Thank-you message after donation
- Export donor list (email optional)

### Database Model

```typescript
// packages/database/src/models/donation-page.model.ts

import { Schema, model } from "mongoose";

export interface IDonationPage {
  merchantId: Schema.Types.ObjectId;
  pageId: string; // donate_abc123
  slug: string; // custom URL slug
  title: string; // "Support Our Project"
  description?: string;
  logoUrl?: string;
  brandColor?: string;
  acceptedCurrencies: string[];
  suggestedAmounts: number[]; // [5, 10, 25, 50, 100]
  defaultCurrency: string;
  thankYouMessage: string;
  redirectUrl?: string;
  isActive: boolean;
  showTotalRaised: boolean;
  showDonorCount: boolean;
  allowCustomAmount: boolean;
  requireEmail: boolean;
  totalDonationsUsd: number;
  donationCount: number;
  theme: "light" | "dark" | "system";
  createdAt: Date;
  updatedAt: Date;
}

const DonationPageSchema = new Schema<IDonationPage>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    pageId: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    logoUrl: { type: String },
    brandColor: { type: String },
    acceptedCurrencies: [{ type: String, required: true }],
    suggestedAmounts: [{ type: Number, required: true }],
    defaultCurrency: { type: String, required: true },
    thankYouMessage: {
      type: String,
      default: "Thank you for your generous donation!",
    },
    redirectUrl: { type: String },
    isActive: { type: Boolean, default: true },
    showTotalRaised: { type: Boolean, default: true },
    showDonorCount: { type: Boolean, default: true },
    allowCustomAmount: { type: Boolean, default: true },
    requireEmail: { type: Boolean, default: false },
    totalDonationsUsd: { type: Number, default: 0 },
    donationCount: { type: Number, default: 0 },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
  },
  { timestamps: true },
);

DonationPageSchema.index({ merchantId: 1, isActive: 1 });
DonationPageSchema.index({ slug: 1 });
DonationPageSchema.index({ pageId: 1 });

export const DonationPage = model<IDonationPage>(
  "DonationPage",
  DonationPageSchema,
);
```

```typescript
// packages/database/src/models/donation-record.model.ts

import { Schema, model } from "mongoose";

export interface IDonationRecord {
  donationId: string; // don_abc123
  pageId: Schema.Types.ObjectId;
  merchantId: Schema.Types.ObjectId;
  invoiceId: Schema.Types.ObjectId;
  amountUsd: number;
  cryptoAmount: number;
  cryptoCurrency: string;
  donorEmail?: string;
  donorName?: string;
  message?: string;
  isAnonymous: boolean;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}

const DonationRecordSchema = new Schema<IDonationRecord>(
  {
    donationId: { type: String, required: true, unique: true },
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "DonationPage",
      required: true,
    },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    amountUsd: { type: Number, required: true },
    cryptoAmount: { type: Number, required: true },
    cryptoCurrency: { type: String, required: true },
    donorEmail: { type: String },
    donorName: { type: String },
    message: { type: String },
    isAnonymous: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

DonationRecordSchema.index({ pageId: 1, createdAt: -1 });
DonationRecordSchema.index({ merchantId: 1, createdAt: -1 });
DonationRecordSchema.index({ invoiceId: 1 }, { unique: true });

export const DonationRecord = model<IDonationRecord>(
  "DonationRecord",
  DonationRecordSchema,
);
```

### API Endpoints

```
# Merchant endpoints (requireAuth)
POST   /v1/donation-pages                      Create donation page
GET    /v1/donation-pages                      List donation pages
GET    /v1/donation-pages/:pageId              Get page details
PATCH  /v1/donation-pages/:pageId              Update donation page
DELETE /v1/donation-pages/:pageId              Deactivate donation page
GET    /v1/donation-pages/:pageId/stats        Get donation statistics
GET    /v1/donation-pages/:pageId/donations    List donations

# Public endpoints
GET    /v1/donate/:slug                        Get donation page (public)
POST   /v1/donate/:slug/invoice                Create donation invoice
```

### Route Implementation

```typescript
// apps/api/src/routes/donations.ts

import { type FastifyInstance } from "fastify";
import { requireAuth } from "../middleware/auth";
import { apiError } from "../utils/api-error";
import { z } from "zod";
import crypto from "crypto";
import {
  DonationPage,
  DonationRecord,
  Invoice,
  Merchant,
} from "@qodinger/database";
import { generateAddress } from "../core/wallet";

const createPageSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logo_url: z.string().url().optional(),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  accepted_currencies: z.array(z.string()).min(1),
  suggested_amounts: z.array(z.number().positive()).min(1).max(10),
  default_currency: z.string(),
  thank_you_message: z.string().max(500).optional(),
  redirect_url: z.string().url().optional(),
  show_total_raised: z.boolean().optional(),
  show_donor_count: z.boolean().optional(),
  allow_custom_amount: z.boolean().optional(),
  require_email: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export default async function donationsRoutes(app: FastifyInstance) {
  // Create donation page
  app.post(
    "/v1/donation-pages",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const parsed = createPageSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send(
          apiError({
            type: "validation_error",
            code: "invalid_request",
            message: parsed.error.issues[0].message,
            doc_url: "https://docs.knotengine.com/api#create-donation-page",
          }),
        );
      }

      const merchant = (req as any).merchant;
      const data = parsed.data;
      const pageId = `donate_${crypto.randomBytes(12).toString("hex")}`;
      const slug =
        data.slug || `donate-${crypto.randomBytes(6).toString("hex")}`;

      const page = await DonationPage.create({
        merchantId: merchant._id,
        pageId,
        slug,
        title: data.title,
        description: data.description,
        logoUrl: data.logo_url,
        brandColor: data.brand_color,
        acceptedCurrencies: data.accepted_currencies,
        suggestedAmounts: data.suggested_amounts,
        defaultCurrency: data.default_currency,
        thankYouMessage:
          data.thank_you_message || "Thank you for your generous donation!",
        redirectUrl: data.redirect_url,
        showTotalRaised: data.show_total_raised ?? true,
        showDonorCount: data.show_donor_count ?? true,
        allowCustomAmount: data.allow_custom_amount ?? true,
        requireEmail: data.require_email ?? false,
        theme: data.theme ?? "system",
      });

      return reply.code(201).send({
        object: "donation_page",
        id: page.pageId,
        slug: page.slug,
        url: `${process.env.CHECKOUT_URL}/donate/${page.slug}`,
        title: page.title,
        accepted_currencies: page.acceptedCurrencies,
        suggested_amounts: page.suggestedAmounts,
        is_active: page.isActive,
        created_at: page.createdAt,
      });
    },
  );

  // List donation pages
  app.get(
    "/v1/donation-pages",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const merchant = (req as any).merchant;
      const pages = await DonationPage.find({ merchantId: merchant._id }).sort({
        createdAt: -1,
      });

      return reply.send({
        object: "list",
        data: pages.map((p) => ({
          object: "donation_page",
          id: p.pageId,
          slug: p.slug,
          title: p.title,
          total_donations_usd: p.totalDonationsUsd,
          donation_count: p.donationCount,
          is_active: p.isActive,
          created_at: p.createdAt,
        })),
      });
    },
  );

  // Get donation page (public)
  app.get("/v1/donate/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const page = await DonationPage.findOne({ slug, isActive: true });

    if (!page) {
      return reply.code(404).send(
        apiError({
          type: "not_found",
          code: "page_not_found",
          message: "Donation page not found",
          doc_url: "https://docs.knotengine.com/api#get-donation-page",
        }),
      );
    }

    const merchant = await Merchant.findOne({ _id: page.merchantId });

    return reply.send({
      object: "donation_page",
      id: page.pageId,
      title: page.title,
      description: page.description,
      logo_url: page.logoUrl || merchant?.logoUrl,
      brand_color: page.brandColor || merchant?.brandColor,
      accepted_currencies: page.acceptedCurrencies,
      suggested_amounts: page.suggestedAmounts,
      default_currency: page.defaultCurrency,
      thank_you_message: page.thankYouMessage,
      allow_custom_amount: page.allowCustomAmount,
      show_total_raised: page.showTotalRaised,
      show_donor_count: page.showDonorCount,
      total_donations_usd: page.showTotalRaised
        ? page.totalDonationsUsd
        : undefined,
      donation_count: page.showDonorCount ? page.donationCount : undefined,
      theme: page.theme,
    });
  });

  // Create donation invoice
  app.post("/v1/donate/:slug/invoice", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const page = await DonationPage.findOne({ slug, isActive: true });

    if (!page) {
      return reply.code(404).send(
        apiError({
          type: "not_found",
          code: "page_not_found",
          message: "Donation page not found",
          doc_url: "https://docs.knotengine.com/api#create-donation-invoice",
        }),
      );
    }

    const {
      amount_usd,
      currency,
      donor_email,
      donor_name,
      message,
      is_anonymous,
    } = req.body as {
      amount_usd: number;
      currency: string;
      donor_email?: string;
      donor_name?: string;
      message?: string;
      is_anonymous?: boolean;
    };

    if (!amount_usd || amount_usd <= 0) {
      return reply.code(400).send(
        apiError({
          type: "validation_error",
          code: "invalid_amount",
          message: "Amount must be a positive number",
          doc_url: "https://docs.knotengine.com/api#create-donation-invoice",
        }),
      );
    }

    if (!page.acceptedCurrencies.includes(currency)) {
      return reply.code(400).send(
        apiError({
          type: "validation_error",
          code: "currency_not_accepted",
          message: `This donation page accepts: ${page.acceptedCurrencies.join(", ")}`,
          doc_url: "https://docs.knotengine.com/api#create-donation-invoice",
        }),
      );
    }

    const merchant = await Merchant.findOne({ _id: page.merchantId });
    if (!merchant) {
      return reply.code(500).send(
        apiError({
          type: "internal_error",
          code: "merchant_not_found",
          message: "Merchant not found",
          doc_url: "https://docs.knotengine.com/api#create-donation-invoice",
        }),
      );
    }

    // Create invoice (reuses existing invoice system)
    const invoice = await Invoice.create({
      merchantId: merchant._id,
      invoiceId: `inv_${crypto.randomBytes(12).toString("hex")}`,
      amountUsd: amount_usd,
      cryptoCurrency: currency,
      status: "pending",
      description: `Donation: ${page.title}`,
      metadata: {
        type: "donation",
        pageId: page.pageId,
        donorEmail: donor_email,
        donorName: donor_name,
        message,
        isAnonymous: is_anonymous ?? false,
      },
    });

    // Create donation record
    const donation = await DonationRecord.create({
      donationId: `don_${crypto.randomBytes(12).toString("hex")}`,
      pageId: page._id,
      merchantId: merchant._id,
      invoiceId: invoice._id,
      amountUsd: amount_usd,
      cryptoAmount: 0, // updated on payment
      cryptoCurrency: currency,
      donorEmail: donor_email,
      donorName: donor_name,
      message,
      isAnonymous: is_anonymous ?? false,
      status: "pending",
    });

    return reply.code(201).send({
      object: "donation_invoice",
      invoice_id: invoice.invoiceId,
      donation_id: donation.donationId,
      checkout_url: `${process.env.CHECKOUT_URL}/checkout/${invoice.invoiceId}`,
      amount_usd: amount_usd,
      currency,
    });
  });

  // Get donation stats
  app.get(
    "/v1/donation-pages/:pageId/stats",
    { preHandler: [requireAuth] },
    async (req, reply) => {
      const merchant = (req as any).merchant;
      const { pageId } = req.params as { pageId: string };

      const page = await DonationPage.findOne({
        pageId,
        merchantId: merchant._id,
      });
      if (!page) {
        return reply.code(404).send(
          apiError({
            type: "not_found",
            code: "page_not_found",
            message: "Donation page not found",
            doc_url: "https://docs.knotengine.com/api#donation-stats",
          }),
        );
      }

      const recentDonations = await DonationRecord.find({
        pageId: page._id,
        status: "completed",
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "donationId amountUsd cryptoCurrency donorName donorEmail message isAnonymous createdAt",
        );

      return reply.send({
        object: "donation_stats",
        page_id: page.pageId,
        total_donations_usd: page.totalDonationsUsd,
        donation_count: page.donationCount,
        avg_donation_usd:
          page.donationCount > 0
            ? page.totalDonationsUsd / page.donationCount
            : 0,
        recent_donations: recentDonations.map((d) => ({
          id: d.donationId,
          amount_usd: d.amountUsd,
          currency: d.cryptoCurrency,
          donor: d.isAnonymous
            ? "Anonymous"
            : d.donorName || d.donorEmail || "Anonymous",
          message: d.message,
          created_at: d.createdAt,
        })),
      });
    },
  );
}
```

### Checkout App Route

```tsx
// apps/checkout/src/app/donate/[slug]/page.tsx

// Public donation page
// 1. Fetch page details from /v1/donate/:slug
// 2. Show page title, description, logo
// 3. Show total raised / donor count (if enabled)
// 4. Suggested amount buttons or custom amount input
// 5. Currency selector
// 6. Optional: name, email, message fields
// 7. "Donate" button creates invoice
// 8. Redirect to /checkout/[invoiceId]
// 9. After payment: show thank-you message
```

### Dashboard Pages

```
apps/dashboard/src/app/dashboard/donations/              # Donation pages list
apps/dashboard/src/app/dashboard/donations/[pageId]/     # Page details & stats
apps/dashboard/src/app/dashboard/donations/new/          # Create donation page
apps/dashboard/src/app/dashboard/donations/[pageId]/edit/ # Edit page
```

### Embed Code

```html
<!-- Donation button embed -->
<iframe
  src="https://checkout.knotengine.com/donate/my-page?embed=true"
  width="320"
  height="480"
  frameborder="0"
></iframe>

<!-- QR code link -->
<img
  src="https://checkout.knotengine.com/api/donate/my-page/qr"
  alt="Donate with crypto"
/>
```

### Tests to Add

```typescript
// tests/donation-pages.test.ts

describe("Donation Pages", () => {
  it("creates a donation page");
  it("creates a donation page with custom slug");
  it("returns 400 for missing accepted currencies");
  it("lists merchant donation pages");
  it("fetches public donation page by slug");
  it("returns 404 for inactive donation page");
  it("creates donation invoice with valid amount");
  it("creates donation invoice with custom amount");
  it("rejects donation in non-accepted currency");
  it("rejects donation with zero amount");
  it("tracks total donations and count");
  it("returns donation statistics");
  it("lists recent donations");
  it("supports anonymous donations");
  it("prevents cross-merchant donation page access");
});
```

---

## Feature 3: Enhanced Affiliate Program

**Priority:** P1 | **Effort:** 3-4 days | **Impact:** High

Upgrade from flat 10% to tiered commission structure with payout requests.

### Current State

- User model has `referralCode`, `referredBy`, `referralEarningsUsd`
- 10% commission on referred user top-ups
- Cookie-based tracking via `knot_affiliate_id`
- Dashboard affiliate/referral pages exist

### Changes

#### Database Additions

```typescript
// Add to User model
{
  affiliateTier: {
    type: String,
    enum: ["standard", "silver", "gold", "platinum"],
    default: "standard",
  },
  affiliateTierAt: Date,
  totalReferrals: { type: Number, default: 0 },
  monthlyReferralEarnings: { type: Number, default: 0 },
  affiliatePayoutMethod: {
    type: String,
    enum: ["credit", "crypto"],
    default: "credit",
  },
  affiliatePayoutAddress: String,  // crypto address for payouts
}

// New model: AffiliatePayout
// packages/database/src/models/affiliate-payout.model.ts

import { Schema, model } from "mongoose";

export interface IAffiliatePayout {
  payoutId: string;             // apay_abc123
  userId: Schema.Types.ObjectId;
  amountUsd: number;
  method: "credit" | "crypto";
  cryptoCurrency?: string;
  cryptoAmount?: number;
  txHash?: string;
  status: "pending" | "processing" | "paid" | "failed";
  period: string;               // "2026-06"
  createdAt: Date;
  paidAt?: Date;
}

const AffiliatePayoutSchema = new Schema<IAffiliatePayout>({
  payoutId: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amountUsd: { type: Number, required: true },
  method: { type: String, enum: ["credit", "crypto"], required: true },
  cryptoCurrency: { type: String },
  cryptoAmount: { type: Number },
  txHash: { type: String },
  status: { type: String, enum: ["pending", "processing", "paid", "failed"], default: "pending" },
  period: { type: String, required: true },
  paidAt: { type: Date },
}, { timestamps: true });

AffiliatePayoutSchema.index({ userId: 1, period: 1 });
AffiliatePayoutSchema.index({ status: 1 });

export const AffiliatePayout = model<IAffiliatePayout>("AffiliatePayout", AffiliatePayoutSchema);
```

#### Tier Logic

```typescript
// apps/api/src/core/affiliate.ts

export function getAffiliateTier(totalReferrals: number): string {
  if (totalReferrals >= 200) return "platinum";
  if (totalReferrals >= 50) return "gold";
  if (totalReferrals >= 11) return "silver";
  return "standard";
}

export function getCommissionRate(tier: string): number {
  const rates: Record<string, number> = {
    standard: 0.1, // 10%
    silver: 0.15, // 15%
    gold: 0.2, // 20%
    platinum: 0.25, // 25%
  };
  return rates[tier] || 0.1;
}

export function getTierBenefits(tier: string) {
  const benefits = {
    standard: {
      commissionRate: 0.1,
      minReferrals: 0,
      nextTier: "silver",
      referralsNeeded: 11,
    },
    silver: {
      commissionRate: 0.15,
      minReferrals: 11,
      nextTier: "gold",
      referralsNeeded: 51,
    },
    gold: {
      commissionRate: 0.2,
      minReferrals: 51,
      nextTier: "platinum",
      referralsNeeded: 200,
    },
    platinum: {
      commissionRate: 0.25,
      minReferrals: 200,
      nextTier: null,
      referralsNeeded: 0,
    },
  };
  return benefits[tier as keyof typeof benefits] || benefits.standard;
}
```

#### Updated Billing Controller

```typescript
// In apps/api/src/controllers/merchant/billing.controller.ts
// When processing top-up, use tier-based commission:

import { getAffiliateTier, getCommissionRate } from "../../core/affiliate";

// Replace existing referral credit logic:
const referrer = await User.findOne({ _id: referredBy });
if (referrer) {
  const tier = getAffiliateTier(referrer.totalReferrals || 0);
  const rate = getCommissionRate(tier);
  const commission = topUpAmount * rate;

  referrer.creditBalance += commission;
  referrer.referralEarningsUsd =
    (referrer.referralEarningsUsd || 0) + commission;
  referrer.monthlyReferralEarnings =
    (referrer.monthlyReferralEarnings || 0) + commission;
  await referrer.save();

  // Create audit log
  await AuditLog.create({
    userId: referrer._id,
    action: "affiliate_commission",
    category: "billing",
    description: `${(rate * 100).toFixed(0)}% commission (${tier} tier) from referral top-up`,
    metadata: { amount: commission, tier, referredUserId: user._id },
  });
}
```

### New API Endpoints

```
GET    /v1/affiliates/stats              # Dashboard overview
GET    /v1/affiliates/referrals          # List referred users
GET    /v1/affiliates/earnings           # Earnings history
GET    /v1/affiliates/tier               # Current tier & benefits
POST   /v1/affiliates/payout             # Request payout of earnings
GET    /v1/affiliates/payouts            # List payout history
GET    /v1/affiliates/materials          # Promo banners, links, embed codes
```

### Dashboard Updates

```
apps/dashboard/src/app/dashboard/affiliates/
  page.tsx          # Update: tier badge, progress bar to next tier
  stats/            # New: detailed stats breakdown
  payouts/          # New: payout history & request
```

### Tests to Add

```typescript
// tests/affiliate-enhanced.test.ts

describe("Enhanced Affiliate Program", () => {
  it("calculates correct tier for 0 referrals");
  it("calculates correct tier for 11 referrals (silver)");
  it("calculates correct tier for 51 referrals (gold)");
  it("calculates correct tier for 200 referrals (platinum)");
  it("applies 10% commission for standard tier");
  it("applies 15% commission for silver tier");
  it("applies 20% commission for gold tier");
  it("applies 25% commission for platinum tier");
  it("auto-upgrades tier when referral threshold reached");
  it("creates payout request");
  it("prevents payout below minimum ($10)");
  it("tracks monthly earnings");
  it("returns tier benefits and progress");
});
```

---

## Feature 4: White Label Enhancements

**Priority:** P1 | **Effort:** 3-5 days | **Impact:** High

Full white-label capability: custom CSS, custom domains, embeddable checkout, no KnotEngine branding.

### What Already Exists

- `brandColor`, `logoUrl`, `theme`, `brandingEnabled`, `removeBranding`, `brandingAlignment`

### What to Add

#### Database Additions

```typescript
// Add to Merchant model
{
  whiteLabelEnabled: { type: Boolean, default: false },
  customCss: { type: String },               // merchant custom CSS (max 10KB)
  customDomain: { type: String },            // e.g., pay.merchant.com
  customDomainVerified: { type: Boolean, default: false },
  checkoutLayout: {
    type: String,
    enum: ["standard", "minimal", "embedded"],
    default: "standard",
  },
  invoiceFooterHtml: { type: String },       // custom footer (max 5KB)
  hideNetworkInfo: { type: Boolean, default: false },
  hideQrCode: { type: Boolean, default: false },
  redirectAfterPayment: { type: Boolean, default: true },
  customReceiptMessage: { type: String },    // post-payment message
}
```

### API Endpoints

```
POST   /v1/merchants/me/white-label/preview          # Preview WL checkout
POST   /v1/merchants/me/white-label/css              # Upload custom CSS
GET    /v1/merchants/me/white-label/domains           # List custom domains
POST   /v1/merchants/me/white-label/domains           # Add custom domain
DELETE /v1/merchants/me/white-label/domains/:domain   # Remove custom domain
POST   /v1/merchants/me/white-label/domains/:domain/verify  # Verify domain
GET    /v1/merchants/me/white-label/embed             # Get embed code
```

### Checkout Changes

```tsx
// apps/checkout/src/app/checkout/[invoiceId]/page.tsx

// Add white-label detection:
// 1. Check if custom domain matches request host
// 2. If whiteLabelEnabled:
//    - Hide all KnotEngine branding
//    - Apply customCss from merchant settings
//    - Use checkoutLayout variant
//    - Show custom footer if provided
//    - Hide network info if configured
//    - Hide QR code if configured
//    - Use custom receipt message
// 3. If embed=true query param:
//    - Render minimal layout (no header/footer)
//    - Suitable for iframe embedding
```

### Domain Verification Flow

```
1. Merchant adds custom domain (e.g., pay.merchant.com)
2. System generates DNS verification record:
   Type: TXT
   Name: _knotengine-verify
   Value: knverify_merchantId_hash
3. Merchant adds TXT record to DNS
4. System verifies via DNS lookup
5. Custom domain activated
6. SSL certificate auto-provisioned via Let's Encrypt
```

### Tests to Add

```typescript
// tests/white-label.test.ts

describe("White Label", () => {
  it("enables white label for merchant");
  it("saves custom CSS");
  it("rejects CSS over 10KB");
  it("adds custom domain");
  it("generates DNS verification record");
  it("verifies domain via DNS TXT lookup");
  it("returns embed code for checkout");
  it("hides KnotEngine branding when WL enabled");
  it("applies custom CSS to checkout");
  it("uses minimal layout when configured");
  it("prevents custom domain collision between merchants");
});
```

---

## Feature 5: Mass Payouts

**Priority:** P2 | **Effort:** 7-10 days | **Impact:** Medium

Batch send crypto to multiple recipients. Since KnotEngine is non-custodial, this uses the platform's float/balance system or direct merchant wallet.

### Architecture Decision

Two approaches for non-custodial mass payouts:

**Option A: Float-based payouts (recommended)**

- Merchant tops up platform balance (already exists via TopUpClaim)
- Mass payouts send from platform float to recipients
- Platform manages UTXO consolidation for fee savings

**Option B: Direct wallet payouts**

- Merchant signs transactions from their own wallet
- Requires merchant to expose signing capability
- More complex, less practical

**Recommendation:** Option A — extend the existing top-up/float system to support outbound payouts.

### Database Models

```typescript
// packages/database/src/models/payout-batch.model.ts

import { Schema, model } from "mongoose";

export interface IPayoutBatch {
  batchId: string; // batch_abc123
  merchantId: Schema.Types.ObjectId;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled";
  currency: string;
  totalAmount: number;
  feeAmount: number;
  recipientCount: number;
  completedCount: number;
  failedCount: number;
  fileImport: boolean;
  fileName?: string;
  results: Array<{
    recipientAddress: string;
    recipientName?: string;
    amount: number;
    status: "pending" | "sent" | "failed";
    txHash?: string;
    error?: string;
  }>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const PayoutBatchSchema = new Schema<IPayoutBatch>(
  {
    batchId: { type: String, required: true, unique: true },
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "partial",
        "failed",
        "cancelled",
      ],
      default: "pending",
    },
    currency: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    feeAmount: { type: Number, default: 0 },
    recipientCount: { type: Number, required: true },
    completedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    fileImport: { type: Boolean, default: false },
    fileName: { type: String },
    results: [
      {
        recipientAddress: String,
        recipientName: String,
        amount: Number,
        status: { type: String, enum: ["pending", "sent", "failed"] },
        txHash: String,
        error: String,
      },
    ],
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

PayoutBatchSchema.index({ merchantId: 1, createdAt: -1 });
PayoutBatchSchema.index({ status: 1 });

export const PayoutBatch = model<IPayoutBatch>(
  "PayoutBatch",
  PayoutBatchSchema,
);
```

```typescript
// packages/database/src/models/payout-recipient.model.ts

import { Schema, model } from "mongoose";

export interface IPayoutRecipient {
  merchantId: Schema.Types.ObjectId;
  name: string;
  address: string;
  currency: string;
  email?: string;
  label?: string;
  totalReceived: number;
  payoutCount: number;
  lastPayoutAt?: Date;
  createdAt: Date;
}

const PayoutRecipientSchema = new Schema<IPayoutRecipient>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
    },
    name: { type: String, required: true },
    address: { type: String, required: true },
    currency: { type: String, required: true },
    email: { type: String },
    label: { type: String },
    totalReceived: { type: Number, default: 0 },
    payoutCount: { type: Number, default: 0 },
    lastPayoutAt: { type: Date },
  },
  { timestamps: true },
);

PayoutRecipientSchema.index({ merchantId: 1, currency: 1 });
PayoutRecipientSchema.index({ merchantId: 1, address: 1 }, { unique: true });

export const PayoutRecipient = model<IPayoutRecipient>(
  "PayoutRecipient",
  PayoutRecipientSchema,
);
```

### API Endpoints

```
POST   /v1/payouts/batches                       Create batch payout
GET    /v1/payouts/batches                       List batches
GET    /v1/payouts/batches/:batchId              Get batch details
POST   /v1/payouts/batches/:batchId/cancel       Cancel pending batch
POST   /v1/payouts/batches/:batchId/process      Process batch (admin)
GET    /v1/payouts/batches/:batchId/status       Poll batch status

POST   /v1/payouts/recipients                    Save recipient
GET    /v1/payouts/recipients                    List saved recipients
PUT    /v1/payouts/recipients/:recipientId       Update recipient
DELETE /v1/payouts/recipients/:recipientId       Delete recipient

POST   /v1/payouts/import                        Import recipients from CSV
GET    /v1/payouts/estimate                      Fee estimation for batch
GET    /v1/payouts/history                       Payout history
```

### Fee Estimation Logic

```typescript
// apps/api/src/core/payout-estimator.ts

export function estimatePayoutFees(
  recipientCount: number,
  totalAmount: number,
  currency: string,
): { feePerRecipient: number; totalFee: number; savedVsIndividual: number } {
  // Network fees vary by currency
  const networkFees: Record<string, number> = {
    BTC: 0.0001, // ~$6 at $60k
    ETH: 0.002, // ~$6 at $3k
    LTC: 0.0001, // ~$0.01
    USDT_ERC20: 0.002,
    USDC_ERC20: 0.002,
  };

  const feePerTx = networkFees[currency] || 0.001;
  const individualFee = feePerTx * recipientCount;
  const batchFee = feePerTx * Math.ceil(recipientCount / 10); // batch UTXOs
  const saved = individualFee - batchFee;

  return {
    feePerRecipient: batchFee / recipientCount,
    totalFee: batchFee,
    savedVsIndividual: saved,
  };
}
```

### Tests to Add

```typescript
// tests/mass-payouts.test.ts

describe("Mass Payouts", () => {
  it("creates payout batch from manual input");
  it("creates payout batch from CSV import");
  it("estimates batch fees");
  it("shows fee savings vs individual sends");
  it("cancels pending batch");
  it("prevents duplicate batch processing");
  it("tracks individual recipient status");
  it("handles partial failures gracefully");
  it("lists payout history");
  it("saves recipients for reuse");
  it("prevents cross-merchant recipient access");
  it("validates crypto addresses");
});
```

---

## Feature 6: Crypto Exchange / Swap

**Priority:** P3 | **Effort:** 10-14 days | **Impact:** Medium

Crypto-to-crypto exchange quotes and swap execution via DEX aggregator integration.

### Architecture

Since KnotEngine is non-custodial, exchange works as:

1. **Quote API** — Get conversion rate between currencies
2. **Swap execution** — Route through DEX aggregator (1inch, 0x, or Paraswap)
3. **Cross-currency invoices** — Pay invoice in BTC, receive in ETH

### Integration Options

| Provider       | Pros                    | Cons                       |
| -------------- | ----------------------- | -------------------------- |
| **1inch**      | Best rates, most chains | Requires API key, gas fees |
| **0x**         | Good rates, simple API  | Limited chains             |
| **CoinGecko**  | Free, rates only        | No execution               |
| **SimpleSwap** | No API key needed       | Higher spreads             |

**Recommendation:** CoinGecko for quotes, 1inch for execution.

### Database Models

```typescript
// packages/database/src/models/exchange-quote.model.ts

import { Schema, model } from "mongoose";

export interface IExchangeQuote {
  quoteId: string; // quote_abc123
  merchantId?: Schema.Types.ObjectId;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  networkFee: number;
  platformFee: number;
  expiresAt: Date;
  provider: string;
  status: "active" | "expired" | "used" | "failed";
  createdAt: Date;
}

const ExchangeQuoteSchema = new Schema<IExchangeQuote>(
  {
    quoteId: { type: String, required: true, unique: true },
    merchantId: { type: Schema.Types.ObjectId, ref: "Merchant" },
    fromCurrency: { type: String, required: true },
    toCurrency: { type: String, required: true },
    fromAmount: { type: Number, required: true },
    toAmount: { type: Number, required: true },
    rate: { type: Number, required: true },
    networkFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "used", "failed"],
      default: "active",
    },
  },
  { timestamps: true },
);

ExchangeQuoteSchema.index({ quoteId: 1 });
ExchangeQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
ExchangeQuoteSchema.index({ merchantId: 1, createdAt: -1 });

export const ExchangeQuote = model<IExchangeQuote>(
  "ExchangeQuote",
  ExchangeQuoteSchema,
);
```

### API Endpoints

```
POST   /v1/exchange/quote               Get exchange quote
GET    /v1/exchange/quote/:quoteId      Get quote details
GET    /v1/exchange/rates               Get all supported rates
POST   /v1/exchange/swap                Execute swap (via DEX)
GET    /v1/exchange/swap/:swapId        Get swap status
GET    /v1/exchange/history             Swap history
GET    /v1/exchange/pairs               List supported pairs
```

### Integration Flow

```
1. Merchant requests quote: GET /v1/exchange/quote
   → from_currency=BTC, to_currency=ETH, amount=1.5

2. System fetches rate from CoinGecko
   → BTC/ETH rate = 15.2

3. System calculates:
   → fromAmount: 1.5 BTC
   → toAmount: 1.5 * 15.2 = 22.8 ETH
   → networkFee: 0.0001 BTC
   → platformFee: 0.0015 BTC (0.1%)
   → quote valid for 15 minutes

4. Merchant accepts quote: POST /v1/exchange/swap
   → quote_id = "quote_abc123"
   → from_address = "merchant_btc_address"
   → to_address = "merchant_eth_address"

5. System routes through 1inch
   → Returns swap transaction data

6. Merchant signs and broadcasts transaction
   → Swap ID returned for tracking
```

### Tests to Add

```typescript
// tests/exchange.test.ts

describe("Crypto Exchange", () => {
  it("fetches exchange rate from CoinGecko");
  it("calculates quote with fees");
  it("expires quote after 15 minutes");
  it("lists supported trading pairs");
  it("creates swap from valid quote");
  it("rejects swap with expired quote");
  it("tracks swap status");
  it("returns swap history");
  it("prevents same-currency swap");
  it("handles provider downtime gracefully");
});
```

---

## Feature 7: E-Commerce Plugins

**Priority:** P3 | **Effort:** 14-21 days | **Impact:** High (long-term)

Official plugins for major e-commerce platforms.

### Platforms (Priority Order)

| Platform                    | Market Share | Effort    | Priority      |
| --------------------------- | ------------ | --------- | ------------- |
| **WooCommerce** (WordPress) | 39%          | 5-7 days  | P0            |
| **Shopify**                 | 28%          | 7-10 days | P0            |
| **Magento**                 | 6%           | 5-7 days  | P1            |
| **PrestaShop**              | 3%           | 3-5 days  | P1            |
| **BigCommerce**             | 2%           | 3-5 days  | P2            |
| **Custom (npm)**            | N/A          | 2-3 days  | ✅ Done (SDK) |

### Plugin Architecture

```
packages/
  plugin-woo/          # WooCommerce plugin (PHP)
  plugin-shopify/      # Shopify app (Node.js)
  plugin-magento/      # Magento module (PHP)
  plugin-prestashop/   # PrestaShop module (PHP)
```

### WooCommerce Plugin Structure

```
plugin-woo/
├── knotengine-woo.php           # Main plugin file
├── includes/
│   ├── class-knotengine.php     # Core plugin class
│   ├── class-webhook.php        # Webhook handler
│   ├── class-settings.php       # Admin settings page
│   └── class-checkout.php       # Checkout integration
├── templates/
│   ├── checkout-button.php      # Pay with crypto button
│   └── order-receipt.php        # Post-payment receipt
├── assets/
│   ├── css/
│   └── js/
├── readme.txt
└── package.json
```

### Integration Points

```php
// WooCommerce hooks
add_action('woocommerce_review_order_before_payment', 'knotengine_checkout_button');
add_action('woocommerce_thankyou', 'knotengine_order_receipt');
add_action('woocommerce_api_knotengine_webhook', 'knotengine_webhook_handler');

// Shopify app
// - Shopify App Bridge for embedded app
// - Checkout extension for crypto payment option
// - Webhook for order creation/fulfillment
```

### Tests

Each plugin gets its own test suite:

- Unit tests for PHP plugins (PHPUnit)
- Integration tests for Shopify (Jest)
- E2E tests for each platform

---

## Implementation Timeline

```
Month 1 (July 2026)
├── Week 1-2: Payment Links (P0) ✅ COMPLETED June 28
├── Week 3-4: Donation Pages (P0) ✅ COMPLETED June 28
└── Deliverables: 2 new features, 30 tests

Month 2 (August 2026)
├── Week 1-2: Enhanced Affiliates (P1) — NEXT
├── Week 3-4: White Label Enhancements (P1)
└── Deliverables: 2 features upgraded, 25+ tests

Month 3 (September 2026)
├── Week 1-3: Mass Payouts (P2)
├── Week 4: Exchange Quotes (P3 start)
└── Deliverables: 1 major feature, 20+ tests

Month 4 (October 2026)
├── Week 1-2: Exchange/Swap completion (P3)
├── Week 3-4: WooCommerce Plugin (P3)
└── Deliverables: 1 feature + 1 plugin, 30+ tests

Month 5-6 (Nov-Dec 2026)
├── Shopify Plugin
├── Magento Plugin
├── Advanced analytics
└── Mobile app (if requested)
```

### Milestone Checklist

- [x] **M1:** Payment Links live — COMPLETED (June 28, 2026)
  - Database model: `PaymentLink` in `packages/database/src/models/payment-link.model.ts`
  - API routes: 7 endpoints in `apps/api/src/routes/payment-links.ts`
  - Dashboard: `/dashboard/links` with 3-step create modal
  - Checkout: `/pay/[slug]` with QR code, currency selector
  - Tests: 13 model tests passing
- [x] **M2:** Donation Pages live — COMPLETED (June 28, 2026)
  - Database model: `Donation` in `packages/database/src/models/donation.model.ts`
  - API routes: 7 endpoints in `apps/api/src/routes/donations.ts`
  - Dashboard: `/dashboard/donations` with progress bars, stats
  - Checkout: `/donate/[slug]` with goal tracking, thank you screen
  - Tests: 17 model tests passing
- [ ] **M3:** Enhanced Affiliates live (tiered commissions)
- [ ] **M4:** White Label fully operational
- [ ] **M5:** Mass Payouts live
- [ ] **M6:** Exchange/Swap live
- [ ] **M7:** WooCommerce plugin published
- [ ] **M8:** Shopify app submitted

---

## Database Schema Changes

### Summary of New Models

| Model             | File                                                     | Purpose                           | Status      |
| ----------------- | -------------------------------------------------------- | --------------------------------- | ----------- |
| `PaymentLink`     | `packages/database/src/models/payment-link.model.ts`     | Reusable payment links            | ✅ Complete |
| `Donation`        | `packages/database/src/models/donation.model.ts`         | Donation pages with goal tracking | ✅ Complete |
| `DonationPage`    | `packages/database/src/models/donation-page.model.ts`    | Donation page configuration       | Planned     |
| `DonationRecord`  | `packages/database/src/models/donation-record.model.ts`  | Individual donation tracking      | Planned     |
| `PayoutBatch`     | `packages/database/src/models/payout-batch.model.ts`     | Batch payout jobs                 | Planned     |
| `PayoutRecipient` | `packages/database/src/models/payout-recipient.model.ts` | Saved payout recipients           | Planned     |
| `AffiliatePayout` | `packages/database/src/models/affiliate-payout.model.ts` | Affiliate earnings payouts        | Planned     |
| `ExchangeQuote`   | `packages/database/src/models/exchange-quote.model.ts`   | Exchange rate quotes              | Planned     |

### Summary of Model Updates

| Model      | New Fields                                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`     | `affiliateTier`, `affiliateTierAt`, `totalReferrals`, `monthlyReferralEarnings`, `affiliatePayoutMethod`, `affiliatePayoutAddress`                                                               |
| `Merchant` | `whiteLabelEnabled`, `customCss`, `customDomain`, `customDomainVerified`, `checkoutLayout`, `invoiceFooterHtml`, `hideNetworkInfo`, `hideQrCode`, `redirectAfterPayment`, `customReceiptMessage` |

---

## API Route Summary

### New Route Files

| File                                   | Prefix              | Endpoints | Status      |
| -------------------------------------- | ------------------- | --------- | ----------- |
| `apps/api/src/routes/payment-links.ts` | `/v1/payment-links` | 7         | ✅ Complete |
| `apps/api/src/routes/donations.ts`     | `/v1/donations`     | 7         | ✅ Complete |
| `apps/api/src/routes/payouts.ts`       | `/v1/payouts`       | 9         | Planned     |
| `apps/api/src/routes/exchange.ts`      | `/v1/exchange`      | 6         | Planned     |
| `apps/api/src/routes/affiliates.ts`    | `/v1/affiliates`    | 7         | Planned     |

### Updated Route Files

| File                                                      | Changes                   |
| --------------------------------------------------------- | ------------------------- |
| `apps/api/src/routes/merchants.ts`                        | Add white-label endpoints |
| `apps/api/src/controllers/merchant/billing.controller.ts` | Tier-based commission     |
| `apps/api/src/main.ts`                                    | Register new routes       |

### Total New Endpoints: ~36

---

## Dashboard Pages

### New Pages

| Path                            | Feature                 | Priority | Status         |
| ------------------------------- | ----------------------- | -------- | -------------- |
| `/dashboard/links`              | Payment links list      | P0       | ✅ Complete    |
| `/dashboard/links/new`          | Create payment link     | P0       | ✅ (via modal) |
| `/dashboard/links/[id]`         | Link details & stats    | P0       | Planned        |
| `/dashboard/donations`          | Donation pages list     | P0       | ✅ Complete    |
| `/dashboard/donations/new`      | Create donation page    | P0       | ✅ (via modal) |
| `/dashboard/donations/[id]`     | Donation stats & recent | P0       | Planned        |
| `/dashboard/payouts`            | Mass payout batches     | P2       | Planned        |
| `/dashboard/payouts/new`        | Create payout batch     | P2       | Planned        |
| `/dashboard/payouts/recipients` | Saved recipients        | P2       | Planned        |
| `/dashboard/exchange`           | Crypto exchange         | P3       | Planned        |
| `/dashboard/exchange/history`   | Swap history            | P3       | Planned        |

### Checkout Pages

| Path             | Feature               | Status      |
| ---------------- | --------------------- | ----------- |
| `/pay/[slug]`    | Payment link checkout | ✅ Complete |
| `/donate/[slug]` | Donation page         | ✅ Complete |

### Updated Pages

| Path                    | Changes                                       |
| ----------------------- | --------------------------------------------- |
| `/dashboard/affiliates` | Add tier badge, progress bar, payout requests |
| `/dashboard/settings`   | Add white-label toggle, custom CSS, domain    |
| `/dashboard/overview`   | Add donation/payment link stats widgets       |

---

## Testing Strategy

### Test Coverage Targets

| Feature             | Unit Tests | Status          |
| ------------------- | ---------- | --------------- |
| Payment Links       | 13         | ✅ Complete     |
| Donation Pages      | 17         | ✅ Complete     |
| Enhanced Affiliates | 13         | Planned         |
| White Label         | 11         | Planned         |
| Mass Payouts        | 12         | Planned         |
| Exchange            | 10         | Planned         |
| **Total**           | **76**     | **30 complete** |

### Test Commands

```bash
pnpm test                          # Run all tests
pnpm --filter api test             # API tests only
pnpm --filter api test -- --grep "Payment Links"  # Feature-specific
```

### CI Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: pnpm test

- name: Check coverage
  run: pnpm test -- --coverage

- name: Fail if coverage < 80%
  run: |
    COVERAGE=$(pnpm test -- --coverage | grep "All files" | awk '{print $10}')
    if [ $(echo "$COVERAGE < 80" | bc) -eq 1 ]; then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

### Test Mock Patterns

Follow existing patterns from `tests/api-error-format.test.ts`:

- Use `vi.hoisted()` for mock declarations
- Use `vi.clearAllMocks()` in `beforeEach`
- Mock `ApiKey.findOne().populate()` chains with `makePopulateChain(resolved)`
- Use Fastify response schema (JSON Schema) for float/invoice routes

---

## References

- [Plisio.net](https://plisio.net) — Feature research source
- [KnotEngine ROADMAP.md](../ROADMAP.md) — Current roadmap
- [KnotEngine CLAUDE.md](../CLAUDE.md) — Development conventions
- [KnotEngine API Reference](./API_REFERENCE.md) — Existing API docs
- [KnotEngine Integration Guide](./INTEGRATION_GUIDE.md) — SDK integration

---

**Document maintained by:** KnotEngine team
**Review cycle:** Monthly
**Next review:** July 28, 2026
**Progress:** 2 of 7 features complete (ahead of schedule)

---

## Progress Summary

### Completed Features (June 28, 2026)

**1. Payment Links (P0)**

- Database: `PaymentLink` model with slug, amount, currency, usage tracking
- API: 7 endpoints (CRUD + public access + invoice creation)
- Dashboard: List page with stats cards, 3-step create modal, copy-to-clipboard
- Checkout: `/pay/[slug]` with QR code, currency selector, suggested amounts
- Tests: 13 model tests

**2. Donation Pages (P0)**

- Database: `Donation` model with goal tracking, suggested amounts, donor count
- API: 7 endpoints (CRUD + public access + donation processing)
- Dashboard: List page with progress bars, stats cards, 3-step create modal
- Checkout: `/donate/[slug]` with progress bar, QR code, thank you screen
- Tests: 17 model tests

### In Progress

- Enhanced Affiliates (P1) — Next feature to build

### Planned

- White Label Enhancements (P1)
- Mass Payouts (P2)
- Exchange/Swap (P3)
- E-Commerce Plugins (P3)

### Key Metrics

| Metric                | Value             |
| --------------------- | ----------------- |
| Total tests           | 260 (up from 243) |
| New tests added       | 17                |
| API endpoints added   | 14                |
| Dashboard pages added | 2                 |
| Checkout pages added  | 2                 |
| Database models added | 2                 |
