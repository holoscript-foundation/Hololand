# Legacy Window Inventory

**Status:** real peer-window feed
**Date:** 2026-05-14
**Source:** `apps/holoshell/source/holoshell-legacy-window-inventory.hsplus`
**Adapter:** `scripts/holoshell-legacy-window-inventory.mjs`

## Decision

Peer instance counts must come from real top-level windows, not process counts.
HoloShell now captures a read-only Win32 `EnumWindows` inventory and feeds it
to legacy absorption, the operator brief, Brittney, and the hardware room.

The inventory stores:

- visible window count
- app window groups
- AI peer surface window counts
- shell surface window counts
- combined operating surface counts
- opaque window ids
- title hashes and semantic title labels

It does not expose raw window titles in the browser feed.

## Run It

```powershell
pnpm run holoshell:legacy-windows
```

Output:

```text
.tmp/holoshell/legacy-window-inventory.json
.tmp/holoshell/legacy-window-inventory.js
```

## Brittney Rule

Brittney should use `peerSurfaces[].windowInstanceCount` for AI peer presence
claims. Terminal and PowerShell windows live under `shellSurfaces[]`; they
enhance HoloShell, but they are not counted as agent peers. PID counts remain
useful for health and custody, but they are not the number of visible agent
windows.

Current summary fields:

- `peerWindowCount` / `aiPeerWindowCount`: AI peers, model runtimes, and AI workbenches.
- `shellWindowCount`: terminal and shell-control surfaces.
- `operatingSurfaceWindowCount`: AI peers plus shell surfaces.

## Safety

This adapter is observe-only. It never clicks, closes, focuses, or mutates a
window. Legacy window mutation still requires HoloShell legacy app preflight,
rollback intent, approval, and receipt.
