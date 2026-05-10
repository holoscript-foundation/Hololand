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
    port: 5173,
    open: true,
    fs: {
      allow: ['.', '../hololand-central/src/compat', '../../node_modules'],
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  optimizeDeps: {
    include: ['three'],
  },
});
