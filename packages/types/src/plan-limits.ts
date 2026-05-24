// ============================================================
// 📊 PLAN LIMITS CONFIGURATION
// Defines feature limits per subscription plan tier.
// ============================================================

export interface PlanLimits {
  monthlyPrice: number;
  maxTeamSeats: number;
  maxApiKeys: number;
  maxWebhookEndpoints: number;
  maxInvoicesPerMonth: number;
  maxMonthlyVolume: number;
  supportedCurrencies: string[];
  ipAllowlistEnabled: boolean;
  customBrandingEnabled: boolean;
  removeBrandingEnabled: boolean;
  prioritySupport: boolean;
  ssoEnabled: boolean;
  advancedAnalytics: boolean;
  dedicatedInfrastructure: boolean;
  slaGuarantee: string | null;
  dedicatedAccountManager: boolean;
  apiRateLimit: {
    max: number;
    windowMs: number;
  };
}

export const PLAN_COSTS: Record<string, number> = {
  starter: 0,
  professional: 39,
  enterprise: 149,
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: {
    monthlyPrice: 0,
    maxTeamSeats: 2,
    maxApiKeys: 1,
    maxWebhookEndpoints: 1,
    maxInvoicesPerMonth: 100,
    maxMonthlyVolume: 10000,
    supportedCurrencies: ["BTC", "LTC"],
    ipAllowlistEnabled: false,
    customBrandingEnabled: false,
    removeBrandingEnabled: false,
    prioritySupport: false,
    ssoEnabled: false,
    advancedAnalytics: false,
    dedicatedInfrastructure: false,
    slaGuarantee: null,
    dedicatedAccountManager: false,
    apiRateLimit: { max: 1000, windowMs: 60 * 60 * 1000 },
  },
  professional: {
    monthlyPrice: 39,
    maxTeamSeats: 10,
    maxApiKeys: 5,
    maxWebhookEndpoints: 5,
    maxInvoicesPerMonth: 1000,
    maxMonthlyVolume: 100000,
    supportedCurrencies: ["BTC", "LTC", "ETH", "USDT_ERC20", "USDT_POLYGON"],
    ipAllowlistEnabled: true,
    customBrandingEnabled: true,
    removeBrandingEnabled: false,
    prioritySupport: true,
    ssoEnabled: false,
    advancedAnalytics: true,
    dedicatedInfrastructure: false,
    slaGuarantee: null,
    dedicatedAccountManager: false,
    apiRateLimit: { max: 5000, windowMs: 60 * 60 * 1000 },
  },
  enterprise: {
    monthlyPrice: 149,
    maxTeamSeats: Infinity,
    maxApiKeys: Infinity,
    maxWebhookEndpoints: Infinity,
    maxInvoicesPerMonth: Infinity,
    maxMonthlyVolume: Infinity,
    supportedCurrencies: [
      "BTC",
      "LTC",
      "ETH",
      "USDT_ERC20",
      "USDT_POLYGON",
      "USDC_ERC20",
      "USDC_POLYGON",
    ],
    ipAllowlistEnabled: true,
    customBrandingEnabled: true,
    removeBrandingEnabled: true,
    prioritySupport: true,
    ssoEnabled: true,
    advancedAnalytics: true,
    dedicatedInfrastructure: true,
    slaGuarantee: "99.9%",
    dedicatedAccountManager: true,
    apiRateLimit: { max: 10000, windowMs: 60 * 60 * 1000 },
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

export function checkPlanLimit(
  plan: string,
  limitKey: keyof PlanLimits,
  currentValue: number,
): { allowed: boolean; limit: number; current: number } {
  const limits = getPlanLimits(plan);
  const limit = limits[limitKey] as number;

  return {
    allowed: currentValue < limit,
    limit,
    current: currentValue,
  };
}
