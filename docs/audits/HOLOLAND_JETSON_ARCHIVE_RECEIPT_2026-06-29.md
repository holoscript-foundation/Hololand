# HoloLand Jetson Archive Receipt - 2026-06-29

Status: shipped archive and active-source retirement for the first 17
`jetson-archive-candidate` stale surfaces from the 2026-06-29 reboot scan.

## Archive

- Pre-removal commit:
  `3542e685d0ef271026839814eab85711031dd566`
- Jetson directory:
  `/mnt/nvme/archives/hololand/2026-06-29-reboot`
- Machine receipt:
  `docs/audits/hololand-jetson-archive-2026-06-29-reboot.json`

| Kind | Remote artifact | Bytes | SHA256 |
| --- | --- | ---: | --- |
| tracked source | `hololand-stale-surfaces-3542e685d0ef.tracked.tar.gz` | 631038 | `5eb2789940b6bb804fb5cd726612cb57757a59b131db125bb6163103ee833aa5` |
| local generated output | `hololand-stale-surfaces-3542e685d0ef.local.tar.gz` | 46889 | `ae2aaca7cff616f2bdf41335127681099437e0b83692c1110d04d62e2626ad3a` |

Both artifacts were uploaded to Jetson and verified by remote byte count and
remote `sha256sum` before source removal.

## Retired Paths

- `examples/05-desktop-app`
- `examples/06-mobile-app`
- `examples/08-progressive-vr`
- `examples/09-multiplayer-lobby`
- `examples/10-collaborative-building`
- `examples/11-social-hub`
- `examples/12-multi-user-ar`
- `examples/compilation-demo`
- `examples/compiled-outputs`
- `examples/hybrid-dashboard`
- `packages/adapters/shared`
- `packages/platform/evaluation`
- `packages/platform/frontend`
- `packages/platform/generation`
- `packages/platform/holofilter`
- `packages/platform/lifecycle`
- `packages/platform/tools`

## Restore

Use the machine receipt for exact restore commands. The tracked-source paths can
also be restored from the pre-removal commit with:

```powershell
git checkout 3542e685d0ef271026839814eab85711031dd566 -- examples/05-desktop-app examples/06-mobile-app examples/08-progressive-vr examples/09-multiplayer-lobby examples/10-collaborative-building examples/11-social-hub examples/12-multi-user-ar examples/compilation-demo examples/hybrid-dashboard packages/adapters/shared packages/platform/evaluation packages/platform/frontend packages/platform/generation packages/platform/holofilter packages/platform/lifecycle packages/platform/tools
```

`examples/compiled-outputs` was local-only generated output and restores from
the local artifact tarball listed above.
