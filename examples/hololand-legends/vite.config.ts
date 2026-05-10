import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@holoscript/core/runtime': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser/runtime.ts'
      ),
      '@holoscript/core': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser'
      ),
    },
  },
  server: {
    fs: {
      allow: ['.', '../hololand-central/src/compat', '../../node_modules'],
    },
  },
});
