import {
  Shield,
  Zap,
  Globe,
  Wallet,
  Code,
  BarChart3,
  ArrowRight,
  Server,
  Lock,
  Repeat,
  Bell,
  Database,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const features = [
  {
    icon: Shield,
    title: 'Non-Custodial Architecture',
    description:
      'We never hold your private keys or funds. Every payment flows directly to your wallet via HD key derivation. You maintain complete sovereignty over your assets.',
    span: 'md:col-span-2',
  },
  {
    icon: Wallet,
    title: 'HD Wallet Derivation',
    description:
      'Generate a unique deposit address for every invoice using BIP-32/BIP-44 hierarchical deterministic key derivation. No address reuse, maximum privacy.',
  },
  {
    icon: Zap,
    title: 'Instant Settlement Detection',
    description:
      'Real-time monitoring of on-chain transactions with automatic confirmation detection. Get notified the moment a payment is received and confirmed.',
  },
  {
    icon: Globe,
    title: 'Multi-Chain Support',
    description:
      'Accept payments across Bitcoin, Litecoin, Ethereum, and Polygon. BTC, ETH, LTC, USDT and USDC — one integration.',
  },
  {
    icon: Code,
    title: 'Developer-First API',
    description:
      'RESTful API with x-api-key auth, HMAC-SHA256 signed webhooks, and Swagger docs at /docs. Integrate in minutes.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description:
      'Track payment volumes, success rates, and settlement times with built-in analytics and CSV export.',
    span: 'md:col-span-2',
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: 'HMAC-SHA256 Webhooks',
    description:
      'Every webhook is cryptographically signed. Verify authenticity before processing any event.',
  },
  {
    icon: Key,
    title: 'API Key Rotation',
    description:
      'Rotate API keys and webhook secrets without downtime. Previous keys remain valid during transition.',
  },
  {
    icon: Repeat,
    title: 'Automatic Retries',
    description:
      'Failed webhook deliveries are retried with exponential backoff. Track every attempt in delivery logs.',
  },
  {
    icon: Database,
    title: 'IP Allowlisting',
    description:
      'Restrict API access to specific IP addresses or CIDR ranges. Protect your merchant account.',
  },
  {
    icon: Bell,
    title: '2FA Protection',
    description:
      'TOTP-based two-factor authentication for dashboard access. Backup codes for account recovery.',
  },
  {
    icon: Server,
    title: 'Self-Hosted',
    description:
      'Run on your own infrastructure. Full data sovereignty, no third-party access to your payment data.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-[#050505] pt-16">
      {/* Hero */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
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
                className={`animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.04] ${feature.span || ''}`}
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
        </div>
      </section>

      {/* Security */}
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Security built in
            </h2>
            <p className="mt-4 text-zinc-500">
              Every layer designed to protect your funds and data.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {securityFeatures.map((feature, i) => (
              <div
                key={feature.title}
                className="animate-in fade-in slide-in-from-bottom-4 group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-700 hover:border-white/10 hover:bg-white/[0.04]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <feature.icon className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-white" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
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
      <section className="border-t border-white/5 py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Ready to build?
          </h2>
          <p className="mt-4 text-zinc-500">
            Start accepting crypto payments in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-11 rounded-md bg-white px-8 font-bold text-black transition-all hover:bg-zinc-200"
              asChild
            >
              <Link href="/pricing">
                Get Started Free
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
                href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                target="_blank"
              >
                Read the docs
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
