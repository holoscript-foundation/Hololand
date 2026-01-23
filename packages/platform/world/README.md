# @hololand/world

> VR World Runtime & Spatial Management for the Hololand metaverse

**@hololand/world** provides the core world engine that powers the Hololand metaverse. It manages spatial objects, physics simulation, and world state with efficient spatial querying and event handling.

## Features

- 🌍 **World Management** - Create and manage VR worlds with configurable bounds and physics
- 📦 **Spatial Objects** - Add, remove, and query objects in 3D space
- ⚡ **Physics Engine** - Realistic physics simulation with gravity, collisions, and friction
- 🔍 **Spatial Index** - Fast spatial queries using grid-based partitioning
- 📡 **Event System** - Real-time events for world changes
- 🎯 **Parent-Child Hierarchies** - Organize objects in spatial hierarchies

## Installation

```bash
npm install @hololand/world
```

## Quick Start

### Create a World

```typescript
import { HololandWorld } from '@hololand/world';

const world = new HololandWorld({
  name: 'my-vr-world',
  bounds: {
    min: { x: -500, y: 0, z: -500 },
    max: { x: 500, y: 100, z: 500 }
  },
  gravity: { x: 0, y: -9.81, z: 0 },
  enablePhysics: true,
  tickRate: 60
});

// Start the world simulation
world.start();
```

### Add Objects to the World

```typescript
// Add a static platform
const platform = world.addObject({
  type: 'platform',
  position: { x: 0, y: 0, z: 0 },
  scale: { x: 10, y: 1, z: 10 },
  metadata: { color: '#4ecdc4' },
  physics: {
    enabled: false // Static object
  }
});

// Add a dynamic physics object
const ball = world.addObject({
  type: 'sphere',
  position: { x: 0, y: 50, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  physics: {
    enabled: true,
    mass: 1,
    velocity: { x: 0, y: 0, z: 0 },
    friction: 0.01,
    restitution: 0.7 // Bounciness
  },
  interactive: true
});
```

### Query Objects Spatially

```typescript
// Find all objects within 10 units of a position
const nearbyObjects = world.queryNearby(
  { x: 0, y: 0, z: 0 },
  10
);

// Find all objects in a bounding box
const objectsInBox = world.queryBox({
  min: { x: -5, y: 0, z: -5 },
  max: { x: 5, y: 10, z: 5 }
});

console.log(`Found ${nearbyObjects.length} nearby objects`);
```

### Listen to World Events

```typescript
// Subscribe to object events
world.on('object:added', (event) => {
  console.log('Object added:', event.data.objectId);
});

world.on('object:removed', (event) => {
  console.log('Object removed:', event.data.objectId);
});

// Subscribe to world lifecycle events
world.on('world:started', (event) => {
  console.log('World simulation started');
});

world.on('world:tick', (event) => {
  console.log(`Tick duration: ${event.data.duration}ms`);
});
```

### Manipulate Objects

```typescript
// Get an object
const object = world.getObject(ball.id);

if (object) {
  // Move the object
  object.setPosition({ x: 10, y: 5, z: 0 });

  // Rotate the object
  object.setRotation({ x: 0, y: 0.707, z: 0, w: 0.707 });

  // Scale the object
  object.setScale({ x: 2, y: 2, z: 2 });

  // Apply velocity (if physics enabled)
  object.setVelocity({ x: 5, y: 10, z: 0 });

  // Toggle visibility
  object.setVisible(false);

  // Toggle interactivity
  object.setInteractive(true);
}
```

### Parent-Child Hierarchies

```typescript
// Create a shop structure
const shop = world.addObject({
  type: 'shop',
  position: { x: 0, y: 0, z: 0 }
});

const counter = world.addObject({
  type: 'counter',
  position: { x: 2, y: 1, z: 0 }
});

const sign = world.addObject({
  type: 'sign',
  position: { x: 0, y: 3, z: 2 }
});

// Establish parent-child relationships
shop.addChild(counter);
shop.addChild(sign);

// Moving the shop will move all children
shop.setPosition({ x: 10, y: 0, z: 10 });
```

### Get World Statistics

```typescript
const stats = world.getStats();

console.log(`World: ${stats.name}`);
console.log(`Objects: ${stats.objectCount}`);
console.log(`Active Objects: ${stats.activeObjects}`);
console.log(`Uptime: ${stats.uptime}ms`);
console.log(`Running: ${stats.isRunning}`);
```

### Stop and Cleanup

```typescript
// Stop the simulation
world.stop();

// Remove an object
world.removeObject(ball.id);

// Clear all objects
world.clear();

// Destroy the world
world.destroy();
```

## Advanced Usage

### Custom Physics Properties

```typescript
const customObject = world.addObject({
  type: 'custom',
  position: { x: 0, y: 10, z: 0 },
  physics: {
    enabled: true,
    mass: 5, // Heavier objects
    friction: 0.1, // More air resistance
    restitution: 0.9, // Very bouncy
    velocity: { x: 2, y: 0, z: 0 } // Initial velocity
  }
});
```

### World Bounds Checking

```typescript
const position = { x: 100, y: 50, z: 100 };

if (world.isInBounds(position)) {
  console.log('Position is within world bounds');
} else {
  console.log('Position is outside world bounds');
}
```

### Custom Logger Integration

```typescript
import { setHololandWorldLogger } from '@hololand/world';

// Use your own logger
setHololandWorldLogger({
  info: (msg, meta) => console.log(msg, meta),
  warn: (msg, meta) => console.warn(msg, meta),
  error: (msg, meta) => console.error(msg, meta),
  debug: (msg, meta) => console.debug(msg, meta),
});
```

### Distance Calculations

```typescript
import { vectorDistance } from '@hololand/world';

const objA = world.getObject('obj1');
const objB = world.getObject('obj2');

if (objA && objB) {
  const distance = objA.distanceTo(objB);
  console.log(`Distance: ${distance} units`);

  // Or use the utility function
  const dist = vectorDistance(
    objA.getPosition(),
    objB.getPosition()
  );
}
```

## Configuration Options

### WorldConfig

```typescript
interface WorldConfig {
  name: string;              // World identifier
  bounds?: BoundingBox;      // World boundaries
  gravity?: Vector3;         // Gravity vector
  enablePhysics?: boolean;   // Enable physics simulation
  tickRate?: number;         // Simulation ticks per second (default: 60)
}
```

### SpatialObjectConfig

```typescript
interface SpatialObjectConfig {
  id?: string;               // Optional custom ID
  type: string;              // Object type
  position?: Vector3;        // Initial position
  rotation?: Quaternion;     // Initial rotation
  scale?: Vector3;           // Initial scale
  metadata?: Record<string, any>; // Custom data
  physics?: {
    enabled: boolean;
    mass?: number;
    velocity?: Vector3;
    friction?: number;
    restitution?: number;
  };
  interactive?: boolean;     // Can user interact?
  visible?: boolean;         // Is it rendered?
}
```

## Event Types

The world emits these events:

- `world:started` - World simulation started
- `world:stopped` - World simulation stopped
- `world:tick` - Simulation tick completed
- `world:cleared` - All objects removed
- `world:destroyed` - World destroyed
- `object:added` - Object added to world
- `object:removed` - Object removed from world

## Performance Considerations

- Use spatial queries (`queryNearby`, `queryBox`) instead of iterating all objects
- Disable physics for static objects to improve performance
- Adjust `tickRate` based on your needs (lower = better performance)
- Use parent-child hierarchies to organize related objects
- Remove objects when they're no longer needed

## Integration Examples

### With @hololand/core (HoloScript)

```typescript
import { HololandWorld } from '@hololand/world';
import { HoloScriptRuntime, HoloScriptParser } from '@hololand/core';

const world = new HololandWorld({ name: 'holoscript-world' });
const runtime = new HoloScriptRuntime();
const parser = new HoloScriptParser();

// Parse HoloScript
const ast = parser.parse(`
  orb coffee_shop {
    position: { x: 0, y: 0, z: 0 }
    interactive: true
  }
`);

// Execute and add to world
const result = await runtime.execute(ast);

// Add resulting objects to world
world.addObject({
  type: 'shop',
  position: { x: 0, y: 0, z: 0 },
  metadata: result.output
});
```

### With @hololand/ai-bridge

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandAIBridge } from '@hololand/ai-bridge';

const world = new HololandWorld({ name: 'ai-generated-world' });
const bridge = new HololandAIBridge();

// Generate HoloScript from natural language
const result = await bridge.translateToHoloScript({
  naturalLanguage: "create a coffee shop with counter and seating"
});

// Parse and add to world
// ... integration logic
```

## Browser Compatibility

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Node.js 18+ for server-side world simulation
- Full TypeScript support

## API Reference

See the [full API documentation](../../docs/api/world.md) for complete details.

## Related Packages

- [@hololand/core](../core) - HoloScript language core
- [@hololand/ai-bridge](../ai-bridge) - Natural language → HoloScript
- [@hololand/commerce](../commerce) - Shop systems (coming soon)
- [@hololand/social](../social) - Avatars & presence (coming soon)

## Contributing

See the [main Hololand README](../../README.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.
