"use client";

import { useRouter } from "next/navigation";
import {
  Link2,
  Heart,
  Users,
  Paintbrush,
  Send,
  ArrowRightLeft,
  ShoppingCart,
  CreditCard,
  Globe,
  Webhook,
  Shield,
  Zap,
  Clock,
  DollarSign,
  ExternalLink,
  Lock,
  Layers,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Solution {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  status: "live" | "coming_soon";
  category: "payments" | "growth" | "developer" | "enterprise";
  href?: string;
  features: string[];
}

const solutions: Solution[] = [
  {
    id: "payment-links",
    title: "Payment Links",
    description:
      "Create reusable payment links to accept crypto payments anywhere. Share via email, social, or embed in your site.",
    icon: Link2,
    color: "#10b981",
    status: "live",
    category: "payments",
    href: "/dashboard/links",
    features: [
      "One-click creation",
      "Custom amounts",
      "QR codes",
      "Usage tracking",
      "No coding required",
    ],
  },
  {
    id: "donations",
    title: "Donation Pages",
    description:
      "Accept crypto donations with goal tracking, progress bars, and suggested amounts. Perfect for creators and causes.",
    icon: Heart,
    color: "#ec4899",
    status: "live",
    category: "payments",
    href: "/dashboard/donations",
    features: [
      "Fundraising goals",
      "Progress bars",
      "Suggested amounts",
      "Thank you messages",
      "Donor counting",
    ],
  },
  {
    id: "invoices",
    title: "Invoices",
    description:
      "Create and send professional crypto invoices with automatic conversion and multi-currency support.",
    icon: CreditCard,
    color: "#6366f1",
    status: "live",
    category: "payments",
    href: "/dashboard/payments",
    features: [
      "Multi-currency",
      "Auto conversion",
      "Email delivery",
      "Webhook notifications",
      "Payment tracking",
    ],
  },
  {
    id: "mass-payouts",
    title: "Mass Payouts",
    description:
      "Batch send crypto to multiple recipients. Import from CSV, estimate fees, and track delivery status.",
    icon: Send,
    color: "#f59e0b",
    status: "coming_soon",
    category: "payments",
    features: [
      "CSV import",
      "Batch processing",
      "Fee estimation",
      "Recipient management",
      "Delivery tracking",
    ],
  },
  {
    id: "exchange",
    title: "Crypto Exchange",
    description:
      "Swap between cryptocurrencies at the best rates. Cross-currency invoices and automatic conversion.",
    icon: ArrowRightLeft,
    color: "#8b5cf6",
    status: "coming_soon",
    category: "payments",
    features: [
      "Best rate quotes",
      "Cross-currency invoices",
      "DEX integration",
      "Instant swaps",
      "Rate locking",
    ],
  },
  {
    id: "white-label",
    title: "White Label",
    description:
      "Custom branding, domains, and checkout experience. Remove KnotEngine branding and make it yours.",
    icon: Paintbrush,
    color: "#06b6d4",
    status: "coming_soon",
    category: "enterprise",
    features: [
      "Custom domains",
      "Custom CSS",
      "Logo & colors",
      "Embeddable checkout",
      "No branding",
    ],
  },
  {
    id: "affiliates",
    title: "Affiliate Program",
    description:
      "Grow your network with tiered commissions. Track referrals, manage payouts, and reward top partners.",
    icon: Users,
    color: "#14b8a6",
    status: "live",
    category: "growth",
    href: "/dashboard/affiliates",
    features: [
      "Tiered commissions",
      "Referral tracking",
      "Payout requests",
      "Performance stats",
      "Promo materials",
    ],
  },
  {
    id: "woocommerce",
    title: "WooCommerce Plugin",
    description:
      "Accept crypto payments in your WordPress store. Easy setup with full WooCommerce integration.",
    icon: ShoppingCart,
    color: "#9333ea",
    status: "coming_soon",
    category: "developer",
    features: [
      "WordPress integration",
      "One-click install",
      "Order management",
      "Automatic webhooks",
      "Multi-currency",
    ],
  },
  {
    id: "shopify",
    title: "Shopify App",
    description:
      "Add crypto payments to your Shopify store. Seamless checkout experience for your customers.",
    icon: Globe,
    color: "#059669",
    status: "coming_soon",
    category: "developer",
    features: [
      "Shopify checkout",
      "App Bridge integration",
      "Order syncing",
      "Webhook support",
      "Multi-currency",
    ],
  },
];

export default function SolutionsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solutions</h1>
        <p className="text-muted-foreground">
          Explore all KnotEngine payment tools and features
        </p>
      </div>

      {/* Hero Banner */}
      <Card className="relative overflow-hidden border-zinc-700 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <h2 className="mb-2 text-2xl font-bold text-white">
                Non-Custodial Crypto Payments
              </h2>
              <p className="mb-4 max-w-xl text-zinc-400">
                Merchants receive crypto directly to their own wallets. The
                platform never holds your funds. Built for trust, designed for
                simplicity.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Non-custodial</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span>Instant settlement</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Lock className="h-4 w-4 text-blue-500" />
                  <span>HD wallet derivation</span>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
                <Cpu className="h-6 w-6 text-emerald-500" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                <Layers className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
                <Globe className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">5</div>
                <div className="text-muted-foreground text-xs">Currencies</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-muted-foreground text-xs">
                  Live Features
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">6</div>
                <div className="text-muted-foreground text-xs">Coming Soon</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                <Webhook className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">14</div>
                <div className="text-muted-foreground text-xs">
                  API Endpoints
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solutions Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">All Solutions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {solutions.map((solution) => {
            const Icon = solution.icon;
            return (
              <Card
                key={solution.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  solution.status === "live"
                    ? "cursor-pointer hover:border-zinc-600"
                    : "opacity-75"
                }`}
                onClick={() => {
                  if (solution.status === "live" && solution.href) {
                    router.push(solution.href);
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${solution.color}20` }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: solution.color }}
                      />
                    </div>
                    <Badge
                      variant={
                        solution.status === "live" ? "default" : "secondary"
                      }
                    >
                      {solution.status === "live" ? "Live" : "Coming Soon"}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-lg">
                    {solution.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {solution.description}
                  </p>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {solution.features.map((feature) => (
                      <span
                        key={feature}
                        className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-1 text-xs"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  {solution.status === "live" && solution.href ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(solution.href!);
                      }}
                    >
                      Get Started
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
