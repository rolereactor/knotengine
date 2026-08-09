"use client";

import {
  Copy,
  Check,
  TrendingUp,
  ShieldCheck,
  Zap,
  Gift,
  ArrowUpRight,
  Trophy,
  Wallet,
  Star,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AffiliatesHeader } from "./components/affiliates-header";
import { cn } from "@/lib/utils";

interface AffiliateStats {
  object: "affiliate_stats";
  referral_code: string | null;
  total_referrals: number;
  total_earnings_usd: number;
  monthly_earnings_usd: number;
  pending_payout_usd: number;
  tier: string;
  commission_rate: number;
  affiliate_link: string;
}

interface TierInfo {
  object: "affiliate_tier";
  current_tier: string;
  current_tier_key: string;
  commission_rate: number;
  total_referrals: number;
  next_tier: string | null;
  next_tier_commission: number | null;
  referrals_to_next_tier: number | null;
}

interface Payout {
  object: "affiliate_payout";
  id: string;
  amount_usd: number;
  method: string;
  currency: string | null;
  status: string;
  tx_hash: string | null;
  created_at: string;
  processed_at: string | null;
}

const TIER_CONFIG = {
  standard: {
    label: "Standard",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    icon: Star,
  },
  silver: {
    label: "Silver",
    color: "text-gray-300",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
    icon: Star,
  },
  gold: {
    label: "Gold",
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    icon: Trophy,
  },
  platinum: {
    label: "Platinum",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    icon: Trophy,
  },
};

const TIER_THRESHOLDS = {
  standard: 0,
  silver: 10,
  gold: 50,
  platinum: 200,
};

export default function AffiliatesPage() {
  const { data: session, status } = useSession();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  const isLoading = status === "loading" || loading;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, tierRes, payoutsRes] = await Promise.all([
          fetch("/api/affiliates/stats"),
          fetch("/api/affiliates/tier"),
          fetch("/api/affiliates/payouts?limit=5"),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (tierRes.ok) setTierInfo(await tierRes.json());
        if (payoutsRes.ok) {
          const data = await payoutsRes.json();
          setPayouts(data.data || []);
        }
      } catch {
        console.error("Failed to load affiliate data");
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchData();
  }, [session]);

  const affiliateCode = stats?.referral_code || session?.user?.referralCode;
  const affiliateLink =
    stats?.affiliate_link ||
    (affiliateCode
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${affiliateCode}`
      : "");

  const copyToClipboard = () => {
    if (!affiliateLink) return;
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tier = (tierInfo?.current_tier_key ||
    "standard") as keyof typeof TIER_CONFIG;
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const TierIcon = tierConfig.icon;

  const nextThreshold =
    tier === "platinum"
      ? null
      : TIER_THRESHOLDS[
          tier === "standard"
            ? "silver"
            : tier === "silver"
              ? "gold"
              : "platinum"
        ];
  const progressPercent = nextThreshold
    ? Math.min(100, ((tierInfo?.total_referrals || 0) / nextThreshold) * 100)
    : 100;

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-500",
    processing: "bg-blue-500/10 text-blue-500",
    completed: "bg-emerald-500/10 text-emerald-500",
    failed: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <AffiliatesHeader />

      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Total Earned */}
          <Card className="relative overflow-hidden border-emerald-500/20 bg-linear-to-br from-emerald-500/10 to-transparent">
            <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription className="text-[10px] font-bold tracking-widest text-emerald-500/70 uppercase">
                    Total Earned
                  </CardDescription>
                  <CardTitle className="mt-2 text-3xl font-black tracking-tighter text-white">
                    {isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      formatCurrency(stats?.total_earnings_usd || 0)
                    )}
                  </CardTitle>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <TrendingUp className="size-5 text-emerald-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                  Lifetime
                </span>
                <span className="text-muted-foreground text-xs">
                  Paid to credit balance
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tier Card */}
          <Card
            className={cn(
              "relative overflow-hidden",
              tierConfig.border,
              tierConfig.bg,
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    Current Tier
                  </CardDescription>
                  <CardTitle
                    className={cn(
                      "mt-2 text-3xl font-black tracking-tighter",
                      tierConfig.color,
                    )}
                  >
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      tierConfig.label
                    )}
                  </CardTitle>
                </div>
                <div
                  className={cn(
                    "rounded-xl border p-3",
                    tierConfig.border,
                    tierConfig.bg,
                  )}
                >
                  <TierIcon className={cn("size-5", tierConfig.color)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tierInfo?.next_tier ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">
                      {tierInfo.referrals_to_next_tier} more to{" "}
                      {tierInfo.next_tier}
                    </span>
                    <span className="text-white/40">
                      {Math.round(progressPercent)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        tierConfig.bg.replace("/10", ""),
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/40">Maximum tier reached!</p>
              )}
            </CardContent>
          </Card>

          {/* Commission Rate */}
          <Card className="relative overflow-hidden border-white/5 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardDescription className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    Commission Rate
                  </CardDescription>
                  <CardTitle className="mt-2 text-3xl font-black tracking-tighter text-white">
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      `${(stats?.commission_rate || 0.1) * 100}%`
                    )}
                  </CardTitle>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Wallet className="size-5 text-white/60" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  Per referred top-up
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Affiliate Link Card */}
          <Card className="relative flex flex-col overflow-hidden border-white/5 bg-[#050505] shadow-2xl">
            <div className="bg-primary/5 absolute top-0 right-0 -mt-32 -mr-32 h-64 w-64 rounded-full blur-3xl" />
            <CardHeader className="relative">
              <div className="mb-2 flex items-center gap-3">
                <div className="bg-primary/10 border-primary/20 rounded-lg border p-2">
                  <Gift className="text-primary size-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">
                    Your Affiliate Link
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Share this with other business owners
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/8 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/15">
                  <Gift className="size-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white/90">
                    Your affiliate gets{" "}
                    <span className="text-emerald-400">$10 credit</span> —
                    double the standard bonus
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Standard signup is $5. With your link: $10. That&apos;s your
                    pitch.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative flex-1 space-y-6">
              <div className="flex min-w-0 gap-2">
                <div className="relative min-w-0 flex-1">
                  <Input
                    readOnly
                    value={
                      isLoading ? "Loading affiliate link..." : affiliateLink
                    }
                    className={cn(
                      "focus-visible:ring-primary/20 h-10! border-white/10 bg-black pr-20 text-sm font-medium text-white/70 transition-all",
                      isLoading && "animate-pulse",
                    )}
                  />
                  {!isLoading && affiliateCode && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-white/20 select-none">
                      {affiliateCode}
                    </div>
                  )}
                </div>
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  disabled={isLoading || !affiliateLink}
                  className={cn(
                    "h-10! shrink-0 gap-1.5 px-4 text-xs font-black tracking-widest uppercase transition-all duration-300",
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-black hover:bg-zinc-200",
                  )}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="group flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/2 p-5 transition-colors hover:border-white/10">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-110">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/90">
                      Transparent & Verified
                    </h4>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                      Every affiliate conversion is tracked and commission
                      payouts are logged.
                    </p>
                  </div>
                </div>
                <div className="group flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/2 p-5 transition-colors hover:border-white/10">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-110">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white/90">
                      Instant Commission
                    </h4>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                      Your credit balance updates automatically when your
                      affiliate tops up.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Tier Progress + How It Works */}
          <div className="flex flex-col gap-4">
            {/* Tier Progress */}
            <Card className="border-white/5 bg-zinc-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <Trophy className="size-5 text-yellow-500" />
                  Tier Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {["standard", "silver", "gold", "platinum"].map((t, i) => {
                  const config = TIER_CONFIG[t as keyof typeof TIER_CONFIG];
                  const threshold =
                    TIER_THRESHOLDS[t as keyof typeof TIER_THRESHOLDS];
                  const isCurrentTier = t === tier;
                  const isPastTier = (TIER_THRESHOLDS[tier] || 0) > threshold;

                  return (
                    <div
                      key={t}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-2 transition-colors",
                        isCurrentTier && "bg-white/5",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border text-xs font-bold",
                          isPastTier || isCurrentTier
                            ? cn(config.border, config.bg, config.color)
                            : "border-white/10 bg-white/5 text-white/30",
                        )}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isPastTier || isCurrentTier
                                ? "text-white"
                                : "text-white/40",
                            )}
                          >
                            {config.label}
                          </span>
                          {isCurrentTier && (
                            <Badge variant="secondary" className="text-[10px]">
                              Current
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-white/40">
                          {threshold}+ referrals ·{" "}
                          {(
                            TIER_COMMISSIONS[
                              t as keyof typeof TIER_COMMISSIONS
                            ] * 100
                          ).toFixed(0)}
                          % commission
                        </span>
                      </div>
                      {(isPastTier || isCurrentTier) && (
                        <TierIcon className={cn("size-4", config.color)} />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="flex-1 border-white/5 bg-zinc-900/20">
              <CardHeader>
                <CardTitle className="text-lg font-bold tracking-tight">
                  How it Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    step: "1",
                    text: "Share your affiliate link with merchants",
                  },
                  { step: "2", text: "They register and get $10 credit" },
                  { step: "3", text: "You earn commission on every top-up" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="bg-primary/10 border-primary/20 text-primary flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-black">
                      {item.step}
                    </div>
                    <p className="text-xs font-medium text-white/60">
                      {item.text}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Payouts */}
        {payouts.length > 0 && (
          <Card className="border-white/5 bg-zinc-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold tracking-tight">
                  Recent Payouts
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs">
                  View All <ArrowRight className="ml-1 size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex items-center gap-4 rounded-lg border border-white/5 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {formatCurrency(payout.amount_usd)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px]",
                            statusColors[payout.status],
                          )}
                        >
                          {payout.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-white/40">
                        {payout.method === "crypto"
                          ? payout.currency
                          : "USD Balance"}{" "}
                        · {formatDate(payout.created_at)}
                      </span>
                    </div>
                    {payout.tx_hash && (
                      <Button variant="ghost" size="icon" className="size-8">
                        <ArrowUpRight className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

const TIER_COMMISSIONS = {
  standard: 0.1,
  silver: 0.15,
  gold: 0.2,
  platinum: 0.25,
};
