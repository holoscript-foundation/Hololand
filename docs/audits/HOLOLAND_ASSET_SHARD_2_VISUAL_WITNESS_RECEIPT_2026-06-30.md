# HoloLand Asset-Shard-2 Visual Witness Receipt - 2026-06-30

Status: pass. No file was moved, deleted, hidden, or archived by
this receipt.

## Purpose

This receipt refreshes the visual witness for the promoted
`asset-shard-2` creator gate and records whether the superseded
`asset-folder-playable-shard` v1 trio can advance to Jetson archive candidate
status.

## Result

| Field | Value |
| --- | --- |
| Enterprise gate | `creator-asset-shard-room` |
| Visual witness | pass |
| Playable shard witness | pass |
| Source assets mutated | false |
| Archive decision | `candidate_ready_for_jetson_archive_receipt` |
| Deletion allowed | false |
| Transfer executed | false |

## Promoted App Source

| Source | Exists | SHA256 prefix |
| --- | --- | --- |
| `apps/holoshell/source/holoshell-asset-shard-2-room.holo` | yes | `8463df8487e7` |
| `apps/holoshell/source/holoshell-asset-shard-2-policy.hsplus` | yes | `967ccdcf08e9` |
| `apps/holoshell/source/holoshell-asset-shard-2-pipeline.hs` | yes | `c363b8dd13bc` |

## Witness Evidence

- Visual witness receipt: `.tmp/holoshell/self-test/imported-shard-visual-witness.json`
- Playable shard witness receipt: `.tmp/holoshell/self-test/playable-shard-witness.json`
- Visual screenshot SHA256: `ce18159cb363756ae34dd1066ba420ab6492510779820ee16137593aa8ca12dc`
- Visual DOM SHA256: `094485f2593cb6dfa35972916c9c62f1ef010df437a6d11b7d2927681a0cdc23`
- Playable screenshot SHA256: `ce18159cb363756ae34dd1066ba420ab6492510779820ee16137593aa8ca12dc`
- Playable DOM SHA256: `094485f2593cb6dfa35972916c9c62f1ef010df437a6d11b7d2927681a0cdc23`

## Superseded V1 Sources

These files remain present. They are only cleared for the next Jetson archive
receipt, not for deletion.

| Source | Exists | SHA256 prefix |
| --- | --- | --- |
| `experiments/holoshell-human-os-frontier/asset-folder-playable-shard-room.holo` | yes | `a2c8f340cf86` |
| `experiments/holoshell-human-os-frontier/asset-folder-playable-shard-policy.hsplus` | yes | `89b87d45f17e` |
| `experiments/holoshell-human-os-frontier/asset-folder-playable-shard-pipeline.hs` | yes | `c30b8a570f12` |

## Checks

| Check | Status | Target |
| --- | --- | --- |
| `creator-gate-manifest` | pass | Creator asset-shard enterprise gate manifest is loaded. |
| `promoted-app-source-trio` | pass | Creator gate names the promoted asset-shard-2 app-source trio and each file is present. |
| `visual-witness-receipt` | pass | Imported shard visual witness renders in a local browser with screenshot and DOM evidence. |
| `playable-shard-witness` | pass | PlayableShardWitnessReceipt is present and source assets remain read-only. |
| `asset-folder-v1-archive-plan` | pass | Superseded asset-folder-playable-shard v1 trio is visible and listed as superseded in the Jetson archive plan. |

## Next Gate

task_1782803168047_djor must create and verify the Jetson archive tarball/manifest before any removal commit.
