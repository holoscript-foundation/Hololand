# HoloLand Documentation

> HoloLand is the platform layer. HoloScript is the source layer. This
> index is the navigation hub for HoloLand-rooted docs only. Language,
> runtime, deployment, MCP, and architecture topics are HoloScript-
> canonical — most rows below either point at HoloScript or are
> HoloLand-specific overlays.
>
> **Repo-root entry points:** [`README.md`](../README.md) ·
> [`QUICKSTART.md`](../QUICKSTART.md) ·
> [`ECOSYSTEM_STATUS.md`](../ECOSYSTEM_STATUS.md) ·
> [`CONTRIBUTING.md`](../CONTRIBUTING.md)
>
> **What changed in 2026-05-11 cleanup:** Wave 1 retired 27 completion-
> report files to `archive/`. Wave 2 redirected 22 docs to HoloScript
> canonical. Wave 3 archived `PILOT_DEPLOYMENT_COMPLETE.md`. Wave 4
> Batches A–E refreshed living docs against current code (Brittney,
> architecture, perf/cache, guides/specs, top-of-funnel + INDEX). Dead
> links to retired files have been removed.

## Boundary docs (read first)

| Doc | What it says |
|---|---|
| [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) | What HoloLand owns vs HoloScript |
| [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) | `.holo` / `.hs` / `.hsplus` is source; `.ts` / `.tsx` is migration debt |
| [PROPERTY_RIGHTS_AND_PRIVACY.md](./PROPERTY_RIGHTS_AND_PRIVACY.md) | Spatial-ownership policy + privacy posture (design intent, not shipped) |
| [specs/HOLOSCRIPT_FIRST_MIGRATION.md](./specs/HOLOSCRIPT_FIRST_MIGRATION.md) | Why HoloScript leads |
| [specs/NO_TSX_MIGRATION.md](./specs/NO_TSX_MIGRATION.md) | The no-TSX policy |

## Getting started

| Doc | Description |
|---|---|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Install HoloScript, then HoloLand; run a HoloLand-rendered world |
| [CREATOR_QUICKSTART.md](./CREATOR_QUICKSTART.md) | Creator path: pointers to HoloScript-canonical authoring + HoloLand surfaces |
| [2D_APP_GUIDE.md](./2D_APP_GUIDE.md) | What 2D output paths actually exist (HoloScript-canonical compile targets) |
| [`QUICKSTART.md`](../QUICKSTART.md) | Repo-root 5-minute quick-start |

External canonical:
[`HoloScript/docs/guides/installation.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/installation.md) ·
[`HoloScript/docs/guides/quick-start.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/quick-start.md) ·
[`HoloScript/docs/guides/first-ai-scene.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/first-ai-scene.md) ·
[`HoloScript/docs/guides/first-ai-npc.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/first-ai-npc.md)

## Brittney AI (HoloLand-side runtime)

| Doc | Description |
|---|---|
| [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md) | Canonical: Brittney sub-packages, roles, runtime |
| [BRITTNEY_OWNERSHIP_MODEL.md](./BRITTNEY_OWNERSHIP_MODEL.md) | Cross-repo split (HoloScript / Studio / HoloLand) |
| [BRITTNEY_MODELS_DEPLOYMENT.md](./BRITTNEY_MODELS_DEPLOYMENT.md) | Inference deployment (toolkit GGUF + `@hololand/inference`) |
| [BRITTNEY_AI_PACKAGE_INDEX.md](./BRITTNEY_AI_PACKAGE_INDEX.md) | → redirect to HoloScript canonical (verify before use) |
| [BRITTNEY_HOLOSCRIPT_CONTEXT.md](./BRITTNEY_HOLOSCRIPT_CONTEXT.md) | → redirect to HoloScript canonical |

The HoloScript-canonical Brittney CLI agent lives at
[`HoloScript/packages/aibrittney/`](https://github.com/brianonbased-dev/HoloScript/tree/main/packages/aibrittney).

## Platform & runtime (HoloLand-specific)

Refreshed in Wave 4 Batches A–D against current source:

| Doc | Description |
|---|---|
| [AVATAR_STUDIO_BRIDGE.md](./AVATAR_STUDIO_BRIDGE.md) | HoloScript ↔ AvatarBlueprint ↔ VRM 1.0 export; Ready Player Me migration |
| [DISTRIBUTED_SCENE_GRAPH.md](./DISTRIBUTED_SCENE_GRAPH.md) | Multiplayer scene-graph state |
| [HOLOGRAPHIC_UI.md](./HOLOGRAPHIC_UI.md) | UI primitives composable from `.holo` |
| [GEOSPATIAL_ANCHORING.md](./GEOSPATIAL_ANCHORING.md) | Geo-anchored content |
| [RUNTIME_SERVICE_CATALOG.md](./RUNTIME_SERVICE_CATALOG.md) | Live runtime services |
| [QUALITY_TIER_PROFILES.md](./QUALITY_TIER_PROFILES.md) | Quality / budget tiers |
| [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) | Performance practices |
| [AUTONOMOUS_VR_OPTIMIZATION_ROADMAP.md](./AUTONOMOUS_VR_OPTIMIZATION_ROADMAP.md) | Autonomous optimization roadmap |
| [CACHING.md](./CACHING.md) | Procedural + streaming caches |
| [IOT_DIGITAL_TWINS_SHOWCASE.md](./IOT_DIGITAL_TWINS_SHOWCASE.md) | IoT → `.holo` digital twins |
| [EXAMPLES_GALLERY.md](./EXAMPLES_GALLERY.md) | Category map of `examples/` subdirectories |
| [DEVELOPER_PORTAL.md](./DEVELOPER_PORTAL.md) | Developer entry index |
| [VR_STUDIO_DESIGN.md](./VR_STUDIO_DESIGN.md) | In-VR studio design (not yet shipped — explicitly marked) |

## API / contracts

| Doc | Description |
|---|---|
| [API_REFERENCE.md](./API_REFERENCE.md) | Module-pointer table (no hardcoded counts; verify with `ls`) |
| [api.openapi.yaml](./api.openapi.yaml) | OpenAPI HTTP surface |
| [UAA2_API_CONTRACT.md](./UAA2_API_CONTRACT.md) | Agent contract |
| [AGENT_HOLOSCRIPT_TOOLING.md](./AGENT_HOLOSCRIPT_TOOLING.md) | HoloScript MCP tools for HoloLand agents |

External canonical:
[`HoloScript/docs/api/`](https://github.com/brianonbased-dev/HoloScript/tree/main/docs/api) ·
[`HoloScript/docs/api/MCP_EXAMPLES.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/MCP_EXAMPLES.md) ·
[`HoloScript/docs/api/REST_EXAMPLES.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/REST_EXAMPLES.md) ·
[`HoloScript/docs/api/CLI.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/CLI.md) ·
[`HoloScript/docs/api/traits.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/traits.md)

## Hardware & validation

| Doc | Description |
|---|---|
| [HARDWARE_VALIDATION.md](./HARDWARE_VALIDATION.md) | On-device receipts (Quest, Vision Pro, AR phones, desktop XR) |
| [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md) | HoloLand-specific spatial / avatar / social / `.holo` content moderation |
| [guides/device-lab-probe.md](./guides/device-lab-probe.md) | Device-lab probe procedure |

External canonical:
[`HoloScript/docs/security/SECURITY.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/SECURITY.md) ·
[`HoloScript/docs/security/SECURITY_HARDENING_GUIDE.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/security/SECURITY_HARDENING_GUIDE.md)

## Deployment

Most deployment docs in this tree are Wave 2 redirects to HoloScript canonical:

| Doc | Status |
|---|---|
| [DEPLOYMENT_BROWSER.md](./DEPLOYMENT_BROWSER.md) | → redirect to HoloScript WebXR canonical |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | → redirect to HoloScript deployment canonical |
| [DEPLOYMENT_CLOUD_SYNC.md](./DEPLOYMENT_CLOUD_SYNC.md) | → redirect to HoloScript canonical |
| [DEPLOYMENT_MOBILE.md](./DEPLOYMENT_MOBILE.md) | Original full guide (not yet redirected; verify against current React Native packages before relying on it) |
| [DEPLOYMENT_TAURI.md](./DEPLOYMENT_TAURI.md) | Original full guide (not yet redirected; verify against current Tauri setup before relying on it) |
| [USER_DEPLOYMENT_GUIDE.md](./USER_DEPLOYMENT_GUIDE.md) | → redirect to HoloScript canonical |

External canonical:
[`HoloScript/docs/deployment/DEPLOYMENT.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/deployment/DEPLOYMENT.md) ·
[`HoloScript/docs/platforms/WEBXR.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/platforms/WEBXR.md)

## Language / file types (all redirects)

These are Wave 2 redirects — HoloScript is canonical for all language and file-type material.

| Doc | Status |
|---|---|
| [HOLOSCRIPT_LANGUAGE_SPEC.md](./HOLOSCRIPT_LANGUAGE_SPEC.md) | → redirect |
| [HOLOSCRIPT_LANGUAGE_REFERENCE.md](./HOLOSCRIPT_LANGUAGE_REFERENCE.md) | → redirect |
| [HOLOSCRIPT_LANGUAGE_COMPARISON.md](./HOLOSCRIPT_LANGUAGE_COMPARISON.md) | → redirect |
| [HSPLUS_LANGUAGE_SPEC.md](./HSPLUS_LANGUAGE_SPEC.md) | → redirect |
| [HOLOSCRIPT_FILE_TYPES.md](./HOLOSCRIPT_FILE_TYPES.md) | → redirect |
| [HOLOSCRIPT_INTEGRATION_GUIDE.md](./HOLOSCRIPT_INTEGRATION_GUIDE.md) | → redirect |
| [HOLOSCRIPT_SECTOR_EXAMPLES.md](./HOLOSCRIPT_SECTOR_EXAMPLES.md) | → redirect |
| [MCP_BEST_PRACTICES.md](./MCP_BEST_PRACTICES.md) | → redirect |

## Architecture (mostly redirects)

| Doc | Status |
|---|---|
| [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) | → redirect to HoloScript canonical |
| [HOLOLAND_CENTRAL_ARCHITECTURE.md](./HOLOLAND_CENTRAL_ARCHITECTURE.md) | → redirect to HoloScript canonical |
| [HOLO_ECOSYSTEM_DEVELOPER_GUIDE.md](./HOLO_ECOSYSTEM_DEVELOPER_GUIDE.md) | → redirect to HoloScript canonical |
| [PLATFORM_VISION.md](./PLATFORM_VISION.md) | → redirect to HoloScript canonical |
| [BACKEND_NODES_DESIGN.md](./BACKEND_NODES_DESIGN.md) | HoloLand-specific backend design |

## Specs (HoloLand-specific)

| Spec | Description |
|---|---|
| [specs/HOLOLAND_FRONTIER_NORTH_STAR.md](./specs/HOLOLAND_FRONTIER_NORTH_STAR.md) | Programmable living frontier — strategic target |
| [specs/HOLOSCRIPT_FIRST_MIGRATION.md](./specs/HOLOSCRIPT_FIRST_MIGRATION.md) | HoloScript-first migration policy |
| [specs/NO_TSX_MIGRATION.md](./specs/NO_TSX_MIGRATION.md) | Zero-`.tsx` end-state policy |
| [specs/HOLOLAND_CENTRAL_ACCESSIBILITY_GAMEPLAN.md](./specs/HOLOLAND_CENTRAL_ACCESSIBILITY_GAMEPLAN.md) | Accessibility plan |
| [specs/SOCIAL_FEATURES_SPEC.md](./specs/SOCIAL_FEATURES_SPEC.md) | Social features spec |
| [specs/TIERED_CHAT_GAMEPLAN.md](./specs/TIERED_CHAT_GAMEPLAN.md) | Tiered chat plan |
| [specs/NOCODE_WORLD_BUILDER_SPEC.md](./specs/NOCODE_WORLD_BUILDER_SPEC.md) | No-code builder spec |
| [specs/CREATOR_PROGRAM_SYSTEM.md](./specs/CREATOR_PROGRAM_SYSTEM.md) | Creator program spec |
| [specs/CREATOR_ONBOARDING_PLATFORM.md](./specs/CREATOR_ONBOARDING_PLATFORM.md) | Creator onboarding spec |
| [specs/AI_AGENT_INTEGRATION_SYSTEM.md](./specs/AI_AGENT_INTEGRATION_SYSTEM.md) | Agent integration spec |
| [specs/frontier-encounter-manifest.holo](./specs/frontier-encounter-manifest.holo) | Frontier encounter manifest (`.holo` source) |
| [specs/frontier-encounter-manifest.schema.json](./specs/frontier-encounter-manifest.schema.json) | Frontier encounter manifest schema |
| [specs/HOLOLAND_3_LAYERS](./specs/HOLOLAND_3_LAYERS/) | 3-layer architecture spec |
| [specs/HOLOLAND_BUILDER_EXPERIENCE](./specs/HOLOLAND_BUILDER_EXPERIENCE/) | Builder experience spec |
| [specs/HOLOLAND_GAMING](./specs/HOLOLAND_GAMING/) | Gaming spec |
| [specs/HOLOLAND_LANDING_EXPERIENCE](./specs/HOLOLAND_LANDING_EXPERIENCE/) | Landing experience spec |

## Audits

| Doc | Description |
|---|---|
| [audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) | Disk-grounded should-exist audit (2026-05-07) — authoritative |
| [HOLOLAND_DOCUMENTATION_AUDIT_MARCH_2026.md](./HOLOLAND_DOCUMENTATION_AUDIT_MARCH_2026.md) | Earlier audit; some "deprecated" calls were wrong (corrected via header) |
| [DOCUMENTATION_AUDIT_2026-02-21.md](./DOCUMENTATION_AUDIT_2026-02-21.md) | Older audit |

## Pilots

| Doc | Description |
|---|---|
| [pilots/README.md](./pilots/README.md) | Pilot index |
| [pilots/NEUROMORPHIC_WAREHOUSE_PILOT.md](./pilots/NEUROMORPHIC_WAREHOUSE_PILOT.md) | Neuromorphic warehouse pilot |
| [pilots/NEUROMORPHIC_PILOT_EXECUTIVE_SUMMARY.md](./pilots/NEUROMORPHIC_PILOT_EXECUTIVE_SUMMARY.md) | Executive summary |
| [pilots/PILOT_QUICK_REFERENCE.md](./pilots/PILOT_QUICK_REFERENCE.md) | Quick reference |

## Guides

| Doc | Description |
|---|---|
| [guides/device-lab-probe.md](./guides/device-lab-probe.md) | Device-lab probe procedure |
| [guides/DEVELOPMENT_ENVIRONMENT_SETUP.md](./guides/DEVELOPMENT_ENVIRONMENT_SETUP.md) | → redirect to HoloScript installation |
| [guides/QUICK_REFERENCE.md](./guides/QUICK_REFERENCE.md) | → redirect to INDEX / GETTING_STARTED |

## Strategy & knowledge

| Doc | Description |
|---|---|
| [strategy/HOLOLAND_LIVING_COMPETITOR_GAP_MATRIX.md](./strategy/HOLOLAND_LIVING_COMPETITOR_GAP_MATRIX.md) | Living competitor matrix |
| [knowledge/vr-performance-wisdom.md](./knowledge/vr-performance-wisdom.md) | VR performance lessons |

## Folder structure

```
docs/
├── audits/         — disk-grounded audits
├── archive/        — Wave 1/3 retired completion-report cruft
├── assets/         — images
├── guides/         — operational guides
├── knowledge/      — distilled wisdom
├── pilots/         — pilot documentation
├── specs/          — HoloLand-specific specs (gameplay, layers, builder, etc.)
├── strategy/       — strategy material
├── INDEX.md        — this file
└── *.md            — top-level HoloLand docs (mix of refreshed + redirected)
```

## Discovering external canonical material

Live counts and per-package inventories are NOT pinned in this index
(F.014: zero hardcoded stats). Verify on demand:

| Question | Path |
|---|---|
| Number / list of HoloScript MCP tools | `tools/list` against `mcp.holoscript.net`; never hardcode |
| Compile targets | `compile_to_*` MCP tool discovery, or [`HoloScript/docs/NUMBERS.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/NUMBERS.md) |
| HoloLand packages on disk | `ls packages/`, then per-folder READMEs |
| Live `examples/` subdirectories | `ls examples/` |

## What was removed in 2026-05-11 cleanup

Dead links to the following retired files have been removed from this
INDEX. They are preserved in `archive/` (history) but should not be
linked from current docs:

- All `BATTLEARENA_*` files (game-specific completion reports)
- `∞.BATTLEARENA_BRITTNEY_GAME_2026_02_03.md` (unicode-prefixed BattleArena delivery file)
- All `BRITTNEY_GAME_*` files (game-specific delivery reports)
- All `WEEK*`, `STEP*` completion reports
- `DEVELOPER_PORTAL_COMPLETE.md`, `DOCUMENTATION_*_COMPLETE.md`
- `MARKETING_MATERIALS.md`, `MARKETING_PLAYBOOK.md`
- `HOLOLAND_OASIS_CENTRAL_DESIGN.md`
- `ECOSYSTEM_AUDIT_2026-01.md`
- `VR_FITNESS_MARKETPLACE.md` (Batch D archive)
- `MICROSOFT_MESH_MIGRATION_GUIDE.md` (Batch D archive)
- `BRITTNEY_SYSTEM_REFERENCE.md` (described an API surface no longer in source)
- `BRITTNEY_FINETUNING_INSTRUCTIONS.md` (referenced in old INDEX but not present on disk)

If a previously-linked doc is missing from this index, it was either
archived, redirected, or never existed on disk. Use `git log -- docs/<name>`
to trace history.
