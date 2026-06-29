# HoloLand Age Prune Scan

Date: 2026-06-29
Mode: read-only scan plus canonicality rule update. No files were deleted,
moved, archived, or unstaged.

## Rule Applied

Founder direction: HoloLand work older than 30-60 days is likely old and not
needed in canonical active source.

Operational rule now recorded in `NORTH_STAR.md`: older than 30 days is suspect;
older than 60 days is archive-by-default unless the work has current evidence
that it supports the builder-proof loop, a current deployment, the HoloScript
source contract, or the Frontier Shard product north-star.

## Evidence

Scratch report:

```text
.tmp/hololand-age-prune/report.json
```

Scan exclusions:

- `.git`
- `node_modules`
- `.next`, `dist`, `build`, `coverage`
- `target`
- virtualenv/cache/package-store folders

The scan separated Git-age for tracked source from filesystem-age for
untracked/ignored artifacts.

## Counts

- Relevant scanned files: 5,517
- Tracked files in scope: 2,853
- Untracked files in scope: 2,664
- 30-day suspects: 4,423
- 60-day archive-by-default candidates: 2,237

## Biggest Action

The largest reclaim is not tracked duplicate source. It is old local model
artifacts sitting in the HoloLand working tree:

- `models/brittney-qwen-v43-q8_0.gguf`
  - about 7.5 GiB
  - modified 2026-02-27
  - referenced by `scripts/start-brittney.ts` and `test-brittney-v43.mjs`
- `.proprietary/models/brittney-v1-expert.gguf`
  - about 1.5 GiB
  - modified 2026-01-25
  - release/download paths are documented in Brittney model registry/docs

Proposed action: `move-to-artifact-lane`

Keep manifests and download/bootstrap references in HoloLand. Move actual GGUF
weights to the stable artifact lane and make runtime startup resolve them from a
declared artifact location instead of assuming canonical source checkout
storage.

## Source Cleanup Buckets

### Archive Unless Current Deployment Or Frontier Shard

60-day candidates:

- `examples/**`: 457 files, about 16.3 MiB

Notable examples:

- `examples/hololand-central/public/assets/models/Brian_*.glb`
- `examples/hololand-legends/public/assets/sprites/*.png`
- `examples/oasis/src-tauri/gen/schemas/*.json`
- `examples/hololand-central/VRR_X402_QUEST_ENDPOINT.md`

These may still support an existing deployment, so do not delete blindly. If
they are not deployed or part of Frontier Shard 0, move them into an archive or
retirement plan.

### Archive Unless Builder-Proof Or Deployed

60-day candidates:

- `packages/platform/**`: 989 files, about 11.7 MiB
- `packages/ar/**`: 141 files, about 1.3 MiB
- `packages/adapters/**`: 102 files, about 1.0 MiB
- `packages/creation-tools/**`: 17 files, about 0.1 MiB

These match the current repo rule: legacy R3F, AR, platform, adapter, and
package-garden code is debt unless it directly supports the active agent
builder proof or a still-running deployment.

### Intake, Then Promote Or Archive

Current visible experiments are not trash; they are intake candidates:

- `experiments/holoshell-human-os-frontier/*`
- `experiments/emergence-sim/`

They should be read and either promoted into the builder-proof path or archived
with a receipt.

### Keep With Evidence

Keep old docs or proof-loop code when they are current authority or direct proof
infrastructure:

- `NORTH_STAR.md`
- `AGENTS.md`
- `docs/AGENT_HOLOSCRIPT_TOOLING.md`
- `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
- `apps/holoshell/**` when it supports the proof loop
- `scripts/check-native*` and builder-proof receipts/harnesses

## Non-Actions

- No model files were moved.
- No examples were archived.
- No packages were deleted.
- No dirty peer work was changed.
- No package graph was cleaned for its own sake.
