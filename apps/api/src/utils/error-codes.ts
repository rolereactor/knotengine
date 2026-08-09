/**
 * Error code constants for IDE autocomplete.
 * Use these instead of string literals when calling apiError().
 */
export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  INVALID_API_KEY: "invalid_api_key",

  // Users
  USER_NOT_FOUND: "user_not_found",

  // Invoices
  INVOICE_NOT_FOUND: "invoice_not_found",
  INVOICE_ALREADY_CANCELLED: "invoice_already_cancelled",
  INVOICE_ALREADY_COMPLETED: "invoice_already_completed",
  INVOICE_LIMIT_REACHED: "invoice_limit_reached",
  VOLUME_LIMIT_REACHED: "volume_limit_reached",
  INSUFFICIENT_CREDIT: "insufficient_credit",
  BELOW_MINIMUM_AMOUNT: "below_minimum_amount",
  TESTNET_CURRENCY_UNSUPPORTED: "testnet_currency_unsupported",
  ADDRESS_CONFIG_MISSING: "address_config_missing",

  // Merchants
  MERCHANT_NOT_FOUND: "merchant_not_found",
  MERCHANT_SUSPENDED: "merchant_suspended",
  MERCHANT_DELETED: "merchant_deleted",

  // API Keys
  API_KEY_NOT_FOUND: "api_key_not_found",

  // Webhook Endpoints
  WEBHOOK_ENDPOINT_NOT_FOUND: "webhook_endpoint_not_found",

  // Payment Links
  PAYMENT_LINK_NOT_FOUND: "payment_link_not_found",
  PAYMENT_LINK_EXPIRED: "payment_link_expired",
  PAYMENT_LINK_LIMIT_REACHED: "payment_link_limit_reached",

  // Donations
  DONATION_NOT_FOUND: "donation_not_found",
  DONATION_EXPIRED: "donation_expired",
  DONATION_LIMIT_REACHED: "donation_limit_reached",

  // Affiliates
  AFFILIATE_NOT_FOUND: "affiliate_not_found",
  AFFILIATE_PAYOUT_NOT_FOUND: "affiliate_payout_not_found",
  AFFILIATE_PAYOUT_INSUFFICIENT_BALANCE:
    "affiliate_payout_insufficient_balance",
  AFFILIATE_PAYOUT_MINIMUM_NOT_MET: "affiliate_payout_minimum_not_met",
  AFFILIATE_TIER_NOT_ELIGIBLE: "affiliate_tier_not_eligible",

  // Team
  TEAM_MEMBER_NOT_FOUND: "team_member_not_found",

  // Plans
  PLAN_LIMIT_REACHED: "plan_limit_reached",

  // Idempotency
  IDEMPOTENCY_CONFLICT: "idempotency_conflict",

  // Generic
  INVALID_REQUEST: "invalid_request",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  INTERNAL_ERROR: "internal_error",
} as const;
