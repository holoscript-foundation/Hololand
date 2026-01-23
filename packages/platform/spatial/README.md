# @hololand/spatial

**3D math and spatial utilities for Hololand.**

## What It Does

- 📐 **Vectors** - 3D positions, directions, distances
- 🔄 **Rotations** - Quaternions, Euler angles
- 📦 **Bounding boxes** - Collision detection
- 🎯 **Raycasting** - Point-and-click in 3D

## Quick Start

```typescript
import { Vector3, Quaternion, BoundingBox } from '@hololand/spatial';

// Create a position
const position = new Vector3(1, 2, 3);

// Calculate distance
const distance = position.distanceTo(new Vector3(4, 5, 6));

// Check if two objects overlap
const box1 = new BoundingBox(min1, max1);
const box2 = new BoundingBox(min2, max2);
if (box1.intersects(box2)) {
  console.log('Collision!');
}
```

## Common Uses

### Distance Between Objects

```typescript
const player = new Vector3(0, 1, 0);
const enemy = new Vector3(10, 1, 5);
const distance = player.distanceTo(enemy);
// distance = 11.18
```

### Look At Something

```typescript
const rotation = Quaternion.lookAt(
  cameraPosition,
  targetPosition
);
```

### Is Point Inside Area?

```typescript
const area = new BoundingBox(
  new Vector3(-10, 0, -10),  // min corner
  new Vector3(10, 5, 10)     // max corner
);

if (area.containsPoint(playerPosition)) {
  console.log('Player is in the zone');
}
```

## API Reference

### Vector3

| Method | What It Does |
|--------|--------------|
| `add(v)` | Add two vectors |
| `subtract(v)` | Subtract vectors |
| `multiply(n)` | Scale by number |
| `normalize()` | Make length = 1 |
| `distanceTo(v)` | Distance to another point |
| `dot(v)` | Dot product |
| `cross(v)` | Cross product |

### Quaternion

| Method | What It Does |
|--------|--------------|
| `fromEuler(x, y, z)` | Create from angles |
| `lookAt(from, to)` | Point at target |
| `slerp(q, t)` | Smooth rotation |
| `multiply(q)` | Combine rotations |

### BoundingBox

| Method | What It Does |
|--------|--------------|
| `containsPoint(v)` | Is point inside? |
| `intersects(box)` | Do boxes overlap? |
| `getCenter()` | Center point |
| `getSize()` | Width, height, depth |

## Related Packages

- [@hololand/world](../world) - Uses spatial for physics
- [@hololand/renderer](../renderer) - Uses spatial for cameras

## License

MIT
