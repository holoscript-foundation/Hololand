# 2D Apps in HoloLand

> The 2026-01-22 version of this doc described `@hololand/renderer`,
> `Hololand2DRenderer`, `HololandCanvas` with `mode="2d"`, and a
> `@hololand/ui` package shipping `Button`/`TextInput`/`Panel`/`List`.
> None of those modules exist on disk:
> `grep -r Hololand2DRenderer packages/` returns zero hits;
> `packages/components/` is HoloScript template scaffolds, not React 2D
> primitives. The original guide was forward-looking copy that did not
> become product. This refresh strips the fiction and points at what's
> actually shipping.

## What's true today

- HoloLand is rendered through `examples/hololand-central/` and the
  packages it consumes (verify with `ls examples/hololand-central/`,
  `ls packages/ar/renderer/src/`).
- Source-of-truth is `.holo` / `.hs` / `.hsplus` per
  [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md). 2D
  surfaces (UI panels, dashboards, forms) are still expressed as HoloScript
  source; the renderer chooses the appropriate output.
- 2D / non-spatial output paths are HoloScript-canonical compile targets,
  not HoloLand-specific. See
  [`HoloScript/docs/non-spatial-demos.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/non-spatial-demos.md)
  and the `compile_to_native_2d` MCP tool for the live target list (do not
  hardcode counts — discover via `compile_to_*` tool listing).

## Where to author 2D surfaces

| Surface | Authoring path | Notes |
|---|---|---|
| 2D UI panels in a 3D world | HoloScript source under `examples/hololand-central/holoscript/` | Renderer composes UI primitives spatially. |
| Dashboards / tools / non-spatial UI | HoloScript source compiled via `compile_to_native_2d` | Live output target — discover, don't hardcode the renderer. |
| Holographic UI components | See [HOLOGRAPHIC_UI.md](./HOLOGRAPHIC_UI.md) | HoloLand-specific UI primitives composable from `.holo`. |
| Pre-built scene templates | `packages/components/templates/` (verify with `ls`) | HoloScript templates; verify [`packages/components/README.md`](../packages/components/README.md). |

## What does not exist

The following items in the original 2026-01-22 doc do not ship today.
Do not propagate them:

- `@hololand/renderer` package and its `Hololand2DRenderer` /
  `HololandRenderer` exports — `grep -r Hololand2DRenderer packages/`
  returns no source.
- `@hololand/ui` React component library exporting `Button`, `TextInput`,
  `Panel`, `Image`, `List` — no such package on disk.
- `@hololand/react-native` with mobile `HololandCanvas` — verify with
  `ls packages/`; no such package present.
- `@mode: 2d` HoloScript directive marked "Coming Soon" — not
  registered in the parser. If you need a non-spatial output, use
  `compile_to_native_2d` instead of inventing directives.
- Tauri / Electron / React Native deployment recipes from the original —
  these were generic Tauri docs, not HoloLand-specific. For deployment,
  see [`HoloScript/docs/deployment/DEPLOYMENT.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/deployment/DEPLOYMENT.md).

If you need any of these, open an issue describing the actual product gap;
do not cite the original doc as evidence they exist.

## See also

- [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) — what HoloLand owns
- [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) — `.holo` / `.hs` / `.hsplus` policy
- [HOLOGRAPHIC_UI.md](./HOLOGRAPHIC_UI.md) — UI primitives in HoloLand
- [GETTING_STARTED.md](./GETTING_STARTED.md) — install + run a HoloLand world
- HoloScript canonical compile target list — discover via `compile_to_*` MCP tools
