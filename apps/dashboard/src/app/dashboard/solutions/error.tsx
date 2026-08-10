"use client";

import { DashboardError } from "@/components/error-boundary";

export default function SolutionsError({
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
      title="Failed to load solutions"
      description="We couldn't load your solutions. Please try again."
    />
  );
}
