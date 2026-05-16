# Founder Native Host

**Status:** First host bootstrap receipt

**Source:** `apps/holoshell/source/holoshell-founder-host.hsplus`

**Bridge:** `scripts/holoshell-founder-host.mjs`

The Founder native host is the bridge between the current HoloShell preview and
the future machine-startup shell.

It does not claim that HoloShell already replaces Windows at boot. It records
whether the source, receipts, preview host, services, shell objects, and live
feed are ready for a native wrapper to own the primary surface.

## Receipts

Run:

```powershell
pnpm run holoshell:founder-host
```

Outputs:

```text
.tmp/holoshell/founder-host.json
.tmp/holoshell/founder-host.js
```

The refresh form regenerates supporting local receipts first:

```powershell
pnpm run holoshell:founder-host:refresh
```

That runs the service supervisor, shell object graph, and live-feed bridge
before writing the host receipt. It still does not take over the operating
system or execute app mutations.

## Status Meaning

| Status | Meaning |
| --- | --- |
| `blocked_missing_source` | Required `.holo`, `.hs`, or `.hsplus` source is missing. |
| `needs_receipt_refresh` | Source is present, but shell objects or live feed are missing or stale. |
| `ready_for_native_wrapper` | The preview host, source, receipts, and service state are coherent enough to build the native wrapper. |
| `native_host_present` | A future native wrapper target exists and is visible to the receipt. |

## Boundary

The host receipt is read-only by default. Startup registration, service starts,
workflow execution, app mutation, and daemon execute mode remain guarded or
break-glass actions handled by their own approval receipts.

The current primary surface is still `preview_only`. The next real build is the
native wrapper that can start HoloShell without manually opening HTML.
