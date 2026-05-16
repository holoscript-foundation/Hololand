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

The source artifacts are:

```text
source/holoshell-home.hsplus
source/holoshell-shell-world.holo
source/holoshell-shell-render.hs
source/holoshell-os-ui-capture.hsplus
source/holoshell-skin-presets.hsplus
source/holoshell-brittney-presence.hsplus
source/holoshell-brittney-avatar.hsplus
source/holoshell-brittney-runtime-bridge.hsplus
source/holoshell-hardware-control.hsplus
source/holoshell-network-reality.hsplus
source/holoshell-founder-host.hsplus
source/holoshell-native-wrapper.hsplus
```

`holoshell-home.hsplus` owns behavior, channels, permissions, receipts, and
Brittney actions. `holoshell-shell-world.holo` owns the visual shell graph:
liquid world, launch bubbles, skins, assistant presence, and evidence underlay.
`holoshell-shell-render.hs` is the first simple renderable skin slice.
`holoshell-os-ui-capture.hsplus`, `holoshell-skin-presets.hsplus`,
`holoshell-brittney-presence.hsplus`, `holoshell-brittney-avatar.hsplus`, and
`holoshell-brittney-runtime-bridge.hsplus`
define the first source contracts for legacy UI wrapping, shell skins,
Brittney-as-presence, Brittney's accessible embodied avatar, and runtime turns.
`holoshell-hardware-control.hsplus` defines the program-control contract:
read-only awareness by default, guarded execution for mutations, and receipts
for every action.
`holoshell-network-reality.hsplus` defines the HoloWeb Local Reality Node:
connection truth, owner-declared hotspot/metered context, bandwidth protection,
and redacted network-consumer evidence for Brittney.
`holoshell-founder-host.hsplus` defines the native Founder host bootstrap:
the safe bridge between the current preview surface, local services, shell
objects, the live feed, and the future native wrapper.
`holoshell-native-wrapper.hsplus` defines the first OS-local launcher boundary:
start HoloShell from Windows app mode, do not claim boot takeover, and keep
startup registration behind approval.

HTML is only a projection or host preview. Do not add hand-authored TypeScript
behavior before the HoloScript source contract is named. Future desktop bridge
code should be generated, upstreamed, or explicitly marked as bridge-only
migration debt.

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

## Current Artifacts

```text
source/holoshell-home.hsplus
source/holoshell-shell-world.holo
source/holoshell-shell-render.hs
source/holoshell-phase1-workflows.hsplus
source/holoshell-holoscript-bridge.hsplus
source/holoshell-agent-presence-lanes.hsplus
source/holoshell-process-health-room.hsplus
source/holoshell-os-ui-capture.hsplus
source/holoshell-skin-presets.hsplus
source/holoshell-brittney-presence.hsplus
source/holoshell-brittney-avatar.hsplus
source/holoshell-brittney-runtime-bridge.hsplus
source/holoshell-hardware-control.hsplus
source/holoshell-network-reality.hsplus
source/holoshell-founder-host.hsplus
source/holoshell-native-wrapper.hsplus
schemas/capability-inventory.schema.json
samples/capability-inventory.sample.json
docs/PHASE_1_ROADMAP.md
docs/CODEBASE_STATUS.md
docs/ABSORPTION_PILOTS.md
docs/AGENT_PRESENCE_COLOR_LANES.md
docs/BRITTNEY_OPERATOR_SPEC.md
docs/HOLOSCRIPT_SURFACE_BRIDGE.md
docs/HOLOSCRIPT_INCLUSION_INVENTORY.md
docs/HOLOSHELL_OS_REPLACEMENT_DOCTRINE.md
docs/SHELL_OBJECT_SCHEMA.md
docs/LEGACY_APP_ADAPTER_MATRIX.md
docs/GEOMETRIC_UI_RECONSTRUCTION.md
docs/OS_UI_CAPTURE_BRIDGE.md
docs/BRITTNEY_AVATAR_RUNTIME.md
docs/HARDWARE_PROGRAM_CONTROL.md
docs/LEGACY_ABSORPTION_ARCHETYPES.md
docs/PROCESS_SHELL_RUN_HEALTH.md
docs/SKIN_SIMULATION_RESEARCH.md
docs/PHASE_2_NATIVE_SHELL_ROADMAP.md
docs/FOUNDER_NATIVE_HOST.md
native/windows/Start-HoloShellFounderHost.ps1
native/windows/Start-HoloShellFounderHost.cmd
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
hardware action receipts, run receipts, pilot receipts, and stop plans into:

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
```

It writes:

```text
.tmp/holoshell/native-wrapper.json
.tmp/holoshell/native-wrapper.js
```

`pnpm run holoshell:founder-host:refresh` regenerates the native wrapper
receipt, service supervisor, shell object graph, live feed, and Founder host
receipt in one pass. The first launcher is:

```powershell
apps\holoshell\native\windows\Start-HoloShellFounderHost.ps1 -RefreshReceipts
```

This is a bootstrap wrapper, not OS takeover: execution stays disabled by
default, the HTML projection may not claim primary shell ownership, and startup
integration requires an explicit approval path.

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
