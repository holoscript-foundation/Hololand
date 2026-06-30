# HoloLand Experiment Archive Plan - 2026-06-30

Status: plan only. No file was moved to Jetson, deleted, or hidden by this receipt.

Generated from commit `778f190cff450cfac46b5761980e0cbd35e01c11`.

Proposed Jetson root:

```text
/mnt/nvme/archives/hololand/2026-06-30-experiment-intake
```

Machine manifest: [hololand-experiment-archive-plan-2026-06-30.json](hololand-experiment-archive-plan-2026-06-30.json)

## Summary

| Metric | Value |
| --- | ---: |
| Candidate files | 24 |
| Tracked files | 2 |
| Untracked files | 22 |
| Aggregate SHA256 | `6af17fe9cbbe1127df33197111c0e810c7786d842567a1dc0ad2134f09d57de9` |

## Reasons

| Reason | Files |
| --- | ---: |
| `duplicate-policy-promoted` | 1 |
| `promoted` | 4 |
| `promoted-drift-superseded` | 10 |
| `promoted-path-canonicalized` | 5 |
| `receipt-field-merged` | 1 |
| `superseded-by-asset-shard-2` | 3 |

## Removal Conditions

Removal is still blocked until:

- app-source replacement exists for each promoted workflow,
- asset-shard-2 has a visual witness receipt before archiving asset-folder-playable-shard v1,
- the Jetson tarball upload is verified by remote byte count and `sha256sum`,
- tracked experiment files are removed only in a separate explicit commit after archive receipt.

## Candidate Files

| Source path | Status | Reason | SHA256 prefix |
| --- | --- | --- | --- |
| `experiments/holoshell-human-os-frontier/browser-account-export-pipeline.hs` | tracked | `promoted-drift-superseded` | `a58c6399b479` |
| `experiments/holoshell-human-os-frontier/browser-account-export-policy.hsplus` | tracked | `promoted-drift-superseded` | `27722440a7ff` |
| `experiments/holoshell-human-os-frontier/browser-account-export-room.holo` | untracked | `promoted-drift-superseded` | `6ca74793ac62` |
| `experiments/holoshell-human-os-frontier/cloud-drive-permission-cleanup-pipeline.hs` | untracked | `promoted-drift-superseded` | `c0789a8e76e5` |
| `experiments/holoshell-human-os-frontier/cloud-drive-permission-cleanup-policy.hsplus` | untracked | `promoted-drift-superseded` | `7867030aa3ca` |
| `experiments/holoshell-human-os-frontier/cloud-drive-permission-cleanup-room.holo` | untracked | `promoted-drift-superseded` | `861f42861053` |
| `experiments/holoshell-human-os-frontier/downloads-import-shelf-pipeline.hs` | untracked | `promoted-drift-superseded` | `b9d738c5100a` |
| `experiments/holoshell-human-os-frontier/downloads-import-shelf-policy.hsplus` | untracked | `duplicate-policy-promoted` | `e87c2a4c19de` |
| `experiments/holoshell-human-os-frontier/downloads-import-shelf-room.holo` | untracked | `promoted-drift-superseded` | `90421cae9d67` |
| `experiments/holoshell-human-os-frontier/family-photo-backup-custody-pipeline.hs` | untracked | `promoted-drift-superseded` | `07074b8f4097` |
| `experiments/holoshell-human-os-frontier/family-photo-backup-custody-policy.hsplus` | untracked | `receipt-field-merged` | `3247ca884404` |
| `experiments/holoshell-human-os-frontier/family-photo-backup-custody-room.holo` | untracked | `promoted-drift-superseded` | `a97ea0a51393` |
| `experiments/holoshell-human-os-frontier/asset-shard-2-pipeline.hs` | untracked | `promoted-path-canonicalized` | `b89837c6a5df` |
| `experiments/holoshell-human-os-frontier/asset-shard-2-policy.hsplus` | untracked | `promoted` | `967ccdcf08e9` |
| `experiments/holoshell-human-os-frontier/asset-shard-2-room.holo` | untracked | `promoted` | `8463df8487e7` |
| `experiments/holoshell-human-os-frontier/asset-folder-playable-shard-pipeline.hs` | untracked | `superseded-by-asset-shard-2` | `c30b8a570f12` |
| `experiments/holoshell-human-os-frontier/asset-folder-playable-shard-policy.hsplus` | untracked | `superseded-by-asset-shard-2` | `89b87d45f17e` |
| `experiments/holoshell-human-os-frontier/asset-folder-playable-shard-room.holo` | untracked | `superseded-by-asset-shard-2` | `a2c8f340cf86` |
| `experiments/holoshell-human-os-frontier/local-codebase-trust-gate-pipeline.hs` | untracked | `promoted-path-canonicalized` | `51d8bb9263ac` |
| `experiments/holoshell-human-os-frontier/local-codebase-trust-gate-policy.hsplus` | untracked | `promoted-path-canonicalized` | `46c9a97788da` |
| `experiments/holoshell-human-os-frontier/local-codebase-trust-gate-room.holo` | untracked | `promoted-path-canonicalized` | `f7793cbad107` |
| `experiments/holoshell-human-os-frontier/partial-download-recovery-pipeline.hs` | untracked | `promoted-path-canonicalized` | `b8dffa6d0e01` |
| `experiments/holoshell-human-os-frontier/partial-download-recovery-policy.hsplus` | untracked | `promoted` | `f8d5b259ce3f` |
| `experiments/holoshell-human-os-frontier/partial-download-recovery-room.holo` | untracked | `promoted` | `85ff934c07e4` |
