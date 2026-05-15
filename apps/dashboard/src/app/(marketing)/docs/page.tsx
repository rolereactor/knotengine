"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const sections = [
  {
    title: "Quick Start",
    description: "Get up and running in minutes with our simple integration.",
    links: [
      "Create an account",
      "Generate an API key",
      "Make your first payment",
    ],
  },
  {
    title: "API Reference",
    description: "Complete API documentation for all endpoints.",
    links: ["Authentication", "Invoices", "Webhooks", "Merchants"],
  },
  {
    title: "Guides",
    description: "Deep dives into specific features and use cases.",
    links: [
      "Non-custodial architecture",
      "HD wallet derivation",
      "Multi-chain setup",
      "Webhook security",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="bg-[#050505] pt-16">
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Documentation
            </h1>
            <p className="mt-4 text-lg text-zinc-500">
              Everything you need to integrate KnotEngine.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {sections.map((section, i) => (
              <div
                key={section.title}
                className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-700 hover:border-white/10"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {section.title}
                </h3>
                <p className="mb-6 text-sm text-zinc-500">
                  {section.description}
                </p>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="group inline-flex items-center gap-1.5 text-sm text-zinc-400 underline decoration-white/10 underline-offset-4 transition-colors hover:text-white hover:decoration-white/30"
                      >
                        {link}
                        <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:opacity-100" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="mb-4 text-zinc-500">
              Want to dive deeper? Check out our full API reference.
            </p>
            <Button
              className="h-10 rounded-md bg-white px-8 font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              asChild
            >
              <Link href="/dashboard/developers">
                API Reference
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
