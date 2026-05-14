# Run Custody Actions

**Status:** HoloShell operating layer  
**Date:** 2026-05-14  
**Source:** `apps/holoshell/source/holoshell-run-custody-actions.hsplus`  
**Adapter:** `scripts/holoshell-run-custody-actions.mjs`

## Decision

HoloShell should manage the health of shell runs before agents ask to kill
anything. A process with no owner is not a target. It is a custody gap.

Run custody actions are deliberately non-destructive:

- `claim`
- `extend`
- `close`
- `mark-stale`
- `owner-unknown`
- `snapshot`

None of these terminate processes, delete files, mutate registry values, click
legacy UI, or close apps. They only create receipts that say who is responsible
for a visible run and what should happen next.

## Run It

Refresh hardware reality first:

```powershell
pnpm run holoshell:hardware-reality
```

Create the run custody snapshot:

```powershell
pnpm run holoshell:run-custody
```

Claim a visible run:

```powershell
pnpm run holoshell:run-custody -- --action claim --pid 1234 --lane-id codex-hardware --reason "Tracking this local validation run."
```

Close a run receipt without terminating the process:

```powershell
pnpm run holoshell:run-custody -- --action close --pid 1234 --lane-id codex-hardware --reason "Validation run completed; no termination performed."
```

## Outputs

```text
.tmp/holoshell/run-custody.json
.tmp/holoshell/run-custody.js
.tmp/holoshell/run-custody-store.json
```

The JSON output includes a `brittneyBrief` with allowed actions, blocked
actions, and the required next custody action. Brittney should read this brief
before proposing any shell or legacy-app operation.

When hardware reality can tie a shell run to an agent lane by direct PID or
parent PID, run custody marks it `lane_observed`. That reduces false
`owner_unknown` noise without pretending a custody receipt has already been
written.

Run custody also reads `.tmp/holoshell/process-health.json`. If process health
has stronger lane evidence for a PID, run custody can mark the run
`lane_observed` with `process_health_direct_pid` or
`process_health_parent_pid` evidence. This bridges the richer local process
ancestor/window inference into Brittney's operator brief without terminating,
claiming, or mutating the process.

When process health is present, run custody filters hardware-reality shell runs
through `processIndex.visiblePids`. That prevents stale MCP or hardware-reality
PID ghosts from inflating Brittney's owner-unknown queue.

Run custody is still a process-health surface. Peer instance counts should come
from `legacy-window-inventory.json`, because visible windows are what Brittney
and the user experience can actually operate.

## Rules

1. Stale does not mean kill.
2. Owner unknown does not mean safe to close.
3. Closing a custody receipt does not terminate the process.
4. Termination still requires `holoshell_preflight_terminate`.
5. File deletion still requires `holoshell_preflight_delete`.
6. Legacy app mutation still requires `holoshell_preflight_legacy_app_mutation`.
7. Raw commands stay hidden by default; use command hashes and receipts.

## User Experience

The non-developer user should see:

- which runs are claimed
- which runs have observed agent-lane ownership
- which runs have unknown owners
- which runs need attention
- which actions are safe
- which actions are blocked by preflight

They should not need to read process lists or command lines.
