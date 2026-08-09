import { Metadata } from "next";
import OverlayPageClient from "./OverlayPageClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Donation Overlay - ${slug}`,
    description: "OBS browser source overlay for donation alerts",
  };
}

export default async function OverlayPage({ params }: PageProps) {
  const { slug } = await params;
  return <OverlayPageClient slug={slug} />;
}
