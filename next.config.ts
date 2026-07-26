import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Security headers — instruct the browser to enforce protections app code
// can't guarantee on its own. CSP is deliberately not maximally strict
// (allows 'unsafe-inline' for styles, since Tailwind/Next inject inline
// style tags) — a stricter policy would need nonce-based style injection,
// which is real extra work for a marginal gain on a demo-scale app.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} wss://*.supabase.co *.ingest.us.sentry.io`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Source map upload is a no-op without SENTRY_AUTH_TOKEN set (not present in
// this project) — withSentryConfig just skips it and warns, doesn't fail
// the build. `silent` keeps that warning out of normal build output.
export default withSentryConfig(nextConfig, {
  silent: true,
});
