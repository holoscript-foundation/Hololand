# HoloLand Experiment Resolution - 2026-06-30

Status: resolution receipt for the Human OS frontier experiment intake. No
archive, delete, move, or ignore rule was executed.

Validation receipt:

```powershell
node scripts\holoshell-source-validation.mjs --source-dir experiments\holoshell-human-os-frontier --output .tmp\holoshell\experiment-source-validation.json --js-output .tmp\holoshell\experiment-source-validation.js --compile-output-dir .tmp\holoshell\experiment-source-validation-compiled --overall-timeout-ms 180000 --timeout-ms 30000
```

Result: pass. The validator accepted 36 of 36 HoloScript-family source files in
the experiment folder: 12 `.holo`, 12 `.hs`, and 12 `.hsplus` files.

Touched app source validation:

```powershell
node C:\Users\josep\Documents\GitHub\HoloScript\packages\cli\dist\cli.js parse C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-family-photo-backup-custody-policy.hsplus
```

Result: pass.

## Promoted Drift Resolution

| Workflow | Decision | Follow-up |
| --- | --- | --- |
| `browser-account-export` | Keep promoted app source canonical. The app source is richer: product dock naming, provider wait state, import dock, user promise/substrate boundary, and preview-only import metadata. | Archive the experiment variant after checksum manifest; do not merge backward. |
| `cloud-drive-permission-cleanup` | Keep promoted app source canonical. The app source has creator-import permission cleanup semantics: provider map, scope diff, revoke queue, archive dock, and HoloLand preview import. | Archive the experiment variant after checksum manifest; do not merge backward. |
| `downloads-import-shelf` | Keep promoted app source canonical. The policy is byte-identical; room naming and pipeline evidence paths moved forward in app source. | Archive the experiment variant after checksum manifest. |
| `family-photo-backup-custody` | Keep promoted app source canonical, with one receipt-field restoration from the experiment policy. | Restored `targetKind` on the `holoshell:photo_backup:verified` event so target provenance survives verification receipts. After restoration, the intake gate no longer reports policy hash drift for this workflow; only room and pipeline remain drifted. Archive the experiment variant after validation. |

## Promote Or Archive Resolution

| Workflow | Decision | Follow-up |
| --- | --- | --- |
| `asset-shard-2` | Promoted as the canonical creator asset-shard v2 gate. It adds conversion bench, validation ring, replay/rollback rail, visual witness token, and explicit agent lane containment. | App-source trio promoted under `apps/holoshell/source/holoshell-asset-shard-2-*` with enterprise gate coverage in `apps/holoshell/enterprise-gates/creator-asset-shard-room/package-gate.json`. Archive experiment copies only after visual witness and checksum receipts. |
| `asset-folder-playable-shard` | Superseded by `asset-shard-2`. The v1 trio remains valid source but lacks the visual witness and replay/rollback coverage. | Archive only after `asset-shard-2` is promoted and has a gate receipt. |
| `local-codebase-trust-gate` | Promoted as the world-build cockpit local codebase trust subgate. It matches the cockpit's existing metadata reference and protects codebase truth before world-build readiness. | App-source trio promoted under `apps/holoshell/source/holoshell-local-codebase-trust-gate-*`; archive experiment copies only after checksum receipt. |
| `partial-download-recovery` | Promoted as a downloads recovery subgate. It is distinct from the broader downloads recovery dock because it models file locks, range hashes, retry plans, discard receipts, and replay from root/partial/final hashes. | App-source trio promoted under `apps/holoshell/source/holoshell-partial-download-recovery-*`; archive experiment copies only after checksum receipt. |

After `asset-shard-2`, `local-codebase-trust-gate`, and
`partial-download-recovery` promotion, the intake classifier reports those
workflows as `promoted-drift` only because the canonical promoted copies rewrite
source pointers from `experiments/holoshell-human-os-frontier/**` to
`apps/holoshell/source/**`. Treat that as intentional path canonicalization, not
semantic drift.

## Package Boundary Decision

Do not promote all HoloScript packages into HoloLand by default. HoloLand package
usage should be demand-shaped by enterprise gates and builder proofs:

- Always depend on the HoloScript packages needed to render, validate, compile,
  and run canonical HoloLand source.
- Add HoloScript packages when an enterprise gate or benchmark names them.
- Keep visual remix defaults in HoloScript first so agents and users can build
  HoloLand-like projects from scratch.
- Let HoloLand layer visual sandwiching, room assembly, business workflows, and
  enterprise receipts on top of HoloScript's language/runtime/plugin substrate.

## Archive Boundary

The archive set is decision-ready, not deletion-ready. The plan-only manifest is:

- [`HOLOLAND_EXPERIMENT_ARCHIVE_PLAN_2026-06-30.md`](HOLOLAND_EXPERIMENT_ARCHIVE_PLAN_2026-06-30.md)
- [`hololand-experiment-archive-plan-2026-06-30.json`](hololand-experiment-archive-plan-2026-06-30.json)

Before moving files to Jetson or deleting repo paths, verify the manifest hashes
and create the remote tarball receipt for:

- superseded promoted-drift experiment variants,
- `asset-folder-playable-shard` after v2 visual witness receipt,
- any tracked utility files only with their parent workflow receipt.

No broad ignore rule should hide `experiments/**`; visible source-like work is a
gate queue, not trash.
