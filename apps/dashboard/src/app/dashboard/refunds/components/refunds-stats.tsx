"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, CheckCircle2 } from "lucide-react";

interface RefundsStatsProps {
  stats: {
    totalCount: number;
    pendingCount: number;
    completedCount: number;
    failedCount: number;
    totalRefunded: number;
  };
  loading: boolean;
}

export function RefundsStats({ stats, loading }: RefundsStatsProps) {
  const items = [
    {
      label: "Total Refunds",
      value: stats.totalCount,
      icon: DollarSign,
      color: "text-muted-foreground",
    },
    {
      label: "Pending",
      value: stats.pendingCount,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Completed",
      value: stats.completedCount,
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Refunded",
      value: `$${stats.totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-rose-600 dark:text-rose-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="gap-2 py-4">
          <CardContent className="flex items-center gap-3">
            <div className="bg-muted/50 flex size-9 items-center justify-center rounded-lg">
              <item.icon className={`size-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                {item.label}
              </p>
              {loading ? (
                <Skeleton className="mt-1 h-5 w-16" />
              ) : (
                <p className="text-lg font-bold">{item.value}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
