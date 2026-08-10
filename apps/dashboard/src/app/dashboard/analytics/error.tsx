"use client";

import { DashboardError } from "@/components/error-boundary";

export default function AnalyticsError({
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
      title="Failed to load analytics"
      description="We couldn't load your analytics data. Please try again."
    />
  );
}
