import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      events: path.resolve(__dirname, './src/compat/events.ts'),
      three: path.resolve(__dirname, '../../node_modules/.pnpm/three@0.159.0/node_modules/three'),
      '@holoscript/core/runtime': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser/runtime.ts'
      ),
      '@holoscript/core': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-core-browser'
      ),
      '@holoscript/agent-protocol': path.resolve(
        __dirname,
        '../hololand-central/src/compat/holoscript-agent-protocol-browser.ts'
      ),
    },
    dedupe: ['three'],
  },
  server: {
    fs: {
      allow: ['.', '../hololand-central/src/compat', '../../node_modules'],
    },
  },
});
