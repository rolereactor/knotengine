import { ArrowRight, ShieldCheck, Code, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TerminalDemo } from "@/components/terminal-demo";

const features = [
  {
    icon: Zap,
    title: "One API, any chain",
    description:
      "Single integration for Bitcoin, Litecoin, Ethereum and Polygon. Accept BTC, ETH, LTC, USDT and USDC without changing a line of code.",
    className: "md:col-span-2 md:row-span-1",
  },
  {
    icon: ShieldCheck,
    title: "Non-custodial by design",
    description:
      "We never hold your keys. Every payment flows directly to your wallet via HD key derivation. Zero counterparty risk.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Code,
    title: "Webhook notifications",
    description:
      "Signed webhook delivery with automatic retries. Track every payment lifecycle event in real-time.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    title: "Per-invoice deposit addresses",
    description:
      "Unique BIP-44 derived address for every invoice. No address reuse. Maximum privacy for you and your customers.",
    className: "md:col-span-1 md:row-span-1",
    icon: ArrowRight,
  },
  {
    title: "Real-time detection",
    description:
      "On-chain payment detection in under 3 seconds. Dual-provider monitoring with automatic failover between Tatum and Alchemy.",
    className: "md:col-span-1 md:row-span-1",
    icon: Zap,
  },
];

export default function MarketingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-[#050505] pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/2 blur-3xl" />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-20 text-center">
          <div className="animate-in fade-in slide-in-from-bottom-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 duration-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-zinc-400">
              Live on mainnet
            </span>
          </div>

          <h1 className="animate-in fade-in slide-in-from-bottom-4 mt-8 text-5xl leading-tight font-bold tracking-tight text-white delay-100 duration-700 md:text-6xl">
            Accept crypto payments.
            <br />
            <span className="bg-linear-to-r from-white to-zinc-500 bg-clip-text text-transparent">
              Non-custodial.
            </span>
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-lg text-lg leading-relaxed text-zinc-500 delay-200 duration-700">
            One API. 7 currencies. 4 chains. Zero counterparty risk.
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 flex flex-wrap items-center justify-center gap-4 delay-300 duration-700">
            <Button
              size="lg"
              className="h-10 rounded-md bg-white px-8 font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              asChild
            >
              <Link href="/dashboard">
                Start accepting payments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-10 rounded-md border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
              asChild
            >
              <Link href="/docs">Read the docs</Link>
            </Button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 mt-16 text-left delay-500 duration-700">
            <TerminalDemo />
          </div>

          <div className="animate-in fade-in mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500 delay-700 duration-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              <span>Non-custodial</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-zinc-400" />
              <span>Open source (AGPL-3.0)</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-zinc-400" />
              <span>Live on mainnet</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Features */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Infrastructure, not middleware
            </h2>
            <p className="mt-4 text-zinc-500">
              Everything you need, nothing you don&apos;t.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-white/5 bg-white/2 p-8 transition-all duration-700 hover:border-white/10 hover:bg-white/4 ${
                  feature.className || ""
                }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {feature.icon && (
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <feature.icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-white" />
                  </div>
                )}
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/5 bg-[#050505] py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="animate-in fade-in text-3xl font-bold tracking-tight text-white">
            Ready to ship?
          </h2>
          <p className="animate-in fade-in mt-4 text-zinc-500 delay-100">
            One API. 7 currencies. Zero custody.
          </p>
          <div className="animate-in fade-in mt-8 delay-200">
            <Button
              size="lg"
              className="h-10 rounded-md bg-white px-8 font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              asChild
            >
              <Link href="/dashboard">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
