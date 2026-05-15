"use client";

import {
  Command,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  User,
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
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <Command className="h-5 w-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            KnotEngine
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/features"
            className="group relative text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Features
            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white transition-all group-hover:w-full" />
          </Link>
          <Link
            href="/pricing"
            className="group relative text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Pricing
            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white transition-all group-hover:w-full" />
          </Link>
          <Link
            href="/docs"
            className="group relative text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Docs
            <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white transition-all group-hover:w-full" />
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 text-zinc-400 hover:text-white"
                >
                  <Avatar className="h-7 w-7 border border-white/10">
                    <AvatarImage
                      src={user.image || ""}
                      alt={user.name || "User"}
                    />
                    <AvatarFallback className="bg-white/10 text-[10px] text-white">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.name || "Account"}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="mt-2 w-56 rounded-xl border-white/10 bg-[#0a0a0a]"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="p-4 font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-bold text-white">
                      {user.name || "Merchant Owner"}
                    </p>
                    <p className="text-xs leading-none text-zinc-500">
                      {user.email || ""}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer p-3 text-zinc-400 hover:text-white focus:text-white"
                >
                  <Link
                    href="/dashboard"
                    className="flex w-full items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer p-3 text-zinc-400 hover:text-white focus:text-white"
                >
                  <Link
                    href="/dashboard/settings"
                    className="flex w-full items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    Profile
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
            <Button
              className="h-9 rounded-lg bg-white px-5 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              asChild
            >
              <Link href="/login">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
