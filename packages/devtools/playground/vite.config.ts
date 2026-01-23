/**
 * Vite Configuration - HoloScript Playground
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@styles': path.resolve(__dirname, './src/styles'),
      // Point to sibling repos and local packages
      '@holoscript/core': path.resolve(__dirname, '../../../../HoloScript/packages/core/dist/index.js'),
      '@hololand/core': path.resolve(__dirname, '../../platform/core/dist/index.mjs'),
      '@hololand/logger': path.resolve(__dirname, '../../platform/logger/dist/index.mjs'),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco': ['monaco-editor'],
          'three': ['three'],
          'react': ['react', 'react-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'monaco-editor', 'three'],
    esbuildOptions: {
      alias: {
        '@holoscript/core': path.resolve(__dirname, '../../../../HoloScript/packages/core/dist/index.js'),
        '@hololand/core': path.resolve(__dirname, '../../platform/core/dist/index.mjs'),
        '@hololand/logger': path.resolve(__dirname, '../../platform/logger/dist/index.mjs'),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
