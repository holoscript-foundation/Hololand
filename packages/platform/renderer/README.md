# @hololand/renderer

Three.js renderer for Hololand VR worlds with WebXR support.

## Features

- 🎨 **Auto-Sync with HololandWorld** - Automatically creates and updates Three.js meshes based on world objects
- 🥽 **WebXR VR Support** - One-click VR mode with full headset support
- 💡 **Built-in Lighting** - Ambient + directional lights with shadow mapping
- 🎮 **Desktop Controls** - OrbitControls for mouse/keyboard navigation
- ⚡ **Physics-Synced Rendering** - Automatically updates positions/rotations every frame
- 🎭 **Smart Mesh Creation** - Automatically generates appropriate geometries (sphere, box, cylinder, etc.)
- 🔌 **Pluggable Logger** - Integrate with your existing logging infrastructure

## Installation

```bash
npm install @hololand/renderer three @hololand/world
```

**Peer Dependencies:**
- `three@^0.159.0`
- `@hololand/world@^1.0.0-alpha.1`

## Quick Start

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandRenderer, setHololandRendererLogger } from '@hololand/renderer';

// Create a world
const world = new HololandWorld({
  name: 'my-world',
  enablePhysics: true,
});

// Get canvas element
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Create renderer
const renderer = new HololandRenderer(canvas, world, {
  enableShadows: true,
  enableVR: true,
  enableControls: true,
  backgroundColor: 0x87ceeb, // Sky blue
});

// Add objects to the world
world.addObject({
  id: 'ball',
  type: 'sphere',
  position: { x: 0, y: 5, z: 0 },
  metadata: {
    radius: 1,
    color: 0xff0000, // Red
  },
  physics: {
    enabled: true,
    mass: 1,
  },
});

world.addObject({
  id: 'box',
  type: 'box',
  position: { x: -3, y: 1, z: 0 },
  metadata: {
    width: 2,
    height: 2,
    depth: 2,
    color: 0x00ff00, // Green
  },
});

// Start both world simulation and rendering
world.start();
renderer.start();
```

## Configuration

```typescript
interface RendererConfig {
  enableShadows?: boolean;      // Enable shadow mapping (default: true)
  enableVR?: boolean;            // Add VR button (default: true)
  enableControls?: boolean;      // Enable OrbitControls (default: true)
  antialias?: boolean;           // Enable antialiasing (default: true)
  backgroundColor?: number;      // Background color (default: 0x000000)
  cameraPosition?: {             // Camera position (default: {x:10, y:10, z:10})
    x: number;
    y: number;
    z: number;
  };
  cameraFov?: number;            // Camera field of view (default: 75)
}
```

## Object Types

The renderer automatically creates appropriate geometries based on object type:

```typescript
// Sphere
world.addObject({
  type: 'sphere',
  metadata: { radius: 1, color: 0xff0000 },
});

// Box
world.addObject({
  type: 'box',
  metadata: { width: 2, height: 2, depth: 2, color: 0x00ff00 },
});

// Cylinder
world.addObject({
  type: 'cylinder',
  metadata: { radius: 1, height: 3, color: 0x0000ff },
});

// Plane (ground)
world.addObject({
  type: 'plane',
  metadata: { width: 100, height: 100, color: 0x808080 },
});

// Custom (fallback to box)
world.addObject({
  type: 'custom-type',
  metadata: { color: 0xffff00 },
});
```

## Custom Lighting

```typescript
// Add a point light
renderer.addLight({
  type: 'point',
  color: 0xffffff,
  intensity: 1,
  position: { x: 5, y: 5, z: 5 },
  distance: 50,
  castShadow: true,
});

// Add a spotlight
renderer.addLight({
  type: 'spot',
  color: 0xff00ff,
  intensity: 2,
  position: { x: 0, y: 10, z: 0 },
  castShadow: true,
});

// Add ambient light
renderer.addLight({
  type: 'ambient',
  color: 0x404040,
  intensity: 0.5,
});
```

## WebXR VR Support

The renderer automatically adds a VR button when `enableVR: true` and WebXR is available:

```typescript
const renderer = new HololandRenderer(canvas, world, {
  enableVR: true, // Adds VR button automatically
});

renderer.start();
// User clicks "ENTER VR" button → Full VR experience
```

**VR Features:**
- ✅ Automatic VRButton integration
- ✅ WebXR session management
- ✅ Stereo rendering for headsets
- ✅ Hand tracking support (via Three.js)
- ✅ Room-scale VR

## Advanced API

```typescript
// Get Three.js instances
const scene = renderer.getScene();
const camera = renderer.getCamera();
const threeRenderer = renderer.getRenderer();

// Add custom Three.js objects
const customMesh = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.4),
  new THREE.MeshStandardMaterial({ color: 0xff00ff })
);
scene.add(customMesh);

// Handle window resize
window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight);
});

// Stop rendering
renderer.stop();

// Clean up
renderer.dispose();
world.stop();
```

## Logging

Integrate with your logging infrastructure:

```typescript
import { setHololandRendererLogger } from '@hololand/renderer';

setHololandRendererLogger({
  info: (msg, meta) => myLogger.info(msg, meta),
  warn: (msg, meta) => myLogger.warn(msg, meta),
  error: (msg, meta) => myLogger.error(msg, meta),
  debug: (msg, meta) => myLogger.debug(msg, meta),
});
```

## Complete HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Hololand VR World</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import { HololandWorld } from '@hololand/world';
    import { HololandRenderer } from '@hololand/renderer';

    const world = new HololandWorld({
      name: 'demo-world',
      enablePhysics: true,
    });

    const canvas = document.getElementById('canvas');
    const renderer = new HololandRenderer(canvas, world, {
      enableShadows: true,
      enableVR: true,
      backgroundColor: 0x87ceeb,
    });

    // Add a bouncing ball
    world.addObject({
      id: 'ball',
      type: 'sphere',
      position: { x: 0, y: 10, z: 0 },
      metadata: { radius: 1, color: 0xff0000 },
      physics: { enabled: true, mass: 1, restitution: 0.8 },
    });

    // Add ground
    world.addObject({
      id: 'ground',
      type: 'plane',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: 0, w: 1 },
      metadata: { width: 50, height: 50, color: 0x808080 },
    });

    world.start();
    renderer.start();

    window.addEventListener('resize', () => {
      renderer.resize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
```

## Performance Tips

1. **Limit Object Count**: Each `SpatialObject` creates a Three.js mesh. For large worlds, consider object pooling.
2. **Shadow Optimization**: Disable shadows on distant objects by setting `castShadow: false` in object metadata.
3. **LOD (Level of Detail)**: Use simpler geometries for distant objects (future feature).
4. **Physics Tick Rate**: Lower `tickRate` in `HololandWorld` for better performance (default: 60 FPS).

## Architecture

```
User Code
    │
    ├─> HololandWorld (world state & physics)
    │       ├─> SpatialObject (game entities)
    │       └─> PhysicsEngine (simulation)
    │
    └─> HololandRenderer (visualization)
            ├─> Listens to world events
            ├─> Creates Three.js meshes
            └─> Updates positions/rotations every frame
```

**Key Concept**: The world manages logic and state, the renderer visualizes it. They're decoupled but sync automatically via events.

## Browser Support

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (iOS 15+)
- 🥽 VR: Quest 2/3, Valve Index, Vive, Windows MR (via WebXR)

## TypeScript

Fully typed with TypeScript 5.3+:

```typescript
import type { RendererConfig, LightingConfig, MaterialConfig } from '@hololand/renderer';
```

## Related Packages

- [@hololand/world](../world) - VR world runtime with physics
- [@hololand/core](../core) - HoloScript language engine
- [@hololand/ai-bridge](../ai-bridge) - Natural language → HoloScript translation

## License

MIT

## Contributing

See [Hololand Contributing Guide](../../CONTRIBUTING.md)
