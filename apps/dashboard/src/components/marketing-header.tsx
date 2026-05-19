'use client';

import {
  Command,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Github,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
                      KnotEngine Self-Host
                    </span>
                    <span className="text-xs text-zinc-500">
                      Open-source, run on your own infrastructure
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer p-3">
                  <Link href="/pricing" className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-white">
                      KnotEngine Cloud
                    </span>
                    <span className="text-xs text-zinc-500">
                      Managed infrastructure, coming soon
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
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 gap-2 text-zinc-400 hover:text-white lg:flex"
            asChild
          >
            <Link href="https://github.com/qodinger/knotengine" target="_blank">
              <Github className="h-4 w-4" />
              GitHub
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 text-zinc-400 hover:text-white"
                >
                  <Avatar className="h-7 w-7 border border-white/10">
                    <AvatarImage src={user.image || ''} alt={user.name || ''} />
                    <AvatarFallback className="bg-white/10 text-[10px] text-white">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.name || 'Account'}
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
                      {user.name || 'Merchant Owner'}
                    </p>
                    <p className="text-xs leading-none text-zinc-500">
                      {user.email || ''}
                    </p>
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
                  onClick={() => signOut({ callbackUrl: '/' })}
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
                className="h-8 text-sm font-medium text-zinc-400 hover:text-white"
                asChild
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-md bg-white px-4 text-sm font-bold text-black transition-all hover:bg-zinc-200"
                asChild
              >
                <Link href="/dashboard">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
