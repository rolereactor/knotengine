"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HourlyPatternProps {
  data: Record<string, unknown> | null;
  loading: boolean;
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
          {payload[0].value} invoices
        </p>
      </div>
    );
  }
  return null;
};

// Generate sample hourly data if not available
const generateHourlyData = () => {
  const hours = Array.from(
    { length: 24 },
    (_, i) => `${i.toString().padStart(2, "0")}:00`,
  );
  return hours.map((hour) => ({
    hour,
    count: Math.floor(Math.random() * 20),
  }));
};

export function HourlyPattern({ data, loading }: HourlyPatternProps) {
  const hourlyData =
    (data?.hourlyPattern as Array<{ hour: string; count: number }>) ??
    generateHourlyData();

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Hourly Pattern</CardTitle>
        <CardDescription className="text-xs">
          Invoice creation distribution by hour of day.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.08}
              />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                interval={3}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted-foreground))", opacity: 0.04 }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
