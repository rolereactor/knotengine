import { FastifyReply } from "fastify";

/**
 * Programmatic error codes for machine-readable error handling.
 * Clients should switch on `code`, not on `message` (messages may change).
 */
export type ErrorCode =
  // Auth
  | "unauthorized"
  | "forbidden"
  | "invalid_api_key"
  // Users
  | "user_not_found"
  // Invoices
  | "invoice_not_found"
  | "invoice_already_cancelled"
  | "invoice_already_completed"
  | "invoice_limit_reached"
  | "volume_limit_reached"
  | "insufficient_credit"
  | "below_minimum_amount"
  | "testnet_currency_unsupported"
  | "address_config_missing"
  // Merchants
  | "merchant_not_found"
  | "merchant_suspended"
  | "merchant_deleted"
  // API Keys
  | "api_key_not_found"
  // Webhook Endpoints
  | "webhook_endpoint_not_found"
  // Team
  | "team_member_not_found"
  // Plans
  | "plan_limit_reached"
  // Idempotency
  | "idempotency_conflict"
  // Generic
  | "invalid_request"
  | "not_found"
  | "conflict"
  | "rate_limit_exceeded"
  | "internal_error";

const DOC_BASE = "https://docs.knotengine.com/api/errors";

interface ApiErrorBody {
  error: {
    type:
      | "authentication_error"
      | "invalid_request_error"
      | "api_error"
      | "rate_limit_error";
    code: ErrorCode;
    message: string;
    param?: string;
    doc_url: string;
  };
}

function typeFor(status: number): ApiErrorBody["error"]["type"] {
  if (status === 401 || status === 403) return "authentication_error";
  if (status === 429) return "rate_limit_error";
  if (status >= 500) return "api_error";
  return "invalid_request_error";
}

export function apiError(
  reply: FastifyReply,
  status: number,
  code: ErrorCode,
  message: string,
  param?: string,
): ReturnType<FastifyReply["send"]> {
  const body: ApiErrorBody = {
    error: {
      type: typeFor(status),
      code,
      message,
      doc_url: `${DOC_BASE}#${code}`,
      ...(param ? { param } : {}),
    },
  };
  return reply.code(status).send(body);
}
