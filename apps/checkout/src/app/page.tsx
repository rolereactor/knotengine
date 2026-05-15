"use client";

import { CyberpunkBackground } from "@/components/CyberpunkBackground";
import { motion } from "framer-motion";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  stripHtmlTags,
  limitLength,
  MAX_TEXT_LENGTH,
} from "@qodinger/knot-types";

export default function Home() {
  const [invId, setInvId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const sanitized = limitLength(stripHtmlTags(invId.trim()), MAX_TEXT_LENGTH);

    if (!sanitized) {
      setError("Please enter a valid invoice ID");
      return;
    }

    if (!sanitized.startsWith("inv_")) {
      setError("Invoice ID must start with 'inv_'");
      return;
    }

    if (sanitized.length < 7) {
      setError("Invalid invoice ID format");
      return;
    }

    router.push(`/checkout/${sanitized}`);
  };

  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-6">
      <CyberpunkBackground />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center"
      >
        <h1 className="mb-6 text-6xl font-black tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(157,0,255,0.4)]">
          <span className="text-neon-purple">Knot</span>
          <span className="text-white opacity-80">Engine</span>
        </h1>
        <p className="mb-12 text-sm font-bold tracking-[0.2em] uppercase opacity-40">
          Non-Custodial Payment Infrastructure
        </p>

        <form onSubmit={handleGo} className="group relative w-full max-w-sm">
          <input
            type="text"
            placeholder="ENTER INVOICE ID (inv_...)"
            value={invId}
            onChange={(e) => {
              setInvId(e.target.value);
              setError("");
            }}
            maxLength={MAX_TEXT_LENGTH}
            className="glass focus:border-neon-blue/50 w-full rounded-2xl border-white/5 bg-white/5 px-6 py-5 font-mono text-xs tracking-widest uppercase transition-all outline-none"
          />
          <button
            type="submit"
            className="bg-neon-blue absolute top-1/2 right-2 -translate-y-1/2 rounded-xl p-3 text-black transition-all hover:scale-110 active:scale-95"
          >
            <ArrowRight size={20} />
          </button>
        </form>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-red-400"
          >
            <AlertCircle size={14} />
            {error}
          </motion.div>
        )}

        <div className="mt-12 flex justify-center gap-8 text-[10px] font-black tracking-widest uppercase opacity-20">
          <span>No Middlemen</span>
          <span>No Custody</span>
          <span>Pure Code</span>
        </div>
      </motion.div>
    </main>
  );
}
