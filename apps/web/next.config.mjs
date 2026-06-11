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
      const apiProxy = process.env.API_PROXY_URL || 'http://localhost:8000/api/v1';
      const apiOrigin = apiProxy.replace(/\/api\/v1\/?$/, '');
      return [
        {
          source: '/api/v1/:path*',
          destination: `${apiProxy}/:path*`,
        },
        {
          source: '/media/profile-pictures/:path*',
          destination: `${apiOrigin}/media/profile-pictures/:path*`,
        },
        {
          source: '/api/v1/media/profile-pictures/:path*',
          destination: `${apiProxy}/media/profile-pictures/:path*`,
        },
      ];
    },
  })
};

export default nextConfig;