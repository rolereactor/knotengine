"use client";

import { DashboardError } from "@/components/error-boundary";

export default function BillingError({
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
      title="Failed to load billing"
      description="We couldn't load your billing information. Please try again."
    />
  );
}
