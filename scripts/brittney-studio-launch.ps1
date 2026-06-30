#requires -version 5
<#
  brittney-studio-launch.ps1
  One-click "Brittney live + HoloShell operate-room canvas" — the REAL launcher for THIS
  stack (replaces the generic LiteLLM/.desktop draft, which targeted a different system).

  $0 BY DESIGN:
    * Jetson (sovereign local qwen3:4b @ holojetson.local:11434) is the local brain (model-policy LOCAL default).
    * Messages land on the Jetson-hosted Brittney/HoloShell surface first.
    * The laptop is the reasoning workstation: Codex/HoloMesh peers inspect, decide,
      validate, and act through HoloShell + HoloMesh while the Jetson keeps the live surface.
    * The Vast fleet is SCALE-TO-ZERO — the serving autoscaler warms a box only on real
      inference demand and drains it on idle. NOTHING is provisioned at launch. No spend.
    * "Claude-level depth" is the model-policy CLOUD default (claude-opus-4-8) and is OPT-IN
      Anthropic-API SPEND — NOT wired here. Escalation is a model-policy config, not a launch flag.

  SAFE BY DESIGN: idempotent (starts only what's offline, no EADDRINUSE), hidden by default
  (no terminal pop), delegates daemon management to the existing receipt-anchored supervisor
  (F.101).

  Run:  powershell -ExecutionPolicy Bypass -File scripts\brittney-studio-launch.ps1
  (Pin a desktop shortcut to that command — see the README block at the bottom.)
#>

param(
  [switch]$Headless,    # OPTIONAL: boot the stack but don't open the UI surfaces (APIs-only).
  [switch]$NoTerminal,  # OPTIONAL: open the browser only; skip the laptop receipt freshness watcher.
  [switch]$OperatorTerminal # OPTIONAL: also open the persistent read-only operator terminal.
)
                          # NOTE: opening a browser to actually use a surface is FINE for anyone
                          # incl. agents (open -> use -> close). The real Desktop anti-pattern is
                          # FLASHING windows / program-output windows — handled by -WindowStyle
                          # Hidden on the SERVICE spawns below, not by refusing to open a browser.

$ErrorActionPreference = 'SilentlyContinue'
$Hololand    = Split-Path -Parent $PSScriptRoot           # repo root (this file is in scripts/)
$OperatePort = 8747
$JetsonTags  = 'http://holojetson.local:11434/api/tags'
$JetsonSurface = 'http://holojetson.local:8747'  # Jetson-HOSTED Brittney surface (systemd holoshell-surface)
$HoloScript  = Join-Path (Split-Path -Parent $Hololand) 'HoloScript'  # sibling repo — Studio lives here
$StudioPort  = 3101                                                   # Studio /create = BrittneyPlus (building)

function Test-LocalPort([int]$Port) {
  $c = New-Object Net.Sockets.TcpClient
  try { $c.Connect('127.0.0.1', $Port); $true } catch { $false } finally { $c.Close() }
}

function Quote-PowerShellSingle([string]$Value) {
  "'" + ($Value -replace "'", "''") + "'"
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

Write-Host '[Brittney Studio] the laptop is a SCREEN for the Jetson (founder 2026-06-17)...'

# The Jetson is the sovereign node — it HOSTS the Brittney surface itself (systemd
# holoshell-surface, always-on, $0: brain + agents + surface all on the Jetson). This
# launcher does not start a laptop Brittney serve; the laptop provides deeper
# reasoning, validation, and HoloMesh/HoloShell actions from its agent seats while it
# displays the Jetson.
# (Studio — the heavy Next.js build IDE — is a separate dev tool launched on its own,
# not part of this screen; it cannot run on the 8GB Jetson alongside the model.)

# 1) Jetson sovereign local brain reachable?
$jetson = 'Jetson sovereign local brain OFF (LAN)'
try { if (Invoke-RestMethod -Uri $JetsonTags -TimeoutSec 4) { $jetson = 'Jetson sovereign local brain OK' } } catch {}

# 2) Jetson-hosted Brittney surface reachable?
$surfaceUp = $false
try { $surfaceUp = (Invoke-WebRequest -Uri "$JetsonSurface/" -TimeoutSec 6 -UseBasicParsing).StatusCode -eq 200 } catch {}
if (-not $surfaceUp) {
  Write-Host "[Brittney Studio] Jetson surface UNREACHABLE at $JetsonSurface."
  Write-Host '  It is a systemd service on the Jetson. If the Jetson is on, restart it:'
  Write-Host "    ssh -i `$HOME\.ssh\jetson_ed25519 username@holojetson.local 'sudo systemctl restart holoshell-surface'"
}

# 3) Open the screen onto the Jetson (skip with -Headless / APIs-only).
if (-not $Headless) { Start-Process $JetsonSurface }

# 4) Keep the paired read-only laptop receipts fresh. This stays hidden by default so desktop
#    shortcuts and agent-triggered launches do not create surprise terminal windows. A visible,
#    persistent operator terminal is still available with -OperatorTerminal.
$RefreshOperatorReceipt = (-not $Headless) -and (-not $NoTerminal)
$ShowOperatorTerminal = $RefreshOperatorReceipt -and $OperatorTerminal
if ($OperatorTerminal -and $NoTerminal) {
  Write-Host '[Brittney Studio] -NoTerminal supplied; skipping visible operator terminal.'
}

if ($RefreshOperatorReceipt) {
  $repo = Quote-PowerShellSingle $Hololand
  $watchCommand = @"
Set-Location $repo
New-Item -ItemType Directory -Force .tmp\holoshell | Out-Null
Write-Host '[Brittney Studio] starting read-only receipt freshness watcher...'
if ((Test-Path (Join-Path (Get-Location) 'scripts\holoshell-laptop-receipt-freshness.mjs')) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  node scripts\holoshell-laptop-receipt-freshness.mjs --watch --interval-ms 60000 --timeout-ms 60000 --json *> .tmp\holoshell\laptop-receipt-freshness-watch.log
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
  `$env:CI = 'true'
  pnpm run holoshell:laptop-receipt-freshness -- --watch --interval-ms 60000 --timeout-ms 60000 --json *> .tmp\holoshell\laptop-receipt-freshness-watch.log
} else {
  corepack pnpm run holoshell:laptop-receipt-freshness -- --watch --interval-ms 60000 --timeout-ms 60000 --json *> .tmp\holoshell\laptop-receipt-freshness-watch.log
}
"@
  Start-Process powershell.exe -WorkingDirectory $Hololand -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    $watchCommand
  )

  if ($ShowOperatorTerminal) {
    $terminalCommand = @"
Set-Location $repo
Write-Host '[Brittney Studio] browser cockpit: $JetsonSurface'
Write-Host '[Brittney Studio] read-only receipt freshness watcher: .tmp/holoshell/laptop-receipt-freshness-watch.log'
if ((Test-Path (Join-Path (Get-Location) 'scripts\holoshell-operator-terminal.mjs')) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  node scripts\holoshell-operator-terminal.mjs
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
  `$env:CI = 'true'
  pnpm run holoshell:operator-terminal
} else {
  corepack pnpm run holoshell:operator-terminal
}
Write-Host ''
Write-Host '[Brittney Studio] receipt: .tmp/holoshell/operator-terminal.json'
"@
    Start-Process powershell.exe -WorkingDirectory $Hololand -WindowStyle Normal -ArgumentList @(
      '-NoExit',
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      $terminalCommand
    )
  }
}

Write-Host "[Brittney Studio] surface: $(if($surfaceUp){'OK'}else{'DOWN'}) ($JetsonSurface) | $jetson | brain+agents+surface all on the Jetson (`$0)"

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

  Double-click "Brittney Studio" -> the whole $0 hybrid comes up hidden, opens the HoloShell
  canvas, and keeps the laptop receipts fresh without a visible terminal. Add -OperatorTerminal
  to the shortcut arguments when you explicitly want the persistent terminal projection.
  (An F9 global hotkey needs AutoHotkey or the shortcut's "Shortcut key" field.)
  -------------------------------------------------------------------------------------------
#>
