import {
  ArrowRight,
  ShieldCheck,
  Code,
  Zap,
  Server,
  Cloud,
} from "lucide-react";
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
              Self-host free · AGPL-3.0 · Cloud coming soon
            </span>
          </div>

          <h1 className="animate-in fade-in slide-in-from-bottom-4 mt-8 text-5xl leading-tight font-bold tracking-tight text-white delay-100 duration-700 md:text-7xl">
            Accept crypto payments.
            <br />
            <span className="bg-linear-to-r from-white to-zinc-500 bg-clip-text text-transparent">
              Your keys, your rules.
            </span>
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 delay-200 duration-700">
            Non-custodial payment infrastructure. Self-host on your own
            infrastructure or use our managed cloud. One API for Bitcoin,
            Ethereum, and stablecoins.
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-4 mt-10 flex flex-wrap items-center justify-center gap-4 delay-300 duration-700">
            <Button
              size="lg"
              className="h-11 rounded-md bg-white px-8 font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              asChild
            >
              <Link
                href="/pricing"
                className="flex items-center tracking-widest uppercase"
              >
                Launch Cloud
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 rounded-md border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
              asChild
            >
              <Link
                href="https://github.com/qodinger/knotengine"
                target="_blank"
                className="tracking-widest uppercase"
              >
                Download Local
              </Link>
            </Button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 mt-16 text-left delay-500 duration-700">
            <TerminalDemo />
          </div>

          <div className="animate-in fade-in mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500 delay-700 duration-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-zinc-400" />
              <span>Non-custodial</span>
            </div>
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-zinc-400" />
              <span>Open source</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-zinc-400" />
              <span>Live on mainnet</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products: Self-Host vs Cloud */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Choose how you run KnotEngine
            </h2>
            <p className="mt-4 text-zinc-500">
              Same codebase. Same features. You decide where it runs.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Self-Host */}
            <div className="group rounded-2xl border border-white/5 bg-white/2 p-10 transition-all hover:border-white/10 hover:bg-white/4">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Server className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-white" />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white">
                  KnotEngine Local
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                  Free
                </span>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                Run KnotEngine on your own hardware. Full control, full
                responsibility. No platform fees, no limits.
              </p>
              <ul className="mb-8 space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Unlimited
                  transactions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> All 7 currencies
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Full API &
                  dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Community support
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full rounded-md border-white/10 bg-white/5 font-bold text-white transition-all hover:bg-white/10"
                asChild
              >
                <Link
                  href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                  target="_blank"
                >
                  Download Local
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Cloud */}
            <div className="group rounded-2xl border border-white/10 bg-white/4 p-10 transition-all hover:border-white/20">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Cloud className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-white" />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white">
                  KnotEngine Cloud
                </h3>
                <span className="rounded-full bg-zinc-500/20 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                  Coming Soon
                </span>
              </div>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                Managed infrastructure. We handle servers, backups, and scaling.
                You handle payments.
              </p>
              <ul className="mb-8 space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Zero server
                  maintenance
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Auto-scaling &
                  backups
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Custom domains & SSL
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Priority support
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full rounded-md border-white/10 bg-white/5 font-bold text-zinc-500 transition-all hover:bg-white/10 hover:text-white"
                disabled
              >
                Join waitlist
              </Button>
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
                className={`animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-white/5 bg-white/2 p-8 transition-all duration-700 hover:border-white/10 hover:bg-white/4 ${feature.className || ""}`}
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

      {/* How it works */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Get started in minutes
            </h2>
            <p className="mt-4 text-zinc-500">
              Three steps to accept your first crypto payment.
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                step: "1",
                title: "Deploy KnotEngine",
                description:
                  "Self-host with one command or sign up for Cloud. Configure your wallet addresses and API keys.",
                action: "curl -fsSL install.sh | bash",
              },
              {
                step: "2",
                title: "Create an invoice",
                description:
                  "Use the SDK to create an invoice. Redirect your customer to the hosted checkout page.",
                action: "knot.createInvoice({ amount_usd: 49.99 })",
              },
              {
                step: "3",
                title: "Receive payment",
                description:
                  "Customer pays on-chain. KnotEngine detects the transaction and sends you a webhook. Fulfill the order.",
                action: 'event === "invoice.confirmed"',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="animate-in fade-in slide-in-from-bottom-4 flex gap-6"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-white">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.description}
                  </p>
                  <code className="mt-2 inline-block rounded-md bg-white/5 px-3 py-1.5 font-mono text-xs text-zinc-400">
                    {item.action}
                  </code>
                </div>
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
            Ready to accept crypto?
          </h2>
          <p className="animate-in fade-in mt-4 text-zinc-500 delay-100">
            Open source. Non-custodial. One API for all chains.
          </p>
          <div className="animate-in fade-in mt-8 flex flex-wrap items-center justify-center gap-4 delay-200">
            <Button
              size="lg"
              className="h-11 rounded-md bg-white px-8 font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200"
              asChild
            >
              <Link
                href="/pricing"
                className="flex items-center tracking-widest uppercase"
              >
                Launch Cloud
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 rounded-md border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
              asChild
            >
              <Link
                href="https://github.com/qodinger/knotengine"
                target="_blank"
                className="tracking-widest uppercase"
              >
                Download Local
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
