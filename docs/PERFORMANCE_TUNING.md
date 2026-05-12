# Performance Tuning

HoloLand's performance posture is **module-driven**: pick a quality profile, let the renderer's budget manager enforce it, and let LOD + streaming do the rest. This doc points at the source-of-truth files; concrete numbers (FPS targets, poly counts, splat budgets, byte sizes) live in code so they cannot drift here.

## Status

Alive. Listed in the 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) under platform runtime ("tie to hardware receipts"). For the cross-cutting profile semantics, see [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md).

## Where the numbers live

Do not copy values out of source into this doc — they will go stale. Read the file when you need the current value.

| Concern | Source-of-truth file |
|---|---|
| Render quality settings (shadow size, max poly, target FPS, pixel ratio, post-processing flags) per profile | [`packages/platform/quality-profiles/src/types.ts`](../packages/platform/quality-profiles/src/types.ts) — `INDUSTRIAL_PROFILE`, `CINEMATIC_PROFILE`, `MOBILE_PROFILE` |
| Profile selection / overrides / device + tag recommendations | [`packages/platform/quality-profiles/src/QualityProfileManager.ts`](../packages/platform/quality-profiles/src/QualityProfileManager.ts) |
| Renderer-side quality enforcement + GPU tier detection | [`packages/platform/renderer/src/QualityManager.ts`](../packages/platform/renderer/src/QualityManager.ts) |
| Per-subsystem frame budgets (scene, post, volumetric, animation, physics, agent inference, audio, network, headroom) for Quest 3 / PCVR | [`packages/platform/renderer/src/VRPerformanceBudget.ts`](../packages/platform/renderer/src/VRPerformanceBudget.ts) — `QUEST3_90HZ_BUDGETS`, `PCVR_90HZ_BUDGETS` |
| Static composition analysis (draw calls, animation overhead, volumetric cost) | [`packages/platform/renderer/src/VRScenePerformanceBudget.ts`](../packages/platform/renderer/src/VRScenePerformanceBudget.ts) |
| Adaptive frame-rate / quality scaling under live timings | [`packages/platform/renderer/src/AdaptiveFrameRateManager.ts`](../packages/platform/renderer/src/AdaptiveFrameRateManager.ts) |
| Gaussian splat per-layer budgets + foveated culling integration | [`packages/platform/renderer/src/GaussianBudgetManager.ts`](../packages/platform/renderer/src/GaussianBudgetManager.ts), [`BudgetEnforcedGaussianRenderer.ts`](../packages/platform/renderer/src/BudgetEnforcedGaussianRenderer.ts) |
| Mesh batching for many-mesh organic scenes | [`packages/platform/renderer/src/DragonMeshBatcher.ts`](../packages/platform/renderer/src/DragonMeshBatcher.ts) |

## How a composition gets tuned

1. Composition declares `profile` in `metadata.quality` (see `CompositionQualityMetadata` in [`quality-profiles/src/types.ts`](../packages/platform/quality-profiles/src/types.ts)).
2. `QualityProfileManager` resolves profile + overrides → effective `QualitySettings` and `QualityTraitConfig`.
3. Renderer's `QualityManager` consumes effective settings and applies them to the active scene.
4. `VRPerformanceBudget` enforces per-subsystem frame budgets at runtime; `AdaptiveFrameRateManager` degrades quality (not frames) when a budget is exceeded.

The wiring contract is in [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) — that doc owns the metadata schema; this doc owns the runtime tuning posture.

## Subsystem packages

Each subsystem package has its own README; treat those as the operational guides for their domain.

| Subsystem | Package | Notes |
|---|---|---|
| Quality profile selection | [`@hololand/quality-profiles`](../packages/platform/quality-profiles/) | Domain-specific bundles; metadata-driven. |
| Renderer (Three.js + WebGPU bridge) | [`packages/platform/renderer/`](../packages/platform/renderer/) | Quality / Volumetric / Foveated / Gaussian / VR budget managers all live here. |
| LOD selection + frustum culling | [`@holoscript/lod`](../packages/platform/lod/) — `LODManager`, `AdaptiveLODController`, `FrustumCuller`, `OcclusionCuller`, `SmallObjectCuller`, `SIMDFrustumCuller` (see [`src/index.ts`](../packages/platform/lod/src/index.ts)) | Use the adaptive controller when frame budget is the constraint. |
| Asset streaming + cache + movement-predictive load | [`@holoscript/streaming`](../packages/platform/streaming/) — `AssetLoader`, `ProgressiveLoader`, `BundleLoader`, `MemoryCache`, `IndexedDBCache`, `CacheManager`, `MemoryBudgetMonitor`, `MovementPredictor`, `PredictiveChunkLoader` (see [`src/index.ts`](../packages/platform/streaming/src/index.ts)) | Memory budgets and eviction policy are configured per-instance, not hardcoded. |
| Procedural / cached asset generation | [`packages/platform/world/src/procedural/ProceduralAssetGenerator.ts`](../packages/platform/world/src/procedural/ProceduralAssetGenerator.ts) | Caching layer documented in [`CACHING.md`](./CACHING.md). |
| Foveated splat rendering | [`packages/platform/renderer/src/foveated/`](../packages/platform/renderer/src/foveated/) — `SharedPreprocessor`, `TwoStageRasterizer`, `PerUserBlender`, `VRSFoveationMap` | Wired through `FoveatedGaussianPipeline.ts`. |
| Stop-The-Pop view-dependent splat culling | [`packages/platform/renderer/src/components/gaussian-splat-viewer/shaders/stop-the-pop.wgsl`](../packages/platform/renderer/src/components/gaussian-splat-viewer/shaders/stop-the-pop.wgsl) | WGSL compute shader; integrated via the gaussian-splat-viewer pipeline. |

## Claims dropped

- **"GAPS (Geometric And Physics Scaling) overrides legacy loop optimizations"** — claim from the 2026-03 documentation audit. There is no `GAPS` or `gaps_override` symbol anywhere in `packages/`; verified via repo-wide grep 2026-05-11. Disk wins.
- **Hardcoded FPS targets / poly budgets / draw-call ceilings / VRAM ceilings / network rate tables** — these were tier-encoded in the previous version of this doc and drifted from `quality-profiles` source. Numbers now live in [`types.ts`](../packages/platform/quality-profiles/src/types.ts) and the per-budget files above; this doc cites without copying.
- **"Resources" links to Unity / Oculus / Three.js external guides** — not source-of-truth for HoloLand runtime; agents should read the package source, not third-party docs, when tuning HoloLand.

## See also

- [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) — profile selection contract.
- [`AUTONOMOUS_VR_OPTIMIZATION_ROADMAP.md`](./AUTONOMOUS_VR_OPTIMIZATION_ROADMAP.md) — what's shipped / what's still planned.
- [`CACHING.md`](./CACHING.md) — asset caching (procedural + streaming).
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) — long-term goal: profile semantics in HoloScript metadata, TS as runtime bridge.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) — current source-of-truth on what should and should not exist.
- [`archive/VR_PERFORMANCE_ASSESSMENT_FIRE_DRAGON_2026-03-08.md`](./archive/VR_PERFORMANCE_ASSESSMENT_FIRE_DRAGON_2026-03-08.md) — historical assessment for one hypothetical composition; values are pre-shipping estimates, not measurements.
