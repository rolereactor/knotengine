"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Clock, AlertCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRYPTO_LOGOS, Currency } from "@qodinger/knot-types";

interface CheckoutCardProps {
  invoice: {
    invoice_id: string;
    amount_usd: number;
    crypto_amount: number;
    crypto_amount_received?: number;
    crypto_currency: string;
    pay_address: string;
    status: string;
    expires_at: string;
    fee_usd: number;
    metadata?: {
      isTestnet?: boolean;
      feeResponsibility?: "client" | "merchant";
    };
    merchant?: {
      name: string;
      logo_url?: string | null;
      return_url?: string | null;
      theme?: "light" | "dark" | "system";
      brand_color?: string;
      branding_enabled?: boolean;
      branding_alignment?: "left" | "center";
      remove_branding?: boolean;
      bip21_enabled?: boolean;
      plan?: "starter" | "professional" | "enterprise";
    };
    description?: string;
  };
}

export function CheckoutCard({ invoice }: CheckoutCardProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [amountCopied, setAmountCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const expiry = new Date(invoice.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        clearInterval(timer);
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [invoice.expires_at]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(invoice.pay_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRemainingAmount = () => {
    if (invoice.status === "partially_paid") {
      return parseFloat(
        (invoice.crypto_amount - (invoice.crypto_amount_received || 0)).toFixed(
          8,
        ),
      );
    }
    return invoice.crypto_amount;
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(getRemainingAmount().toString());
    setAmountCopied(true);
    setTimeout(() => setAmountCopied(false), 2000);
  };

  const generatePaymentUri = () => {
    const address = invoice.pay_address;
    const amount = getRemainingAmount();
    const bip21 = invoice.merchant?.bip21_enabled ?? true;

    if (!bip21) return address;

    // Handle testnet symbols like BTC_TESTNET or LTC_TESTNET
    const baseCurrency = invoice.crypto_currency.split("_")[0];

    if (baseCurrency === "BTC") return `bitcoin:${address}?amount=${amount}`;
    if (baseCurrency === "LTC") return `litecoin:${address}?amount=${amount}`;

    return address;
  };

  return (
    <div className="bg-card border-border relative w-full overflow-hidden rounded-xl border shadow-2xl">
      {/* Testnet Banner */}
      {invoice.metadata?.isTestnet && (
        <div className="brand-bg-muted brand-border flex items-center justify-center gap-2 border-b px-4 py-1.5">
          <AlertCircle size={12} className="brand-text" />
          <span className="brand-text text-[10px] font-bold tracking-widest uppercase">
            Testnet Mode
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Merchant Branding */}
        {invoice.merchant?.branding_enabled !== false && (
          <div
            className={cn(
              "border-border/50 mb-4 flex flex-col border-b pb-6",
              invoice.merchant?.branding_alignment === "center"
                ? "items-center text-center"
                : "items-start text-left",
            )}
          >
            <div
              className={cn(
                "flex gap-3",
                invoice.merchant?.branding_alignment === "center"
                  ? "flex-col items-center"
                  : "flex-row items-center",
              )}
            >
              <div className="brand-bg-muted brand-border bg-muted border-border/50 flex size-10 items-center justify-center overflow-hidden rounded-lg border">
                {invoice.merchant?.logo_url ? (
                  <img
                    src={invoice.merchant.logo_url}
                    alt={invoice.merchant.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="brand-text text-muted-foreground text-xl font-bold uppercase">
                    {invoice.merchant?.name?.charAt(0) || "M"}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "flex flex-col",
                  invoice.merchant?.branding_alignment === "center"
                    ? "items-center text-center"
                    : "items-start text-left",
                )}
              >
                <h1 className="text-foreground text-sm font-bold tracking-tight">
                  {invoice.merchant?.name || "Merchant"}
                </h1>
                <p className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
                  Payment Request
                </p>
              </div>
            </div>

            {invoice.description && (
              <div
                className={cn(
                  "bg-muted/30 border-border/50 mt-4 rounded-lg border px-3 py-2",
                  invoice.merchant?.branding_alignment === "center"
                    ? "text-center"
                    : "text-left",
                )}
              >
                <p className="text-muted-foreground text-[11px] leading-relaxed italic">
                  &quot;{invoice.description}&quot;
                </p>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mb-4 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 animate-pulse rounded-full",
                ["pending", "mempool_detected", "confirming"].includes(
                  invoice.status,
                )
                  ? "bg-amber-500"
                  : ["confirmed", "overpaid"].includes(invoice.status)
                    ? "bg-emerald-500"
                    : invoice.status === "partially_paid"
                      ? "bg-orange-500"
                      : invoice.status === "expired"
                        ? "bg-destructive"
                        : "bg-muted-foreground",
              )}
            />
            <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              {invoice.status.replace("_", " ")}
            </span>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1",
              ["pending", "mempool_detected", "confirming"].includes(
                invoice.status,
              )
                ? "border-amber-500/20 bg-amber-500/10 text-amber-500"
                : ["confirmed", "overpaid"].includes(invoice.status)
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  : invoice.status === "partially_paid"
                    ? "border-orange-500/20 bg-orange-500/10 text-orange-500"
                    : invoice.status === "expired"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-secondary border-border text-muted-foreground",
            )}
          >
            <Clock size={12} />
            <span className="font-mono text-xs font-bold tracking-tight">
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Amount Section */}
        <div className="mb-4 flex flex-col items-center">
          <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-widest uppercase">
            {invoice.status === "partially_paid"
              ? "Remaining Balance"
              : "Total Amount"}
          </p>
          <div
            className="group flex cursor-pointer flex-col items-center select-none"
            onClick={copyAmount}
          >
            <div className="relative flex items-center gap-2">
              <h2
                className={cn(
                  "text-3xl font-bold tracking-tight transition-colors",
                  amountCopied
                    ? "text-emerald-500"
                    : invoice.status === "partially_paid"
                      ? "text-amber-500"
                      : "brand-text text-foreground",
                )}
              >
                {getRemainingAmount()}
              </h2>
              <span className="brand-text text-muted-foreground text-lg font-medium">
                {invoice.crypto_currency}
              </span>

              {amountCopied && (
                <span className="absolute top-1/2 -right-8 -translate-y-1/2">
                  <Check size={16} className="text-emerald-500" />
                </span>
              )}
            </div>

            {invoice.status === "partially_paid" && (
              <p className="mt-1 text-[10px] font-bold tracking-wider text-amber-500/80 uppercase">
                Received:{" "}
                {parseFloat((invoice.crypto_amount_received || 0).toFixed(8))}{" "}
                {invoice.crypto_currency}
              </p>
            )}

            <div className="flex flex-col items-center">
              <p className="text-muted-foreground mt-1 text-sm font-medium">
                ≈ $
                {(
                  (getRemainingAmount() / invoice.crypto_amount) *
                  invoice.amount_usd
                ).toFixed(2)}{" "}
                USD
              </p>
              {invoice.metadata?.feeResponsibility === "client" &&
                invoice.fee_usd > 0 &&
                invoice.status !== "partially_paid" && (
                  <p className="text-muted-foreground/60 mt-0.5 text-[9px] font-medium tracking-wide uppercase">
                    Includes ${invoice.fee_usd.toFixed(2)} Platform Fee
                  </p>
                )}
            </div>
            <span className="text-muted-foreground mt-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
              Click to copy{" "}
              {invoice.status === "partially_paid" ? "remaining" : ""} amount
            </span>
          </div>
        </div>

        {/* Partial Payment Alert */}
        {invoice.status === "partially_paid" && (
          <div className="mb-6 flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle size={14} />
              <span className="text-xs font-bold tracking-tight uppercase">
                Underpayment Detected
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-200/60">
              We detected a payment, but it was less than the required amount.
              Please send the remaining balance above to complete your order.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* QR Code */}
          <div className="border-border/20 relative mx-auto flex items-center justify-center rounded-xl border bg-white p-4 shadow-sm">
            <QRCodeSVG value={generatePaymentUri()} size={180} level="H" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-white p-2">
                <img
                  src={
                    CRYPTO_LOGOS[invoice.crypto_currency as Currency] ||
                    CRYPTO_LOGOS["BTC"]
                  }
                  alt={invoice.crypto_currency}
                  className="size-full object-contain select-none"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          {/* Address Input */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                <Wallet size={10} />
                Payment Address
              </label>
            </div>

            <div className="group relative">
              <div className="group-hover-brand-border bg-secondary border-border text-secondary-foreground group-hover:border-primary/20 w-full truncate rounded-lg border py-3 pr-12 pl-4 font-mono text-xs transition-colors">
                {invoice.pay_address}
              </div>
              <button
                onClick={copyToClipboard}
                className="hover-brand-text hover-brand-bg hover:bg-background text-muted-foreground hover:text-foreground absolute top-1 right-1 bottom-1 flex aspect-square items-center justify-center rounded-md transition-colors"
              >
                {copied ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Footer Info */}
      <div className="bg-secondary/30 border-border mt-2 border-t p-4 px-6">
        <div className="text-muted-foreground flex items-center justify-between text-[10px] font-bold tracking-widest uppercase">
          <div className="flex items-center gap-2">
            <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live Network Status
          </div>
          <span className="font-medium opacity-60">Automatic Verification</span>
        </div>
      </div>
    </div>
  );
}
