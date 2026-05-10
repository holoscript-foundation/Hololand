import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
    port: 3000,
    open: true,
    fs: {
      allow: ['.', '../hololand-central/src/compat', '../../node_modules'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
