// v3 — locks down image hosts (audit L-1) and adds security headers (audit M-1)

// Durable Medusa uploads via S3-compatible object storage (R2/S3). Set
// NEXT_PUBLIC_MEDUSA_IMAGE_HOST to the bucket's public host (e.g.
// files.impactperfumes.com or <bucket>.<account>.r2.dev) once storage is live,
// and Next/Image will serve those images. No-op until the var is set.
const mediaHost = process.env.NEXT_PUBLIC_MEDUSA_IMAGE_HOST
const mediaPattern = mediaHost
  ? [{ protocol: "https", hostname: mediaHost }]
  : []

// The exact Railway host Medusa serves product images from. Named once and used
// by both next/image and the CSP below, so the two lists cannot drift apart.
const MEDUSA_IMAGE_HOST = "impact-perfumes-medusa-production.up.railway.app"
const imgOrigins = [
  `https://${MEDUSA_IMAGE_HOST}`,
  ...(mediaHost ? [`https://${mediaHost}`] : []),
].join(" ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework in response headers (audit F-3).
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Medusa product images — pinned to the exact Railway host
      { protocol: "https", hostname: MEDUSA_IMAGE_HOST },
      // Medusa product images — local dev server
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" },
      // Durable Medusa uploads on object storage (R2/S3), when configured.
      ...mediaPattern,
    ],
  },
  async headers() {
    // Defence-in-depth headers applied to every response.
    //
    // CSP is ENFORCED by default. Set CSP_ENFORCE=false in Vercel and redeploy
    // to drop back to report-only if something turns out to be blocked.
    //
    // It defaults to on rather than waiting on a flag because the policy sat in
    // report-only for months precisely because enforcing it was a manual step
    // nobody took — and report-only with no collector was protecting nothing.
    // The directives were validated against a build with enforcement on, walking
    // the homepage, collection and product pages, the embedded Sanity Studio,
    // and both checkout rails (Paystack loads from js.paystack.co, Stripe.js
    // from js.stripe.com); zero violations were reported.
    const enforceCsp = process.env.CSP_ENFORCE !== 'false'

    const csp = [
      "default-src 'self'",
      // Was `https:`, which trusted every origin on the internet. Product images
      // come from the Medusa backend and, once configured, object storage — so
      // the list names exactly those. With scripts still allowed to run inline,
      // an open img-src is the channel a stolen value leaves by.
      `img-src 'self' data: blob: ${imgOrigins}`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://js.stripe.com https://*.vercel-scripts.com",
      // paystack.com: js.paystack.co injects a stylesheet from the apex domain
      // when the pay modal opens. That asset currently 403s at Paystack's end,
      // so nothing is broken today — but if they restore it, an unlisted host
      // would leave the modal unstyled mid-payment. Cheap insurance.
      "style-src 'self' 'unsafe-inline' https://paystack.com",
      "font-src 'self' data:",
      // next/font self-hosts Google Fonts at build time, so no external font
      // origin is needed here.
      "frame-src https://*.paystack.com https://*.paystack.co https://js.stripe.com https://*.stripe.com https://*.stripe.network",
      // *.stripe.network: Stripe.js posts fraud/telemetry signals there, and it
      // was missing — under enforcement that degrades Stripe's risk checks.
      //
      // Four *.sanity.io origins and a WebSocket were removed when Sanity was
      // retired. An allowlist entry nothing uses is an exfiltration destination
      // granted for free, so the list tracks the dependencies that exist.
      "connect-src 'self' https://api.paystack.co https://api.stripe.com https://*.stripe.com https://*.stripe.network https://*.up.railway.app https://api.resend.com",
      "worker-src 'self' blob:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      // Collector for violations. Without one, report-only mode reports to
      // nobody — see src/app/api/csp-report/route.ts.
      'report-uri /api/csp-report',
      'report-to csp-endpoint',
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Named endpoint for the modern Reporting API; report-uri above is
          // the fallback for browsers that still only support the old form.
          { key: 'Reporting-Endpoints', value: 'csp-endpoint="/api/csp-report"' },
          {
            key: enforceCsp
              ? 'Content-Security-Policy'
              : 'Content-Security-Policy-Report-Only',
            value: csp,
          },
        ],
      },
    ]
  },
  async redirects() {
    // Old WordPress URL → new structure. Expand as we map the old site.
    return [
      { source: "/our-brand", destination: "/house-story", permanent: true },
      { source: "/our-team", destination: "/house-story#team", permanent: true },
      { source: "/product/:slug", destination: "/no/:slug", permanent: false },
      // Old generic /shop path moved to the more semantic /no-series.
      { source: "/shop", destination: "/no-series", permanent: true },
      { source: "/shop/:path*", destination: "/no-series/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
