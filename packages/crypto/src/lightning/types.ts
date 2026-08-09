export interface LightningConfig {
  provider: "lnd" | "cln" | "eclair";
  host: string;
  port: number;
  macaroon?: string;
  cert?: string;
  invoiceExpiry?: number;
}

export interface LightningInvoice {
  paymentHash: string;
  paymentRequest: string;
  description: string;
  amount: number;
  fee: number;
  status: "pending" | "paid" | "expired" | "cancelled";
  expiresAt: string;
  createdAt: string;
  paidAt?: string;
}

export interface LightningPayment {
  paymentHash: string;
  paymentRequest: string;
  preimage?: string;
  amount: number;
  fee: number;
  status: "pending" | "in_flight" | "succeeded" | "failed";
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
}

export interface LightningWalletBalance {
  balance: number;
  pending: number;
  reserved: number;
  currency: "BTC";
}

export interface LightningPeer {
  publicKey: string;
  address: string;
  alias?: string;
  color?: string;
  channels: number;
  capacity: number;
}

export interface LightningProvider {
  createInvoice(
    amount: number,
    description: string,
    expiry?: number,
  ): Promise<LightningInvoice>;
  lookupPayment(paymentHash: string): Promise<LightningPayment>;
  getWalletBalance(): Promise<LightningWalletBalance>;
  connectPeer(uri: string): Promise<LightningPeer>;
}

export type LightningProviderName = "lnd" | "cln" | "eclair";
