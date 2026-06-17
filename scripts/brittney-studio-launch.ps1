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

param([switch]$Headless)  # OPTIONAL: boot the stack but don't open the UI surfaces (APIs-only).
                          # NOTE: opening a browser to actually use a surface is FINE for anyone
                          # incl. agents (open -> use -> close). The real Desktop anti-pattern is
                          # FLASHING windows / program-output windows — handled by -WindowStyle
                          # Hidden on the SERVICE spawns below, not by refusing to open a browser.

$ErrorActionPreference = 'SilentlyContinue'
$Hololand    = Split-Path -Parent $PSScriptRoot           # repo root (this file is in scripts/)
$OperatePort = 8747
$JetsonTags  = 'http://holojetson.local:11434/api/tags'
$HoloScript  = Join-Path (Split-Path -Parent $Hololand) 'HoloScript'  # sibling repo — Studio lives here
$StudioPort  = 3101                                                   # Studio /create = BrittneyPlus (building)

function Test-LocalPort([int]$Port) {
  $c = New-Object Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', $Port); $true } catch { $false } finally { $c.Close() }
}

# 0) Self-install the desktop icon if missing — so running this once (you OR an agent) gives
#    everyone easy click-access. Idempotent; never overwrites an existing shortcut.
$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Brittney Studio.lnk'
if (-not (Test-Path $lnk)) {
  try {
    $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
    $s.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $s.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`""
    $s.WorkingDirectory = $Hololand
    $icon = Join-Path $HoloScript 'packages\tauri-app\src-tauri\icons\icon.ico'
    if (Test-Path $icon) { $s.IconLocation = $icon }
    $s.Description = 'Brittney & Daimon (manage) + BrittneyPlus (build)'
    $s.Save()
  } catch {}
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

# 5) Building surface — BrittneyPlus lives in Studio /create. Start Studio hidden if offline
#    (Next dev is heavy; it warms in the background), so the build assistant is ready when you switch.
$studio = 'Studio OFF'
if (Test-LocalPort $StudioPort) {
  $studio = "Studio OK :$StudioPort"
} elseif (-not $Headless -and (Test-Path (Join-Path $HoloScript 'packages\studio'))) {
  Start-Process pnpm -ArgumentList '--filter', '@holoscript/studio', 'dev' -WorkingDirectory $HoloScript -WindowStyle Hidden
  $studio = "Studio warming :$StudioPort"
}

# 6) Open BOTH surfaces (skip only with -Headless / APIs-only): management = Brittney & Daimon
#    (operate-room :8747, local-by-design); building = BrittneyPlus (Studio /create).
if (-not $Headless) {
  Start-Process "http://localhost:$OperatePort"
  Start-Process "http://localhost:$StudioPort/create"
}

Write-Host "[Brittney Studio] $jetson | $room | $studio | Brittney+Daimon (manage) + BrittneyPlus (build) | Fleet scale-to-zero (`$0)"

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
