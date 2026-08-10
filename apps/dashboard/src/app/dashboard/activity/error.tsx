"use client";

import { DashboardError } from "@/components/error-boundary";

export default function ActivityError({
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
      title="Failed to load activity"
      description="We couldn't load your activity feed. Please try again."
    />
  );
}
