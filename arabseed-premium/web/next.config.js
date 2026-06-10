/** @type {import('next').NextConfig} */
const nextConfig = {
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
        search: '',
      },
    ],
  },
};

module.exports = nextConfig;
