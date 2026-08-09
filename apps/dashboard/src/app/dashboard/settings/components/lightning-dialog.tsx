"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Server, Key, AlertCircle } from "lucide-react";
import { merchantSettingsSchema, MerchantSettings } from "../types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface LightningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: MerchantSettings;
  onSave: (data: MerchantSettings) => Promise<void>;
  saving: boolean;
}

export function LightningDialog({
  open,
  onOpenChange,
  formData: initialData,
  onSave,
  saving,
}: LightningDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { isValid },
  } = useForm<MerchantSettings>({
    resolver: zodResolver(merchantSettingsSchema),
    defaultValues: initialData,
    mode: "onChange",
  });

  const lightningEnabled = watch("lightningEnabled");
  const lightningProvider = watch("lightningProvider");

  useEffect(() => {
    if (open) {
      reset(initialData);
    }
  }, [initialData, open, reset]);

  const onSubmit = async (data: MerchantSettings) => {
    await onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 sm:max-w-150">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="text-primary size-5" />
              Configure Lightning Network
            </DialogTitle>
            <DialogDescription>
              Enable instant BTC payments via the Lightning Network.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Enable Lightning */}
            <div className="border-border/40 bg-muted/5 flex items-center justify-between rounded-xl border p-4">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Zap className="text-muted-foreground size-4" />
                  Enable Lightning Payments
                </Label>
                <p className="text-muted-foreground text-[10px]">
                  Allow customers to pay invoices instantly via Lightning.
                </p>
              </div>
              <Controller
                name="lightningEnabled"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {lightningEnabled && (
              <>
                {/* Provider Selection */}
                <div className="border-border/40 bg-muted/5 space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Server className="text-muted-foreground size-4" />
                      Lightning Implementation
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="text-muted-foreground size-3.5 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Choose your Lightning Network implementation. LND is
                          the most common, but Core Lightning (CLN) is also
                          supported.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Controller
                    name="lightningProvider"
                    control={control}
                    render={({ field }) => (
                      <Tabs
                        value={field.value || "lnd"}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="lnd">LND</TabsTrigger>
                          <TabsTrigger value="cln">Core Lightning</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}
                  />
                </div>

                {/* LND Configuration */}
                {lightningProvider === "lnd" && (
                  <div className="space-y-3">
                    <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                      LND Configuration
                    </Label>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="lndEndpoint"
                        className="flex items-center gap-2"
                      >
                        <Server className="text-muted-foreground size-4" />
                        REST Endpoint
                      </Label>
                      <Input
                        id="lndEndpoint"
                        placeholder="https://localhost:8080"
                        {...register("lndEndpoint")}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        The REST API endpoint for your LND node (e.g.,
                        https://localhost:8080)
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="lndMacaroon"
                        className="flex items-center gap-2"
                      >
                        <Key className="text-muted-foreground size-4" />
                        Macaroon
                      </Label>
                      <Input
                        id="lndMacaroon"
                        type="password"
                        placeholder="0201..."
                        {...register("lndMacaroon")}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        Hex-encoded macaroon for authentication (admin.macaroon
                        recommended)
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="lndCert"
                        className="flex items-center gap-2"
                      >
                        <Key className="text-muted-foreground size-4" />
                        TLS Certificate (optional)
                      </Label>
                      <Input
                        id="lndCert"
                        type="password"
                        placeholder="-----BEGIN CERTIFICATE-----..."
                        {...register("lndCert")}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        PEM-encoded TLS certificate (only needed for self-signed
                        certificates)
                      </p>
                    </div>
                  </div>
                )}

                {/* CLN Configuration */}
                {lightningProvider === "cln" && (
                  <div className="space-y-3">
                    <Label className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                      Core Lightning Configuration
                    </Label>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="clnEndpoint"
                        className="flex items-center gap-2"
                      >
                        <Server className="text-muted-foreground size-4" />
                        RPC Endpoint
                      </Label>
                      <Input
                        id="clnEndpoint"
                        placeholder="http://localhost:9735"
                        {...register("clnEndpoint")}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        The RPC endpoint for your CLN node (e.g.,
                        http://localhost:9735)
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor="clnRune"
                        className="flex items-center gap-2"
                      >
                        <Key className="text-muted-foreground size-4" />
                        Rune
                      </Label>
                      <Input
                        id="clnRune"
                        type="password"
                        placeholder="..."
                        {...register("clnRune")}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        Rune for authentication (from `lightning-cli
                        createrune`)
                      </p>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="text-xs">
                    <p className="font-medium">Security Notice</p>
                    <p className="text-muted-foreground">
                      Lightning credentials are stored encrypted in our
                      database. Only provide credentials with the minimum
                      required permissions.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update Lightning
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
