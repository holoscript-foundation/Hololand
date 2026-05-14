# Legacy App Absorption

**Status:** HoloShell operating layer  
**Date:** 2026-05-14  
**Source:** `apps/holoshell/source/holoshell-legacy-app-absorption.hsplus`  
**Adapter:** `scripts/holoshell-legacy-app-absorption.mjs`

## Decision

HoloShell should absorb legacy applications by observing and wrapping them
before operating them.

A visible Windows app becomes a HoloShell object with:

- app name
- archetype
- sample PIDs
- visible window count
- peer window count
- safe read-only actions
- blocked mutation actions
- required MCP preflight tool
- receipt hash

This lets a non-developer user understand “Edge is visible, Explorer is
visible, Settings is dangerous to change” without reading a process list.

## Run It

```powershell
pnpm run holoshell:hardware-reality
pnpm run holoshell:legacy-windows
pnpm run holoshell:legacy-apps
```

Output:

```text
.tmp/holoshell/legacy-app-absorption.json
.tmp/holoshell/legacy-app-absorption.js
```

## Archetypes

| Archetype | Examples | Default safe actions |
| --- | --- | --- |
| `browser` | Edge, Chrome, Firefox | observe, capture, summarize tabs |
| `file_manager` | Explorer | observe, capture, summarize visible folder |
| `settings_panel` | Windows Settings | observe and summarize only |
| `automation_bridge` | WebView/native host helpers | observe and classify |
| `developer_ide` | Code, Cursor | observe, capture, summarize workspace |
| `unknown_legacy_app` | everything else | observe, capture, classify |

## Mutation Rule

No legacy mutation is allowed from this layer.

Changing an app requires:

1. `holoshell_preflight_legacy_app_mutation`
2. app identity
3. window identity
4. mutation scope
5. before snapshot
6. rollback plan
7. receipt

## Brittney Rule

Brittney may recommend read-only capture or classification. Brittney must not
change app settings, click destructive UI, alter registry values, uninstall
apps, close windows, or submit forms without the legacy-app MCP preflight.

For peer counts, Brittney should prefer `legacy-window-inventory.json` and the
`peerSurfaces[].windowInstanceCount` values. Process counts are still shown as a
health signal, not as the number of peer windows the user can see.
