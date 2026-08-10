import {
  Merchant,
  User,
  IMerchant,
  IUser,
  mongoose,
} from "@qodinger/knot-database";
import { PLAN_COSTS } from "@qodinger/knot-types";
import { isSelfHosted } from "./self-hosted-mode.js";
import { AuditLogger } from "./audit-logger.js";
import { NotificationService } from "../infra/notification-service.js";
import { childLogger } from "../infra/logger.js";

/**
 * 🔄 Subscription Billing Engine
 *
 * Handles automated monthly subscription charging for merchants on paid plans.
 * Runs via cron job on the 1st of each month.
 */
export class SubscriptionBilling {
  private static instance: SubscriptionBilling;

  public static getInstance(): SubscriptionBilling {
    if (!SubscriptionBilling.instance) {
      SubscriptionBilling.instance = new SubscriptionBilling();
    }
    return SubscriptionBilling.instance;
  }

  /**
   * Process monthly subscription billing for all merchants
   */
  public async processMonthlyBilling(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    downgraded: number;
    revenue: number;
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      downgraded: 0,
      revenue: 0,
    };

    childLogger("billing").info("🔄 Starting monthly subscription billing...");

    try {
      if (isSelfHosted()) {
        childLogger("billing").info(
          "🏠 Self-hosted mode detected — skipping subscription billing",
        );
        return results;
      }

      // Get all merchants on paid plans
      const paidMerchants = await Merchant.find({
        plan: { $in: ["professional", "enterprise"] },
        isActive: true,
      }).populate("userId");

      childLogger("billing").info(
        `📊 Found ${paidMerchants.length} merchants on paid plans`,
      );

      for (const merchant of paidMerchants) {
        results.processed++;

        try {
          const billingResult = await this.processMerchantBilling(merchant);

          if (billingResult.success) {
            results.successful++;
            results.revenue += billingResult.charged;
          } else {
            if (billingResult.downgraded) {
              results.downgraded++;
            } else {
              results.failed++;
            }
          }

          // Add small delay to avoid overwhelming the database
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          childLogger("billing").error(
            { err: error },
            `❌ Billing failed for merchant ${merchant.merchantId}`,
          );
          results.failed++;
        }
      }

      childLogger("billing").info(
        {
          results: {
            processed: results.processed,
            successful: results.successful,
            failed: results.failed,
            downgraded: results.downgraded,
            revenue: `$${results.revenue.toFixed(2)}`,
          },
        },
        "✅ Monthly billing complete",
      );

      return results;
    } catch (error) {
      childLogger("billing").error(
        { err: error },
        "❌ Monthly billing process failed",
      );
      throw error;
    }
  }

  /**
   * Process billing for a single merchant
   */
  private async processMerchantBilling(
    merchant: IMerchant & { userId?: IUser | mongoose.Types.ObjectId },
  ): Promise<{
    success: boolean;
    charged: number;
    downgraded: boolean;
    reason?: string;
    daysRemaining?: number;
  }> {
    const plan = merchant.plan as "professional" | "enterprise";
    const cost = PLAN_COSTS[plan] ?? 0;
    const user = merchant.userId;

    // Helper function to check if userId is populated as IUser
    const isPopulatedUser = (
      userId: IUser | mongoose.Types.ObjectId | undefined,
    ): userId is IUser => {
      return (
        userId !== undefined && !(userId instanceof mongoose.Types.ObjectId)
      );
    };

    // Check if user exists and is populated
    if (!user || !isPopulatedUser(user) || user.creditBalance < cost) {
      childLogger("billing").info(
        `💸 Insufficient balance for ${merchant.merchantId} (${plan}) - checking grace period`,
      );

      // Check if already in grace period
      const gracePeriodDays = 7; // 7 days grace period

      // First time insufficient balance - start grace period and send warning
      if (!merchant.gracePeriodStarted) {
        childLogger("billing").info(
          `⏰ Starting grace period for ${merchant.merchantId} - ${gracePeriodDays} days until downgrade`,
        );

        await Merchant.findByIdAndUpdate(merchant._id, {
          $set: {
            gracePeriodStarted: new Date(),
            gracePeriodEnds: new Date(
              Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000,
            ),
          },
        });

        // Send initial warning
        await NotificationService.create({
          merchantId: merchant._id.toString(),
          title: "Payment Required - Grace Period Started",
          description: `Insufficient balance for ${plan} plan. You have ${gracePeriodDays} days to top up before automatic downgrade to Starter plan.`,
          type: "warning",
          link: "/dashboard/billing",
        });

        return {
          success: false,
          charged: 0,
          downgraded: false,
          reason: "Grace period started",
        };
      }

      // Check if grace period has expired
      const gracePeriodEnds = merchant.gracePeriodEnds;
      if (gracePeriodEnds && new Date() < gracePeriodEnds) {
        const daysRemaining = Math.ceil(
          (gracePeriodEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );

        childLogger("billing").info(
          `⏳ Grace period active for ${merchant.merchantId} - ${daysRemaining} days remaining`,
        );

        // Send reminder if 3 days or less remaining
        if (daysRemaining <= 3) {
          await NotificationService.create({
            merchantId: merchant._id.toString(),
            title: `Payment Required - ${daysRemaining} days remaining`,
            description: `Your ${plan} plan will be downgraded to Starter in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} due to insufficient balance.`,
            type: "warning",
            link: "/dashboard/billing",
          });
        }

        return {
          success: false,
          charged: 0,
          downgraded: false,
          reason: "Grace period active",
          daysRemaining,
        };
      }

      // Grace period expired - downgrade now
      childLogger("billing").info(
        `⏰ Grace period expired for ${merchant.merchantId} - downgrading to starter`,
      );

      await Merchant.findByIdAndUpdate(merchant._id, {
        $set: {
          plan: "starter",
          planStartedAt: new Date(),
          gracePeriodStarted: null,
          gracePeriodEnds: null,
        },
      });

      // Audit log
      await AuditLogger.billing(
        user?._id?.toString() || "",
        "plan_changed",
        undefined,
        {
          merchantId: merchant._id.toString(),
          merchantIdReadable: merchant.merchantId,
          previousPlan: plan,
          newPlan: "starter",
          reason: "grace_period_expired",
        },
      );

      // Send final notification
      await NotificationService.create({
        merchantId: merchant._id.toString(),
        title: "Plan Downgraded - Grace Period Expired",
        description: `Grace period expired. Downgraded to Starter plan due to insufficient balance. Top up to upgrade again.`,
        type: "error",
        link: "/dashboard/billing",
      });

      return {
        success: false,
        charged: 0,
        downgraded: true,
        reason: "Insufficient balance",
      };
    }

    // Charge the subscription fee
    await User.findByIdAndUpdate(user._id, {
      $inc: { creditBalance: -cost },
    });

    // Update merchant's plan start date
    await Merchant.findByIdAndUpdate(merchant._id, {
      $set: { planStartedAt: new Date() },
    });

    // Audit log
    await AuditLogger.billing(
      user._id.toString(),
      "subscription_charged",
      undefined,
      {
        merchantId: merchant._id.toString(),
        merchantIdReadable: merchant.merchantId,
        plan,
        amountCharged: cost,
      },
    );

    // Send success notification
    await NotificationService.create({
      merchantId: merchant._id.toString(),
      title: "Subscription Renewed",
      description: `Your ${plan} plan has been renewed for $${cost.toFixed(2)}.`,
      type: "success",
      link: "/dashboard/billing",
    });

    childLogger("billing").info(
      `💳 Charged ${merchant.merchantId} $${cost.toFixed(2)} for ${plan} plan`,
    );

    return {
      success: true,
      charged: cost,
      downgraded: false,
    };
  }

  /**
   * Get billing status for a merchant
   */
  public async getMerchantBillingStatus(merchantId: string): Promise<{
    plan: string;
    planStartedAt: Date;
    nextBillingDate: Date;
    monthlyCost: number;
    daysUntilBilling: number;
    isProratedThisMonth?: boolean;
    proratedAmount?: number;
  }> {
    const merchant = await Merchant.findOne({ merchantId });

    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const planStartedAt = merchant.planStartedAt || new Date();
    const nextBillingDate = new Date();
    nextBillingDate.setDate(1);
    if (nextBillingDate <= new Date()) {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    const daysUntilBilling = Math.ceil(
      (nextBillingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const isProratedThisMonth = !!(
      merchant.lastProratedDate &&
      merchant.lastProratedDate.getMonth() === new Date().getMonth() &&
      merchant.lastProratedDate.getFullYear() === new Date().getFullYear()
    );

    return {
      plan: merchant.plan,
      planStartedAt,
      nextBillingDate,
      monthlyCost: PLAN_COSTS[merchant.plan] ?? 0,
      daysUntilBilling: Math.max(0, daysUntilBilling),
      isProratedThisMonth,
      proratedAmount: merchant.lastProratedAmount || undefined,
    };
  }

  /**
   * Check if billing is due (runs daily to trigger monthly billing on the 1st)
   */
  public async checkAndProcessBilling(): Promise<boolean> {
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;

    if (isFirstOfMonth) {
      childLogger("billing").info(
        "📅 Today is the 1st - processing monthly billing",
      );
      await this.processMonthlyBilling();
      return true;
    }

    return false;
  }
}
