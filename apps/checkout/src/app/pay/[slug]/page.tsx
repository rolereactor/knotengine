import { Metadata } from "next";
import PayLinkPageClient from "./PayLinkPageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPaymentLink(slug: string) {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050";
  try {
    const res = await fetch(`${API_BASE_URL}/v1/payment-links/public/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Error fetching payment link for metadata:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const link = await getPaymentLink(slug);

  if (!link) {
    return {
      title: "Payment Link Not Found | KnotEngine",
    };
  }

  const amount = link.amount
    ? `${link.amount.toFixed(2)} USD`
    : "Custom Amount";

  return {
    title: `Pay ${amount} — ${link.title}`,
    description:
      link.description ||
      `Secure crypto payment for ${link.title}. Pay with BTC, LTC, ETH, USDT.`,
    openGraph: {
      title: link.title,
      description: link.description || `Pay ${amount} with crypto`,
    },
  };
}

export default async function PayLinkPage({ params }: PageProps) {
  const { slug } = await params;
  const initialLink = await getPaymentLink(slug);

  return <PayLinkPageClient slug={slug} initialLink={initialLink} />;
}
