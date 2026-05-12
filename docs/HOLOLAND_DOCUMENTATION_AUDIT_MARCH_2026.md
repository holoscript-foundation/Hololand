# HoloLand Documentation Audit (Epoch 8: The Dumb Glass)
**Date**: March 2026
**Target**: `c:\Users\josep\Documents\GitHub\Hololand\docs`

> **CORRECTION (2026-05-11):** the "Epoch 8 / Dumb Glass" framing below is
> wrong, and several of its retire-list verdicts are wrong. The 2026-05-07
> [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
> reverses or qualifies them based on disk evidence:
>
> - **Brittney is not deprecated.** `packages/brittney/*` is classified as
>   **Keep — product-critical**. Six of seven sub-packages are alive
>   (`mcp-server`, `toolkit`, `ai-bridge`, `iot-digital-twins`, `models`,
>   plus the empty `loras` placeholder). Only `packages/brittney/service` is
>   deprecated, and only because it has been superseded by
>   `@hololand/inference` — not because Brittney was retired. Current
>   runtime doc: [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md).
> - **Avatar Studio is not deprecated.** `packages/ar/avatar-studio/`
>   exists with src + tests on disk. The should-exist audit lists it as
>   needing a bridge rationale, not retirement.
> - **The backend was not "completely deleted".** What was deleted was
>   `apps/brittney-desktop` and `apps/brittney-mobile`, plus parts of
>   `packages/platform/{auth,dashboard}` (in dirty worktree, restore-or-
>   replace pending). The platform packages, inference layer
>   (`packages/shared/inference`), and Brittney sub-packages remain alive.
> - **HoloLand is the platform/product surface that fully utilizes
>   HoloScript**, not a "dumb glass" R3F endpoint. Renderer is one of many
>   surfaces; runtime, agent presence, IoT, NL→HoloScript, and live world
>   tooling all live in `packages/`.
>
> The retire-list below should be treated as partially invalid. Use the
> 2026-05-07 should-exist audit as the source of truth for what should and
> should not exist; this March audit is preserved for history only.

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
