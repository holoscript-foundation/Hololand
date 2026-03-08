import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hololand/platform-renderer': path.resolve(__dirname, '../../renderer/src'),
      '@hololand/platform': path.resolve(__dirname, '../../core/src'),
      '@hololand/holoscript-runtime': path.resolve(__dirname, '../../../holoscript/runtime/src'),
    },
  },
  publicDir: 'models',
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
