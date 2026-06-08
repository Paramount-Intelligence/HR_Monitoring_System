/** @type {import('next').NextConfig} */
const isExport = process.env.EXPORT_STATIC === 'true';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(isExport ? {
    output: 'export',
    images: {
      unoptimized: true,
    },
  } : {
    async rewrites() {
      return [
        {
          source: '/api/v1/:path*',
          destination: `${process.env.API_PROXY_URL || 'https://hrmonitoringsystem-production.up.railway.app/api/v1'}/:path*`,
        },
      ];
    },
  })
};

export default nextConfig;