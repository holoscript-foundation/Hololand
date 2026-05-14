# Brittney Custody Operator

**Status:** safe execution gate
**Date:** 2026-05-14
**Source:** `apps/holoshell/source/holoshell-brittney-custody-operator.hsplus`
**Adapter:** `scripts/holoshell-brittney-custody-operator.mjs`

## Decision

Brittney can consume the HoloShell operator brief and execute safe run-custody
receipts without asking the user to read files or run commands.

`scripts/holoshell-brittney-context.mjs` now materializes the operator brief,
shell object graph, process health, program registry, approvals, workflows, and
agent color lanes as `.tmp/holoshell/brittney-context.json`. Brittney turns use
this packet before proposing action, so peer counts come from real top-level
windows and shell windows remain separate from AI peer windows.

Visible shell windows are now first-class custody queues. The operator groups
Terminal/PowerShell windows by parent window PID, dedupes repeated top-level
Windows Terminal surfaces, and claims owner-unknown child runs through custody
receipts.

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

Shell window group execution is even narrower: clusters only support `claim`
receipts. They never terminate processes, click legacy windows, mutate files, or
emit raw shell commands.

## Refresh Order

```powershell
pnpm run holoshell:hardware-reality
pnpm run holoshell:legacy-windows
pnpm run holoshell:run-custody
pnpm run holoshell:legacy-apps
pnpm run holoshell:operator-brief
pnpm run holoshell:shell-objects
pnpm run holoshell:brittney-context
pnpm run holoshell:brittney-custody
pnpm run holoshell:run-custody
pnpm run holoshell:operator-brief
```

Output:

```text
.tmp/holoshell/brittney-custody-action.json
.tmp/holoshell/brittney-custody-action.js
.tmp/holoshell/brittney-context.json
.tmp/holoshell/brittney-context.js
```

## Why This Matters

The non-developer user should not need to understand PID ownership, shell
lifetimes, or hidden command text. Brittney reads the shared operator brief,
turns the first safe custody move into a receipt, and leaves destructive work
behind separate HoloShell preflights.

With shell window queues, Brittney can care for visible shell work the way a
non-developer user thinks about it: "that Terminal window needs an owner," not
"pid-7424 has descendants."
