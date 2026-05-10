# HoloLand Documentation Audit (Epoch 8: The Dumb Glass)
**Date**: March 2026
**Target**: `c:\Users\josep\Documents\GitHub\Hololand\docs`

## Executive Summary
Following the rigorous purging of HoloLand's monolithic structure (auth, dashboard, brittle physics loops, mobile, and desktop fat-clients), the platform has transitioned purely into an autonomous spatial renderer backed by the `crdt://holomesh/feed` protocol via `@holoscript/r3f-renderer`. 

This shift dramatically alters the validity of the existing `docs/` folder. **Nearly ~60% of the currently maintained documentation refers to legacy monolithic backends, stateful APIs, and UI layers that no longer exist.**

## 1. Severely Deprecated Documents 🗑️
*(These documents detail systems that were completely deleted during the Epoch 8 transition to A2A sovereign meshes)*

* **`BRITTNEY_SYSTEM_REFERENCE.md`** & **`BRITTNEY_AI_PACKAGE_INDEX.md`**: Legacy logic for Brittney cloud API. Replaced by continuous autonomous graph execution.
* **`BACKEND_NODES_DESIGN.md`**: Monolithic backend diagrams that no longer apply, as logic now lives in native `.hsplus` generic AST trait compilation.
* **`DEPLOYMENT_MOBILE.md`** / **`DEPLOYMENT_TAURI.md`**: Fat clients have been removed from the repository. The only endpoint is the dumb terminal 
WebGL view (`HoloScript/packages/r3f-renderer`).
* **`HOLOLAND_CENTRAL_ARCHITECTURE.md`**: The central backend UI concept is entirely dead. There is no central server, only the mesh.
* **`UAA2_API_CONTRACT.md`**: Replaced entirely by Proof-of-Play continuous computation and `holomesh_publish_insight` MCP trait payloads.
* **`AVATAR_STUDIO_BRIDGE.md`**: Legacy `.vrm` API extraction. Avatar Studio now compiles natively to `.hsplus` AST traits dynamically.

## 2. Partially Valid / Requires Re-Alignment ⚠️
*(These documents contain valid spatial/VR theories but reference old code paths like `SpatialEngineBridge.ts` loops which are now dead)*

* **`PLATFORM_VISION.md`**: Vision is correct (spatial intelligence), but the implementation details referencing REST APIs or centralized DBs are wrong.
* **`PERFORMANCE_TUNING.md`**: GAPS (Geometric And Physics Scaling) has been newly added, overriding legacy loop optimizations.
* **`VR_PERFORMANCE_ASSESSMENT_FIRE_DRAGON.md`**: The physics metric baselines have changed due to native R3F integration bypassing `platform/world`.

## 3. High-Value / Accurate Documentation ✅
*(These accurately reflect the HoloScript A2A ecosystem)*

* **`DISTRIBUTED_SCENE_GRAPH.md`**: Conceptually aligns with the new `LoroText` CRDT mesh architecture.
* **`HOLOSCRIPT_LANGUAGE_SPEC.md`** / **`HSPLUS_LANGUAGE_SPEC.md`**: Core foundational docs for the `ImportResolver` native parsing protocol.
* **`HOLOSCRIPT_FILE_TYPES.md`**: Accurate reflection of the `.hs` generic AST traits.
* **`IOT_DIGITAL_TWINS_SHOWCASE.md`**: Direct integration of `@WoTThing` and `@MQTTSource` traits are now natively supported in the renderer!

## Recommended Next Action
1. **Archive Purge**: Batch move all Brittney, Mobile, and Web API deployment docs into `docs/archive/`.
2. **"The Dumb Glass" Core Document**: Draft a definitive `THE_DUMB_GLASS_ARCHITECTURE.md` to establish the new reality: HoloLand does absolutely zero state computation and exclusively acts as an R3F DOM endpoint for CRDT graphs.
