"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

export function DashboardError({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
}: ErrorBoundaryProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      import(/* webpackIgnore: true */ "@sentry/nextjs")
        .then((m) => m.captureException(error))
        .catch(() => {});
    }
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-white/5 bg-zinc-900/30 p-8 text-center">
      <div className="bg-destructive/10 rounded-full p-3">
        <AlertCircle className="text-destructive size-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline" size="sm">
        Try Again
      </Button>
    </div>
  );
}
