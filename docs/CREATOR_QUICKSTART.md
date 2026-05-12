# Creator Quickstart

> The original 2026-01-15 version of this doc described a `hololand.io`
> creator program with welcome credits, Stripe payouts, and a no-code
> dashboard. None of those surfaces ship in this repo. They were
> Phase-0 plan material that did not become product. The plan itself is
> archived at [`archive/PHASE_0_DEVELOPMENT_ROADMAP.md`](./archive/PHASE_0_DEVELOPMENT_ROADMAP.md)
> and [`archive/PHASE_0_IMPLEMENTATION_PLAN.md`](./archive/PHASE_0_IMPLEMENTATION_PLAN.md).
>
> Today, "creator" means a developer authoring `.holo` / `.hs` / `.hsplus`
> source that HoloLand renders. This doc is a thin pointer; the canonical
> creator path is HoloScript-canonical.

## The real path

| Step | Where |
|---|---|
| 1. Install HoloScript + VS Code extension | [`HoloScript/docs/guides/installation.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/installation.md) |
| 2. Write your first scene (5-min) | [`HoloScript/docs/guides/quick-start.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/quick-start.md) |
| 3. Build a scene with Brittney AI (15-min) | [`HoloScript/docs/guides/first-ai-scene.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/first-ai-scene.md) |
| 4. Add an AI NPC (30-min) | [`HoloScript/docs/guides/first-ai-npc.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/first-ai-npc.md) |
| 5. Render in HoloLand | [`GETTING_STARTED.md`](./GETTING_STARTED.md) Step 3 |
| 6. Publish | [`HoloScript/docs/guides/publishing-platform-terms.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/publishing-platform-terms.md) |

## HoloLand-specific creator surfaces

These are the HoloLand-side things a creator interacts with after authoring in HoloScript. Verify each path with `ls` before relying on it — HoloLand directory shape moves.

| Surface | Where it lives | What it does |
|---|---|---|
| Flagship example world | `examples/hololand-central/` | Reference HoloLand render target — drop your `.holo` source into `examples/hololand-central/holoscript/` and run `pnpm dev`. |
| Templates | `examples/hololand-central/templates/` | Starter `.holo` / `.hs` / `.hsplus` files to copy. |
| Avatar pipeline | `packages/ar/avatar-studio/` | VRM 1.0 export, Ready Player Me migration path. See [AVATAR_STUDIO_BRIDGE.md](./AVATAR_STUDIO_BRIDGE.md). |
| Holographic UI | `packages/components/`, `packages/ar/` | UI primitives composable from `.holo`. See [HOLOGRAPHIC_UI.md](./HOLOGRAPHIC_UI.md). |
| IoT digital twins | `packages/brittney/iot-digital-twins/` | Ingest IoT devices, emit `.holo`. See [IOT_DIGITAL_TWINS_SHOWCASE.md](./IOT_DIGITAL_TWINS_SHOWCASE.md). |

## What does not exist

The following items in the January 2026 version were aspirational, not shipped. Do not propagate them:

- **`hololand.io` web app, dashboard, sign-up flow** — no source on disk; no deploy.
- **$100 welcome credit, Stripe creator payouts, 70/30 revenue split** — no payments routes; no Stripe integration.
- **No-code drag-and-drop builder** — `packages/spatial-builder/` exists but is not the dashboard described in the original. Verify with `ls packages/spatial-builder/`.
- **Asset library with 500+ models** — no curated asset library exists; Brittney generates assets procedurally per [CACHING.md](./CACHING.md).
- **Creator Discord, office hours, `creators@hololand.io`** — none verified.

If you need any of these built, file an issue describing the actual product gap; do not cite this doc as evidence they exist.

## Source contract for creators

Per [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md): if your creation changes runtime behavior, the source-of-truth file MUST be `.holo`, `.hs`, or `.hsplus`. Hand-authored `.ts` and `.tsx` are migration debt and require an explicit founder exception.

## See also

- [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) — what HoloLand owns vs HoloScript
- [INDEX.md](./INDEX.md) — full HoloLand docs map
- [specs/HOLOLAND_FRONTIER_NORTH_STAR.md](./specs/HOLOLAND_FRONTIER_NORTH_STAR.md) — programmable living frontier scope
