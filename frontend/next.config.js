/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  generateBuildId: async () => process.env.NEXT_BUILD_ID || 'development',
  images: { unoptimized: true },
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
    ];
  },
};

module.exports = nextConfig;
