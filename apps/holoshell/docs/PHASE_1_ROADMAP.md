# HoloShell Phase 1 Roadmap

**Status:** Phase 1 maturity tracker
**Date:** 2026-05-21
**Product owner:** HoloLand
**Source artifact:** `apps/holoshell/source/holoshell-phase1-workflows.hsplus`
**Pairs with:** `docs/specs/HOLOSHELL_HARDWARE_NATIVE_SURFACE.md`

## Direction

Phase 1 turns HoloShell from a seeded surface into a local operating product.

The goal is not a better desktop launcher. The goal is to replace app-centric
interaction with intent-centric operation:

```text
Intent -> capability path -> risk/approval -> agent action -> receipt -> visible outcome
```

The user should not manage files, commands, settings, package managers, or
hidden agent logs. HoloShell should render the machine as an embodied HoloLand
surface where capabilities, agents, receipts, and risks are the primary objects.

## Maturity Rule

Phase 1 should no longer be tracked as a list of intended features. Track each
slice by the highest evidence rung it has crossed:

```text
source/spec -> receipt -> visible shell UX -> approved execution -> trusted execution
```

The current Phase 1 substrate is mostly real: source validation passes, local
receipts exist, shell objects are visible, agent lanes are present, and hardware
custody can describe process/service state. The remaining Phase 1 work is not
"define the shell"; it is moving selected workflows from visible staged objects
into approved execution with receipts a non-developer can understand.

## Current Phase 1 Evidence

| Evidence | Current state |
| --- | --- |
| Source substrate | Latest `.tmp/holoshell/source-validation.json` reports 109/109 HoloShell source files validating through the HoloScript CLI: 18 `.holo`, 17 `.hs`, 74 `.hsplus`. |
| Shell object model | Latest `.tmp/holoshell/shell-objects.json` reports 95 shell objects: apps, captured windows, agents, workflows, approvals, receipts, source, startup, and native host objects. |
| Capability inventory | Latest `.tmp/holoshell/capability-inventory.json` reports 8 capability families: 2 verified, 5 partial, 1 unknown; 40 legacy programs classified. |
| Agent lanes | Lane source and local adapter exist. Read the latest `.tmp/holoshell/agent-lanes.json` or live-feed receipt before making a current active-lane count claim. |
| Receipts | Hardware, service, process, source validation, capability inventory, account custody, startup, native wrapper, workflow, approval, and readiness receipt paths exist. |
| Hardware/app custody | Infrastructure exists and is guarded; polished end-user operation is still a Phase 2/flagship target. |
| Trust | Trust ledger exists, but the latest level remains `read_only`. |

## Product Grammar

These are the first-class objects of HoloShell.

| Object | Meaning | User-facing question |
| --- | --- | --- |
| Intent | What the user wants done. | What outcome do I want? |
| Capability | Something the machine, app, service, or agent can do. | What can act? |
| Agent | The actor planning or executing. | Who is doing it? |
| Machine | A wrapped legacy app, CLI, service, browser, or hardware layer. | What old-world engine is being used? |
| Receipt | Evidence that something happened. | Why should I trust the result? |
| Approval | A break-glass decision. | What needs my consent? |
| Timeline | Ordered action memory. | What changed? |
| Room | A visual grouping of related capabilities and actors. | Where do I inspect this class of work? |
| Lane | A stable visual and semantic identity for an active agent instance. | Which agent surface is acting? |
| Run | A local process, shell command, watcher, build, browser, or service under custody. | What is consuming the hardware? |

## Surface Hierarchy

| Surface | Purpose | Phase 1 readiness |
| --- | --- | --- |
| Home Pulse | Calm health/status view of the machine. | Stubbed in `holoshell-home.hsplus`. |
| Capability Room | Shows hardware, HoloScript, HoloMesh, browser, projects, CLI, and legacy app capability families. | Inventory adapter and static projection exist. |
| HoloScript Surface Bridge | Projects HoloScript REST, MCP/RPC, and CLI tools into HoloShell rooms and machines. | Bridge source and surface-map adapter exist. |
| Agent Presence Fabric | Shows active shells, desktop agents, IDE agents, browser/vision agents, and HoloMesh presence as color lanes. | Lane source and local adapter exist. |
| Process Health Room | Shows PID custody, shell/dev runs, registered runs, stale runs, high-memory pressure, and cleanup approvals. | Source, read-only adapter, and run wrapper exist. |
| Legacy Machine Gallery | Groups absorbed apps by capability archetype, not by raw installed app name. | Archetype research exists; live grouping next. |
| Agent Operator Room | Shows active agents, current task, permission boundary, and receipts. | Static projection exists; HoloMesh live binding next. |
| Trust Timeline | Shows local action receipts and rollback state. | Receipt model seeded; live receipt linker next. |
| Break-Glass Lane | Shows only risky operations that require approval. | Source object seeded; policy thresholds next. |

## Phase 1 Slices

### Slice 1: Live Capability Inventory

Turn `scripts/holoshell-capability-inventory.mjs` into the runtime feed for
the Local Capability Room.

Deliverables:

- Read `.tmp/holoshell/capability-inventory.json`.
- Render capability families from inventory data instead of static HTML.
- Keep private local app names out of committed samples.
- Add a receipt when inventory generation succeeds or fails.

Acceptance:

- The room can refresh without opening a terminal.
- The user sees capability families and trust state.
- Unknown or unsafe capabilities are explicit, not hidden.
- Maturity target: visible shell UX with receipts, not silent backend inventory.

### Slice 1B: HoloScript Surface Bridge

Use HoloScript's existing API, REST, MCP/RPC, and CLI surfaces as the first
class engines for HoloShell.

Deliverables:

- Read `.tmp/holoshell/holoscript-surface-map.json`.
- Render HoloScript Source Room, Runtime Machine, Codebase Intelligence Room,
  HoloMesh Coordination Room, and Protocol Machine from the surface map.
- Prefer public REST discovery for passive status, MCP/RPC for typed tool
  invocation, and CLI for local/offline hardware proof.
- Convert each tool call into a permission envelope and receipt.

Acceptance:

- HoloShell shows HoloScript capabilities as rooms, not raw endpoint lists.
- Read-only discovery works without exposing secrets.
- Authenticated, mutating, publish, payment, deploy, install, credential, and
  delete operations are routed through guarded or break-glass policy.
- Maturity target: source/spec and receipt are real; move selected tools to
  approved execution only after visible permission envelopes are stable.

### Slice 1C: Agent Presence Color Lanes

Make active agents improve HoloShell's operating picture.

Deliverables:

- Read `.tmp/holoshell/agent-lanes.json`.
- Render active Codex, Claude, Gemini, Copilot, shell, and HoloMesh lanes.
- Preserve lane metadata in text, receipts, and structured events.
- Treat color as a human-visible cue, not the agent-readable truth.

Acceptance:

- Each active agent instance has a stable `laneId`.
- Every colored message also carries `agentKind`, `surfaceKind`, and
  `semanticPrefix`.
- Receipts show which lane acted and which permission envelope was used.
- The user can scan active lanes without opening terminals or IDEs.
- Maturity target: visible shell UX. Trusted handoff is not claimed until lane
  actions have repeated receipts.

### Slice 1D: PID And Shell Run Custody

Make hardware health an agent responsibility.

Deliverables:

- Read `.tmp/holoshell/process-health.json`.
- Read `.tmp/holoshell/run-registry.json`.
- Render process count, shell/dev run count, stale run count, high-memory count,
  registered run count, owned process count, overdue run count,
  unmatched active run count, and parent-not-visible count in the Process
  Health Room.
- Start heavy local commands through `scripts/holoshell-run.mjs` so every run
  has a lane, expected end time, pre-run health gate, and receipt.
- Link shell/dev runs to agent lanes when possible.
- Generate stop plans without stopping anything.
- Route actual termination through break-glass approval.

Acceptance:

- Agents check process health before starting heavy builds, tests, browser
  audits, or watchers.
- Heavy runs are blocked under `warn` or `critical` health unless the owning
  lane gives an explicit reason.
- HoloShell distinguishes owned active runs from stale anonymous processes.
- HoloShell shows stale and high-memory runs without exposing raw command lines
  by default.
- A process cannot be stopped without exact PID, reason, approval policy, and
  receipt.
- The user sees hardware pressure as plain language, not Task Manager noise.
- Maturity target: receipt and visible UX are real; stop execution remains
  break-glass.

### Slice 2: Browser Pilot

Use browser automation as the first wrapped legacy machine because it is
high-value and has strong witness paths.

Deliverables:

- Capability manifest for browser operation.
- Profile/session boundary policy.
- Screenshot and DOM witness receipt.
- One outcome flow: open a web surface, inspect status, summarize result.

Acceptance:

- HoloShell shows what site/action is being used.
- The agent cannot silently reuse private browser state without a named boundary.
- The result includes a witness artifact or a visible "witness unavailable"
  state.
- Maturity target: first approved execution candidate for the Founder evidence
  demo.

### Slice 3: Local Project/CLI Pilot

Make local project operation non-developer friendly.

Deliverables:

- Capability manifest for local project commands.
- Working-directory and timeout policy.
- Build/test command receipt.
- One outcome flow: run a safe project check and explain result.

Acceptance:

- The user never sees raw terminal output first.
- HoloShell summarizes pass/fail, changed files, and next action.
- Raw command output remains inspectable behind the receipt.
- Maturity target: approved execution for one safe command, then receipt-driven
  replay.

### Slice 4: Legacy App Classification Pilot

Turn installed programs into grouped HoloShell machines.

Deliverables:

- Live grouping by archetype: browser, documents, CLI/dev, creative runtime,
  system component, unknown.
- Per-archetype trust defaults.
- "Classify this app" flow that proposes adapter, risk, receipt, and
  replacement path.

Acceptance:

- HoloShell does not show a frightening raw app list.
- Unknown apps remain visible as unknown.
- No private inventory is committed.

### Slice 5: Break-Glass Policy

Define the first approval thresholds.

Deliverables:

- Read-only operations run quietly with receipts.
- Guarded write operations show plan/risk before execution.
- System settings, registry, credential, payment, deletion, install/uninstall,
  network credential, and robot/actuator operations require break-glass.

Acceptance:

- HoloShell is calm by default.
- Risky local changes interrupt the user with plain-language consequences.
- Every approval creates an approval receipt.
- Maturity target: keep trusted execution behind the trust ledger. Do not
  promote app control while latest trust remains `read_only`.

### Slice 6: Founder Evidence Demo

Prove the whole Phase 1 grammar with one narrow, undeniable workflow.

Deliverables:

- Brittney receives a natural command.
- The shell shows a plan with target app, agent lane, permission envelope, and
  expected receipt.
- A nonce-bound approval card is visible before mutation.
- One real app is operated through a guarded adapter.
- A receipt is written and the shell surface visibly changes.

Acceptance:

- The demo does not require the user to read terminal output first.
- The shell shows both before state and after state where possible.
- Failure is replayable as a lesson, not a silent log.
- This demo is allowed to be narrow; it must be real.

## Research Questions

1. What is the smallest capability schema that can represent MCP tools, CLIs,
   browsers, desktop apps, hardware probes, and HoloLand world operations?
2. Which legacy apps are engines worth preserving, and which workflows should
   be replaced by HoloScript-native flows?
3. What is the visual grammar for "agent is operating this machine" without
   exposing old UI/UX?
4. What receipt chain is enough for a non-developer to trust local actions?
5. What belongs upstream in HoloScript versus HoloLand product experience?
6. How should HoloMesh presence merge remote agents and local app/process
   evidence into one stable lane identity?
7. How should process health and HoloMesh heartbeats agree on which agent owns
   a long-running PID?

## Research Spine

The Phase 1 questions now route into these follow-on docs:

| Doc | Purpose |
| --- | --- |
| `HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md` | Defines HoloShell as the operating-system replacement surface, not a dashboard. |
| `SHELL_OBJECT_SCHEMA.md` | Defines the object grammar for programs, files, agents, workflows, approvals, receipts, windows, and controls. |
| `LEGACY_APP_ADAPTER_MATRIX.md` | Prioritizes browser, terminal, Claude, Excel/documents, files, projects, settings, and unknown apps by adapter and risk. |
| `BRITTNEY_OPERATOR_SPEC.md` | Defines Brittney's operator loop, context packet, action proposal shape, avatar states, and refusal rules. |
| `GEOMETRIC_UI_RECONSTRUCTION.md` | Defines how captured legacy UI becomes HoloScript geometry and interaction fields. |
| `SKIN_SIMULATION_RESEARCH.md` | Defines skins as simulation systems with materials, particles, risk language, accessibility, and performance budgets. |
| `PHASE_2_NATIVE_SHELL_ROADMAP.md` | Turns the research into native shell slices: approval UX, browser/media, terminal/marathon, Excel/documents, reconstruction, skins, host wrapper. |

## Upstream Candidates

These should move to HoloScript after one more implementation pass proves the
shape with source, receipt, visible UX, and at least one approved execution:

- `Capability` schema and validator.
- Adapter contract for MCP, API, CLI, browser, UI Automation, and vision.
- Permission envelope trait family.
- Receipt linker and timeline model.
- Agent presence, lane, color hint, and lane receipt schema.
- Process health, run custody, shell run, and stop-plan receipt schema.
- HoloScript visual primitive for capability glyphs and legacy machines.

## HoloLand-Owned Product Work

These should stay in HoloLand:

- HoloShell visual language.
- Non-developer outcome flows.
- Legacy Machine Gallery.
- Agent Operator Room.
- Local Capability Room.
- HoloLand-specific hardware/product receipts.
- Desktop/mobile/VR/AR projection choices.

## Primary External References Checked

- Microsoft UI Automation overview: programmatic access to desktop UI elements,
  useful as a fallback for opaque Windows apps.
  <https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview>
- Microsoft Desired State Configuration overview: declarative state documents
  and integration-friendly schemas for system-state operations.
  <https://learn.microsoft.com/en-us/powershell/dsc/overview?view=dsc-3.0>
- Chrome DevTools Protocol: browser instrumentation protocol for structured
  browser operation and witnesses.
  <https://chromedevtools.github.io/devtools-protocol/>
- Tauri architecture: lightweight desktop app shell using system webviews and
  Rust host integration.
  <https://v2.tauri.app/concept/architecture/>
