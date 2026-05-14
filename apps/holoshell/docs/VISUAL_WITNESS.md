# HoloShell Visual Witness

**Status:** local browser fallback
**Source:** `apps/holoshell/source/holoshell-visual-witness.hsplus`
**Adapter:** `scripts/holoshell-visual-witness.mjs`

## Decision

HoloShell room verification must not depend on a single agent browser surface.
If the HoloScript MCP browser cannot launch because its bundled Playwright
browser is missing, Codex can still use the host Chrome, Edge, or Chromium
binary to produce a local screenshot and rendered DOM receipt.

## Command

```powershell
pnpm run holoshell:visual-witness
```

Outputs:

```text
.tmp/holoshell/visual-witness.json
.tmp/holoshell/visual-witness.js
.tmp/holoshell/visual-witness/*.png
.tmp/holoshell/visual-witness/*.dom.html
```

## Contract

The witness is read-only. It captures:

- screenshot path, byte size, and SHA-256 hash
- rendered DOM path and SHA-256 hash
- expected visible text checks
- browser executable used for the proof
- safety flags showing no destructive actions, process termination, app
  mutation, or raw command exposure

The default Hardware Reality Room checks for visible `HoloShell Hardware
Reality`, `Brittney Queue`, `Visual Witness`, `Shell Custody`, and `Run
Custody` text.
