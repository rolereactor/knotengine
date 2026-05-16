"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface WebhookDelivery {
  _id: string;
  merchantId: string;
  invoiceId: string;
  eventType: string;
  url: string;
  attempt: number;
  status: "pending" | "success" | "failed";
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
}

export function useWebhookDeliveries() {
  const { data: session } = useSession();
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("");

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter) params.set("status", statusFilter);
      if (invoiceFilter) params.set("invoiceId", invoiceFilter);

      const response = await fetch(
        `/api/proxy/v1/merchants/me/webhooks/deliveries?${params}`,
      );

      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch webhook deliveries:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, invoiceFilter, session]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/proxy/v1/merchants/me/webhooks/stats");

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch webhook stats:", error);
    }
  }, [session]);

  useEffect(() => {
    fetchDeliveries();
    fetchStats();
  }, [fetchDeliveries, fetchStats]);

  return {
    deliveries,
    stats,
    loading,
    page,
    totalPages,
    setPage,
    statusFilter,
    setStatusFilter,
    invoiceFilter,
    setInvoiceFilter,
    refresh: fetchDeliveries,
  };
}
