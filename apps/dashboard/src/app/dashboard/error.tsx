"use client";

import { DashboardError } from "@/components/error-boundary";

export default function DashboardErrorPage({
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
      title="Failed to load dashboard"
      description="We couldn't load your dashboard data. Please try again."
    />
  );
}
