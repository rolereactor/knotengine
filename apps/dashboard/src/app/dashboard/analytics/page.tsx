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

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/proxy/v1/merchants/me/stats?period=${period}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period, session]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <AnalyticsHeader period={period} setPeriod={setPeriod} />
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
