import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // @holoscript/core requires @coinbase/agentkit which is not installed in
      // the Hololand workspace. Redirect to a minimal stub so animation tests
      // can load EmotionDirectiveProcessor without the full dependency chain.
      '@holoscript/core': path.resolve(__dirname, 'src/__mocks__/holoscript-core.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
