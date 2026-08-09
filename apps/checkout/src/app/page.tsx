"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 bg-[#050505]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03)_0%,transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
              <span className="text-xl font-black text-black">⌘</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              KnotEngine
            </span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-lg text-4xl font-bold tracking-tight text-white"
        >
          Secure Crypto Checkout
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 max-w-md text-sm text-zinc-400"
        >
          You&apos;ve reached the KnotEngine checkout portal. If you&apos;re
          here to make a payment, ask the merchant for your payment link.
        </motion.p>

        {/* Feature badges */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          {[
            {
              icon: Shield,
              label: "Non-Custodial",
              desc: "Merchants receive crypto directly",
            },
            {
              icon: Zap,
              label: "Instant Settlement",
              desc: "No waiting for confirmations",
            },
            {
              icon: Lock,
              label: "Zero Counterparty Risk",
              desc: "Your keys, your rules",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
            >
              <item.icon className="h-4 w-4 text-emerald-500" />
              <div className="text-left">
                <div className="text-xs font-semibold text-white">
                  {item.label}
                </div>
                <div className="text-[10px] text-zinc-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <Link
            href={
              process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:5052"
            }
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/10"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* Footer tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-[10px] font-black tracking-widest text-zinc-600 uppercase"
        >
          The Protocol for Commerce
        </motion.p>
      </div>
    </main>
  );
}
