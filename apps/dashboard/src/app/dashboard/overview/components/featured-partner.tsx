"use client";

import { ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FeaturedPartner() {
  return (
    <Card className="relative overflow-hidden border-emerald-500/20 bg-emerald-500/5">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-emerald-500/10 blur-3xl" />
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Secure Your Merchant Funds</h3>
              <p className="text-muted-foreground max-w-md text-sm">
                Don&apos;t leave your earnings on a hot wallet. Get a Ledger
                hardware wallet and manage your funds with industry-leading
                security.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              className="border-none bg-emerald-500 text-white hover:bg-emerald-600"
              asChild
            >
              <a
                href="https://affiliate.ledger.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get 15% Off Ledger
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
