import { Command } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { MarketingHeader } from "@/components/marketing-header";

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
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Command className="h-5 w-5 text-white" />
                <span className="font-bold text-white">KnotEngine</span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-600">
                Non-custodial payment infrastructure for modern commerce.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Product
              </h4>
              <div className="flex flex-col gap-2">
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
                <Link
                  href="/docs"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Docs
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Resources
              </h4>
              <div className="flex flex-col gap-2">
                <Link
                  href="/docs"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  API Reference
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-zinc-600 transition-colors hover:text-white"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Legal
              </h4>
              <div className="flex flex-col gap-2">
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
              &copy; {new Date().getFullYear()} KnotEngine. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
