import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/blazepose/index.ts',
    'src/mediapipe/index.ts',
    'src/depth/index.ts',
  ],
  format: ['esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    '@tensorflow/tfjs',
    '@tensorflow-models/pose-detection',
  ],
});
