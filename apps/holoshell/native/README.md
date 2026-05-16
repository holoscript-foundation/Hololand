# HoloShell Native Wrapper

This directory is the first native wrapper target for Founder HoloShell.

It is intentionally small: the Windows launcher opens the current HoloShell
projection as a local app-mode surface, refreshes receipts when requested, and
leaves all hardware mutation behind existing approval and daemon boundaries.

It is not boot-time OS takeover yet. Per-user startup registration now has an
approval-gated bridge; Explorer shell replacement remains a future native plan.

Run from the repo root:

```powershell
node scripts\holoshell-native-wrapper.mjs
node scripts\holoshell-startup-integration.mjs
apps\holoshell\native\windows\Start-HoloShellFounderHost.ps1 -RefreshReceipts
```

Plan, register, or unregister the per-user startup shortcut:

```powershell
apps\holoshell\native\windows\Register-HoloShellStartup.ps1
apps\holoshell\native\windows\Register-HoloShellStartup.ps1 -Register -Approve
apps\holoshell\native\windows\Register-HoloShellStartup.ps1 -Unregister -Approve
```

The wrapper readiness receipt is written to:

```text
.tmp/holoshell/native-wrapper.json
.tmp/holoshell/native-wrapper.js
.tmp/holoshell/startup-integration.json
.tmp/holoshell/startup-integration.js
```
