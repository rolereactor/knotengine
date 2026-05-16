"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CurrencyBreakdownProps {
  data: Record<string, unknown> | null;
  loading: boolean;
}

const CURRENCY_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  LTC: "#bfbbbb",
  USDT_ERC20: "#26a17b",
  USDT_POLYGON: "#8247e5",
  USDC_ERC20: "#26a17b",
  USDC_POLYGON: "#8247e5",
};

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

export function CurrencyBreakdown({ data, loading }: CurrencyBreakdownProps) {
  const topCurrencies =
    (data?.topCurrencies as Array<{ currency: string; volume: number }>) ?? [];

  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-sm font-bold">Revenue by Currency</CardTitle>
        <CardDescription className="text-xs">
          Breakdown of confirmed settlement volume per asset.
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : topCurrencies.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topCurrencies}
              layout="vertical"
              margin={{ left: 8, right: 16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.08}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="currency"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                width={100}
                tickFormatter={(v) =>
                  v.replace("_ERC20", "").replace("_POLYGON", " (Poly)")
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted-foreground))", opacity: 0.04 }}
              />
              <Bar dataKey="volume" radius={[0, 6, 6, 0]}>
                {topCurrencies.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      CURRENCY_COLORS[entry.currency] ?? "hsl(var(--primary))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-muted-foreground/50 flex h-full items-center justify-center text-sm font-medium">
            No currency data yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
