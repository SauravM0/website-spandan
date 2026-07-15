/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  turbopack: { root: __dirname },
  devIndicators: false,
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
