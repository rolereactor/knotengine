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
import { safeCompare } from "../../utils/crypto.js";
import { apiError } from "../../utils/api-error.js";
import { invalidateMerchantCache } from "../../middleware/auth.middleware.js";
import { childLogger } from "../../infra/logger.js";

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
      if (!safeCompare(secret as string, process.env.INTERNAL_SECRET || "")) {
        return apiError(reply, 403, "forbidden", "Internal secret required.");
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
        childLogger("merchant").info(
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

    childLogger("merchant").info(`Merchant created: ${newMerchant.id}`);

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
      object: "merchant",
      id: newMerchant.merchantId,
      name: newMerchant.name,
      email: newMerchant.email,
      logo_url: newMerchant.logoUrl,
      webhook_secret: webhookSecret,
      api_key: null,
      created_at: newMerchant.createdAt,
    });
  },
  listMerchants: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant?.oauthId)
      return apiError(reply, 401, "unauthorized", "Authentication required.");
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

    const data = merchants.map((merchant) => {
      const currentUser = merchant.userId
        ? (userMap.get(merchant.userId.toString()) ?? null)
        : null;

      return {
        object: "merchant",
        id: merchant.merchantId,
        name: merchant.name,
        email: merchant.email,
        logo_url: merchant.logoUrl,
        two_factor_enabled: currentUser?.twoFactorEnabled || false,
        referral_code: currentUser?.referralCode,
        referral_earnings_usd: currentUser?.referralEarningsUsd || 0,
        credit_balance: currentUser?.creditBalance || 0,
        created_at: merchant.createdAt,
      };
    });
    return { object: "list", data };
  },
  getMerchantByOauth: async (
    request: FastifyRequest<{ Params: { oauthId: string } }>,
    reply: FastifyReply,
  ) => {
    // Protect with internal secret
    const secret = request.headers["x-internal-secret"];
    if (!safeCompare(secret as string, process.env.INTERNAL_SECRET || "")) {
      return apiError(reply, 403, "forbidden", "Internal secret required.");
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
      return apiError(
        reply,
        404,
        "merchant_not_found",
        "No merchants found for this OAuth identity.",
      );
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
        childLogger("merchant").info(
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
    const data = merchants.map((merchant) => {
      const currentUser = merchant.userId
        ? (userMap.get(merchant.userId.toString()) ?? null)
        : null;

      return {
        object: "merchant",
        id: merchant.merchantId,
        name: merchant.name,
        email: merchant.email,
        logo_url: merchant.logoUrl,
        has_api_key: true,
        two_factor_enabled: currentUser?.twoFactorEnabled || false,
        referral_code: currentUser?.referralCode,
        referral_earnings_usd: currentUser?.referralEarningsUsd || 0,
        credit_balance: currentUser?.creditBalance || 0,
        created_at: merchant.createdAt,
      };
    });
    return { object: "list", data };
  },
  getProfile: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

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
      object: "merchant",
      id: merchant.merchantId,
      name: merchant.name,
      btc_xpub: merchant.btcXpub,
      btc_xpub_testnet: finalBtcXpubTestnet,
      eth_address: merchant.ethAddress,
      eth_address_testnet: finalEthAddressTestnet,
      webhook_url: merchant.webhookUrl,
      webhook_secret: merchant.webhookSecret,
      logo_url: merchant.logoUrl,
      return_url: merchant.returnUrl,
      theme: merchant.theme || "system",
      brand_color: merchant.brandColor || "#ffffff",
      branding_enabled: merchant.brandingEnabled ?? true,
      remove_branding: merchant.removeBranding ?? false,
      branding_alignment: merchant.brandingAlignment ?? "left",
      fee_responsibility: merchant.feeResponsibility || "merchant",
      invoice_expiration_minutes: merchant.invoiceExpirationMinutes || 60,
      underpayment_tolerance_percentage:
        merchant.underpaymentTolerancePercentage ?? 1,
      bip21_enabled: merchant.bip21Enabled ?? true,
      enabled_currencies: merchant.enabledCurrencies || [],
      webhook_events: merchant.webhookEvents || [
        "invoice.confirmed",
        "invoice.mempool_detected",
        "invoice.failed",
      ],
      confirmation_policy: merchant.confirmationPolicy,
      two_factor_enabled: user?.twoFactorEnabled || false,
      fees_accrued: merchant.feesAccrued,
      credit_balance: user?.creditBalance ?? 0,
      lightning_enabled: merchant.lightningEnabled ?? false,
      lightning_provider: merchant.lightningProvider || "lnd",
      lnd_endpoint: merchant.lndEndpoint || "",
      lnd_macaroon: merchant.lndMacaroon || "",
      lnd_cert: merchant.lndCert || "",
      cln_endpoint: merchant.clnEndpoint || "",
      cln_rune: merchant.clnRune || "",
      created_at: merchant.createdAt,
    };
  },
  deleteProfile: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

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

    childLogger("merchant").info(
      `[Settings] Soft-deleted merchant: '${merchant._id}'`,
    );

    return {
      success: true,
      message:
        "Merchant deleted successfully. All data is preserved for compliance.",
    };
  },
  updateProfile: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const updates = request.body;

    // Security Gate: Enforce Plan Features
    const currentPlan = merchant.plan || "starter";

    // Only Professional and Enterprise can enable 'removeBranding'
    if (updates.removeBranding === true && currentPlan === "starter") {
      return apiError(
        reply,
        403,
        "plan_limit_reached",
        "The 'remove_branding' feature requires the Professional or Enterprise plan.",
        "remove_branding",
      );
    }

    childLogger("merchant").debug(
      { updates: JSON.stringify(updates, null, 2) },
      "📥 PATCH /v1/merchants/me - Received updates",
    );
    childLogger("merchant").debug(
      "📍 brandingAlignment in updates:",
      updates.brandingAlignment,
    );

    // Use updateOne instead of findByIdAndUpdate to avoid mongoose schema validation
    const updateResult = await Merchant.collection.updateOne(
      { _id: merchant._id },
      { $set: updates },
    );

    childLogger("merchant").debug(
      { result: updateResult },
      "✅ MongoDB update result",
    );

    // Invalidate cached merchant data so auth middleware picks up fresh settings
    invalidateMerchantCache(merchant._id.toString()).catch(() => {});

    // Fetch fresh data after update
    const updated = await Merchant.findById(merchant._id);

    if (!updated) {
      return apiError(
        reply,
        500,
        "internal_error",
        "Failed to update merchant.",
      );
    }

    // Manually add brandingAlignment from updates if it was set
    // (Mongoose might filter it out if not in schema yet)
    if (updates.brandingAlignment !== undefined) {
      (updated as any).brandingAlignment = updates.brandingAlignment;
    }

    childLogger("merchant").debug(
      { brandingAlignment: (updated as any).brandingAlignment },
      "✅ Merchant updated - brandingAlignment from DB",
    );
    childLogger("merchant").debug(
      {
        brandingAlignment: (updated as any).brandingAlignment,
        theme: updated.theme,
        brandColor: updated.brandColor,
      },
      "✅ Full updated merchant object",
    );

    // Audit log profile update
    await AuditLogger.settings(
      merchant.userId?.toString() || merchant._id.toString(),
      "profile_updated",
      request,
      { fields: Object.keys(updates) },
    );

    return {
      object: "merchant",
      id: updated.merchantId,
      name: updated.name,
      btc_xpub: updated.btcXpub,
      btc_xpub_testnet: updated.btcXpubTestnet,
      eth_address: updated.ethAddress,
      eth_address_testnet: updated.ethAddressTestnet,
      webhook_url: updated.webhookUrl,
      webhook_secret: updated.webhookSecret,
      fee_responsibility: updated.feeResponsibility,
      invoice_expiration_minutes: updated.invoiceExpirationMinutes,
      underpayment_tolerance_percentage:
        updated.underpaymentTolerancePercentage,
      bip21_enabled: updated.bip21Enabled,
      enabled_currencies: updated.enabledCurrencies,
      logo_url: updated.logoUrl,
      return_url: updated.returnUrl,
      theme: updated.theme || "system",
      brand_color: updated.brandColor || "#ffffff",
      branding_enabled: updated.brandingEnabled ?? true,
      remove_branding: updated.removeBranding ?? false,
      branding_alignment: updated.brandingAlignment || "left",
      webhook_events: updated.webhookEvents || [
        "invoice.confirmed",
        "invoice.mempool_detected",
        "invoice.failed",
      ],
      confirmation_policy: updated.confirmationPolicy,
      lightning_enabled: updated.lightningEnabled ?? false,
      lightning_provider: updated.lightningProvider || "lnd",
      lnd_endpoint: updated.lndEndpoint || "",
      cln_endpoint: updated.clnEndpoint || "",
    };
  },
};
