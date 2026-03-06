# @hololand/haptics

**Haptic feedback system for VR/AR controllers and wearables**

Comprehensive haptic feedback library for creating immersive touch sensations in virtual and augmented reality. Supports VR controllers, haptic gloves, wearables, and force feedback devices.

---

## Features

- ✅ **Vibration Patterns** - Pre-built and custom waveforms
- ✅ **Spatial Haptics** - Position-based intensity and directionality
- ✅ **Force Feedback** - Resistance and tension simulation
- ✅ **Multi-Device Support** - WebXR controllers, gamepads, haptic gloves
- ✅ **Pattern Builder** - Fluent API for complex haptic sequences
- ✅ **Finger-Level Control** - Individual finger haptics for gloves
- ✅ **Effect Library** - Pre-made effects (impact, texture, vibration)
- ✅ **Zero Dependencies** - Lightweight and performant

---

## Installation

```bash
pnpm add @hololand/haptics
```

---

## Quick Start

### Basic Vibration

```typescript
import { createHapticManager } from '@hololand/haptics';

// Create manager
const haptics = createHapticManager();

// Simple vibration on right controller
haptics.vibrate({
  hand: 'right',
  intensity: 0.8,  // 0.0 - 1.0
  duration: 200    // milliseconds
});
```

### Custom Patterns

```typescript
import { createPatternBuilder } from '@hololand/haptics';

// Build a pattern
const pattern = createPatternBuilder()
  .pulse(0.5, 100)    // 50% intensity for 100ms
  .wait(50)           // 50ms pause
  .pulse(1.0, 200)    // 100% intensity for 200ms
  .build();

// Play pattern on controller
haptics.playPattern(pattern, { hand: 'left' });
```

### Haptic Effects

```typescript
import { createEffectPlayer } from '@hololand/haptics';

const effects = createEffectPlayer(haptics);

// Impact effect (like hitting something)
effects.playImpact({
  hand: 'right',
  force: 0.7  // 70% force
});

// Texture effect (like rubbing sandpaper)
effects.playTexture({
  hand: 'both',
  roughness: 0.6,
  duration: 500
});

// Constant vibration
effects.playConstant({
  hand: 'left',
  intensity: 0.3,
  duration: 1000
});
```

---

## API Reference

### HapticManager

Main interface for haptic device management.

#### Methods

##### `vibrate(options)`

Simple vibration on a controller or hand.

```typescript
interface VibrateOptions {
  hand: 'left' | 'right' | 'both';
  intensity: number;  // 0.0 - 1.0
  duration: number;   // milliseconds
}

haptics.vibrate({
  hand: 'right',
  intensity: 0.8,
  duration: 200
});
```

##### `playPattern(pattern, options)`

Play a custom haptic pattern.

```typescript
const pattern = createPatternBuilder()
  .pulse(0.5, 100)
  .wait(50)
  .pulse(1.0, 200)
  .build();

haptics.playPattern(pattern, {
  hand: 'left',
  loop: false,
  speed: 1.0  // Playback speed multiplier
});
```

##### `stop(hand?)`

Stop all haptic feedback.

```typescript
// Stop on specific hand
haptics.stop('left');

// Stop on both hands
haptics.stop();
```

##### `isSupported()`

Check if haptic feedback is supported.

```typescript
if (haptics.isSupported()) {
  console.log('Haptics available!');
}
```

---

### HapticPatternBuilder

Fluent API for building haptic patterns.

```typescript
const builder = createPatternBuilder();

builder
  .pulse(intensity: number, duration: number)    // Single pulse
  .ramp(from: number, to: number, duration: number)  // Gradual change
  .sine(frequency: number, amplitude: number, duration: number)  // Sine wave
  .square(frequency: number, amplitude: number, duration: number)  // Square wave
  .triangle(frequency: number, amplitude: number, duration: number)  // Triangle wave
  .wait(duration: number)  // Pause
  .repeat(times: number)   // Repeat previous steps
  .build();  // Returns HapticPattern
```

#### Example Patterns

**Heartbeat**:
```typescript
const heartbeat = createPatternBuilder()
  .pulse(0.8, 80)
  .wait(100)
  .pulse(0.6, 60)
  .wait(600)
  .repeat(Infinity)  // Loop forever
  .build();
```

**Explosion**:
```typescript
const explosion = createPatternBuilder()
  .pulse(1.0, 50)    // Initial impact
  .ramp(0.8, 0.2, 400)  // Fading rumble
  .build();
```

**Engine Rumble**:
```typescript
const engine = createPatternBuilder()
  .sine(25, 0.3, Infinity)  // 25Hz continuous vibration
  .build();
```

---

### FingerHapticPatternBuilder

For devices with individual finger control (haptic gloves).

```typescript
const fingerPattern = createFingerPatternBuilder()
  .finger('thumb', { pulse: 0.5, duration: 100 })
  .finger('index', { pulse: 0.7, duration: 150 })
  .finger('middle', { pulse: 0.6, duration: 120 })
  .allFingers({ pulse: 1.0, duration: 200 })  // All fingers at once
  .build();

haptics.playFingerPattern(fingerPattern, { hand: 'right' });
```

---

### HapticEffectPlayer

Pre-built effects for common interactions.

```typescript
const effects = createEffectPlayer(haptics);
```

#### Methods

##### `playImpact(options)`

Physical impact sensation (hitting, colliding).

```typescript
effects.playImpact({
  hand: 'right',
  force: 0.7,     // 0.0 - 1.0
  duration: 100   // Optional (default: 50ms)
});
```

##### `playTexture(options)`

Surface texture sensation (rough, smooth, bumpy).

```typescript
effects.playTexture({
  hand: 'left',
  roughness: 0.6,  // 0.0 (smooth) - 1.0 (rough)
  duration: 500
});
```

##### `playConstant(options)`

Steady vibration.

```typescript
effects.playConstant({
  hand: 'both',
  intensity: 0.4,
  duration: 2000
});
```

##### `playClick(options)`

Button click sensation.

```typescript
effects.playClick({
  hand: 'right',
  intensity: 0.5
});
```

##### `playNotification(options)`

Attention-grabbing notification.

```typescript
effects.playNotification({
  hand: 'both',
  urgency: 'low' | 'medium' | 'high'
});
```

---

### Device Adapters

Support for different haptic devices.

#### WebXRControllerAdapter

For WebXR VR controllers (Quest, Index, Vive, etc.).

```typescript
import { WebXRControllerAdapter } from '@hololand/haptics';

const adapter = new WebXRControllerAdapter(xrSession);
haptics.registerDevice(adapter);
```

#### GamepadAdapter

For gamepads with rumble (Xbox, PlayStation controllers).

```typescript
import { GamepadAdapter } from '@hololand/haptics';

const adapter = new GamepadAdapter();
haptics.registerDevice(adapter);
```

#### Custom Adapter

Create your own for proprietary hardware.

```typescript
import { HapticDeviceAdapter } from '@hololand/haptics';

class MyGloveAdapter extends HapticDeviceAdapter {
  async vibrate(hand, intensity, duration) {
    // Send commands to your device
    await this.sendCommand(`VIBRATE:${hand}:${intensity}:${duration}`);
  }

  isSupported() {
    return this.checkDeviceConnection();
  }
}

haptics.registerDevice(new MyGloveAdapter());
```

---

## Advanced Usage

### Spatial Haptics

Haptic intensity based on object distance/direction.

```typescript
function updateSpatialHaptics(playerPos, objectPos) {
  const distance = calculateDistance(playerPos, objectPos);
  const intensity = 1.0 / (distance + 1);  // Inverse distance

  if (distance < 5) {  // Within 5 units
    haptics.vibrate({
      hand: 'both',
      intensity: Math.min(intensity, 1.0),
      duration: 50
    });
  }
}
```

### Directional Haptics

Different patterns for left/right direction.

```typescript
function playDirectionalHit(direction: 'left' | 'right') {
  if (direction === 'left') {
    haptics.vibrate({ hand: 'left', intensity: 1.0, duration: 100 });
  } else {
    haptics.vibrate({ hand: 'right', intensity: 1.0, duration: 100 });
  }
}
```

### Synchronized Haptics

Match haptics with audio/visual events.

```typescript
// Sync with footstep sound
audio.on('footstep', () => {
  haptics.vibrate({
    hand: 'both',
    intensity: 0.3,
    duration: 50
  });
});

// Sync with visual explosion
effects.playExplosion(() => {
  haptics.playPattern(explosionPattern, { hand: 'both' });
});
```

---

## Use Cases

### Gaming

```typescript
// Weapon recoil
gun.on('fire', () => {
  haptics.playPattern(recoilPattern, { hand: 'right' });
});

// Health warning
player.on('lowHealth', () => {
  effects.playNotification({ hand: 'both', urgency: 'high' });
});
```

### UI Interactions

```typescript
// Button hover
button.on('hover', () => {
  effects.playClick({ hand: 'right', intensity: 0.2 });
});

// Menu selection
menu.on('select', () => {
  effects.playClick({ hand: 'right', intensity: 0.5 });
});
```

### Training Simulations

```typescript
// Surgery simulation - tool feedback
scalpel.on('contact', (tissue) => {
  effects.playTexture({
    hand: 'right',
    roughness: tissue.resistance,
    duration: Infinity  // Continuous while touching
  });
});

scalpel.on('release', () => {
  haptics.stop('right');
});
```

### Accessibility

```typescript
// Haptic navigation cues for blind users
navigation.on('obstacle', (direction) => {
  if (direction === 'front') {
    effects.playNotification({ hand: 'both', urgency: 'high' });
  } else if (direction === 'left') {
    effects.playNotification({ hand: 'left', urgency: 'medium' });
  }
});
```

---

## Browser Support

| Browser | WebXR Haptics | Gamepad Haptics |
|---------|---------------|-----------------|
| **Chrome/Edge** | ✅ Yes | ✅ Yes |
| **Firefox** | ✅ Yes | ✅ Yes |
| **Safari** | ❌ No (no WebXR) | ✅ Yes |

**Note**: Haptic support varies by device. Always check `haptics.isSupported()`.

---

## Device Support

| Device | Support | Features |
|--------|---------|----------|
| **Meta Quest 2/3** | ✅ Full | Controller vibration |
| **Valve Index** | ✅ Full | Controller vibration + finger tracking |
| **HTC Vive** | ✅ Full | Controller vibration |
| **PlayStation VR** | ✅ Full | Controller vibration |
| **Haptic Gloves** | ⚠️ Adapter needed | Finger-level haptics |
| **Xbox/PS Controllers** | ✅ Full | Dual-motor rumble |

---

## Best Practices

### Performance

```typescript
// ❌ Bad - Too frequent
setInterval(() => {
  haptics.vibrate({ hand: 'right', intensity: 0.5, duration: 10 });
}, 10);  // Every 10ms is excessive

// ✅ Good - Reasonable frequency
setInterval(() => {
  haptics.vibrate({ hand: 'right', intensity: 0.5, duration: 50 });
}, 100);  // Every 100ms
```

### Intensity Guidelines

- **Subtle feedback** (UI): 0.1 - 0.3
- **Normal interaction**: 0.4 - 0.6
- **Strong events** (impacts): 0.7 - 0.9
- **Maximum** (rare): 1.0

### Duration Guidelines

- **Click/tap**: 10-30ms
- **Impact**: 50-100ms
- **Notification**: 200-500ms
- **Continuous** (texture): Use pattern loops

### Accessibility

- Always provide option to disable haptics
- Don't rely solely on haptics for important feedback
- Use intensity scaling for user comfort preferences

```typescript
// User preference support
const userIntensity = getUserPreference('hapticIntensity', 1.0);  // 0.0 - 1.0

haptics.vibrate({
  hand: 'right',
  intensity: 0.8 * userIntensity,  // Scale by preference
  duration: 100
});
```

---

## Examples

See [examples/haptics](../../../examples/haptics) for complete demos:
- Basic vibration
- Custom patterns
- Spatial haptics
- Game integration
- UI feedback

---

## TypeScript

Full TypeScript support with complete type definitions:

```typescript
import type {
  HapticPattern,
  VibrateOptions,
  HapticDevice,
  FingerHapticOptions
} from '@hololand/haptics';

// Type-safe pattern building
const pattern: HapticPattern = createPatternBuilder()
  .pulse(0.5, 100)
  .build();

// Type-safe options
const options: VibrateOptions = {
  hand: 'right',
  intensity: 0.8,
  duration: 200
};
```

---

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

---

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).

**Areas we'd love help with**:
- New haptic pattern recipes
- Device adapter implementations
- Performance optimizations
- Documentation improvements

---

## License

Elastic License 2.0 - See [LICENSE](../../../LICENSE)

---

## Related Packages

- [@hololand/gestures](../gestures) - Hand and body gesture recognition
- [@hololand/voice](../voice) - Voice commands and speech
- [@hololand/audio](../audio) - 3D spatial audio
- [@hololand/renderer](../renderer) - VR/AR rendering

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
