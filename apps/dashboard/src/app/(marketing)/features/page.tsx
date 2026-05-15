"use client";

import {
  Shield,
  Zap,
  Globe,
  Wallet,
  Code,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    icon: Shield,
    title: "Non-Custodial Architecture",
    description:
      "We never hold your private keys or funds. Every payment flows directly to your wallet via HD key derivation. You maintain complete sovereignty over your assets.",
  },
  {
    icon: Wallet,
    title: "HD Wallet Derivation",
    description:
      "Generate a unique deposit address for every invoice using BIP-32/BIP-44 hierarchical deterministic key derivation. No address reuse, maximum privacy.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Instant Settlement Detection",
    description:
      "Real-time monitoring of on-chain transactions with automatic confirmation detection. Get notified the moment a payment is received and confirmed.",
  },
  {
    icon: Globe,
    title: "Multi-Chain Support",
    description:
      "Accept payments across Bitcoin, Litecoin, Ethereum, and Polygon. BTC, ETH, LTC, USDT and USDC — one integration.",
  },
  {
    icon: Code,
    title: "Developer-First API",
    description:
      "RESTful API with x-api-key auth, HMAC-SHA256 signed webhooks, and Swagger docs at /docs. Integrate in minutes.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description:
      "Track payment volumes, success rates, and settlement times with built-in analytics and CSV export.",
    span: "md:col-span-2",
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-[#050505] pt-16">
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Everything you need to scale
            </h1>
            <p className="mt-4 text-lg text-zinc-500">
              Enterprise-grade infrastructure without the enterprise complexity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.04] ${feature.span || ""}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <feature.icon className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-white" />
                </div>
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button
              size="lg"
              className="h-12 rounded-xl bg-white px-8 font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200"
              asChild
            >
              <Link href="/register">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
