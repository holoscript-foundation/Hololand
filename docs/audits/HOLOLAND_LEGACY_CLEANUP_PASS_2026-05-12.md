# HoloLand Legacy Cleanup Pass -- 2026-05-12

## Purpose

HoloLand is not old code to delete wholesale. It is the MMO/product layer for
HoloScript, now clarified as a premium-scale programmable frontier with Twin
Universe as a playable layer across browser, desktop, mobile, VR, and AR apps.

> Vocabulary note (2026-06-29): Twin Universe is the canonical HoloLand product
> vocabulary. This cleanup pass now uses Twin Universe for current prose; older
> commit history may still contain Twin Earth as legacy terminology.

Legacy cleanup means separating five things:

1. Generated/local artifacts that should not be tracked.
2. Old product slices that should become Frontier Shard or Twin Universe proofs.
3. TypeScript-only feature behavior that needs HoloScript source or bridge rationale.
4. Stale docs/examples that describe obsolete development posture.
5. Product-critical systems that look old but must be protected until replaced.

## Cleanup Completed In This Pass

- Rewrote `.gitignore` as clean ASCII.
- Removed 203 embedded NUL bytes from `.gitignore`.
- Added ignore coverage for `target/`, `.tgz`, `examples/compiled-outputs/`,
  model/training artifacts, private overlays, caches, and Windows `nul`.

## Still Verified Live

| Finding | Current count | Cleanup disposition |
|---|---:|---|
| Tracked Tauri target output | 2,675 files | Remove from git index; keep local files ignored. |
| Tracked compiled outputs | 286 files | **Generated artifacts** — untracked 2026-05-12. Regenerate via `node scripts/compile-all-zones.js`. No snapshot tests found; all files are demonstration placeholders. |
| Tracked package-lock files in pnpm repo | 3 | Remove or justify isolated npm packages. |
| Tracked root `.tgz` release artifact | 1 | Move to release storage or regenerate on demand. |
| Root markdown docs | 41 | Tier: keep small root surface, move status/history to `docs/archive`. |
| Example directories | 27 | Classify against Frontier MMO / Twin Universe / bridge / archive. |

## Cleanup Order

1. Remove generated artifacts from git index after confirming no release flow depends
   on checked-in outputs.
2. Classify examples against the current north star:
   - keep and harden: `hololand-central`, `fresh`, `demos`, `headless`,
     `14-holoscript-survival-benchmark`, and any Twin Universe/geospatial proof.
   - migrate or archive: numbered legacy examples that are pure HTML/TS with no
     HoloScript source and no current product role.
3. Build a package status table: product, bridge, upstream-candidate, generated,
   archive, private overlay.
4. Convert or justify TypeScript-only feature-domain packages.
5. Tier root docs and archive old status reports that conflict with the MMO/Twin
   Universe product direction.

## Guardrail

Do not delete old-looking HoloLand work just because it predates the current
framing. The right test is:

```text
Does this help prove the programmable frontier MMO, Twin Universe layer, HoloScript
source contract, browser/app delivery, agent stewardship, or hardware truth?
```

If yes, migrate and harden it. If no, archive or remove it with a receipt.
