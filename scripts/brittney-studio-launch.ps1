#requires -version 5
<#
  brittney-studio-launch.ps1
  One-click "Brittney live + HoloShell operate-room canvas" — the REAL launcher for THIS
  stack (replaces the generic LiteLLM/.desktop draft, which targeted a different system).

  $0 BY DESIGN:
    * Jetson (qwen3:4b @ holojetson.local:11434) is the local brain (model-policy LOCAL default).
    * The Vast fleet is SCALE-TO-ZERO — the serving autoscaler warms a box only on real
      inference demand and drains it on idle. NOTHING is provisioned at launch. No spend.
    * "Claude-level depth" is the model-policy CLOUD default (claude-opus-4-8) and is OPT-IN
      Anthropic-API SPEND — NOT wired here. Escalation is a model-policy config, not a launch flag.

  SAFE BY DESIGN: idempotent (starts only what's offline, no EADDRINUSE), hidden (no windows
  pop), delegates daemon management to the existing receipt-anchored supervisor (F.101).

  Run:  powershell -ExecutionPolicy Bypass -File scripts\brittney-studio-launch.ps1
  (Pin a desktop shortcut to that command — see the README block at the bottom.)
#>

$ErrorActionPreference = 'SilentlyContinue'
$Hololand    = Split-Path -Parent $PSScriptRoot           # repo root (this file is in scripts/)
$OperatePort = 8747
$JetsonTags  = 'http://holojetson.local:11434/api/tags'

function Test-LocalPort([int]$Port) {
  $c = New-Object Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', $Port); $true } catch { $false } finally { $c.Close() }
}

Write-Host '[Brittney Studio] booting the $0 hybrid (Jetson anchor + scale-to-zero fleet)...'

# 1) Jetson anchor — the local brain. CHECK only; it runs headless-always-on, never started here.
$jetson = 'Jetson OFF (LAN) - router falls back to fleet/cloud per model-policy'
try { if (Invoke-RestMethod -Uri $JetsonTags -TimeoutSec 4) { $jetson = 'Jetson OK (qwen3:4b)' } } catch {}

# 2) HoloShell operate-room (:8747) — compile + serve IF offline (idempotent -> no EADDRINUSE).
if (-not (Test-LocalPort $OperatePort)) {
  & node (Join-Path $Hololand 'packages\holoshell\compile.mjs') | Out-Null
  Start-Process node -ArgumentList 'packages\holoshell\serve.mjs' `
    -WorkingDirectory $Hololand -WindowStyle Hidden
  Start-Sleep -Milliseconds 1500
}
$room = if (Test-LocalPort $OperatePort) { "operate-room OK :$OperatePort" } else { 'operate-room FAILED' }

# 3) Brittney — native agent (Jetson-routed = $0). Start IF not already running.
$running = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*start-brittney*' }
if (-not $running) {
  Start-Process pnpm -ArgumentList 'brittney' -WorkingDirectory $Hololand -WindowStyle Hidden
}

# 4) HoloShell daemons — ENSURE via the existing receipt-anchored supervisor (don't reinvent
#    process management). Starts-when-offline, PID-tracked, never grants execute by default.
Start-Process pnpm -ArgumentList 'holoshell:service-supervisor:ensure' `
  -WorkingDirectory $Hololand -WindowStyle Hidden

# 5) Drop into the HoloShell canvas — the one visible step, founder-initiated (opens once).
Start-Process "http://localhost:$OperatePort"

Write-Host "[Brittney Studio] $jetson | $room | Brittney live (local, `$0) | Fleet scale-to-zero"

<#
  -------------------------------------------------------------------------------------------
  MAKE THE ONE-CLICK DESKTOP ICON (run once, in PowerShell):

    $ws = New-Object -ComObject WScript.Shell
    $lnk = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Brittney Studio.lnk")
    $lnk.TargetPath  = "powershell.exe"
    $lnk.Arguments   = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$($PWD)\scripts\brittney-studio-launch.ps1`""
    $lnk.WorkingDirectory = "$PWD"
    $lnk.IconLocation = "$PWD\packages\holoshell\dist\brittney.ico"   # optional; any .ico
    $lnk.Save()

  Double-click "Brittney Studio" -> the whole $0 hybrid comes up hidden and the HoloShell
  canvas opens. (An F9 global hotkey needs AutoHotkey or the shortcut's "Shortcut key" field.)
  -------------------------------------------------------------------------------------------
#>
