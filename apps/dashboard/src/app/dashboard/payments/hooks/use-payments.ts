"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher, swrKeys } from "@/lib/swr";
import { Invoice, TimelineEvent } from "../types";

type MerchantPlan = "starter" | "professional" | "enterprise";

interface InvoicesResponse {
  data: Invoice[];
}

interface StatsResponse {
  currentPlan?: string;
  [key: string]: unknown;
}

export function usePayments() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState(tabParam || "all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Build params based on active tab
  const invoiceParams = useMemo(() => {
    const params: Record<string, string> = { limit: "100" };
    if (activeTab === "testnet") {
      params.include_testnet = "true";
      params.only_testnet = "true";
    }
    return params;
  }, [activeTab]);

  const {
    data: invoicesData,
    isLoading: invoicesLoading,
    mutate: mutateInvoices,
  } = useSWR<InvoicesResponse>(swrKeys.invoices(invoiceParams), fetcher, {
    revalidateOnFocus: false,
  });

  const { data: statsData, isLoading: statsLoading } = useSWR<StatsResponse>(
    swrKeys.merchantStats(),
    fetcher,
    { revalidateOnFocus: false },
  );

  const invoices = useMemo(
    () => invoicesData?.data ?? [],
    [invoicesData?.data],
  );
  const loading = invoicesLoading || statsLoading;
  const plan = (statsData?.currentPlan as MerchantPlan) ?? undefined;

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `?tab=${tab}`);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchTimeline = async (invoiceId: string) => {
    setLoadingTimeline(true);
    try {
      const res = await api.get("/v1/merchants/me/notifications", {
        params: { invoiceId, limit: 50 },
      });
      setTimeline(res.data.data);
    } catch (err) {
      console.error("Failed to fetch timeline", err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const openInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    fetchTimeline(invoice.invoice_id);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.crypto_currency.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "all" || activeTab === "testnet") return true;

      if (activeTab === "confirmed") {
        return ["confirmed", "overpaid"].includes(inv.status);
      }

      if (activeTab === "pending") {
        return [
          "pending",
          "partially_paid",
          "confirming",
          "mempool_detected",
        ].includes(inv.status);
      }

      return inv.status === activeTab;
    });
  }, [invoices, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const totalVolume = invoices
      .filter((inv) => ["confirmed", "overpaid"].includes(inv.status))
      .reduce((sum, inv) => sum + inv.amount_usd, 0);
    const confirmedCount = invoices.filter((inv) =>
      ["confirmed", "overpaid"].includes(inv.status),
    ).length;
    const pendingCount = invoices.filter((inv) =>
      ["pending", "partially_paid", "confirming", "mempool_detected"].includes(
        inv.status,
      ),
    ).length;

    return {
      totalVolume,
      confirmedCount,
      pendingCount,
      totalCount: invoices.length,
    };
  }, [invoices]);

  const handleResolve = async (invoiceId: string) => {
    try {
      await api.post(`/v1/invoices/${invoiceId}/resolve`);
      await mutateInvoices();
    } catch (err) {
      console.error("Failed to resolve invoice", err);
    }
  };

  return {
    invoices,
    loading,
    plan,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab: handleTabChange,
    copiedId,
    selectedInvoice,
    setSelectedInvoice,
    timeline,
    loadingTimeline,
    copyToClipboard,
    openInvoiceDetails,
    filteredInvoices,
    stats,
    fetchInvoices: mutateInvoices,
    handleResolve,
  };
}
