export const IS_SELF_HOSTED = process.env.SELF_HOSTED === "true";

export function isSelfHosted(): boolean {
  return IS_SELF_HOSTED;
}

export function getEffectivePlan(plan: string): string {
  if (IS_SELF_HOSTED) {
    return "enterprise";
  }
  return plan;
}

export const SELF_HOSTED_NOTICE =
  "Self-hosted mode active — all features unlocked, zero platform fees.";
