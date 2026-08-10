"use client";

import { DashboardError } from "@/components/error-boundary";

export default function RefundsError({
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
      title="Failed to load refunds"
      description="We couldn't load your refunds data. Please try again."
    />
  );
}
