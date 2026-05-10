import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', 'three', '@hololand/world', '@hololand/renderer', '@hololand/audio'],
  target: 'es2020',
});
