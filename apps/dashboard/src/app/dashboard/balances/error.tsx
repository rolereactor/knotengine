"use client";

import { DashboardError } from "@/components/error-boundary";

export default function BalancesError({
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
      title="Failed to load balances"
      description="We couldn't load your balance information. Please try again."
    />
  );
}
