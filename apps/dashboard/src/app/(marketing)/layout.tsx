import { Command, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { MarketingHeader } from '@/components/marketing-header';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader user={user} />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/5 bg-[#050505]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                  <Command className="h-4 w-4 text-black" />
                </div>
                <span className="text-base font-bold text-white">
                  KnotEngine
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-600">
                Non-custodial crypto payment infrastructure. Self-host or use
                our managed cloud.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                Products
              </h4>
              <div className="flex flex-col gap-3">
                <Link
                  href="/"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Self-Host
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Cloud
                </Link>
                <Link
                  href="/features"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Pricing
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                Resources
              </h4>
              <div className="flex flex-col gap-3">
                <Link
                  href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                  target="_blank"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Documentation
                </Link>
                <Link
                  href="https://github.com/qodinger/knotengine"
                  target="_blank"
                  className="group flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  GitHub
                  <ArrowUpRight className="h-3 w-3 text-zinc-700 transition-colors group-hover:text-zinc-500" />
                </Link>
                <Link
                  href="https://github.com/qodinger/knotengine/releases"
                  target="_blank"
                  className="group flex items-center gap-1 text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Changelog
                  <ArrowUpRight className="h-3 w-3 text-zinc-700 transition-colors group-hover:text-zinc-500" />
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Dashboard
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                Legal
              </h4>
              <div className="flex flex-col gap-3">
                <Link
                  href="/privacy"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t border-white/5 pt-6">
            <p className="text-center text-xs text-zinc-700">
              &copy; {new Date().getFullYear()} KnotEngine. AGPL-3.0 License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
