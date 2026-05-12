# HoloLand API Reference

> Static API references rot. This doc is a **module-pointer table**, not
> typed signatures. Each row points at the source-of-truth file or
> README; read that for the current API. For HoloScript-canonical APIs
> (language, runtime, MCP, compilers) see
> [`HoloScript/docs/api/`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/).

## How to discover the live API

| Question | Best path |
|---|---|
| What packages exist on disk? | `ls packages/`, `ls packages/*/`, `ls packages/ar/`, `ls packages/brittney/`, `ls packages/platform/` |
| What does package X export? | `cat packages/<path>/src/index.ts`, then the package's `README.md` |
| What MCP tools does HoloScript expose? | Live `tools/list` from the HoloScript MCP server (`mcp.holoscript.net`) — never hardcode the count (F.014) |
| What compile targets exist? | `compile_to_*` MCP tool discovery; or [`HoloScript/docs/NUMBERS.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/NUMBERS.md) for verification commands |
| What HoloScript traits exist? | [`HoloScript/docs/api/traits.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/traits.md), or `find HoloScript/packages -name '*Trait*.ts'` |
| TypeScript types for a package | `packages/<name>/dist/index.d.ts` after `pnpm build` |

## HoloLand package surface (top-level groups)

Verify the live tree with `ls packages/` — the layout moves and the
counts are not pinned here.

| Group | Path | Source-of-truth file |
|---|---|---|
| Brittney runtime | `packages/brittney/` | [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md) (sub-package table) |
| AR/spatial bridges | `packages/ar/` | [`packages/ar/README.md`](../packages/ar/README.md) per sub-package |
| Renderer/runtime adapters | `packages/adapters/` | Per-target READMEs (`react-three`, `babylon`, `three`, `unity`, `vrchat`, `playcanvas`) |
| Platform runtime | `packages/platform/` | Per-domain READMEs (`auth`, `animation`, `gestures`, `haptics`, `accessibility`, `lifecycle`, `lod`, `library`, etc.) |
| Shared utilities | `packages/shared/` | `inference`, `ui` |
| Components / templates | `packages/components/` | [`packages/components/README.md`](../packages/components/README.md) |
| Spatial builder | `packages/spatial-builder/` | [`packages/spatial-builder/README.md`](../packages/spatial-builder/README.md) |
| Playground | `packages/playground/` | [`packages/playground/`](../packages/playground/) |

## Brittney sub-package surfaces

The Brittney runtime in HoloLand is the most-asked-about API. Its
sub-package table is canonical in [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md);
do not duplicate that table here.

For HoloScript-canonical Brittney CLI agent (different surface —
substrate, not HoloLand-side runtime), see
[`HoloScript/packages/aibrittney/README.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/packages/aibrittney/README.md).

## Compile / MCP / Inference

These are HoloScript-canonical, not HoloLand-specific:

| Topic | Where |
|---|---|
| MCP examples | [`HoloScript/docs/api/MCP_EXAMPLES.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/MCP_EXAMPLES.md) |
| REST examples | [`HoloScript/docs/api/REST_EXAMPLES.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/REST_EXAMPLES.md) |
| CLI reference | [`HoloScript/docs/api/CLI.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/CLI.md) |
| Core API | [`HoloScript/docs/api/CORE_API.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/CORE_API.md) |
| Trait reference | [`HoloScript/docs/api/traits.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/traits.md) |
| Directives | [`HoloScript/docs/api/directives.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/api/directives.md) |
| Inference (Ollama, providers, BYOK) | [`packages/shared/inference/`](../packages/shared/inference/) |

## HoloLand-specific APIs

These ship in this repo and are NOT HoloScript-canonical. Each row
points at the source-of-truth file:

| API | Where |
|---|---|
| HoloLand Brittney premium MCP server | [`packages/brittney/mcp-server/README.md`](../packages/brittney/mcp-server/README.md) |
| Avatar Studio (HoloScript ↔ blueprint ↔ VRM) | [AVATAR_STUDIO_BRIDGE.md](./AVATAR_STUDIO_BRIDGE.md) |
| Distributed scene graph | [DISTRIBUTED_SCENE_GRAPH.md](./DISTRIBUTED_SCENE_GRAPH.md) |
| Procedural + streaming caches | [CACHING.md](./CACHING.md) |
| Holographic UI primitives | [HOLOGRAPHIC_UI.md](./HOLOGRAPHIC_UI.md) |
| Geospatial anchoring | [GEOSPATIAL_ANCHORING.md](./GEOSPATIAL_ANCHORING.md) |
| Runtime service catalog | [RUNTIME_SERVICE_CATALOG.md](./RUNTIME_SERVICE_CATALOG.md) |
| Quality tier profiles | [QUALITY_TIER_PROFILES.md](./QUALITY_TIER_PROFILES.md) |
| Performance tuning | [PERFORMANCE_TUNING.md](./PERFORMANCE_TUNING.md) |
| IoT digital twins | [IOT_DIGITAL_TWINS_SHOWCASE.md](./IOT_DIGITAL_TWINS_SHOWCASE.md) |
| OpenAPI HTTP surface | [`api.openapi.yaml`](./api.openapi.yaml) |
| Agent contract | [UAA2_API_CONTRACT.md](./UAA2_API_CONTRACT.md) |
| Agent / MCP tooling for HoloLand | [AGENT_HOLOSCRIPT_TOOLING.md](./AGENT_HOLOSCRIPT_TOOLING.md) |

## What this doc is not

- Not a hand-maintained signature table — those rot the moment a
  package adds an export. Read `dist/index.d.ts` or the package README
  instead.
- Not a count-of-packages claim. The original "40+ packages" was
  stale before publication; per F.014 (zero hardcoded stats), counts go
  in [HoloScript NUMBERS.md](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/NUMBERS.md)
  with verification commands, not into prose.
- Not a duplicate of HoloScript-canonical API docs.

## See also

- [INDEX.md](./INDEX.md) — full HoloLand docs map
- [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) — what's HoloScript-canonical
- [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) — HoloLand vs HoloScript boundary
