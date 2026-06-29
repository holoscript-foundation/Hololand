# Brittney Desktop Cockpit Receipt

**Date:** 2026-06-29
**Surface:** HoloShell / Brittney Studio desktop app
**Source:** `apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus`

## Shipped

- Added a HoloScript-owned compact cockpit capsule for runtime truth, route health, context carry, desktop bridge state, and receipt-backed tool cards.
- Exposed `GET /api/cockpit/capsule` and direct `GET /api/live-status` from `packages/holoshell/serve.mjs`.
- Rendered the capsule above the Brittney chat in `packages/holoshell/compile.mjs` while keeping desktop mutation behind the existing preflight -> consent-token -> receipt path.

## Verification

- `validate_holoscript` passed for `holoshell-brittney-desktop-cockpit.hsplus`.
- Local HoloScript CLI validation passed for the new `.hsplus` and changed `operate-room.holo`.
- `node scripts/__tests__/holoshell-brittney-cockpit.test.mjs`
- `node scripts/__tests__/holoshell-live-status.test.mjs`
- `node scripts/__tests__/holoshell-desktop-control-plan.test.mjs`
- Chrome render proof passed for desktop and mobile viewports; screenshots live in `.scratch/brittney-cockpit-browser-node`.

## Notes

- The hosted `.holo` validator refused the operate-room payload behind a capability-manifest gate: `denial_1782699195254_sf2q11`; local CLI validation covered the file.
- Full HoloShell source validation still trips on the existing pnpm dependency-materialization path before this new file is reached, so the shipped slice uses targeted HoloScript validation plus focused endpoint/browser tests.
