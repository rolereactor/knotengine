"use client";

import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

interface AnalyticsHeaderProps {
  period: AnalyticsPeriod;
  setPeriod: (period: AnalyticsPeriod) => void;
}

const periodLabels: Record<AnalyticsPeriod, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

export function AnalyticsHeader({ period, setPeriod }: AnalyticsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Detailed insights into your payment performance and trends.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3">
              <TrendingUp className="size-3.5" />
              {periodLabels[period]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setPeriod("24h")}>
              Last 24 Hours
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("7d")}>
              Last 7 Days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("30d")}>
              Last 30 Days
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPeriod("90d")}>
              Last 90 Days
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
