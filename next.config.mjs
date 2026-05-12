// v2 — adds NEXT_PUBLIC_MEDUSA_BACKEND_URL env var support
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Medusa product images — Railway (all subdomain depths)
      { protocol: "https", hostname: "**.railway.app" },
      { protocol: "https", hostname: "**.up.railway.app" },
      // Medusa product images — local dev server
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000" },
    ],
  },
  async redirects() {
    // Old WordPress URL → new structure. Expand as we map the old site.
    return [
      { source: "/our-brand", destination: "/house-story", permanent: true },
      { source: "/our-team", destination: "/house-story#team", permanent: true },
      { source: "/product/:slug", destination: "/no/:slug", permanent: false },
    ];
  },
};

export default nextConfig;
