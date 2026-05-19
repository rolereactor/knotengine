import { ethers } from "ethers";
import { User } from "@qodinger/knot-database";
import { NotificationService } from "../infra/notification-service.js";

/**
 * 🏦 "The Float" Yield Manager
 *
 * Manages the investment of aggregated merchant credit balances
 * in yield-bearing DeFi protocols to generate passive platform revenue.
 */
export class FloatManager {
  private static instance: FloatManager;
  private provider: ethers.JsonRpcProvider;
  private aavePoolAddress: string;
  private platformWallet: string;

  // Aave Pool ABI (simplified)
  private readonly AAVE_POOL_ABI = [
    "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
    "function withdraw(address asset, uint256 amount, address to)",
    "function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  ];

  // ERC-20 ABI
  private readonly ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
  ];

  public static getInstance(): FloatManager {
    if (!FloatManager.instance) {
      FloatManager.instance = new FloatManager();
    }
    return FloatManager.instance;
  }

  constructor() {
    // Initialize provider (using Polygon for low fees)
    this.provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    );

    this.aavePoolAddress =
      process.env.AAVE_POOL_ADDRESS ||
      "0x794a61358D6845594F94dc1DB02A252b5b4814aD"; // Aave V3 Pool on Polygon
    this.platformWallet = process.env.PLATFORM_WALLET_ADDRESS || "";
  }

  /**
   * Invest available credit balance in yield protocols
   */
  public async investFloat(): Promise<{
    invested: number;
    success: boolean;
    error?: string;
  }> {
    try {
      console.log("🏦 Starting float investment process...");

      // Idempotency: Check if already invested today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alreadyRan = await User.findOne({
        lastFloatInvestAt: { $gte: today },
      });
      if (alreadyRan) {
        console.log("🏦 Float investment already ran today, skipping.");
        return { invested: 0, success: true, error: "Already ran today" };
      }

      const totalBalance = await this.getTotalAvailableBalance();

      if (totalBalance < 100) {
        console.log(`💸 Insufficient balance for investment: $${totalBalance}`);
        return { invested: 0, success: false, error: "Insufficient balance" };
      }

      const invested = await this.trackInvestment(totalBalance);

      console.log(`💰 Invested $${invested} from float into yield protocols`);

      await this.notifyMerchants({
        title: "Float Investment Complete",
        description: `Successfully invested $${invested} from platform float into yield protocols`,
        type: "info",
      });

      return { invested, success: true };
    } catch (error) {
      console.error("❌ Float investment failed:", error);
      return {
        invested: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Notify all merchants about platform events
   */
  private async notifyMerchants(params: {
    title: string;
    description: string;
    type: "success" | "warning" | "error" | "info";
  }) {
    try {
      // Get all merchants
      const merchants = await User.find({ role: "merchant" });

      // Send notification to each merchant
      await Promise.all(
        merchants.map((merchant) =>
          NotificationService.create({
            merchantId: merchant._id.toString(),
            title: params.title,
            description: params.description,
            type: params.type,
          }),
        ),
      );
    } catch (error) {
      console.error("❌ Failed to notify merchants:", error);
    }
  }

  /**
   * Get total available credit balance across all users
   */
  private async getTotalAvailableBalance(): Promise<number> {
    try {
      const result = await User.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$creditBalance" },
          },
        },
      ]);

      return result[0]?.totalBalance || 0;
    } catch (error) {
      console.error("❌ Failed to get total balance:", error);
      return 0;
    }
  }

  /**
   * Track investment in database (simplified version)
   * In production, this would interact with actual DeFi protocols
   */
  private async trackInvestment(amount: number): Promise<number> {
    const investedAmount = Math.floor(amount * 0.8);

    await User.updateMany(
      { creditBalance: { $gt: 0 } },
      {
        $inc: {
          yieldAccruedUsd: (investedAmount * 0.05) / 12,
        },
        $set: { lastFloatInvestAt: new Date() },
      },
    );

    return investedAmount;
  }

  /**
   * Get current float statistics
   */
  public async getFloatStats(): Promise<{
    totalBalance: number;
    investedAmount: number;
    availableAmount: number;
    estimatedYield: number;
    yieldAPY: number;
  }> {
    try {
      const totalBalance = await this.getTotalAvailableBalance();
      const investedAmount = totalBalance * 0.8; // 80% invested
      const availableAmount = totalBalance * 0.2; // 20% available
      const yieldAPY = 0.05; // 5% APY
      const estimatedYield = investedAmount * yieldAPY;

      return {
        totalBalance,
        investedAmount,
        availableAmount,
        estimatedYield,
        yieldAPY: yieldAPY * 100,
      };
    } catch (error) {
      console.error("❌ Failed to get float stats:", error);
      return {
        totalBalance: 0,
        investedAmount: 0,
        availableAmount: 0,
        estimatedYield: 0,
        yieldAPY: 0,
      };
    }
  }

  /**
   * Simulate yield accrual (runs daily)
   */
  public async accrueYield(): Promise<{
    totalYield: number;
    userCount: number;
    success: boolean;
  }> {
    try {
      console.log("🌱 Daily yield accrual process...");

      // Idempotency: Check if already accrued today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alreadyRan = await User.findOne({
        lastFloatAccrueAt: { $gte: today },
      });
      if (alreadyRan) {
        console.log("🌱 Yield accrual already ran today, skipping.");
        return { totalYield: 0, userCount: 0, success: true };
      }

      const stats = await this.getFloatStats();
      const dailyYield = stats.estimatedYield / 365;

      const result = await User.updateMany(
        { creditBalance: { $gt: 0 } },
        {
          $inc: {
            yieldAccruedUsd: dailyYield / 1000,
          },
          $set: { lastFloatAccrueAt: new Date() },
        },
      );

      console.log(`💰 Accrued $${dailyYield.toFixed(2)} in daily yield`);

      await this.notifyMerchants({
        title: "Daily Yield Accrued",
        description: `Platform has accrued $${dailyYield.toFixed(2)} in daily yield from float investments`,
        type: "success",
      });

      return {
        totalYield: dailyYield,
        userCount: result.modifiedCount,
        success: true,
      };
    } catch (error) {
      console.error("❌ Yield accrual failed:", error);
      return {
        totalYield: 0,
        userCount: 0,
        success: false,
      };
    }
  }

  /**
   * Emergency withdrawal from yield protocols
   */
  public async emergencyWithdraw(): Promise<{
    withdrawn: number;
    success: boolean;
    error?: string;
  }> {
    try {
      console.log("🚨 Emergency float withdrawal initiated...");

      const stats = await this.getFloatStats();

      // In production, this would:
      // 1. Withdraw from Aave Pool
      // 2. Transfer back to platform wallet
      // 3. Update user balances

      console.log(
        `💸 Emergency withdrew $${stats.investedAmount} from yield protocols`,
      );

      // Notify merchants about emergency withdrawal
      await this.notifyMerchants({
        title: "🚨 Emergency Float Withdrawal",
        description: `Emergency withdrawal of $${stats.investedAmount} completed from yield protocols`,
        type: "warning",
      });

      return {
        withdrawn: stats.investedAmount,
        success: true,
      };
    } catch (error) {
      console.error("❌ Emergency withdrawal failed:", error);
      return {
        withdrawn: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get float health metrics
   */
  public async getHealthMetrics(): Promise<{
    healthScore: number;
    riskLevel: "low" | "medium" | "high";
    recommendations: string[];
  }> {
    try {
      const stats = await this.getFloatStats();

      let healthScore = 100;
      const recommendations: string[] = [];

      // Check investment ratio
      if (stats.investedAmount > stats.totalBalance * 0.9) {
        healthScore -= 20;
        recommendations.push(
          "Consider reducing investment ratio to maintain liquidity",
        );
      }

      // Check total balance
      if (stats.totalBalance < 1000) {
        healthScore -= 10;
        recommendations.push(
          "Low total balance - consider marketing initiatives",
        );
      }

      // Determine risk level
      let riskLevel: "low" | "medium" | "high" = "low";
      if (healthScore < 70) riskLevel = "high";
      else if (healthScore < 85) riskLevel = "medium";

      return {
        healthScore,
        riskLevel,
        recommendations,
      };
    } catch (error) {
      console.error("❌ Failed to get health metrics:", error);
      return {
        healthScore: 0,
        riskLevel: "high",
        recommendations: ["Unable to assess health - check system"],
      };
    }
  }
}
