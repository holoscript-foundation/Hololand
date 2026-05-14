/** @type {import('next').NextConfig} */
const path = require('node:path');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['via.placeholder.com', 'images.unsplash.com'],
  },
  async redirects() {
    return [
      {
        source: '/github',
        destination: 'https://github.com/brianonbased-dev/Hololand',
        permanent: false,
      },
      {
        source: '/discord',
        destination: 'https://discord.gg/hololand',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
