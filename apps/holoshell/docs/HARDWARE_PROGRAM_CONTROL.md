# HoloShell Hardware Program Control

HoloShell is not only a visual replacement for the desktop. It must be able to
wrap and operate the programs already running on the computer.

The source contract is:

```text
apps/holoshell/source/holoshell-hardware-control.hsplus
```

The first local executor is:

```text
scripts/holoshell-program-registry.mjs
scripts/holoshell-shell-objects.mjs
scripts/holoshell-action-executor.mjs
scripts/holoshell-approval-bundle.mjs
scripts/holoshell-control-daemon.mjs
scripts/holoshell-agent-dispatch.mjs
scripts/holoshell-founder-command.mjs
scripts/holoshell-room-marathon-workflow.mjs
scripts/holoshell-holoclaw-runtime-bridge.mjs
scripts/holoshell-workflow-approval-bundle.mjs
scripts/holoshell-package-custody.mjs
```

## Contract

HoloShell treats hardware control as three permission envelopes:

- `read_only`: enumerate windows, read captured controls, resolve targets, and
  plan an action.
- `guarded_execute`: focus a window, launch/open a target, send a hotkey, click
  a control, type text, or invoke a control. Requires `--approved --execute`.
- `break_glass`: secrets, payment, publishing, deletion, install/uninstall, and
  system settings. Blocked by default.

Every action writes a receipt. A read-only receipt is still a receipt because it
proves what HoloShell saw before it offered to act.

Package-manager install/update is a dedicated break-glass custody lane. The
visible product source is `apps/holoshell/source/holoshell-package-custody.hsplus`;
the reusable validator is upstream in
`packages/framework/src/board/holoshell-package-mutation-receipt.ts`.

## Receipt Outputs

```text
.tmp/holoshell/action-latest.json
.tmp/holoshell/action-latest.js
.tmp/holoshell/action-receipts/
.tmp/holoshell/program-registry.json
.tmp/holoshell/program-registry.js
.tmp/holoshell/shell-objects.json
.tmp/holoshell/shell-objects.js
.tmp/holoshell/approval-latest.json
.tmp/holoshell/approval-latest.js
.tmp/holoshell/approval-bundles/
.tmp/holoshell/workflow-latest.json
.tmp/holoshell/workflow-latest.js
.tmp/holoshell/workflows/
.tmp/holoshell/workflow-approval-latest.json
.tmp/holoshell/workflow-approval-latest.js
.tmp/holoshell/workflow-approval-bundles/
.tmp/holoshell/agent-dispatch-latest.json
.tmp/holoshell/agent-dispatch-latest.js
.tmp/holoshell/agent-dispatches/
.tmp/holoshell/holoclaw-runtime-bridge-latest.json
.tmp/holoshell/holoclaw-runtime-bridge-latest.js
.tmp/holoshell/founder-command-latest.json
.tmp/holoshell/founder-command-latest.js
.tmp/holoshell/founder-commands/
.tmp/holoshell/package-custody-latest.json
.tmp/holoshell/package-custody-latest.js
.tmp/holoshell/package-custody-receipts/
```

The live-feed bridge consumes the latest action and exposes it to the prototype
as `feed.feeds.hardwareAction`. It also consumes the launchable app registry as
`feed.feeds.programRegistry`, the materialized shell object graph as
`feed.feeds.shellObjects`, and the latest approval packet as
`feed.feeds.hardwareApproval`. Compound workflows are exposed as
`feed.feeds.workflow` and their nonce-bound approval packet as
`feed.feeds.workflowApproval`.
Package custody is exposed as `feed.feeds.packageCustody`; it shows package id,
version change, admin requirement, rollback limits, validator status, and that
execution remains blocked until a future native approval gate supports it.

## Current Action Surface

Read-only actions:

```text
list_windows
list_programs
read_window
read_controls
resolve_target
dry_run_action
```

Guarded actions:

```text
focus_window
launch_app
open_url
open_path
hotkey
click_control
type_text
invoke_control
```

Break-glass actions:

```text
enter_secret
send_message
delete_file
publish
pay
install
uninstall
system_settings
```

## Local Commands

Refresh the launchable app registry:

```powershell
node scripts\holoshell-program-registry.mjs
```

Materialize apps, running windows, agents, workflows, approvals, and receipts
as HoloShell objects:

```powershell
node scripts\holoshell-shell-objects.mjs
```

Read the local program registry:

```powershell
node scripts\holoshell-action-executor.mjs --action list_windows
node scripts\holoshell-action-executor.mjs --action list_programs
```

Plan a guarded focus without touching the machine:

```powershell
node scripts\holoshell-action-executor.mjs --action focus_window --window-title Codex
```

Execute a guarded focus after explicit user approval:

```powershell
node scripts\holoshell-action-executor.mjs --action focus_window --window-title Codex --approved --execute
```

Plan an app launch without touching the machine:

```powershell
node scripts\holoshell-action-executor.mjs --action launch_app --app Chrome
```

Stage a package update approval packet without touching the machine:

```powershell
node scripts\holoshell-package-custody.mjs --from-winget-blender-fixture
```

Dry-run package-manager adapters normalize the command preview and preflight
shape for `winget`, `pnpm`, `npm`, MSI, and EXE installers. They emit
`adapterPlan` inside the package mutation receipt and do not run package manager
mutations:

```powershell
node scripts\holoshell-package-custody.mjs --manager pnpm --mutation upgrade --package-id typescript --source npm_registry --current-version 5.8.0 --available-version 5.9.3 --json
node scripts\holoshell-package-custody.mjs --manager msi --mutation install --package-id Vendor.Tool --source local_installer --installer-hash fixture-msi-sha256 --json
```

The package custody bridge intentionally does not execute `winget install`,
`winget upgrade`, `pnpm update`, `npm install`, MSI/EXE installer commands, or
uninstall commands. It records the exact package/source, command preview,
network/admin/process preflight, and rollback limits so HoloShell can render a
stable approval object instead of letting an agent mutate the machine from an
ambient shell command.

Create a nonce-bound approval packet for the latest guarded action:

```powershell
node scripts\holoshell-approval-bundle.mjs
```

The generated packet contains the exact bounded command needed to execute the
action through `--approval-bundle`, `--approval-id`, and `--approval-nonce`.
That command should only be run after an explicit user gesture in HoloShell.

Start the loopback browser-to-hardware bridge:

```powershell
node scripts\holoshell-control-daemon.mjs
```

Default routes:

```text
GET  /health
GET  /feed
GET  /registry
GET  /action/latest
GET  /approval/latest
GET  /workflow/latest
GET  /workflow/approval/latest
GET  /workflow/founder-command/latest
GET  /workflow/holoclaw-runtime-bridge/latest
GET  /dispatch/latest
POST /action
POST /approval/execute
POST /workflow/agent-dispatch
POST /workflow/room-marathon
POST /workflow/holoclaw-runtime-bridge
POST /workflow/founder-command
POST /workflow/approval
POST /workflow/execute
```

By default the daemon can stage actions and mint approval bundles, but it cannot
execute mutations. To permit a user-approved mutation, restart it explicitly:

```powershell
node scripts\holoshell-control-daemon.mjs --enable-execute
```

`POST /approval/execute` still requires the approval id, nonce, and
`confirm: "execute"` body. The browser surface should treat this as the native
gesture gate, not as an ambient permission.

## Prototype Approval Review

`apps/holoshell/prototype/local-capability-room.html` now renders the latest
hardware or workflow approval as an explicit approval object. The review shows:

- approval text, target, risk, id, and expiry;
- daemon status and whether `--enable-execute` is active;
- the exact command preview from the nonce-bound bundle;
- an execute button that stays disabled unless the daemon is online, execute
  mode is enabled, the approval is unexpired, and the relevant gate allows it.

The prototype can call:

```text
POST /approval/execute
POST /workflow/execute
```

but only with the approval id, nonce, and `confirm: "execute"`. With the daemon
in default mode, the UI shows the approval packet and blocks execution. This is
the intended safe behavior for a HoloShell surface that can operate real
programs.

Stage the first compound Brittney operator workflow:

```powershell
node scripts\holoshell-room-marathon-workflow.mjs
```

Stage a plain-language Brittney dispatch:

```powershell
node scripts\holoshell-agent-dispatch.mjs --intent "launch Codex locally"
```

Or ask the daemon to translate and stage the matching guarded adapter:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4747/workflow/agent-dispatch -ContentType application/json -Body (@{ intent = "open Excel" } | ConvertTo-Json)
```

Dispatch does not execute anything directly. It writes
`.tmp/holoshell/agent-dispatch-latest.json`, chooses a route such as
`/workflow/room-marathon`, `/workflow/holoclaw-runtime-bridge`,
`/workflow/laptop-reasoning-job`, `/workflow/founder-command`, or `/action`, and
then the selected adapter writes the normal approval bundle.

Stage the HoloClaw runtime bridge without running an agent tick:

```powershell
node scripts\holoshell-holoclaw-runtime-bridge.mjs --intent "run HoloClaw locally" --runtime-mode tick --agent-handle holoclaw --json
```

Or stage it through the daemon:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4747/workflow/holoclaw-runtime-bridge -ContentType application/json -Body (@{ intent = "run HoloClaw locally as the OpenClaw and NemoClaw replacement"; runtimeMode = "tick"; agentHandle = "holoclaw" } | ConvertTo-Json)
```

HoloClaw is the runtime path here. OpenClaw and NemoClaw may appear only as
replacement references in receipts; the bridge blocks them as runtime backends.

Stage the full Founder command receipt:

```powershell
node scripts\holoshell-founder-command.mjs
```

Or stage it through the daemon:

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:4747/workflow/founder-command -ContentType application/json -Body (@{ intent = "Brittney, open terminal, start a sovereign room marathon for local-tagged tasks, open a browser, and play lofi music on YouTube" } | ConvertTo-Json)
```

The Founder command bridge is the demo-level receipt: it joins
`intent -> plan -> approval -> trust_gate -> launcher -> receipt` across agent
dispatch, the sovereign room marathon workflow, approval bundle, brain
intent gate, and live feed.

That stages:

- Resolve the sovereign room scripts.
- Open Windows Terminal.
- Type a local HoloMesh room starter for the selected `local` or `cloud` task tag.
- Submit the terminal command.
- Open Chrome.
- Open a YouTube lofi stream.

The same workflow is available through the daemon:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:4747/workflow/room-marathon" -Method Post -ContentType "application/json" -Body '{"taskLane":"local","taskTag":"local"}'
```

Stage cloud-tagged room work only when the room task is already tagged for it:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:4747/workflow/room-marathon" -Method Post -ContentType "application/json" -Body '{"taskLane":"cloud","taskTag":"cloud","cloudEscalationAllowed":true}'
```

Cloud-tagged work remains a room classification, not a default provider route.

Create a nonce-bound approval packet for the staged workflow:

```powershell
node scripts\holoshell-workflow-approval-bundle.mjs
```

The packet includes an approval id, nonce, expiry, and exact `node
scripts\holoshell-room-marathon-workflow.mjs ... --execute-workflow` command.
The daemon can also mint it with `POST /workflow/approval`.

Execute is deliberately two-gated: the daemon must be restarted with
`--enable-execute`, and `POST /workflow/execute` must include the matching
approval id, nonce, and `confirm: "execute"`.

Run fixture checks:

```powershell
node scripts\holoshell-action-executor.mjs --self-test
node scripts\holoshell-program-registry.mjs --self-test
node scripts\holoshell-shell-objects.mjs --self-test
node scripts\holoshell-approval-bundle.mjs --self-test
node scripts\holoshell-control-daemon.mjs --self-test
node scripts\holoshell-agent-dispatch.mjs --self-test
node scripts\holoshell-founder-command.mjs --self-test
node scripts\holoshell-room-marathon-workflow.mjs --self-test
node scripts\holoshell-holoclaw-runtime-bridge.mjs --self-test
node scripts\holoshell-workflow-approval-bundle.mjs --self-test
node scripts\holoshell-laptop-reasoning-worker.mjs --self-test
```

## Next Build Gaps

- Native app registry beyond currently running windows.
- Stable per-app adapters for common programs.
- UI Automation invoke patterns instead of coordinate fallback where available.
- Screenshot and OCR witness capture for before/after state.
- More robust app-specific UI Automation adapters for Claude, browsers, and
  office apps after the approval gate fires.
- HoloScript compiler target that emits the Tauri or native bridge from this
  contract.
