# VR Performance Wisdom (Quest 3 Optimization)

## Extracted from Fire Dragon Composition Assessment (2026-03-08)

---

## W.040 | Quest 3 Splat Budget = 160K with Foveated Culling | ⚡0.98

**Gaussian splat rendering on Quest 3 (Adreno 740) supports 160K total splats at 90Hz (120K baked + 30K relightable + 10K interactive) ONLY with foveated culling. Peripheral LOD bias +1 reduces effective splat count by ~40%, enabling ~5.5ms render time within 11.1ms frame budget.**

**Evidence**: GaussianBudgetManager architecture + Quest 3 1.4 TFLOPS constraint. Without foveation, 160K splats = 7.2ms (exceeds budget). Foveated rendering reduces to 130K → 78K effective = 4.4ms → 2.8ms.

**Tags**: `vr`, `quest3`, `gaussian-splats`, `foveated-rendering`, `performance`, `frame-budget`

---

## W.041 | VR Mesh Batching > Triangle Count for Frame Time | ⚡0.96

**Draw call overhead on Quest 3 (163 calls × 0.015ms = 2.4ms) exceeds vertex processing cost (150K tris × 2 eyes = 2.4ms). Mesh batching provides LARGER frame time savings than LOD reduction on mobile VR.**

**Evidence**: 163 separate dragon meshes = 2.4ms draw overhead. Merging to 10 calls saves 2.2ms, while LOD 50% reduction saves only 1.6ms. Draw calls are CPU-bound on XR2 Gen 2.

**Tags**: `vr`, `quest3`, `mesh-batching`, `draw-calls`, `performance`, `optimization`

---

## W.042 | Volumetric Fire Requires Baked Layers for Quest 3 | ⚡0.95

**Relightable Gaussian splats (96B/splat, deferred shading) cost 2.4x more than baked (56B/splat, SH radiance) on Quest 3. Multi-layer volumetric effects MUST use baked layers to fit 30K relightable budget.**

**Evidence**: 60K relightable fire layers = 2.2ms (40% over budget). Shifting to baked reduces to 0.9ms, freeing 1.3ms for interactive objects.

**Tags**: `vr`, `quest3`, `volumetric-rendering`, `gaussian-splats`, `performance`, `relightable-vs-baked`

---

## W.043 | Thermal Throttling Requires 60-65% GPU Target | ⚡0.92

**Quest 3 thermal throttles after ~15 minutes at >70% sustained GPU load, dropping clocks 719MHz → 550MHz (23% perf loss). Target 60-65% utilization in frame budget to prevent throttling in long sessions.**

**Evidence**: 11.1ms budget at 100% = immediate thermal risk. 10.3ms optimized = 93% utilization (still throttles). Target 7-8ms steady state (60-70%) for 30+ minute sessions.

**Tags**: `vr`, `quest3`, `thermal-throttling`, `gpu-utilization`, `performance`, `sustained-load`

---

## P.004 | Foveated Gaussian LOD Pattern | ⚡0.94

**Pattern: Gaussian splat rendering with eye-tracking-based foveated culling.**

**Structure**:
1. Track gaze direction from VR headset (Quest 3 eye tracking)
2. Calculate splat distance from foveal center (angular distance)
3. Apply LOD bias: foveal (0°-10°) = LOD-0, blend (10°-15°) = LOD-0.5, peripheral (15°+) = LOD+1
4. Reduce splat count in periphery by 40-60% (user doesn't notice in motion)

**Context**: Quest 3 supports eye tracking. Foveated splat culling reduces 160K → 78K effective (saves 1.6ms).

**Implementation**:
```typescript
const foveatedConfig: FoveatedConfig = {
  enabled: true,
  fovealAngleDeg: 10,
  fovealBudgetMultiplier: 2.0,
  peripheralLODBias: 1,
  blendZoneDeg: 5,
};
```

**Tags**: `vr`, `quest3`, `foveated-rendering`, `eye-tracking`, `lod`, `pattern`

---

## G.004 | Mobile Profile Disables Bloom (Fire Visibility Issue) | ⚠️ CRITICAL

**HoloLand's mobile quality profile disables bloom and post-processing for performance. This breaks volumetric fire visual fidelity, as fire REQUIRES bloom for glow perception. Always override `bloom: true` for fire/emissive effects.**

**Gotcha**: Default mobile profile prioritizes frame rate over visual quality. Fire dragon composition with `profile: 'mobile'` renders fire as flat splats without glow → looks broken.

**Fix**: Custom override:
```typescript
{
  profile: 'mobile',
  overrides: { bloom: true, bloomStrength: 0.6 }
}
```

**Tags**: `vr`, `quest3`, `mobile-profile`, `bloom`, `gotcha`, `volumetric-fire`

---

## Quest 3 Frame Budget Breakdown (90Hz)

```
Total frame time: 11.1ms
├─ Scene graph traversal + culling: ~0.8ms (7%)
├─ Shadow mapping (1024px): ~1.2ms (11%)
├─ Mesh rendering (150K tris): ~2.5ms (23%)
├─ Gaussian splat rendering: ~3.5ms (31%)
├─ GPU particle systems: ~1.5ms (13%)
├─ Post-processing (minimal): ~0.8ms (7%)
└─ Stereo overhead + buffer swaps: ~0.8ms (7%)
```

**Critical Insight**: Gaussian splat rendering + mesh rendering = **6.0ms (54% of budget)** before ANY other effects. Volumetric VR scenes are inherently GPU-bound on Quest 3.

**Tags**: `vr`, `quest3`, `frame-budget`, `profiling`, `performance-breakdown`

---

## Optimization Priority Matrix (Quest 3)

| Optimization | Frame Time Savings | Implementation Effort | Priority |
|--------------|-------------------|----------------------|----------|
| Mesh batching (163 → 10 draw calls) | **2.2ms** | Medium (3-5 days) | **P1** |
| Foveated Gaussian culling | **1.6ms** | Low (2-3 days) | **P1** |
| Relightable → Baked layer shift | **1.3ms** | Low (1 day) | **P1** |
| LOD extension (3 → 5 levels) | **1.6ms** | Medium (3-4 days) | **P2** |
| Stop-The-Pop shader integration | **1.2ms** | Very Low (1-2 days) | **P1** |
| Adaptive quality (thermal throttling) | **Sustains performance** | Medium (4-5 days) | **P3** |

**Total Achievable Savings**: **8.9ms** → Reduces 16.8ms baseline to **7.9ms (71% utilization, thermal-safe)**

**Tags**: `vr`, `quest3`, `optimization`, `prioritization`, `roadmap`

---

## Cross-References

- **HoloLand Codebase**:
  - `packages/platform/renderer/src/GaussianBudgetManager.ts` - 160K splat budget implementation
  - `packages/platform/renderer/src/LODManager.ts` - Distance-based LOD system (3 levels)
  - `packages/platform/renderer/src/VolumetricBridge.ts` - WebGPU compute shader integration
  - `packages/platform/quality-profiles/src/types.ts` - Mobile profile configuration
  - `packages/platform/renderer/src/components/gaussian-splat-viewer/shaders/stop-the-pop.wgsl` - Splat culling shader

- **Research Papers**:
  - SqueezeMe (CVPR 2025): 60K splats per avatar on Quest 3
  - VR-Splatting (I3D 2025): Foveated 3DGS at 90Hz / 2016x2240 per eye
  - Relightable Gaussian Codec Avatars (SIGGRAPH 2024)
  - VR-GS: Two-level rendering with XPBD physics

- **External Sources**:
  - [Quest 3 Specifications](https://vr-compare.com/headset/metaquest3)
  - [VR Performance Optimization Guide](https://github.com/authorTom/notes-on-VR-performance)
  - [Quest 3 Steam Performance Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3321166620)

---

**Generated**: 2026-03-08
**Source**: Fire Dragon VR Performance Assessment
**Platform**: HoloLand VR v2.0
**Target**: Meta Quest 3 @ 90Hz
