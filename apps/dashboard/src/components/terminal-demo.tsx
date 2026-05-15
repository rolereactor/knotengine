"use client";

import { useState, useEffect } from "react";

const lines = [
  {
    text: "$ curl -X POST https://api.knotengine.com/v1/invoices \\",
    type: "command",
  },
  { text: '  -H "x-api-key: knot_sk_live_..." \\', type: "command" },
  { text: '  -H "Content-Type: application/json" \\', type: "command" },
  { text: "  -d '{", type: "command" },
  { text: '    "amount_usd": 100.00,', type: "command" },
  { text: '    "currency": "USDC_POLYGON",', type: "command" },
  { text: '    "description": "Order #1234"', type: "command" },
  { text: "  }'", type: "command" },
  { text: "", type: "empty" },
  { text: "✓ Invoice created \u00b7 inv_abc123", type: "success" },
  { text: "⚡ Payment detected \u00b7 0.3s", type: "event" },
  { text: "✓ Confirmed \u00b7 100 USDC \u2192 0x742d\u2026", type: "success" },
];

const delays = [0, 80, 160, 240, 320, 400, 480, 560, 800, 2000, 3200, 4400];

export function TerminalDemo() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = delays.map((delay, i) =>
      setTimeout(() => setVisibleCount(i + 1), delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A] shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 font-mono text-[11px] text-zinc-600">bash</span>
      </div>
      <div className="p-5 font-mono text-sm leading-relaxed">
        {lines.slice(0, visibleCount).map((line, i) => (
          <div
            key={i}
            className="animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            {line.type === "empty" ? (
              <span className="block h-2" />
            ) : line.type === "command" ? (
              <span>
                {line.text.startsWith("$") ? (
                  <>
                    <span className="text-zinc-500">$</span>
                    <span className="text-white">{line.text.slice(1)}</span>
                  </>
                ) : (
                  <span className="text-white">{line.text}</span>
                )}
              </span>
            ) : line.type === "success" ? (
              <span className="text-emerald-400">{line.text}</span>
            ) : (
              <span className="text-amber-400">{line.text}</span>
            )}
          </div>
        ))}
        {visibleCount >= lines.length && (
          <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            webhook relay active
          </div>
        )}
      </div>
    </div>
  );
}
