"use client";

import {
  LifeBuoy,
  MessageSquare,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Send,
  Search,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const DOCS_URL = "https://docs.knotengine.com";

const HELP_CATEGORIES = [
  {
    title: "Integration Guide",
    description: "SDKs, API reference, and platform webhooks.",
    icon: FileText,
    color: "bg-blue-500/10 text-blue-500",
    href: `${DOCS_URL}/integration`,
  },
  {
    title: "Billing & Payouts",
    description: "Fee structure, settlement logic, and limits.",
    icon: HelpCircle,
    color: "bg-emerald-500/10 text-emerald-500",
    href: `${DOCS_URL}/billing`,
  },
  {
    title: "Security & Keys",
    description: "API key safety, scoped access, and IP-whitelisting.",
    icon: BookOpen,
    color: "bg-purple-500/10 text-purple-500",
    href: `${DOCS_URL}/security`,
  },
];

const FAQS = [
  "How do I upgrade my settlement limits?",
  "What is the average transaction verification time?",
  "How to enable automatic treasury sweeps?",
  "Managing multi-chain asset pools.",
];

export default function SupportPage() {
  const openSupport = () => {
    window.open("mailto:support@knotengine.com", "_blank");
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="space-y-2 py-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tighter sm:text-4xl">
          KnotEngine Merchant Center
        </h1>
        <p className="text-muted-foreground text-lg font-medium">
          How can we help scale your non-custodial infrastructure today?
        </p>
        <div className="relative mx-auto mt-6 max-w-2xl">
          <Search className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
          <Input
            placeholder="Search documentation, guides, or error codes..."
            className="bg-background/50 border-border/50 shadow-primary/5 focus:bg-background h-14 pl-12 text-lg shadow-xl transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {HELP_CATEGORIES.map((cat) => (
          <Card
            key={cat.title}
            onClick={() => window.open(cat.href, "_blank")}
            className="bg-background/50 hover:bg-background/80 group cursor-pointer border border-none transition-all"
          >
            <CardHeader>
              <div
                className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${cat.color}`}
              >
                <cat.icon className="size-6" />
              </div>
              <CardTitle className="mb-1 text-lg font-bold tracking-tight">
                {cat.title}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed font-medium">
                {cat.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button
                variant="ghost"
                className="text-primary p-0 text-[10px] font-bold tracking-widest uppercase transition-all group-hover:gap-3 hover:bg-transparent"
              >
                Browse Guides
                <ArrowRight className="ml-2 size-3" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare className="text-primary size-5" />
            <h2 className="text-lg font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="grid gap-3">
            {FAQS.map((faq) => (
              <div
                key={faq}
                className="bg-background/40 border-border/30 hover:border-primary/30 hover:bg-background/60 group flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all"
              >
                <span className="text-foreground/80 group-hover:text-foreground text-sm font-medium">
                  {faq}
                </span>
                <ChevronRight className="text-muted-foreground/40 group-hover:text-primary size-4 transition-colors" />
              </div>
            ))}
          </div>
          <Button
            variant="link"
            onClick={() => window.open(DOCS_URL, "_blank")}
            className="text-primary h-auto p-0 text-[10px] font-bold tracking-widest uppercase"
          >
            View All Documentation
            <ExternalLink className="ml-2 size-3" />
          </Button>
        </div>

        <Card className="bg-primary/5 border-primary/10 relative overflow-hidden border border-none shadow-none">
          <div className="bg-primary/5 absolute -top-10 -right-10 size-40 rounded-full blur-3xl" />
          <CardHeader>
            <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-full">
              <MessageCircle className="size-5" />
            </div>
            <CardTitle>Priority Support</CardTitle>
            <CardDescription className="font-medium">
              Direct access to our engineering team for high-stakes integration
              queries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-background/50 border-primary/10 space-y-4 rounded-xl border p-4">
              <div className="space-y-1">
                <p className="text-primary/60 text-[10px] font-bold tracking-widest uppercase">
                  Average Response Time
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-none bg-emerald-500/10 px-0 text-xs font-bold text-emerald-500 shadow-none"
                  >
                    Under 15 minutes
                  </Badge>
                </div>
              </div>
              <div className="bg-primary/10 h-px" />
              <div className="space-y-1">
                <p className="text-primary/60 text-[10px] font-bold tracking-widest uppercase">
                  Active Sessions
                </p>
                <p className="text-sm font-bold">3 Engineers Available</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={openSupport}
              className="bg-primary shadow-primary/20 w-full gap-2 py-6 text-xs font-bold tracking-widest uppercase shadow-xl"
            >
              <Send className="size-4" />
              Start Support Session
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-muted/30 border-border/10 mt-4 flex flex-col items-center justify-between gap-6 rounded-3xl border p-8 md:flex-row">
        <div className="flex items-center gap-6">
          <div className="bg-background flex size-16 items-center justify-center rounded-2xl shadow-sm">
            <LifeBuoy className="text-primary size-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              Need a dedicated specialist?
            </h3>
            <p className="text-muted-foreground text-sm font-medium">
              Enterprise partners get 24/7 Slack and on-call infrastructure
              support.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            window.open("https://knotengine.com/pricing", "_blank")
          }
          className="px-8 text-[10px] font-bold tracking-widest uppercase"
        >
          Upgrade for Enterprise
        </Button>
      </div>
    </div>
  );
}
