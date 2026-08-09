import {
  ArrowRight,
  ShieldCheck,
  Code,
  Zap,
  Server,
  Cloud,
  Key,
  Radio,
  LinkIcon,
  DollarSign,
  FileText,
  Send,
  Palette,
  Users,
  Github,
  Lock,
  ShoppingCart,
  Store,
  Globe,
  ChevronDown,
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
    icon: Key,
  },
  {
    title: "Real-time detection",
    description:
      "On-chain payment detection in under 3 seconds. Dual-provider monitoring with automatic failover between Tatum and Alchemy.",
    className: "md:col-span-1 md:row-span-1",
    icon: Radio,
  },
];

const products = [
  {
    icon: LinkIcon,
    title: "Payment Links",
    description: "Shareable crypto payment URLs. One-time or recurring.",
    color: "text-emerald-500",
    href: "/dashboard/links",
  },
  {
    icon: DollarSign,
    title: "Donations",
    description:
      "Accept crypto donations with goal tracking and streaming alerts.",
    color: "text-pink-500",
    href: "/dashboard/donations",
  },
  {
    icon: FileText,
    title: "Invoices",
    description: "Create and send crypto invoices with automatic conversion.",
    color: "text-indigo-500",
    href: "/dashboard/payments",
  },
  {
    icon: Send,
    title: "Mass Payouts",
    description: "Batch send crypto to multiple recipients at once.",
    color: "text-amber-500",
    href: "/dashboard/solutions",
  },
  {
    icon: Palette,
    title: "White Label",
    description: "Custom domains, CSS, and embeddable checkout.",
    color: "text-cyan-500",
    href: "/dashboard/white-label",
  },
  {
    icon: Users,
    title: "Affiliates",
    description: "Tiered commission program. Earn up to 25% on referrals.",
    color: "text-teal-500",
    href: "/dashboard/affiliates",
  },
];

const faqs = [
  {
    question: "Is it really free?",
    answer:
      "Yes. The software is open-source under AGPL-3.0. Self-host it on your own infrastructure with zero platform fees. You only pay your server costs.",
  },
  {
    question: "How do I self-host KnotEngine?",
    answer:
      "Clone the repo, configure your wallet addresses and API keys, then run one command. Full setup takes about 10 minutes. See our docs for step-by-step instructions.",
  },
  {
    question: "What currencies are supported?",
    answer:
      "Bitcoin (BTC), Litecoin (LTC), Ethereum (ETH), USDT on Ethereum and Polygon, and USDC on Ethereum. We add new currencies based on community demand.",
  },
  {
    question: "Is it secure?",
    answer:
      "KnotEngine never holds your funds. Every payment flows directly to your wallet via HD key derivation. No counterparty risk. The code is fully auditable.",
  },
  {
    question: "What's the difference between self-hosting and Cloud?",
    answer:
      "Self-hosting is free and gives you full control. Cloud (coming soon) is managed — we handle servers, backups, and scaling. Same features, different deployment.",
  },
  {
    question: "Do I need to be a developer?",
    answer:
      "Basic technical skills help for self-hosting. Once set up, the dashboard is beginner-friendly. Payment Links require zero coding.",
  },
];

const industries = [
  { name: "E-commerce", icon: ShoppingCart },
  { name: "SaaS", icon: Globe },
  { name: "Non-Profit", icon: Users },
  { name: "Creators", icon: DollarSign },
  { name: "Gaming", icon: Zap },
  { name: "Marketplaces", icon: Store },
  { name: "Freelance", icon: FileText },
  { name: "Education", icon: Globe },
  { name: "Other", icon: Globe },
];

const coins = [
  { name: "Bitcoin", symbol: "BTC", color: "#F7931A" },
  { name: "Ethereum", symbol: "ETH", color: "#627EEA" },
  { name: "Litecoin", symbol: "LTC", color: "#BFBBBB" },
  { name: "USDT", symbol: "USDT", color: "#26A17B" },
  { name: "USDC", symbol: "USDC", color: "#2775CA" },
  { name: "Polygon", symbol: "MATIC", color: "#8247E5" },
];

const donationPlatforms = [
  { name: "Twitch", icon: Globe },
  { name: "YouTube", icon: Globe },
  { name: "Twitter", icon: Globe },
  { name: "Discord", icon: Globe },
  { name: "Custom Website", icon: Code },
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
              Open-source · Non-custodial · 0% platform fees
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
                href="/register"
                className="flex items-center tracking-widest uppercase"
              >
                Get Started
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
                className="flex items-center gap-2 tracking-widest uppercase"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </Link>
            </Button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 mt-16 text-left delay-500 duration-700">
            <TerminalDemo />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/5 bg-[#050505] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "7", label: "Cryptocurrencies" },
              { value: "<3s", label: "Payment Detection" },
              { value: "0%", label: "Platform Fees" },
              { value: "100%", label: "Open Source" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold tracking-tight text-white">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
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
                  "Clone the repo, configure your wallet addresses and API keys. One command to start.",
                action: "git clone https://github.com/qodinger/knotengine",
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

      {/* Products Suite */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Everything you need to accept crypto
            </h2>
            <p className="mt-4 text-zinc-500">
              From payment links to mass payouts. One dashboard, full control.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <Link
                key={product.title}
                href={product.href}
                className="animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-white/5 bg-white/2 p-6 transition-all duration-500 hover:border-white/10 hover:bg-white/4"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <product.icon className={`h-5 w-5 ${product.color}`} />
                </div>
                <h3 className="mb-1 text-base font-semibold text-white transition-colors group-hover:text-emerald-400">
                  {product.title}
                </h3>
                <p className="text-sm text-zinc-500">{product.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Targeting */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Built for every business
            </h2>
            <p className="mt-4 text-zinc-500">
              Whether you&apos;re a startup or enterprise, KnotEngine scales
              with you.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-5 py-2.5 transition-colors hover:border-white/10 hover:bg-white/10"
              >
                <industry.icon className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-white">
                  {industry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Coins */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Accept 6+ cryptocurrencies
            </h2>
            <p className="mt-4 text-zinc-500">
              Bitcoin, Ethereum, Litecoin, and stablecoins. All in one
              integration.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {coins.map((coin) => (
              <div
                key={coin.symbol}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-6 py-4 transition-all hover:border-white/10 hover:bg-white/4"
              >
                <div
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: coin.color }}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {coin.name}
                  </div>
                  <div className="text-xs text-zinc-500">{coin.symbol}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-500">
              Plus Polygon, and more coins added based on community demand.
            </p>
          </div>
        </div>
      </section>

      {/* Donation Integrations */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Accept donations anywhere
            </h2>
            <p className="mt-4 text-zinc-500">
              Twitch, YouTube, Twitter, or your own website. Accept crypto
              donations from your audience.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {donationPlatforms.map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 px-6 py-4 transition-all hover:border-white/10 hover:bg-white/4"
              >
                <platform.icon className="h-5 w-5 text-pink-500" />
                <span className="text-sm font-medium text-white">
                  {platform.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/dashboard/donations"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Learn more about Donations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Infrastructure Features */}
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

      {/* Open Source Section */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Github className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Transparent by design
                </h2>
              </div>
              <p className="text-lg leading-relaxed text-zinc-400">
                Every line of code is auditable. No black boxes, no hidden fees,
                no counterparty risk. Verify everything.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="https://github.com/qodinger/knotengine"
                  target="_blank"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Github className="h-4 w-4" />
                  Star on GitHub
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Code className="h-4 w-4" />
                  Read the Docs
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Lock,
                  label: "AGPL-3.0",
                  desc: "Free forever. Fork it, deploy it, own it.",
                },
                {
                  icon: Code,
                  label: "Full source code",
                  desc: "Inspect every function, every transaction path.",
                },
                {
                  icon: ShieldCheck,
                  label: "Self-hosted",
                  desc: "Run on your own servers. Your data never leaves you.",
                },
                {
                  icon: Users,
                  label: "Community-driven",
                  desc: "Built by developers, for developers.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/5 bg-white/2 p-6 transition-colors hover:border-white/10"
                >
                  <item.icon className="mb-3 h-5 w-5 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-white">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Self-Host vs Cloud */}
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
            <div className="group rounded-2xl border border-white/5 bg-white/2 p-10 transition-all hover:border-white/10 hover:bg-white/4">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Server className="h-6 w-6 text-zinc-400 transition-colors group-hover:text-white" />
              </div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white">Self-Host</h3>
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
                  href="https://github.com/qodinger/knotengine"
                  target="_blank"
                  className="flex items-center justify-center"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Clone & Deploy
                </Link>
              </Button>
            </div>

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

      {/* Pricing */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-zinc-500">
              No hidden fees. No surprises. Pay only for what you use.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
              <div className="mb-4 text-sm font-bold tracking-widest text-emerald-500 uppercase">
                Self-Host
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-zinc-500"> / forever</span>
              </div>
              <p className="mb-6 text-sm text-zinc-400">
                Open-source. Run on your own infrastructure. Zero platform fees.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Unlimited
                  transactions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> All features
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Community support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Full API access
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="mb-4 text-sm font-bold tracking-widest text-zinc-400 uppercase">
                Cloud
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold text-white">TBD</span>
                <span className="text-zinc-500"> / month</span>
              </div>
              <p className="mb-6 text-sm text-zinc-400">
                Managed hosting. We handle everything. Just accept payments.
              </p>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Zero server
                  management
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Auto-scaling
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Priority support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-zinc-600">○</span> Custom domains
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* E-commerce Integrations */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Works with your favorite platforms
            </h2>
            <p className="mt-4 text-zinc-500">
              Integrate KnotEngine with WooCommerce, Shopify, and more.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {[
              { name: "WooCommerce", icon: ShoppingCart },
              { name: "Shopify", icon: Store },
              { name: "Magento", icon: Globe },
              { name: "Drupal", icon: Globe },
              { name: "Custom API", icon: Code },
              { name: "REST API", icon: Zap },
            ].map((platform) => (
              <div
                key={platform.name}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 p-4 transition-colors hover:border-white/10"
              >
                <platform.icon className="h-5 w-5 text-zinc-400" />
                <span className="text-sm font-medium text-white">
                  {platform.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              View all integrations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 bg-[#050505] py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-zinc-500">
              Everything you need to know about KnotEngine.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-2xl border border-white/5 bg-white/2"
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 text-sm font-semibold text-white">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-sm leading-relaxed text-zinc-400">
                  {faq.answer}
                </div>
              </details>
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
                href="/register"
                className="flex items-center tracking-widest uppercase"
              >
                Get Started
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
                className="flex items-center gap-2 tracking-widest uppercase"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
