# HoloShell Native Wrapper

This directory is the first native wrapper target for Founder HoloShell.

It is intentionally small: the Windows launcher opens the current HoloShell
projection as a local app-mode surface, refreshes receipts when requested, and
leaves all hardware mutation behind existing approval and daemon boundaries.

It is not boot-time OS takeover yet. Startup registration and Explorer shell
replacement remain future approved actions with separate receipts.

Run from the repo root:

```powershell
node scripts\holoshell-native-wrapper.mjs
apps\holoshell\native\windows\Start-HoloShellFounderHost.ps1 -RefreshReceipts
```

The wrapper readiness receipt is written to:

```text
.tmp/holoshell/native-wrapper.json
.tmp/holoshell/native-wrapper.js
```
