# Autonomous VR Optimization Roadmap

> **Last verified against disk:** 2026-05-11. Roadmaps drift fast — when in doubt, read [`packages/platform/renderer/src/`](../packages/platform/renderer/) and let the file list win over this table.

## Status

Refresh of the 2026-03 roadmap. Several items the original doc called "missing" or "needs wiring" have since landed in source. The 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) keeps the renderer / quality-profiles / VR perf budget surface in scope.

## What's shipped (verified on disk 2026-05-11)

| Capability | Source-of-truth file | Notes |
|---|---|---|
| Per-subsystem VR frame-budget enforcement | [`VRPerformanceBudget.ts`](../packages/platform/renderer/src/VRPerformanceBudget.ts) | Drop quality, not frames. Quest 3 / PCVR budget tables defined in source. |
| Static composition perf analysis | [`VRScenePerformanceBudget.ts`](../packages/platform/renderer/src/VRScenePerformanceBudget.ts) | Draw calls / animation overhead / volumetric cost from HoloScript composition. |
| Adaptive frame-rate manager | [`AdaptiveFrameRateManager.ts`](../packages/platform/renderer/src/AdaptiveFrameRateManager.ts) | Live-timing-driven quality scaling. |
| Layered Gaussian splat budget (baked / relightable / interactive) | [`GaussianBudgetManager.ts`](../packages/platform/renderer/src/GaussianBudgetManager.ts) | Per-layer caps + cross-layer rebalance + foveated multiplier. |
| Budget-enforced splat rendering | [`BudgetEnforcedGaussianRenderer.ts`](../packages/platform/renderer/src/BudgetEnforcedGaussianRenderer.ts) | Consumes the budget manager. |
| Foveated splat pipeline | [`components/gaussian-splat-viewer/FoveatedGaussianPipeline.ts`](../packages/platform/renderer/src/components/gaussian-splat-viewer/FoveatedGaussianPipeline.ts), [`foveated/`](../packages/platform/renderer/src/foveated/) | Two-stage rasterizer + per-user blender + VRS foveation map. |
| Stop-The-Pop view-dependent splat culling | [`shaders/stop-the-pop.wgsl`](../packages/platform/renderer/src/components/gaussian-splat-viewer/shaders/stop-the-pop.wgsl) | WGSL compute shader; lives next to the splat-viewer pipeline. |
| Mesh batching for many-mesh organic creatures | [`DragonMeshBatcher.ts`](../packages/platform/renderer/src/DragonMeshBatcher.ts) | Static + instanced + dynamic + volumetric-replacement batching. Was called out as "missing" in March; landed since. |
| LOD with adaptive controller + frustum / occlusion / small-object cullers + SIMD frustum culler with octree | [`@holoscript/lod`](../packages/platform/lod/) — exports in [`src/index.ts`](../packages/platform/lod/src/index.ts) | `AdaptiveLODController` covers the "5-level VR LOD" idea generically. |
| Asset streaming with memory cache, IndexedDB cache, cache manager, memory budget monitor, predictive chunk loader | [`@holoscript/streaming`](../packages/platform/streaming/) — exports in [`src/index.ts`](../packages/platform/streaming/src/index.ts) | Numbers (cache size, eviction policy) are per-instance config, not hardcoded. |
| Procedural asset semantic caching | [`packages/platform/world/src/procedural/ProceduralAssetGenerator.ts`](../packages/platform/world/src/procedural/ProceduralAssetGenerator.ts) + [`platform/backend/src/cache/ProceduralAssetCache.ts`](../platform/backend/src/cache/ProceduralAssetCache.ts) | Documented in [`CACHING.md`](./CACHING.md). |
| Quality profile metadata interface | [`packages/platform/quality-profiles/`](../packages/platform/quality-profiles/) | Industrial / cinematic / mobile presets in [`types.ts`](../packages/platform/quality-profiles/src/types.ts). |
| Creature-specific foveation + LOD profiles | [`CreatureFoveatedProfile.ts`](../packages/platform/renderer/src/CreatureFoveatedProfile.ts), [`CreatureLODProfile.ts`](../packages/platform/renderer/src/CreatureLODProfile.ts) | Per-creature override surface for the generic LOD/foveation systems. |

## What's still open

These were called out in the 2026-03 roadmap and remain not-yet-landed (or partially landed) on disk as of 2026-05-11. Verify before claiming a gap is closed.

| Initiative | Status | Where it would land |
|---|---|---|
| Thermal-aware adaptive quality (GPU clock monitoring → quality reduction with hysteresis) | Open. `AdaptiveFrameRateManager` reacts to frame timing, not GPU clock specifically; no thermal-state probe found via grep. | Extension to `AdaptiveFrameRateManager` or a sibling `ThermalQualityManager`. |
| WebXR eye-tracking gaze input wired through to `FoveatedGaussianPipeline` | Open. Foveation pipeline exists; gaze-source integration with the WebXR session is the missing seam. | [`WebXRSessionBridge.ts`](../packages/platform/renderer/src/WebXRSessionBridge.ts) ↔ `FoveatedGaussianPipeline`. |
| Quality-profile linter ("composition has emissive materials but bloom is disabled") | Open. Override discipline is documented in [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md); no validator wired to the source-contract CI. | HoloScript source-contract checks (`scripts/check-holoscript-source-contract.mjs`). |
| Tile-based GPU particle culling | Open. Volumetric particles flow through `VolumetricBridge`; no tile-cull pass found. | [`VolumetricBridge.ts`](../packages/platform/renderer/src/VolumetricBridge.ts). |
| Hybrid mesh ↔ Gaussian-splat LOD swap at far distance | Open. Both renderable types exist independently; no LOD-tier swap wired. | New code joining `LODManager` (lod package) with `GaussianBudgetManager`. |
| Device-aware quality-budget tables (Quest 2 vs Quest 3 vs Quest Pro splat ceilings) | Partially shipped — `GaussianBudgetManager` is parameterized; per-device preset table is the gap. | `quality-profiles` (extend the device → profile recommendation table). |
| Composition-complexity → frame-time predictor | Open. `VRScenePerformanceBudget` does static analysis; no learned/regression predictor on top. | New module under renderer or a separate analysis package. |

## Profile-override gotcha to fix at source

Mobile profile in [`quality-profiles/src/types.ts`](../packages/platform/quality-profiles/src/types.ts) sets `bloom: false`, `postProcessing: false`. Compositions that rely on emissive glow (fire, neon, holographic UI) need an override or the visual breaks. Discipline lives in [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md); the linter in the open-list above would catch this automatically.

## Claims dropped

- **Hardcoded "X.Yms savings"** estimates from the 2026-03 roadmap (Stop-The-Pop = 1.2 ms, foveation = 1.6 ms, batching = 2.2 ms, etc.) — these were derived from the hypothetical Fire Dragon assessment, not from on-device measurements. Real frame-time data should come from `VRPerformanceBudget` runtime telemetry and live in hardware receipts, not in this doc.
- **CEO-level resource-allocation tables** (engineer-days × initiative) — out of scope for an agent-readable doc.
- **"NeRF → Gaussian splat conversion" as a P3 feature** — research-tier exploration, no code path; if it returns, it earns a row in "what's shipped" or stays out.

## See also

- [`PERFORMANCE_TUNING.md`](./PERFORMANCE_TUNING.md) — module pointers + how a composition gets tuned.
- [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) — profile selection contract.
- [`CACHING.md`](./CACHING.md) — asset cache (procedural + streaming).
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) — keep-in-scope audit for renderer / quality-profiles.
- [`archive/VR_PERFORMANCE_ASSESSMENT_FIRE_DRAGON_2026-03-08.md`](./archive/VR_PERFORMANCE_ASSESSMENT_FIRE_DRAGON_2026-03-08.md) — historical hypothetical-composition analysis the original roadmap was derived from.
