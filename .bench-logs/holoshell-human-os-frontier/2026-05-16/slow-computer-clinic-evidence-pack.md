# HoloShell Slow Computer Clinic Evidence Pack

Date: 2026-05-16

## Workflow Explored

Human job: "My computer feels slow. Show what is using hardware, what is safe to do, and what would change before anything is stopped."

## Hidden Platform Machinery

- OS/runtime: Windows process table, parent PID graph, process creation times, working sets, OS memory, logical CPU count.
- Files/state: `.tmp/holoshell/run-registry.json`, process-health receipt, hardware audit receipt, HoloShell source rooms.
- Apps/surfaces: shells, Node workers, browsers, IDE/agent surfaces, HoloShell room, HoloMesh board.
- Accounts/permissions: per-surface HoloMesh bearer, local process permissions, break-glass stop approval.
- Agents: Codex hardware lane collects receipts; owner lanes must close/extend/justify their own stale processes; browser lane witnesses WebGPU/WebXR health.
- Devices: local CPU, RAM, browser GPU/WebGPU/WebXR surface.

## Current Evidence

- Process health receipt: `.bench-logs/holoshell-human-os-frontier/2026-05-16/slow-computer-process-health.json`
- Hardware audit receipt: `.bench-logs/holoshell-human-os-frontier/2026-05-16/slow-computer-hardware-audit.json`
- Process risk: `warn`
- Processes: `503`
- Shell/dev runs: `47`
- Stale runs: `25`
- Owner-unknown review: `4`
- Owner handoff plans: `21`
- Actionable cleanup candidates: `4`
- High-memory processes: `0`
- Cleanup stop plans: `4`
- Hardware audit: `pass`; Node `v24.15.0`; pnpm `10.28.2`; logical CPUs `16`; memory `31.73 GB`; browser hardware audit `9 pass`, `1 warn`, `1 skip`.

No process was stopped. No file was deleted. The clinic remains read-only plus guarded plans.

## .holo Concept

Prototype: `experiments/holoshell-human-os-frontier/slow-computer-clinic-room.holo`

Visible room:

- Hardware Vitals panel explains overall health without Task Manager jargon.
- Run Custody panel separates registered runs, lane-owned findings, and owner-unknown findings.
- Cleanup Candidates panel shows only the processes eligible for a guarded stop plan.
- Owner Handoff panel shows work that should go back to Codex/Claude/Gemini/Copilot/browser lanes before cleanup.
- Action Preview panel stages refresh, owner ask, stop plan, approval, and replay controls.
- Receipts become objects: read-only health, hardware audit, guarded stop plan, and replay lesson markers.

## .hsplus Concept

Prototype: `experiments/holoshell-human-os-frontier/slow-computer-clinic-policy.hsplus`

Policy and state machine:

- `ReadOnlyDiagnosis`: process scan, hardware audit, run registry read, classification, owner attribution.
- `GuardedClinicPlan`: stage stop plans, ask owner lanes, mark stale runs, write report, file tasks.
- `BreakGlassTermination`: stop/kill/close/delete actions require explicit approval, exact PID, reason, and receipt.
- `ClinicWorkflow`: scan -> classify -> explain -> handoff or stop plan -> approve -> remediate -> verify.

## .hs Concept

Prototype: `experiments/holoshell-human-os-frontier/slow-computer-clinic-pipeline.hs`

Data flow:

- Reads process health, hardware audit, and optional run registry receipts.
- Normalizes hardware vitals and ownership plans.
- Validates read-only receipt and termination safety contracts.
- Emits human explanation cards, owner handoff cards, guarded stop cards, evidence pack, and task seeds.

## Multi-Agent Hardware Orchestration

- Codex hardware: owns local scans, hardware audit, HoloScript parse validation, evidence receipts.
- Owner lane agents: own stale lane-attributed processes; must close, extend, or justify before cleanup.
- Browser witness: owns visible browser/GPU/WebXR witness when headless audit warns.
- HoloLand product: renders clinic room, Brittney explanation, quest/lesson surface.
- HoloMesh: receives gap tasks and completion evidence when service is available.

HoloShell makes work legible by turning each backstage process into either a visible owner handoff, guarded cleanup candidate, or read-only context object.

## Scorecard

| Dimension | Score | Rationale |
| --- | ---: | --- |
| Human determinism | 9 | Read-only diagnosis and stop plans are receipted before action. |
| Non-developer clarity | 9 | "why slow" panels hide PID details until needed. |
| Hardware reality | 10 | Uses live process table and hardware audit. |
| AI containment | 9 | Owner handoff and break-glass termination stop agents from freelancing cleanup. |
| HoloScript source nativeness | 8 | Existing hsplus room plus new .holo/.hsplus/.hs prototypes. |
| Multi-agent value | 9 | Slowness is often caused by hidden agent/browser/build processes. |
| Reversibility/replay | 8 | Scan and plan are replayable; actual termination needs richer after-action receipts. |
| HoloLand embodiment | 9 | Strong room/product fit as a visible clinic. |
| Taskability | 8 | Gaps are concrete; HoloMesh service blocked live filing this run. |

## Gaps Found

1. HoloShell has strong process health receipts, but no dedicated non-developer "slow computer clinic" product loop yet.
2. Stop plans exist, but a richer after-action verification receipt is needed for approved remediation.
3. HoloMesh board operations returned `502 Application failed to respond`, blocking task closure and new task filing from this run.
4. Browser hardware audit produced a browser-version warning even though DOM/WebGPU/WebXR probes passed; HoloShell should surface that as "probe warning, capability still available."

## Task Seeds

Local seed file: `.bench-logs/holoshell-human-os-frontier/2026-05-16/slow-computer-clinic-holomesh-tasks.json`

Live HoloMesh task filing was attempted but blocked by 502 board responses.

## HoloScript Upstream Recommendations

- Add a reusable `SlowComputerClinicReceipt` or extend process-health receipts with `humanDiagnosis`, `ownerHandoffCards`, `guardedStopCards`, and `afterActionVerification`.
- Standardize termination safety policy as a reusable HoloScript substrate primitive: exact PID, owner lane, reason, pre/post hash, no silent kill.
- Add a browser hardware audit warning classifier so "version command warn" does not obscure successful WebGPU/WebXR capability checks.

## HoloLand Adoption Recommendations

- Add the Slow Computer Clinic as a HoloShell room and Brittney operator flow.
- Render registered runs, lane-owned stale runs, owner-unknown cleanup candidates, and guarded stop plans as separate visible lanes.
- Turn failed/stale process diagnoses into replayable lessons, not raw logs.

## Next Workflow

Push the clinic from read-only diagnosis into guarded remediation: stage one exact PID stop plan, require human approval, execute only in a safe fixture or deliberately selected stale process, then verify before/after receipts.
