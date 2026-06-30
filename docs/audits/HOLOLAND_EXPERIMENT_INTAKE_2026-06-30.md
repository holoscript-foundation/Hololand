# HoloLand Experiment Intake - 2026-06-30

Status: read-only classification. No archive, delete, move, or ignore rule was
executed.

Resolution follow-up:
[`HOLOLAND_EXPERIMENT_RESOLUTION_2026-06-30.md`](HOLOLAND_EXPERIMENT_RESOLUTION_2026-06-30.md)
records the diff decisions, experiment validation receipt, and promotion/archive
boundaries for this intake.

Command:

```powershell
node scripts/hololand-experiment-intake.mjs --summary
```

## Summary

The Human OS frontier experiment folder currently contains 12 workflow groups
and 36 HoloScript-family source files.

| Status | Count | Meaning |
| --- | ---: | --- |
| `promoted-drift` | 4 | Exact promoted app source exists under `apps/holoshell/source/**`, but content hashes differ; diff/merge before archive. |
| `promote-or-archive` | 4 | Full untracked trio with no exact promoted source; read and validate before promotion or Jetson archive. |
| `tracked-intake` | 4 | Full tracked trio still visible in `experiments/**`; keep visible until it is promoted, boarded, or intentionally archived. |
| `utility-watch` | 2 | Tracked helper scripts that should move or archive with their parent workflow receipt. |

Tracked source files: 14.

Untracked source files: 22.

## Promoted Drift

These workflows already have exact room/policy/pipeline promoted paths in
`apps/holoshell/source/**`, but the experiment files are not byte-identical to
the promoted app source:

| Workflow | Experiment state | Promoted app source |
| --- | --- | --- |
| `browser-account-export` | pipeline tracked, policy tracked, room untracked | `holoshell-browser-account-export-*` |
| `cloud-drive-permission-cleanup` | full trio untracked | `holoshell-cloud-drive-permission-cleanup-*` |
| `downloads-import-shelf` | full trio untracked | `holoshell-downloads-import-shelf-*` |
| `family-photo-backup-custody` | full trio untracked | `holoshell-family-photo-backup-custody-*` |

Hash drift observed by the gate:

- `browser-account-export`: room, policy, and pipeline differ.
- `cloud-drive-permission-cleanup`: room, policy, and pipeline differ.
- `downloads-import-shelf`: room and pipeline differ; policy matches.
- `family-photo-backup-custody`: room, policy, and pipeline differ.

Recommended next action: diff these experiment variants against promoted app
source, merge any useful HoloScript semantics into `apps/holoshell/source/**`,
then archive only superseded experiment variants to the Jetson reboot archive
with a manifest. Do not delete tracked experiment files until the archive
receipt and source replacement are explicit.

## Promote Or Archive

These workflows are full untracked HoloScript-family trios with no exact
promoted app-source match:

| Workflow | Files | Recommended first action |
| --- | --- | --- |
| `asset-folder-playable-shard` | room, policy, pipeline | Read and validate as possible Frontier Shard / asset import gate. |
| `asset-shard-2` | room, policy, pipeline | Compare against `holoshell-asset-shard-workflow.hsplus`; promote only if it adds missing gate coverage. |
| `local-codebase-trust-gate` | room, policy, pipeline | Read against `holoshell-world-build-cockpit.holo` reference before promotion. |
| `partial-download-recovery` | room, policy, pipeline | Compare against `holoshell-downloads-recovery-dock-*`; promote if the recovery semantics are distinct. |

Recommended next action: read each trio, run HoloScript validation where the
available tool surface supports it, then decide `promote`, `duplicate archive`,
or `board follow-up`.

## Tracked Intake

These workflows remain tracked experiment source:

- `account-task-custody`
- `install-update-tool`
- `slow-computer-clinic`
- `target-device-proof`

Recommended next action: keep visible while HoloShell source and enterprise gate
coverage is reconciled. Do not hide them with ignore rules.

## Utility Watch

Tracked helper scripts:

- `slow-computer-clinic-guarded-stop-dry-run`
- `slow-computer-clinic-remediation-fixture`

Recommended next action: move or archive only with the parent
`slow-computer-clinic` workflow receipt.

## Boundary

This receipt is classification only. The reboot plan still requires explicit
approval before:

- moving anything to Jetson,
- deleting repo paths,
- removing tracked package-lock files,
- archiving `.proprietary/**`,
- retiring any path with active deployment evidence,
- retiring any path needed by the current render/run proof.
