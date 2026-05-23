# HoloShell

HoloShell is the HoloLand operating shell. When the computer starts HoloLand,
the old desktop metaphor gives way to a HoloScript-operated world.

It turns the local machine into a HoloScript-operated environment:

- HoloScript defines capability, permission, receipt, and runtime semantics.
- HoloLand renders the replacement shell and skins.
- HoloMesh coordinates agents and team state.
- Legacy apps become launchable shell objects.
- Brittney becomes the assistant or AGI-facing presence inside the shell.
- Local hardware proof decides what is actually available.

## Why This Lives In HoloLand

Studio is for creator direction. HoloShell is for everyone else.

HoloShell belongs in HoloLand because it is a lived product surface: a desktop,
mobile, VR, and AR shell that can replace Windows, macOS, Android, and app-grid
metaphors with a world made of programs, files, agents, browsers, and receipts.

Reusable primitives should move upstream to HoloScript. Product experience stays
here.

## Source Of Truth

## Source Of Truth

The single source of truth for HoloShell capability is the set of contracts under `source/`.

For the grouped, user-facing capability map (recommended for agents and product work), see:

```text
docs/HOLOSHELL_SOURCE_MAP.md
```

The flat authoritative list of all current source contracts lives in `source/` (62 files as of 2026-05-18). The full list appears in the "Current Artifacts" section below. Key entry points and the full grouped view are maintained in the source map document.

## First Slice

Slice 0 is the HoloLand shell takeover:

- Water-like full-screen shell surface with ripple and caustic simulation.
- Brittney assistant presence and chat.
- Bubbles for programs, agents, files, browser, HoloLand, and command powers.
- Custom simulated skins such as water, fire, developer circuitry, and aura.
- Dock for persistent shell objects.
- Receipts and custody evidence kept behind the world, not in front of it.

The user gives an outcome. HoloShell shows which agent is acting, which
capability is being used, what risk exists, and what receipt proves the result.
Backend telemetry supports the experience, but it must not be the default shape
of the screen.

## Current Artifacts (baseline from 2026-05-18; not exhaustive — see source-validation for live count)

**Live count (2026-05-23):** 121/121 committed source files pass `pnpm run holoshell:source-validation` (121/121 on-disk). Includes `holoshell-photo-backup-room.holo`, `holoshell-photo-backup-policy.hsplus`, `holoshell-photo-backup-pipeline.hs` (committed 2026-05-23). See `docs/HOLOSHELL_SOURCE_MAP.md` for capability-grouped view and `docs/CODEBASE_STATUS.md` for current validation receipt.

Partial flat list from 2026-05-18 baseline (65 files, now superseded by source-validation receipt):

```text
source/holoshell-account-task-custody.hsplus
source/holoshell-agent-dispatch.hsplus
source/holoshell-agent-presence-lanes.hsplus
source/holoshell-asset-shard-workflow.hsplus
source/holoshell-brittney-ambient-tone.hsplus
source/holoshell-brittney-avatar.hsplus
source/holoshell-brittney-context-packet.hsplus
source/holoshell-brittney-custody-operator.hsplus
source/holoshell-brittney-device-operator.hsplus
source/holoshell-brittney-environment-coupling.hsplus
source/holoshell-brittney-presence.hsplus
source/holoshell-brittney-runtime-bridge.hsplus
source/holoshell-build-custody.hsplus
source/holoshell-codex-hardware-audit.hsplus
source/holoshell-control-daemon-service.hsplus
source/holoshell-developmental-environment.hsplus
source/holoshell-device-safety-lab-policy.hsplus
source/holoshell-device-safety-lab.holo
source/holoshell-device-safety-pipeline.hs
source/holoshell-device-safety-policy.hsplus
source/holoshell-founder-boot-loop.hsplus
source/holoshell-founder-command-pipeline.hs
source/holoshell-founder-host.hsplus
source/holoshell-founder-intent-policy.hsplus
source/holoshell-founder-to-user-strategy.hsplus
source/holoshell-grok-build-workflow.hsplus
source/holoshell-grok-heartbeat.hsplus
source/holoshell-hardware-control.hsplus
source/holoshell-hardware-reality-bridge.hsplus
source/holoshell-holoscript-bridge.hsplus
source/holoshell-holoscript-gold-codebase-bridge.hsplus
source/holoshell-home.hsplus
source/holoshell-legacy-app-absorption.hsplus
source/holoshell-legacy-window-inventory.hsplus
source/holoshell-local-file-manifest.hsplus
source/holoshell-mcp-custody-contract.hsplus
source/holoshell-mcp-custody-upstream-handoff.hsplus
source/holoshell-native-wrapper.hsplus
source/holoshell-natural-phenomena-bridge.hsplus
source/holoshell-network-change-sentinel.hsplus
source/holoshell-network-freshness-watch.hsplus
source/holoshell-network-reality.hsplus
source/holoshell-network-sentinel-service.hsplus
source/holoshell-operating-turn.hsplus
source/holoshell-operator-brief.hsplus
source/holoshell-os-ui-capture.hsplus
source/holoshell-package-custody.hsplus
source/holoshell-phase1-workflows.hsplus
source/holoshell-process-health-room.hsplus
source/holoshell-readiness-evidence.hsplus
source/holoshell-receipt-control.hsplus
source/holoshell-run-custody-actions.hsplus
source/holoshell-service-supervisor.hsplus
source/holoshell-shell-render.hs
source/holoshell-shell-world.holo
source/holoshell-skin-presets.hsplus
source/holoshell-source-validation.hsplus
source/holoshell-startup-integration.hsplus
source/holoshell-trusted-autonomy.hsplus
source/holoshell-user-shell-projection.hsplus
source/holoshell-visual-witness.hsplus
source/holoshell-wild-holoscript-intake.hsplus
source/holoshell-world-build-cockpit-pipeline.hs
source/holoshell-world-build-cockpit-policy.hsplus
source/holoshell-world-build-cockpit.holo
```

**Verification receipt (generated 2026-05-18 during execution of task_1779092549879_oudm)**

- Source directory: `apps/holoshell/source/` — 65 files
- Grouped map: `docs/HOLOSHELL_SOURCE_MAP.md` (already comprehensive)
- Contract health: 7 capabilities, 5 safety gates (local HoloShell operator contract check OK)
- World-build cockpit composition: all 9 receipt sources referenced in cockpit metadata; 3 new receipt contracts (LocalFileManifest, CodexHardwareAudit, AgentLane composed into cockpit pipeline)
- All 11 cockpit source contracts pass `holoscript compile --enforce-gotchas`
- Previous state: The "Source Of Truth" and "Current Artifacts" lists in this README were stale and have been refreshed to match the actual source directory.
- Task closed when: This change is applied and the receipt is updated with the resulting Hololand commit hash.

native/windows/Start-HoloShellFounderHost.cmd
native/windows/Register-HoloShellStartup.ps1
prototype/local-capability-room.html
```

## Research Spine

HoloShell research now routes through one status snapshot, one doctrine, and
six supporting specs:

```text
docs/CODEBASE_STATUS.md
docs/HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md
docs/SHELL_OBJECT_SCHEMA.md
docs/LEGACY_APP_ADAPTER_MATRIX.md
docs/BRITTNEY_OPERATOR_SPEC.md
docs/GEOMETRIC_UI_RECONSTRUCTION.md
docs/SKIN_SIMULATION_RESEARCH.md
docs/PHASE_2_NATIVE_SHELL_ROADMAP.md
```

Read them in that order when deciding what HoloShell should become next. The
status snapshot records what the codebase currently proves. The doctrine
defines the operating-system replacement posture. The schema defines the object
grammar. The adapter matrix defines how legacy software is wrapped. The
Brittney spec defines the embodied operator. The reconstruction and skin docs
define the visual/simulation direction. The Phase 2 roadmap turns those ideas
into native shell build slices.

## Live Feed Bridge

The static Local Capability Room can now consume the same runtime feeds the
adapters write to `.tmp/holoshell/`. The host bridge is:

```text
scripts/holoshell-live-feed.mjs
```

It bundles capability inventory, HoloScript surface map, agent lanes, process
health, network reality, Founder host readiness, Brittney avatar state,
hardware action receipts, package custody receipts, run receipts, pilot
receipts, and stop plans into:

```text
.tmp/holoshell/live-feed.json
.tmp/holoshell/live-feed.js
```

The prototype loads `live-feed.js` for file-based review and falls back to
fetching `live-feed.json` when served over localhost.

## Founder Native Host

The first native-host bootstrap is source-backed by:

```text
source/holoshell-founder-host.hsplus
scripts/holoshell-founder-host.mjs
```

It writes:

```text
.tmp/holoshell/founder-host.json
.tmp/holoshell/founder-host.js
```

The native wrapper receipt is:

```text
scripts/holoshell-native-wrapper.mjs
scripts/holoshell-startup-integration.mjs
```

It writes:

```text
.tmp/holoshell/native-wrapper.json
.tmp/holoshell/native-wrapper.js
.tmp/holoshell/startup-integration.json
.tmp/holoshell/startup-integration.js
```

`pnpm run holoshell:founder-host:refresh` regenerates the startup integration,
native wrapper receipt, service supervisor, shell object graph, live feed, and
Founder host receipt in one pass. The first launcher is:

```powershell
apps\holoshell\native\windows\Start-HoloShellFounderHost.ps1 -RefreshReceipts
```

The startup bridge is plan-only unless approval is supplied:

```powershell
apps\holoshell\native\windows\Register-HoloShellStartup.ps1
apps\holoshell\native\windows\Register-HoloShellStartup.ps1 -Register -Approve
apps\holoshell\native\windows\Register-HoloShellStartup.ps1 -Unregister -Approve
```

This is a bootstrap wrapper, not OS takeover: execution stays disabled by
default, the HTML projection may not claim primary shell ownership, startup
registration is per-user only, and Explorer replacement remains blocked.

## OS UI Capture Bridge

The first legacy UI wrapper is:

```text
scripts/holoshell-os-ui-capture.mjs
```

It enumerates visible Windows surfaces, attempts UI Automation control capture,
normalizes windows and controls as shell objects, writes a generated `.holo`
geometry graph, and records a guarded action dry-run. Mutating legacy actions
are not executed by this bridge.

## Hardware Program Control

The first program registry and hardware control bridges are:

```text
scripts/holoshell-program-registry.mjs
scripts/holoshell-action-executor.mjs
scripts/holoshell-approval-bundle.mjs
scripts/holoshell-control-daemon.mjs
scripts/holoshell-room-marathon-workflow.mjs
scripts/holoshell-workflow-approval-bundle.mjs
```

The registry bridge reads Start Menu shortcuts, Windows App Paths, and captured
running windows, then writes:

```text
.tmp/holoshell/program-registry.json
.tmp/holoshell/program-registry.js
```

The action executor reads the captured window registry and program registry,
resolves program windows, installed apps, and controls, then writes receipts to:

```text
.tmp/holoshell/action-latest.json
.tmp/holoshell/action-latest.js
.tmp/holoshell/action-receipts/
```

The approval bundle bridge turns an `approval_required` hardware receipt into a
nonce-bound approval packet:

```text
.tmp/holoshell/approval-latest.json
.tmp/holoshell/approval-latest.js
.tmp/holoshell/approval-bundles/
.tmp/holoshell/workflow-approval-latest.json
.tmp/holoshell/workflow-approval-latest.js
.tmp/holoshell/workflow-approval-bundles/
```

`list_windows`, `read_window`, `read_controls`, `resolve_target`, and
`dry_run_action` are read-only. Program mutations such as `focus_window`,
`open_url`, `open_path`, `launch_app`, `hotkey`, `click_control`, `type_text`,
and `invoke_control` require either `--approved --execute` or a matching
approval bundle with `--execute`. Break-glass actions are blocked by default.

The workflow approval bridge turns the compound room-marathon workflow into a
single nonce-bound packet:

```powershell
node scripts\holoshell-workflow-approval-bundle.mjs
```

That packet records the exact approved command for the whole workflow. It still
requires the loopback daemon to be restarted with `--enable-execute` before any
program is opened or text is typed.

The local control daemon is the browser-to-hardware bridge for HoloShell:

```powershell
node scripts\holoshell-control-daemon.mjs
```

It binds to `127.0.0.1:4747`, exposes read/stage routes, and keeps execution
disabled by default. Approved mutations require restarting it with
`--enable-execute` plus a nonce-bound approval bundle.

The first compound operator workflow is the room marathon:

```powershell
node scripts\holoshell-room-marathon-workflow.mjs
```

It resolves Claude CLI, stages Terminal, types the room-marathon prompt with
the Ollama/Kimi route, opens Chrome, and opens YouTube lofi as one receipt. The
daemon exposes the same staging path at `POST /workflow/room-marathon`, mints
`workflow-approval-latest.json`, and keeps execution behind `POST
/workflow/execute`.

## Brittney Avatar Runtime

The avatar bridge is:

```text
scripts/holoshell-brittney-avatar.mjs
```

It reads the local HoloScript `@holoscript/aibrittney` package, agent-loop
source, session source, avatar traits, and voice hooks, then writes an
accessible avatar manifest to `.tmp/holoshell/brittney-avatar.json`. The
prototype consumes that manifest through `live-feed.js` and renders Brittney as
a focusable avatar with runtime, emotion, voice, and screen-reader state.

Runtime turns are bridged by:

```text
scripts/holoshell-brittney-turn.mjs
```

That script imports the built HoloScript `@holoscript/aibrittney` runtime,
routes a prompt through `runAgentTurn`, maps runtime events to avatar state,
classifies shell-object proposals, and writes:

```text
.tmp/holoshell/brittney-turn-latest.json
.tmp/holoshell/brittney-turn-latest.js
```

## HoloScript Surface Bridge

HoloShell should consume HoloScript surfaces before rebuilding tools:

- REST/API for passive health, discovery, and public status.
- MCP/RPC for typed tool manifests and authenticated tool calls.
- CLI for local, offline, hardware-proven source and runtime operations.

Those surfaces are projected into HoloShell rooms and machines by
`source/holoshell-holoscript-bridge.hsplus`. The first live adapter is
`scripts/holoshell-holoscript-surface-map.mjs`, which writes the discovered
surface map to `.tmp/holoshell/holoscript-surface-map.json`.

## Agent Presence Lanes

Active agents should make HoloShell more capable. Codex, Claude Desktop,
Claude Code/Cursor, Gemini Antigravity, Copilot/VS Code, plain shells, and
HoloMesh team presence are projected as color lanes with semantic metadata.

Color is for human scanning. Agents consume `laneId`, `agentKind`,
`surfaceKind`, `semanticPrefix`, and receipts. The first lane adapter is
`scripts/holoshell-agent-lanes.mjs`, which writes
`.tmp/holoshell/agent-lanes.json`.

## Process Health

Agents have to take care of the hardware they use. HoloShell tracks PID custody,
shell/dev runs, stale processes, high-memory pressure, and stop plans through
`source/holoshell-process-health-room.hsplus`.

The first adapter is `scripts/holoshell-process-health.mjs`, which writes
`.tmp/holoshell/process-health.json`. It is read-only by default. Stopping a
process is modeled as a break-glass action with an exact PID, reason, and
receipt.

Commands that start heavy local work should go through
`scripts/holoshell-run.mjs`. It writes run receipts and a shared registry so
HoloShell can show owner lanes, expected end times, overdue runs, and unmatched
active PIDs before agents pile more work onto the hardware.

The run wrapper also consumes `.tmp/holoshell/network-reality.json`. Package
installs, model downloads, fleet syncs, and other bandwidth-spending intents are
blocked on hotspot/metered/protective network states unless the command carries
`--owner-network-gesture` and a `--reason`.

## Legacy App Reality

Peer counts cannot come from raw PID totals. HoloShell now has a local read-only
adapter for real app/process/window truth:

```text
scripts/holoshell-legacy-app-reality.mjs
```

It writes:

```text
.tmp/holoshell/legacy-app-reality.json
```

The receipt merges the Windows process table, visible legacy window inventory,
network-connection ownership, and semantic color lanes. Brittney consumes
`agentInstanceCount`, `shellInstanceCount`, `networkConsumerCount`, `lanes`, and
`processCountIsPeerCount: false` before explaining what is actually running.
Colors are visual hints only; agents consume `laneId`, labels, role, PID, and
receipt evidence. Raw command lines and remote endpoints are excluded by default.

The adapter imports `validateHoloShellLegacyAppRealitySnapshot` from
`@holoscript/framework`. `schemaContract.validationStatus: pass` means HoloLand
is consuming the HoloScript source contract, not an invented local shape.

## HoloWeb Local Reality Node

HoloWeb starts inside HoloShell as a local reality node:

```text
scripts/holoshell-network-reality.mjs
```

It reads Windows connection cost, Wi-Fi state, VPN-like adapter state, redacted
network consumers, agent lanes, process health, and the run registry. It writes:

```text
.tmp/holoshell/network-reality.json
```

The output does not include SSID, BSSID, IP addresses, gateways, remote
endpoints, or raw command lines. Owner-declared context can override OS cost
when the operating system says `Unrestricted` but the user knows the connection
is a phone hotspot:

```powershell
node scripts\holoshell-network-reality.mjs --owner-declared-kind phone_hotspot
```

Brittney consumes the resulting policy before agents run package installs,
model downloads, large uploads, fleet syncs, or parallel network-heavy work.
Peer count comes from semantic agent lanes, not process count.

The adapter imports the canonical HoloWeb network reality validator from
`@holoscript/framework` and writes a `schemaContract` receipt into the manifest.
`schemaContract.validationStatus: pass` means the local JSON shape was validated
against the HoloScript source contract before Brittney or another agent consumes
it. If the package cannot be loaded, the manifest still writes a local protective
snapshot, but `schemaContract.validationStatus` becomes `unavailable` and
`--self-test` fails.

## Local Checks

Single HoloShell source guard from the HoloLand repo:

```powershell
pnpm run holoshell:source-validation
```

From the HoloScript repo:

```powershell
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-home.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-shell-world.holo
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-shell-render.hs
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-os-ui-capture.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-skin-presets.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-brittney-presence.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-brittney-avatar.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-brittney-runtime-bridge.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-hardware-control.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-phase1-workflows.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-holoscript-bridge.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-agent-presence-lanes.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-process-health-room.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-network-reality.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-founder-host.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-native-wrapper.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-startup-integration.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit.holo
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit-policy.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit-pipeline.hs
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-local-file-manifest.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-codex-hardware-audit.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit-policy.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-world-build-cockpit-pipeline.hs
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-brittney-device-operator.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-device-safety-lab.holo
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-device-safety-policy.hsplus
pnpm exec holoscript validate C:\Users\josep\Documents\GitHub\Hololand\apps\holoshell\source\holoshell-device-safety-pipeline.hs
```

From the HoloLand repo:

```powershell
node scripts\holoshell-capability-inventory.mjs --no-hardware-audit --redact-private --self-test
node scripts\holoshell-capability-inventory.mjs --self-test
node scripts\holoshell-holoscript-surface-map.mjs --self-test
node scripts\holoshell-holoscript-inventory.mjs --self-test
node scripts\holoshell-os-ui-capture.mjs --self-test
node scripts\holoshell-brittney-avatar.mjs --self-test
node scripts\holoshell-brittney-turn.mjs --self-test
node scripts\holoshell-program-registry.mjs --self-test
node scripts\holoshell-program-registry.mjs
node scripts\holoshell-action-executor.mjs --self-test
node scripts\holoshell-action-executor.mjs --action list_windows
node scripts\holoshell-action-executor.mjs --action list_programs
node scripts\holoshell-agent-dispatch.mjs --self-test
node scripts\__tests__\holoshell-agent-dispatch.test.mjs
node scripts\holoshell-approval-bundle.mjs --self-test
node scripts\holoshell-approval-bundle.mjs
node scripts\holoshell-workflow-approval-bundle.mjs --self-test
node scripts\holoshell-workflow-approval-bundle.mjs
node scripts\holoshell-agent-lanes.mjs --self-test
node scripts\holoshell-process-health.mjs --self-test
node scripts\holoshell-legacy-app-reality.mjs --self-test
node scripts\__tests__\holoshell-legacy-app-reality.test.mjs
node scripts\holoshell-network-reality.mjs --self-test
node scripts\__tests__\holoshell-network-reality.test.mjs
node scripts\holoshell-run.mjs --self-test
node scripts\holoshell-pilot.mjs --self-test
node scripts\holoshell-live-feed.mjs --self-test
node scripts\holoshell-founder-host.mjs --self-test
node scripts\__tests__\holoshell-founder-host.test.mjs
node scripts\holoshell-startup-integration.mjs --self-test
node scripts\__tests__\holoshell-startup-integration.test.mjs
node scripts\holoshell-native-wrapper.mjs --self-test
node scripts\__tests__\holoshell-native-wrapper.test.mjs
```

The script writes local discovery output to `.tmp/holoshell/`, which is ignored.
Do not commit unredacted local inventories.

## Visual Projection

Open the static projection when a quick non-developer surface check is useful:

```text
apps/holoshell/prototype/local-capability-room.html
```

The prototype is a visual projection of `source/holoshell-home.hsplus` and
`source/holoshell-shell-world.holo`, not the canonical behavior or visual source
layer.

## Related Spec

See:

```text
docs/specs/HOLOSHELL_HARDWARE_NATIVE_SURFACE.md
apps/holoshell/docs/CODEBASE_STATUS.md
apps/holoshell/docs/HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md
apps/holoshell/docs/PHASE_2_NATIVE_SHELL_ROADMAP.md
```
