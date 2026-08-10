"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher, swrKeys } from "@/lib/swr";
import { Refund } from "../types";
import { toast } from "sonner";

interface RefundsResponse {
  data: Refund[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function useRefunds() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refundParams = useMemo(() => {
    const params: Record<string, string> = { limit: "100" };
    return params;
  }, []);

  const {
    data: refundsData,
    isLoading,
    mutate: mutateRefunds,
  } = useSWR<RefundsResponse>(swrKeys.refunds(refundParams), fetcher, {
    revalidateOnFocus: false,
  });

  const refunds = useMemo(() => refundsData?.data ?? [], [refundsData?.data]);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const matchesSearch =
        r.refund_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "all") return true;
      return r.status === activeTab;
    });
  }, [refunds, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const totalCount = refunds.length;
    const pendingCount = refunds.filter((r) => r.status === "pending").length;
    const completedCount = refunds.filter(
      (r) => r.status === "completed",
    ).length;
    const failedCount = refunds.filter((r) => r.status === "failed").length;
    const totalRefunded = refunds
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.amount_usd, 0);

    return {
      totalCount,
      pendingCount,
      completedCount,
      failedCount,
      totalRefunded,
    };
  }, [refunds]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleCreateRefund = useCallback(
    async (data: {
      invoice_id: string;
      amount_usd: number;
      reason: string;
      refund_address?: string;
    }) => {
      try {
        await api.post("/v1/refunds", data);
        await mutateRefunds();
        toast.success("Refund created successfully");
      } catch (err: any) {
        const message =
          err?.response?.data?.error?.message || "Failed to create refund";
        toast.error(message);
        throw err;
      }
    },
    [mutateRefunds],
  );

  const handleCancelRefund = useCallback(
    async (refundId: string) => {
      try {
        await api.post(`/v1/refunds/${refundId}/cancel`);
        await mutateRefunds();
        setSelectedRefund(null);
        toast.success("Refund cancelled successfully");
      } catch (err: any) {
        const message =
          err?.response?.data?.error?.message || "Failed to cancel refund";
        toast.error(message);
      }
    },
    [mutateRefunds],
  );

  return {
    refunds,
    loading: isLoading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    selectedRefund,
    setSelectedRefund,
    copiedId,
    copyToClipboard,
    filteredRefunds,
    stats,
    handleCreateRefund,
    handleCancelRefund,
    fetchRefunds: mutateRefunds,
  };
}
