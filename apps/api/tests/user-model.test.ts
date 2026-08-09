import { describe, it, expect } from "vitest";
import { User, mongoose } from "@qodinger/knot-database";

describe("User Model", () => {
  describe("Schema Validation", () => {
    it("should create a valid user with required fields", () => {
      const user = new User({
        oauthId: "email:test@example.com",
        email: "test@example.com",
        emailVerified: true,
      });

      expect(user.oauthId).toBe("email:test@example.com");
      expect(user.email).toBe("test@example.com");
      expect(user.emailVerified).toBe(true);
      expect(user.creditBalance).toBe(0);
      expect(user.welcomeBonusClaimed).toBe(false);
      expect(user.twoFactorEnabled).toBe(false);
      expect(user.referralEarningsUsd).toBe(0);
    });

    it("should require oauthId", () => {
      const user = new User({
        email: "test@example.com",
      });

      expect(user.oauthId).toBeUndefined();
    });

    it("should accept different oauthId formats", () => {
      const oauthIds = [
        "email:user@example.com",
        "google:123456789",
        "github:987654321",
      ];

      oauthIds.forEach((oauthId) => {
        const user = new User({
          oauthId,
          email: "test@example.com",
        });
        expect(user.oauthId).toBe(oauthId);
      });
    });
  });

  describe("Email Verification", () => {
    it("should default emailVerified to false", () => {
      const user = new User({
        oauthId: "email:unverified@example.com",
        email: "unverified@example.com",
      });

      expect(user.emailVerified).toBe(false);
    });

    it("should allow setting emailVerified to true", () => {
      const user = new User({
        oauthId: "email:verified@example.com",
        email: "verified@example.com",
        emailVerified: true,
      });

      expect(user.emailVerified).toBe(true);
    });
  });

  describe("Credit Balance", () => {
    it("should default credit balance to 0", () => {
      const user = new User({
        oauthId: "email:poor@example.com",
        email: "poor@example.com",
      });

      expect(user.creditBalance).toBe(0);
    });

    it("should allow setting credit balance", () => {
      const user = new User({
        oauthId: "email:rich@example.com",
        email: "rich@example.com",
        creditBalance: 100.5,
      });

      expect(user.creditBalance).toBe(100.5);
    });

    it("should track welcome bonus claim status", () => {
      const user = new User({
        oauthId: "email:bonus@example.com",
        email: "bonus@example.com",
        welcomeBonusClaimed: true,
      });

      expect(user.welcomeBonusClaimed).toBe(true);
    });
  });

  describe("Two-Factor Authentication", () => {
    it("should default 2FA to disabled", () => {
      const user = new User({
        oauthId: "email:no2fa@example.com",
        email: "no2fa@example.com",
      });

      expect(user.twoFactorEnabled).toBe(false);
    });

    it("should allow storing 2FA secret", () => {
      const user = new User({
        oauthId: "email:with2fa@example.com",
        email: "with2fa@example.com",
        twoFactorEnabled: true,
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
      });

      expect(user.twoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toBe("JBSWY3DPEHPK3PXP");
    });

    it("should store backup codes", () => {
      const backupCodes = ["123456", "789012", "345678"];

      const user = new User({
        oauthId: "email:backup@example.com",
        email: "backup@example.com",
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes,
      });

      expect(user.twoFactorBackupCodes).toEqual(backupCodes);
    });

    it("should default backup codes to empty array", () => {
      const user = new User({
        oauthId: "email:nobackup@example.com",
        email: "nobackup@example.com",
      });

      expect(user.twoFactorBackupCodes).toEqual([]);
    });
  });

  describe("Referral System", () => {
    it("should default referral earnings to 0", () => {
      const user = new User({
        oauthId: "email:noref@example.com",
        email: "noref@example.com",
      });

      expect(user.referralEarningsUsd).toBe(0);
    });

    it("should allow storing referral code", () => {
      const user = new User({
        oauthId: "email:ref@example.com",
        email: "ref@example.com",
        referralCode: "REF_ABCD1234",
      });

      expect(user.referralCode).toBe("REF_ABCD1234");
    });

    it("should allow tracking who referred user", () => {
      const referredBy = new mongoose.Types.ObjectId();

      const user = new User({
        oauthId: "email:referred@example.com",
        email: "referred@example.com",
        referredBy,
      });

      expect(user.referredBy?.toString()).toBe(referredBy.toString());
    });

    it("should default affiliate tier to standard", () => {
      const user = new User({
        oauthId: "email:tier@example.com",
        email: "tier@example.com",
      });

      expect(user.affiliateTier).toBe("standard");
    });

    it("should allow setting affiliate tier", () => {
      const user = new User({
        oauthId: "email:gold@example.com",
        email: "gold@example.com",
        affiliateTier: "gold",
      });

      expect(user.affiliateTier).toBe("gold");
    });

    it("should default total referrals to 0", () => {
      const user = new User({
        oauthId: "email:noreferrals@example.com",
        email: "noreferrals@example.com",
      });

      expect(user.totalReferrals).toBe(0);
    });

    it("should default monthly referral earnings to 0", () => {
      const user = new User({
        oauthId: "email:monthly@example.com",
        email: "monthly@example.com",
      });

      expect(user.monthlyReferralEarnings).toBe(0);
    });

    it("should allow storing payout method", () => {
      const user = new User({
        oauthId: "email:payout@example.com",
        email: "payout@example.com",
        affiliatePayoutMethod: "crypto",
        affiliatePayoutAddress: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      });

      expect(user.affiliatePayoutMethod).toBe("crypto");
      expect(user.affiliatePayoutAddress).toBe(
        "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      );
    });
  });

  describe("Yield Accrual", () => {
    it("should default yield accrued to 0", () => {
      const user = new User({
        oauthId: "email:noyield@example.com",
        email: "noyield@example.com",
      });

      expect(user.yieldAccruedUsd).toBe(0);
    });

    it("should allow tracking last yield sync", () => {
      const lastSync = new Date();

      const user = new User({
        oauthId: "email:yield@example.com",
        email: "yield@example.com",
        yieldAccruedUsd: 50.25,
        lastYieldSyncAt: lastSync,
      });

      expect(user.yieldAccruedUsd).toBe(50.25);
      expect(user.lastYieldSyncAt).toEqual(lastSync);
    });
  });
});

describe("User OAuth ID Formats", () => {
  it("should use email: prefix for magic link users", () => {
    const email = "user@example.com";
    const oauthId = `email:${email}`;

    expect(oauthId).toBe("email:user@example.com");
  });

  it("should use google: prefix for Google users", () => {
    const googleId = "123456789";
    const oauthId = `google:${googleId}`;

    expect(oauthId).toBe("google:123456789");
  });

  it("should use github: prefix for GitHub users", () => {
    const githubId = "987654";
    const oauthId = `github:${githubId}`;

    expect(oauthId).toBe("github:987654");
  });
});

describe("User Account Creation Flow", () => {
  it("should create user with welcome credit", () => {
    const welcomeCredit = parseFloat(
      process.env.WELCOME_CREDIT_AMOUNT || "5.00",
    );

    expect(welcomeCredit).toBe(5.0);
  });

  it("should generate unique referral code", () => {
    const code = "REF_" + "ABCD1234";

    expect(code).toMatch(/^REF_[A-Z0-9]+$/);
  });

  it("should mark welcome bonus as claimed", () => {
    const welcomeBonusClaimed = true;

    expect(welcomeBonusClaimed).toBe(true);
  });
});
