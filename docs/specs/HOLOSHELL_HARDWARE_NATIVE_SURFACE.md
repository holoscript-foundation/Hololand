# HoloShell Hardware Native Surface

**Status:** Product direction and first implementation brief
**Date:** 2026-05-12
**Owner:** HoloLand product surface
**Source layer:** HoloScript capability, safety, receipt, and runtime contracts
**App seed:** `apps/holoshell`

## Decision

HoloShell belongs in HoloLand, not Studio.

Studio is the creator surface. It is where creators, founders, and agents author
worlds, scenes, traits, source artifacts, memory, and publishable HoloScript
reality.

HoloShell is the non-developer operating surface. It is where a person who does
not want to manage files, windows, commands, package managers, installers, or
settings can still direct the full computer through HoloScript, HoloMesh, and
local agents.

HoloShell is not a new dashboard. It is the first HoloLand surface that treats
the local computer as a live Twin Earth object.

## Thesis

HoloScript absorbs legacy software, turns it into typed capabilities, and
re-renders the old operating system as an embodied world.

The user should not think:

```text
Open app -> find menu -> pick file -> run command -> read log -> decide next step
```

The user should think:

```text
Ask for outcome -> watch agents operate -> approve risky moves -> inspect trust -> receive result
```

That is the UI/UX break. It moves the product from app-centric interaction to
intent-centric operation.

## Ownership Split

| Layer | Owns |
| --- | --- |
| HoloScript | Capability schemas, adapter contracts, safety traits, HoloDoor policy primitives, receipt formats, validation, compilers, runtime semantics. |
| HoloLand | HoloShell product experience, visual operating surface, non-developer flows, legacy-app re-rendering, local device embodiment, HoloLand-specific capability rooms. |
| Studio | Creator direction, authoring, memory refinement, asset/world generation, publish preparation. |
| HoloMesh | Agent identity, coordination, tasks, knowledge, reputation, team state, feed, social trust. |
| Local hardware layer | WebGPU, WASM, filesystem, browser, installed apps, OS services, local build/simulation proof. |

## Product Shape

HoloShell starts as a desktop app and can project to browser, mobile, VR, and AR.
The desktop app is first because legacy app absorption and local hardware truth
need the real machine.

The primary screen is not a launcher grid. It is a living operation room:

- A calm system pulse: what is healthy, blocked, risky, or complete.
- A capability map: what this computer and agent team can do right now.
- A legacy machine gallery: installed apps and old workflows represented as
  HoloScript capability objects.
- An agent operator room: which agents are active, what they are doing, and
  what they can safely touch.
- A trust and receipt timeline: every significant action, proof, witness,
  rollback path, and hardware result.
- A break-glass approval lane: only genuinely risky or ambiguous operations
  interrupt the user.

## Legacy Absorption Pipeline

Legacy software is not removed first. It is absorbed.

1. **Discover**
   - Installed programs.
   - File associations.
   - Browser profiles and web apps.
   - CLIs, PowerShell modules, local services, ports, and MCP endpoints.
   - Project scripts, package managers, build tools, and hardware probes.
   - Orphaned platform capabilities from HoloScript, HoloLand, and ecosystem tools.

2. **Describe**
   - Each discovered item becomes a HoloScript-visible capability.
   - The description includes inputs, outputs, risks, permissions, latency,
     trust status, receipts produced, and fallback paths.

3. **Wrap**
   - Prefer native APIs and MCP tools.
   - Use CLI/PowerShell bridges where stable.
   - Use browser automation for web apps.
   - Use UI Automation or vision only as the last-mile bridge for legacy apps
     with no better interface.

4. **Operate**
   - Actions go through HoloDoor-style permission envelopes.
   - Risky actions require explicit approval.
   - Every mutating action emits a receipt.
   - Rollback is attached when possible.

5. **Re-render**
   - The user sees tasks, objects, agents, trust states, timelines, and worlds.
   - The legacy app window is treated as an engine behind the surface, not the
     primary user model.

6. **Retire or preserve**
   - If a legacy app only preserves an old workflow, HoloScript replaces the
     workflow.
   - If a legacy app has deep capability, HoloShell keeps it as an engine and
     hides the skeleton.

## MVP Vertical Slice

The first slice should prove HoloShell can operate the local computer without
becoming a developer dashboard.

### Slice 0: Local Capability Room

Inputs:

- Local hardware audit receipt.
- HoloLand hardware audit receipt.
- HoloScript MCP health and tool manifest.
- HoloMesh room/team heartbeat.
- A small Windows app/program inventory.
- Existing HoloClaw skill shelf.
- Existing embodied trust HUD data.

User experience:

- The user sees one calm home surface.
- The surface shows a small set of capability glyphs:
  - WebGPU/hardware proof.
  - Files and local projects.
  - Browser/web operation.
  - HoloScript compile/validate.
  - Agent team/room.
  - Legacy apps.
- The user can give one outcome request in plain language.
- Agents decide which capability path to use.
- HoloShell shows the plan, risk, current actor, and receipt trail.

Acceptance:

- No user command-line knowledge is required.
- No project file browsing is required.
- Every mutating local action has a receipt or a clear "receipt unavailable"
  state.
- The UI avoids IDE metaphors unless the user explicitly enters creator mode.
- The implementation has HoloScript source under `apps/holoshell/source`.

## Capability Object Model

HoloShell should render every action source as a capability object.

```text
Capability
  id
  display_name
  category
  source_kind: holoscript | hololand | holomesh | mcp | cli | app | service | browser | hardware
  trust_state: verified | partial | stale | disputed | unsafe | unknown
  permission_envelope
  inputs
  outputs
  receipt_types
  visual_form
  replacement_path
```

Visual forms:

- **Glyph**: simple status object on the home surface.
- **Machine**: legacy app or service with multiple operations.
- **Room**: complex capability family such as HoloMesh, local projects, or browser.
- **Timeline node**: completed or running action with receipt state.
- **Approval object**: break-glass decision requiring the user.

## HoloScript Source Boundary

Generic capability schemas and reusable adapter contracts should graduate
upstream to HoloScript. HoloLand keeps the product-specific experience:

- Which capability objects appear on the HoloShell home surface.
- How legacy apps are visually represented.
- Which non-developer flows are default.
- Which agent operator states are visible.
- How HoloShell projects to desktop, mobile, VR, and AR.

HoloLand must not reimplement HoloScript parsing, validation, compile targets,
or generic MCP discovery. HoloShell consumes those as source-layer capabilities.

## App Placement

Initial home:

```text
apps/holoshell/
  README.md
  docs/
    LEGACY_ABSORPTION_ARCHETYPES.md
  prototype/
    local-capability-room.html
  samples/
    capability-inventory.sample.json
  schemas/
    capability-inventory.schema.json
  source/
    holoshell-home.hsplus
```

Future generated/native targets should stay out of hand-authored source where
possible. Tauri/desktop bridge code can be added only after the HoloScript source
contract is explicit and the bridge is named as migration debt or generated
output.

## Non-Goals

- Do not move Studio creator workflows into HoloShell.
- Do not make HoloShell an IDE.
- Do not expose raw files, commands, and logs as the primary product grammar.
- Do not make TypeScript-only product behavior canonical.
- Do not treat legacy apps as trusted just because they are installed.
- Do not allow hidden agent autonomy without receipts.

## First Implementation Tasks

1. Define the HoloShell home composition in HoloScript.
2. Add a local capability inventory contract for hardware, MCP, CLI, app, and
   browser capabilities.
3. Connect existing hardware audit output to the home surface.
4. Connect embodied trust HUD data to the trust lane.
5. Classify a first set of legacy programs into capability objects.
6. Prototype one non-developer outcome flow:
   - User asks for a result.
   - Agent selects capability path.
   - User sees plan and risk.
   - Agent executes.
   - HoloShell shows receipt.

## Slice 0 Delivery State

The first pass now has:

- A validated HoloScript home composition.
- A local capability inventory adapter at `scripts/holoshell-capability-inventory.mjs`.
- A JSON schema and redacted sample for capability inventory output.
- A legacy absorption archetype document that classifies the first adapter paths.
- A static Local Capability Room projection for visual review.

The adapter writes local/private discovery output to `.tmp/holoshell/` only.
Committed samples must remain redacted.
