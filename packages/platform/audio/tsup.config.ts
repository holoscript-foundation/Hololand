import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    spatial: 'src/SpatialAudioEngine.ts',
    voice: 'src/VoiceChat.ts',
    effects: 'src/AudioEffects.ts',
  },
  format: ['cjs', 'esm'],
  dts: false, // TODO: Enable once @hololand/core types are complete
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  minify: false,
  external: ['@holoscript/core', '@hololand/core', 'three'],
});
