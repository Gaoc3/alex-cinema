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
    const tunnelBase = process.env.TUNNEL_BASE_URL || 'http://64.225.99.144';
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
      },
      {
        // Default API cache (15 minutes)
        source: '/api/proxy',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=900, s-maxage=900, stale-while-revalidate=300',
          },
        ],
      }
    ];
  },
};

module.exports = nextConfig;
