"use client";

import {
  DollarSign,
  Receipt,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsGridProps {
  data: Record<string, unknown> | null;
  loading: boolean;
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  change?: { value: number; positive: boolean };
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium">{title}</p>
          <Icon className="text-muted-foreground/50 size-4" />
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change && (
              <div className="mt-1 flex items-center gap-1">
                {change.positive ? (
                  <ArrowUpRight className="size-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="size-3 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    change.positive ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {change.value > 0 ? "+" : ""}
                  {change.value}%
                </span>
                <span className="text-muted-foreground/60 text-xs">
                  vs previous period
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({ data, loading }: MetricsGridProps) {
  const totalVolume = (data?.totalVolume as number) ?? 0;
  const totalInvoices = (data?.totalInvoices as number) ?? 0;
  const confirmedInvoices = (data?.confirmedInvoices as number) ?? 0;
  const successRate =
    totalInvoices > 0
      ? ((confirmedInvoices / totalInvoices) * 100).toFixed(1)
      : "0.0";
  const avgTransaction =
    confirmedInvoices > 0
      ? (totalVolume / confirmedInvoices).toFixed(2)
      : "0.00";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Volume"
        value={`$${totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        change={{ value: 12.5, positive: true }}
        icon={DollarSign}
        loading={loading}
      />
      <MetricCard
        title="Total Invoices"
        value={totalInvoices.toLocaleString()}
        change={{ value: 8.2, positive: true }}
        icon={Receipt}
        loading={loading}
      />
      <MetricCard
        title="Success Rate"
        value={`${successRate}%`}
        change={{ value: 2.1, positive: true }}
        icon={Percent}
        loading={loading}
      />
      <MetricCard
        title="Avg. Transaction"
        value={`$${avgTransaction}`}
        change={{ value: 3.4, positive: false }}
        icon={DollarSign}
        loading={loading}
      />
    </div>
  );
}
