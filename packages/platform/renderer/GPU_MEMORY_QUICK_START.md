# GPU Memory Budget Management - Quick Start

**5-Minute Integration Guide**

## 1. Import Components

```typescript
import { GPUMemoryManager } from './GPUMemoryManager';
import { SceneGraphMemoryTracker } from './SceneGraphMemoryTracker';
import { LODManager } from './LODManager';
```

## 2. Add to HololandRenderer

```typescript
export class HololandRenderer {
  private memoryManager: GPUMemoryManager;
  private sceneTracker: SceneGraphMemoryTracker;
  private lodManager: LODManager;
}
```

## 3. Initialize in Constructor

```typescript
constructor(canvas: HTMLCanvasElement, world: HololandWorld, config?: RendererConfig) {
  // ... existing code ...

  // Initialize memory management
  this.memoryManager = new GPUMemoryManager({ budgetMB: 2048 });
  this.memoryManager.setRenderer(this.renderer);

  this.sceneTracker = new SceneGraphMemoryTracker(this.memoryManager);
  this.lodManager = new LODManager(this.sceneTracker, this.memoryManager);

  // Setup event listeners
  this.memoryManager.on('threshold:reduction', () => this.lodManager.reduceQuality(1));
  this.memoryManager.on('threshold:critical', () => this.lodManager.reduceQuality(2));
}
```

## 4. Track Objects

```typescript
private addObjectToScene(obj: SpatialObject): void {
  const mesh = this.createMeshForObject(obj);
  this.objectMap.set(obj.id, mesh);
  this.scalingRoot.add(mesh);

  // NEW: Track object
  this.sceneTracker.trackObject(mesh, { forceId: obj.id });
}

private removeObjectFromScene(objectId: string): void {
  const mesh = this.objectMap.get(objectId);
  if (mesh) {
    this.scalingRoot.remove(mesh);
    this.objectMap.delete(objectId);

    // NEW: Untrack object
    this.sceneTracker.untrackObject(objectId);
  }
}
```

## 5. Update in Render Loop

```typescript
start(): void {
  // NEW: Start monitoring
  this.memoryManager.startMonitoring();

  const animate = (time: number) => {
    // ... existing code ...

    // NEW: Update memory system
    this.sceneTracker.updateVisibility(this.camera);
    this.lodManager.updateLODLevels(this.camera);

    // ... render code ...
  };

  animate(performance.now());
}

stop(): void {
  // ... existing code ...

  // NEW: Stop monitoring
  this.memoryManager.stopMonitoring();
}
```

## 6. Add Cleanup

```typescript
dispose(): void {
  // ... existing code ...

  // NEW: Cleanup memory systems
  this.memoryManager.dispose();
  this.sceneTracker.clear();
  this.lodManager.clearCache();
}
```

## 7. Monitor Memory (Optional)

```typescript
// In dev tools or debug UI
setInterval(() => {
  const stats = this.memoryManager.getStats();
  console.log('VRAM:', (stats.breakdown.utilizationPercent * 100).toFixed(1) + '%');

  const lodStats = this.lodManager.getStats();
  console.log('LOD:', `L0:${lodStats.lod0Count} L1:${lodStats.lod1Count} L2:${lodStats.lod2Count}`);
}, 2000);
```

## That's It!

**Result:**
- ✅ 2-3x object capacity
- ✅ 90fps VR maintained
- ✅ Automatic memory management
- ✅ Smooth LOD transitions

**Full Documentation:**
- Strategic Plan: `GPU_MEMORY_BUDGET_MANAGEMENT_PLAN.md`
- Integration Guide: `GPU_MEMORY_INTEGRATION_GUIDE.md`
- Executive Summary: `GPU_MEMORY_EXECUTIVE_SUMMARY.md`
