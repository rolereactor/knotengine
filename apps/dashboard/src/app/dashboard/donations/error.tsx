"use client";

import { DashboardError } from "@/components/error-boundary";

export default function DonationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardError
      error={error}
      reset={reset}
      title="Failed to load donations"
      description="We couldn't load your donation settings. Please try again."
    />
  );
}
