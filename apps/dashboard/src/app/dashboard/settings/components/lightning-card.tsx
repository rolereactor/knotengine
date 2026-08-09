"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Edit2, Server, Key } from "lucide-react";
import { MerchantSettings } from "../types";
import { LightningDialog } from "./lightning-dialog";

interface LightningCardProps {
  formData: MerchantSettings;
  onSave: (data: MerchantSettings) => Promise<void>;
  saving: boolean;
}

export function LightningCard({
  formData,
  onSave,
  saving,
}: LightningCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  return (
    <>
      <Card className="bg-card/40 border-border/50 hover:bg-card/60 hover:border-primary/30 group shadow-sm backdrop-blur-md transition-all">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Zap className="text-primary size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">
                  Lightning Network
                </CardTitle>
                <CardDescription className="text-xs">
                  Accept instant BTC payments via the Lightning Network.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-8 gap-2"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Edit2 className="size-3.5" />
              Configure
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border-border/40 bg-muted/10 flex flex-col gap-1.5 rounded-lg border p-3">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                <Zap className="size-3" />
                Status
              </span>
              <span className="text-sm font-semibold">
                {formData.lightningEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="border-border/40 bg-muted/10 flex flex-col gap-1.5 rounded-lg border p-3">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                <Server className="size-3" />
                Provider
              </span>
              <span className="text-sm font-semibold uppercase">
                {formData.lightningProvider || "LND"}
              </span>
            </div>
          </div>

          {formData.lightningEnabled && (
            <div className="border-border/40 bg-muted/10 flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                <Key className="size-3" />
                Connection
              </span>
              <div className="text-sm font-semibold">
                {formData.lightningProvider === "cln"
                  ? formData.clnEndpoint || "Not configured"
                  : formData.lndEndpoint || "Not configured"}
              </div>
            </div>
          )}

          <div className="border-border/40 bg-muted/10 flex flex-col gap-2 rounded-lg border p-3">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
              <Zap className="size-3" />
              Supported Currencies
            </span>
            <div className="flex flex-wrap gap-1.5">
              <div className="bg-primary/10 border-primary/20 text-primary rounded-md border px-2 py-0.5 text-[10px] font-bold">
                BTC (Lightning)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LightningDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        formData={formData}
        onSave={onSave}
        saving={saving}
      />
    </>
  );
}
