# HoloShell Developmental Environment

Date: 2026-05-14

Purpose: connect the filed UI/UX thesis into HoloShell as an operating substrate, not a side note.

Canonical research anchor: `C:/Users/josep/.ai-ecosystem/research/2026-05-14_ui-ux-developmental-environment.md`. HoloLand reads that file as an external research receipt and keeps its own product contract in HoloScript source.

## Thesis

HoloShell should not evolve as a dashboard or wireframe. The frame is:

```text
wireframe -> simulation -> geometrics
```

The shell becomes a developmental environment where Brittney helps the user and the machine graduate into real agency. Brittney is not just a widget; she is the assistant presence that helps the shell learn, explain, and safely act.

## Spine

1. Substrate
2. Vocabulary
3. Composition
4. Two-observer rendering
5. Honesty
6. Signal and presence

## Diamond Rulings

The open questions are settled as implementation constraints:

- Mass-function is derived, not authored.
- Physics-to-animation mapping is a pure function of physics state.
- Visual motion must not lie about underlying state.

## Board Threads

- `task_1778802617893_o5mp` — engineer the mass-function.
- `task_1778802617893_zppq` — engineer the physics-to-animation mapping-function.
- `task_1778802907913_5ph8` — fix the `/room` skill verification-block bug.

## HoloShell Wiring

- Source contract: `apps/holoshell/source/holoshell-developmental-environment.hsplus`
- Adapter: `scripts/holoshell-developmental-environment.mjs`
- Runtime receipt: `.tmp/holoshell/developmental-environment.json`
- Browser bootstrap: `.tmp/holoshell/developmental-environment.js`

This plugs the thesis into the live feed and shell-object graph so the next UI work can be judged by whether it follows the substrate rather than whether it merely looks impressive.
