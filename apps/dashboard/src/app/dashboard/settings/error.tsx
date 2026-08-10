"use client";

import { DashboardError } from "@/components/error-boundary";

export default function SettingsError({
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
      title="Failed to load settings"
      description="We couldn't load your settings. Please try again."
    />
  );
}
