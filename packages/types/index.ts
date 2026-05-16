// ============================================================
// @qodinger/knot-types — Shared type definitions for KnotEngine
// ============================================================

export const SUPPORTED_CURRENCIES = [
  "BTC",
  "LTC",
  "ETH",
  "USDT_ERC20",
  "USDT_POLYGON",
  "USDC_ERC20",
  "USDC_POLYGON",
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const EVM_CURRENCIES: Currency[] = ["ETH", "USDT_ERC20", "USDT_POLYGON"];

export const CRYPTO_LOGOS: Record<Currency, string> = {
  BTC: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=032",
  LTC: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=032",
  ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.svg?v=032",
  USDT_ERC20: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=032",
  USDT_POLYGON: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=032",
  USDC_ERC20: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=032",
  USDC_POLYGON: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg?v=032",
};

export const CRYPTO_LABELS: Record<Currency, string> = {
  BTC: "Bitcoin (BTC)",
  LTC: "Litecoin (LTC)",
  ETH: "Ethereum (ETH)",
  USDT_ERC20: "Tether (USDT) on Ethereum",
  USDT_POLYGON: "Tether (USDT) on Polygon",
  USDC_ERC20: "USD Coin (USDC) on Ethereum",
  USDC_POLYGON: "USD Coin (USDC) on Polygon",
};

/**
 * UI-focused asset grouping
 */
export const ASSET_CONFIG = [
  { id: "BTC", label: "Bitcoin", symbol: "BTC", icon: CRYPTO_LOGOS.BTC },
  { id: "LTC", label: "Litecoin", symbol: "LTC", icon: CRYPTO_LOGOS.LTC },
  { id: "ETH", label: "Ethereum", symbol: "ETH", icon: CRYPTO_LOGOS.ETH },
  {
    id: "USDT",
    label: "Tether",
    symbol: "USDT",
    icon: CRYPTO_LOGOS.USDT_ERC20,
  },
  {
    id: "USDC",
    label: "USD Coin",
    symbol: "USDC",
    icon: CRYPTO_LOGOS.USDC_ERC20,
  },
];

export interface NetworkInfo {
  id: Currency;
  label: string;
  networkName: string;
  networkSymbol: string;
  merchantField: "btcXpub" | "ethAddress";
  type: string;
  iconColor: string;
  iconUrl: string;
  estimatedTime?: string;
  networkFee?: string;
}

/**
 * Network specific metadata for each asset
 */
export const NETWORK_CONFIG: Record<string, NetworkInfo[]> = {
  BTC: [
    {
      id: "BTC",
      label: "Bitcoin Network",
      networkName: "Bitcoin",
      networkSymbol: "BTC",
      merchantField: "btcXpub",
      type: "HD Wallet (xPub)",
      iconColor: "bg-amber-500",
      iconUrl: CRYPTO_LOGOS.BTC,
      estimatedTime: "≈ 10 mins",
      networkFee: "0.00001 BTC (≈ $0.45)",
    },
  ],
  LTC: [
    {
      id: "LTC",
      label: "Litecoin Network",
      networkName: "Litecoin",
      networkSymbol: "LTC",
      merchantField: "btcXpub",
      type: "HD Wallet (xPub)",
      iconColor: "bg-blue-600",
      iconUrl: CRYPTO_LOGOS.LTC,
      estimatedTime: "≈ 2.5 mins",
      networkFee: "0.0005 LTC (≈ $0.03)",
    },
  ],
  ETH: [
    {
      id: "ETH",
      label: "Ethereum (ERC20)",
      networkName: "Ethereum (ERC20)",
      networkSymbol: "ETH",
      merchantField: "ethAddress",
      type: "Static Address",
      iconColor: "bg-indigo-500",
      iconUrl: CRYPTO_LOGOS.ETH,
      estimatedTime: "≈ 2 mins",
      networkFee: "0.00002 ETH (≈ $0.05)",
    },
  ],
  USDT: [
    {
      id: "USDT_ERC20",
      label: "Ethereum (ERC20)",
      networkName: "Ethereum (ERC20)",
      networkSymbol: "ETH",
      merchantField: "ethAddress",
      type: "Static Address",
      iconColor: "bg-emerald-500",
      iconUrl: CRYPTO_LOGOS.USDT_ERC20,
      estimatedTime: "≈ 2 mins",
      networkFee: "0.05 USDT (≈ $0.05)",
    },
    {
      id: "USDT_POLYGON",
      label: "Polygon Network",
      networkName: "Polygon",
      networkSymbol: "POLYGON",
      merchantField: "ethAddress",
      type: "Static Address",
      iconColor: "bg-emerald-600",
      iconUrl: CRYPTO_LOGOS.USDT_POLYGON,
      estimatedTime: "≈ 1 mins",
      networkFee: "0.01 USDT (≈ $0.01)",
    },
  ],
  USDC: [
    {
      id: "USDC_ERC20",
      label: "Ethereum (ERC20)",
      networkName: "Ethereum (ERC20)",
      networkSymbol: "ETH",
      merchantField: "ethAddress",
      type: "Static Address",
      iconColor: "bg-blue-500",
      iconUrl: CRYPTO_LOGOS.USDC_ERC20,
      estimatedTime: "≈ 2 mins",
      networkFee: "0.05 USDC (≈ $0.05)",
    },
    {
      id: "USDC_POLYGON",
      label: "Polygon Network",
      networkName: "Polygon",
      networkSymbol: "POLYGON",
      merchantField: "ethAddress",
      type: "Static Address",
      iconColor: "bg-blue-600",
      iconUrl: CRYPTO_LOGOS.USDC_POLYGON,
      estimatedTime: "≈ 1 mins",
      networkFee: "0.01 USDC (≈ $0.01)",
    },
  ],
};

export type InvoiceStatus =
  | "pending"
  | "mempool_detected"
  | "confirming"
  | "confirmed"
  | "expired"
  | "failed";

export interface Merchant {
  id: string;
  name: string;
  btc_xpub?: string;
  eth_address?: string;
  webhook_url?: string;
  derivation_index: number;
  confirmation_policy: {
    BTC: number;
    LTC: number;
    ETH: number;
  };
  is_active: boolean;
}

export interface Invoice {
  id: string;
  invoice_id: string;
  merchant_id: string;
  amount_usd: number;
  crypto_amount: number;
  crypto_currency: Currency;
  pay_address: string;
  derivation_index: number;
  status: InvoiceStatus;
  confirmations: number;
  required_confirmations: number;
  expires_at: Date;
  tx_hash?: string;
  block_number?: number;
  metadata?: Record<string, unknown>;
  paidAt?: Date;
}

export interface WebhookEvent {
  id: string;
  source: string;
  event_type: string;
  to_address: string;
  tx_hash: string;
  amount: string;
  asset: string;
  block_number: number;
  confirmations: number;
  processed: boolean;
  invoice_id?: string;
}

/** Default confirmation depths per currency */
export const DEFAULT_CONFIRMATIONS: Record<string, number> = {
  BTC: 2,
  LTC: 6,
  ETH: 12,
  USDT_ERC20: 12,
  USDT_POLYGON: 30,
  USDC_POLYGON: 30,
};

export const MAX_TEXT_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_URL_LENGTH = 2048;
export const MAX_TXHASH_LENGTH = 128;

const HTML_TAG_PATTERN = /<[^>]*>/g;
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

export function stripHtmlTags(input: string): string {
  return input.replace(SCRIPT_PATTERN, "").replace(HTML_TAG_PATTERN, "");
}

export function limitLength(input: string, maxLength: number): string {
  if (input.length > maxLength) {
    return input.slice(0, maxLength);
  }
  return input;
}

export function escapeSpecialChars(input: string): string {
  return input.replace(/[*^+?()|${}[\]\\]/g, "\\$&");
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

export const inputValidators = {
  stripHtmlTags,
  limitLength,
  escapeSpecialChars,
  isValidEmail,
  sanitizeInput: (input: string) =>
    limitLength(stripHtmlTags(input), MAX_TEXT_LENGTH),
  sanitizeEmail: (input: string) =>
    limitLength(stripHtmlTags(input).toLowerCase().trim(), MAX_EMAIL_LENGTH),
  sanitizeUrl: (input: string) =>
    limitLength(stripHtmlTags(input), MAX_URL_LENGTH),
};
