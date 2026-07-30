/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
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
        destination: 'http://127.0.0.1:80/tunnel/:path*', // Route it through NGINX on the VPS
      }
    ];
  },
  async headers() {
    return [
      {
        // Telegram Login COOP header requirement (https://core.telegram.org/bots/telegram-login#22-cross-origin-opener-policy-coop-header-warning)
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
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
