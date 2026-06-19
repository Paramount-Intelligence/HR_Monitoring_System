/** @type {import('next').NextConfig} */
const isExport = process.env.EXPORT_STATIC === 'true';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss: ws:",
      "media-src 'self' blob: https:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

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
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders,
        },
      ];
    },
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