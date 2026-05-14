# Process And Shell Run Health

**Status:** HoloShell bridge design
**Date:** 2026-05-12
**Source:** `apps/holoshell/source/holoshell-process-health-room.hsplus`
**Discovery adapter:** `scripts/holoshell-process-health.mjs`
**Run wrapper:** `scripts/holoshell-run.mjs`

## Decision

HoloShell needs PID and shell-run custody as a first-class hardware health
surface.

Agents currently start shells, builds, browsers, watchers, language servers,
and helper processes without a shared local health contract. The operating
system knows the PIDs, but the agent team does not know ownership, age, memory
pressure, stale runs, or whether a process is still expected.

That is hardware debt. HoloShell should make it visible.

## Product Rule

Agents may create local runs, but HoloShell owns run custody:

```text
process table -> run classification -> risk -> owner lane -> receipt -> stop plan
```

Stopping a process is never a silent default. Termination can destroy user work,
agent state, local servers, build evidence, or browser sessions. HoloShell can
recommend cleanup, but execution goes through break-glass approval with an exact
PID and receipt.

## What The First Adapter Does

Run:

```powershell
node scripts\holoshell-process-health.mjs --self-test
```

It writes:

```text
.tmp/holoshell/process-health.json
```

The adapter is read-only. It reports:

- Process count.
- Shell/dev run candidates.
- Registered HoloShell runs.
- Active registered runs with visible PIDs.
- Lane-attributed processes inherited from run receipts, HoloShell hardware
  reality, legacy app/window inventory, or agent process ancestors.
- Review-worthy processes whose owner lane is still unknown.
- Registered runs that passed their expected end time.
- Active registry runs whose PID is no longer visible.
- Stale shell/dev runs.
- High-memory processes.
- Processes whose parent is not visible.
- Host memory pressure.
- Recommendations and receipt policy.

By default it does not include command lines. Use
`--include-command-lines` only for local debugging; command previews are
redacted but should still be treated as private local evidence.

## Run Custody Wrapper

Agents should start heavy local work through the HoloShell wrapper:

```powershell
node scripts\holoshell-run.mjs --lane-id codex-hardware --run-class build --allow-warn --reason "required local validation" -- pnpm build
```

The wrapper writes:

```text
.tmp/holoshell/run-registry.json
.tmp/holoshell/run-receipts/<run-id>.json
```

Heavy run classes are `build`, `test`, `browser_audit`, `dev_server`,
`watcher`, `install`, `package_script`, and `long_running`.

Before a heavy run starts, the wrapper reads process health. If risk is `warn`
or `critical`, the run is blocked unless the agent passes an explicit
`--allow-warn` or `--allow-critical` plus `--reason`. Light runs can still
execute so agents can inspect, repair, and produce cleanup evidence.

Use dry-run mode to ask HoloShell whether a command would pass the gate:

```powershell
node scripts\holoshell-run.mjs --run-class test --dry-run --allow-warn --reason "checking test gate" -- pnpm test
```

## Run Registry Reconciliation

If a registered run is still marked `planned` or `running` after its expected
end time, but HoloShell cannot see its PID, the registry should be reconciled
before Brittney treats it as live work:

```powershell
pnpm run holoshell:run-registry-reconcile
```

This writes:

```text
.tmp/holoshell/run-registry-reconcile.json
.tmp/holoshell/run-registry-reconcile.js
```

Reconciliation is non-destructive. It never kills a process, closes an app,
or deletes evidence. It only marks overdue registry-only runs as `stale` when
the expected end time has passed and the PID is missing or not visible. If the
PID is visible, the active registry record stays active so the owning lane can
extend, close, or justify it with a receipt.

## Lane Ownership Inference

HoloShell now treats visible agent surfaces as owner evidence. The adapter
reads `.tmp/holoshell/hardware-reality.json` and
`.tmp/holoshell/legacy-window-inventory.json`, then combines those lane/window
PIDs with recognizable local agent ancestors such as Codex, Claude, Gemini,
Copilot, Cursor, and Ollama.

Receipts expose:

- `laneAttributedProcessCount`: processes that inherited a lane without a run
  registry receipt.
- `ownerUnknownReviewCount`: processes with findings that still need a human or
  agent claim before cleanup.
- `ownerLane`, `ownerLaneLabel`, `ownerColorHint`, `ownerEvidence`,
  `ownerParentPid`, and `ownerTrustState` for each sampled process.

This is evidence, not authority to mutate. A color lane helps Brittney and
agents see responsibility, but stop plans still require exact PID, reason,
approval, and receipt.

## Management Policy

| Operation | Default | Why |
| --- | --- | --- |
| Process scan | Silent read with receipt | Agents need hardware awareness. |
| Shell/dev run classification | Silent read with receipt | HoloShell should know run custody. |
| Heavy run start | Pre-run health gate | Prevent invisible agent pileups. |
| Run receipt write | Required | PIDs need owner lanes and expected end times. |
| Registry reconcile | Non-destructive receipt | Clears phantom active runs without stopping visible work. |
| Lane ownership inference | Read-only evidence | Legacy apps and process ancestors feed Brittney without mutation. |
| Stop-plan creation | Guarded plan | Planning is safe if it does not stop anything. |
| Stop one PID | Break-glass | May destroy active work or evidence. |
| Kill process tree | Break-glass plus owner lane | High blast radius. |

## HoloShell View

The Process Health Room should show:

- Hardware pressure: memory pressure, high-memory count, stale-run count.
- Run registry: registered runs, owned processes, overdue runs, unmatched runs.
- Lane ownership: process owners, color hints, owner evidence, and
  owner-unknown review count.
- Shell run stack: shells, package scripts, Node runtimes, Python runs,
  browser witnesses, and tooling runs.
- PID custody table: PID, parent PID, category, age, memory, findings, owner
  lane, and receipt state.
- Cleanup lane: recommended stop plans waiting for approval.

The user should not have to read Task Manager, terminal logs, or raw process
lists. HoloShell should say:

```text
Three old dev runs are still alive. One is using 2.1 GB. No process will be
stopped without approval.
```

## Agent Duty

Every agent lane should treat process health as part of its job:

1. Before starting a heavy build, test, browser audit, or watcher, read the
   process health receipt or use `scripts\holoshell-run.mjs`.
2. If hardware pressure is `warn` or `critical`, avoid starting another heavy
   run unless the task requires it.
3. Register the lane, run class, expected duration, and reason before starting
   long work.
4. If a run is stale or overdue, claim it, justify it, extend it, or request a
   stop plan.
5. After a long-running command ends, record a receipt.
6. Never kill another lane's process without exact PID, reason, approval, and
   receipt.

## Upstream Candidates

If this stabilizes, upstream these to HoloScript and HoloMesh:

- `ProcessHealthReceipt` schema.
- `RunReceipt` schema.
- `RunCustody` schema.
- `ShellRun` capability type.
- HoloMesh heartbeat fields for active PID, command class, and expected run
  duration.
- Break-glass process termination receipt schema.
