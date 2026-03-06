# GPU Memory Budget Management System - Strategic Plan

## Executive Summary

Implementation of an intelligent GPU memory budget management system for HoloLand's scene graph, targeting 90fps VR presence with 2-3x object capacity versus naive approaches.

**Key Objectives:**
- Monitor GPU memory usage in real-time via WebGPU/Vulkan APIs
- Track active objects, textures, shaders, and materials
- Alert at 70% GPU memory utilization threshold
- Automatically trigger LOD reduction or object culling when thresholds exceeded
- Maintain 90fps VR performance with increased object density

## Architecture Overview

### 1. GPUMemoryManager (Core Component)

**Responsibilities:**
- WebGPU/Vulkan memory API integration
- Real-time VRAM tracking (textures, buffers, shaders)
- Memory budget threshold monitoring
- Event emission for threshold breaches

**Memory Tracking Categories:**
```typescript
interface MemoryBreakdown {
  textures: number;        // Texture VRAM in bytes
  geometryBuffers: number; // Vertex/index buffers in bytes
  shaderPrograms: number;  // Compiled shader memory
  renderTargets: number;   // Framebuffers and render targets
  other: number;           // Misc GPU allocations
  total: number;           // Total VRAM usage
  budgetMB: number;        // Total available VRAM
  utilizationPercent: number;
}
```

**Thresholds:**
- **70% Alert Threshold:** Warning state, preparation for optimization
- **80% Reduction Threshold:** Trigger LOD reduction
- **90% Critical Threshold:** Aggressive culling and simplification
- **95% Emergency Threshold:** Maximum performance mode

### 2. SceneGraphMemoryTracker (Integration Layer)

**Responsibilities:**
- Track all Three.js objects added to scene graph
- Maintain memory cost estimates per object
- Provide sorted lists for culling priority
- Integration with HololandRenderer

**Object Tracking:**
```typescript
interface TrackedObject {
  id: string;
  type: 'mesh' | 'texture' | 'material' | 'shader';
  memoryBytes: number;
  lastVisible: number;     // Timestamp of last visibility
  distanceToCamera: number;
  lodLevel: number;        // Current LOD (0=highest, 2=lowest)
  cullingPriority: number; // Higher = cull first
}
```

**Culling Priority Calculation:**
```typescript
priority =
  (1 - visibility_frequency) * 0.4 +
  (distance_to_camera / max_distance) * 0.3 +
  (memory_bytes / total_memory) * 0.2 +
  (time_since_visible / max_time) * 0.1
```

### 3. LODManager (Level of Detail System)

**Responsibilities:**
- Manage 3 LOD levels for each geometry
- Automatic LOD switching based on distance AND memory pressure
- Progressive mesh simplification

**LOD Levels:**
- **LOD0 (Full Quality):** 100% triangles, high-res textures (4K/2K)
- **LOD1 (Medium Quality):** 60% triangles, medium-res textures (2K/1K)
- **LOD2 (Low Quality):** 30% triangles, low-res textures (1K/512px)

**Distance Thresholds (dynamic based on memory pressure):**
```typescript
// Normal mode (< 70% memory)
LOD0: 0-20m
LOD1: 20-50m
LOD2: 50m+

// Memory pressure mode (> 70% memory)
LOD0: 0-10m  (50% reduction)
LOD1: 10-30m (40% reduction)
LOD2: 30m+   (40% reduction)
```

### 4. FrustumCullingManager (Visibility Optimization)

**Responsibilities:**
- Track objects outside camera frustum
- Disable rendering for non-visible objects
- Re-enable when objects enter view
- Integration with VR stereo frustums

**Frustum Culling Strategy:**
```typescript
// VR-specific: Dual frustum culling (left + right eye)
const isVisible =
  isInLeftEyeFrustum(object) ||
  isInRightEyeFrustum(object);

if (!isVisible && memoryPressure > 0.7) {
  // Unload textures but keep geometry
  unloadTextures(object);
}

if (!isVisible && memoryPressure > 0.85) {
  // Unload geometry + textures
  unloadObject(object);
}
```

### 5. OcclusionCullingManager (Advanced Optimization)

**Responsibilities:**
- Detect objects hidden behind opaque surfaces
- GPU-accelerated occlusion queries
- Temporal coherence for stability

**Occlusion Query Strategy:**
```typescript
// Phase 1: Render bounding boxes to depth buffer
// Phase 2: Query pixel visibility for each bounding box
// Phase 3: Disable rendering for occluded objects

if (pixelsVisible === 0 && memoryPressure > 0.7) {
  markOccluded(object);
  if (memoryPressure > 0.85) {
    unloadTextures(object);
  }
}
```

## Integration with Existing Systems

### VRPerformanceDegradationManager Integration

Extend existing quality degradation system to include memory management:

```typescript
// New quality settings for memory management
interface MemoryQualitySettings extends QualitySettings {
  // Existing LOD settings
  lodBias: number; // 0-2

  // New memory management settings
  maxTextureResolution: number; // 4096, 2048, 1024, 512
  textureCompressionEnabled: boolean;
  aggressiveCulling: boolean;
  occlusionCullingEnabled: boolean;
  maxLoadedObjects: number; // Object count limit
  distanceCullingMultiplier: number; // 1.0 = normal, 0.5 = aggressive
}
```

**Quality Level Memory Budgets:**
- **Level 0 (Full Quality):** 2GB VRAM budget, 5000 objects
- **Level 1 (Reduced Shadows):** 1.5GB VRAM, 4000 objects
- **Level 2 (Reduced Textures):** 1GB VRAM, 3000 objects
- **Level 3 (No Post-Processing):** 768MB VRAM, 2000 objects
- **Level 4 (Simplified Geometry):** 512MB VRAM, 1000 objects

### HololandRenderer Integration

Add memory manager to existing renderer pipeline:

```typescript
class HololandRenderer {
  private memoryManager: GPUMemoryManager;
  private sceneTracker: SceneGraphMemoryTracker;
  private lodManager: LODManager;
  private frustumCuller: FrustumCullingManager;
  private occlusionCuller: OcclusionCullingManager;

  constructor() {
    // Initialize memory management
    this.memoryManager = new GPUMemoryManager({
      budgetMB: 2048, // 2GB default
      alertThreshold: 0.70,
      reductionThreshold: 0.80,
      criticalThreshold: 0.90,
    });

    this.sceneTracker = new SceneGraphMemoryTracker(this.memoryManager);
    this.lodManager = new LODManager(this.sceneTracker);
    this.frustumCuller = new FrustumCullingManager();
    this.occlusionCuller = new OcclusionCullingManager(this.renderer);

    // Listen for memory events
    this.memoryManager.on('threshold:alert', () => this.onMemoryAlert());
    this.memoryManager.on('threshold:reduction', () => this.onMemoryReduction());
    this.memoryManager.on('threshold:critical', () => this.onMemoryCritical());
  }
}
```

## WebGPU/Vulkan Memory API Integration

### WebGPU Memory Tracking

```typescript
class WebGPUMemoryTracker {
  async getMemoryStats(): Promise<MemoryStats> {
    if (!navigator.gpu) {
      return this.fallbackToEstimation();
    }

    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

    // WebGPU doesn't expose VRAM directly yet
    // Use buffer allocation tracking + estimation
    const allocatedBuffers = this.trackAllocatedBuffers();
    const textureMemory = this.estimateTextureMemory();

    return {
      total: allocatedBuffers + textureMemory,
      budget: this.estimatedBudget,
      utilization: (allocatedBuffers + textureMemory) / this.estimatedBudget,
    };
  }

  private estimateTextureMemory(): number {
    let total = 0;
    this.trackedTextures.forEach(tex => {
      const bytesPerPixel = this.getBytesPerPixel(tex.format);
      total += tex.width * tex.height * tex.depth * bytesPerPixel;
    });
    return total;
  }
}
```

### Three.js WebGLRenderer Memory Tracking

```typescript
class ThreeJSMemoryTracker {
  getMemoryInfo(renderer: THREE.WebGLRenderer): MemoryInfo {
    const info = renderer.info;

    return {
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs.length,

      // Estimate VRAM usage
      estimatedVRAM: this.estimateVRAM(info),
    };
  }

  private estimateVRAM(info: any): number {
    // Geometry buffers
    const geometryMemory = info.memory.geometries * 50000; // ~50KB avg per geometry

    // Textures (major VRAM consumer)
    const textureMemory = this.estimateTextureMemory();

    // Shader programs
    const programMemory = info.programs.length * 10000; // ~10KB per program

    return geometryMemory + textureMemory + programMemory;
  }
}
```

## Performance Optimization Strategies

### Strategy 1: Lazy Loading (On-Demand)

```typescript
class LazyAssetLoader {
  async loadWhenNeeded(assetId: string, priority: number): Promise<Asset> {
    // Check memory before loading
    if (this.memoryManager.getUtilization() > 0.85) {
      // Defer low-priority loads
      if (priority < PRIORITY_THRESHOLD) {
        return this.loadPlaceholder(assetId);
      }

      // Make room by unloading distant objects
      await this.makeRoomForAsset(assetSize);
    }

    return this.loadAsset(assetId);
  }
}
```

### Strategy 2: Texture Streaming

```typescript
class TextureStreamingManager {
  // Load textures progressively: 512px → 1K → 2K → 4K
  streamTexture(texture: Texture, distance: number, memoryPressure: number) {
    const targetResolution = this.getTargetResolution(distance, memoryPressure);

    if (texture.currentResolution < targetResolution && memoryPressure < 0.8) {
      // Stream higher resolution
      this.upgradeTexture(texture, targetResolution);
    } else if (texture.currentResolution > targetResolution || memoryPressure > 0.85) {
      // Downgrade to save memory
      this.downgradeTexture(texture, targetResolution);
    }
  }
}
```

### Strategy 3: Geometry Instancing

```typescript
class InstancedMeshManager {
  // Reduce memory by instancing repeated geometry
  convertToInstanced(objects: THREE.Mesh[]): THREE.InstancedMesh {
    const sharedGeometry = objects[0].geometry;
    const instancedMesh = new THREE.InstancedMesh(
      sharedGeometry,
      material,
      objects.length
    );

    // Memory saved: (objects.length - 1) * geometry.memory
    const memorySaved = (objects.length - 1) * this.estimateGeometrySize(sharedGeometry);

    this.memoryManager.freeMemory(memorySaved);

    return instancedMesh;
  }
}
```

### Strategy 4: Texture Atlasing

```typescript
class TextureAtlasManager {
  // Combine multiple small textures into single atlas
  createAtlas(textures: Texture[]): TextureAtlas {
    const atlas = this.packTextures(textures);

    // Memory saved: texture overhead reduction
    const memorySaved = textures.length * TEXTURE_OVERHEAD - TEXTURE_OVERHEAD;

    this.memoryManager.freeMemory(memorySaved);

    return atlas;
  }
}
```

## 90fps VR Presence Targets

### Frame Budget Breakdown (11.1ms per frame)

```
Total Budget:          11.1ms
├─ GPU Rendering:      6.0ms (54%)
│  ├─ Geometry:        2.0ms
│  ├─ Textures:        1.5ms
│  ├─ Shaders:         1.0ms
│  └─ Post-FX:         1.5ms
├─ CPU Simulation:     2.5ms (23%)
├─ Memory Ops:         0.5ms (5%)  ← New overhead from memory manager
└─ System Overhead:    2.1ms (18%)
```

**Memory Manager Performance Budget:**
- Memory tracking: 0.1ms per frame
- LOD updates: 0.2ms per frame (not every frame)
- Culling checks: 0.2ms per frame

**Optimization Target:**
- Support 2-3x more objects than naive approach
- Naive: ~500 complex objects at 90fps
- Target: **1000-1500 complex objects at 90fps**

### Performance Validation Tests

```typescript
// Test 1: Memory pressure test
async function testMemoryPressure() {
  const scene = createComplexScene(1500); // 3x object count
  const fps = measureFPS(scene, 60000); // Measure for 60 seconds

  assert(fps.average >= 90, 'FPS must maintain 90+');
  assert(fps.p99 <= 12, 'P99 frame time must be ≤12ms');
  assert(memory.utilizationPeak <= 0.95, 'Peak memory ≤95%');
}

// Test 2: LOD transition smoothness
async function testLODTransitions() {
  const scene = createMovingCameraScene();
  const lodChanges = trackLODChanges(scene, 30000);

  assert(lodChanges.popInVisible.length === 0, 'No visible popping');
  assert(lodChanges.smoothness >= 0.95, 'Smooth transitions');
}

// Test 3: Culling effectiveness
async function testCulling() {
  const scene = createLargeScene(5000);
  const cullingStats = measureCullingEffectiveness(scene);

  assert(cullingStats.renderedObjects <= 1500, 'Effective culling');
  assert(cullingStats.memoryReduction >= 0.60, '60% memory reduction');
}
```

## Implementation Roadmap

### Phase 1: Core Memory Manager (Day 1-2)
- [ ] GPUMemoryManager class with threshold monitoring
- [ ] WebGPU/Three.js memory API integration
- [ ] Basic memory tracking and event emission
- [ ] Unit tests for memory estimation

### Phase 2: Scene Graph Tracking (Day 2-3)
- [ ] SceneGraphMemoryTracker integration
- [ ] Object registration and memory estimation
- [ ] Culling priority calculation
- [ ] HololandRenderer integration

### Phase 3: LOD System (Day 3-4)
- [ ] LODManager with 3 quality levels
- [ ] Distance-based LOD switching
- [ ] Memory-pressure-based threshold adjustment
- [ ] LOD transition smoothing

### Phase 4: Culling Systems (Day 4-5)
- [ ] FrustumCullingManager with VR stereo support
- [ ] OcclusionCullingManager with GPU queries
- [ ] Automatic texture/geometry unloading
- [ ] Culling performance optimization

### Phase 5: Advanced Optimizations (Day 5-6)
- [ ] Lazy loading system
- [ ] Texture streaming
- [ ] Geometry instancing
- [ ] Texture atlasing

### Phase 6: Integration & Testing (Day 6-7)
- [ ] VRPerformanceDegradationManager integration
- [ ] 90fps validation tests
- [ ] Memory pressure stress tests
- [ ] LOD transition quality tests
- [ ] Comprehensive documentation

## Success Metrics

### Primary Metrics
- **Object Capacity:** 2-3x increase (500 → 1000-1500 objects)
- **Frame Rate:** Maintain 90fps minimum in VR
- **Frame Time P99:** ≤12ms (stable performance)
- **Memory Utilization:** Peak ≤95% of budget

### Secondary Metrics
- **Memory Tracking Overhead:** ≤0.5ms per frame
- **LOD Transition Quality:** No visible popping artifacts
- **Culling Effectiveness:** ≥60% memory reduction on large scenes
- **Emergency Response Time:** <1 second to stabilize from OOM

## Risk Mitigation

### Risk 1: Performance Overhead
**Mitigation:**
- Amortize memory tracking across multiple frames
- Cache memory estimates for static objects
- Use worker threads for heavy calculations

### Risk 2: WebGPU API Limitations
**Mitigation:**
- Fallback to estimation when APIs unavailable
- Hybrid approach: API data + heuristics
- Gradual degradation if unsupported

### Risk 3: LOD Popping Artifacts
**Mitigation:**
- Smooth transitions with alpha blending
- Hysteresis in LOD switching (prevent thrashing)
- User testing for visual quality validation

### Risk 4: VR Motion Sickness
**Mitigation:**
- Never drop below 85fps (avoid stuttering)
- Aggressive emergency culling at 95% memory
- Graceful degradation over hard cutoffs

## Knowledge Compression (W/P/G Format)

### W.011: GPU Memory Budget Management | ⚡0.96
**Scene graph memory management targeting 2-3x object capacity requires multi-layer approach:** (1) Real-time WebGPU/Vulkan memory tracking, (2) Distance + memory-pressure-based LOD system, (3) Frustum + occlusion culling, (4) Texture streaming + geometry instancing. Alert at 70%, reduce at 80%, critical at 90%. VR requires <0.5ms overhead to maintain 90fps (11.1ms budget).

### P.004: VR Memory Pressure LOD Scaling | ⚡0.94
**LOD distance thresholds must dynamically adjust based on memory pressure.** Normal mode (LOD0: 0-20m, LOD1: 20-50m, LOD2: 50m+). Memory pressure mode at 70%+ (LOD0: 0-10m, LOD1: 10-30m, LOD2: 30m+) = 50% distance reduction. Prevents memory exhaustion while maintaining close-range quality.

### P.005: Culling Priority Scoring | ⚡0.93
**Effective culling requires weighted priority scoring:** visibility_frequency (40%) + distance_to_camera (30%) + memory_cost (20%) + time_since_visible (10%). Ensures high-memory distant objects cull first while protecting frequently visible objects regardless of memory cost.

### G.003: WebGPU Memory API Limitations | ⚠️CRITICAL
**WebGPU doesn't expose VRAM usage directly yet.** Must use hybrid approach: track allocated buffers + estimate texture memory from format/dimensions + cache estimation for static objects. Fallback to Three.js renderer.info when WebGPU unavailable. Over-estimation (110% buffer) safer than under-estimation for VR stability.

---

**Strategic Plan Version:** 1.0
**Target Completion:** 7 days
**Primary Goal:** 2-3x object capacity at 90fps VR presence
