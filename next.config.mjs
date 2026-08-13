// v3 — locks down image hosts (audit L-1) and adds security headers (audit M-1)

// Durable Medusa uploads via S3-compatible object storage (R2/S3). Set
// NEXT_PUBLIC_MEDUSA_IMAGE_HOST to the bucket's public host (e.g.
// files.impactperfumes.com or <bucket>.<account>.r2.dev) once storage is live,
// and Next/Image will serve those images. No-op until the var is set.
const mediaHost = process.env.NEXT_PUBLIC_MEDUSA_IMAGE_HOST
const mediaPattern = mediaHost
  ? [{ protocol: "https", hostname: mediaHost }]
  : []

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Medusa product images — pinned to the exact Railway host
      { protocol: "https", hostname: "impact-perfumes-medusa-production.up.railway.app" },
      // Medusa product images — local dev server
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" },
      // Durable Medusa uploads on object storage (R2/S3), when configured.
      ...mediaPattern,
    ],
  },
  async headers() {
    // Defence-in-depth headers applied to every response. CSP starts in
    // report-only so we can tighten the directives after a week or two of
    // real traffic before enforcing.
    const csp = [
      "default-src 'self'",
      "img-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://js.stripe.com https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "frame-src https://*.paystack.com https://*.paystack.co https://js.stripe.com https://*.stripe.com https://*.stripe.network",
      "connect-src 'self' https://api.paystack.co https://api.stripe.com https://*.up.railway.app https://cdn.sanity.io https://*.apicdn.sanity.io https://*.api.sanity.io https://*.sanity.io https://api.resend.com",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
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
          { key: 'Content-Security-Policy-Report-Only', value: csp },
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
