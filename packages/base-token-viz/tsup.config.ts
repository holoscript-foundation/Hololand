import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/BaseTokenFetcher.ts',
    'src/HoloScriptGenerator.ts',
  ],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['@hololand/three-adapter', '@holoscript/core'],
});
