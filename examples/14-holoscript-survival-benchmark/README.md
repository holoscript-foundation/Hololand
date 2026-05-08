# HoloScript Survival Frontier Benchmark

This benchmark is a HoloScript-first response to browser survival/crafting demos. It does not add a TypeScript game loop, Vite app, or hand-written Three.js scene. The gameplay source of truth is [`survival_frontier.holo`](survival_frontier.holo).

## What It Proves

- HoloScript can declare deterministic terrain parameters, biome classification, resource spawning, inventory, crafting recipes, snap-to-grid building, and provenance receipts in one runtime composition.
- HoloLand should materialize this source through the HoloScript runtime/compiler layer.
- If a target renderer still needs TypeScript bridge work, that work belongs below the source contract boundary and must not become the canonical gameplay implementation.

## Benchmark Surface

- `environment.terrain_profile` defines the procedural world kernel.
- `state.terrain_params`, `state.biomes`, `state.inventory`, and `state.recipes` define the survival model.
- `template "ResourceNode"` and `template "BuildSlot"` describe gather/build interaction surfaces.
- `logic` contains deterministic chunk materialization, gather/craft/build actions, and receipt generation.

## Runtime Expectation

The expected path is:

```text
survival_frontier.holo
  -> HoloScript validate / diagnostics
  -> HoloScript runtime or compiler target
  -> HoloLand renderer/materialization
```

No checked-in per-world TypeScript should be needed for this benchmark.

Compiler-emitted TypeScript for a renderer target is acceptable as disposable
build output. It is not the source of truth and should not be hand-authored for
this benchmark.

## Local Validation

```powershell
pnpm exec hs parse examples\14-holoscript-survival-benchmark\survival_frontier.holo
pnpm exec hs run examples\14-holoscript-survival-benchmark\survival_frontier.holo
```
