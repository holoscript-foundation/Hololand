import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Alias peer dependencies that may not be built during tests
      '@hololand/world': path.resolve(__dirname, 'src/__tests__/__mocks__/world.ts'),
      // React is available in the pnpm store but not directly linked due to
      // a broken dependency in apps/brittney-mobile blocking pnpm install.
      // Resolve from the pnpm store until the broken dep is fixed.
      'react': path.resolve(__dirname, '../../../node_modules/.pnpm/react@18.3.1/node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom'),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
});
