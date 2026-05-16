"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface VolumeChartProps {
  data: Record<string, unknown> | null;
  loading: boolean;
  period: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="border-border/50 bg-background/95 rounded-lg border p-3 shadow-xl backdrop-blur-sm">
        <p className="text-muted-foreground mb-1 text-xs font-semibold">
          {label}
        </p>
        <p className="text-foreground text-sm font-bold">
          $
          {payload[0].value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
          })}
        </p>
      </div>
    );
  }
  return null;
};

export function VolumeChart({ data, loading, period }: VolumeChartProps) {
  const chartData =
    (data?.chartData as Array<{ name: string; volume: number }>) ?? [];

  const xLabel = period === "24h" ? "Hour" : period === "7d" ? "Day" : "Date";

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Volume Over Time</CardTitle>
        <CardDescription className="text-xs">
          Confirmed settlement volume by {xLabel.toLowerCase()}.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : chartData.length > 0 && chartData.some((d) => d.volume > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.1}
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVolume)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-muted-foreground/50 flex h-full items-center justify-center text-sm font-medium">
            No volume data yet. Create and settle invoices to see chart data.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
