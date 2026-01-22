import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three'],
    exclude: ['@hololand/world'],
  },
  resolve: {
    alias: {
      '@hololand/world': path.resolve(__dirname, '../../packages/world/src/index.ts'),
    },
    dedupe: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/xr'],
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: [
        '.',
        '../../packages/world',
        '../../node_modules',
      ],
    },
  },
});
