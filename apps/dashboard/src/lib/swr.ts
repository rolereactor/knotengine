import { api } from "@/lib/api";
import type { AxiosRequestConfig } from "axios";

/**
 * SWR fetcher that uses the existing axios `api` instance.
 * Supports query params by passing an array key: [url, params].
 */
export async function fetcher<T>(
  key: string | [string, AxiosRequestConfig["params"]],
): Promise<T> {
  const [url, params] = Array.isArray(key) ? key : [key, undefined];
  const res = await api.get(url, { params });
  return res.data;
}

/**
 * Common SWR key factories for deduplication across hooks.
 * Using consistent keys means SWR automatically shares cache between pages.
 */
export const swrKeys = {
  merchantStats: (params?: Record<string, string>) =>
    params
      ? (["/v1/merchants/me/stats", params] as const)
      : "/v1/merchants/me/stats",
  merchant: "/v1/merchants/me" as const,
  invoices: (params?: Record<string, string>) =>
    params ? (["/v1/invoices", params] as const) : "/v1/invoices",
  notifications: (params?: Record<string, string>) =>
    params
      ? (["/v1/merchants/me/notifications", params] as const)
      : "/v1/merchants/me/notifications",
  refunds: (params?: Record<string, string>) =>
    params ? (["/v1/refunds", params] as const) : "/v1/refunds",
  ipAllowlist: "/v1/merchants/me/ip-allowlist" as const,
};
