import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: ['three'],
    },
    resolve: {
        dedupe: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/xr'],
    },
    server: {
        port: 3000,
        open: true,
    },
});
