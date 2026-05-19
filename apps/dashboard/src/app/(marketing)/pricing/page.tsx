import { Check, ArrowRight, Server, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="bg-[#050505] pt-16">
      {/* Hero */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-zinc-500">
              Self-host for free. Use Cloud when you&apos;re ready to scale.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {/* Self-Host */}
            <div className="animate-in fade-in slide-in-from-bottom-4 relative flex flex-col rounded-2xl border border-emerald-500/20 bg-white/[0.02] p-8 transition-all duration-700">
              <div className="mb-2 flex items-center gap-2">
                <Server className="h-5 w-5 text-emerald-500" />
                <h3 className="text-xl font-semibold text-white">Self-Host</h3>
              </div>
              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">Free</span>
              </div>
              <p className="mb-6 text-sm text-zinc-500">
                Run KnotEngine on your own infrastructure. Full features, no
                limits.
              </p>

              <ul className="mb-8 space-y-3">
                {[
                  'Unlimited transactions',
                  'All 7 currencies (BTC, ETH, LTC, USDT, USDC)',
                  'Full API & Dashboard',
                  'Webhook delivery with retries',
                  'Analytics & reporting',
                  'Community support',
                  'AGPL-3.0 license',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm text-zinc-400">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-auto w-full rounded-md bg-white font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200"
                asChild
              >
                <Link
                  href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                  target="_blank"
                >
                  Deploy yourself
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Cloud */}
            <div className="animate-in fade-in slide-in-from-bottom-4 relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-8 transition-all delay-100 duration-700">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-500/20 px-4 py-1">
                <span className="text-xs font-bold text-zinc-400">
                  Coming Soon
                </span>
              </div>

              <div className="mb-2 flex items-center gap-2">
                <Cloud className="h-5 w-5 text-zinc-400" />
                <h3 className="text-xl font-semibold text-white">
                  KnotEngine Cloud
                </h3>
              </div>
              <div className="mb-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-400">TBD</span>
              </div>
              <p className="mb-6 text-sm text-zinc-500">
                Managed infrastructure. We handle servers, backups, and scaling
                so you can focus on payments.
              </p>

              <ul className="mb-8 space-y-3">
                {[
                  'Everything in Self-Host',
                  'Zero server maintenance',
                  'Managed backups & updates',
                  'Custom domains with auto-SSL',
                  'Team collaboration (RBAC)',
                  'Priority support',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                    <span className="text-sm text-zinc-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="mt-auto w-full rounded-md border-white/10 bg-white/5 font-bold text-zinc-500 transition-all hover:bg-white/10 hover:text-white"
                disabled
              >
                Join waitlist
              </Button>
            </div>
          </div>

          {/* Self-host note */}
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-zinc-400">
              <span className="font-medium text-white">Note:</span> Self-hosting
              is completely free. You only pay for your own infrastructure (VPS,
              MongoDB, Redis). KnotEngine charges zero platform fees when
              self-hosted.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">
            Frequently asked questions
          </h2>

          <div className="space-y-8">
            {[
              {
                q: 'Is self-hosting really free?',
                a: 'Yes. KnotEngine is open-source under AGPL-3.0. You can run it on your own infrastructure with no platform fees. You only pay for your VPS and infrastructure costs.',
              },
              {
                q: "What's the difference between Self-Host and Cloud?",
                a: 'Same codebase, same features. Self-host means you manage the servers. Cloud means we manage everything — servers, backups, scaling, SSL, and updates.',
              },
              {
                q: 'Can I migrate from Self-Host to Cloud later?',
                a: "Yes. Since it's the same codebase, migration is straightforward. We'll provide migration tools when Cloud launches.",
              },
              {
                q: 'Do you take a cut of my transactions?',
                a: "No. When self-hosting, you keep 100% of your revenue. KnotEngine charges zero platform fees. You set your own fee structure if you're offering payment services to others.",
              },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="text-base font-semibold text-white">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
