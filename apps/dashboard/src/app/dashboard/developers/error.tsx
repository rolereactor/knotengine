"use client";

import { DashboardError } from "@/components/error-boundary";

export default function DevelopersError({
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
      title="Failed to load developer settings"
      description="We couldn't load your developer settings. Please try again."
    />
  );
}
