/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
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
    ],
  },
  async rewrites() {
    const tunnelBase = process.env.TUNNEL_BASE_URL || 'https://cinemanamtsky001.serveousercontent.com';
    const base = tunnelBase.replace(/\/cgi-bin\/proxy\?url=$/, '').replace(/\/$/, '');
    return [
      {
        source: '/tunnel/:path*',
        destination: `${base}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/((?!tunnel/).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
