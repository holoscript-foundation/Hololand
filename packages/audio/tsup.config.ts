import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    spatial: 'src/SpatialAudioEngine.ts',
    voice: 'src/VoiceChat.ts',
    effects: 'src/AudioEffects.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  minify: false,
  external: [],
});
