# Browser Terminal Coupling Receipt

**Source:** `apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus`
**Endpoint:** `GET /api/operator-terminal/session`
**Session Snapshot:** `GET/POST /api/browser-session/state?sessionId=:sessionId`
**Launcher:** `scripts/brittney-studio-launch.ps1`

## Shipped

- Added a HoloScript-owned browser/terminal coupling contract for one shared Brittney Studio session.
- Exposed a read-only operator-terminal session endpoint that reports terminal receipt status, hash, age, browser URL, and shared context fields without spawning or executing terminal commands.
- Added a Terminal lane to the Brittney cockpit capsule and browser UI.
- Updated the Brittney Studio launcher to open the browser cockpit plus a visible read-only operator terminal by default, with `-Headless` and `-NoTerminal` escape hatches.
- Added browser-terminal symbiosis metadata, presentable terminal run cards, and refresh-recovery state to `/api/operator-terminal/session`.
- Added a browser-side evidence ledger so Terminal lane proof rehydrates after refresh from local state plus `/api/cockpit/capsule` and `/api/operator-terminal/session`.
- Added a bounded server-side browser session snapshot so localStorage state can rehydrate after reload/cold browser starts before the default welcome state is shown.
- Added session-scoped browser snapshots and localStorage keys so simultaneous HoloClaw/Brittney/Terminal browser workspaces can persist independently.
- Kept optional orchestration lanes advisory in laptop receipt freshness so HoloClaw/Sovereign/Fara waiting states do not fail the endpoint freshness check.

## Boundary

- Browser is the primary conversation, context, and approval surface.
- Terminal is the execution/evidence projection.
- The endpoint does not execute terminal commands.
- The browser session snapshot endpoint only saves/restores bounded chat, draft, cockpit, runtime, and evidence state; optional `sessionId` scopes storage and does not execute terminal or desktop actions.
- Terminal mutations still require HoloGate identify -> scope -> preflight -> consent token -> execution receipt -> log.

## Validation

- `node --check packages/holoshell/serve.mjs`
- `node --check packages/holoshell/compile.mjs`
- `node --check scripts/__tests__/holoshell-browser-terminal-coupling.test.mjs`
- PowerShell parser check for `scripts/brittney-studio-launch.ps1`
- `node scripts/__tests__/holoshell-browser-terminal-coupling.test.mjs`
- `node scripts/__tests__/holoshell-brittney-cockpit.test.mjs`
- `node scripts/__tests__/holoshell-live-status.test.mjs`
- `node scripts/holoshell-operator-terminal.mjs --self-test`
- `node C:/Users/josep/Documents/GitHub/HoloScript/packages/cli/bin/holoscript.cjs validate apps/holoshell/source/holoshell-browser-terminal-coupling.hsplus`
- `node C:/Users/josep/Documents/GitHub/HoloScript/packages/cli/bin/holoscript.cjs validate apps/holoshell/source/holoshell-brittney-desktop-cockpit.hsplus`
- `node C:/Users/josep/Documents/GitHub/HoloScript/packages/cli/bin/holoscript.cjs validate packages/holoshell/scenes/operate-room.holo`
- `node scripts/holoshell-source-validation.mjs` -> 131/131 passed
- `node packages/holoshell/compile.mjs`
- Chrome channel render proof at `.scratch/browser-terminal-coupling/desktop.png` and `.scratch/browser-terminal-coupling/mobile.png`

`pnpm run ...` test wrappers were blocked by pnpm's non-TTY module purge guard before test code executed, so the equivalent direct `node` commands above were used for validation.
