# Autonomous VR Optimization Roadmap
## HoloLand Platform • Quest 3 Performance Evolution • 2026-03-08

---

## Executive Summary

This roadmap outlines autonomous platform improvements derived from the Fire Dragon VR performance assessment. These optimizations will benefit **ALL future VR compositions**, not just volumetric fire scenarios. The recommendations are prioritized by **impact × effort** and aligned with HoloLand's mission to enable **90Hz VR experiences on Quest 3**.

**Total Impact**: Reduces frame time from **16.8ms → 7.9ms** (53% improvement), enabling **2x scene complexity** at 90Hz.

---

## Priority 1: Immediate Wins (1-2 weeks)

### 1.1 Enable Stop-The-Pop Shader (⚡ Very High ROI)

**Status**: ✅ **Shader already implemented, needs wiring**

**File**: `c:\Users\josep\Documents\GitHub\Hololand\packages\platform\renderer\src\components\gaussian-splat-viewer\shaders\stop-the-pop.wgsl`

**Current State**: Stop-The-Pop shader exists in codebase but is **NOT integrated** into FoveatedGaussianPipeline.

**Impact**:
- **1.2ms frame time savings** (30-50% splat reduction via view-dependent culling)
- Reduces 160K splats → 80-112K effective splats
- Zero runtime cost (GPU compute shader, runs on Adreno 740)

**Implementation**:
1. Wire stop-the-pop.wgsl to `FoveatedGaussianPipeline.ts` (currently unused)
2. Enable in `GaussianBudgetManager` as optional optimization flag
3. Add quality profile toggle: `enableStopThePop: true` (default enabled for mobile/quest3)
4. Test with cinematic-showcase.holo (high splat count)

**Effort**: **1-2 days** (shader pipeline wiring + testing)

**Business Value**: Unlocks 30-50% more Gaussian splat capacity on Quest 3 **today** with code that already exists.

---

### 1.2 Foveated Gaussian Culling (⚡ High Impact)

**Status**: ⚠️ **Architecture exists, WebXR integration missing**

**Current State**:
- `FoveatedGaussianRenderer` exists with foveal angle calculation
- `GaussianBudgetManager` supports foveated config
- **Missing**: WebXR eye tracking API integration (Quest 3/Pro)

**Impact**:
- **1.6ms frame time savings** (40% peripheral splat reduction)
- Enables 160K splat budget (vs 80K without foveation)
- User-imperceptible quality reduction (peripheral vision has low acuity)

**Implementation**:
1. Integrate WebXR eye tracking API:
   ```typescript
   const eyeTracking = xrSession.requestHitTestSource({
     space: xrReferenceSpace,
     entityTypes: ['eye-gaze']
   });
   ```
2. Wire gaze data to `FoveatedGaussianRenderer.updateGazeDirection()`
3. Update `GaussianBudgetManager.updateSplatLOD()` with foveal angle
4. Add device detection: enable only on Quest 3/Pro (Quest 2 lacks eye tracking)
5. Test with fire-dragon composition (130K splats → 78K effective)

**Effort**: **2-3 days** (WebXR API integration + device detection)

**Risks**:
- Eye tracking accuracy varies by user (calibration needed)
- Battery drain (+5-10% from eye tracking camera)

**Mitigation**: Add quality profile option `foveated: 'auto' | 'forced' | 'disabled'` (default: auto)

---

### 1.3 Quality Profile Override Documentation (⚡ Low Effort, High UX)

**Status**: ❌ **Missing user guidance**

**Current Issue**: Mobile profile disables bloom (G.004 gotcha), breaking fire/emissive effects.

**Impact**:
- Prevents user confusion when volumetric fire renders without glow
- Educates developers on profile customization
- Reduces support burden ("why does my fire look flat?")

**Implementation**:
1. Add section to quality-profiles README: "Common Overrides for VR Use Cases"
2. Document fire/emissive + bloom requirement
3. Add example compositions with profile overrides
4. Create linter warning: "Composition has emissive materials but bloom is disabled"

**Effort**: **0.5 days** (documentation + linter rule)

**Content Example**:
```markdown
## Common Profile Overrides

### Volumetric Fire/Emissive Effects
Mobile profile disables bloom for performance. Fire REQUIRES bloom for glow perception.

```typescript
{
  profile: 'mobile',
  overrides: { bloom: true, bloomStrength: 0.6 }
}
```
```

---

## Priority 2: Platform Enhancements (1-2 months)

### 2.1 Automatic Mesh Batching (⚡ HIGHEST IMPACT)

**Status**: ❌ **Missing core feature**

**Current Bottleneck**: 163 separate dragon meshes = 163 draw calls = **2.4ms overhead** (21% of frame budget).

**Impact**:
- **2.2ms frame time savings** for ALL scenes with 100+ meshes
- Reduces draw calls from O(mesh_count) → O(material_count)
- Benefits **every VR composition**, not just fire dragon

**Architecture**:
```typescript
class MeshBatchingManager {
  /**
   * Detects static meshes and merges by material at load time.
   * Preserves transform hierarchy for dynamic objects.
   */
  autoMergeMeshes(sceneGraph: SceneGraph): {
    originalMeshCount: number;
    batchedMeshCount: number;
    drawCallReduction: number;
  }
}
```

**Implementation Steps**:
1. Extend `SceneGraphMemoryTracker` to detect static vs dynamic meshes
2. Create `MeshBatchingManager`:
   - Group meshes by material (same texture, same shader)
   - Merge BufferGeometry via THREE.BufferGeometryUtils.mergeBufferGeometries()
   - Preserve transform matrices (bake into vertex positions)
3. Integrate with HoloScript compiler: Add `@batch_static` trait
4. Enable by default in mobile quality profile (opt-out via `batchMeshes: false`)
5. Test with fire-dragon (163 meshes → 10-15 batched meshes)

**Effort**: **3-5 days** (TypeScript + WebGL buffer merging + testing)

**Technical Challenges**:
- Skinned meshes (skeletal animation) cannot be batched → detect and skip
- Transparent materials need depth sorting → batch per draw order group
- UV atlas conflicts → generate combined texture atlas (advanced feature, defer to 2.2)

**Phase 1 Scope**: Batch only **static meshes with identical materials** (covers 80% of use cases).

---

### 2.2 LOD System Extension (5 Levels for VR)

**Status**: ⚠️ **Current system has 3 levels (insufficient for Quest 3)**

**Current Limitation**: LODManager uses 3 levels (0-20m, 20-50m, 50m+). Quest 3 needs finer granularity for thermal headroom.

**Impact**:
- **1.6ms frame time savings** from progressive triangle reduction
- Reduces thermal throttling risk (60-65% GPU utilization target)
- Smoother quality transitions (less noticeable LOD popping)

**Proposed LOD Thresholds (Quest 3)**:
```typescript
const VR_LOD_LEVELS = [
  { level: 0, distance: 0-8m, tris: 100%, textures: 2048px },
  { level: 1, distance: 8-15m, tris: 75%, textures: 1024px },
  { level: 2, distance: 15-25m, tris: 50%, textures: 512px },
  { level: 3, distance: 25-40m, tris: 25%, textures: 256px },
  { level: 4, distance: 40m+, tris: 10%, textures: 128px or billboard },
];
```

**Implementation**:
1. Extend `LODManager` to support 5 levels (currently hardcoded to 3)
2. Add device-aware LOD profiles:
   - Desktop: 3 levels (more GPU power)
   - Quest 3: 5 levels (thermal constraints)
   - Quest 2: 6 levels (even more aggressive)
3. Integrate with quality profiles: `lod.levels: 5` override
4. Add LOD4 → Gaussian splat fallback (replace distant meshes with 5K splat billboard)

**Effort**: **3-4 days** (LODManager refactor + quality profile integration)

**Research Question**: Should LOD4 convert meshes to Gaussian splats? (5K splat billboard = 0.08ms vs 0.5ms mesh rendering)

---

### 2.3 Thermal-Aware Adaptive Quality

**Status**: ❌ **No thermal monitoring**

**Current Gap**: Quest 3 thermal throttles after ~15 minutes at >70% GPU load, dropping performance 23%. Platform has **no awareness** of this.

**Impact**:
- Prevents sudden frame drops in long VR sessions (>15 min)
- Maintains 90Hz stability under thermal constraints
- Improves user experience (no judder/reprojection)

**Architecture**:
```typescript
class ThermalQualityManager extends QualityManager {
  /**
   * Monitors GPU clock frequency and auto-reduces quality if throttling detected.
   * Gradually restores quality when thermal pressure subsides.
   */
  monitorThermalState(): {
    gpuClockMHz: number;
    thermalThrottling: boolean;
    recommendedQualityLevel: QualityPreset;
  }
}
```

**Implementation**:
1. Add WebXR device API integration for GPU metrics:
   ```typescript
   const gpuInfo = await navigator.gpu?.requestAdapterInfo();
   const currentClock = gpuInfo?.gpuClockMHz;
   ```
2. Detect throttling: Quest 3 nominal = 719MHz, throttled = 550MHz (~23% drop)
3. Auto-reduce quality when throttling detected:
   - Reduce LOD distances by 25%
   - Drop peripheral Gaussian splats by 20%
   - Disable shadows (saves 1.2ms)
4. Gradually restore quality when clock recovers (30-60 second hysteresis)
5. Add UI notification: "Thermal optimization active" (optional, user-configurable)

**Effort**: **4-5 days** (WebXR API integration + adaptive logic + testing)

**Risks**: WebGPU API may not expose GPU clock on all devices → fallback to frame time monitoring (if avg FPS drops 15%, assume throttling).

---

## Priority 3: Advanced Features (2-3 months)

### 3.1 Neural Radiance Caching (NeRF → Gaussian Splat Conversion)

**Status**: 🔬 **Research exploration**

**Opportunity**: Convert relightable fire layers (60K splats, 2.2ms) to baked (30K splats, 0.9ms) via NeRF pre-baking.

**Impact**:
- **1.3ms frame time savings** for volumetric effects
- Reduces relightable budget consumption (frees budget for avatars)
- One-time conversion cost (offline preprocessing)

**Technical Approach**:
1. Train NeRF on volumetric fire animation (per-frame radiance field)
2. Bake NeRF to Gaussian splats with SH coefficients (existing research: Relightable Gaussian Codec Avatars, SIGGRAPH 2024)
3. Store as animated baked splat sequence (compression via Stop-The-Pop)
4. Runtime: Playback baked splat animation (0.9ms) vs real-time relightable (2.2ms)

**Effort**: **2-3 weeks** (research + NeRF training + integration)

**ROI**: High for **animated volumetric effects** (fire, smoke, waterfalls), low for **dynamic interactive objects**.

**Decision**: Defer to Q2 2026 (research phase).

---

### 3.2 WebGPU Particle Compute Optimization (Tile-Based Culling)

**Status**: 🔬 **Advanced optimization**

**Current State**: GPU particles update all 15K particles every frame (1.2ms compute cost).

**Opportunity**: Tile-based particle culling (only update visible particles).

**Impact**:
- **0.6ms frame time savings** (50% particle update reduction)
- Scales to larger particle systems (30K particles at same cost)

**Implementation**:
1. Divide screen into 16×16 tiles (256 tiles for 2064×2208 per eye)
2. Compute per-tile particle visibility (frustum + occlusion culling)
3. Only dispatch compute work for visible particles
4. Use tile coherence for spatial hash grid (nearby particles = same tile)

**Effort**: **1-2 weeks** (WebGPU compute shader development + testing)

**ROI**: Medium (particles are only 13% of frame budget). Prioritize mesh batching first.

---

### 3.3 Hybrid Mesh-Splat LOD (LOD4 Conversion)

**Status**: 💡 **Novel idea from assessment**

**Concept**: At far distances (40m+), replace triangle meshes with Gaussian splat billboards.

**Impact**:
- **0.4ms per distant mesh** (5K splat billboard = 0.08ms vs 0.5ms mesh)
- Improves visual quality at distance (splats have better anisotropic filtering)
- Reduces memory bandwidth (128KB splat data vs 2MB mesh + textures)

**Example (Fire Dragon)**:
- Dragon body at 50m distance: 150K tris mesh (2.5ms) → 5K splat billboard (0.08ms) = **2.4ms savings**

**Implementation**:
1. Pre-generate Gaussian splat representation for each mesh (offline tool)
2. Store in composition metadata: `mesh.lod4Splats = "dragon_body_5k.gsplat"`
3. LODManager: At LOD4 threshold, swap mesh → splat renderable
4. VolumetricBridge: Handle mesh-splat transitions

**Effort**: **2-3 weeks** (offline splat generation tool + runtime switching)

**Research Question**: How to generate splats from meshes? (Photogrammetry pipeline? Rasterization + 3DGS training?)

---

## Autonomous Platform TODOs (Self-Directed Expansion)

### Next Strategic Investigations (Curiosity-Driven)

1. **Device-Aware Quality Budgets**:
   - Quest 2 vs Quest 3 vs Quest Pro have different GPU/thermal profiles
   - Should quality profiles adapt budgets per device? (Quest 2 = 80K splats, Quest 3 foveated = 160K)
   - **Action**: Research device detection + per-device budget tables

2. **Composition Complexity Estimation**:
   - Can we predict frame time from composition metadata **before** loading?
   - Inputs: mesh count, splat count, particle systems, post-processing flags
   - Output: Estimated frame time + recommended quality profile
   - **Action**: Build regression model from profiling data (10+ compositions)

3. **Multi-User VR Synchronization**:
   - Fire dragon with 4 simultaneous users = 4× GPU particles? (no, should be shared)
   - How to synchronize volumetric effects across clients? (CRDT for splat positions?)
   - **Action**: Design multi-user volumetric rendering architecture

4. **Stop-The-Pop + Foveation Synergy**:
   - Stop-The-Pop reduces splats by 30-50% (view-dependent)
   - Foveation reduces splats by 40% (peripheral)
   - Combined effect? (60-70% reduction? Or diminishing returns?)
   - **Action**: A/B test combined vs individual optimizations

5. **Gaussian Splat Compression**:
   - Current: 56B/splat (baked), 96B/splat (relightable), 128B/splat (interactive)
   - Research: Quantization + delta encoding = 24B/splat (2.3x compression)
   - **Action**: Implement compressed splat format for streaming (network bandwidth optimization)

---

## CEO-Level Roadmap Summary

### Q1 2026 (Next 3 Months)

**Priority 1 (Week 1-2)**:
- ✅ Enable Stop-The-Pop shader (1.2ms savings)
- ✅ Foveated Gaussian culling (1.6ms savings)
- ✅ Quality profile override docs (prevent G.004 gotcha)

**Priority 2 (Month 1-2)**:
- ✅ Automatic mesh batching (2.2ms savings, **HIGHEST IMPACT**)
- ✅ LOD extension to 5 levels (1.6ms savings)
- ✅ Thermal-aware adaptive quality (prevents throttling)

**Total Impact**: **6.6ms frame time reduction** (16.8ms → 10.2ms, enables 90Hz at 92% utilization)

### Q2 2026 (Months 4-6)

**Priority 3 (Advanced Features)**:
- 🔬 Neural radiance caching (NeRF → splat conversion)
- 🔬 Tile-based particle culling (0.6ms savings)
- 💡 Hybrid mesh-splat LOD (LOD4 conversion)

**Research Initiatives**:
- Device-aware quality budgets
- Composition complexity estimation
- Multi-user volumetric synchronization

**Total Impact**: **2.3ms additional savings** (10.2ms → 7.9ms, thermal-safe 71% utilization)

---

## Resource Allocation

| Initiative | Effort (days) | Engineer | Priority |
|-----------|---------------|----------|----------|
| Stop-The-Pop shader wiring | 1-2 | Renderer team | P1 |
| Foveated Gaussian culling | 2-3 | VR team | P1 |
| Quality profile docs | 0.5 | Documentation | P1 |
| Automatic mesh batching | 3-5 | Core rendering | P1 |
| LOD extension (5 levels) | 3-4 | Scene graph | P2 |
| Thermal adaptive quality | 4-5 | Performance team | P2 |
| NeRF radiance caching | 10-15 | Research team | P3 |
| Particle compute optimization | 5-10 | Compute team | P3 |
| Hybrid mesh-splat LOD | 10-15 | Research team | P3 |

**Total Engineering Investment**: **39-59 days** (~2 months with 1 engineer, 1 month with 2 engineers)

**Business ROI**:
- **Frame time improvement**: 16.8ms → 7.9ms (53% reduction)
- **Scene complexity increase**: 2x meshes, 2x splats at 90Hz
- **Thermal sustainability**: Prevents throttling in 30+ minute sessions
- **Developer productivity**: Auto-batching eliminates 3-5 hours manual optimization per scene

---

## Next Autonomous Actions

1. **Create GitHub issues** for Priority 1 items (stop-the-pop, foveated culling, docs)
2. **Prototype mesh batching** in isolated branch (prove feasibility)
3. **Profile cinematic-showcase.holo** to validate frame time estimates
4. **Research eye tracking APIs** on Quest 3 (foveated rendering requirements)
5. **Document thermal throttling behavior** on real Quest 3 hardware (validate 70% GPU threshold)

---

**Generated**: 2026-03-08
**Source**: Fire Dragon VR Performance Assessment
**Platform**: HoloLand VR v2.0
**Target**: Meta Quest 3 @ 90Hz
**Status**: Ready for implementation
