import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // DISABLED: DTS generation fails due to HoloScript v3.42.0 type export mismatch
  // Re-enable after migrating to new HoloScript API
  dts: false,
  clean: true,
  treeshake: true,
  external: [
    // Workspace dependencies - don't bundle, resolve at runtime
    '@hololand/audio',
    '@hololand/world',
    '@hololand/accessibility',
    '@hololand/network',
    '@hololand/renderer',
    '@hololand/ar-foundation',
    '@hololand/logger',
    // External dependencies
    '@holoscript/core',
  ],
});
