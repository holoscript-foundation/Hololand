# HoloLand Ecosystem Seed Promotion - 2026-06-30

Status: promoted to HoloScript source. The archived ecosystem pitch is not
revived as a Ready Player One clone, speculative land economy, or direct
TypeScript implementation.

## Seed

- Seed:
  `idea-seeds/archive-farm/2026-05-12_archive_hololand-ecosystem-building-the-future-today.md`
- Source archive:
  `docs/archive/ECOSYSTEM_AND_VISION.md`
- Promoted source:
  `apps/holoshell/source/hololand-frontier-ecosystem-loop.hsplus`

## Decision

The useful current claim is the ecosystem loop underneath the archived Three
Plains idea: HoloLand should connect a playable Frontier world, Twin Universe
places, creator/business utility, human-service agents, and autonomy rewards.

The current representation is a HoloScript-native contract with policies for:

- preserving the Three Plains concept as product memory, not old positioning,
- requiring source and place receipts before projection,
- keeping property/place authority opt-in and human-readable,
- rejecting speculative land/NFT gates and pay-to-win advantage,
- letting successful approvals, deploys, services, actions, and tool runs
  become learning signals without bypassing receipt gates.

## Validation

```powershell
node C:\Users\josep\Documents\GitHub\HoloScript\packages\cli\dist\cli.js parse C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\hololand-frontier-ecosystem-loop.hsplus
node scripts\holoshell-source-validation.mjs --source-dir apps\holoshell\source --fail-fast --overall-timeout-ms 180000
node C:\Users\josep\.ai-ecosystem\scripts\index-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand
node C:\Users\josep\.ai-ecosystem\scripts\index-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand --check
node C:\Users\josep\.ai-ecosystem\scripts\triage-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand
node C:\Users\josep\.ai-ecosystem\scripts\triage-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand --check
git diff --check -- apps/holoshell/source/hololand-frontier-ecosystem-loop.hsplus docs/audits/HOLOLAND_ECOSYSTEM_SEED_PROMOTION_2026-06-30.md idea-seeds/archive-farm/2026-05-12_archive_hololand-ecosystem-building-the-future-today.md idea-seeds/INDEX.md idea-seeds/TRIAGE.md
```

Result: pass.

## Next

Future build work should produce a browser or HoloShell receipt showing one
Frontier place flowing into a Twin Universe place utility action, then record
the approval/action receipt as a learning signal for bounded autonomy.
