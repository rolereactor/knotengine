"use client";

import {
  Command,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Github,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MarketingHeaderProps = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
};

export function MarketingHeader({ user }: MarketingHeaderProps) {
  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <Command className="h-4 w-4 text-black" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              KnotEngine
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                Products
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 w-56 rounded-xl border-white/10 bg-[#0a0a0a]">
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link href="/" className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">
                      KnotEngine Local
                    </span>
                    <span className="text-xs text-zinc-500">
                      Open-source, run on your own hardware
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link href="/pricing" className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">
                      KnotEngine Cloud
                    </span>
                    <span className="text-xs text-zinc-500">
                      The full power of KnotEngine from anywhere
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-2 bg-white/5" />
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link href="/docs" className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">
                      KnotEngine API
                    </span>
                    <span className="text-xs text-zinc-500">
                      Turn payments into production endpoints
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link href="/pricing" className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">
                      KnotEngine Enterprise
                    </span>
                    <span className="text-xs text-zinc-500">
                      Enterprise-grade infrastructure for your organization
                    </span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/features"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Pricing
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
                Resources
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="mt-2 w-56 rounded-xl border-white/10 bg-[#0a0a0a]">
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link
                    href="https://github.com/qodinger/knotengine?tab=readme-ov-file#-self-hosting"
                    target="_blank"
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-zinc-400">Documentation</span>
                    <ArrowUpRight className="h-3 w-3 text-zinc-600" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link
                    href="https://github.com/qodinger/knotengine"
                    target="_blank"
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-zinc-400">GitHub</span>
                    <ArrowUpRight className="h-3 w-3 text-zinc-600" />
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link
                    href="https://github.com/qodinger/knotengine/releases"
                    target="_blank"
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-zinc-400">Changelog</span>
                    <ArrowUpRight className="h-3 w-3 text-zinc-600" />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="https://github.com/qodinger/knotengine"
            target="_blank"
            className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">GitHub</span>
          </Link>

          {/* Separator between GitHub and account */}
          <div className="hidden h-4 w-px bg-white/10 lg:block" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 pr-3 text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback className="bg-white/15 text-[9px] font-semibold text-white">
                      {user.name
                        ?.split(" ")
                        .slice(0, 2)
                        .map((n) => n[0]?.toUpperCase())
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                    {user.name || "Account"}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="mt-2 w-56 rounded-xl border-white/10 bg-[#0a0a0a]"
                align="end"
              >
                <DropdownMenuLabel className="p-4 font-normal">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage
                        src={user.image || ""}
                        alt={user.name || ""}
                      />
                      <AvatarFallback className="bg-white/15 text-xs font-semibold text-white">
                        {user.name
                          ?.split(" ")
                          .slice(0, 2)
                          .map((n) => n[0]?.toUpperCase())
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-sm font-semibold text-white">
                        {user.name || "Merchant Owner"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {user.email || ""}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer p-3 text-zinc-400 hover:text-white focus:text-white"
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  className="cursor-pointer p-3 text-zinc-400 hover:text-red-400 focus:text-red-400"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-bold tracking-widest text-zinc-400 transition-colors hover:text-white"
                asChild
              >
                <Link
                  href="https://github.com/qodinger/knotengine"
                  target="_blank"
                >
                  DOWNLOAD LOCAL
                </Link>
              </Button>
              <Button
                size="sm"
                className="h-9 rounded-full bg-white px-5 text-xs font-bold tracking-widest text-black transition-all hover:bg-zinc-200"
                asChild
              >
                <Link href="/dashboard">LAUNCH CLOUD</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
