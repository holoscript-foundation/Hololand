# HoloShell OS Replacement Doctrine

**Status:** Product doctrine
**Date:** 2026-05-13
**Scope:** HoloShell as the HoloLand operating shell
**Source anchors:** `apps/holoshell/source/holoshell-home.hsplus`, `apps/holoshell/source/holoshell-hardware-control.hsplus`, `apps/holoshell/source/holoshell-shell-world.holo`

## Doctrine

HoloShell is not a dashboard for agent backends. HoloShell is the replacement
operating surface for the computer.

When the user starts HoloLand, the machine should stop presenting itself as a
desktop full of windows, apps, files, menus, and command lines. It should become
a HoloScript-operated world where programs, files, browsers, agents, workflows,
receipts, and approvals are visible objects.

The operating system is still present underneath. HoloShell absorbs it, wraps
it, and re-renders it. Legacy apps become engines. The user interacts with
intent, Brittney, approvals, evidence, and outcomes.

## Boot Sequence

The target startup sequence is:

```text
Computer starts
HoloLand starts
HoloShell takes the primary surface
Brittney appears as the embodied operator
Local capabilities are discovered
Programs, files, agents, browser, terminal, and rooms become shell objects
Risky actions are staged behind approvals
Receipts build the trust timeline
```

The old desktop may still be available as an escape hatch, but it is not the
primary product grammar.

## Replacement Thesis

The legacy operating model is:

```text
Open app -> find UI -> perform steps -> read output -> decide next step
```

The HoloShell model is:

```text
Ask for outcome -> Brittney plans -> HoloShell shows risk -> user approves -> agents operate -> receipts prove result
```

This is the product break. HoloShell is not a prettier app launcher. It is an
intent-first operating layer.

## First Screen

The first screen should feel like a living shell, not a control panel.

Required first-viewport signals:

- Brittney is present and reachable.
- Shell objects are alive: programs, files, browser, agents, terminal, rooms.
- The current machine health is visible without becoming the center of the UI.
- A trust timeline or evidence drawer exists behind the world.
- Approval state is visible when needed and quiet otherwise.
- Skins change the behavior and material feel of the whole shell.

The prototype may use HTML as a preview surface, but the source of truth stays
in `.holo`, `.hs`, and `.hsplus`.

## Brittney's Role

Brittney is the shell operator and guide.

She should:

- Listen to the user's outcome request.
- Observe local shell state.
- Explain what she can do.
- Propose a capability path.
- Stage workflows.
- Ask for approval before guarded or break-glass actions.
- Operate apps through receipts.
- Narrate what changed.
- Refuse unsafe, unclear, or overbroad actions.

Brittney should not feel like a status widget. She is the embodied AGI-facing
presence of HoloShell.

## Object World

Everything the user can act on becomes a shell object:

- Program objects.
- File and folder objects.
- Browser and web app objects.
- Terminal and CLI objects.
- Agent lane objects.
- HoloMesh room objects.
- Workflow objects.
- Approval objects.
- Receipt and timeline objects.
- Captured legacy window and control objects.

Each object has a capability, permission envelope, adapter path, visual form,
and receipt expectation.

## Legacy Absorption

HoloShell absorbs legacy software in six moves:

1. Discover the app, window, process, file, or service.
2. Describe it as a HoloScript-visible capability.
3. Wrap it with the safest available adapter.
4. Operate through permission envelopes.
5. Re-render it as shell geometry and interaction fields.
6. Retire the old workflow or preserve the app as an engine.

The app window is not the user's main mental model. It is the engine behind the
shell object.

## Permission Doctrine

HoloShell must be powerful without becoming sneaky.

Default policy:

- Read-only awareness can run quietly with receipts.
- Guarded execution requires a visible plan and approval packet.
- Break-glass actions require explicit consent, high-friction review, and a
  rollback or witness note.

Examples:

| Action | Default envelope |
| --- | --- |
| List windows or programs | `read_only` |
| Open browser or app | `guarded_execute` |
| Type into terminal | `guarded_execute` |
| Submit command | `guarded_execute` |
| Delete file | `break_glass` |
| Install, uninstall, pay, publish, enter secret | `break_glass` |

## Design Rules

- The shell must not look like an admin backend.
- Raw logs are evidence, not the primary surface.
- App lists are grouped by capability, not exposed as a private inventory dump.
- Agents are visible as actors with lanes, boundaries, and receipts.
- Legacy windows are reconstructed as geometry when possible.
- HoloScript source must name product behavior before host bridge code hardens.
- Local hardware truth wins over optimistic cloud assumptions.

## Research Spine

The next HoloShell research and docs set is:

1. `SHELL_OBJECT_SCHEMA.md`
2. `LEGACY_APP_ADAPTER_MATRIX.md`
3. `BRITTNEY_OPERATOR_SPEC.md`
4. `GEOMETRIC_UI_RECONSTRUCTION.md`
5. `SKIN_SIMULATION_RESEARCH.md`
6. `PHASE_2_NATIVE_SHELL_ROADMAP.md`

These documents should stay linked. The doctrine defines the product, the
schema defines objects, the adapter matrix defines how old software is wrapped,
and the roadmap turns the research into build order.

