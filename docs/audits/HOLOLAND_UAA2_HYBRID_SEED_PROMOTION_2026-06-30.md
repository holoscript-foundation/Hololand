# HoloLand uaa2 Hybrid Seed Promotion - 2026-06-30

Status: promoted to HoloScript source. No retired `uaa2-service` TypeScript
extension was revived.

## Seed

- Seed:
  `idea-seeds/archive-farm/2026-05-12_archive_hololand-uaa2-service-hybrid-architecture.md`
- Source archive:
  `docs/archive/HYBRID_ARCHITECTURE.md`
- Promoted source:
  `apps/holoshell/source/hololand-hybrid-dimension-portal.hsplus`

## Decision

The useful current claim is the dimension bridge: agents, Brittney, HoloShell,
and HoloLand should move among 2D UI, 3D worlds, and code surfaces through
receipt-backed transitions.

The historical implementation plan is not revived as a direct TypeScript
extension. The current representation is a HoloScript-native contract with
policies for:

- HoloScript-first bridge modeling,
- workspace, source, visual, and human-service receipts,
- no raw secret projection into worlds,
- guarded execution for local computer mutation,
- separate approval for deletion or publish actions.

## Validation

```powershell
node C:\Users\josep\Documents\GitHub\HoloScript\packages\cli\dist\cli.js parse C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\hololand-hybrid-dimension-portal.hsplus
node C:\Users\josep\.ai-ecosystem\scripts\index-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand
node C:\Users\josep\.ai-ecosystem\scripts\index-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand --check
```

Result: pass.

## Next

Future build work should create a browser or HoloShell receipt proving a real
agent workspace transition through this contract. That is separate from this
seed-promotion slice.
