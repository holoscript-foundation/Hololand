import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      events: path.resolve(__dirname, './src/compat/events.ts'),
      '@holoscript/core/runtime': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser/runtime.ts'
      ),
      '@holoscript/core': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser'
      ),
    },
    dedupe: ['three'],
  },
  server: {
    fs: {
      allow: ['.', '../hololand-central/src/compat', '../../packages', '../../node_modules'],
    },
  },
});
