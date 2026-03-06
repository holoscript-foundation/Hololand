# @hololand/lod

**Level of Detail system for VR performance optimization**

High-performance LOD (Level of Detail) system for maintaining 90fps in VR/AR environments. Automatically adjusts mesh quality, applies frustum culling, occlusion culling, and adapts rendering quality based on performance metrics.

---

## Features

- ✅ **LOD Selection** - Automatic mesh quality based on distance
- ✅ **Frustum Culling** - Only render visible objects
- ✅ **Occlusion Culling** - Skip objects blocked by other geometry
- ✅ **Distance Culling** - Hide distant objects beyond threshold
- ✅ **Small Object Culling** - Skip objects too small on screen
- ✅ **Adaptive Quality** - Dynamic quality adjustment to maintain FPS
- ✅ **LOD Groups** - Manage multiple LOD levels per object
- ✅ **Zero Dependencies** - Lightweight and performant

---

## Installation

```bash
pnpm add @hololand/lod
```

---

## Quick Start

### Basic LOD Management

```typescript
import { LODManager } from '@hololand/lod';

// Create LOD manager
const lod = new LODManager();

// Register object with LOD levels
lod.registerObject({
  id: 'tree-1',
  position: { x: 50, y: 0, z: 50 },
  bounds: { radius: 5 },
  levels: [
    { distance: 0, mesh: 'tree-high.glb', polygons: 50000 },
    { distance: 20, mesh: 'tree-medium.glb', polygons: 10000 },
    { distance: 50, mesh: 'tree-low.glb', polygons: 2000 },
    { distance: 100, mesh: null }  // Don't render beyond 100m
  ]
});

// Update every frame
function update(camera) {
  lod.update(camera.position, camera.frustum);

  // Get visible objects with appropriate LOD
  const visible = lod.getVisibleObjects();

  visible.forEach(obj => {
    renderer.render(obj.mesh, obj.lodLevel);
  });
}
```

### Frustum Culling

```typescript
import { FrustumCuller } from '@hololand/lod';

// Create frustum culler
const culler = new FrustumCuller();

// Update frustum from camera
culler.updateFrustum(camera);

// Check if objects are visible
objects.forEach(obj => {
  if (culler.isVisible(obj.position, obj.bounds.radius)) {
    renderer.render(obj);
  }
});
```

### Adaptive Quality

```typescript
import { AdaptiveLODController } from '@hololand/lod';

// Create adaptive controller
const adaptive = new AdaptiveLODController({
  targetFPS: 90,      // Quest 2/3 target
  minFPS: 72,         // Minimum acceptable
  maxFPS: 120,        // Maximum quality
  adjustInterval: 1000  // Check every second
});

// Update every frame
function render(deltaTime) {
  // Render scene
  renderer.render(scene, camera);

  // Update adaptive quality
  adaptive.update(deltaTime);

  // Apply quality adjustments
  const quality = adaptive.getCurrentQuality();
  renderer.setQualityLevel(quality.level);
  lod.setDistanceMultiplier(quality.lodBias);
}
```

---

## API Reference

### LODManager

Manages LOD levels for all objects in the scene.

#### Methods

##### `registerObject(config)`

Register an object with LOD levels.

```typescript
interface LODConfig {
  id: string;
  position: Vec3;
  bounds: { radius: number };  // Bounding sphere
  levels: LODLevel[];
}

interface LODLevel {
  distance: number;  // Min distance for this level
  mesh: string | null;  // Mesh asset path (null = hidden)
  polygons?: number;    // Polygon count (for stats)
}

lod.registerObject({
  id: 'building-1',
  position: { x: 100, y: 0, z: 200 },
  bounds: { radius: 20 },
  levels: [
    { distance: 0, mesh: 'building-ultra.glb', polygons: 100000 },
    { distance: 30, mesh: 'building-high.glb', polygons: 50000 },
    { distance: 75, mesh: 'building-medium.glb', polygons: 20000 },
    { distance: 150, mesh: 'building-low.glb', polygons: 5000 },
    { distance: 300, mesh: 'building-billboard.png', polygons: 2 },
    { distance: 500, mesh: null }  // Hide beyond 500m
  ]
});
```

##### `update(cameraPosition, frustum)`

Update LOD selection and culling.

```typescript
function gameLoop() {
  // Update LOD system
  lod.update(camera.position, camera.frustum);

  // Get visible objects
  const visible = lod.getVisibleObjects();

  // Render only visible objects at appropriate LOD
  visible.forEach(obj => {
    const mesh = assets.get(obj.currentMesh);
    renderer.render(mesh);
  });
}
```

##### `setDistanceMultiplier(multiplier)`

Adjust LOD distances (for adaptive quality).

```typescript
// Reduce quality (use lower LODs sooner)
lod.setDistanceMultiplier(0.7);  // LOD switches at 70% of normal distance

// Increase quality (use higher LODs longer)
lod.setDistanceMultiplier(1.3);  // LOD switches at 130% of normal distance
```

##### `getStats()`

Get LOD statistics.

```typescript
const stats = lod.getStats();

console.log(`Visible objects: ${stats.visibleCount}`);
console.log(`Total polygons: ${stats.totalPolygons}`);
console.log(`Culled objects: ${stats.culledCount}`);
console.log(`LOD distribution: ${JSON.stringify(stats.lodLevels)}`);
```

---

### FrustumCuller

Cull objects outside camera view.

```typescript
const culler = new FrustumCuller();
```

#### Methods

##### `updateFrustum(camera)`

Update frustum planes from camera.

```typescript
function update() {
  culler.updateFrustum(camera);

  objects.forEach(obj => {
    if (culler.isVisible(obj.position, obj.bounds.radius)) {
      renderer.render(obj);
    }
  });
}
```

##### `isVisible(position, radius)`

Check if sphere is in frustum.

```typescript
const visible = culler.isVisible(
  { x: 50, y: 0, z: 50 },  // Object position
  5.0                       // Bounding radius
);

if (visible) {
  renderer.render(object);
}
```

##### `isBoxVisible(min, max)`

Check if bounding box is in frustum.

```typescript
const visible = culler.isBoxVisible(
  { x: 0, y: 0, z: 0 },      // Min corner
  { x: 10, y: 10, z: 10 }    // Max corner
);
```

---

### OcclusionCuller

Skip rendering objects blocked by other geometry.

```typescript
const occlusionCuller = new OcclusionCuller({
  resolution: 256,        // Occlusion buffer resolution
  checkInterval: 3        // Check every 3 frames
});
```

#### Methods

##### `update(camera, occluders)`

Update occlusion with large blocking objects.

```typescript
// Define large occluders (buildings, mountains)
const occluders = [
  { position: { x: 50, y: 0, z: 50 }, bounds: { radius: 20 } },
  { position: { x: 100, y: 0, z: 100 }, bounds: { radius: 30 } }
];

occlusionCuller.update(camera, occluders);
```

##### `isVisible(position, radius)`

Check if object is visible (not occluded).

```typescript
objects.forEach(obj => {
  if (occlusionCuller.isVisible(obj.position, obj.bounds.radius)) {
    renderer.render(obj);
  }
});
```

---

### CullingSystem

Combined culling system (frustum + distance + occlusion).

```typescript
const culling = new CullingSystem({
  frustumCulling: true,
  distanceCulling: true,
  occlusionCulling: true,
  maxDistance: 500,        // Max render distance
  minScreenSize: 0.01      // Min screen coverage (1%)
});
```

#### Methods

##### `update(camera, objects)`

Update all culling systems.

```typescript
function render() {
  // Update culling
  const visibleObjects = culling.update(camera, allObjects);

  // Render only visible
  visibleObjects.forEach(obj => {
    renderer.render(obj);
  });
}
```

##### `getStats()`

Get culling statistics.

```typescript
const stats = culling.getStats();

console.log(`Frustum culled: ${stats.frustumCulled}`);
console.log(`Distance culled: ${stats.distanceCulled}`);
console.log(`Occlusion culled: ${stats.occlusionCulled}`);
console.log(`Rendered: ${stats.rendered}`);
```

---

### AdaptiveLODController

Dynamically adjust quality to maintain target FPS.

```typescript
const adaptive = new AdaptiveLODController({
  targetFPS: 90,          // Target framerate
  minFPS: 72,             // Min acceptable (Quest 2 min)
  maxFPS: 120,            // Max quality
  adjustInterval: 1000,   // Adjust every 1000ms
  aggressiveness: 0.5     // 0.0 - 1.0 (how quickly to adjust)
});
```

#### Methods

##### `update(deltaTime)`

Update adaptive quality based on frame time.

```typescript
function render(deltaTime) {
  renderer.render(scene, camera);

  // Update adaptive controller
  adaptive.update(deltaTime);

  // Apply quality settings
  const quality = adaptive.getCurrentQuality();

  lod.setDistanceMultiplier(quality.lodBias);
  renderer.setShadowQuality(quality.shadowQuality);
  renderer.setTextureQuality(quality.textureQuality);
}
```

##### `getCurrentQuality()`

Get current quality settings.

```typescript
const quality = adaptive.getCurrentQuality();

// quality = {
//   level: 3,              // 0 (ultra low) - 5 (ultra high)
//   lodBias: 1.0,          // LOD distance multiplier
//   shadowQuality: 'high', // 'off', 'low', 'medium', 'high'
//   textureQuality: 'high',
//   renderScale: 1.0       // Resolution scale
// }
```

##### `setTargetFPS(fps)`

Change target framerate.

```typescript
// Switch to 120Hz mode
adaptive.setTargetFPS(120);

// Switch to 72Hz mode (Quest 2)
adaptive.setTargetFPS(72);
```

---

## Advanced Usage

### LOD Groups

Manage groups of related LOD objects.

```typescript
import { LODGroupManager } from '@hololand/lod';

const groups = new LODGroupManager();

// Create forest group
const forest = groups.createGroup('forest-1', {
  position: { x: 0, y: 0, z: 0 },
  bounds: { radius: 100 }
});

// Add trees to group
for (let i = 0; i < 1000; i++) {
  forest.addObject({
    id: `tree-${i}`,
    position: randomPosition(),
    levels: treeLODLevels
  });
}

// Update group (culls entire group if outside frustum)
function update() {
  groups.update(camera);

  groups.getVisibleGroups().forEach(group => {
    group.getVisibleObjects().forEach(obj => {
      renderer.render(obj);
    });
  });
}
```

### Distance-Based Culling

```typescript
import { DistanceCuller } from '@hololand/lod';

const distanceCuller = new DistanceCuller({
  maxDistance: 500,       // Hide objects beyond 500m
  fadeDistance: 50        // Fade out over 50m
});

function render() {
  objects.forEach(obj => {
    const result = distanceCuller.check(obj.position, camera.position);

    if (result.visible) {
      obj.opacity = result.opacity;  // Fade based on distance
      renderer.render(obj);
    }
  });
}
```

### Small Object Culling

```typescript
import { SmallObjectCuller } from '@hololand/lod';

const smallObjectCuller = new SmallObjectCuller({
  minScreenCoverage: 0.005  // 0.5% of screen
});

function render() {
  smallObjectCuller.update(camera);

  objects.forEach(obj => {
    const coverage = smallObjectCuller.calculateScreenCoverage(
      obj.position,
      obj.bounds.radius,
      camera
    );

    if (coverage > 0.005) {
      renderer.render(obj);
    }
  });
}
```

### Billboards for Distant Objects

```typescript
// Use billboards for very distant objects
lod.registerObject({
  id: 'mountain-1',
  position: { x: 1000, y: 0, z: 1000 },
  bounds: { radius: 200 },
  levels: [
    { distance: 0, mesh: 'mountain-high.glb' },
    { distance: 100, mesh: 'mountain-medium.glb' },
    { distance: 300, mesh: 'mountain-low.glb' },
    { distance: 800, mesh: 'mountain-billboard.png', isBillboard: true },
    { distance: 2000, mesh: null }
  ]
});

// Billboards always face camera
function renderBillboard(billboard, camera) {
  billboard.rotation.y = Math.atan2(
    camera.position.x - billboard.position.x,
    camera.position.z - billboard.position.z
  );
  renderer.render(billboard);
}
```

---

## Use Cases

### Open World Game

```typescript
// Massive open world with LOD
class OpenWorld {
  lod = new LODManager();
  culling = new CullingSystem({ maxDistance: 1000 });
  adaptive = new AdaptiveLODController({ targetFPS: 90 });

  async load() {
    // Load world chunks
    const chunks = await this.loadChunks();

    chunks.forEach(chunk => {
      chunk.objects.forEach(obj => {
        this.lod.registerObject({
          id: obj.id,
          position: obj.position,
          bounds: obj.bounds,
          levels: obj.lodLevels
        });
      });
    });
  }

  update(camera, deltaTime) {
    // Update systems
    this.lod.update(camera.position, camera.frustum);
    this.adaptive.update(deltaTime);

    // Apply adaptive quality
    const quality = this.adaptive.getCurrentQuality();
    this.lod.setDistanceMultiplier(quality.lodBias);

    // Render visible objects
    const visible = this.lod.getVisibleObjects();
    visible.forEach(obj => {
      this.renderer.render(obj);
    });
  }
}
```

### VR Social Platform

```typescript
// Optimize for many player avatars
const avatarLOD = new LODManager();

class AvatarManager {
  registerAvatar(player) {
    avatarLOD.registerObject({
      id: player.id,
      position: player.position,
      bounds: { radius: 1.0 },
      levels: [
        { distance: 0, mesh: player.avatar.high },     // 0-5m
        { distance: 5, mesh: player.avatar.medium },   // 5-15m
        { distance: 15, mesh: player.avatar.low },     // 15-50m
        { distance: 50, mesh: player.avatar.imposter } // 50m+ (simple quad)
      ]
    });
  }

  update() {
    avatarLOD.update(localPlayer.camera.position, localPlayer.camera.frustum);

    const visible = avatarLOD.getVisibleObjects();
    console.log(`Rendering ${visible.length} avatars`);
  }
}
```

### Architectural Visualization

```typescript
// Large building with interior/exterior LOD
const building = new LODGroupManager();

// Exterior when far away
building.createGroup('exterior', {
  position: buildingCenter,
  bounds: { radius: 50 },
  levels: [
    { distance: 0, enabled: false },      // Hide when inside
    { distance: 5, enabled: true, mesh: 'exterior-high.glb' },
    { distance: 50, enabled: true, mesh: 'exterior-low.glb' }
  ]
});

// Interior when inside
building.createGroup('interior', {
  position: buildingCenter,
  bounds: { radius: 50 },
  levels: [
    { distance: 0, enabled: true, mesh: 'interior-high.glb' },
    { distance: 5, enabled: false }       // Hide when outside
  ]
});
```

---

## Performance Tips

### LOD Level Guidelines

```typescript
// Recommended LOD levels for Quest 2/3

// Characters/NPCs
const characterLOD = [
  { distance: 0, polygons: 20000 },    // High detail (close)
  { distance: 5, polygons: 10000 },    // Medium
  { distance: 15, polygons: 3000 },    // Low
  { distance: 50, polygons: 100 }      // Imposter
];

// Buildings
const buildingLOD = [
  { distance: 0, polygons: 50000 },    // Ultra detail
  { distance: 30, polygons: 20000 },   // High
  { distance: 100, polygons: 5000 },   // Medium
  { distance: 300, polygons: 1000 },   // Low
  { distance: 1000, polygons: 10 }     // Billboard
];

// Vegetation (trees, grass)
const vegetationLOD = [
  { distance: 0, polygons: 10000 },    // High
  { distance: 20, polygons: 3000 },    // Medium
  { distance: 50, polygons: 500 },     // Low
  { distance: 100, polygons: 2 }       // Billboard
];
```

### Culling Performance

```typescript
// ❌ Bad - Check every object individually
objects.forEach(obj => {
  if (frustumCuller.isVisible(obj.position, obj.radius) &&
      distanceCuller.isVisible(obj.position, camera.position) &&
      occlusionCuller.isVisible(obj.position, obj.radius)) {
    renderer.render(obj);
  }
});

// ✅ Good - Use combined culling system
const visible = cullingSystem.update(camera, objects);
visible.forEach(obj => renderer.render(obj));
```

### Adaptive Quality Settings

```typescript
// Quality presets
const QUALITY_PRESETS = {
  ultraLow: {
    lodBias: 0.3,
    shadowQuality: 'off',
    textureQuality: 'low',
    renderScale: 0.7
  },
  low: {
    lodBias: 0.5,
    shadowQuality: 'low',
    textureQuality: 'medium',
    renderScale: 0.85
  },
  medium: {
    lodBias: 0.8,
    shadowQuality: 'medium',
    textureQuality: 'high',
    renderScale: 1.0
  },
  high: {
    lodBias: 1.0,
    shadowQuality: 'high',
    textureQuality: 'high',
    renderScale: 1.0
  },
  ultra: {
    lodBias: 1.5,
    shadowQuality: 'ultra',
    textureQuality: 'ultra',
    renderScale: 1.2
  }
};
```

---

## Platform Targets

### Quest 2/3

```typescript
const questLOD = new AdaptiveLODController({
  targetFPS: 90,      // Quest refresh rate
  minFPS: 72,         // Fallback
  maxFPS: 120         // Quest 3 supports 120Hz
});

// Conservative distance culling
const questCulling = new CullingSystem({
  maxDistance: 300,   // Limited draw distance
  minScreenSize: 0.02 // Cull small objects aggressively
});
```

### Desktop VR (Index, Vive)

```typescript
const desktopLOD = new AdaptiveLODController({
  targetFPS: 120,     // High refresh rate
  minFPS: 90
});

const desktopCulling = new CullingSystem({
  maxDistance: 1000,  // Larger draw distance
  minScreenSize: 0.005
});
```

### Browser WebXR

```typescript
const browserLOD = new AdaptiveLODController({
  targetFPS: 60,      // Conservative target
  minFPS: 45,
  aggressiveness: 0.7 // Adjust quickly
});
```

---

## Browser Support

| Browser | LOD | Frustum Culling | Adaptive Quality |
|---------|-----|-----------------|------------------|
| **Chrome/Edge** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Firefox** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Safari** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Examples

See [examples/lod](../../../examples/lod) for complete demos:
- Basic LOD system
- Frustum culling
- Adaptive quality
- Open world optimization

---

## TypeScript

Full TypeScript support:

```typescript
import type {
  LODConfig,
  LODLevel,
  CullingConfig,
  AdaptiveConfig,
  QualitySettings,
  Vec3,
  Frustum
} from '@hololand/lod';

const config: LODConfig = {
  id: 'object-1',
  position: { x: 0, y: 0, z: 0 },
  bounds: { radius: 5 },
  levels: [
    { distance: 0, mesh: 'high.glb' },
    { distance: 20, mesh: 'low.glb' }
  ]
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
- GPU occlusion culling
- More adaptive quality metrics
- Performance profiling tools
- Documentation improvements

---

## License

Elastic License 2.0 - See [LICENSE](../../../LICENSE)

---

## Related Packages

- [@hololand/renderer](../renderer) - VR/AR rendering
- [@hololand/streaming](../streaming) - Asset streaming
- [@hololand/world](../world) - World management
- [@hololand/pcg](../pcg) - Procedural generation

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
