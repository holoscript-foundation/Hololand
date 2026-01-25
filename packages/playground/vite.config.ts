import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  server: {
    port: 5173,
    open: true,
  },
  
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'HoloScriptPlayground',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          three: 'THREE',
        },
      },
    },
  },
  
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', 'monaco-editor'],
  },
});
