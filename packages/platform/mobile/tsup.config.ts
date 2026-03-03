import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/native/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@capacitor/core',
    '@capacitor/camera',
    '@capacitor/haptics',
    '@capacitor/push-notifications',
    '@capacitor/keyboard',
    '@capacitor/splash-screen',
    '@capacitor/status-bar',
    '@capacitor/browser',
  ],
});
