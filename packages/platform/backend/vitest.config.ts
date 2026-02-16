import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    clearMocks: true,
    include: ['__tests__/**/*.test.ts'],
  },
});
