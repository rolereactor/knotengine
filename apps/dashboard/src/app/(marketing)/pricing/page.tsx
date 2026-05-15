"use client";

import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/month + 1.0%",
    description: "Perfect for testing and small-scale payments.",
    features: [
      "1.0% transaction fee",
      "60 invoices/min rate limit",
      "$5.00 welcome credit",
      "Basic analytics & CSV export",
      "Email notifications",
      "Community support",
    ],
    cta: "Get Started",
    href: "/register",
  },
  {
    name: "Professional",
    price: "$39",
    period: "/month + 0.5%",
    description: "For growing businesses processing regular payments.",
    features: [
      "0.5% transaction fee",
      "300 invoices/min rate limit",
      "Advanced analytics & reporting",
      "HMAC-SHA256 webhooks",
      "Priority support",
      "Custom checkout branding",
      "Remove KnotEngine branding",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/month + 0.25%",
    description: "For high-volume platforms and enterprise use cases.",
    features: [
      "0.25% transaction fee",
      "600 invoices/min rate limit",
      "Real-time analytics",
      "Dual-provider blockchain monitoring",
      "Dedicated support & SLA",
      "Custom integration",
      "On-premise deployment available",
    ],
    cta: "Contact Sales",
    href: "/register",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-[#050505] pt-16">
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-zinc-500">
              No hidden fees. Minimum $0.05 per transaction.
            </p>
          </div>

          <div className="mb-16 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-zinc-400">
              <span className="text-emerald-500">$5.00</span> welcome credit on
              signup. Refer a merchant and earn{" "}
              <span className="text-emerald-500">10%</span> commission on their
              top-ups.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`animate-in fade-in slide-in-from-bottom-4 relative rounded-2xl border p-8 transition-all duration-700 ${
                  plan.popular
                    ? "border-white/20 bg-white/[0.04]"
                    : "border-white/5 bg-white/[0.02] hover:border-white/10"
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1">
                    <span className="text-xs font-bold text-black">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm text-zinc-500">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {plan.description}
                  </p>
                </div>

                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-sm text-zinc-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full rounded-xl ${
                    plan.popular
                      ? "bg-white font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                      : "border-white/10 bg-white/5 font-bold text-white transition-all hover:bg-white/10"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={plan.href}>
                    {plan.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
