"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { fetcher, swrKeys } from "@/lib/swr";
import { toast } from "sonner";

interface IpAllowlistResponse {
  enabled: boolean;
  allowedIps: string[];
}

export function useIpAllowlist() {
  const {
    data,
    isLoading: loading,
    mutate,
  } = useSWR<IpAllowlistResponse>(swrKeys.ipAllowlist, fetcher, {
    revalidateOnFocus: false,
  });

  const [saving, setSaving] = useState(false);

  const enabled = data?.enabled ?? false;
  const allowedIps = data?.allowedIps ?? [];

  const updateAllowlist = async (newEnabled: boolean, newIps: string[]) => {
    setSaving(true);
    try {
      await api.post("/v1/merchants/me/ip-allowlist", {
        enabled: newEnabled,
        allowedIps: newIps,
      });
      await mutate();
      toast.success("IP allowlist updated");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to update IP allowlist";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    await updateAllowlist(!enabled, allowedIps);
  };

  const addIp = async (ip: string) => {
    if (allowedIps.includes(ip)) {
      toast.error("IP address already in allowlist");
      return;
    }
    await updateAllowlist(enabled, [...allowedIps, ip]);
  };

  const removeIp = async (ip: string) => {
    await updateAllowlist(
      enabled,
      allowedIps.filter((addr) => addr !== ip),
    );
  };

  return {
    loading,
    saving,
    enabled,
    allowedIps,
    toggleEnabled,
    addIp,
    removeIp,
  };
}
