"use client";

import {
  Copy,
  Check,
  TrendingUp,
  ShieldCheck,
  Zap,
  Gift,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AffiliatesHeader } from "./components/affiliates-header";
import { cn } from "@/lib/utils";

export default function AffiliatesPage() {
  const { data: session, status } = useSession();
  const [copied, setCopied] = useState(false);

  const isLoading = status === "loading";

  const affiliateCode = session?.user?.referralCode;
  const affiliateEarningsUsd = session?.user?.referralEarningsUsd || 0;

  const affiliateLink = affiliateCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${affiliateCode}`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=...`;

  const copyToClipboard = () => {
    if (!affiliateCode) return;
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = {
    totalAffiliates: null as number | null, // tracked server-side, not yet exposed via API
    activeMerchants: null as number | null,
    totalEarned: affiliateEarningsUsd,
    potentialEarnings: affiliateEarningsUsd * 2 || 100.0,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <AffiliatesHeader />

      <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
        {/* Main Stat - Hero Card (Full Width) */}
        <Card className="relative overflow-hidden border-emerald-500/20 bg-linear-to-br from-emerald-500/10 to-transparent">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-[10px] font-bold tracking-widest text-emerald-500/70 uppercase">
                  Total Earned
                </CardDescription>
                <CardTitle className="mt-2 text-4xl font-black tracking-tighter text-white">
                  ${stats.totalEarned.toFixed(2)}
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
                ↗ Lifetime
              </span>
              <span className="text-muted-foreground text-xs">
                Paid directly to your credit balance
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Stats - Compact 3-Column Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="group relative overflow-hidden border-white/5 bg-zinc-900/50 p-3 sm:p-4">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <p className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
                Affiliates
              </p>
              <p className="mt-1 text-2xl font-bold text-white">
                {stats.totalAffiliates ?? "–"}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[10px] font-medium">
                {stats.activeMerchants != null
                  ? `${stats.activeMerchants} active`
                  : "–"}
              </p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-white/5 bg-zinc-900/50 p-3 sm:p-4">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <p className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
                Commission
              </p>
              <p className="mt-1 text-2xl font-bold text-white">10%</p>
              <p className="text-muted-foreground mt-0.5 text-[10px] font-medium">
                Per top-up
              </p>
            </div>
          </Card>

          <Card className="group relative overflow-hidden border-white/5 bg-zinc-900/50 p-3 sm:p-4">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <p className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
                Avg Payout
              </p>
              <p className="mt-1 text-2xl font-bold text-white">$100</p>
              <p className="text-muted-foreground mt-0.5 text-[10px] font-medium">
                Per referral
              </p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                    Share this with other business owners.
                  </CardDescription>
                </div>
              </div>
              {/* Affiliate incentive highlight */}
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
                  disabled={isLoading || !affiliateCode}
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
                      payouts are logged in your balance history.
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
                      Your credit balance updates automatically the moment your
                      affiliate performs a top-up.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col border-white/5 bg-zinc-900/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">
                How the Affiliate Program Works
              </CardTitle>
              <CardDescription className="text-xs">
                A simple 3-step commission engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    text: "Share your unique affiliate link with a merchant or business owner.",
                  },
                  {
                    step: "2",
                    text: "They register and get $10 credit (double the standard $5) — then perform a Stablecoin top-up.",
                  },
                  {
                    step: "3",
                    text: "You receive 10% of their deposit as credit — tracked and paid forever.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-white/2"
                  >
                    <div className="bg-primary/10 border-primary/20 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-black shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                      {item.step}
                    </div>
                    <p className="pt-1.5 text-xs leading-relaxed font-semibold text-white/60">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-primary/5 border-primary/10 group relative overflow-hidden rounded-2xl border p-6">
                <div className="from-primary/10 absolute inset-0 bg-linear-to-r to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <h4 className="text-primary mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] uppercase">
                  <Zap className="fill-primary size-3" />
                  Commission Example
                </h4>
                <p className="text-muted-foreground text-xs leading-relaxed antialiased">
                  Your affiliate signs up and gets{" "}
                  <span className="font-bold text-white">$10 credit</span>{" "}
                  (instead of the normal $5). When they top up{" "}
                  <span className="font-bold text-white">$1,000 USDT</span>,{" "}
                  <span className="font-bold text-emerald-500">
                    you instantly receive $100
                  </span>
                  . Refer 10 merchants and your processing fees stay free
                  forever.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-4">
              <Button
                variant="link"
                className="gap-2 px-0 text-[10px] font-bold tracking-widest text-zinc-500 uppercase transition-colors hover:text-white"
              >
                View Affiliate Agreement <ArrowUpRight className="size-3" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
