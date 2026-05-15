# MCP Custody Upstream Handoff

**Status:** HoloShell upstream upgrade packet  
**Date:** 2026-05-15  
**Source:** `apps/holoshell/source/holoshell-mcp-custody-upstream-handoff.hsplus`  
**Adapter:** `scripts/holoshell-mcp-upstream-handoff.mjs`  
**Target tool:** `holoshell_run_registry_snapshot`

## Decision

HoloLand can safely consume fallback and overlay receipts, but that should not
be the permanent operating model. The MCP host that owns
`holoshell_run_registry_snapshot` should emit the custody split natively so all
agents see the same hardware truth.

## Run It

```powershell
node scripts\holoshell-mcp-upstream-handoff.mjs --self-test
pnpm run holoshell:mcp-upstream-handoff
```

Output:

```text
.tmp/holoshell/mcp-custody-upstream-handoff.json
.tmp/holoshell/mcp-custody-upstream-handoff.js
```

## What The Upstream Agent Must Change

- Locate the MCP server module registering `holoshell_run_registry_snapshot`.
- Emit owner-unknown cleanup candidates in `terminationPreflights[]`.
- Emit owner-known non-destructive plans in `ownerHandoffs[]`.
- Stamp `shellRuns[]` rows with `actionClass`, `cleanupEligible`, and
  `ownerHandoffRequired`.
- Add an `owner-handoff` operator card separate from mutation gates.
- Pass the HoloLand contract with `compatibilityMode=native_mcp`.

## Acceptance Gates

```powershell
node scripts\holoshell-mcp-custody-contract.mjs --self-test
pnpm run holoshell:hardware-reality
pnpm run holoshell:mcp-custody-contract
node scripts\holoshell-live-feed.mjs
node scripts\holoshell-brittney-context.mjs
```

Native readiness means the contract receipt reports:

```text
summary.status=pass
summary.compatibilityMode=native_mcp
summary.nativeMcpCustodySplit=true
```

## Safety

The handoff is read-only. It does not mutate the MCP host, stop processes,
include raw command text, include private paths, or ask HoloLand to become the
permanent source of truth for upstream MCP behavior.
