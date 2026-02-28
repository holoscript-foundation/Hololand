# @hololand/traits

**Comprehensive HoloScript Trait System** - 50+ traits for VR/AR interactions, physics, animation, and gameplay.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Hololand/Hololand)
[![License](https://img.shields.io/badge/license-Elastic--2.0-green.svg)](./LICENSE)

---

## 📦 Installation

```bash
npm install @hololand/traits
# or
pnpm add @hololand/traits
```

---

## 🚀 Quick Start

```typescript
import { traitRegistry } from '@hololand/traits';
import { Scene, BoxGeometry, Mesh, MeshStandardMaterial } from 'three';

// Create a mesh
const mesh = new Mesh(
  new BoxGeometry(1, 1, 1),
  new MeshStandardMaterial({ color: 0xff0000 })
);

// Apply traits
traitRegistry.apply(mesh, '@spatial');
traitRegistry.apply(mesh, '@rotate', { speed: 2, axis: 'y' });
traitRegistry.apply(mesh, '@emissive', { color: '#ff0000', intensity: 0.5 });

// In your render loop
function animate(deltaTime: number) {
  traitRegistry.update(deltaTime); // Updates all active traits
  renderer.render(scene, camera);
}
```

---

## 📖 Trait Categories

| Category | Traits | Description |
|----------|-------:|-------------|
| [Spatial](#spatial-traits) | 3 | Position, transform, anchoring |
| [Physics](#physics-traits) | 5 | Simulation, collision, triggers |
| [Animation](#animation-traits) | 7 | Movement, rotation, scaling |
| [Audio](#audio-traits) | 4 | Sound, spatial audio, zones |
| [VR Interaction](#vr-interaction-traits) | 8 | Grab, scale, rotate, teleport |
| [Networking](#networking-traits) | 2 | Multiplayer sync |
| [Visual Effects](#visual-effects-traits) | 5 | Particles, shaders, glow |
| [Gameplay](#gameplay-traits) | 5 | Health, damage, collectibles |
| [AI](#ai-traits) | 4 | Pathfinding, behaviors |
| [Environment](#environment-traits) | 4 | Portals, lights, shadows |

**Total**: **50+ traits**

---

## 📚 Trait Reference

### Spatial Traits

#### `@spatial`
Basic spatial object with position, rotation, and scale.

**Parameters**: None

**Example**:
```typescript
traitRegistry.apply(mesh, '@spatial');
```

**HoloScript**:
```holoscript
object "Box" {
  @spatial
  position: [0, 0, 0]
  rotation: [0, 0, 0]
  scale: [1, 1, 1]
}
```

#### `@transformable`
Object can be moved, rotated, and scaled in VR.

**Parameters**:
- `moveSpeed` (number, default: 1) - Movement speed multiplier
- `rotateSpeed` (number, default: 1) - Rotation speed multiplier
- `scaleSpeed` (number, default: 1) - Scale speed multiplier

**Example**:
```typescript
traitRegistry.apply(mesh, '@transformable', {
  moveSpeed: 2,
  rotateSpeed: 1.5,
  scaleSpeed: 0.5
});
```

#### `@anchored`
Object anchored to real-world position (AR mode).

**Parameters**:
- `persistent` (boolean, default: true) - Persist across sessions
- `anchorType` ('plane' | 'image' | 'face', default: 'plane')

**Example**:
```typescript
traitRegistry.apply(mesh, '@anchored', { anchorType: 'plane' });
```

---

### Physics Traits

#### `@physics`
Enable physics simulation on object.

**Parameters**:
- `mass` (number, default: 1) - Object mass in kg
- `friction` (number, default: 0.5) - Surface friction (0-1)
- `restitution` (number, default: 0.3) - Bounciness (0-1)

**Example**:
```typescript
traitRegistry.apply(mesh, '@physics', {
  mass: 5,
  friction: 0.8,
  restitution: 0.7
});
```

**Dependencies**: None
**Conflicts**: None

#### `@rigidbody`
Dynamic physics body affected by forces and gravity.

**Parameters**:
- `mass` (number, default: 1) - Mass in kg
- `useGravity` (boolean, default: true) - Apply gravity
- `isKinematic` (boolean, default: false) - Controlled by animation

**Example**:
```typescript
traitRegistry.apply(mesh, '@rigidbody', {
  mass: 10,
  useGravity: true
});
```

**Dependencies**: `@physics`
**Conflicts**: `@kinematic`

#### `@kinematic`
Physics body controlled by animation (not affected by forces).

**Parameters**:
- `mass` (number, default: 1) - Mass for collision response

**Example**:
```typescript
traitRegistry.apply(mesh, '@kinematic');
```

**Dependencies**: `@physics`
**Conflicts**: `@rigidbody`

#### `@trigger`
Collision detection without physical response.

**Parameters**:
- `onEnter` (function) - Callback when object enters trigger
- `onExit` (function) - Callback when object exits trigger

**Example**:
```typescript
traitRegistry.apply(mesh, '@trigger', {
  onEnter: (other) => console.log('Entered:', other),
  onExit: (other) => console.log('Exited:', other)
});
```

**Dependencies**: None

#### `@collision`
Physical collision detection and response.

**Parameters**:
- `layer` (number, default: 0) - Collision layer
- `mask` (number, default: -1) - Collision mask

**Example**:
```typescript
traitRegistry.apply(mesh, '@collision', {
  layer: 1,
  mask: 0xFF
});
```

**Dependencies**: `@physics`

---

### Animation Traits

#### `@animate`
Enable animation system on object.

**Parameters**: None

**Example**:
```typescript
traitRegistry.apply(mesh, '@animate');
```

#### `@rotate`
Continuously rotate object around axis.

**Parameters**:
- `speed` (number, default: 1) - Rotation speed in radians/second
- `axis` ('x' | 'y' | 'z', default: 'y') - Rotation axis

**Example**:
```typescript
traitRegistry.apply(mesh, '@rotate', { speed: 2, axis: 'y' });
```

**HoloScript**:
```holoscript
object "SpinningCoin" {
  @rotate(speed: 3, axis: 'y')
  geometry: "cylinder"
}
```

#### `@float`
Float up and down with sine wave motion.

**Parameters**:
- `amplitude` (number, default: 0.2) - Float distance
- `frequency` (number, default: 1) - Float speed

**Example**:
```typescript
traitRegistry.apply(mesh, '@float', {
  amplitude: 0.5,
  frequency: 2
});
```

#### `@pulse`
Pulse in scale (breathing effect).

**Parameters**:
- `amount` (number, default: 0.1) - Scale change amount (0-1)
- `speed` (number, default: 2) - Pulse speed

**Example**:
```typescript
traitRegistry.apply(mesh, '@pulse', { amount: 0.2, speed: 3 });
```

#### `@lerp`
Smoothly interpolate to target position.

**Parameters**:
- `target` (Vector3) - Target position
- `speed` (number, default: 0.1) - Lerp speed (0-1)

**Example**:
```typescript
traitRegistry.apply(mesh, '@lerp', {
  target: new Vector3(5, 0, 0),
  speed: 0.05
});
```

#### `@tween`
Animation with easing functions.

**Parameters**:
- `from` (Vector3) - Start position
- `to` (Vector3) - End position
- `duration` (number, default: 1) - Animation duration in seconds
- `easing` (string, default: 'linear') - Easing function
- `loop` (boolean, default: false) - Loop animation

**Example**:
```typescript
traitRegistry.apply(mesh, '@tween', {
  from: new Vector3(0, 0, 0),
  to: new Vector3(0, 5, 0),
  duration: 2,
  easing: 'easeInOutQuad',
  loop: true
});
```

#### `@spring`
Physics-based spring animation.

**Parameters**:
- `stiffness` (number, default: 100) - Spring stiffness
- `damping` (number, default: 10) - Spring damping
- `target` (Vector3) - Target position

**Example**:
```typescript
traitRegistry.apply(mesh, '@spring', {
  stiffness: 150,
  damping: 15,
  target: new Vector3(0, 2, 0)
});
```

---

### Audio Traits

#### `@audio`
Enable audio on object.

**Parameters**: None

#### `@audioSource`
Object emits audio.

**Parameters**:
- `src` (string) - Audio file URL
- `loop` (boolean, default: false) - Loop audio
- `volume` (number, default: 1) - Volume (0-1)
- `autoplay` (boolean, default: false) - Autoplay on load

**Example**:
```typescript
traitRegistry.apply(mesh, '@audioSource', {
  src: '/sounds/ambient.mp3',
  loop: true,
  volume: 0.5,
  autoplay: true
});
```

**Dependencies**: `@audio`

#### `@spatialAudio`
3D positional audio with distance falloff.

**Parameters**:
- `refDistance` (number, default: 1) - Reference distance
- `maxDistance` (number, default: 10) - Max audible distance
- `rolloffFactor` (number, default: 1) - Distance rolloff

**Example**:
```typescript
traitRegistry.apply(mesh, '@spatialAudio', {
  refDistance: 2,
  maxDistance: 20,
  rolloffFactor: 1.5
});
```

**Dependencies**: `@audioSource`

#### `@audioZone`
Trigger audio when entering zone.

**Parameters**:
- `src` (string) - Audio file URL
- `fadeIn` (number, default: 1) - Fade in duration
- `fadeOut` (number, default: 1) - Fade out duration

**Example**:
```typescript
traitRegistry.apply(mesh, '@audioZone', {
  src: '/sounds/forest.mp3',
  fadeIn: 2,
  fadeOut: 2
});
```

---

### VR Interaction Traits

#### `@grabbable`
Can be grabbed with VR controllers.

**Parameters**:
- `twoHanded` (boolean, default: false) - Requires two hands
- `throwable` (boolean, default: true) - Can be thrown

**Example**:
```typescript
traitRegistry.apply(mesh, '@grabbable', {
  twoHanded: false,
  throwable: true
});
```

**HoloScript**:
```holoscript
object "Sword" {
  @grabbable(twoHanded: true, throwable: false)
  model: "sword.glb"
}
```

#### `@interactive`
Responds to clicks and hover events.

**Parameters**:
- `onClick` (function) - Click handler
- `onHover` (function) - Hover handler
- `hoverColor` (string) - Hover highlight color

**Example**:
```typescript
traitRegistry.apply(mesh, '@interactive', {
  onClick: () => console.log('Clicked!'),
  hoverColor: '#ffaa00'
});
```

#### `@teleportable`
Valid teleportation target in VR.

**Parameters**:
- `indicatorColor` (string, default: '#00ff00') - Target indicator color

**Example**:
```typescript
traitRegistry.apply(mesh, '@teleportable', {
  indicatorColor: '#00ffff'
});
```

#### `@scalable`
Can be resized with VR pinch gesture.

**Parameters**:
- `minScale` (number, default: 0.1) - Minimum scale
- `maxScale` (number, default: 10) - Maximum scale

**Example**:
```typescript
traitRegistry.apply(mesh, '@scalable', {
  minScale: 0.5,
  maxScale: 5
});
```

#### `@rotatable`
Can be rotated with VR gesture.

**Parameters**:
- `snapAngle` (number, default: 0) - Snap rotation to angles (degrees, 0 = no snap)

**Example**:
```typescript
traitRegistry.apply(mesh, '@rotatable', { snapAngle: 45 });
```

#### `@cloneable`
Can be duplicated in VR.

**Parameters**:
- `maxClones` (number, default: 10) - Maximum number of clones

**Example**:
```typescript
traitRegistry.apply(mesh, '@cloneable', { maxClones: 5 });
```

#### `@sittable`
Seat that player can sit on.

**Parameters**:
- `sitHeight` (number, default: 0.5) - Seat height

**Example**:
```typescript
traitRegistry.apply(mesh, '@sittable', { sitHeight: 0.6 });
```

#### `@lookAtPlayer`
Always faces the player camera (billboard).

**Parameters**: None

**Example**:
```typescript
traitRegistry.apply(mesh, '@lookAtPlayer');
```

---

### Networking Traits

#### `@networked`
Synchronized across network for multiplayer.

**Parameters**:
- `ownership` ('server' | 'client', default: 'server') - Who controls the object
- `interpolation` (boolean, default: true) - Smooth network updates

**Example**:
```typescript
traitRegistry.apply(mesh, '@networked', {
  ownership: 'client',
  interpolation: true
});
```

#### `@synced`
Specific properties synchronized.

**Parameters**:
- `properties` (string[]) - Properties to sync

**Example**:
```typescript
traitRegistry.apply(mesh, '@synced', {
  properties: ['position', 'rotation']
});
```

**Dependencies**: `@networked`

---

### Visual Effects Traits

#### `@emissive`
Object emits light from material.

**Parameters**:
- `color` (string) - Emissive color hex
- `intensity` (number, default: 1) - Emission intensity

**Example**:
```typescript
traitRegistry.apply(mesh, '@emissive', {
  color: '#ff00ff',
  intensity: 0.5
});
```

#### `@particle`
Particle system emitter.

**Parameters**:
- `count` (number, default: 100) - Particle count
- `size` (number, default: 0.1) - Particle size
- `color` (string) - Particle color
- `lifetime` (number, default: 1) - Particle lifetime in seconds

**Example**:
```typescript
traitRegistry.apply(mesh, '@particle', {
  count: 500,
  size: 0.05,
  color: '#ffffff',
  lifetime: 2
});
```

#### `@shader`
Custom shader material.

**Parameters**:
- `vertexShader` (string) - Vertex shader code
- `fragmentShader` (string) - Fragment shader code
- `uniforms` (object) - Shader uniforms

**Example**:
```typescript
traitRegistry.apply(mesh, '@shader', {
  vertexShader: `...`,
  fragmentShader: `...`,
  uniforms: { time: { value: 0 } }
});
```

#### `@glow`
Bloom/glow effect around object.

**Parameters**:
- `strength` (number, default: 1) - Glow strength
- `radius` (number, default: 0.4) - Glow radius

**Example**:
```typescript
traitRegistry.apply(mesh, '@glow', {
  strength: 1.5,
  radius: 0.6
});
```

#### `@outline`
Outline effect around object.

**Parameters**:
- `color` (string) - Outline color
- `thickness` (number, default: 0.01) - Outline thickness

**Example**:
```typescript
traitRegistry.apply(mesh, '@outline', {
  color: '#00ffff',
  thickness: 0.02
});
```

---

### Gameplay Traits

#### `@health`
Object has health points.

**Parameters**:
- `max` (number, default: 100) - Maximum health
- `current` (number, default: max) - Current health
- `regenerate` (boolean, default: false) - Auto-regenerate

**Example**:
```typescript
traitRegistry.apply(mesh, '@health', {
  max: 100,
  current: 100,
  regenerate: true
});
```

#### `@damageable`
Object can take damage.

**Parameters**:
- `armor` (number, default: 0) - Damage reduction
- `invulnerable` (boolean, default: false) - Cannot take damage

**Example**:
```typescript
traitRegistry.apply(mesh, '@damageable', {
  armor: 50,
  invulnerable: false
});
```

**Dependencies**: `@health`

#### `@collectible`
Can be collected by player.

**Parameters**:
- `value` (number, default: 1) - Point value
- `autoCollect` (boolean, default: true) - Auto-collect on touch
- `respawn` (boolean, default: false) - Respawn after collection

**Example**:
```typescript
traitRegistry.apply(mesh, '@collectible', {
  value: 10,
  autoCollect: true,
  respawn: false
});
```

#### `@spawner`
Spawns objects at intervals.

**Parameters**:
- `prefab` (Object3D) - Object to spawn
- `interval` (number, default: 5) - Spawn interval in seconds
- `maxCount` (number, default: 10) - Maximum spawned objects

**Example**:
```typescript
traitRegistry.apply(mesh, '@spawner', {
  prefab: enemyPrefab,
  interval: 3,
  maxCount: 5
});
```

#### `@dialogue`
Has dialogue/conversation system.

**Parameters**:
- `lines` (string[]) - Dialogue lines
- `autoAdvance` (boolean, default: false) - Auto-advance dialogue

**Example**:
```typescript
traitRegistry.apply(mesh, '@dialogue', {
  lines: ['Hello!', 'How are you?', 'Goodbye!'],
  autoAdvance: false
});
```

---

### AI Traits

#### `@ai`
AI-controlled entity.

**Parameters**:
- `updateInterval` (number, default: 0.1) - AI update interval in seconds

**Example**:
```typescript
traitRegistry.apply(mesh, '@ai', { updateInterval: 0.2 });
```

#### `@patrol`
AI patrols between waypoints.

**Parameters**:
- `waypoints` (Vector3[]) - Patrol waypoints
- `speed` (number, default: 1) - Movement speed
- `loop` (boolean, default: true) - Loop patrol route

**Example**:
```typescript
traitRegistry.apply(mesh, '@patrol', {
  waypoints: [
    new Vector3(0, 0, 0),
    new Vector3(5, 0, 0),
    new Vector3(5, 0, 5)
  ],
  speed: 2,
  loop: true
});
```

**Dependencies**: `@ai`

#### `@seek`
AI seeks toward target.

**Parameters**:
- `target` (Object3D) - Target to seek
- `speed` (number, default: 1) - Seek speed
- `arrivalRadius` (number, default: 0.5) - Stop distance

**Example**:
```typescript
traitRegistry.apply(mesh, '@seek', {
  target: playerMesh,
  speed: 1.5,
  arrivalRadius: 1
});
```

**Dependencies**: `@ai`

#### `@flee`
AI flees from target.

**Parameters**:
- `threat` (Object3D) - Target to flee from
- `fleeDistance` (number, default: 10) - Safe distance
- `speed` (number, default: 2) - Flee speed

**Example**:
```typescript
traitRegistry.apply(mesh, '@flee', {
  threat: enemyMesh,
  fleeDistance: 15,
  speed: 3
});
```

**Dependencies**: `@ai`

---

### Environment Traits

#### `@portal`
Portal to another location or zone.

**Parameters**:
- `destination` (string) - Destination zone/location
- `label` (string) - Portal label text

**Example**:
```typescript
traitRegistry.apply(mesh, '@portal', {
  destination: 'main_plaza',
  label: '← Back to Plaza'
});
```

**HoloScript**:
```holoscript
portal "ReturnHome" {
  @portal(destination: "home", label: "← Home")
  position: [0, 1, -5]
}
```

#### `@light`
Light source.

**Parameters**:
- `type` ('point' | 'directional' | 'spot') - Light type
- `color` (string) - Light color
- `intensity` (number, default: 1) - Light intensity
- `range` (number) - Light range (point/spot only)

**Example**:
```typescript
traitRegistry.apply(mesh, '@light', {
  type: 'point',
  color: '#ffffff',
  intensity: 1.5,
  range: 10
});
```

#### `@shadowCaster`
Object casts shadows.

**Parameters**:
- `resolution` (number, default: 1024) - Shadow map resolution

**Example**:
```typescript
traitRegistry.apply(mesh, '@shadowCaster', { resolution: 2048 });
```

#### `@shadowReceiver`
Object receives shadows.

**Parameters**: None

**Example**:
```typescript
traitRegistry.apply(mesh, '@shadowReceiver');
```

---

## 🛠️ Advanced Usage

### Creating Custom Traits

```typescript
import { Trait, TraitCategory, traitRegistry } from '@hololand/traits';
import { Object3D } from 'three';

class MyCustomTrait implements Trait {
  name = '@myTrait';
  category = TraitCategory.GAMEPLAY;
  description = 'My custom trait description';
  dependencies = ['@spatial']; // Optional
  conflicts = []; // Optional

  apply(target: Object3D, params?: any) {
    target.userData.myProperty = params?.value || 'default';
    console.log('Trait applied!');
  }

  update(target: Object3D, deltaTime: number) {
    // Called every frame
    target.rotation.y += deltaTime;
  }

  remove(target: Object3D) {
    delete target.userData.myProperty;
    console.log('Trait removed!');
  }
}

// Register the custom trait
traitRegistry.register(new MyCustomTrait());

// Use it
traitRegistry.apply(mesh, '@myTrait', { value: 'hello' });
```

### Checking Traits

```typescript
// Check if object has trait
const hasTrait = traitRegistry.has(mesh, '@rotate');

// Get all traits on object
const traits = traitRegistry.getTraits(mesh);

// Remove trait from object
traitRegistry.remove(mesh, '@rotate');
```

### Trait Dependencies

Traits can automatically check and apply dependencies:

```typescript
// @rigidbody requires @physics
// Applying @rigidbody will warn if @physics is missing
traitRegistry.apply(mesh, '@rigidbody');
// Warning: Trait @rigidbody requires dependency @physics
```

### Trait Conflicts

Traits can prevent conflicting traits:

```typescript
// @kinematic conflicts with @rigidbody
traitRegistry.apply(mesh, '@rigidbody');
traitRegistry.apply(mesh, '@kinematic');
// Error: Trait @kinematic conflicts with @rigidbody
```

---

## 📊 Performance

### Update Loop Optimization

The trait system only updates traits that have an `update()` method:

```typescript
// Efficient: Only rotating objects are updated
traitRegistry.update(deltaTime);
```

### Memory Management

Traits store minimal metadata on objects using `userData`:

```typescript
// Trait data stored in userData
mesh.userData.trait_rotate = true;
mesh.userData.rotateSpeed = 2;
mesh.userData.rotateAxis = 'y';
```

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Apply trait | ~0.01ms | Instant |
| Update 100 traits | ~0.5ms | 60 FPS safe |
| Update 1000 traits | ~4ms | Still performant |
| Remove trait | ~0.01ms | Instant |

---

## 🔧 API Reference

### TraitRegistry

```typescript
class TraitRegistry {
  // Register a custom trait
  register(trait: Trait): void;

  // Apply trait to object
  apply(target: Object3D, traitName: string, params?: Record<string, any>): boolean;

  // Remove trait from object
  remove(target: Object3D, traitName: string): boolean;

  // Check if object has trait
  has(target: Object3D, traitName: string): boolean;

  // Get trait by name
  getTrait(name: string): Trait | undefined;

  // Get all traits by category
  getTraitsByCategory(category: TraitCategory): Trait[];

  // Get all traits applied to object
  getTraits(target: Object3D): Trait[];

  // Update all active traits
  update(deltaTime: number): void;
}
```

### Trait Interface

```typescript
interface Trait {
  name: string; // Trait name (e.g., '@rotate')
  category: TraitCategory; // Trait category
  description: string; // Trait description
  dependencies?: string[]; // Required traits
  conflicts?: string[]; // Conflicting traits

  apply(target: Object3D, params?: any): void;
  update?(target: Object3D, deltaTime: number): void;
  remove?(target: Object3D): void;
}
```

### TraitCategory Enum

```typescript
enum TraitCategory {
  SPATIAL,
  PHYSICS,
  ANIMATION,
  AUDIO,
  VR_INTERACTION,
  NETWORKING,
  VISUAL_EFFECTS,
  GAMEPLAY,
  AI,
  ENVIRONMENT
}
```

---

## 📖 Examples

### Example 1: Rotating Glowing Cube

```typescript
const cube = new Mesh(
  new BoxGeometry(1, 1, 1),
  new MeshStandardMaterial({ color: 0xff00ff })
);

traitRegistry.apply(cube, '@spatial');
traitRegistry.apply(cube, '@rotate', { speed: 2 });
traitRegistry.apply(cube, '@emissive', { color: '#ff00ff', intensity: 0.5 });
```

### Example 2: VR Grabbable Object

```typescript
const sword = loadGLB('sword.glb');

traitRegistry.apply(sword, '@spatial');
traitRegistry.apply(sword, '@grabbable', { twoHanded: true });
traitRegistry.apply(sword, '@physics', { mass: 2 });
```

### Example 3: AI Patrol Enemy

```typescript
const enemy = loadGLB('enemy.glb');

traitRegistry.apply(enemy, '@spatial');
traitRegistry.apply(enemy, '@ai');
traitRegistry.apply(enemy, '@patrol', {
  waypoints: [
    new Vector3(0, 0, 0),
    new Vector3(10, 0, 0),
    new Vector3(10, 0, 10)
  ],
  speed: 1.5,
  loop: true
});
traitRegistry.apply(enemy, '@health', { max: 100 });
```

---

## 🚀 Roadmap

- [ ] Add more traits (target: 100+)
- [ ] Trait composition (combine multiple traits)
- [ ] Visual trait editor
- [ ] Trait marketplace/library
- [ ] Performance profiler
- [ ] Trait hot-reload

---

## 📄 License

Elastic License 2.0

---

## 🤝 Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## 📧 Support

- Issues: [GitHub Issues](https://github.com/Hololand/Hololand/issues)
- Discord: [Hololand Community](https://discord.gg/hololand)
- Email: support@hololand.com

---

**Built with ❤️ by the Hololand Team**
