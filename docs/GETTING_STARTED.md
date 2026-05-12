# Getting Started with HoloLand

> HoloLand is the platform layer. HoloScript is the source layer. Install
> HoloScript first, then come back to run a HoloLand-rendered world.
> Per [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md),
> language, runtime, deployment, and MCP topics are HoloScript-canonical;
> this guide only covers what's HoloLand-specific.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 18+ | Verified by `pnpm install` engines field. |
| pnpm | latest | Workspace manager — `npm install -g pnpm`. |
| Git | any recent | Clone the repo. |

For VR/AR validation hardware, see [HARDWARE_VALIDATION.md](./HARDWARE_VALIDATION.md).

## Step 1 — install HoloScript first

The language, parser, compilers, traits, and MCP server are all HoloScript-canonical. Start there:

- **HoloScript installation:** [`HoloScript/docs/guides/installation.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/installation.md)
- **HoloScript 5-minute quick-start:** [`HoloScript/docs/guides/quick-start.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/quick-start.md)
- **First AI scene with Studio:** [`HoloScript/docs/guides/first-ai-scene.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/guides/first-ai-scene.md)

These cover `.holo` / `.hs` / `.hsplus` syntax, the VS Code extension, the CLI, and authoring with Brittney. The [HoloScript-First Migration spec](./specs/HOLOSCRIPT_FIRST_MIGRATION.md) explains why HoloScript leads.

## Step 2 — clone HoloLand and build

```bash
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand
pnpm install
pnpm build
```

The same steps live in [`QUICKSTART.md`](../QUICKSTART.md) — that file is the authoritative repo-root quick-start; this doc is the docs-tree entry point.

## Step 3 — run a HoloLand-rendered world

The flagship example is `examples/hololand-central` (verify with `ls examples/`). It renders worlds authored as `.holo` / `.hs` / `.hsplus`.

```bash
cd examples/hololand-central
pnpm dev
# open http://localhost:5173
```

Other example directories under `examples/` (verify the live list with `ls examples/`) demonstrate specific surfaces — physics, multiplayer, AR, desktop. See [`EXAMPLES_GALLERY.md`](./EXAMPLES_GALLERY.md) for the current category breakdown grounded in actual subdirectories.

## Step 4 — write HoloLand-side source

If your work changes runtime behavior (gameplay, traits, world rules, agents), the source-of-truth file must be `.holo` / `.hs` / `.hsplus`. Hand-authored `.ts` and `.tsx` are migration debt under [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md).

| Surface | Where the source lives |
|---|---|
| Worlds, scenes, NPCs | `examples/hololand-central/holoscript/` and `examples/hololand-central/templates/` |
| Brittney runtime (HoloLand-side) | `packages/brittney/` — see [BRITTNEY_CONTEXT.md](./BRITTNEY_CONTEXT.md) |
| Avatar pipeline | `packages/ar/avatar-studio/` — see [AVATAR_STUDIO_BRIDGE.md](./AVATAR_STUDIO_BRIDGE.md) |
| Distributed scene graph | `packages/platform/` — see [DISTRIBUTED_SCENE_GRAPH.md](./DISTRIBUTED_SCENE_GRAPH.md) |
| Caching (procedural + streaming) | See [CACHING.md](./CACHING.md) |
| Holographic UI primitives | See [HOLOGRAPHIC_UI.md](./HOLOGRAPHIC_UI.md) |

## Step 5 — deploy

Deployment paths are HoloScript-canonical. The HoloLand `DEPLOYMENT_*` stubs in this docs tree redirect to the real material:

- WebXR / browser: [`HoloScript/docs/platforms/WEBXR.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/platforms/WEBXR.md)
- Pre-launch checklist: [`HoloScript/docs/deployment/DEPLOYMENT.md`](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/deployment/DEPLOYMENT.md)
- Compile targets: discover live targets via `holoscript --list-targets` or `compile_to_*` MCP tools (do not hardcode the count — it changes per release; see [HoloScript NUMBERS.md](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/NUMBERS.md)).

## What this doc is not

- Not a HoloScript syntax tutorial — that's HoloScript-canonical.
- Not a deployment manual — deployment is HoloScript-canonical.
- Not a marketing landing — see [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md) for what HoloLand owns.

## Next

| You want to... | Read |
|---|---|
| Understand the HoloLand/HoloScript boundary | [HOLOLAND_PURPOSE.md](./HOLOLAND_PURPOSE.md), [HOLOSCRIPT_SOURCE_CONTRACT.md](./HOLOSCRIPT_SOURCE_CONTRACT.md) |
| See the platform vision and frontier scope | [specs/HOLOLAND_FRONTIER_NORTH_STAR.md](./specs/HOLOLAND_FRONTIER_NORTH_STAR.md) |
| Use HoloScript MCP tools from agents | [AGENT_HOLOSCRIPT_TOOLING.md](./AGENT_HOLOSCRIPT_TOOLING.md) |
| Validate on real hardware | [HARDWARE_VALIDATION.md](./HARDWARE_VALIDATION.md) |
| Browse all HoloLand docs | [INDEX.md](./INDEX.md) |
