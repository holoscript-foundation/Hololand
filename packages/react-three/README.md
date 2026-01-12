# @hololand/react-three

React components and hooks for building Hololand VR worlds with declarative JSX syntax.

## Features

- 🎨 **Declarative VR Worlds** - Build VR experiences using familiar React patterns
- 🪝 **Powerful Hooks** - React hooks for world manipulation and event handling
- ⚛️ **Automatic Lifecycle** - Objects automatically added/removed with component mount/unmount
- 🎮 **Full World Access** - Complete access to HololandWorld and HololandRenderer instances
- 🔄 **Reactive Updates** - Props changes automatically sync to the 3D world
- 🥽 **VR-Ready** - Built-in WebXR support with VRButton integration
- 📦 **Type-Safe** - Full TypeScript support with comprehensive types

## Installation

```bash
npm install @hololand/react-three @hololand/world @hololand/renderer three react
```

**Peer Dependencies:**
- `@hololand/world@^1.0.0-alpha.1`
- `@hololand/renderer@^1.0.0-alpha.1`
- `react@^18.0.0`
- `three@^0.159.0`

## Quick Start

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HololandCanvas
        worldConfig={{ enablePhysics: true }}
        rendererConfig={{ enableVR: true, enableShadows: true }}
      >
        {/* Ground plane */}
        <HololandObject
          type="plane"
          position={{ x: 0, y: 0, z: 0 }}
          rotation={{ x: -Math.PI / 2, y: 0, z: 0, w: 1 }}
          metadata={{ width: 100, height: 100, color: 0x808080 }}
        />

        {/* Bouncing ball */}
        <HololandObject
          type="sphere"
          position={{ x: 0, y: 5, z: 0 }}
          metadata={{ radius: 1, color: 0xff0000 }}
          physics={{ enabled: true, mass: 1, restitution: 0.7 }}
        />

        {/* Static box */}
        <HololandObject
          type="box"
          position={{ x: 3, y: 1, z: 0 }}
          metadata={{ width: 2, height: 2, depth: 2, color: 0x00ff00 }}
        />
      </HololandCanvas>
    </div>
  );
}

export default App;
```

## Components

### HololandCanvas

The root component that creates and manages the VR world and renderer.

```tsx
<HololandCanvas
  worldConfig={{
    name: 'my-world',
    enablePhysics: true,
    gravity: { x: 0, y: -9.81, z: 0 },
  }}
  rendererConfig={{
    enableVR: true,
    enableShadows: true,
    enableControls: true,
    backgroundColor: 0x87ceeb,
    cameraPosition: { x: 10, y: 10, z: 10 },
  }}
  onWorldReady={(world) => console.log('World ready:', world)}
  onRendererReady={(renderer) => console.log('Renderer ready:', renderer)}
  style={{ width: '100%', height: '100%' }}
>
  {/* Your VR objects here */}
</HololandCanvas>
```

**Props:**
- `worldConfig?: Partial<WorldConfig>` - Configuration for HololandWorld
- `rendererConfig?: Partial<RendererConfig>` - Configuration for HololandRenderer
- `onWorldReady?: (world: HololandWorld) => void` - Callback when world is initialized
- `onRendererReady?: (renderer: HololandRenderer) => void` - Callback when renderer is initialized
- `style?: React.CSSProperties` - CSS styles for the canvas element
- `className?: string` - CSS class name for the canvas element

### HololandObject

Declarative component for adding objects to the world.

```tsx
<HololandObject
  id="my-ball" // Optional: auto-generated if not provided
  type="sphere"
  position={{ x: 0, y: 5, z: 0 }}
  rotation={{ x: 0, y: 0, z: 0, w: 1 }}
  scale={{ x: 1, y: 1, z: 1 }}
  metadata={{
    radius: 1,
    color: 0xff0000,
    metalness: 0.5,
    roughness: 0.3,
  }}
  physics={{
    enabled: true,
    mass: 1,
    velocity: { x: 0, y: 0, z: 0 },
    friction: 0.5,
    restitution: 0.7,
  }}
  interactive={true}
  visible={true}
  onAdded={(objectId) => console.log('Added:', objectId)}
  onRemoved={(objectId) => console.log('Removed:', objectId)}
/>
```

**Object Types:**
- `sphere` - Spherical object (requires `radius` in metadata)
- `box` - Box/cube object (requires `width`, `height`, `depth` in metadata)
- `cylinder` - Cylindrical object (requires `radius`, `height` in metadata)
- `plane` - Flat plane (requires `width`, `height` in metadata)
- Custom types (fallback to box geometry)

**Lifecycle:**
- Objects are automatically added to the world when the component mounts
- Objects are automatically removed when the component unmounts
- Position, rotation, scale, and visibility updates are reactive

## Hooks

### useHololand

Access the world and renderer instances.

```tsx
import { useHololand } from '@hololand/react-three';

function MyComponent() {
  const { world, renderer, isReady } = useHololand();

  if (!isReady) {
    return <div>Loading...</div>;
  }

  return <div>World ready!</div>;
}
```

### useHololandWorld

Access just the world instance (throws if not ready).

```tsx
import { useHololandWorld } from '@hololand/react-three';

function MyComponent() {
  const world = useHololandWorld();

  const addRandomBall = () => {
    world.addObject({
      type: 'sphere',
      position: {
        x: Math.random() * 10 - 5,
        y: 10,
        z: Math.random() * 10 - 5,
      },
      metadata: { radius: 0.5, color: Math.random() * 0xffffff },
      physics: { enabled: true, mass: 1 },
    });
  };

  return <button onClick={addRandomBall}>Add Ball</button>;
}
```

### useHololandRenderer

Access just the renderer instance.

```tsx
import { useHololandRenderer } from '@hololand/react-three';

function MyComponent() {
  const renderer = useHololandRenderer();

  const addLight = () => {
    renderer.addLight({
      type: 'point',
      color: 0xffffff,
      intensity: 1,
      position: { x: 5, y: 5, z: 5 },
    });
  };

  return <button onClick={addLight}>Add Light</button>;
}
```

### useHololandObject

Programmatically add objects to the world.

```tsx
import { useHololandObject } from '@hololand/react-three';

function SpawnerButton() {
  const addObject = useHololandObject();

  const spawnBox = () => {
    const obj = addObject({
      type: 'box',
      position: { x: 0, y: 5, z: 0 },
      metadata: { width: 1, height: 1, depth: 1, color: 0xff00ff },
      physics: { enabled: true, mass: 2 },
    });
    console.log('Spawned:', obj.id);
  };

  return <button onClick={spawnBox}>Spawn Box</button>;
}
```

### useNearbyObjects

Query objects near a position.

```tsx
import { useNearbyObjects } from '@hololand/react-three';

function ProximityDetector() {
  const position = { x: 0, y: 0, z: 0 };
  const nearbyObjects = useNearbyObjects(position, 5); // 5 unit radius

  return (
    <div>
      Objects within 5 units: {nearbyObjects.length}
      <ul>
        {nearbyObjects.map((obj) => (
          <li key={obj.id}>{obj.type} - {obj.id}</li>
        ))}
      </ul>
    </div>
  );
}
```

### useTrackedObject

Track a specific object's state.

```tsx
import { useTrackedObject } from '@hololand/react-three';

function ObjectTracker() {
  const ball = useTrackedObject('ball-1');

  if (!ball) {
    return <div>Object not found</div>;
  }

  const pos = ball.getPosition();

  return (
    <div>
      Ball position: ({pos.x.toFixed(2)}, {pos.y.toFixed(2)}, {pos.z.toFixed(2)})
    </div>
  );
}
```

### useWorldEvent

Listen to world events.

```tsx
import { useWorldEvent } from '@hololand/react-three';

function EventLogger() {
  const [events, setEvents] = useState<string[]>([]);

  useWorldEvent('object:added', (data) => {
    setEvents((prev) => [...prev, `Added: ${data.object.id}`]);
  });

  useWorldEvent('object:removed', (data) => {
    setEvents((prev) => [...prev, `Removed: ${data.object.id}`]);
  });

  return (
    <div>
      <h3>Event Log</h3>
      <ul>
        {events.map((event, i) => (
          <li key={i}>{event}</li>
        ))}
      </ul>
    </div>
  );
}
```

### usePhysics

Control physics simulation.

```tsx
import { usePhysics } from '@hololand/react-three';

function PhysicsControls() {
  const { isRunning, start, stop } = usePhysics();

  return (
    <div>
      <p>Physics: {isRunning ? 'Running' : 'Paused'}</p>
      <button onClick={isRunning ? stop : start}>
        {isRunning ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
```

## Complete Example

```tsx
import { useState } from 'react';
import {
  HololandCanvas,
  HololandObject,
  useHololandObject,
  useWorldEvent,
  usePhysics,
} from '@hololand/react-three';

function ControlPanel() {
  const addObject = useHololandObject();
  const { isRunning, start, stop } = usePhysics();
  const [objectCount, setObjectCount] = useState(0);

  useWorldEvent('object:added', () => {
    setObjectCount((c) => c + 1);
  });

  useWorldEvent('object:removed', () => {
    setObjectCount((c) => c - 1);
  });

  const spawnBall = () => {
    addObject({
      type: 'sphere',
      position: {
        x: (Math.random() - 0.5) * 10,
        y: 10 + Math.random() * 5,
        z: (Math.random() - 0.5) * 10,
      },
      metadata: {
        radius: 0.5 + Math.random() * 0.5,
        color: Math.random() * 0xffffff,
      },
      physics: { enabled: true, mass: 1, restitution: 0.7 },
    });
  };

  return (
    <div style={{ position: 'absolute', top: 20, right: 20, color: 'white' }}>
      <p>Objects: {objectCount}</p>
      <p>Physics: {isRunning ? 'On' : 'Off'}</p>
      <button onClick={spawnBall}>Spawn Ball</button>
      <button onClick={isRunning ? stop : start}>
        {isRunning ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HololandCanvas
        worldConfig={{ enablePhysics: true }}
        rendererConfig={{
          enableVR: true,
          enableShadows: true,
          backgroundColor: 0x1a1a2e,
        }}
      >
        {/* Ground */}
        <HololandObject
          type="plane"
          position={{ x: 0, y: 0, z: 0 }}
          rotation={{ x: -Math.PI / 2, y: 0, z: 0, w: 1 }}
          metadata={{ width: 50, height: 50, color: 0x2c3e50 }}
        />

        {/* Initial ball */}
        <HololandObject
          id="ball-1"
          type="sphere"
          position={{ x: 0, y: 10, z: 0 }}
          metadata={{ radius: 1, color: 0xff4444 }}
          physics={{ enabled: true, mass: 1, restitution: 0.8 }}
        />

        <ControlPanel />
      </HololandCanvas>
    </div>
  );
}

export default App;
```

## TypeScript

Fully typed with comprehensive type exports:

```tsx
import type {
  HololandCanvasProps,
  HololandObjectProps,
  HololandContextValue,
  SpatialObject,
  SpatialObjectConfig,
  Vector3,
  Quaternion,
  WorldConfig,
  RendererConfig,
} from '@hololand/react-three';
```

## Performance Tips

1. **Memoize Event Handlers**: Use `useCallback` for event handlers to prevent unnecessary re-subscriptions
2. **Limit Object Count**: Each object creates a Three.js mesh - keep count reasonable
3. **Update Frequency**: The `useNearbyObjects` and `useTrackedObject` hooks update every 100ms by default
4. **Static Objects**: Disable physics for static objects to improve performance

```tsx
// Good: Memoized handler
const handleObjectAdded = useCallback((data) => {
  console.log('Added:', data.object.id);
}, []);

useWorldEvent('object:added', handleObjectAdded);

// Bad: Inline handler (creates new function each render)
useWorldEvent('object:added', (data) => {
  console.log('Added:', data.object.id);
});
```

## React Patterns

### Conditional Objects

```tsx
{showBall && (
  <HololandObject
    type="sphere"
    position={{ x: 0, y: 5, z: 0 }}
    metadata={{ radius: 1, color: 0xff0000 }}
  />
)}
```

### Lists of Objects

```tsx
{balls.map((ball) => (
  <HololandObject
    key={ball.id}
    id={ball.id}
    type="sphere"
    position={ball.position}
    metadata={{ radius: ball.radius, color: ball.color }}
    physics={{ enabled: true, mass: 1 }}
  />
))}
```

### Animated Properties

```tsx
function AnimatedBall() {
  const [y, setY] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setY((prev) => (prev > 10 ? 5 : prev + 0.1));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <HololandObject
      type="sphere"
      position={{ x: 0, y, z: 0 }}
      metadata={{ radius: 1, color: 0xff0000 }}
    />
  );
}
```

## Related Packages

- [@hololand/renderer](../renderer) - Three.js renderer with WebXR support
- [@hololand/world](../world) - VR world runtime with physics
- [@hololand/core](../core) - HoloScript language engine
- [@hololand/ai-bridge](../ai-bridge) - Natural language → HoloScript translation

## Browser Support

- ✅ React 18+
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (iOS 15+)
- 🥽 VR: Quest 2/3, Valve Index, Vive (via WebXR)

## License

MIT

## Contributing

See [Hololand Contributing Guide](../../CONTRIBUTING.md)
