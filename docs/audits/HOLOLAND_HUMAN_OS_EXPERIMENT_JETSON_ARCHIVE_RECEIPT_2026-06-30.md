# HoloLand Human OS Experiment Jetson Archive Receipt - 2026-06-30

Status: shipped archive receipt. No repo path was deleted, moved, hidden, or
ignored by this task.

## Archive

- Archive plan:
  `docs/audits/hololand-experiment-archive-plan-2026-06-30.json`
- Jetson directory:
  `/mnt/nvme/archives/hololand/2026-06-30-experiment-intake`
- Machine receipt:
  `docs/audits/hololand-human-os-experiment-jetson-archive-2026-06-30.json`
- Execution base commit:
  `6b96344e231881acf7d6de7d1865799716f65fb5`

| Artifact | Remote path | Bytes | SHA256 |
| --- | --- | ---: | --- |
| Human OS experiment tarball | `/mnt/nvme/archives/hololand/2026-06-30-experiment-intake/hololand-human-os-frontier-experiments-778f190cff45.tar.gz` | 28173 | `cd7c0f1e26162d0ccf49875d9695225f4c8f167222d0d5c3ee491921c098d6c5` |
| Archive manifest | `/mnt/nvme/archives/hololand/2026-06-30-experiment-intake/hololand-experiment-archive-plan-2026-06-30.json` | 20072 | `f398f435bc2e2320981447d4f9cb0e8ef2d595fefe840123cd569a3055872deb` |

Both artifacts were uploaded to Jetson and verified by remote byte count and
remote `sha256sum` at `2026-06-30T00:29:10-07:00`.

## Archived Inputs

The tarball contains the 24 paths listed in the archive plan, including the
superseded `asset-folder-playable-shard` trio and promoted-drift Human OS
frontier experiment variants. The local source files remain visible in the
worktree.

## Jetson Storage

Remote storage check after upload:

```text
/dev/nvme0n1p1 983349346304 87196356608 846126059520 10% /mnt/nvme
```

## Restore

Use the machine receipt for the exact path list. To restore from Jetson:

```powershell
scp username@holojetson.local:/mnt/nvme/archives/hololand/2026-06-30-experiment-intake/hololand-human-os-frontier-experiments-778f190cff45.tar.gz .tmp/hololand/restore/hololand-human-os-frontier-experiments-778f190cff45.tar.gz
tar -xzf .tmp/hololand/restore/hololand-human-os-frontier-experiments-778f190cff45.tar.gz -C C:\Users\josep\Documents\GitHub\Hololand
```

Per-file restore commands remain in
`docs/audits/hololand-experiment-archive-plan-2026-06-30.json`.

## Boundary

This receipt only proves remote custody. Tracked removals, ignore rules, or
active-source retirement still require a separate explicit approval and commit.
