/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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
