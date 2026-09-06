/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  generateBuildId: async () => process.env.NEXT_BUILD_ID || 'development',
  images: {
    // Optimiser serves AVIF/WebP from our own origin, which stays inside the
    // `img-src 'self' data:` CSP. Sizes match the layout's real breakpoints.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [420, 640, 828, 1080, 1280, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000,
  },
  turbopack: { root: __dirname },
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy package slugs that were renamed - keep the 301s so indexed URLs survive.
      {
        source: '/packages/advance-cardiac-package',
        destination: '/packages/advanced-cardiac-package',
        permanent: true,
      },
      {
        source: '/packages/basic-cardiac-package',
        destination: '/packages/cardiac-package',
        permanent: true,
      },
      {
        source: '/packages/diabetes-management-package',
        destination: '/packages/diabetic-package',
        permanent: true,
      },
      {
        source: '/packages/full-body-checkup',
        destination: '/packages/full-body-check-up-package',
        permanent: true,
      },
      // Consolidated in 2026: 17 public pages became 6 hubs. Each retired URL
      // keeps a permanent redirect to the section that absorbed its content.
      {
        source: '/about',
        destination: '/',
        permanent: true,
      },
      {
        source: '/explore',
        destination: '/health',
        permanent: true,
      },
      {
        source: '/facilities',
        destination: '/care',
        permanent: true,
      },
      {
        source: '/packages',
        destination: '/care',
        permanent: true,
      },
      {
        source: '/health-resources',
        destination: '/health',
        permanent: true,
      },
      {
        source: '/videos',
        destination: '/health#videos',
        permanent: true,
      },
      {
        source: '/tools',
        destination: '/health#calculators',
        permanent: true,
      },
      {
        source: '/publications',
        destination: '/health#research',
        permanent: true,
      },
      {
        source: '/privacy/rights',
        destination: '/legal#data-request',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/legal#privacy',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/legal#terms',
        permanent: true,
      },
      // Booking, payment and intake flows were removed from the public site.
      // Send each removed URL to the page that now serves that intent.
      {
        source: '/book-appointment/:path*',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/book-package/:path*',
        destination: '/care',
        permanent: true,
      },
      {
        source: '/build-package/:path*',
        destination: '/care',
        permanent: true,
      },
      {
        source: '/payment/:path*',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/intake/:path*',
        destination: '/contact',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
