import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true, // Allow network access for mobile testing
    https: false, // Set to true for production testing
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['@capacitor/core'],
  },
});
