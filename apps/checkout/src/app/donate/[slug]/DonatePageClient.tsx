"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  Shield,
  Zap,
  Heart,
  TrendingUp,
  MessageCircle,
  User,
} from "lucide-react";

interface Donation {
  id: string;
  title: string;
  description?: string;
  goal_amount?: number;
  current_amount: number;
  donor_count: number;
  suggested_amounts: number[];
  allow_custom_amount: boolean;
  show_progress: boolean;
  thank_you_message?: string;
  allow_messages: boolean;
  max_message_length: number;
  show_messages: boolean;
  alert_color: string;
  recent_messages?: Array<{
    donor_name: string;
    amount_usd: number;
    message: string;
    created_at: string;
  }>;
}

interface DonatePageClientProps {
  slug: string;
  initialDonation: Donation | null;
}

export default function DonatePageClient({
  slug,
  initialDonation,
}: DonatePageClientProps) {
  const router = useRouter();
  const [donation] = useState<Donation | null>(initialDonation);
  const [amount, setAmount] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("BTC");
  const [donorName, setDonorName] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [donationResult, setDonationResult] = useState<{
    current_amount: number;
    goal_amount?: number;
    donor_count: number;
  } | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";

  const currencies = [
    { id: "BTC", label: "Bitcoin", symbol: "BTC", color: "#F7931A" },
    { id: "LTC", label: "Litecoin", symbol: "LTC", color: "#BFBBBB" },
    { id: "ETH", label: "Ethereum", symbol: "ETH", color: "#627EEA" },
    { id: "USDT_ERC20", label: "USDT", symbol: "USDT", color: "#26A17B" },
    { id: "USDC_ERC20", label: "USDC", symbol: "USDC", color: "#2775CA" },
  ];

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/v1/donations/${donation?.id}/donate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_usd: parseFloat(amount),
            currency: selectedCurrency,
            donor_name: donorName.trim() || undefined,
            message: message.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to process donation");
      }

      const data = await res.json();
      setDonationResult(data.donation);

      if (donation?.thank_you_message) {
        setSuccess(true);
      } else {
        router.push(`/checkout/${data.invoice_id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (!donation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800">
            <Heart className="h-8 w-8 text-zinc-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Page Not Found</h1>
          <p className="text-zinc-400">
            This donation page does not exist or has been deactivated.
          </p>
        </div>
      </div>
    );
  }

  const progress =
    donation.goal_amount && donation.goal_amount > 0
      ? Math.min(
          100,
          Math.round((donation.current_amount / donation.goal_amount) * 100),
        )
      : null;

  const donateUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/donate/${slug}`;

  if (success && donation.thank_you_message) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <Heart className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-white">Thank You!</h1>
            <p className="mb-6 text-zinc-400">{donation.thank_you_message}</p>

            {donationResult && (
              <div className="mb-6 rounded-xl bg-zinc-800 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">Your Donation</div>
                    <div className="font-medium text-white">
                      ${parseFloat(amount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Total Raised</div>
                    <div className="font-medium text-emerald-500">
                      $
                      {donationResult.current_amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
                {progress !== null && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-emerald-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-zinc-500">
              Redirecting to checkout in a moment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${donation.alert_color}20` }}
            >
              <Heart
                className="h-6 w-6"
                style={{ color: donation.alert_color }}
              />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-white">
              {donation.title}
            </h1>
            {donation.description && (
              <p className="text-sm text-zinc-400">{donation.description}</p>
            )}
          </div>

          {/* Progress Bar */}
          {progress !== null && donation.show_progress && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  $
                  {donation.current_amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  raised
                </span>
                <span className="font-medium text-white">
                  $
                  {donation.goal_amount!.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  goal
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                <span>{progress}% complete</span>
                <span>{donation.donor_count} donors</span>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG
                value={donateUrl}
                size={100}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Donation Amount (USD)
            </label>
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
                className="w-full rounded-xl border-0 bg-zinc-800 py-4 pl-8 text-center text-3xl font-bold text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {/* Suggested Amounts */}
            {donation.suggested_amounts &&
              donation.suggested_amounts.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {donation.suggested_amounts.map((suggested) => (
                    <button
                      key={suggested}
                      onClick={() => setAmount(suggested.toString())}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        amount === suggested.toString()
                          ? "bg-pink-500 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      ${suggested}
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Donor Name (Optional) */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              <User className="mr-1 inline h-4 w-4" />
              Your Name (optional)
            </label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Anonymous"
              className="w-full rounded-xl border-0 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Message (Optional) */}
          {donation.allow_messages && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                <MessageCircle className="mr-1 inline h-4 w-4" />
                Leave a Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice..."
                rows={3}
                maxLength={
                  donation.max_message_length > 0
                    ? donation.max_message_length
                    : undefined
                }
                className="w-full resize-none rounded-xl border-0 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-pink-500"
              />
              {donation.max_message_length > 0 && (
                <div className="mt-1 text-right text-xs text-zinc-500">
                  {message.length}/{donation.max_message_length}
                </div>
              )}
            </div>
          )}

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

          {/* Donate Button */}
          <button
            onClick={handleDonate}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 py-4 font-bold text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Donate ${amount || "0.00"}
                <Heart className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Recent Messages */}
          {donation.show_messages &&
            donation.recent_messages &&
            donation.recent_messages.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-zinc-400">
                  Recent Messages
                </h3>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {donation.recent_messages.slice(0, 5).map((msg, i) => (
                    <div key={i} className="rounded-lg bg-zinc-800/50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-300">
                          {msg.donor_name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ${msg.amount_usd.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 italic">
                        {msg.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Stats */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{donation.donor_count} donors</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>
                $
                {donation.current_amount.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                })}{" "}
                raised
              </span>
            </div>
          </div>

          {/* Trust Signals */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span>Non-custodial</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Instant</span>
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
