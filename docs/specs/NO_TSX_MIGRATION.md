# Zero TypeScript Migration

Status: active migration directive, accepted 2026-05-07.

Historical filename note: this document started as the no-TSX plan. The active
scope is now larger: **zero hand-authored `.ts` and `.tsx` in HoloLand**.

## Rule

HoloLand should have zero checked-in hand-authored `.ts` and `.tsx` files.

Product surfaces, worlds, UI declarations, gameplay, NPC behavior, quests,
creator flows, and spatial interactions belong in HoloScript source: `.holo`,
`.hs`, or `.hsplus`.

TypeScript and TSX currently in the repository are migration debt. Bootstrap,
runtime adapters, device APIs, build tooling, service clients, validation,
tests, and generated-build plumbing are not acceptable permanent exceptions.
They either become HoloScript source, move upstream into the HoloScript
runtime/compiler/tooling, or become ignored generated output.

React/R3F/Three/Babylon/PlayCanvas output may be produced by the HoloScript
compiler, but generated target code should live outside tracked product source.

## Current Inventory

Commands:

```powershell
pnpm audit:zero-typescript
pnpm check:zero-typescript
$trackedTs = git ls-files | Where-Object { $_ -match '\.(ts|tsx)$' }
$visibleTs = rg --files -g "*.ts" -g "*.tsx"
$holo = rg --files -g "*.holo" -g "*.hs" -g "*.hsplus"
```

Local audit from 2026-05-08:

| Slice | Count |
|---|---:|
| zero-TypeScript audit (`.ts`/`.tsx`, excluding `.d.ts`) | 1851 |
| tracked `.ts` | 1222 |
| tracked `.tsx` | 476 |
| tracked `.ts` + `.tsx` total | 1698 |
| visible `.ts` | 1263 |
| visible `.tsx` | 477 |
| visible `.ts` + `.tsx` total | 1740 |
| visible HoloScript source (`.holo`, `.hs`, `.hsplus`) | 278 |

The current codebase is therefore not "mostly HoloScript." It is
TypeScript-heavy and must be treated as a migration candidate.

## Migration Shape

1. Central app bootstrap becomes HoloScript runtime entry, not a permanent `main.ts`.
2. `examples/hololand-central/src/pages/*.tsx` becomes `.holo` or `.hsplus` source plus route metadata.
3. `examples/hololand-central/src/worlds/*.tsx` becomes `holoscript/worlds/*.holo` or `.hsplus`.
4. `packages/adapters/react-three/**/*.tsx` moves to HoloScript compiler output generated outside tracked source, or upstream HoloScript runtime support.
5. `packages/**/*.ts` host/runtime code is either expressed in HoloScript, moved upstream into HoloScript packages, or deleted as obsolete bridge code.
6. Shared UI primitives become HoloScript UI component definitions.
7. Tests become HoloScript validation/compiler/runtime assertions.
8. Build configuration stops requiring checked-in `.ts` inside HoloLand; config should be JSON, HoloScript-driven, or upstreamed tooling.

## Two-Week Task Farm

Week 1:

1. Add zero-TypeScript audit tooling and keep it out of default build until the migration has a clean baseline.
2. Make the HoloLand landing/start screen canonical in `.holo`.
3. Replace `examples/hololand-central/src/main.tsx` and `App.tsx` with a temporary HoloScript runtime bootstrap, then delete the bootstrap by moving entrypoint support upstream.
4. Convert Central route/page shell files to `.holo`/`.hsplus` and generated route metadata.
5. Convert Central world components in priority order: `MainPlaza`, `Oasis`, `BuilderShop`, `SocialLounge`, `InfinityShop`, `ServiceDashboard`.

Week 2:

1. Convert `packages/adapters/react-three` to generated compiler target or upstream runtime capability.
2. Convert `packages/shared/ui` primitives and tests to HoloScript.
3. Convert `examples/oasis` app shell and page surfaces.
4. Convert `packages/ar` user-facing panels to HoloScript UI declarations.
5. Convert or retire legacy `packages/platform` renderer/frontend TSX and TS surfaces.
6. Flip `pnpm check:zero-typescript` into a required local/CI gate after the baseline is clean.

## Acceptance Gates

```powershell
pnpm audit:zero-typescript
pnpm check:zero-typescript
pnpm build
```

The zero-TypeScript check must eventually pass. Until then, every listed file is
migration debt that needs an owner and a deletion/conversion path.
