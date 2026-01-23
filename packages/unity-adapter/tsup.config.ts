import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Skip DTS - has type issues to fix later
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
