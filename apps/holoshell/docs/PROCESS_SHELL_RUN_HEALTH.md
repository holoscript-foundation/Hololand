# Process And Shell Run Health

**Status:** HoloShell bridge design
**Date:** 2026-05-12
**Source:** `apps/holoshell/source/holoshell-process-health-room.hsplus`
**Discovery adapter:** `scripts/holoshell-process-health.mjs`

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
- Stale shell/dev runs.
- High-memory processes.
- Processes whose parent is not visible.
- Host memory pressure.
- Recommendations and receipt policy.

By default it does not include command lines. Use
`--include-command-lines` only for local debugging; command previews are
redacted but should still be treated as private local evidence.

## Management Policy

| Operation | Default | Why |
| --- | --- | --- |
| Process scan | Silent read with receipt | Agents need hardware awareness. |
| Shell/dev run classification | Silent read with receipt | HoloShell should know run custody. |
| Stop-plan creation | Guarded plan | Planning is safe if it does not stop anything. |
| Stop one PID | Break-glass | May destroy active work or evidence. |
| Kill process tree | Break-glass plus owner lane | High blast radius. |

## HoloShell View

The Process Health Room should show:

- Hardware pressure: memory pressure, high-memory count, stale-run count.
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
   process health receipt.
2. If hardware pressure is `warn` or `critical`, avoid starting another heavy
   run unless the task requires it.
3. If a run is stale, claim it, justify it, or request a stop plan.
4. After a long-running command ends, record a receipt.
5. Never kill another lane's process without exact PID, reason, approval, and
   receipt.

## Upstream Candidates

If this stabilizes, upstream these to HoloScript and HoloMesh:

- `ProcessHealthReceipt` schema.
- `RunCustody` schema.
- `ShellRun` capability type.
- HoloMesh heartbeat fields for active PID, command class, and expected run
  duration.
- Break-glass process termination receipt schema.
