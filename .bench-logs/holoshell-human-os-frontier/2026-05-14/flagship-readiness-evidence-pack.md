# HoloShell Human OS Frontier - Flagship Readiness Evidence Pack

Date: 2026-05-14
Workflow explored: "Make this computer ready to build a HoloLand world, use local files, verify it works, and show what changed."

## Human Job

A non-technical user wants the local computer prepared for HoloLand world work. They should see whether the machine is ready, what agents or processes are already using it, whether HoloScript source validates, whether the HoloLand build works, what files changed, and how to replay or roll back the run.

## Hidden Platform Machinery

- OS: Windows process table, Start Menu/app registry, local ports, visible windows, stale shell sessions.
- Files: HoloLand and HoloScript worktrees, ignored `.tmp/holoshell/*` receipts, generated build outputs.
- Apps/services: Chrome, PowerShell, Node, pnpm, Next/Vite/tsup package builds, HoloShell bridge scripts.
- Accounts/agents: HoloMesh team heartbeat, codex-hardware lane, claimed/open board tasks.
- Permissions: read-only inventory, guarded build execution, break-glass stop plans for process termination.
- Runtime state: dirty HoloLand and HoloScript worktrees, stale process warnings, run registry, build receipt.

## Evidence Read

- `C:/Users/josep/.ai-ecosystem/CLAUDE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/AGENT_HOLOSCRIPT_TOOLING.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOSCRIPT_SOURCE_CONTRACT.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/HOLOLAND_PURPOSE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/docs/specs/HOLOLAND_FRONTIER_NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/AGENTS.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/NORTH_STAR.md`
- `C:/Users/josep/Documents/GitHub/HoloScript/experiments/holoshell-human-os-frontier/*`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/README.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/ABSORPTION_PILOTS.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/HARDWARE_PROGRAM_CONTROL.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/docs/HARDWARE_REALITY_MCP_BRIDGE.md`
- `C:/Users/josep/Documents/GitHub/Hololand/apps/holoshell/source/holoshell-phase1-workflows.hsplus`

## Commands And Tooling

- HoloMesh heartbeat: `node C:/Users/josep/.ai-ecosystem/hooks/team-connect.mjs --once --name=codex --ide=hardware`
- Hardware baseline: `node -v` -> `v24.15.0`; `pnpm -v` -> `10.28.2`; `npm -v` -> `11.6.2`
- WASM SIMD probe in Node: `false`
- Node WebGPU probe: `false`
- Chrome found: `C:/Program Files/Google/Chrome/Application/chrome.exe`, version `148.0.7778.98`
- Chrome headless WebGPU probe: `navigator_gpu=false`, including with `--enable-unsafe-webgpu`
- HoloScript codebase graph: in-memory cache exists but stale, root `/app`, age about 44.7h; semantic queries returned low-signal compiled/dist hits, so local reads/rg were used as primary evidence.
- HoloShell self-tests:
  - `node scripts/holoshell-hardware-reality-bridge.mjs --self-test` -> risk `pass`
  - `node scripts/holoshell-process-health.mjs --self-test` -> risk `warn`, 468 processes, 134 shell/dev runs, 92 stale
  - `node scripts/holoshell-run.mjs --self-test` -> completed
  - `node scripts/holoshell-live-feed.mjs --self-test` -> risk `warn`, hardware action and workflow pending user approval
- HoloScript validation:
  - `pnpm exec holoscript validate .../holoshell-phase1-workflows.hsplus` -> pass
  - `pnpm exec holoscript validate .../holoshell-shell-world.holo` -> pass
  - `pnpm exec holoscript validate .../holoshell-process-health-room.hsplus` -> pass
  - `pnpm exec holoscript validate .../holoshell-hardware-reality-bridge.hsplus` -> pass
- Build under custody:
  - `node scripts/holoshell-run.mjs --run-class build --expected-minutes 10 --allow-warn --reason "holoshell human os frontier flagship readiness smoke" -- pnpm build`
  - Result: completed, exit code `0`, duration `104550ms`, health gate `warn`
  - Receipt: `C:/Users/josep/Documents/GitHub/Hololand/.tmp/holoshell/run-receipts/run-mp539i3r-47eb217b4755ffc7.json`

## Design

### `.holo` Concept

Room: `Build Machine Room`.

Objects:
- `MachineReadinessGate`: one front-door object with pass/warn/block status.
- `HardwareMap`: GPU/WASM/browser/process lane cards.
- `SourceTable`: `.holo`, `.hs`, and `.hsplus` validation receipts.
- `BuildTimeline`: planned, running, completed, failed, replay, rollback states.
- `DirtyTreeShelf`: changed local files grouped as user work, generated output, ignored receipt output, and unknown.
- `FailureLessonPanel`: command failures become replayable lessons with exact next action.

### `.hsplus` Concept

State machine:
- `intake` -> `read_hardware` -> `read_repos` -> `validate_source` -> `preflight_build` -> `run_build` -> `join_receipts` -> `ready|warn|blocked`

Policy:
- Read-only inventory is silent but receipt-backed.
- Build/test are guarded execution; allowed under `warn` only with reason.
- Install/delete/credential/deploy/process termination are break-glass.
- Browser/headset visual witness is required before claiming a world renders.

Agent roles:
- Codex hardware lane: local execution, pnpm build, GPU/WASM/browser probes.
- HoloScript substrate lane: validate source, identify missing primitives.
- HoloLand product lane: convert receipt stack into room/tool/NPC UX.
- Browser/Gemini lane: visual witness when a local surface is launched.
- HoloMesh lane: file tasks and expose team status.

Receipts:
- `readiness_receipt`: joins hardware, repo, source validation, build receipt, warnings, changed-file summary, task ids, replay commands.

### `.hs` Concept

Data flow:
- `collectHardware()` reads HoloShell hardware-reality JSON.
- `collectProcessHealth()` reads process-health JSON and stop plans.
- `collectGitState()` reads `git status --short` for HoloLand and HoloScript.
- `validateSources()` invokes HoloScript validation for shell source files.
- `runBuild()` uses `holoshell-run.mjs` instead of raw `pnpm build`.
- `joinReceipts()` hashes the inputs into a single readiness receipt.
- `fileGaps()` opens HoloMesh tasks only when the joined receipt exposes a missing surface.

Replay:
- Store exact commands, cwd, source hashes, receipt ids, and policy decisions.
- Mark generated/ignored output separately from source changes.

## Scorecard

| Axis | Score | Notes |
| --- | ---: | --- |
| Human determinism | 8 | HoloShell already models plan/policy/receipt, but facts are split across receipts. |
| Non-developer clarity | 7 | Room metaphor exists; still needs one readiness object instead of logs. |
| Hardware reality | 9 | Real Node/pnpm/Chrome/process/build probes were run locally. |
| AI containment | 8 | `holoshell-run` gates heavy work and records lane/policy/reason. |
| HoloScript source nativeness | 8 | Relevant `.holo`/`.hsplus` sources validate; aggregator source still missing. |
| Multi-agent value | 8 | Lanes map cleanly to hardware, source, product, browser, and HoloMesh. |
| Reversibility/replay | 6 | Command replay exists; joined rollback/change summary is missing. |
| HoloLand embodiment | 7 | Shell world exists; build receipts are not yet first-class world objects. |
| Taskability | 9 | Two precise HoloMesh tasks filed with repro and paths. |

## Gaps Filed

- `task_1778739121159_vl2u`: `[holoshell][flagship] Build HoloLand readiness receipt aggregator`
- `task_1778739121159_pdyk`: `[holoshell][product] Render build receipts as HoloLand world objects`

## HoloScript Upstream Recommendations

- Reuse and complete the claimed capability-schema work rather than duplicating it.
- Add or expose a reusable `ReadinessReceipt` / `CommandReceipt` primitive that can join `StdlibPolicy`, `ShellCapability`, process custody, validation, and build/test results.
- Add a validator for receipt joins: required lifecycle fields, artifact hashes, replay command, redaction state, and rollback trigger.
- Consider a CLI/MCP tool that emits readiness receipts directly from `.hsplus` workflow definitions.

## HoloLand Adoption Recommendations

- Make `PrepareComputerForHoloLand` the default HoloShell onboarding quest.
- Render build receipts as objects in `holoshell-shell-world.holo`, not as a terminal transcript.
- Add a Build Machine NPC/tool that explains warnings: stale processes, dirty tree, WebGPU unavailable, build warnings, generated output.
- Treat local build receipts as creator-world objects: a world can show "this shard was built and validated here" with proof.

## Next Workflow

Push "Turn a folder of assets into a playable HoloLand shard." It extends the flagship from machine readiness into user-owned local files, asset classification, source generation, render witness, and publish safety.
