# HoloLand Developer Portal

Entry point for developers building on HoloLand. HoloLand is the platform
runtime that materializes HoloScript-authored worlds — see
[HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) for the boundary.

> Most concrete claims here link to source. If a claim has no link, it is
> background context, not API surface — verify against the live code.

## Status

Alive. This is the canonical developer landing doc; the
2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
classifies the platform packages, brittney sub-packages, and reference
examples as Keep.

## Start here

| First time | Read |
|---|---|
| Want the boundary in one paragraph | [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) |
| Want the HoloScript-vs-TS rule | [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) |
| Want the 5-minute creator path | [CREATOR_QUICKSTART.md](./CREATOR_QUICKSTART.md) |
| Want to know what should and should not exist in the repo | [audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) |

## Language references

| Doc | Source-of-truth file |
|---|---|
| [`HOLOSCRIPT_LANGUAGE_SPEC.md`](./HOLOSCRIPT_LANGUAGE_SPEC.md) | HoloScript core syntax. |
| [`HOLOSCRIPT_LANGUAGE_REFERENCE.md`](./HOLOSCRIPT_LANGUAGE_REFERENCE.md) | Reference notes; complement to the spec. |
| [`HSPLUS_LANGUAGE_SPEC.md`](./HSPLUS_LANGUAGE_SPEC.md) | HoloScript+ extended features. |
| [`HOLOSCRIPT_FILE_TYPES.md`](./HOLOSCRIPT_FILE_TYPES.md) | When to use `.holo` vs `.hs` vs `.hsplus`. |
| [`HOLOSCRIPT_LANGUAGE_COMPARISON.md`](./HOLOSCRIPT_LANGUAGE_COMPARISON.md) | HoloScript vs other engines. |
| [`HOLOSCRIPT_INTEGRATION_GUIDE.md`](./HOLOSCRIPT_INTEGRATION_GUIDE.md) | Embedding HoloScript in another app. |

The HoloScript runtime, compiler, and CLI live in the HoloScript repo, not in
HoloLand. Treat upstream HoloScript as source of truth for language semantics
and tooling per [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md).

## Platform packages

`packages/platform/*` is the runtime substrate HoloLand uses to materialize
HoloScript worlds. The audit's HoloScript-Backed Candidates To Keep table
covers these in detail.

| Package | Purpose | Source-of-truth |
|---|---|---|
| `@hololand/world` | World runtime, scene state, asset orchestration. | [`packages/platform/world/src/`](../packages/platform/world/src/) |
| `@hololand/renderer` | R3F-based rendering bridge (largest package; runtime bridge). | [`packages/platform/renderer/src/`](../packages/platform/renderer/src/) |
| `@hololand/spatial` | Spatial primitives, anchors, transforms. | [`packages/platform/spatial/src/`](../packages/platform/spatial/src/) |
| `@holoscript/streaming` | Streaming asset cache + predictive load. | [`packages/platform/streaming/src/`](../packages/platform/streaming/src/) — see [`CACHING.md`](./CACHING.md) |
| `@hololand/audio` | Audio + spatial audio. | [`packages/platform/audio/src/`](../packages/platform/audio/src/) |
| `@hololand/quality-profiles` | Quality tier presets driving renderer/cache budgets. | [`packages/platform/quality-profiles/src/`](../packages/platform/quality-profiles/src/) — see [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) |
| `@hololand/accessibility` | W3C XR accessibility (haptics, screen reader, motor, vision). | [`packages/platform/accessibility/src/`](../packages/platform/accessibility/src/) |
| `@holoscript/components` | Reusable HoloScript component libraries. | [`packages/components/`](../packages/components/) |

For the live package list, scan
[`packages/platform/`](../packages/platform/) and the workspace
[`pnpm-workspace.yaml`](../pnpm-workspace.yaml) — do not pin a count.

## AR / hardware bridges

| Package | Role |
|---|---|
| `@hololand/avatar-studio` | Avatar pipeline + VRM 1.0 export. See [`AVATAR_STUDIO_BRIDGE.md`](./AVATAR_STUDIO_BRIDGE.md). |
| `packages/ar/tracking` | Body / hand / face tracking bridge. |
| `packages/ar/anchors` | Spatial anchor bridge. |
| `packages/ar/volumetric-bridge` | Volumetric capture / playback bridge. |
| `packages/ar/mobile-companion` | Mobile companion + mesh networking. |
| `packages/ar/akida-bridge` | Akida / neuromorphic AR bridge. |
| `packages/ar/model-viewer` | Quick model preview surface. |
| `packages/adapters/three`, `react-three`, `vrchat` | Renderer / target adapters. |

The audit classifies AR/adapters as bridge code — they need bridge rationale
and HoloScript contract examples, not necessarily HoloScript source in every
package.

## Brittney (AI surfaces)

See [`BRITTNEY_CONTEXT.md`](./BRITTNEY_CONTEXT.md). Quick links:

| Sub-package | Role |
|---|---|
| `@hololand/brittney-toolkit` | Bundled local model + chat widget. |
| `@hololand/ai-bridge` | NL → HoloScript translator + voice MCP pipeline. |
| `@hololand/iot-digital-twins` | IoT discovery → HoloScript twin generation. See [`IOT_DIGITAL_TWINS_SHOWCASE.md`](./IOT_DIGITAL_TWINS_SHOWCASE.md). |
| `@hololand/mcp-server` | Premium MCP toolset for live world ops. |
| `@hololand/brittney-models` | Model registry + downloader. |
| `@hololand/inference` | Unified inference layer; Brittney sits on top. Lives in [`packages/shared/inference/`](../packages/shared/inference/). |
| `@hololand/brittney-service` | **Deprecated**. Use `@hololand/inference`. |

The HoloScript-canonical Brittney CLI agent is in the HoloScript repo
(`HoloScript/packages/aibrittney`), not here.

## Reference apps and examples

See [`EXAMPLES_GALLERY.md`](./EXAMPLES_GALLERY.md) for the full tree. Strongest
proof surfaces (per audit):

| Example | Why |
|---|---|
| [`examples/hololand-central/`](../examples/hololand-central/) | Main platform proof. Audit calls it the reference consumer of HoloScript. |
| [`examples/hololand-legends/`](../examples/hololand-legends/) | Game-loop proof — `game.hsplus`, `creatures.hsplus`, `maps/`. |
| [`examples/14-holoscript-survival-benchmark/`](../examples/14-holoscript-survival-benchmark/) | HoloScript-first survival/crafting benchmark — no TS game loop. |
| [`examples/headless/`](../examples/headless/) | Agent-only `.hsplus` proofs (no renderer needed). |

## Deployment

| Doc | When to read |
|---|---|
| [`DEPLOYMENT_BROWSER.md`](./DEPLOYMENT_BROWSER.md) | Static / WebXR deploys. |
| [`DEPLOYMENT_TAURI.md`](./DEPLOYMENT_TAURI.md) | Desktop builds via Tauri. |
| [`DEPLOYMENT_MOBILE.md`](./DEPLOYMENT_MOBILE.md) | iOS / Android. |
| [`DEPLOYMENT_CLOUD_SYNC.md`](./DEPLOYMENT_CLOUD_SYNC.md) | Optional cloud-sync backend. |
| [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) | Pre-flight before shipping. |
| [`USER_DEPLOYMENT_GUIDE.md`](./USER_DEPLOYMENT_GUIDE.md) | End-user-facing deploy story. |

## Compilation targets

HoloScript compiles to the registered `compile_to_*` MCP tools on the
HoloScript MCP server. The list moves; do not pin it. Discover via
`tools/list` against the HoloScript MCP, or via the HoloScript repo's
`compile-targets` registry. The
[HoloScript Source Contract](./HOLOSCRIPT_SOURCE_CONTRACT.md) requires that
generated target output is recreatable from `.holo`/`.hs`/`.hsplus` source.

## Architecture references

| Doc | Topic |
|---|---|
| [`HOLOLAND_PURPOSE.md`](./HOLOLAND_PURPOSE.md) | The HoloLand / HoloScript boundary in one page. |
| [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md) | The zero-TS-feature-truth policy. |
| [`UAA2_API_CONTRACT.md`](./UAA2_API_CONTRACT.md) | Agent / API contract. |
| [`MCP_BEST_PRACTICES.md`](./MCP_BEST_PRACTICES.md) | MCP integration patterns. |
| [`api.openapi.yaml`](./api.openapi.yaml) | Backend OpenAPI spec. |
| [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) | Source-of-truth audit on what's living. |

## Claims dropped

- **"18+ / 25+ / 20+ platforms"** — counts move with every compiler add. Use
  the live `tools/list` from the HoloScript MCP. F.014 (zero hardcoded stats).
- **"40+ packages / 43+ packages / 6+ MCP tools" badges** — same reason.
- **"60 / 90 / 30 FPS, objects/physics/networked/memory" benchmark table** —
  per-deployment and per-device; numbers in docs go stale instantly. Run
  the live profiler.
- **"100 LOC < 50ms / 10000 LOC < 5s" compilation-speed table** — synthetic;
  CI surfaces the real numbers.
- **Battle Arena / Brittney 6-tool roster / Discord links / "coming soon" video
  series** — most of those backing artefacts (`BATTLEARENA_DOCUMENTATION_INDEX.md`,
  `BRITTNEY_SYSTEM_REFERENCE.md`, `BRITTNEY_AI_PACKAGE_INDEX.md`,
  `HOLOSCRIPT_SECTOR_EXAMPLES.md`, `HOLOLAND_CENTRAL_ARCHITECTURE.md`,
  `ARCHITECTURE_DECISIONS.md`, the ECOSYSTEM_STATUS.md root file, and the
  per-package READMEs at the cited paths) are either archived or do not
  exist on disk. The links above are the verified-living surface.
- **Roadmap table with done / in-progress / coming-soon checkboxes** — the
  audit and the board are the live status sources, not a doc snapshot.

## See also

- [`HOLOLAND_PURPOSE.md`](./HOLOLAND_PURPOSE.md)
- [`HOLOSCRIPT_SOURCE_CONTRACT.md`](./HOLOSCRIPT_SOURCE_CONTRACT.md)
- [`BRITTNEY_CONTEXT.md`](./BRITTNEY_CONTEXT.md)
- [`AVATAR_STUDIO_BRIDGE.md`](./AVATAR_STUDIO_BRIDGE.md)
- [`CACHING.md`](./CACHING.md)
- [`EXAMPLES_GALLERY.md`](./EXAMPLES_GALLERY.md)
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md)
