# HoloShell Phase 1 Roadmap

**Status:** Phase 1 planning artifact
**Date:** 2026-05-12
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

## Surface Hierarchy

| Surface | Purpose | Phase 1 readiness |
| --- | --- | --- |
| Home Pulse | Calm health/status view of the machine. | Stubbed in `holoshell-home.hsplus`. |
| Capability Room | Shows hardware, HoloScript, HoloMesh, browser, projects, CLI, and legacy app capability families. | Inventory adapter and static projection exist. |
| HoloScript Surface Bridge | Projects HoloScript REST, MCP/RPC, and CLI tools into HoloShell rooms and machines. | Bridge source and surface-map adapter exist. |
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

## Research Questions

1. What is the smallest capability schema that can represent MCP tools, CLIs,
   browsers, desktop apps, hardware probes, and HoloLand world operations?
2. Which legacy apps are engines worth preserving, and which workflows should
   be replaced by HoloScript-native flows?
3. What is the visual grammar for "agent is operating this machine" without
   exposing old UI/UX?
4. What receipt chain is enough for a non-developer to trust local actions?
5. What belongs upstream in HoloScript versus HoloLand product experience?

## Upstream Candidates

These should move to HoloScript after one more implementation pass proves the
shape:

- `Capability` schema and validator.
- Adapter contract for MCP, API, CLI, browser, UI Automation, and vision.
- Permission envelope trait family.
- Receipt linker and timeline model.
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
