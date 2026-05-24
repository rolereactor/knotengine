import { FastifyReply } from "fastify";
import { PromoCode, User } from "@qodinger/knot-database";
import * as crypto from "crypto";
import { NotificationService } from "../../infra/notification-service.js";
import { safeCompare } from "../../utils/crypto.js";

export const MerchantPromoController = {
  generatePromo: async (request: any, reply: FastifyReply) => {
    // Protect with internal secret
    const secret = request.headers["x-internal-secret"];
    if (!safeCompare(secret as string, process.env.INTERNAL_SECRET || "")) {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const { amountUsd, maxUses, expiresInDays, customCode } = request.body;

    const code =
      customCode ||
      "PROMO_" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const existingCode = await PromoCode.findOne({ code });
    if (existingCode) {
      return reply.code(400).send({ error: "Code already exists" });
    }

    let expiresAt: Date | undefined;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const promo = await PromoCode.create({
      code,
      amountUsd,
      maxUses: maxUses || 1,
      expiresAt,
    });

    console.info(`🎁 Promo Code generated: ${code} ($${amountUsd})`);

    return reply.code(201).send({
      success: true,
      code: promo.code,
      amountUsd: promo.amountUsd,
      expiresAt: promo.expiresAt,
    });
  },
  redeemPromo: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant) return reply.code(401).send({ error: "Unauthorized" });

    const { code } = request.body;
    const promo = await PromoCode.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!promo) {
      return reply.code(400).send({ error: "Invalid or expired promo code." });
    }

    // Check global limit
    if (promo.uses >= promo.maxUses) {
      return reply
        .code(400)
        .send({ error: "This promo code has reached its usage limit." });
    }

    // Check if user already claimed it
    if (merchant.userId && promo.claimedBy.includes(merchant.userId)) {
      return reply
        .code(400)
        .send({ error: "You have already redeemed this promo code." });
    }

    // Check expiration
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return reply.code(400).send({ error: "This promo code has expired." });
    }

    // Everything looks good, update balance and mark as used
    if (merchant.userId) {
      await User.findByIdAndUpdate(merchant.userId, {
        $inc: { creditBalance: promo.amountUsd },
      });

      await PromoCode.findByIdAndUpdate(promo._id, {
        $inc: { uses: 1 },
        $push: { claimedBy: merchant.userId },
      });

      // Notify
      NotificationService.create({
        merchantId: merchant._id.toString(),
        title: "Credits Redeemed! 🎟️",
        description: `Success! $${promo.amountUsd.toFixed(2)} has been added to your balance via promo code.`,
        type: "success",
        link: "/dashboard/billing",
      });

      console.info(
        `🎟️ Promo Redeemed: ${merchant.merchantId} used ${promo.code} (+$${promo.amountUsd})`,
      );

      const updatedUser = await User.findById(merchant.userId);

      return reply.send({
        success: true,
        addedUsd: promo.amountUsd,
        newCreditBalance: updatedUser?.creditBalance,
      });
    }

    return reply.code(400).send({ error: "Failed to resolve user identity." });
  },
};
