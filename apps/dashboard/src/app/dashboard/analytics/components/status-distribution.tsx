"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusDistributionProps {
  data: Record<string, unknown> | null;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "text-emerald-500",
  pending: "text-amber-500",
  expired: "text-red-500",
  failed: "text-red-600",
  mempool_detected: "text-blue-500",
  confirming: "text-indigo-500",
};

const STATUS_BG: Record<string, string> = {
  confirmed: "bg-emerald-500",
  pending: "bg-amber-500",
  expired: "bg-red-500",
  failed: "bg-red-600",
  mempool_detected: "bg-blue-500",
  confirming: "bg-indigo-500",
};

export function StatusDistribution({ data, loading }: StatusDistributionProps) {
  const totalInvoices = (data?.totalInvoices as number) ?? 0;
  const confirmedInvoices = (data?.confirmedInvoices as number) ?? 0;
  const pendingInvoices = (data?.pendingInvoices as number) ?? 0;
  const expiredInvoices = Math.max(
    0,
    totalInvoices - confirmedInvoices - pendingInvoices,
  );

  const statuses = [
    {
      label: "Confirmed",
      count: confirmedInvoices,
      color: STATUS_COLORS.confirmed,
      bg: STATUS_BG.confirmed,
    },
    {
      label: "Pending",
      count: pendingInvoices,
      color: STATUS_COLORS.pending,
      bg: STATUS_BG.pending,
    },
    {
      label: "Expired",
      count: expiredInvoices,
      color: STATUS_COLORS.expired,
      bg: STATUS_BG.expired,
    },
  ].filter((s) => s.count > 0);

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Invoice Status</CardTitle>
        <CardDescription className="text-xs">
          Distribution of invoices by current status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : statuses.length > 0 ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="bg-muted/30 flex h-3 w-full overflow-hidden rounded-full">
              {statuses.map((status) => {
                const percentage =
                  totalInvoices > 0 ? (status.count / totalInvoices) * 100 : 0;
                return (
                  <div
                    key={status.label}
                    className={`${status.bg} transition-all duration-300`}
                    style={{ width: `${percentage}%` }}
                  />
                );
              })}
            </div>

            {/* Status list */}
            <div className="space-y-3">
              {statuses.map((status) => {
                const percentage =
                  totalInvoices > 0
                    ? ((status.count / totalInvoices) * 100).toFixed(1)
                    : "0.0";
                return (
                  <div
                    key={status.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`size-2.5 rounded-full ${status.bg}`} />
                      <span className="text-sm font-medium">
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${status.color}`}>
                        {status.count}
                      </span>
                      <span className="text-muted-foreground/60 w-12 text-right text-xs">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="border-border/30 bg-muted/10 mt-4 flex items-center justify-between rounded-lg border p-3">
              <span className="text-muted-foreground text-xs font-semibold">
                Total Invoices
              </span>
              <span className="text-foreground text-sm font-bold">
                {totalInvoices}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground/50 flex h-32 items-center justify-center text-sm font-medium">
            No invoice data yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
