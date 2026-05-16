# HoloShell Codebase Status

**Status:** Codebase-backed catch-up
**Date:** 2026-05-16
**Scope:** HoloShell docs, source, scripts, receipts, and current gaps

## Bottom Line

HoloShell is now a source-backed operating shell prototype, not an agent backend
dashboard.

The codebase has the right product spine in place: `.holo` owns the shell world,
`.hs` owns executable/render/pipeline behavior, `.hsplus` owns Brittney,
policy, trust, services, and product contracts. TypeScript is acting as local
hardware bridge and receipt glue. The current prototype HTML is a preview host,
not the product source of truth.

What exists today is enough to prove the OS-layer direction:

- HoloShell source validates through the HoloScript CLI.
- Local hardware can be discovered and proven with receipts.
- Apps, agents, workflows, approvals, receipts, services, and source corpora
  materialize as shell objects.
- Brittney has avatar, context, operator, trust, and workflow contracts.
- Hardware actions are staged through approval and daemon boundaries.
- Grok Build, Claude chat, Ollama Cloud launch, room marathon, browser/media,
  and founder-command lanes are represented as workflows.
- GOLD, HoloScript codebase context, and wild HoloScript from `uaa2-service`
  are visible as shell substrate, not isolated docs.

The major unfinished piece is native shell ownership. HoloShell can describe,
stage, validate, and preview the replacement OS layer, but it does not yet boot
as the primary desktop shell or reconstruct live legacy apps into dense,
realistic geometry with full before/after witnesses.

## Evidence From This Pass

Commands run locally on 2026-05-16:

| Check | Result |
| --- | --- |
| `node scripts/hardware-audit.mjs --json --self-test` | Pass. Node v24.15.0, pnpm 10.28.2, WASM SIMD pass, Chrome WebGPU/WebXR API pass. Browser version and DOM probe warned on timeout, but no critical failures. |
| `pnpm run holoshell:source-validation` | Pass. 46/46 source files validated: 1 `.holo`, 2 `.hs`, 43 `.hsplus`. |
| `pnpm run holoshell:shell-objects` | Ready. 82 shell objects, 18 program objects, 21 running objects, 34 guarded-execute objects. |
| `node scripts/holoshell-live-feed.mjs` | Warn. Live feed is generated with founder boot, user shell, developmental environment, Brittney context, GOLD/codebase bridge, format inventory, network reality, services, workflows, approvals, and receipts. |
| `pnpm run holoshell:service-supervisor` | Ready with degraded optional state. Required service online; no required action. |
| `pnpm run holoshell:control-daemon-service` | Starting. PID is alive and verified; loopback health is not reachable; execute remains disabled. |
| `pnpm run holoshell:readiness-evidence` | Fail. Build, validation, WebGPU, WASM SIMD, and runtime inventory pass, but graph-status/live-core import and skipped headset/replay evidence keep the pack failing. |
| `pnpm run holoshell:build-custody` | Ready. No active build trees found. |

The failed readiness evidence is useful signal, not product failure. It means
HoloShell is already exposing the difference between "the local machine can do
the work" and "the full evidence pack is complete."

## Current Shape

| Subsystem | Where it lives | Current state |
| --- | --- | --- |
| Shell doctrine | `docs/HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md` | Clear: HoloShell replaces the desktop metaphor with an intent-first HoloScript world. |
| Source substrate | `source/*.holo`, `source/*.hs`, `source/*.hsplus` | Validated. `.holo`, `.hs`, and `.hsplus` are all first-class shell inputs. |
| Shell object graph | `scripts/holoshell-shell-objects.mjs` | Working bridge from local programs, agents, workflows, approvals, receipts, source, and services into one object graph. |
| Live feed | `scripts/holoshell-live-feed.mjs` | Working browser bootstrap for the prototype and status projection. Risk is currently `warn`, which is honest. |
| Hardware control | `source/holoshell-hardware-control.hsplus`, `scripts/holoshell-control-daemon*.mjs` | Staged and guarded. Execution is disabled by default and requires approval packets plus daemon execute mode. |
| Brittney operator | `docs/BRITTNEY_OPERATOR_SPEC.md`, `source/holoshell-brittney-*.hsplus` | Product contract exists: intent, plan, approval, adapter, receipt, narration. |
| Founder command demo | `source/holoshell-founder-command-pipeline.hs`, `scripts/holoshell-founder-command.mjs` | Demo-level receipt exists for the "open Claude, room marathon, Ollama Kimi Cloud, browser, YouTube lofi" command path. |
| Grok heavy lane | `source/holoshell-grok-*.hsplus`, `scripts/holoshell-grok-*.mjs` | Installed/authenticated/ready according to the current shell object receipt, with workflow approval still required for autonomy. |
| Trusted autonomy | `source/holoshell-trusted-autonomy.hsplus`, `scripts/holoshell-trust-ledger.mjs` | Ladder exists. Latest state remains low-risk/read-only until repeated receipts justify promotion. |
| Legacy absorption | `docs/GEOMETRIC_UI_RECONSTRUCTION.md`, `scripts/holoshell-os-ui-capture.mjs` | Capture and reconstruction strategy exists. Dense geometric wrapping is the next major build gap. |
| Skins | `docs/SKIN_SIMULATION_RESEARCH.md`, `source/holoshell-skin-presets.hsplus` | Research/spec exists. Need real water, fire, aura, and developer simulation systems beyond color variants. |
| GOLD/codebase bridge | `source/holoshell-holoscript-gold-codebase-bridge.hsplus` | Ready in live feed. HoloShell can treat GOLD and codebase intelligence as operating context. |
| Wild HoloScript intake | `docs/WILD_HOLOSCRIPT_INTAKE.md`, `source/holoshell-wild-holoscript-intake.hsplus` | Scanned and visible. Promotion still needs adapters and receipts before authority. |

## What Is Real

HoloShell now has a working product grammar:

```text
.holo world
  -> shell objects
  -> Brittney context
  -> intent proposal
  -> approval/trust policy
  -> guarded local adapter
  -> receipt
  -> live feed / timeline
```

It also has the beginnings of a real operating loop:

```text
local hardware truth
  -> process and service custody
  -> program/window registry
  -> workflow staging
  -> trust ledger
  -> shell object projection
```

This is not just documentation. The scripts generate `.tmp/holoshell/*`
receipts that the shell projection consumes.

## What Is Not Real Yet

HoloShell is not yet a boot-time OS replacement. The user still opens a local
HTML projection or runs scripts manually.

The liquid/fire/aura experience is not yet a realistic simulation layer. The
research is right, but the renderer needs WebGPU/Three/R3F style simulation
systems and visual witness receipts.

Legacy app reconstruction is not yet dense enough. The target is thousands of
grouped geometric shapes that wrap old UI by semantic control and receipt, not
flat screenshots or normal app windows.

Execution is intentionally restrained. Brittney can stage and explain app
operations, but the system still requires explicit approval and daemon execute
mode before mutation. That is correct for the current trust level.

The readiness evidence pack still fails on graph/live-core import and missing
headset/replay witness. Those are concrete gaps to close before calling the
flagship demo fully proven.

## Next Build Moves

1. Build the native Founder HoloShell host.
   Start HoloShell without manually opening HTML. The host should load the
   `.holo` world, start or observe the daemon/service supervisor, and own the
   primary surface while keeping a safe escape path to the old desktop.

2. Turn skins into simulation systems.
   Implement a real liquid skin first, then fire and aura. Tie material motion
   to shell state: intent, attention, risk, approval, execution, and receipt.

3. Graduate legacy UI reconstruction.
   Extend capture with screenshot/OCR witness placeholders, generate one `.holo`
   graph per captured window, and render one app as 1000+ grouped geometry nodes.

4. Harden Brittney's operator loop.
   Wire context -> plan -> approval -> execute -> observe -> receipt across
   browser/media, terminal/agent marathon, Claude chat, Ollama Cloud launch, and
   one document or spreadsheet app.

5. Promote trusted autonomy by evidence.
   Use the trust ledger to graduate repeated low-risk actions from read-only to
   guarded autonomy. Do not jump straight to open-ended computer control.

6. Close readiness evidence gaps.
   Fix graph/live-core import evidence, add headset/replay witness options, and
   keep warning tokens visible in the shell until resolved.

7. Convert Founder HoloShell into User HoloShell packs.
   Keep Founder mode powerful and weird. Derive calm user packs from it instead
   of designing a smaller launcher first.

## Refresh Commands

Use these commands to regenerate this status from the codebase:

```powershell
node scripts\hardware-audit.mjs --json --self-test
pnpm run holoshell:source-validation
pnpm run holoshell:shell-objects
node scripts\holoshell-live-feed.mjs
pnpm run holoshell:service-supervisor
pnpm run holoshell:control-daemon-service
pnpm run holoshell:readiness-evidence
pnpm run holoshell:build-custody
```

The important status files are local and ignored:

```text
.tmp/holoshell/source-validation.json
.tmp/holoshell/shell-objects.json
.tmp/holoshell/live-feed.json
.tmp/holoshell/service-supervisor.json
.tmp/holoshell/control-daemon-service.json
.tmp/holoshell/readiness-evidence.json
.tmp/holoshell/build-custody.json
```
