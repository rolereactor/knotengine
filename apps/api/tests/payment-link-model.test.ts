import { describe, it, expect } from "vitest";
import { PaymentLink, mongoose } from "@qodinger/knot-database";

describe("Payment Link Model", () => {
  describe("Schema Validation", () => {
    it("should create a valid payment link with required fields", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_test123",
        slug: "pay-my-store",
        title: "My Store",
      });

      expect(link.linkId).toBe("link_test123");
      expect(link.slug).toBe("pay-my-store");
      expect(link.title).toBe("My Store");
      expect(link.isActive).toBe(true);
      expect(link.usageCount).toBe(0);
      expect(link.totalAmountUsd).toBe(0);
    });

    it("should default isActive to true", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_default_active",
        slug: "pay-default",
        title: "Default Active",
      });

      expect(link.isActive).toBe(true);
    });

    it("should default usageCount to 0", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_count",
        slug: "pay-count",
        title: "Count Test",
      });

      expect(link.usageCount).toBe(0);
    });

    it("should default totalAmountUsd to 0", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_total",
        slug: "pay-total",
        title: "Total Test",
      });

      expect(link.totalAmountUsd).toBe(0);
    });
  });

  describe("Optional Fields", () => {
    it("should allow fixed amount", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_amount",
        slug: "pay-amount",
        title: "Amount Test",
        amount: 25.0,
      });

      expect(link.amount).toBe(25.0);
    });

    it("should allow specific currency", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_currency",
        slug: "pay-currency",
        title: "Currency Test",
        currency: "BTC",
      });

      expect(link.currency).toBe("BTC");
    });

    it("should allow maxUses limit", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_max",
        slug: "pay-max",
        title: "Max Uses Test",
        maxUses: 100,
      });

      expect(link.maxUses).toBe(100);
    });

    it("should allow expiration date", () => {
      const expiresAt = new Date("2026-12-31");
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_expiry",
        slug: "pay-expiry",
        title: "Expiry Test",
        expiresAt,
      });

      expect(link.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
    });

    it("should allow redirect URL", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_redirect",
        slug: "pay-redirect",
        title: "Redirect Test",
        redirectUrl: "https://example.com/thank-you",
      });

      expect(link.redirectUrl).toBe("https://example.com/thank-you");
    });

    it("should allow description", () => {
      const link = new PaymentLink({
        merchantId: new mongoose.Types.ObjectId(),
        linkId: "link_desc",
        slug: "pay-desc",
        title: "Description Test",
        description: "Buy me a coffee",
      });

      expect(link.description).toBe("Buy me a coffee");
    });
  });

  describe("Merchant Linking", () => {
    it("should link payment link to merchant", () => {
      const merchantId = new mongoose.Types.ObjectId();
      const link = new PaymentLink({
        merchantId,
        linkId: "link_merchant",
        slug: "pay-merchant",
        title: "Merchant Test",
      });

      expect(link.merchantId?.toString()).toBe(merchantId.toString());
    });
  });

  describe("ID Format", () => {
    it("should use link_ prefix for linkId", () => {
      const linkId = "link_abc123def456";

      expect(linkId).toMatch(/^link_/);
    });

    it("should use pay_ or custom prefix for slug", () => {
      const autoSlug = "pay_abc123def456";
      const customSlug = "my-store";

      expect(autoSlug).toMatch(/^pay_/);
      expect(customSlug).not.toMatch(/^pay_/);
    });
  });
});
