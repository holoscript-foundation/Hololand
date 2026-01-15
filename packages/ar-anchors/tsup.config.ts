import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/detectors/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@hololand/logger'],
});
