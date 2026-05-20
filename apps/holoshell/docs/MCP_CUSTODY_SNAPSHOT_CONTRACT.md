# MCP Custody Snapshot Contract

**Status:** HoloShell contract design  
**Date:** 2026-05-15  
**Source:** `apps/holoshell/source/holoshell-mcp-custody-contract.hsplus`  
**Adapter:** `scripts/holoshell-mcp-custody-contract.mjs`  
**Upstream tool:** `holoshell_run_registry_snapshot`

## Decision

HoloLand should not permanently repair the HoloShell MCP snapshot with a local
overlay. The native upstream snapshot must distinguish:

```text
owner-unknown finding -> cleanup candidate -> termination preflight
owner-known finding   -> owner handoff     -> ask owner to extend, close, or justify
```

The current HoloLand bridge can consume fallback and overlay receipts safely,
but those are compatibility modes. Native readiness means
`holoshell_run_registry_snapshot` emits the split directly.

## Run It

```powershell
node scripts\holoshell-mcp-custody-contract.mjs --self-test
node scripts\holoshell-mcp-custody-contract.mjs
```

Output:

```text
.tmp/holoshell/mcp-custody-contract.json
.tmp/holoshell/mcp-custody-contract.js
```

## Required Snapshot Shape

The upstream snapshot should expose:

- `counts.cleanupCandidates`
- `counts.ownerHandoffs`
- `terminationPreflights[]` containing only owner-unknown cleanup candidates
- `ownerHandoffs[]` containing owner-known non-destructive handoff plans
- `shellRuns[]` carrying `action_class`, `cleanup_eligible`, and
  `owner_handoff_required`
- an `owner-handoff` operator card separate from the mutation gate

HoloLand maps those source-layer counts into
`summary.cleanupCandidateCount`, `summary.ownerHandoffPlanCount`, and
`summary.terminationPreflightCount` in the hardware-reality receipt. In native
mode, process-health count drift is advisory: it should not force a local
overlay when `holoshell_run_registry_snapshot` already emitted the custody
split.

## Compatibility Modes

| Mode | Meaning | Action |
| --- | --- | --- |
| `native_mcp` | MCP snapshot emits the custody split directly. | Ready if checks pass. |
| `hololand_overlay` | HoloLand overlaid `process-health.json` onto a broader MCP snapshot. | Upgrade upstream MCP. |
| `receipt_fallback` | MCP snapshot timed out and HoloLand used local read-only receipts. | Retry MCP before mutation; upgrade uptime/latency. |

## Why It Belongs Globally

This is not a HoloLand-only detail. Every local agent surface needs the same
machine truth:

- Codex should know whether a warning is its own handoff or cleanup risk.
- Claude/Cursor/Gemini surfaces should inherit visible ownership without making
  the user inspect terminals.
- Brittney should tell the non-developer user what needs attention without
  saying every old PID is something to stop.
- HoloShell should route legacy app and process actions through the same
  receipt-backed safety language everywhere.

The contract is therefore a globalization candidate for HoloShell MCP and the
HoloScript agent protocol.

## Safety

The contract adapter is read-only. It never stops processes, mutates windows,
deletes files, or includes raw command text. It only reads local HoloShell
receipts and writes a compliance receipt.
