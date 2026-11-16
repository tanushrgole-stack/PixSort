/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [390, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },

  // ── Tree-shake heavy packages ─────────────────────────────────────────────
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // ── HTTP cache headers ────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Cache read-heavy event API responses at edge for 60 s
        source: '/api/events/:path*/all-photos',
        headers: [{ key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/events/:path*/most-loved',
        headers: [{ key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/events/:path*/people',
        headers: [{ key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/events/:path*/top-picks',
        headers: [{ key: 'Cache-Control', value: 's-maxage=120, stale-while-revalidate=600' }],
      },
      // Static public assets — 1 year immutable
      {
        source: '/:all*(svg|png|jpg|jpeg|webp|avif|gif|ico|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
