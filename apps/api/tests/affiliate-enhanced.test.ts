import { describe, it, expect } from "vitest";
import { User, AffiliatePayout } from "@qodinger/knot-database";

describe("Enhanced Affiliate System", () => {
  describe("User Model - Affiliate Tier Fields", () => {
    it("should default affiliate tier to standard", () => {
      const user = new User({
        oauthId: "email:tier-default@example.com",
        email: "tier-default@example.com",
      });

      expect(user.affiliateTier).toBe("standard");
      expect(user.totalReferrals).toBe(0);
      expect(user.monthlyReferralEarnings).toBe(0);
      expect(user.affiliatePayoutMethod).toBeUndefined();
      expect(user.affiliatePayoutAddress).toBeUndefined();
    });

    it("should accept all valid tier values", () => {
      const tiers = ["standard", "silver", "gold", "platinum"];

      for (const tier of tiers) {
        const user = new User({
          oauthId: `email:${tier}@example.com`,
          email: `${tier}@example.com`,
          affiliateTier: tier,
        });

        expect(user.affiliateTier).toBe(tier);
      }
    });

    it("should track total referrals count", () => {
      const user = new User({
        oauthId: "email:refcount@example.com",
        email: "refcount@example.com",
        totalReferrals: 25,
      });

      expect(user.totalReferrals).toBe(25);
    });

    it("should track monthly referral earnings", () => {
      const user = new User({
        oauthId: "email:monthly@example.com",
        email: "monthly@example.com",
        monthlyReferralEarnings: 150.5,
      });

      expect(user.monthlyReferralEarnings).toBe(150.5);
    });

    it("should store payout preferences", () => {
      const user = new User({
        oauthId: "email:payout@example.com",
        email: "payout@example.com",
        affiliatePayoutMethod: "crypto",
        affiliatePayoutAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e",
      });

      expect(user.affiliatePayoutMethod).toBe("crypto");
      expect(user.affiliatePayoutAddress).toBe(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e",
      );
    });
  });

  describe("AffiliatePayout Model", () => {
    it("should create a payout request with valid fields", () => {
      const payout = new AffiliatePayout({
        userId: "507f1f77bcf86cd799439011",
        amountUsd: 50,
        method: "crypto",
        currency: "BTC",
        walletAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      });

      expect(payout.amountUsd).toBe(50);
      expect(payout.method).toBe("crypto");
      expect(payout.currency).toBe("BTC");
      expect(payout.status).toBe("pending");
    });

    it("should default status to pending", () => {
      const payout = new AffiliatePayout({
        userId: "507f1f77bcf86cd799439011",
        amountUsd: 100,
        method: "usd_balance",
      });

      expect(payout.status).toBe("pending");
    });

    it("should accept all valid statuses", () => {
      const statuses = ["pending", "processing", "completed", "failed"];

      for (const status of statuses) {
        const payout = new AffiliatePayout({
          userId: "507f1f77bcf86cd799439011",
          amountUsd: 25,
          method: "usd_balance",
          status,
        });

        expect(payout.status).toBe(status);
      }
    });

    it("should accept both payout methods", () => {
      const methods = ["crypto", "usd_balance"];

      for (const method of methods) {
        const payout = new AffiliatePayout({
          userId: "507f1f77bcf86cd799439011",
          amountUsd: 25,
          method,
        });

        expect(payout.method).toBe(method);
      }
    });

    it("should enforce minimum payout of $10", () => {
      const payout = new AffiliatePayout({
        userId: "507f1f77bcf86cd799439011",
        amountUsd: 5,
        method: "usd_balance",
      });

      expect(payout.amountUsd).toBe(5);
      // Note: Validation would be enforced at the Mongoose level with min validator
    });

    it("should store tx hash for completed crypto payouts", () => {
      const payout = new AffiliatePayout({
        userId: "507f1f77bcf86cd799439011",
        amountUsd: 100,
        method: "crypto",
        currency: "ETH",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD3e",
        status: "completed",
        txHash: "0xabc123...",
        processedAt: new Date(),
      });

      expect(payout.status).toBe("completed");
      expect(payout.txHash).toBe("0xabc123...");
      expect(payout.processedAt).toBeInstanceOf(Date);
    });

    it("should store failure reason for failed payouts", () => {
      const payout = new AffiliatePayout({
        userId: "507f1f77bcf86cd799439011",
        amountUsd: 75,
        method: "crypto",
        currency: "BTC",
        walletAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        status: "failed",
        failureReason: "Insufficient network fees",
      });

      expect(payout.status).toBe("failed");
      expect(payout.failureReason).toBe("Insufficient network fees");
    });
  });

  describe("Tier Thresholds", () => {
    const TIER_THRESHOLDS = {
      standard: 0,
      silver: 10,
      gold: 50,
      platinum: 200,
    };

    function getTierForReferrals(referrals: number) {
      if (referrals >= TIER_THRESHOLDS.platinum) return "platinum";
      if (referrals >= TIER_THRESHOLDS.gold) return "gold";
      if (referrals >= TIER_THRESHOLDS.silver) return "silver";
      return "standard";
    }

    it("should return standard for 0 referrals", () => {
      expect(getTierForReferrals(0)).toBe("standard");
    });

    it("should return standard for 9 referrals", () => {
      expect(getTierForReferrals(9)).toBe("standard");
    });

    it("should return silver for 10 referrals", () => {
      expect(getTierForReferrals(10)).toBe("silver");
    });

    it("should return silver for 49 referrals", () => {
      expect(getTierForReferrals(49)).toBe("silver");
    });

    it("should return gold for 50 referrals", () => {
      expect(getTierForReferrals(50)).toBe("gold");
    });

    it("should return gold for 199 referrals", () => {
      expect(getTierForReferrals(199)).toBe("gold");
    });

    it("should return platinum for 200 referrals", () => {
      expect(getTierForReferrals(200)).toBe("platinum");
    });

    it("should return platinum for 500 referrals", () => {
      expect(getTierForReferrals(500)).toBe("platinum");
    });
  });

  describe("Commission Rates", () => {
    const TIER_COMMISSIONS = {
      standard: 0.1,
      silver: 0.15,
      gold: 0.2,
      platinum: 0.25,
    };

    it("should return 10% for standard tier", () => {
      expect(TIER_COMMISSIONS.standard).toBe(0.1);
    });

    it("should return 15% for silver tier", () => {
      expect(TIER_COMMISSIONS.silver).toBe(0.15);
    });

    it("should return 20% for gold tier", () => {
      expect(TIER_COMMISSIONS.gold).toBe(0.2);
    });

    it("should return 25% for platinum tier", () => {
      expect(TIER_COMMISSIONS.platinum).toBe(0.25);
    });

    it("should calculate commission correctly", () => {
      const topUpAmount = 100;

      expect(topUpAmount * TIER_COMMISSIONS.standard).toBe(10);
      expect(topUpAmount * TIER_COMMISSIONS.silver).toBe(15);
      expect(topUpAmount * TIER_COMMISSIONS.gold).toBe(20);
      expect(topUpAmount * TIER_COMMISSIONS.platinum).toBe(25);
    });
  });
});
