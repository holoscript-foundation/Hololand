# Founder Native Host

**Status:** First host bootstrap receipt

**Source:** `apps/holoshell/source/holoshell-founder-host.hsplus`

**Bridge:** `scripts/holoshell-founder-host.mjs`

**Native wrapper bridge:** `scripts/holoshell-native-wrapper.mjs`

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

The wrapper receipt records whether the Windows app-mode launcher, command shim,
preview host, and local browser surface are present:

```powershell
node scripts\holoshell-native-wrapper.mjs
```

The first launcher is:

```powershell
apps\holoshell\native\windows\Start-HoloShellFounderHost.ps1 -RefreshReceipts
```

The refresh form regenerates supporting local receipts first:

```powershell
pnpm run holoshell:founder-host:refresh
```

That runs the native wrapper receipt, service supervisor, shell object graph,
and live-feed bridge before writing the host receipt. It still does not take
over the operating system or execute app mutations.

## Status Meaning

| Status | Meaning |
| --- | --- |
| `blocked_missing_source` | Required `.holo`, `.hs`, or `.hsplus` source is missing. |
| `needs_receipt_refresh` | Source is present, but shell objects or live feed are missing or stale. |
| `ready_for_native_wrapper` | The preview host, source, receipts, and service state are coherent enough to build the native wrapper. |
| `native_host_present` | A future native wrapper target exists and is visible to the receipt. |

Native wrapper statuses:

| Status | Meaning |
| --- | --- |
| `blocked_missing_source` | Wrapper source, launcher, command shim, or preview host is missing. |
| `wrapper_present_browser_missing` | Wrapper files exist, but Chrome/Edge was not found for app-mode launch. |
| `launchable_wrapper_present` | Wrapper files exist and a local Chromium-family browser can launch HoloShell in app mode. |

## Boundary

The host receipt is read-only by default. Startup registration, service starts,
workflow execution, app mutation, and daemon execute mode remain guarded or
break-glass actions handled by their own approval receipts.

The current primary surface is still a `native_wrapper_candidate`, not a boot
replacement. The next real build is approved startup integration.
