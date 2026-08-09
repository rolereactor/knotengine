"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  ExternalLink,
  Clock,
  Shield,
  Zap,
  LinkIcon,
} from "lucide-react";

interface PaymentLink {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  suggested_amounts?: number[];
}

interface PayLinkPageClientProps {
  slug: string;
  initialLink: PaymentLink | null;
}

export default function PayLinkPageClient({
  slug,
  initialLink,
}: PayLinkPageClientProps) {
  const router = useRouter();
  const [link] = useState<PaymentLink | null>(initialLink);
  const [amount, setAmount] = useState<string>(link?.amount?.toString() || "");
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    link?.currency || "BTC",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

  const currencies = [
    { id: "BTC", label: "Bitcoin", symbol: "BTC", color: "#F7931A" },
    { id: "LTC", label: "Litecoin", symbol: "LTC", color: "#BFBBBB" },
    { id: "ETH", label: "Ethereum", symbol: "ETH", color: "#627EEA" },
    { id: "USDT_ERC20", label: "USDT", symbol: "USDT", color: "#26A17B" },
    { id: "USDC_ERC20", label: "USDC", symbol: "USDC", color: "#2775CA" },
  ];

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/v1/payment-links/${link?.id}/invoice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_usd: parseFloat(amount),
            currency: selectedCurrency,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to create invoice");
      }

      const data = await res.json();
      router.push(`/checkout/${data.invoice_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
            <LinkIcon className="h-8 w-8 text-zinc-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Link Not Found</h1>
          <p className="text-zinc-400">
            This payment link does not exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  const selectedCurrencyData = currencies.find(
    (c) => c.id === selectedCurrency,
  );
  const payUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${slug}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${selectedCurrencyData?.color}20` }}
            >
              <div
                className="h-6 w-6 rounded-full"
                style={{ backgroundColor: selectedCurrencyData?.color }}
              />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white">{link.title}</h1>
            {link.description && (
              <p className="text-sm text-zinc-400">{link.description}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG
                value={payUrl}
                size={120}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Amount (USD)
            </label>
            {link.amount ? (
              <div className="rounded-xl bg-zinc-800 py-4 text-center text-3xl font-bold text-white">
                ${link.amount.toFixed(2)}
              </div>
            ) : (
              <div className="relative">
                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-xl font-bold text-zinc-400">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full rounded-xl border-0 bg-zinc-800 py-4 pl-8 text-center text-3xl font-bold text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Suggested Amounts */}
            {link.suggested_amounts && !link.amount && (
              <div className="mt-3 flex justify-center gap-2">
                {link.suggested_amounts.map((suggested) => (
                  <button
                    key={suggested}
                    onClick={() => setAmount(suggested.toString())}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      amount === suggested.toString()
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    ${suggested}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Currency Selector */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Pay with
            </label>
            <div className="grid grid-cols-5 gap-2">
              {currencies.map((currency) => (
                <button
                  key={currency.id}
                  onClick={() => setSelectedCurrency(currency.id)}
                  className={`rounded-xl p-3 text-center transition-all ${
                    selectedCurrency === currency.id
                      ? "border-2"
                      : "border-2 border-transparent bg-zinc-800 hover:border-zinc-600"
                  }`}
                  style={
                    selectedCurrency === currency.id
                      ? {
                          backgroundColor: `${currency.color}20`,
                          borderColor: currency.color,
                        }
                      : undefined
                  }
                >
                  <div
                    className="mx-auto mb-1 h-4 w-4 rounded-full"
                    style={{ backgroundColor: currency.color }}
                  />
                  <div className="text-xs font-medium text-white">
                    {currency.symbol}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-center text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Pay Button */}
          <button
            onClick={handlePay}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 font-bold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Invoice...
              </>
            ) : (
              <>
                Pay ${amount || "0.00"}
                <ExternalLink className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Trust Signals */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Non-custodial</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Instant</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>30min expiry</span>
            </div>
          </div>

          {/* Powered By */}
          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-500">
              Powered by{" "}
              <span className="font-medium text-zinc-400">KnotEngine</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
