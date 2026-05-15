import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import React from "react";

export const metadata: Metadata = {
  title: {
    default: "KnotEngine | The Protocol for Commerce",
    template: "%s | KnotEngine",
  },
  description:
    "Non-custodial stablecoin payment infrastructure. Accept crypto payments with zero counterparty risk.",
  keywords: [
    "crypto payments",
    "non-custodial",
    "payment gateway",
    "bitcoin",
    "ethereum",
    "stablecoin",
    "merchant",
  ],
  authors: [{ name: "KnotEngine Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://knotengine.com",
    siteName: "KnotEngine",
    title: "KnotEngine | The Protocol for Commerce",
    description: "Non-custodial stablecoin payment infrastructure.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KnotEngine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KnotEngine | The Protocol for Commerce",
    description: "Non-custodial stablecoin payment infrastructure.",
    images: ["/og-image.png"],
    creator: "@knotengine",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KnotEngine",
  },
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL("https://knotengine.com"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-background text-foreground min-h-screen antialiased"
        suppressHydrationWarning
      >
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
