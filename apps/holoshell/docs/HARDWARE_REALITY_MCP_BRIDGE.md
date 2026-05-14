# Hardware Reality MCP Bridge

**Status:** HoloShell bridge design  
**Date:** 2026-05-14  
**Source:** `apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus`  
**Adapter:** `scripts/holoshell-hardware-reality-bridge.mjs`  
**Upstream truth:** `C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs`

## Decision

HoloLand should consume the local HoloShell MCP server as the machine reality
surface. It should not re-invent its own PID registry, shell tracker, lane
model, or safety preflight rules.

The bridge asks the upstream MCP tool `holoshell_run_registry_snapshot` for the
current hardware snapshot, then projects it into HoloLand objects:

- agent lanes
- shell runs
- listening ports
- legacy apps
- termination and mutation preflight gates
- read-only receipts

This is bridge-only infrastructure. The product semantics live in
`holoshell-hardware-reality-bridge.hsplus`.

## Why This Matters

The user should not need to read command output, inspect process lists, or know
which terminal belongs to which agent. HoloShell should show the computer as an
operating room: who is active, what is running, which legacy apps are visible,
and what actions require a safety receipt.

This is also how extra agents make HoloShell stronger. More active shells,
Claude/Cursor windows, Codex sessions, Ollama lanes, and browser surfaces become
more context for the operating map instead of more chaos for the user.

## Run It

```powershell
node scripts\holoshell-hardware-reality-bridge.mjs --self-test
```

Live hardware snapshot:

```powershell
node scripts\holoshell-hardware-reality-bridge.mjs
```

Output:

```text
.tmp/holoshell/hardware-reality.json
```

The output hides raw command text by default. It keeps PIDs, process names,
ports, lane ids, command hashes, and receipt hashes so agents can reason without
showing sensitive terminal contents to the user.

## Trust Rules

1. The MCP snapshot is the source of truth for the current machine view.
2. Color lanes are visual hints; `laneId`, `surfaceKind`, and receipts are the
   agent-readable truth.
3. Terminating a PID requires `holoshell_preflight_terminate`.
4. Deleting files requires `holoshell_preflight_delete`.
5. Mutating legacy apps requires `holoshell_preflight_legacy_app_mutation`.
6. The bridge never performs destructive actions.

## HoloShell UX Shape

HoloShell should render this as a calm hardware map:

- lane stack: which agents and local models are active
- shell run map: commands and dev servers as custody objects
- legacy app dock: Windows programs ready for wrapping or visual absorption
- mutation gate: exact safety requirements before changing anything

The non-developer user sees intent labels and health state. Agents keep the
machine-readable receipt trail.
