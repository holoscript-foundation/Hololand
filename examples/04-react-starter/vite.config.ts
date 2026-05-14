import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      events: path.resolve(__dirname, './src/compat/events.ts'),
      '@holoscript/r3f-renderer': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-r3f-renderer-browser.tsx'
      ),
      '@holoscript/agent-protocol': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-agent-protocol-browser.ts'
      ),
      '@holoscript/core/traits/simulation-solver-factory': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser/traits/simulation-solver-factory.ts'
      ),
      '@holoscript/core/traits/webcam-gaze': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser/traits/webcam-gaze.ts'
      ),
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
