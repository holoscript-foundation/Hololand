import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Transpile workspace packages + ESM-only three/R3F deps for Next.js compatibility
  transpilePackages: [
    '@hololand/renderer',
    'three',
    '@react-three/fiber',
  ],

  // CORS headers for API routes (health, future telemetry)
  async headers() {
    return [
      {
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
