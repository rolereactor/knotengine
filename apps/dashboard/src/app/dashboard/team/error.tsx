"use client";

import { DashboardError } from "@/components/error-boundary";

export default function TeamError({
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
      title="Failed to load team"
      description="We couldn't load your team data. Please try again."
    />
  );
}
