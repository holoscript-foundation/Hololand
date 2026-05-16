# HoloShell Phase 2 Native Shell Roadmap

**Status:** Phase 2 planning artifact
**Date:** 2026-05-13
**Scope:** Native shell, app control, Brittney operator, and geometric reconstruction
**Builds on:** `PHASE_1_ROADMAP.md`

## Direction

Phase 1 proves the shell grammar, feeds, receipts, approvals, and first
workflow. Phase 2 turns HoloShell into a native operating surface.

The goal is:

```text
Start HoloLand -> HoloShell owns the surface -> Brittney operates apps -> receipts prove outcomes
```

## Phase 2 Outcomes

1. HoloShell can run as a native desktop shell host.
2. Brittney can operate browser, terminal, files, and at least one document or
   spreadsheet app through receipts.
3. Legacy app UI can be captured and reconstructed as HoloShell geometry.
4. The user can approve and execute staged workflows from the shell surface.
5. Skins are source-level simulation systems, not HTML color variants.
6. HoloShell can show agent lanes, process custody, workflows, and receipts as
   one operating picture.

## Slices

### Slice 2A: Shell Object Graph

Deliverables:

- Canonical graph for apps, browser surfaces, terminal surfaces, captured
  windows, agent lanes, Brittney, workflows, approvals, and receipts.
- Browser bootstrap at `window.HOLOSHELL_SHELL_OBJECTS`.
- Live-feed embedding at `feed.feeds.shellObjects`.
- First-screen bubbles for real local programs instead of a generic Programs
  tile only.
- Stage-only action buttons that call the guarded daemon.

Acceptance:

- Excel, browser, terminal, agent lanes, and running windows can appear as
  addressable shell objects.
- The graph does not leak raw executable paths into the browser surface.
- Selecting an object reveals its trust, permission envelope, adapter, and
  receipt expectations.
- The prototype can stage app/browser/workflow actions without executing them.

### Slice 2B: Native Host Bridge

Current landing:

- Founder host source contract exists at `source/holoshell-founder-host.hsplus`.
- `scripts/holoshell-founder-host.mjs` writes `.tmp/holoshell/founder-host.json`
  and `.tmp/holoshell/founder-host.js`.
- The receipt is now visible in the live feed and shell object graph as
  `host.founder-holoshell`.
- Current honest status is `ready_for_native_wrapper`: preview/source/feed
  readiness is accounted for, but the native wrapper and startup integration
  are not present yet.

Deliverables:

- Native app wrapper around the HoloShell surface.
- Loopback control daemon lifecycle management.
- Startup path that can open HoloShell as primary surface.
- Local-only bridge policy for hardware operations.
- Health and version receipt.

Acceptance:

- User can start HoloShell without opening the prototype HTML manually.
- Daemon status is visible.
- Execution is disabled by default.
- Native host can restart stage-only services safely.

### Slice 2C: Approval And Execute UX

Current landing:

- Prototype approval review is live in `local-capability-room.html`.
- The review renders hardware and workflow approval packets as shell objects
  with id, nonce-bound command preview, expiry, daemon status, and execute gate.
- Default daemon mode keeps execution disabled; real mutation still requires
  `--enable-execute`, current id, current nonce, and explicit confirmation.
- HoloScript flagship readiness evidence can now be ingested as a HoloShell
  World Build Readiness room with build, WebGPU, WASM, validation, headset,
  replay, graph-status, and HoloMesh task tokens.

Deliverables:

- Native approval object in the shell.
- Workflow approval review view.
- Execute button gated by user gesture, daemon `--enable-execute`, id, nonce,
  and confirmation.
- Result receipt and visible timeline update.

Acceptance:

- User can approve a staged workflow without terminal knowledge.
- Wrong nonce or expired packet is visibly rejected.
- The shell states whether the daemon can execute.
- Mutations produce before/after receipts where possible.

### Slice 2D: Browser And Media Operator

Deliverables:

- Browser Machine object.
- Named profile/session boundary.
- URL open and screenshot witness.
- Media operation path for lofi/music.
- Read-only page status inspection.

Acceptance:

- "Open browser and play lofi" is a Brittney-operated flow.
- The shell shows browser boundary and receipt.
- Forms, payments, messages, and downloads remain break-glass.

### Slice 2E: Terminal And Agent Marathon Operator

Deliverables:

- Terminal Machine object.
- Claude CLI resolution.
- Room marathon workflow source.
- Ollama/Kimi route fields.
- Run receipt linked to agent lane.

Acceptance:

- "Start room marathon with Kimi" stages as a workflow.
- Approval packet controls all mutating steps.
- Terminal output is summarized behind receipt, not shown first.

### Slice 2F: Excel Or Document Machine

Deliverables:

- Document/spreadsheet capability object.
- File snapshot receipt.
- Read-only summary path.
- Guarded export or transformation path.
- App adapter matrix entry upgraded to source contract.

Acceptance:

- User can ask Brittney to inspect a workbook or document.
- No write occurs before approval.
- Output artifact and diff are attached to receipt.

### Slice 2G: Geometric Legacy Reconstruction

Deliverables:

- Captured window to shell object graph.
- Accessibility tree normalization.
- Screenshot and OCR witness placeholders.
- Geometry node count and confidence receipt.
- One app rendered as 1000+ grouped geometric nodes.

Acceptance:

- HoloShell can show a legacy window without exposing it as a flat screenshot.
- Controls are grouped by semantic role.
- Low-confidence controls cannot execute silently.

### Slice 2H: Real Skin Simulation

Deliverables:

- Source-level `ShellSkin` schema.
- Water, fire, aura, and developer simulation systems.
- Performance budget tiers.
- Reduced-motion equivalent states.
- Visual receipt metadata.

Acceptance:

- Skins change motion, material, state language, and risk visualization.
- They are source-backed, not local CSS forks.
- Text remains readable and controls stay stable.

## Priority Build Order

1. Shell object graph.
2. Native approval/execute UX.
3. Browser/media operator.
4. Terminal/agent marathon operator.
5. Excel or document machine.
6. Geometric reconstruction for one legacy app.
7. Skin simulation schema and realistic water/fire/aura.
8. Native host wrapper and startup integration.

The shell object graph comes first because HoloShell cannot operate the
computer until the computer is represented as objects. The approval UX follows
because it unlocks safe mutation of those objects.

## Research Questions

1. Which native host should own lifecycle: Tauri, Windows-native wrapper, or a
   generated HoloScript target?
2. How much of app control should live in HoloLand before graduating upstream
   into HoloScript adapter contracts?
3. What is the minimum witness chain for a non-developer to trust app actions?
4. What visual grammar makes legacy UI feel absorbed, not mirrored?
5. How should Brittney remember user preferences without leaking private local
   machine details into shared state?

## Exit Criteria

Phase 2 is complete when a user can say:

```text
Brittney, open the browser and play lofi, start a room marathon with Kimi, and show me the receipt.
```

And HoloShell can:

- Show the plan.
- Request approval.
- Execute through native bridge.
- Open the right apps.
- Start the right agent workflow.
- Show receipts and visible status.
- Keep the old desktop out of the primary mental model.
