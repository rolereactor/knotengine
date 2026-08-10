"use client";

import { DashboardError } from "@/components/error-boundary";

export default function LinksError({
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
      title="Failed to load links"
      description="We couldn't load your payment links. Please try again."
    />
  );
}
