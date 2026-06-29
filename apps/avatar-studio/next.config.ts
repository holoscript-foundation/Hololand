import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),

  // Transpile workspace packages
  transpilePackages: ['@hololand/avatar-studio'],

  // Headers for postMessage / iframe embedding
  async headers() {
    return [
      {
        // Allow embedding in iframes from any origin (SDK integration)
        source: '/embed',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;",
          },
        ],
      },
      {
        // CORS headers for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-App-ID, X-User-Token' },
        ],
      },
    ];
  },
};

export default nextConfig;
