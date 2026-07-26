import * as Sentry from "@sentry/nextjs";

// Client-side init — DSNs are safe to expose (they're a write-only endpoint
// with domain scoping, not a secret), so NEXT_PUBLIC_ is correct here.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
