import { Metadata } from "next";
import { notFound } from "next/navigation";
import DonatePageClient from "./DonatePageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getDonation(slug: string) {
  const API_BASE_URL = process.env.API_URL || "http://localhost:5050";

  try {
    const res = await fetch(`${API_BASE_URL}/v1/donations/public/${slug}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const donation = await getDonation(slug);

  if (!donation) {
    return { title: "Donation Page Not Found" };
  }

  return {
    title: `Donate - ${donation.title}`,
    description:
      donation.description || `Support ${donation.title} with crypto`,
  };
}

export default async function DonatePage({ params }: PageProps) {
  const { slug } = await params;
  const donation = await getDonation(slug);

  if (!donation) {
    notFound();
  }

  return <DonatePageClient slug={slug} initialDonation={donation} />;
}
