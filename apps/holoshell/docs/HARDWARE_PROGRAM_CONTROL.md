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
scripts/holoshell-room-marathon-workflow.mjs
scripts/holoshell-workflow-approval-bundle.mjs
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
```

The live-feed bridge consumes the latest action and exposes it to the prototype
as `feed.feeds.hardwareAction`. It also consumes the launchable app registry as
`feed.feeds.programRegistry`, the materialized shell object graph as
`feed.feeds.shellObjects`, and the latest approval packet as
`feed.feeds.hardwareApproval`. Compound workflows are exposed as
`feed.feeds.workflow` and their nonce-bound approval packet as
`feed.feeds.workflowApproval`.

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
POST /action
POST /approval/execute
POST /workflow/room-marathon
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

Stage the first compound Brittney operator workflow:

```powershell
node scripts\holoshell-room-marathon-workflow.mjs
```

That stages:

- Resolve Claude CLI.
- Open Windows Terminal.
- Type a Claude `/room marathon` prompt with `ollama_cloud/kimi-cloud`.
- Submit the terminal command.
- Open Chrome.
- Open a YouTube lofi stream.

The same workflow is available through the daemon:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:4747/workflow/room-marathon" -Method Post -ContentType "application/json" -Body '{"model":"kimi-cloud","modelRoute":"ollama_cloud"}'
```

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
node scripts\holoshell-room-marathon-workflow.mjs --self-test
node scripts\holoshell-workflow-approval-bundle.mjs --self-test
```

## Next Build Gaps

- Native app registry beyond currently running windows.
- Stable per-app adapters for common programs.
- UI Automation invoke patterns instead of coordinate fallback where available.
- Screenshot and OCR witness capture for before/after state.
- Native execution button wiring from the prototype to the loopback daemon.
- HoloScript compiler target that emits the Tauri or native bridge from this
  contract.
