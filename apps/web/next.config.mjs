/** @type {import('next').NextConfig} */
import { securityHeaders } from './next.security-headers.mjs';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const apiProxy =
      process.env.API_PROXY_URL?.trim() ||
      (process.env.NEXT_PUBLIC_API_URL?.startsWith('http')
        ? process.env.NEXT_PUBLIC_API_URL.trim()
        : '') ||
      'http://localhost:8000/api/v1';
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
};

export default nextConfig;
