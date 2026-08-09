import { FastifyReply } from "fastify";
import { Invoice, Merchant, TopUpClaim, User } from "@qodinger/knot-database";
import { apiError } from "../../utils/api-error.js";
import { PLAN_COSTS } from "@qodinger/knot-types";
import { AuditLogger } from "../../core/audit-logger.js";
import { isSelfHosted } from "../../core/self-hosted-mode.js";
import { NotificationService } from "../../infra/notification-service.js";
import { PriceOracle } from "../../infra/price-feed.js";
import { TxVerifier } from "../../infra/tx-verifier.js";
import { RedisClient } from "../../infra/redis-client.js";

export const MerchantBillingController = {
  updatePlan: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    if (isSelfHosted()) {
      return apiError(
        reply,
        403,
        "forbidden",
        "Plan changes are disabled in self-hosted mode. All features are unlocked automatically.",
      );
    }

    // Idempotency: replay cached response if client retries with the same key
    const idempotencyKey = request.headers["idempotency-key"] as
      | string
      | undefined;
    if (idempotencyKey) {
      const cacheKey = `idempotency:plan:${merchant._id}:${idempotencyKey}`;
      const cached = await RedisClient.get<object>(cacheKey);
      if (cached) {
        return reply.header("Idempotent-Replayed", "true").send(cached);
      }
    }

    const { plan: newPlan } = request.body;
    const currentPlan = merchant.plan || "starter";

    if (newPlan === currentPlan) {
      return apiError(reply, 400, "invalid_request", "Already on this plan.");
    }

    const cost = PLAN_COSTS[newPlan] ?? 0;
    const currentPlanCost = PLAN_COSTS[currentPlan] ?? 0;

    // Calculate prorated amount for mid-month activation
    let chargeAmount = cost;
    let isProrated = false;

    if (cost > 0 && cost > currentPlanCost) {
      const today = new Date();
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      );
      const daysRemainingInMonth =
        lastDayOfMonth.getDate() - today.getDate() + 1;
      const totalDaysInMonth = lastDayOfMonth.getDate();

      // Prorate if activating after the 1st of the month
      if (today.getDate() > 1 && daysRemainingInMonth < totalDaysInMonth) {
        chargeAmount = (cost * daysRemainingInMonth) / totalDaysInMonth;
        isProrated = true;

        console.log(
          `📅 Prorated ${newPlan} plan: $${chargeAmount.toFixed(2)} for ${daysRemainingInMonth} days`,
        );
      }
    }

    // If upgrading to a paid plan, check balance
    if (chargeAmount > 0) {
      const user = merchant.userId
        ? await User.findById(merchant.userId)
        : null;
      if (!user || user.creditBalance < chargeAmount) {
        return apiError(
          reply,
          400,
          "insufficient_credit",
          `Insufficient balance to upgrade to ${newPlan}. You need at least $${chargeAmount.toFixed(2)} in credits${isProrated ? " (prorated for this month)" : ""}.`,
        );
      }

      // Deduct prorated amount immediately
      await User.findByIdAndUpdate(user._id, {
        $inc: { creditBalance: -chargeAmount },
      });

      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          plan: newPlan,
          planStartedAt: new Date(),
          lastProratedAmount: isProrated ? chargeAmount : null,
          lastProratedDate: isProrated ? new Date() : null,
        },
      });

      // Notify
      const message = isProrated
        ? `Upgraded to ${newPlan} plan for $${chargeAmount.toFixed(2)} (prorated for this month). Full billing starts next month on the 1st.`
        : `Upgraded to ${newPlan} plan for $${chargeAmount.toFixed(2)}.`;

      NotificationService.create({
        merchantId: merchant._id.toString(),
        title: `Upgraded to ${newPlan.toUpperCase()}`,
        description: message,
        type: "success",
        link: "/dashboard/billing",
      });
    } else {
      // Downgrading or switching between paid plans (simple update for now)
      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          plan: newPlan,
          planStartedAt: new Date(),
        },
      });
    }

    await AuditLogger.billing(
      merchant.userId?.toString() || "",
      "plan_changed",
      undefined,
      {
        merchantId: merchant._id.toString(),
        previousPlan: currentPlan,
        newPlan,
        charged: chargeAmount,
        isProrated,
      },
    );

    const responseBody = {
      success: true,
      plan: newPlan,
      message: `Plan updated to ${newPlan} successfully.`,
    };

    if (idempotencyKey) {
      const cacheKey = `idempotency:plan:${merchant._id}:${idempotencyKey}`;
      RedisClient.set(cacheKey, responseBody, 86400).catch(() => {});
    }

    return responseBody;
  },
  getStats: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const { period } = request.query as { period: string };

    const [totalInvoices, confirmedInvoicesResult, testnetInvoicesResult] =
      await Promise.all([
        Invoice.countDocuments({
          merchantId: merchant._id,
          "metadata.isTestnet": { $ne: true },
        }) as unknown as number,
        Invoice.aggregate<{ _id: null; total: number }>([
          {
            $match: {
              merchantId: merchant._id,
              status: "confirmed",
              "metadata.isTestnet": { $ne: true },
            },
          },
          { $group: { _id: null, total: { $sum: "$amountUsd" } } },
        ]),
        Invoice.aggregate<{ _id: null; total: number; count: number }>([
          {
            $match: {
              merchantId: merchant._id,
              status: "confirmed",
              "metadata.isTestnet": true,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amountUsd" },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const totalVolume =
      confirmedInvoicesResult.length > 0 ? confirmedInvoicesResult[0].total : 0;

    const testnetVolume =
      testnetInvoicesResult.length > 0 ? testnetInvoicesResult[0].total : 0;
    const testnetInvoicesCount =
      testnetInvoicesResult.length > 0 ? testnetInvoicesResult[0].count : 0;

    const confirmedInvoicesCount = await Invoice.countDocuments({
      merchantId: merchant._id,
      status: "confirmed",
      "metadata.isTestnet": { $ne: true },
    });

    const successRate =
      totalInvoices > 0
        ? ((confirmedInvoicesCount / totalInvoices) * 100).toFixed(1)
        : "0";

    // ──────────────────────────────────────────────
    // Chart Data Aggregation
    // ──────────────────────────────────────────────
    const now = new Date();
    let startTime: Date;
    let groupBy: Record<string, unknown>;
    let format: (date: Date) => string;

    if (period === "24h") {
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      groupBy = {
        $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" },
      };
      format = (d) =>
        d.toLocaleTimeString([], { hour: "2-digit", hour12: false }) + ":00";
    } else if (period === "90d") {
      startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      format = (d) =>
        d.toLocaleDateString([], { month: "short", day: "numeric" });
    } else if (period === "30d") {
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      format = (d) =>
        d.toLocaleDateString([], { month: "short", day: "numeric" });
    } else {
      // default 7d
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      format = (d) => d.toLocaleDateString([], { weekday: "short" });
    }

    const rawChartData = await Invoice.aggregate([
      {
        $match: {
          merchantId: merchant._id,
          status: "confirmed",
          "metadata.isTestnet": { $ne: true },
          createdAt: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          volume: { $sum: "$amountUsd" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in zeros for missing periods to ensure smooth chart
    const chartData: { name: string; volume: number }[] = [];
    const steps =
      period === "24h" ? 24 : period === "90d" ? 90 : period === "30d" ? 30 : 7;
    const stepMs = period === "24h" ? 3600000 : 86400000;

    for (let i = 0; i < steps; i++) {
      const d = new Date(startTime.getTime() + i * stepMs);
      const key =
        period === "24h"
          ? d.toISOString().slice(0, 13) + ":00"
          : d.toISOString().slice(0, 10);

      const match = rawChartData.find((r) => r._id === key);
      chartData.push({
        name: format(d),
        volume: match ? parseFloat(match.volume.toFixed(2)) : 0,
      });
    }

    const user = merchant.userId ? await User.findById(merchant.userId) : null;

    // Extra analytics: invoice count by currency breakdown
    const currencyBreakdown = await Invoice.aggregate<{
      _id: string;
      count: number;
      volume: number;
    }>([
      {
        $match: {
          merchantId: merchant._id,
          status: "confirmed",
          "metadata.isTestnet": { $ne: true },
        },
      },
      {
        $group: {
          _id: "$cryptoCurrency",
          count: { $sum: 1 },
          volume: { $sum: "$amountUsd" },
        },
      },
      { $sort: { volume: -1 } },
      { $limit: 5 },
    ]);

    const pendingCount = await Invoice.countDocuments({
      merchantId: merchant._id,
      status: "pending",
      "metadata.isTestnet": { $ne: true },
    });

    return {
      totalVolume,
      testnetVolume,
      testnetInvoicesCount,
      activeInvoices: totalInvoices,
      pendingInvoices: pendingCount,
      confirmedInvoices: confirmedInvoicesCount,
      conversionRate: successRate + "%",
      successRate: `${successRate}%`,
      chartData,
      topCurrencies: currencyBreakdown.map((c) => ({
        currency: c._id,
        count: c.count,
        volume: parseFloat(c.volume.toFixed(2)),
      })),
      feesAccrued: merchant.feesAccrued || { usd: 0 },
      creditBalance: user?.creditBalance ?? 0,
      currentPlan: merchant.plan || "starter",
      currentFeeRate:
        (
          {
            starter: 0.01,
            professional: 0.005,
            enterprise: 0.0025,
          } as Record<string, number>
        )[merchant.plan || "starter"] || 0.01,
      platformFeeWallets: {
        BTC: null,
        LTC: null,
        EVM: process.env.PLATFORM_FEE_WALLET_EVM || null,
      },
      isGracePeriod: merchant.gracePeriodStarted ? true : false,
      gracePeriodEnds: merchant.gracePeriodEnds
        ? merchant.gracePeriodEnds.toISOString()
        : undefined,
    };
  },
  topUp: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    const { txHash, currency } = request.body;

    try {
      // 1. Prevent double spend
      const existingClaim = await TopUpClaim.findOne({ txHash });
      if (existingClaim) {
        return apiError(
          reply,
          400,
          "conflict",
          "This transaction has already been claimed for top-up credits.",
        );
      }

      // 2. Identify the expected platform wallet
      // Billing is strictly Stablecoins (USDT/USDC) on EVM
      const STABLECOINS = [
        "USDT_ERC20",
        "USDT_POLYGON",
        "USDC_ERC20",
        "USDC_POLYGON",
      ];
      if (!STABLECOINS.includes(currency)) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Top-ups are strictly limited to Stablecoins (USDT/USDC) on Polygon or Ethereum.",
        );
      }

      const expectedAddress = process.env.PLATFORM_FEE_WALLET_EVM || "";

      if (!expectedAddress) {
        return apiError(
          reply,
          503,
          "internal_error",
          `Platform fee wallet for ${currency} is not configured.`,
        );
      }

      // 3. Verify on the blockchain
      const verification = await TxVerifier.verifyTx(
        txHash,
        currency,
        expectedAddress,
      );

      if (!verification.isValid || verification.amountCrypto <= 0) {
        return apiError(
          reply,
          400,
          "invalid_request",
          "Transaction verification failed. Ensure the transaction is confirmed and sent to the correct platform address.",
        );
      }

      // 4. Calculate USD Value
      const usdPrice = await PriceOracle.getPrice(currency);
      const usdAmount = parseFloat(
        (verification.amountCrypto * usdPrice).toFixed(2),
      );

      // 5. Save the Claim and Update Merchant Balance in a transaction-like flow
      const claim = await TopUpClaim.create({
        merchantId: merchant._id,
        txHash,
        currency,
        amountCrypto: verification.amountCrypto,
        amountUsd: usdAmount,
        status: "approved",
      });

      if (merchant.userId) {
        await User.findByIdAndUpdate(merchant.userId, {
          $inc: { creditBalance: usdAmount },
        });
      }

      // Check if merchant is in grace period and has sufficient balance now
      if (
        merchant.gracePeriodStarted &&
        merchant.gracePeriodEnds &&
        new Date() < merchant.gracePeriodEnds
      ) {
        const planCost = PLAN_COSTS[merchant.plan] ?? 0;
        const user = merchant.userId
          ? await User.findById(merchant.userId)
          : null;

        if (user && user.creditBalance >= planCost) {
          console.log(
            `💳 Auto-charging ${merchant.plan} plan during grace period for ${merchant.merchantId}`,
          );

          // Charge for the subscription
          await User.findByIdAndUpdate(user._id, {
            $inc: { creditBalance: -planCost },
          });

          // Clear grace period and reset plan start date
          await Merchant.findByIdAndUpdate(merchant._id, {
            $set: {
              gracePeriodStarted: null,
              gracePeriodEnds: null,
              planStartedAt: new Date(),
            },
          });

          // Send success notification
          await NotificationService.create({
            merchantId: merchant._id.toString(),
            title: "Payment Successful - Plan Maintained",
            description: `Your ${merchant.plan} plan payment has been processed. Grace period cleared.`,
            type: "success",
            link: "/dashboard/billing",
          });
        }
      }

      const user = merchant.userId
        ? await User.findById(merchant.userId)
        : null;

      // 6. Referral Bonus Payout (tiered commission, capped at $500 lifetime)
      const MAX_REFERRAL_EARNING = 500;
      if (user && user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          // Tiered commission rates
          const tier = referrer.affiliateTier || "standard";
          const commissionRates: Record<string, number> = {
            standard: 0.1,
            silver: 0.15,
            gold: 0.2,
            platinum: 0.25,
          };
          const commissionRate = commissionRates[tier] || 0.1;
          const referralBonus = parseFloat(
            (usdAmount * commissionRate).toFixed(2),
          );

          if (referralBonus > 0) {
            const cappedBonus = Math.min(
              referralBonus,
              Math.max(
                0,
                MAX_REFERRAL_EARNING - (referrer.referralEarningsUsd || 0),
              ),
            );
            if (cappedBonus > 0) {
              await User.findByIdAndUpdate(referrer._id, {
                $inc: {
                  creditBalance: cappedBonus,
                  referralEarningsUsd: cappedBonus,
                  monthlyReferralEarnings: cappedBonus,
                },
              });

              // Notify the referrer on one of their merchants
              const referrerMerchant = await Merchant.findOne({
                userId: referrer._id,
              });
              if (referrerMerchant) {
                const tierLabels: Record<string, string> = {
                  standard: "Standard",
                  silver: "Silver",
                  gold: "Gold",
                  platinum: "Platinum",
                };
                await NotificationService.create({
                  merchantId: referrerMerchant._id.toString(),
                  title: "Affiliate Commission Received!",
                  description: `You earned $${cappedBonus.toFixed(2)} (${tierLabels[tier] || "Standard"} tier, ${(commissionRate * 100).toFixed(0)}%) from an affiliate top-up.`,
                  type: "success",
                  link: "/dashboard/affiliates",
                });
              }

              console.info(
                `🎁 Affiliate Commission (${tier}): User(${user.referredBy}) +$${cappedBonus} at ${(commissionRate * 100).toFixed(0)}% (From User(${user._id}))`,
              );
            }
          }
        }
      }

      // Fetch fresh state for response
      const updatedUser = merchant.userId
        ? await User.findById(merchant.userId)
        : null;

      console.info(
        `🤑 Top-Up Claimed: ${merchant._id} +$${usdAmount} (${txHash})`,
      );

      await AuditLogger.billing(
        merchant.userId?.toString() || "",
        "topup",
        undefined,
        {
          merchantId: merchant._id.toString(),
          txHash,
          currency,
          amountCrypto: verification.amountCrypto,
          amountUsd: usdAmount,
          claimId: claim._id.toString(),
        },
      );

      return reply.send({
        success: true,
        addedUsd: usdAmount,
        newCreditBalance: updatedUser?.creditBalance,
        claimId: claim._id,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Topup Error: ${message}`);
      return apiError(reply, 500, "internal_error", "Internal top-up error.");
    }
  },
  chargePlan: async (request: any, reply: FastifyReply) => {
    const merchant = request.merchant;
    if (!merchant)
      return apiError(reply, 401, "unauthorized", "Authentication required.");

    // Check if merchant is in grace period
    if (!merchant.gracePeriodStarted || !merchant.gracePeriodEnds) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "This merchant is not currently in a grace period.",
      );
    }

    if (new Date() >= merchant.gracePeriodEnds) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "Grace period has expired.",
      );
    }

    const planCost = PLAN_COSTS[merchant.plan] ?? 0;
    if (planCost === 0) {
      return apiError(
        reply,
        400,
        "invalid_request",
        "The starter plan has no cost.",
      );
    }

    const user = merchant.userId ? await User.findById(merchant.userId) : null;

    if (!user) {
      return apiError(
        reply,
        404,
        "user_not_found",
        "No user found for this merchant.",
      );
    }

    if (user.creditBalance < planCost) {
      return apiError(
        reply,
        400,
        "insufficient_credit",
        `Insufficient balance. You need $${planCost.toFixed(2)} to cover this plan.`,
      );
    }

    try {
      // Charge for the subscription
      await User.findByIdAndUpdate(user._id, {
        $inc: { creditBalance: -planCost },
      });

      // Clear grace period and reset plan start date
      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          gracePeriodStarted: null,
          gracePeriodEnds: null,
          planStartedAt: new Date(),
        },
      });

      // Send success notification
      await NotificationService.create({
        merchantId: merchant._id.toString(),
        title: "Payment Successful - Plan Maintained",
        description: `Your ${merchant.plan} plan payment has been processed. Grace period cleared.`,
        type: "success",
        link: "/dashboard/billing",
      });

      return reply.send({
        success: true,
        charged: planCost,
        newBalance: user.creditBalance - planCost,
      });
    } catch (error) {
      console.error("Failed to charge plan:", error);
      return apiError(
        reply,
        500,
        "internal_error",
        "Failed to process payment.",
      );
    }
  },
};
