# Brittney Custody Operator

**Status:** safe execution gate
**Date:** 2026-05-14
**Source:** `apps/holoshell/source/holoshell-brittney-custody-operator.hsplus`
**Adapter:** `scripts/holoshell-brittney-custody-operator.mjs`

## Decision

Brittney can consume the HoloShell operator brief and execute safe run-custody
receipts without asking the user to read files or run commands.

This adapter is intentionally narrow. It can write receipts for:

- `claim`
- `extend`
- `close`
- `mark-stale`
- `owner-unknown`

`close` means "close the custody receipt." It does not terminate the process.

## Blocked

The operator never executes:

- `kill_process`
- `delete_file`
- `legacy_app_mutation`
- `registry_change`
- `destructive_ui_click`

Ambiguous recommendations such as `extend-or-close` and `close-or-reclaim` are
blocked until a lane chooses a concrete receipt action.

## Refresh Order

```powershell
pnpm run holoshell:hardware-reality
pnpm run holoshell:run-custody
pnpm run holoshell:legacy-apps
pnpm run holoshell:operator-brief
node scripts\holoshell-brittney-custody-operator.mjs
pnpm run holoshell:run-custody
pnpm run holoshell:operator-brief
```

Output:

```text
.tmp/holoshell/brittney-custody-action.json
.tmp/holoshell/brittney-custody-action.js
```

## Why This Matters

The non-developer user should not need to understand PID ownership, shell
lifetimes, or hidden command text. Brittney reads the shared operator brief,
turns the first safe custody move into a receipt, and leaves destructive work
behind separate HoloShell preflights.

This is the first step from "agents can observe the hardware" to "agents care
for the hardware."
