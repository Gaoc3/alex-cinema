/** @type {import('next').NextConfig} */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const tunnelProxyBaseUrl = (process.env.TUNNEL_PROXY_BASE_URL || 'http://127.0.0.1:80')
  .replace(/\/$/, '');

const nextConfig = {
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.shabakaty.com',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 't.me',
      },
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
        destination: `${tunnelProxyBaseUrl}/tunnel/:path*`,
      }
    ];
  },
  async headers() {
    return [
      {
        // Allow Telegram WebApp embedding across all platforms without breaking native mobile JS bridge
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.telegram.org https://telegram.org https://web.telegram.org https://oauth.telegram.org;",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
      {
        // Cache images and tunnels heavily
        source: '/tunnel/:path*',
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
