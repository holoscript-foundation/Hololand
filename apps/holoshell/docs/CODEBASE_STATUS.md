# HoloShell Codebase Status

**Status:** Evidence-backed recalibration
**Date:** 2026-05-16
**Scope:** HoloShell docs, source, scripts, receipts, and current gaps

## Bottom Line

HoloShell is now a source-backed operating shell prototype, not an agent backend
dashboard. The important question has changed from "what should HoloShell be?"
to "which capabilities have crossed from source/spec into receipt, visible UX,
approved execution, and trusted execution?"

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
- The Founder host bootstrap now has a `.hsplus` source contract, local receipt,
  live-feed summary, and shell object.
- The first native wrapper target now exists as a Windows app-mode launcher with
  a `.hsplus` source contract and readiness receipt.
- Startup integration now has a `.hsplus` source contract, approval-gated
  Windows per-user login shortcut bridge, receipt, live-feed row, and shell
  object.
- Brittney has avatar, context, operator, trust, and workflow contracts.
- Hardware actions are staged through approval and daemon boundaries.
- Grok Build, Claude chat, Ollama Cloud launch, room marathon, browser/media,
  and founder-command lanes are represented as workflows.
- GOLD, HoloScript codebase context, and wild HoloScript from `uaa2-service`
  are visible as shell substrate, not isolated docs.

The major unfinished piece is still primary desktop ownership. HoloShell can
describe, stage, validate, preview, receipt, launch a wrapper, and present an
approved per-user startup path. It does not yet replace Explorer as the desktop
shell or reconstruct live legacy apps into dense, realistic geometry with full
before/after witnesses.

## Founder HoloShell Evidence Ladder

Each capability should be tracked by the highest rung it has actually reached:

| Rung | Meaning | Current examples |
| --- | --- | --- |
| 1. Source/spec | `.holo`, `.hs`, or `.hsplus` declares the behavior, policy, or room. | Startup integration, skins, Brittney operator, hardware control. |
| 2. Receipt | A local adapter emits machine-readable evidence. | Source validation, native wrapper, startup integration, account custody, process/service custody. |
| 3. Visible shell UX | The receipt appears as a room, shell object, live-feed row, approval token, or timeline item. | 86 shell objects, Native Wrapper, Startup Gate, Account Task Receipt, readiness tokens. |
| 4. Approved execution | A user can approve a nonce-bound action and get an execution receipt. | Hardware/workflow approval infrastructure; mutating execution remains intentionally narrow. |
| 5. Trusted execution | Repeated receipts promote a low-risk action through the trust ledger. | Not reached for real app control; latest trust level is still `read_only`. |

The next anchor is one undeniable end-to-end demo: Brittney receives a natural
command, shows the plan, asks approval, operates one real app, produces a
receipt, and the HoloShell surface visibly changes.

## Recalibrated Progress

| Area | Progress | Evidence state |
| --- | ---: | --- |
| HoloShell doctrine / OS replacement direction | 85% | Clear doctrine, source ownership, native host path, and OS-layer object model. |
| Source contracts / `.holo`, `.hs`, `.hsplus` substrate | 75% | 50/50 HoloShell source files validate through the HoloScript CLI. |
| Receipts, capability inventory, shell object model | 70% | 86 shell objects, live feed, receipts, approvals, lanes, custody, and source bridges are visible. |
| Native wrapper / startup bridge | 60% | Wrapper and startup adapter exist; startup registration is not enabled by default. |
| Brittney operator loop | 40% | Context, plan, approval, and receipt flow exist; full autonomous app operation is staged. |
| Real app control: browser, terminal, Excel, Claude, Ollama | 30% | Machines and workflows are represented; polished end-user operation is not complete. |
| Legacy app geometric reconstruction | 30% | Capture is real, with controls and geometry nodes; dense inspected app replacement is still early. |
| Realistic simulation skins | 20% | Design/spec/substrate exists; water/fire/aura simulation systems are not yet real. |
| Trusted autonomous system | 20% | Trust ledger exists; latest level remains `read_only`. |

## Evidence From This Pass

Commands run locally on 2026-05-16:

| Check | Result |
| --- | --- |
| `node scripts/hardware-audit.mjs --json --self-test` | Pass. Node v24.15.0, pnpm 10.28.2, WASM SIMD pass, Chrome WebGPU/WebXR API pass. Browser version warned, but no critical failures. |
| `pnpm run holoshell:source-validation` | Pass. 50/50 HoloShell source files validate through the HoloScript CLI: 1 `.holo`, 2 `.hs`, 47 `.hsplus`. |
| `pnpm run holoshell:shell-objects` | Ready. 86 shell objects include local apps, workflows, receipts, the Founder host, Native Wrapper, Startup Gate, Account Task Receipt, and readiness tokens. |
| `node scripts/holoshell-native-wrapper.mjs` | Launchable wrapper present. Windows launcher, command shim, preview host, startup adapter, and Chrome/Edge app-mode path are accounted for. |
| `node scripts/holoshell-startup-integration.mjs` | Registration adapter present. Per-user startup registration is available behind explicit approval; current receipt does not register the shortcut by default. |
| `pnpm run holoshell:founder-host:refresh` | Native host present. Source, preview host, startup adapter, native wrapper, service supervisor, shell object graph, live feed, and source validation are accounted for. |
| `node scripts/holoshell-live-feed.mjs` | Warn. Live feed is generated with founder boot, Founder host, Native Wrapper, Startup Gate, user shell, developmental environment, Brittney context, GOLD/codebase bridge, format inventory, network reality, services, workflows, approvals, and receipts. |
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
| Founder host bootstrap | `source/holoshell-founder-host.hsplus`, `scripts/holoshell-founder-host.mjs` | Native-host readiness receipt exists. It reports source/preview/native-wrapper/shell-object/live-feed readiness and names the next move: startup integration. |
| Native wrapper | `source/holoshell-native-wrapper.hsplus`, `apps/holoshell/native/windows/Start-HoloShellFounderHost.ps1` | First Windows app-mode launcher exists. It starts HoloShell without manually opening HTML and sees the startup adapter. |
| Startup integration | `source/holoshell-startup-integration.hsplus`, `apps/holoshell/native/windows/Register-HoloShellStartup.ps1` | Approval-gated per-user login shortcut bridge exists. It is plan-only by default; `-Register -Approve` performs registration and `-Unregister -Approve` removes it. |
| Hardware control | `source/holoshell-hardware-control.hsplus`, `scripts/holoshell-control-daemon*.mjs` | Staged and guarded. Execution is disabled by default and requires approval packets plus daemon execute mode. |
| Brittney operator | `docs/BRITTNEY_OPERATOR_SPEC.md`, `source/holoshell-brittney-*.hsplus` | Product contract exists: intent, plan, approval, adapter, receipt, narration. Current maturity is staged operator loop, not trusted autonomy. |
| Founder command demo | `source/holoshell-founder-command-pipeline.hs`, `scripts/holoshell-founder-command.mjs` | Demo-level plan/approval/receipt exists for the "open Claude, room marathon, Ollama Kimi Cloud, browser, YouTube lofi" path. Real app mutation is still gated. |
| Grok heavy lane | `source/holoshell-grok-*.hsplus`, `scripts/holoshell-grok-*.mjs` | Installed/authenticated/ready according to the current shell object receipt, with workflow approval still required for autonomy. |
| Trusted autonomy | `source/holoshell-trusted-autonomy.hsplus`, `scripts/holoshell-trust-ledger.mjs` | Ladder exists. Latest state remains low-risk/read-only until repeated receipts justify promotion. |
| Legacy absorption | `docs/GEOMETRIC_UI_RECONSTRUCTION.md`, `scripts/holoshell-os-ui-capture.mjs` | Capture is real, including controls and geometry nodes. Dense geometric wrapping with before/after witnesses is the next major build gap. |
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

HoloShell is not yet a boot-time OS replacement. The user can now start the
wrapper from a native Windows launcher and the codebase can present an
approval-gated per-user login registration path, but primary desktop ownership
and Explorer replacement are still future native work.

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

1. Ship the undeniable Founder evidence demo.
   Brittney receives a natural command, shows a plan, asks approval, operates
   one real app, produces a receipt, and visibly changes the shell surface.
   This is the anchor for graduating from impressive substrate to operating
   product.

2. Turn the Startup Gate into visible UX.
   The approved startup source, receipt, and Windows registration bridge now
   exist. Next, render the Startup Gate approval card in the shell and keep an
   obvious unregister path.

3. Turn skins into simulation systems.
   Implement a real liquid skin first, then fire and aura. Tie material motion
   to shell state: intent, attention, risk, approval, execution, and receipt.

4. Graduate legacy UI reconstruction.
   Extend capture with screenshot/OCR witness placeholders, generate one `.holo`
   graph per captured window, and render one app as 1000+ grouped geometry nodes.

5. Harden Brittney's operator loop.
   Wire context -> plan -> approval -> execute -> observe -> receipt across
   browser/media, terminal/agent marathon, Claude chat, Ollama Cloud launch, and
   one document or spreadsheet app.

6. Promote trusted autonomy by evidence.
   Use the trust ledger to graduate repeated low-risk actions from read-only to
   guarded autonomy. Do not jump straight to open-ended computer control.

7. Close readiness evidence gaps.
   Fix graph/live-core import evidence, add headset/replay witness options, and
   keep warning tokens visible in the shell until resolved.

8. Convert Founder HoloShell into User HoloShell packs.
   Keep Founder mode powerful and weird. Derive calm user packs from it instead
   of designing a smaller launcher first.

## Refresh Commands

Use these commands to regenerate this status from the codebase:

```powershell
node scripts\hardware-audit.mjs --json --self-test
pnpm run holoshell:source-validation
pnpm run holoshell:shell-objects
node scripts\holoshell-startup-integration.mjs
node scripts\holoshell-native-wrapper.mjs
pnpm run holoshell:founder-host:refresh
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
.tmp/holoshell/startup-integration.json
.tmp/holoshell/native-wrapper.json
.tmp/holoshell/founder-host.json
.tmp/holoshell/live-feed.json
.tmp/holoshell/service-supervisor.json
.tmp/holoshell/control-daemon-service.json
.tmp/holoshell/readiness-evidence.json
.tmp/holoshell/build-custody.json
```
