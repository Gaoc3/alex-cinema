/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
    localPatterns: [
      {
        pathname: '/api/proxy',
      },
      {
        pathname: '/tunnel/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/tunnel/:path*',
        destination: 'http://127.0.0.1:80/tunnel/:path*', // Route it through NGINX on the VPS
      }
    ];
  },
  async headers() {
    return [
      {
        // Cache images and tunnels heavily
        source: '/tunnel/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Cache API images heavily
        source: '/api/img',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400',
          },
        ],
      }
    ];
  },
};

module.exports = nextConfig;
