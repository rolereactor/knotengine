import * as Sentry from "@sentry/node";

/**
 * Initializes Sentry error tracking.
 * No-ops silently when SENTRY_DSN is not set (local dev / self-hosted without Sentry).
 */
export function initSentry(version: string): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    release: `knotengine@${version}`,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    integrations: [Sentry.mongooseIntegration()],
  });

  console.log("🔭 Sentry initialized");
}

/**
 * Captures an exception with optional context.
 * Safe to call even if Sentry is not initialized.
 */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

export { Sentry };
