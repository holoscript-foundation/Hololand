# HoloLand Jetson AR Archive Receipt - 2026-06-29

Status: shipped archive and active-source retirement for the final two
`jetson-archive-candidate` AR surfaces exposed after the first HoloLand reboot
archive batch.

## Archive

- Pre-removal commit:
  `7de0cda1554f36196132e45abc9e4985b920e420`
- Jetson directory:
  `/mnt/nvme/archives/hololand/2026-06-29-reboot`
- Machine receipt:
  `docs/audits/hololand-jetson-archive-2026-06-29-ar.json`

| Kind | Remote artifact | Bytes | SHA256 |
| --- | --- | ---: | --- |
| tracked source | `hololand-stale-surfaces-7de0cda1554f.tracked.tar.gz` | 26907 | `f606b49e6505981ee84223449afd0b3e7afbe96265a37f30ef8063de23056fde` |

The artifact was uploaded to Jetson and verified by remote byte count and remote
`sha256sum` before source removal.

## Retired Paths

- `packages/ar/detection`
- `packages/ar/embeddings`

## Restore

Use the machine receipt for exact restore commands. The tracked-source paths can
also be restored from the pre-removal commit with:

```powershell
git checkout 7de0cda1554f36196132e45abc9e4985b920e420 -- packages/ar/detection packages/ar/embeddings
```
