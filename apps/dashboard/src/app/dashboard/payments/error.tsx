"use client";

import { DashboardError } from "@/components/error-boundary";

export default function PaymentsError({
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
      title="Failed to load payments"
      description="We couldn't load your payments data. Please try again."
    />
  );
}
