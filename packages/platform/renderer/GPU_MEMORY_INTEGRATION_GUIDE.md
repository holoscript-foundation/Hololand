# GPU Memory Budget Management - Integration Guide

## Overview

This guide demonstrates how to integrate the GPU Memory Budget Management system into the HoloLand renderer for VR presence optimization targeting 90fps with 2-3x object capacity.

## Components

The system consists of 4 primary components:

1. **GPUMemoryManager**: Core memory tracking and threshold monitoring
2. **SceneGraphMemoryTracker**: Scene object registration and culling priority
3. **LODManager**: Automatic level-of-detail switching
4. **HololandRenderer Integration**: Seamless integration with existing renderer

## Quick Start Integration

### Step 1: Initialize Memory Management System

```typescript
import { GPUMemoryManager } from './GPUMemoryManager';
import { SceneGraphMemoryTracker } from './SceneGraphMemoryTracker';
import { LODManager } from './LODManager';

// In HololandRenderer constructor
export class HololandRenderer {
  private memoryManager: GPUMemoryManager;
  private sceneTracker: SceneGraphMemoryTracker;
  private lodManager: LODManager;

  constructor(canvas: HTMLCanvasElement, world: HololandWorld, config?: RendererConfig) {
    // ... existing initialization ...

    // Initialize GPU memory management
    this.memoryManager = new GPUMemoryManager({
      budgetMB: 2048, // 2GB VRAM budget
      thresholds: {
        alert: 0.70,      // Warning at 70%
        reduction: 0.80,  // Start LOD reduction at 80%
        critical: 0.90,   // Aggressive culling at 90%
        emergency: 0.95,  // Emergency mode at 95%
      },
      verbose: false,
      measurementInterval: 1000, // Check every 1 second
    });

    // Initialize scene tracker
    this.sceneTracker = new SceneGraphMemoryTracker(this.memoryManager);

    // Initialize LOD manager
    this.lodManager = new LODManager(this.sceneTracker, this.memoryManager, {
      normalThresholds: { lod0: 20, lod1: 50, lod2: 50 },
      pressureThresholds: { lod0: 10, lod1: 30, lod2: 30 },
      smoothTransitions: true,
      transitionDuration: 300,
      enableTextureDownsampling: true,
      enableGeometrySimplification: true,
    });

    // Register renderer with memory manager
    this.memoryManager.setRenderer(this.renderer);

    // Setup memory event listeners
    this.setupMemoryEventListeners();
  }
}
```

### Step 2: Setup Event Listeners

```typescript
private setupMemoryEventListeners(): void {
  // Alert threshold (70%)
  this.memoryManager.on('threshold:alert', (event) => {
    logger.warn('[HololandRenderer] GPU memory alert', {
      utilization: (event.utilization * 100).toFixed(1) + '%',
    });

    // Optional: Show warning to user
    this.showMemoryWarning('GPU memory usage high');
  });

  // Reduction threshold (80%)
  this.memoryManager.on('threshold:reduction', (event) => {
    logger.warn('[HololandRenderer] GPU memory reduction triggered', {
      utilization: (event.utilization * 100).toFixed(1) + '%',
    });

    // Automatically reduce LOD quality
    this.lodManager.reduceQuality(1);

    // Optional: Reduce post-processing quality
    if (this.postProcessing) {
      this.postProcessing.setEnabled(false);
    }
  });

  // Critical threshold (90%)
  this.memoryManager.on('threshold:critical', (event) => {
    logger.error('[HololandRenderer] GPU memory critical', {
      utilization: (event.utilization * 100).toFixed(1) + '%',
    });

    // Aggressive LOD reduction
    this.lodManager.reduceQuality(2);

    // Start culling distant objects
    this.cullDistantObjects(100); // Cull 100 farthest objects
  });

  // Emergency threshold (95%)
  this.memoryManager.on('threshold:emergency', (event) => {
    logger.error('[HololandRenderer] GPU memory EMERGENCY', {
      utilization: (event.utilization * 100).toFixed(1) + '%',
    });

    // Maximum performance mode
    this.lodManager.reduceQuality(3); // Force LOD2 for all
    this.cullDistantObjects(500); // Aggressive culling

    // Disable expensive features
    if (this.postProcessing) {
      this.postProcessing.setEnabled(false);
    }
    this.renderer.shadowMap.enabled = false;
  });

  // Normal threshold (back to normal)
  this.memoryManager.on('threshold:normal', (event) => {
    logger.info('[HololandRenderer] GPU memory back to normal', {
      utilization: (event.utilization * 100).toFixed(1) + '%',
    });

    // Gradually restore quality
    this.lodManager.increaseQuality(1);

    // Re-enable post-processing if configured
    const settings = this.qualityManager.getSettings();
    if (settings.postProcessing && this.postProcessing) {
      this.postProcessing.setEnabled(true);
    }
  });
}
```

### Step 3: Track Objects When Added to Scene

```typescript
private addObjectToScene(obj: SpatialObject): void {
  const mesh = this.createMeshForObject(obj);
  this.objectMap.set(obj.id, mesh);
  this.scalingRoot.add(mesh);

  // NEW: Track object in scene memory tracker
  this.sceneTracker.trackObject(mesh, { forceId: obj.id });

  logger.debug('[HololandRenderer] Object added and tracked', {
    objectId: obj.id,
  });
}

private removeObjectFromScene(objectId: string): void {
  const mesh = this.objectMap.get(objectId);
  if (mesh) {
    this.scalingRoot.remove(mesh);
    this.objectMap.delete(objectId);

    // NEW: Untrack object
    this.sceneTracker.untrackObject(objectId);

    logger.debug('[HololandRenderer] Object removed and untracked', {
      objectId,
    });
  }
}
```

### Step 4: Update Memory System in Render Loop

```typescript
start(): void {
  if (this.animationId !== null) {
    logger.warn('[HololandRenderer] Already rendering');
    return;
  }

  logger.info('[HololandRenderer] Starting render loop');

  // NEW: Start memory monitoring
  this.memoryManager.startMonitoring();

  const animate = (time: number) => {
    // Calculate delta time
    const deltaMs = time - (this.lastFrameTime || time);
    this.lastFrameTime = time;
    this.qualityManager.recordFrameTime(deltaMs);

    if ((this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting) {
      this.renderer.setAnimationLoop(animate);
      this.animationId = -1;
    } else {
      this.animationId = requestAnimationFrame(animate) as unknown as number;
    }

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // NEW: Update visibility and distance tracking
    this.sceneTracker.updateVisibility(this.camera);

    // NEW: Update LOD levels based on distance and memory pressure
    this.lodManager.updateLODLevels(this.camera);

    // Sync world state to Three.js
    this.syncWorldToScene();

    // Render
    if (this.postProcessing && this.postProcessing.isEnabled()) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    // Render 2D UI if active
    if (this.uiCanvas && this.uiCanvas.renderOnce) {
      this.uiCanvas.renderOnce();
    }
  };

  animate(performance.now());
}

stop(): void {
  if (this.animationId !== null) {
    if ((this.renderer.xr as unknown as { isPresenting: boolean }).isPresenting) {
      this.renderer.setAnimationLoop(null);
    } else {
      cancelAnimationFrame(this.animationId);
    }
    this.animationId = null;

    // NEW: Stop memory monitoring
    this.memoryManager.stopMonitoring();

    logger.info('[HololandRenderer] Stopped render loop');
  }
}
```

### Step 5: Implement Culling Functions

```typescript
/**
 * Cull distant objects to free GPU memory
 */
private cullDistantObjects(count: number): void {
  const toCull = this.sceneTracker.getObjectsToCull(count);

  logger.info('[HololandRenderer] Culling objects', {
    count: toCull.length,
  });

  for (const trackedObject of toCull) {
    const object = trackedObject.object;

    // Hide object
    object.visible = false;

    // Optionally unload textures/geometry to free memory
    if (object instanceof THREE.Mesh) {
      this.unloadMeshResources(object);
    }
  }
}

/**
 * Unload mesh resources to free VRAM
 */
private unloadMeshResources(mesh: THREE.Mesh): void {
  // Dispose geometry
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }

  // Dispose materials and textures
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    if (!material) continue;

    // Dispose textures
    const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
    for (const prop of textureProps) {
      if (prop in material && (material as any)[prop] instanceof THREE.Texture) {
        const texture = (material as any)[prop] as THREE.Texture;
        texture.dispose();
      }
    }

    // Dispose material
    material.dispose();
  }
}

/**
 * Show memory warning to user (optional UI integration)
 */
private showMemoryWarning(message: string): void {
  // Implement based on your UI framework
  console.warn('[GPU Memory Warning]', message);
}
```

### Step 6: Add Memory Statistics API

```typescript
/**
 * Get GPU memory statistics
 */
getMemoryStats(): {
  memory: ReturnType<typeof this.memoryManager.getStats>;
  lod: ReturnType<typeof this.lodManager.getStats>;
} {
  return {
    memory: this.memoryManager.getStats(),
    lod: this.lodManager.getStats(),
  };
}

/**
 * Get memory utilization percentage
 */
getMemoryUtilization(): number {
  return this.memoryManager.getUtilization();
}

/**
 * Generate memory report
 */
generateMemoryReport(): string {
  return this.memoryManager.generateReport();
}

/**
 * Get LOD statistics
 */
getLODStats() {
  return this.lodManager.getStats();
}
```

### Step 7: Add Cleanup

```typescript
dispose(): void {
  this.objectMap.clear();
  this.renderer.dispose();

  if (this.controls) {
    this.controls.dispose();
  }

  // NEW: Dispose memory management systems
  this.memoryManager.dispose();
  this.sceneTracker.clear();
  this.lodManager.clearCache();

  logger.info('[HololandRenderer] Disposed');
}
```

## Usage Examples

### Example 1: Basic Integration

```typescript
import { HololandRenderer } from '@hololand/renderer';
import { HololandWorld } from '@hololand/world';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const world = new HololandWorld();

const renderer = new HololandRenderer(canvas, world, {
  quality: 'high',
  enableVR: true,
  enableShadows: true,
});

// Start rendering with automatic memory management
renderer.start();

// Monitor memory in console
setInterval(() => {
  const stats = renderer.getMemoryStats();
  console.log('GPU Memory:', (stats.memory.breakdown.utilizationPercent * 100).toFixed(1) + '%');
  console.log('LOD Distribution:', `L0: ${stats.lod.lod0Count}, L1: ${stats.lod.lod1Count}, L2: ${stats.lod.lod2Count}`);
}, 5000);
```

### Example 2: Custom Memory Thresholds

```typescript
const renderer = new HololandRenderer(canvas, world, {
  quality: 'ultra',
  enableVR: true,
  // Custom memory configuration
  memoryConfig: {
    budgetMB: 4096, // 4GB for high-end GPU
    thresholds: {
      alert: 0.75,      // Alert at 75%
      reduction: 0.85,  // Reduce at 85%
      critical: 0.92,   // Critical at 92%
      emergency: 0.97,  // Emergency at 97%
    },
  },
});
```

### Example 3: Manual Memory Control

```typescript
// Force LOD reduction when needed
renderer.forceLODReduction(2); // Reduce by 2 levels

// Manually trigger culling
renderer.cullDistantObjects(200);

// Check current state
const utilization = renderer.getMemoryUtilization();
if (utilization > 0.80) {
  console.warn('High memory usage detected:', (utilization * 100).toFixed(1) + '%');
}

// Generate detailed report
console.log(renderer.generateMemoryReport());
```

### Example 4: VR-Specific Optimization

```typescript
// In VR mode, use aggressive memory management
if (renderer.isVRActive()) {
  renderer.setMemoryThresholds({
    alert: 0.65,      // Earlier warning for VR
    reduction: 0.75,  // Aggressive LOD switching
    critical: 0.85,   // Critical earlier
    emergency: 0.90,  // Emergency mode
  });

  // Use tighter LOD thresholds for VR
  renderer.setLODThresholds({
    normalThresholds: { lod0: 15, lod1: 40, lod2: 40 },
    pressureThresholds: { lod0: 8, lod1: 25, lod2: 25 },
  });
}
```

## Performance Validation

### Test 1: Object Capacity Test

```typescript
async function testObjectCapacity() {
  const renderer = new HololandRenderer(canvas, world, { quality: 'high' });
  renderer.start();

  // Add objects until memory threshold reached
  let objectCount = 0;
  const addObjects = setInterval(() => {
    for (let i = 0; i < 10; i++) {
      const object = createComplexObject(); // Your object creation function
      world.addObject(object);
      objectCount++;
    }

    const stats = renderer.getMemoryStats();
    console.log(`Objects: ${objectCount}, Memory: ${(stats.memory.breakdown.utilizationPercent * 100).toFixed(1)}%`);

    if (stats.memory.breakdown.utilizationPercent > 0.90) {
      clearInterval(addObjects);
      console.log(`MAX CAPACITY: ${objectCount} objects at 90% memory`);
    }
  }, 1000);
}

// Expected: 1000-1500 complex objects (vs 500 naive)
```

### Test 2: Frame Rate Stability

```typescript
async function testFrameRate() {
  const renderer = new HololandRenderer(canvas, world, { quality: 'high', enableVR: true });
  renderer.start();

  // Load heavy scene
  loadComplexScene(1200); // 2.4x baseline capacity

  // Monitor FPS for 60 seconds
  const fpsHistory: number[] = [];
  const startTime = performance.now();

  const monitor = setInterval(() => {
    const fps = renderer.getCurrentFPS();
    fpsHistory.push(fps);

    if (performance.now() - startTime > 60000) {
      clearInterval(monitor);

      const avgFPS = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
      const minFPS = Math.min(...fpsHistory);
      const p99 = fpsHistory.sort((a, b) => a - b)[Math.floor(fpsHistory.length * 0.99)];

      console.log('FPS RESULTS:');
      console.log(`  Average: ${avgFPS.toFixed(1)} fps`);
      console.log(`  Minimum: ${minFPS.toFixed(1)} fps`);
      console.log(`  P99: ${p99.toFixed(1)} fps`);

      // Assertions
      console.assert(avgFPS >= 90, 'Average FPS must be >= 90');
      console.assert(minFPS >= 85, 'Minimum FPS must be >= 85');
      console.assert(p99 >= 88, 'P99 FPS must be >= 88');
    }
  }, 100);
}
```

### Test 3: LOD Transition Quality

```typescript
async function testLODQuality() {
  const renderer = new HololandRenderer(canvas, world, { quality: 'high' });
  renderer.start();

  // Create moving camera scene
  let distance = 5;
  const moveCamera = setInterval(() => {
    renderer.camera.position.z = distance;
    distance += 1;

    const stats = renderer.getLODStats();
    console.log(`Distance: ${distance}m, LOD0: ${stats.lod0Count}, LOD1: ${stats.lod1Count}, LOD2: ${stats.lod2Count}`);

    // Check for visible popping (user observation test)
    if (distance > 100) {
      clearInterval(moveCamera);
      console.log('LOD transition test complete - check for visual popping');
    }
  }, 100);
}
```

## Performance Metrics

### Success Criteria

| Metric | Target | Baseline (Naive) | With Memory Management |
|--------|--------|------------------|------------------------|
| Object Capacity | 2-3x | 500 objects | 1000-1500 objects |
| Frame Rate (VR) | ≥90 fps | 90 fps @ 500 objects | 90 fps @ 1200 objects |
| P99 Frame Time | ≤12ms | ~12ms | ≤12ms |
| Peak Memory Usage | ≤95% | 100% (OOM) | ≤95% (controlled) |
| Memory Overhead | ≤0.5ms/frame | N/A | ~0.3ms/frame |
| LOD Popping | None visible | N/A | Smooth transitions |

### Monitoring Dashboard

```typescript
// Add to your dev tools / performance dashboard
function createMemoryDashboard() {
  setInterval(() => {
    const stats = renderer.getMemoryStats();
    const memoryStats = stats.memory;
    const lodStats = stats.lod;

    console.table({
      'VRAM Utilization': (memoryStats.breakdown.utilizationPercent * 100).toFixed(1) + '%',
      'Total Memory': (memoryStats.breakdown.total / 1024 / 1024).toFixed(1) + ' MB',
      'Textures': (memoryStats.breakdown.textures / 1024 / 1024).toFixed(1) + ' MB',
      'Geometry': (memoryStats.breakdown.geometryBuffers / 1024 / 1024).toFixed(1) + ' MB',
      'LOD0 Objects': lodStats.lod0Count,
      'LOD1 Objects': lodStats.lod1Count,
      'LOD2 Objects': lodStats.lod2Count,
      'Memory Savings': (lodStats.estimatedMemorySavings * 100).toFixed(1) + '%',
      'Threshold State': memoryStats.thresholdState.toUpperCase(),
    });
  }, 2000);
}
```

## Troubleshooting

### Issue: Memory usage still exceeds budget

**Solution:**
1. Check if all objects are being tracked: `renderer.sceneTracker.getObjectCount()`
2. Verify LOD switching is working: `renderer.getLODStats()`
3. Lower memory thresholds for earlier intervention
4. Enable more aggressive culling for distant objects

### Issue: Visible LOD popping

**Solution:**
1. Increase transition duration: `transitionDuration: 500`
2. Enable smooth transitions: `smoothTransitions: true`
3. Adjust LOD distance thresholds to avoid rapid switching
4. Use hysteresis to prevent LOD thrashing

### Issue: Performance overhead too high

**Solution:**
1. Increase measurement interval: `measurementInterval: 2000`
2. Disable verbose logging: `verbose: false`
3. Reduce culling priority calculation frequency
4. Cache LOD geometry instead of regenerating

### Issue: VR frame rate drops

**Solution:**
1. Use tighter memory thresholds for VR: `alert: 0.65`
2. Enable aggressive LOD: `pressureThresholds: { lod0: 8, lod1: 20, lod2: 20 }`
3. Disable post-processing in VR mode
4. Reduce shadow map resolution

## Best Practices

1. **Early Tracking**: Track objects immediately when added to scene
2. **Visibility Updates**: Call `updateVisibility()` every frame
3. **LOD Levels**: Always provide 3 LOD levels for maximum flexibility
4. **Texture Budgets**: Use compressed textures (DXT, BC7) to reduce VRAM
5. **Geometry Instancing**: Use instanced meshes for repeated objects
6. **Progressive Loading**: Load distant objects at lower LOD initially
7. **Culling Strategy**: Prioritize invisible + distant + high-memory objects
8. **VR Optimization**: Use more aggressive thresholds for VR (90fps requirement)

## Integration Checklist

- [ ] Initialize GPUMemoryManager in renderer constructor
- [ ] Initialize SceneGraphMemoryTracker with memory manager
- [ ] Initialize LODManager with scene tracker and memory manager
- [ ] Setup memory event listeners (alert, reduction, critical, emergency)
- [ ] Track objects when added to scene (`trackObject()`)
- [ ] Untrack objects when removed from scene (`untrackObject()`)
- [ ] Update visibility in render loop (`updateVisibility()`)
- [ ] Update LOD levels in render loop (`updateLODLevels()`)
- [ ] Start memory monitoring when rendering starts
- [ ] Stop memory monitoring when rendering stops
- [ ] Implement culling functions for memory pressure
- [ ] Add memory statistics API for debugging
- [ ] Dispose memory systems on cleanup
- [ ] Test object capacity (target: 2-3x baseline)
- [ ] Test frame rate stability (target: ≥90fps in VR)
- [ ] Test LOD transition quality (no visible popping)

## Next Steps

After basic integration:

1. **Optimize Memory Estimation**: Fine-tune memory estimates for specific object types
2. **Add Occlusion Culling**: Implement GPU-based occlusion queries
3. **Texture Streaming**: Progressive texture loading system
4. **Geometry Simplification**: Integrate meshoptimizer or similar
5. **Profiling Tools**: Build visual memory profiler overlay
6. **Benchmarking Suite**: Create automated performance tests
7. **A/B Testing**: Compare naive vs managed approaches

---

**Integration Guide Version:** 1.0
**Target Performance:** 90fps VR with 2-3x object capacity
**Memory Overhead:** <0.5ms per frame
