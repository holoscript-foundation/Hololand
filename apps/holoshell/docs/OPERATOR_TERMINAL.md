# HoloShell Operator Terminal

**Status:** Production terminal spine
**Source:** `apps/holoshell/source/holoshell-operator-terminal.hsplus`
**Adapter:** `scripts/holoshell-operator-terminal.mjs`

The operator terminal is the non-browser projection of HoloShell. It gives
non-developer humans a calm command surface and gives agents a canonical JSON
receipt without creating a separate dashboard.

## Shape

HoloShell remains the operating shell. The terminal is a projection over the
same receipts:

```text
HoloShell receipts
-> operator brief
-> service supervisor
-> agent lanes
-> readiness evidence
-> operator terminal receipt
```

The default route is now sovereign-first:

```text
Jetson hosts Brittney + HoloShell surface
Laptop supplies validation and desktop bridge actions
Owned local/LAN inference routes serve agent work when receipts prove readiness
External provider-specific lanes are not terminal product dependencies
```

## Human Mode

Human mode hides developer grammar by default. The first commands are:

- Ask Brittney
- Check System
- Build World
- Show Agents
- Review Approvals
- Show Receipts

The terminal can still expose exact commands in the receipt, but the visible
surface starts from outcomes and approval state instead of package-manager or
JSON language.

Each label routes to an existing HoloShell flow:

| Label | Flow | Receipt |
| --- | --- | --- |
| Ask Brittney | Brittney turn | `.tmp/holoshell/brittney-turn-latest.json` |
| Check System | Service manager status | `.tmp/holoshell/service-supervisor.json` |
| Build World | World build custody with workflow approval when mutation is needed | `.tmp/holoshell/build-custody.json` |
| Show Agents | Agent lanes | `.tmp/holoshell/agent-lanes.json` |
| Review Approvals | Workflow/hardware approval review | `.tmp/holoshell/workflow-approval-latest.json` |
| Show Receipts | Receipt control | `.tmp/holoshell/receipt-control-latest.json` |

Run:

```powershell
pnpm run holoshell:operator-terminal
```

Route a label without executing its downstream adapter:

```powershell
pnpm run holoshell:operator-terminal -- --label "Ask Brittney" --prompt "What needs attention?"
```

The human output names the selected flow, target, approval state, and receipt.
The hidden agent receipt carries adapter paths and developer commands for
automation.

## Agent Mode

Agent mode is machine-readable and receipt-first:

```powershell
node scripts/holoshell-operator-terminal.mjs --agent --json
```

Agents should consume `.tmp/holoshell/operator-terminal.json` before touching
apps, terminals, services, approvals, or agent lanes. Missing upstream receipts
are blockers or caveats, not permission to invent state.

## Refresh Order

When the terminal says receipts are missing or stale, refresh the existing
HoloShell sources first:

```powershell
pnpm run holoshell:hardware-reality
pnpm run holoshell:build-custody
pnpm run holoshell:run-custody
pnpm run holoshell:legacy-windows
pnpm run holoshell:legacy-apps
pnpm run holoshell:readiness-evidence
pnpm run holoshell:operator-brief
pnpm run holoshell:service-supervisor
pnpm run holoshell:laptop-desktop-bridge -- --status
node scripts\holoshell-live-feed.mjs
pnpm run holoshell:operator-terminal
```

## Production Rule

The terminal does not become a private state store. It only reads canonical
HoloShell receipts and emits its own receipt:

```text
.tmp/holoshell/operator-terminal.json
.tmp/holoshell/operator-terminal.js
```

Mutating actions still route through HoloShell approvals, service managers,
desktop bridge consent, and receipt control.
