import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Alias peer dependencies that may not be built during tests
      '@hololand/world': path.resolve(__dirname, 'src/__tests__/__mocks__/world.ts'),
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
