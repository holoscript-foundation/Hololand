# HoloShell Family Photo Backup Custody

HoloShell wraps a normal photo-backup job as a visible, deterministic source surface:

- Source room: `apps/holoshell/source/holoshell-family-photo-backup-custody-room.holo`
- Policy: `apps/holoshell/source/holoshell-family-photo-backup-custody-policy.hsplus`
- Pipeline: `apps/holoshell/source/holoshell-family-photo-backup-custody-pipeline.hs`
- Local adapter: `scripts/holoshell-photo-backup-custody.mjs`

The adapter is intentionally read-only. It scans a local album root, classifies media, hashes readable files, groups exact duplicates, emits a redacted public custody receipt, and writes private absolute-path evidence to `.tmp/holoshell/photo-backup-receipts/`.

Public receipts must not include absolute paths, raw pixels, GPS coordinates, face labels, provider tokens, or account identifiers. They record album labels, counts, hashes, duplicate groups, selected privacy state, target-plan state, replay inputs, and the active delete blocker.

Original deletion is never allowed by this workflow. Even after a future copy and sample restore pass, deletion needs a separate break-glass approval and cooling-off receipt.

Run the adapter self-test:

```powershell
node scripts/holoshell-photo-backup-custody.mjs --self-test --json
```

Run the focused test:

```powershell
node scripts/__tests__/holoshell-photo-backup-custody.test.mjs
```
