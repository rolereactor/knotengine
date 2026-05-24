import { FastifyReply } from "fastify";
import {
  Merchant,
  MerchantMember,
  User,
  ApiKey,
} from "@qodinger/knot-database";
import { BIP32Factory } from "bip32";
import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import * as crypto from "crypto";
import { ethers } from "ethers";
import { FastifyRequest } from "fastify";
import * as ecc from "tiny-secp256k1";
import { AuditLogger } from "../../core/audit-logger.js";

const bip32 = BIP32Factory(ecc);

const generateMerchantId = async (): Promise<string> => {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let attempts = 0;

  while (attempts < 10) {
    const mid =
      "mid_" +
      Array.from(crypto.randomBytes(12))
        .map((b) => chars[b % chars.length])
        .join("");

    const exists = await Merchant.exists({ merchantId: mid });
    if (!exists) return mid;
    attempts++;
  }

  throw new Error("Failed to generate a unique merchant ID");
};

const generateReferralCode = async (): Promise<string> => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let attempts = 0;

  while (attempts < 10) {
    const code =
      "REF_" +
      Array.from(crypto.randomBytes(4))
        .map((b) => chars[b % chars.length])
        .join("");

    const exists = await User.exists({ referralCode: code });
    if (!exists) return code;
    attempts++;
  }

  return "REF_" + crypto.randomBytes(4).toString("hex").toUpperCase();
};

export const MerchantCoreController = {
  createMerchant: async (request: any, reply: FastifyReply) => {
    const {
      name,
      email,
      btcXpub,
      btcXpubTestnet,
      ethAddress,
      ethAddressTestnet,
      logoUrl,
      webhookUrl,
      oauthId,
      referredBy: referralCode,
    } = request.body;

    // Security: Creating a merchant for an OAuth user requires internal privilege
    if (oauthId) {
      const secret = request.headers["x-internal-secret"];
      if (secret !== process.env.INTERNAL_SECRET) {
        return reply
          .code(403)
          .send({ error: "Forbidden: Internal Secret Required" });
      }
    }

    const webhookSecret = `knot_wh_${crypto.randomBytes(24).toString("hex")}`;

    // Append timestamp to invoke uniqueness for multi-merchant support
    const uniqueOauthId = oauthId ? `${oauthId}:${Date.now()}` : undefined;

    const welcomeCredit = parseFloat(
      process.env.WELCOME_CREDIT_AMOUNT || "5.00",
    );
    const affiliateSignupBonus = parseFloat(
      process.env.AFFILIATE_SIGNUP_BONUS || "5.00",
    );

    // 1. Resolve or Create User Identity (OAuth)
    let userId: typeof User.prototype._id | undefined = undefined;
    if (oauthId) {
      let user = await User.findOne({ oauthId });
      if (!user) {
        // Resolve Referrer for the new User
        let referrerId: typeof User.prototype._id | undefined = undefined;
        let isAffiliateSignup = false;
        if (referralCode) {
          const referrer = await User.findOne({ referralCode });
          if (referrer) {
            referrerId = referrer._id;
            isAffiliateSignup = true;
          }
        }

        // Affiliate signups get an extra bonus on top of the welcome credit
        const startingCredit = isAffiliateSignup
          ? welcomeCredit + affiliateSignupBonus
          : welcomeCredit;

        user = await User.create({
          oauthId,
          email,
          creditBalance: startingCredit,
          welcomeBonusClaimed: true,
          referralCode: await generateReferralCode(),
          referredBy: referrerId,
        });
        console.info(
          `👤 New User Identity created: ${oauthId} (+$${startingCredit} credit${isAffiliateSignup ? ` [affiliate bonus included]` : ""})`,
        );
      }
      userId = user._id;
    }

    let finalBtcXpubTestnet = btcXpubTestnet;
    let finalEthAddressTestnet = ethAddressTestnet;

    if (!finalBtcXpubTestnet || !finalEthAddressTestnet) {
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const root = bip32.fromSeed(seed, bitcoin.networks.testnet);
      const btcNode = root.derivePath("m/84'/1'/0'");
      finalBtcXpubTestnet =
        finalBtcXpubTestnet || btcNode.neutered().toBase58();

      const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
      finalEthAddressTestnet = finalEthAddressTestnet || ethWallet.address;
    }

    const newMerchant = await Merchant.create({
      merchantId: await generateMerchantId(),
      userId,
      name,
      email,
      oauthId: uniqueOauthId,
      btcXpub,
      btcXpubTestnet: finalBtcXpubTestnet,
      ethAddress,
      ethAddressTestnet: finalEthAddressTestnet,
      logoUrl,
      webhookUrl,
      webhookSecret,
    });

    if (userId) {
      await MerchantMember.create({
        merchantId: newMerchant._id,
        userId,
        role: "owner",
        accepted: true,
        acceptedAt: new Date(),
      });
    }

    console.info(`Merchant created: ${newMerchant.id}`);

    // Audit log merchant creation
    if (userId) {
      await AuditLogger.account(
        userId.toString(),
        "merchant_created",
        request,
        {
          merchantId: newMerchant.merchantId,
          name,
        },
      );
    }

    return reply.code(201).send({
      id: newMerchant.merchantId,
      merchantId: newMerchant.merchantId,
      name: newMerchant.name,
      email: newMerchant.email,
      logoUrl: newMerchant.logoUrl,
      webhookSecret,
      apiKey: null,
    });
  },
  listMerchants: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant?.oauthId)
      return reply.code(401).send({ error: "Auth required" });
    const { oauthId } = merchant;

    // Clean base oauthId for lookup (e.g. google:123:456 -> google:123)
    const baseOauthId = oauthId.split(":")[0] + ":" + oauthId.split(":")[1];

    const merchants = await Merchant.find({
      oauthId: { $regex: new RegExp(`^${baseOauthId}(:|$)`) },
      isActive: true,
      isDeleted: { $ne: true },
    }).sort({ createdAt: 1 });

    // Batch fetch all users in a single query
    const userIds = merchants
      .map((m) => m.userId)
      .filter((id): id is typeof User.prototype._id => id != null);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map<string, (typeof users)[number]>();
    for (const u of users) userMap.set(u._id.toString(), u);

    return merchants.map((merchant) => {
      const currentUser = merchant.userId
        ? (userMap.get(merchant.userId.toString()) ?? null)
        : null;

      return {
        id: merchant.merchantId,
        merchantId: merchant.merchantId,
        name: merchant.name,
        email: merchant.email,
        logoUrl: merchant.logoUrl,
        twoFactorEnabled: currentUser?.twoFactorEnabled || false,
        referralCode: currentUser?.referralCode,
        referralEarningsUsd: currentUser?.referralEarningsUsd || 0,
        creditBalance: currentUser?.creditBalance || 0,
      };
    });
  },
  getMerchantByOauth: async (
    request: FastifyRequest<{ Params: { oauthId: string } }>,
    reply: FastifyReply,
  ) => {
    // Protect with internal secret
    const secret = request.headers["x-internal-secret"];
    if (secret !== process.env.INTERNAL_SECRET) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { oauthId } = request.params;
    // Query using regex to find all merchants matching this base oauthId prefix
    const merchants = await Merchant.find({
      oauthId: { $regex: new RegExp(`^${oauthId}(:|$)`) },
      isActive: true,
      isDeleted: { $ne: true },
    }).sort({
      createdAt: 1,
    });

    if (merchants.length === 0) {
      return reply.code(404).send({ error: "Not found" });
    }

    // Phase 1: Ensure every merchant has a public merchantId and API key
    for (let merchant of merchants) {
      // Ensure every merchant has a public merchantId (mid_...)
      if (!merchant.merchantId) {
        const mid = await generateMerchantId();
        const updatedMerchant = await Merchant.findByIdAndUpdate(
          merchant._id,
          { $set: { merchantId: mid } },
          { new: true },
        );
        if (updatedMerchant) merchant = updatedMerchant;
        console.info(
          `🆔 Auto-assigned public ID for merchant: ${merchant._id} -> ${mid}`,
        );
      }

      // Ensure User Identity (Lazy Migration)
      if (!merchant.userId) {
        const baseOauthId = oauthId.split(":")[0];
        let user = await User.findOne({ oauthId: baseOauthId });
        if (!user) {
          user = await User.create({
            oauthId: baseOauthId,
            creditBalance: parseFloat(
              process.env.WELCOME_CREDIT_AMOUNT || "5.00",
            ),
            welcomeBonusClaimed: true,
            referralCode: await generateReferralCode(),
          });
        }
        await Merchant.findByIdAndUpdate(
          merchant._id,
          { $set: { userId: user._id } },
          { new: true },
        );
        merchant.userId = user._id;
      }
    }

    // Phase 2: Batch fetch all users in a single query
    const userIds = merchants
      .map((m) => m.userId)
      .filter((id): id is typeof User.prototype._id => id != null);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map<string, (typeof users)[number]>();
    for (const u of users) userMap.set(u._id.toString(), u);

    // Phase 3: Ensure legacy users have referral codes (batch update)
    const usersNeedingReferralCode = users.filter((u) => !u.referralCode);
    if (usersNeedingReferralCode.length > 0) {
      await Promise.all(
        usersNeedingReferralCode.map(async (u) => {
          const code = await generateReferralCode();
          u.referralCode = code;
          await User.findByIdAndUpdate(u._id, { $set: { referralCode: code } });
        }),
      );
    }

    // Phase 4: Build results
    return merchants.map((merchant) => {
      const currentUser = merchant.userId
        ? (userMap.get(merchant.userId.toString()) ?? null)
        : null;

      return {
        id: merchant.merchantId,
        merchantId: merchant.merchantId,
        name: merchant.name,
        email: merchant.email,
        logoUrl: merchant.logoUrl,
        apiKey: null,
        hasApiKey: true,
        twoFactorEnabled: currentUser?.twoFactorEnabled || false,
        referralCode: currentUser?.referralCode,
        referralEarningsUsd: currentUser?.referralEarningsUsd || 0,
        creditBalance: currentUser?.creditBalance || 0,
      };
    });
  },
  getProfile: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(500).send({ error: "Auth failed" });

    const sanitizeXpub = (val?: string) =>
      val && (val.startsWith("mid_") || val.startsWith("knot_")) ? null : val;

    const needsFix =
      !merchant.btcXpubTestnet ||
      !merchant.ethAddressTestnet ||
      merchant.btcXpubTestnet?.startsWith("mid_") ||
      merchant.ethAddressTestnet?.startsWith("mid_");

    let finalBtcXpubTestnet = sanitizeXpub(merchant.btcXpubTestnet);
    let finalEthAddressTestnet = sanitizeXpub(merchant.ethAddressTestnet);

    if (needsFix) {
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);

      const root = bip32.fromSeed(seed, bitcoin.networks.testnet);
      const btcNode = root.derivePath("m/84'/1'/0'");
      finalBtcXpubTestnet =
        finalBtcXpubTestnet || btcNode.neutered().toBase58();

      const ethWallet = ethers.Wallet.fromPhrase(mnemonic);
      finalEthAddressTestnet = finalEthAddressTestnet || ethWallet.address;

      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          btcXpubTestnet: finalBtcXpubTestnet,
          ethAddressTestnet: finalEthAddressTestnet,
        },
      });
    }

    const user = merchant.userId ? await User.findById(merchant.userId) : null;

    return {
      id: merchant.merchantId,
      merchantId: merchant.merchantId,
      name: merchant.name,
      btcXpub: merchant.btcXpub,
      btcXpubTestnet: finalBtcXpubTestnet,
      ethAddress: merchant.ethAddress,
      ethAddressTestnet: finalEthAddressTestnet,
      webhookUrl: merchant.webhookUrl,
      webhookSecret: merchant.webhookSecret,
      logoUrl: merchant.logoUrl,
      returnUrl: merchant.returnUrl,
      theme: merchant.theme || "system",
      brandColor: merchant.brandColor || "#ffffff",
      brandingEnabled: merchant.brandingEnabled ?? true,
      removeBranding: merchant.removeBranding ?? false,
      brandingAlignment: merchant.brandingAlignment ?? "left",
      feeResponsibility: merchant.feeResponsibility || "merchant",
      invoiceExpirationMinutes: merchant.invoiceExpirationMinutes || 60,
      underpaymentTolerancePercentage:
        merchant.underpaymentTolerancePercentage ?? 1,
      bip21Enabled: merchant.bip21Enabled ?? true,
      enabledCurrencies: merchant.enabledCurrencies || [],
      webhookEvents: merchant.webhookEvents || [
        "invoice.confirmed",
        "invoice.mempool_detected",
        "invoice.failed",
      ],
      confirmationPolicy: merchant.confirmationPolicy,
      twoFactorEnabled: user?.twoFactorEnabled || false,
      feesAccrued: merchant.feesAccrued,
      creditBalance: user?.creditBalance ?? 0,
      createdAt: merchant.createdAt,
    };
  },
  deleteProfile: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(500).send({ error: "Auth failed" });

    const user =
      request.user || (await User.findOne({ oauthId: merchant.oauthId }));

    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user?._id,
        isActive: false,
      },
    });

    await ApiKey.updateMany(
      { merchantId: merchant._id, isActive: true },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: "merchant_deleted",
        },
      },
    );

    console.info(`[Settings] Soft-deleted merchant: '${merchant._id}'`);

    return {
      success: true,
      message:
        "Merchant deleted successfully. All data is preserved for compliance.",
    };
  },
  updateProfile: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(500).send({ error: "Auth failed" });

    const updates = request.body;

    // Security Gate: Enforce Plan Features
    const currentPlan = merchant.plan || "starter";

    // Only Professional and Enterprise can enable 'removeBranding'
    if (updates.removeBranding === true && currentPlan === "starter") {
      return reply.code(403).send({
        error:
          "Updating 'removeBranding' to true requires the Professional or Enterprise plan.",
      });
    }

    console.log(
      "📥 PATCH /v1/merchants/me - Received updates:",
      JSON.stringify(updates, null, 2),
    );
    console.log("📍 brandingAlignment in updates:", updates.brandingAlignment);

    // Use updateOne instead of findByIdAndUpdate to avoid mongoose schema validation
    const updateResult = await Merchant.collection.updateOne(
      { _id: merchant._id },
      { $set: updates },
    );

    console.log("✅ MongoDB update result:", updateResult);

    // Fetch fresh data after update
    const updated = await Merchant.findById(merchant._id);

    if (!updated) {
      return reply.code(500).send({ error: "Failed to update merchant" });
    }

    // Manually add brandingAlignment from updates if it was set
    // (Mongoose might filter it out if not in schema yet)
    if (updates.brandingAlignment !== undefined) {
      (updated as any).brandingAlignment = updates.brandingAlignment;
    }

    console.log(
      "✅ Merchant updated - brandingAlignment from DB:",
      (updated as any).brandingAlignment,
    );
    console.log(
      "✅ Full updated merchant object:",
      JSON.stringify(
        {
          brandingAlignment: (updated as any).brandingAlignment,
          theme: updated.theme,
          brandColor: updated.brandColor,
        },
        null,
        2,
      ),
    );

    // Audit log profile update
    await AuditLogger.settings(
      merchant.userId?.toString() || merchant._id.toString(),
      "profile_updated",
      request,
      { fields: Object.keys(updates) },
    );

    return {
      id: updated.merchantId,
      merchantId: updated.merchantId,
      name: updated.name,
      btcXpub: updated.btcXpub,
      btcXpubTestnet: updated.btcXpubTestnet,
      ethAddress: updated.ethAddress,
      ethAddressTestnet: updated.ethAddressTestnet,
      webhookUrl: updated.webhookUrl,
      webhookSecret: updated.webhookSecret,
      feeResponsibility: updated.feeResponsibility,
      invoiceExpirationMinutes: updated.invoiceExpirationMinutes,
      underpaymentTolerancePercentage: updated.underpaymentTolerancePercentage,
      bip21Enabled: updated.bip21Enabled,
      enabledCurrencies: updated.enabledCurrencies,
      logoUrl: updated.logoUrl,
      returnUrl: updated.returnUrl,
      theme: updated.theme || "system",
      brandColor: updated.brandColor || "#ffffff",
      brandingEnabled: updated.brandingEnabled ?? true,
      removeBranding: updated.removeBranding ?? false,
      brandingAlignment: updated.brandingAlignment || "left",
      webhookEvents: updated.webhookEvents || [
        "invoice.confirmed",
        "invoice.mempool_detected",
        "invoice.failed",
      ],
      confirmationPolicy: updated.confirmationPolicy,
    };
  },
};
