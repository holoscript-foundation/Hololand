# HoloShell OS UI Capture Bridge

This is the first bridge for reconstructing legacy UI as HoloShell geometry.

It is intentionally read-only by default. HoloShell can inspect visible windows, normalize them into shell objects, generate a HoloScript graph, and plan a guarded action route without clicking or typing into legacy apps.

## Source Contract

```text
apps/holoshell/source/holoshell-os-ui-capture.hsplus
```

The source contract defines:

- `CapturedWindowSurface`
- `CapturedControlShard`
- `LegacyGeometryNode`
- `LegacyActionReceipt`
- read-only capture policy
- guarded legacy action policy
- break-glass legacy action policy

## Adapter

```powershell
node scripts\holoshell-os-ui-capture.mjs --self-test
node scripts\holoshell-os-ui-capture.mjs --target-app chrome
```

The adapter writes:

```text
.tmp/holoshell/os-ui-capture.json
.tmp/holoshell/os-ui-capture.holo
.tmp/holoshell/os-ui-capture.js
```

The JSON is the receipt and normalized shell-object inventory. The generated `.holo` file is the geometric wrapper for the selected foreground/top window. The browser bootstrap lets the HoloShell prototype consume the capture through the live feed.

When no `--target-app` is provided, the adapter reads
`.tmp/holoshell/legacy-app-absorption.json` and selects the first recommended
legacy capture candidate, currently Chrome when a browser is visible. That
keeps Brittney's "first move" connected to the real app surface instead of
reconstructing whichever agent or terminal window happened to be focused.

If Win32/UIAutomation cannot return the target window in the rich capture, the
adapter resolves the target from `legacy-window-inventory.json` and emits an
inventory-backed geometric placeholder. The receipt distinguishes
`rich_capture`, `legacy_window_inventory`, and `foreground_fallback` so Brittney
knows how much direct UI evidence she has.

Each captured window is enriched with the legacy absorption policy:

- app archetype and surface role
- safe read-only actions
- blocked mutation actions
- mutation policy and preflight tool
- selected reconstruction flag
- guarded action dry-run envelope

## What The First Slice Proves

- Visible OS windows can become shell objects.
- UI Automation controls can become intent-addressable control shards when available.
- A selected legacy window can be reconstructed as 1000+ geometric nodes.
- The future action bridge can name the target and permission envelope without mutating the desktop.
- Brittney receives a compact legacy UI summary through `brittney-context.json`.

## Current Local Result

Latest local self-test captured:

```text
10 windows
143 controls
1265 geometry nodes
route_planned action bridge dry-run
```

The selected foreground surface was reconstructed into `.tmp/holoshell/os-ui-capture.holo`.

## Gaps Are Build Targets

1. Promote the capture schema upstream to HoloScript.
2. Add screenshot hash and OCR fallback for weak accessibility trees.
3. Add an approved click/type/hotkey adapter with receipts and rollback notes.
4. Render the generated graph in live R3F/WebGPU, not only as generated source.
5. Add macOS and Android capture adapters behind the same source contract.
