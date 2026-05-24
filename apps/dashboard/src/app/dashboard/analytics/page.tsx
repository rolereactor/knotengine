"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AnalyticsHeader } from "./components/analytics-header";
import { MetricsGrid } from "./components/metrics-grid";
import { VolumeChart } from "./components/volume-chart";
import { CurrencyBreakdown } from "./components/currency-breakdown";
import { HourlyPattern } from "./components/hourly-pattern";
import { StatusDistribution } from "./components/status-distribution";

type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/merchants/me/stats?period=${period}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          setError("Failed to load analytics data");
          setStats(null);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError("Failed to load analytics data");
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period, session, retryCount]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <AnalyticsHeader period={period} setPeriod={setPeriod} />
      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
          <span>{error}</span>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="ml-auto text-xs underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            Retry
          </button>
        </div>
      )}
      <MetricsGrid data={stats} loading={loading} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VolumeChart data={stats} loading={loading} period={period} />
        </div>
        <StatusDistribution data={stats} loading={loading} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CurrencyBreakdown data={stats} loading={loading} />
        <HourlyPattern data={stats} loading={loading} />
      </div>
    </div>
  );
}
