"use client";

import { useState, useEffect } from "react";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { requestMagicLink } from "@/actions/auth";
import { toast } from "sonner";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      console.log(`[Auth] Affiliate referral detected: ${ref}`);
      Cookies.set("knot_affiliate_id", ref, { expires: 30 });
    }
  }, [searchParams]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await requestMagicLink(email);
      setSent(true);
      toast.success("Magic link sent! Check your inbox.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to send magic link";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="animate-in fade-in zoom-in space-y-4 py-8 text-center duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Command className="text-primary h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-tight text-white">
            Check your inbox
          </h3>
          <p className="mx-auto max-w-70 text-sm text-zinc-500">
            We&apos;ve sent a magic link to{" "}
            <span className="font-medium text-white">{email}</span>. Click it to
            sign in instantly.
          </p>
        </div>
        <Button
          variant="link"
          className="text-zinc-500 hover:text-white"
          onClick={() => setSent(false)}
        >
          Try another email
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleEmailSignIn} className="grid gap-3">
        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="ring-offset-background focus-visible:ring-primary/50 flex h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition-all placeholder:text-zinc-600 hover:bg-white/10 focus-visible:ring-2 focus-visible:outline-none"
            required
            disabled={loading}
          />
        </div>
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="h-11 rounded-lg font-bold shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          disabled={loading}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          ) : (
            "Continue with Email"
          )}
        </Button>
      </form>
    </div>
  );
}
