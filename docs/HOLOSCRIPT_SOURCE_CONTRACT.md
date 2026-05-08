# HoloScript Source Contract

Hololand is the platform layer. HoloScript is the source layer.

This contract keeps feature logic, platform behavior, and runtime semantics in
HoloScript. It also names the end state plainly: HoloLand should have zero
hand-authored `.ts` and `.tsx` files.

See `docs/specs/NO_TSX_MIGRATION.md`. The historical filename says TSX because
the first pass targeted JSX. The active policy now covers both `.ts` and `.tsx`.

## Core Rule

For gameplay, simulation, UI surfaces, IoT twin behavior, platform flows,
creator tools, agent embodiment, and runtime-visible product behavior:

- **Source of truth MUST be HoloScript** (`.holo`, `.hs`, `.hsplus`)
- **Hand-authored `.ts` and `.tsx` are migration debt**
- Generated target code belongs outside tracked HoloLand source
- Missing host/runtime primitives should move upstream into HoloScript rather
  than hardening TypeScript bridges inside HoloLand

## Scope

This policy applies to all feature work in platform/runtime product domains,
especially under:

- `packages/platform/**`
- `packages/ar/**`
- `packages/adapters/**`
- `examples/**` (when adding real feature behavior)
- `apps/**`
- `packages/brittney/**`
- `packages/shared/**`

## Migration Exceptions

Until the migration reaches zero, a change may touch existing `.ts` or `.tsx`
only when it is clearly one of:

1. Deleting or converting TypeScript/TSX to HoloScript.
2. Keeping the current build alive while a named migration is underway.
3. Moving a capability upstream into the HoloScript runtime, compiler, CLI, or tooling.
4. Documentation-only or config-only work that tightens the zero-TypeScript contract.

New hand-authored `.ts` or `.tsx` in HoloLand requires an explicit migration
exception from the founder. "It is just infrastructure" is not enough; the
default answer is to express the behavior in HoloScript or improve HoloScript so
it can host the behavior.

If a change intentionally touches TypeScript during the transition, label it:

- `typescript-migration-debt`

and include the deletion/conversion path in the PR description.

## Required For New Features

When adding feature behavior in covered domains, the change must include at
least one of:

- new/updated `.holo`
- new/updated `.hs`
- new/updated `.hsplus`

No new feature should require hand-authored TypeScript to understand what the
feature is or how it behaves.

## Enforcement Target

The transition gate should detect feature-domain TypeScript changes that lack
matching HoloScript source, then tighten until the final gate is possible. The
final gate is:

- zero checked-in hand-authored `.tsx`
- zero checked-in hand-authored `.ts`
- HoloScript source is sufficient to recreate any generated target output

## Design Intent

- HoloScript defines world semantics
- HoloLand runtime executes and materializes those semantics
- HoloLand does not become a TypeScript platform with HoloScript decoration
- TypeScript disappears from HoloLand source as the runtime and compiler mature

This preserves the end-to-end HoloScript-native architecture while keeping
runtime performance, platform compatibility, and hardware validation grounded in
the language.
