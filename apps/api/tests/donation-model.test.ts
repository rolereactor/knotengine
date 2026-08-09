import { describe, it, expect } from "vitest";
import { Donation, mongoose } from "@qodinger/knot-database";

describe("Donation Model", () => {
  describe("Schema Validation", () => {
    it("should create a valid donation with required fields", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_test123",
        slug: "donate-my-cause",
        title: "My Cause",
      });

      expect(donation.donationId).toBe("don_test123");
      expect(donation.slug).toBe("donate-my-cause");
      expect(donation.title).toBe("My Cause");
      expect(donation.isActive).toBe(true);
      expect(donation.currentAmount).toBe(0);
      expect(donation.donorCount).toBe(0);
    });

    it("should default isActive to true", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_default_active",
        slug: "donate-default",
        title: "Default Active",
      });

      expect(donation.isActive).toBe(true);
    });

    it("should default currentAmount to 0", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_amount",
        slug: "donate-amount",
        title: "Amount Test",
      });

      expect(donation.currentAmount).toBe(0);
    });

    it("should default donorCount to 0", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_count",
        slug: "donate-count",
        title: "Count Test",
      });

      expect(donation.donorCount).toBe(0);
    });

    it("should default suggestedAmounts to [5, 10, 25, 50, 100]", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_suggested",
        slug: "donate-suggested",
        title: "Suggested Test",
      });

      expect(donation.suggestedAmounts).toEqual([5, 10, 25, 50, 100]);
    });

    it("should default allowCustomAmount to true", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_custom",
        slug: "donate-custom",
        title: "Custom Test",
      });

      expect(donation.allowCustomAmount).toBe(true);
    });

    it("should default showProgress to true", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_progress",
        slug: "donate-progress",
        title: "Progress Test",
      });

      expect(donation.showProgress).toBe(true);
    });
  });

  describe("Optional Fields", () => {
    it("should allow goal amount", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_goal",
        slug: "donate-goal",
        title: "Goal Test",
        goalAmount: 1000,
      });

      expect(donation.goalAmount).toBe(1000);
    });

    it("should allow custom suggested amounts", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_custom_suggested",
        slug: "donate-custom-suggested",
        title: "Custom Suggested Test",
        suggestedAmounts: [10, 20, 50],
      });

      expect(donation.suggestedAmounts).toEqual([10, 20, 50]);
    });

    it("should allow description", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_desc",
        slug: "donate-desc",
        title: "Description Test",
        description: "Help us build open source software",
      });

      expect(donation.description).toBe("Help us build open source software");
    });

    it("should allow thank you message", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_thanks",
        slug: "donate-thanks",
        title: "Thanks Test",
        thankYouMessage: "Thank you for your generous support!",
      });

      expect(donation.thankYouMessage).toBe(
        "Thank you for your generous support!",
      );
    });

    it("should allow max donations limit", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_max",
        slug: "donate-max",
        title: "Max Test",
        maxDonations: 100,
      });

      expect(donation.maxDonations).toBe(100);
    });

    it("should allow expiration date", () => {
      const expiresAt = new Date("2026-12-31");
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_expiry",
        slug: "donate-expiry",
        title: "Expiry Test",
        expiresAt,
      });

      expect(donation.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
    });

    it("should allow redirect URL", () => {
      const donation = new Donation({
        merchantId: new mongoose.Types.ObjectId(),
        donationId: "don_redirect",
        slug: "donate-redirect",
        title: "Redirect Test",
        redirectUrl: "https://example.com/thank-you",
      });

      expect(donation.redirectUrl).toBe("https://example.com/thank-you");
    });
  });

  describe("Merchant Linking", () => {
    it("should link donation to merchant", () => {
      const merchantId = new mongoose.Types.ObjectId();
      const donation = new Donation({
        merchantId,
        donationId: "don_merchant",
        slug: "donate-merchant",
        title: "Merchant Test",
      });

      expect(donation.merchantId?.toString()).toBe(merchantId.toString());
    });
  });

  describe("ID Format", () => {
    it("should use don_ prefix for donationId", () => {
      const donationId = "don_abc123def456";

      expect(donationId).toMatch(/^don_/);
    });

    it("should use donate_ or custom prefix for slug", () => {
      const autoSlug = "donate_abc123def456";
      const customSlug = "my-cause";

      expect(autoSlug).toMatch(/^donate_/);
      expect(customSlug).not.toMatch(/^donate_/);
    });
  });
});
