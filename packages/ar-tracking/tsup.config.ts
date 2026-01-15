import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/server/index.ts',
    'src/client/index.ts',
    'src/holoscript/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['@hololand/core', '@hololand/network', '@hololand/logger'],
});
