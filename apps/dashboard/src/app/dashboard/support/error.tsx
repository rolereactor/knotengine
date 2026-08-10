"use client";

import { DashboardError } from "@/components/error-boundary";

export default function SupportError({
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
      title="Failed to load support"
      description="We couldn't load your support tickets. Please try again."
    />
  );
}
