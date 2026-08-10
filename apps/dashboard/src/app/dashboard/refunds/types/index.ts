export type RefundStatus = "pending" | "processing" | "completed" | "failed";

export interface Refund {
  object: string;
  refund_id: string;
  invoice_id: string;
  amount_usd: number;
  crypto_currency: string;
  crypto_amount: number | null;
  status: RefundStatus;
  reason: string;
  tx_hash: string | null;
  refund_address: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
}
