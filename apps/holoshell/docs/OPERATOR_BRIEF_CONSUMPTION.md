# Operator Brief Consumption

**Status:** HoloShell global consumption contract  
**Date:** 2026-05-14  
**Source:** `apps/holoshell/source/holoshell-operator-brief.hsplus`  
**Adapter:** `scripts/holoshell-operator-brief.mjs`

## Decision

Brittney and every local agent should consume one HoloShell operator brief
before proposing shell, process, file, or legacy-app actions.

The operator brief merges:

- hardware reality
- run custody
- legacy window inventory
- legacy app absorption

It says what is safe, what is blocked, what needs preflight, and what the next
non-destructive action should be.

## Refresh Order

```powershell
pnpm run holoshell:hardware-reality
pnpm run holoshell:run-custody
pnpm run holoshell:legacy-windows
pnpm run holoshell:legacy-apps
pnpm run holoshell:operator-brief
```

Output:

```text
.tmp/holoshell/operator-brief.json
.tmp/holoshell/operator-brief.js
```

## Agent Rule

Agents should read the operator brief before action. If an action appears in
`blockedActions`, the agent must route through the matching HoloShell MCP
preflight instead of executing directly.

Blocked by default:

- `kill_process`
- `delete_file`
- `legacy_app_mutation`
- `registry_change`
- `destructive_ui_click`

Allowed by default:

- observe hardware
- claim run
- extend run
- close run receipt
- mark run stale
- capture window
- map visible controls
- summarize visible state

Peer counts come from `legacy-window-inventory.json`. PID counts remain useful
for custody and health, but Brittney should use top-level window counts when
describing how many peer instances are actually visible.

## Brittney Rule

Brittney should treat `brittneyPromptCard.firstMove` as the first suggested
operator move. She should not improvise destructive actions from user intent.
She should answer in plain language, then stage the appropriate HoloShell tool
or preflight.

## Why This Is Global

This brief is intentionally not project-specific. It describes the local
machine as the shared operating surface. Codex, Claude Desktop, Claude Code,
Cursor, Copilot, Gemini, shell scripts, and future HoloShell utilities should
all read the same contract instead of each scanning the machine differently.
