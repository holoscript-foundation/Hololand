# HoloLand Microsoft Mesh Migration Seed Merge - 2026-06-30

Status: merged into existing product strategy. The archived Microsoft Mesh and
HoloLens 2 migration guide remains useful as historical enterprise pressure, not
as a current HoloLand implementation plan.

## Seed

- Seed:
  `idea-seeds/archive-farm/2026-05-12_archive_microsoft-mesh-hololens-2-migration-guide.md`
- Source archive:
  `docs/archive/MICROSOFT_MESH_MIGRATION_GUIDE.md`
- Outcome:
  `merge-into-existing`

## Freshness Check

Verified on 2026-06-30 against Microsoft-owned sources:

- Mesh: `https://www.microsoft.com/en-us/microsoft-teams/immersive`
  records that Microsoft retired the Mesh web, PC, Quest, and Teams Immersive
  space surfaces on December 1, 2025 and replaced them with immersive events in
  Teams.
- Dynamics 365 Guides and Remote Assist:
  `https://learn.microsoft.com/en-us/lifecycle/announcements/dynamics-365-guides-remote-assist-end-of-support`
  records end of support on December 31, 2026, after which security updates,
  bug fixes, and technical support stop.
- HoloLens 2:
  `https://learn.microsoft.com/en-us/answers/questions/2151213/microsoft-stops-hololens-2-production-support-to-e`
  records critical/security fix support through December 2027 and
  customer/developer support through December 31, 2027.

## Decision

The seed should merge into existing HoloLand direction, not become a revived
standalone migration package.

Preserve:

- enterprise spatial-collaboration migration pressure,
- the need for source-authored collaboration room schemas,
- identity, audit, and runtime receipts for enterprise migration claims,
- hardware/runtime validation before claiming any replacement path.

Retire from current scope:

- treating the archived guide as a ready sales playbook,
- package-count, market-size, participant-count, or compilation-target claims
  without current receipts,
- HoloLens-specific product lock-in,
- rebuilding a TypeScript package garden to imitate Microsoft Mesh.

## Existing Merge Targets

- `docs/strategy/HOLOLAND_LIVING_COMPETITOR_GAP_MATRIX.md` already names
  Microsoft Mesh as an enterprise spatial-collaboration gap and points to
  collaboration room schemas plus identity/audit receipts.
- `docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md` supplies the current product
  frame: Frontier MMO, Twin Universe, creators, agents, and hardware truth.
- `docs/HOLOSCRIPT_SOURCE_CONTRACT.md` requires migration-room, AR, training,
  and enterprise collaboration behavior to be source-authored in HoloScript
  before HoloLand treats it as product behavior.
- `docs/GEOSPATIAL_ANCHORING.md` keeps the standards-based AR compatibility
  frame, including HoloLens as one legacy anchor system among WebXR, ARCore,
  and ARKit.

## Validation

```powershell
node C:\Users\josep\.ai-ecosystem\scripts\index-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand
node C:\Users\josep\.ai-ecosystem\scripts\triage-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand
node C:\Users\josep\.ai-ecosystem\scripts\index-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand --check
node C:\Users\josep\.ai-ecosystem\scripts\triage-idea-seeds.mjs --root C:\Users\josep\Documents\GitHub\Hololand --check
git diff --check -- docs/audits/HOLOLAND_MICROSOFT_MESH_MIGRATION_SEED_MERGE_2026-06-30.md idea-seeds/archive-farm/2026-05-12_archive_microsoft-mesh-hololens-2-migration-guide.md idea-seeds/INDEX.md idea-seeds/TRIAGE.md
```

Result: pass.

## Next

No new board task is required from this seed alone. Reopen only when a current
deployment or enterprise gate needs a concrete HoloScript-native migration
intake workflow, collaboration room, or hardware/runtime receipt.
