# HoloLand Stale Surface Inventory - 2026-06-29

Status: shipped inventory gate. The first 17 `jetson-archive-candidate`
surfaces were archived to Jetson and retired from active source on 2026-06-29.

Receipt:

- Human summary:
  `docs/audits/HOLOLAND_JETSON_ARCHIVE_RECEIPT_2026-06-29.md`
- Machine manifest:
  `docs/audits/hololand-jetson-archive-2026-06-29-reboot.json`

## Purpose

This follows the 30/60-day canonicality rule in `NORTH_STAR.md`: old HoloLand
examples and packages must prove current source, deployment, proof, or bridge
value before they stay load-bearing.

The scanner is non-destructive:

```powershell
node scripts/hololand-stale-surface-inventory.mjs --summary
node scripts/hololand-stale-surface-inventory.mjs --json
```

## Evidence Notes

- HoloScript MCP graph status was attempted first and timed out after about 300s.
- Local filesystem/reference scanning was used instead.
- Historical `docs/archive/**` and `docs/audits/**` references are retained as
  references, but do not count as active deployment or proof evidence.

## Current Summary

Initial real HoloLand scan on 2026-06-29:

| Status | Count | Meaning |
| --- | ---: | --- |
| `active-proof` | 11 | HoloScript-family source only or source-first proof surface. |
| `bridge-debt` | 12 | Mixed HoloScript plus JS/TS bridge code; quarantine, do not celebrate. |
| `watch` | 45 | Has deployment/proof references or is not old enough for archive default. |
| `jetson-archive-candidate` | 17 | Older than 60 days, no HoloScript source, no active proof/deployment evidence. |

Post-retirement verification on 2026-06-29:

| Status | Count |
| --- | ---: |
| `active-proof` | 11 |
| `bridge-debt` | 12 |
| `watch` | 43 |
| `jetson-archive-candidate` | 2 |

The remaining archive candidates are `packages/ar/detection` and
`packages/ar/embeddings`. They were not part of the first 17-path archive batch
and should go through the same receipt-first Jetson archive lane before any
future active-source retirement.

## Protected Active-Proof Surfaces

- `examples/01-hello-vr-world`
- `examples/02-physics-playground`
- `examples/03-vr-shop`
- `examples/14-holoscript-survival-benchmark`
- `examples/fresh`
- `examples/headless`
- `examples/holoscript-studio`
- `examples/native-authoring-pipeline`
- `examples/twin-universe`
- `packages/platform/library`
- `packages/platform/three-plains`

## Bridge Debt To Quarantine

- `examples/demos`
- `examples/hololand-central`
- `examples/hololand-legends`
- `packages/platform/animation`
- `packages/platform/audio`
- `packages/platform/core`
- `packages/platform/demos`
- `packages/platform/quality-profiles`
- `packages/platform/renderer`
- `packages/platform/spatial`
- `packages/platform/ui`
- `packages/platform/world`

These are not archive candidates yet because they contain HoloScript-family
source and JS/TS bridge code. Future work should connect each bridge to a named
source/receipt path or replace it with generated/validated HoloScript output.

## Jetson Archive Candidates

The first machine-readable pass identified these candidates:

| Path | Age | Source | JS/TS | Refs |
| --- | ---: | ---: | ---: | ---: |
| `examples/05-desktop-app` | 125d | 0 | 1 | 7 |
| `examples/06-mobile-app` | 125d | 0 | 1 | 7 |
| `examples/08-progressive-vr` | 125d | 0 | 11 | 7 |
| `examples/09-multiplayer-lobby` | 125d | 0 | 1 | 7 |
| `examples/10-collaborative-building` | 125d | 0 | 1 | 7 |
| `examples/11-social-hub` | 125d | 0 | 1 | 7 |
| `examples/12-multi-user-ar` | 125d | 0 | 1 | 3 |
| `examples/compilation-demo` | 125d | 0 | 4 | 2 |
| `examples/compiled-outputs` | 125d | 0 | 56 | 8 |
| `examples/hybrid-dashboard` | 125d | 0 | 5 | 3 |
| `packages/adapters/shared` | 121d | 0 | 5 | 0 |
| `packages/platform/evaluation` | 115d | 0 | 20 | 0 |
| `packages/platform/frontend` | 110d | 0 | 201 | 1 |
| `packages/platform/generation` | 115d | 0 | 10 | 0 |
| `packages/platform/holofilter` | 125d | 0 | 8 | 2 |
| `packages/platform/lifecycle` | 115d | 0 | 4 | 0 |
| `packages/platform/tools` | 106d | 0 | 8 | 0 |

These candidates were archived to Jetson at
`/mnt/nvme/archives/hololand/2026-06-29-reboot` with original path, pre-removal
commit, checksum, and restore commands recorded in the machine manifest.

## Validation

- `node scripts/__tests__/hololand-stale-surface-inventory.test.mjs`
- `node --check scripts/hololand-stale-surface-inventory.mjs`
- `node --check scripts/__tests__/hololand-stale-surface-inventory.test.mjs`
- `node scripts/hololand-stale-surface-inventory.mjs --summary`
- `git diff --check -- scripts/hololand-stale-surface-inventory.mjs scripts/__tests__/hololand-stale-surface-inventory.test.mjs package.json`
