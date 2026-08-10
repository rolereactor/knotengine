"use client";

import { DashboardError } from "@/components/error-boundary";

export default function WhiteLabelError({
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
      title="Failed to load white-label settings"
      description="We couldn't load your white-label configuration. Please try again."
    />
  );
}
