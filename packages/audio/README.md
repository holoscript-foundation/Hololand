# @hololand/audio

Spatial audio engine for Hololand - 3D positional sound, HRTF, voice chat, and audio effects.

## Features

- **3D Positional Audio**: Sound sources with realistic spatial positioning
- **HRTF Processing**: Head-Related Transfer Function for immersive VR audio
- **Voice Chat**: Real-time voice communication with spatial awareness
- **Audio Effects**: Reverb, echo, filters, and environmental audio
- **Ambient Soundscapes**: Background audio management

## Installation

```bash
pnpm add @hololand/audio
```

## Usage

```typescript
import { AudioEngine, SpatialAudio } from '@hololand/audio';

// Initialize audio engine
const engine = new AudioEngine({
  enableHRTF: true,
  maxSources: 32,
});

// Create spatial audio source
const source = engine.createSource({
  position: { x: 5, y: 1, z: -3 },
  rolloffFactor: 1.0,
  maxDistance: 50,
});

// Play sound with spatial positioning
await source.play('/sounds/ambient.mp3', { loop: true });

// Update listener position (player)
engine.setListenerPosition({ x: 0, y: 1.6, z: 0 });
engine.setListenerOrientation({ x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 });
```

## Voice Chat

```typescript
import { VoiceChat } from '@hololand/audio';

const voice = new VoiceChat({
  spatialEnabled: true,
  noiseReduction: true,
});

// Start voice chat
await voice.connect(roomId);

// Mute/unmute
voice.setMuted(false);

// Adjust volume of specific player
voice.setPlayerVolume(playerId, 0.8);
```

## API Reference

### AudioEngine

Core audio management.

- `createSource(options)` - Create positional audio source
- `setListenerPosition(pos)` - Update listener position
- `setMasterVolume(volume)` - Set global volume

### SpatialAudio

Individual audio source with spatial properties.

- `play(url, options?)` - Play audio file
- `stop()` - Stop playback
- `setPosition(pos)` - Update source position

## License

MIT © Hololand Team
