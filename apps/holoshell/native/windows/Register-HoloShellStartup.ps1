#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$RepoRoot,
  [string]$StartupName = 'HoloShell Founder Host',
  [switch]$Register,
  [switch]$Unregister,
  [switch]$Approve,
  [switch]$PlanOnly,
  [switch]$RefreshReceipts
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  param([string]$ProvidedRoot)
  if ($ProvidedRoot) {
    return (Resolve-Path -LiteralPath $ProvidedRoot).Path
  }
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..\..')).Path
}

function Get-SafeShortcutName {
  param([string]$Name)
  $safeName = $Name
  foreach ($character in [System.IO.Path]::GetInvalidFileNameChars()) {
    $safeName = $safeName.Replace([string]$character, '-')
  }
  if (-not $safeName.Trim()) {
    $safeName = 'HoloShell Founder Host'
  }
  return "$safeName.lnk"
}

function Get-StringSha256 {
  param([string]$Value)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function New-HoloShellStartupShortcut {
  param(
    [string]$ShortcutPath,
    [string]$LauncherPath,
    [string]$RepoRootPath
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = (Join-Path $PSHOME 'powershell.exe')
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`" -RepoRoot `"$RepoRootPath`" -RefreshReceipts"
  $shortcut.WorkingDirectory = $RepoRootPath
  $shortcut.Description = 'Start Founder HoloShell at user login'
  $shortcut.Save()
}

if ($Register -and $Unregister) {
  throw 'Use either -Register or -Unregister, not both.'
}

$root = Resolve-RepoRoot -ProvidedRoot $RepoRoot
$tmpDir = Join-Path $root '.tmp\holoshell'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

if ($RefreshReceipts) {
  & node (Join-Path $root 'scripts\holoshell-startup-integration.mjs') | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'Startup integration receipt refresh failed.' }
}

$launcherPath = Join-Path $root 'apps\holoshell\native\windows\Start-HoloShellFounderHost.ps1'
$startupFolder = [Environment]::GetFolderPath('Startup')
if (-not $startupFolder) {
  throw 'Windows Startup folder was not available for the current user.'
}

$shortcutName = Get-SafeShortcutName -Name $StartupName
$shortcutPath = Join-Path $startupFolder $shortcutName
$registeredBefore = Test-Path -LiteralPath $shortcutPath
$launcherPresent = Test-Path -LiteralPath $launcherPath
$approvedMutation = [bool]$Approve -and -not [bool]$PlanOnly
$requestedAction = if ($Register) { 'register' } elseif ($Unregister) { 'unregister' } else { 'plan' }
$mutationTaken = $false

if (($Register -or $Unregister) -and -not $approvedMutation) {
  $status = 'approval_required'
} elseif ($Register) {
  if (-not $launcherPresent) {
    throw 'Native HoloShell launcher is missing.'
  }
  New-HoloShellStartupShortcut -ShortcutPath $shortcutPath -LauncherPath $launcherPath -RepoRootPath $root
  $mutationTaken = $true
  $status = 'registered_at_user_login'
} elseif ($Unregister) {
  if ($registeredBefore) {
    Remove-Item -LiteralPath $shortcutPath -Force
    $mutationTaken = $true
  }
  $status = 'unregistered'
} else {
  $status = if ($registeredBefore) { 'registered_at_user_login' } else { 'plan_ready' }
}

$registeredAfter = Test-Path -LiteralPath $shortcutPath
$receipt = [ordered]@{
  schemaVersion = 'hololand.holoshell.startup-registration.v0.1.0'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  sourceAnchors = [ordered]@{
    source = 'apps/holoshell/source/holoshell-startup-integration.hsplus'
    registrationScript = 'apps/holoshell/native/windows/Register-HoloShellStartup.ps1'
    nativeLauncher = 'apps/holoshell/native/windows/Start-HoloShellFounderHost.ps1'
    startupReceipt = '.tmp/holoshell/startup-integration.json'
  }
  summary = [ordered]@{
    status = $status
    requestedAction = $requestedAction
    startupIntegrationPresent = $true
    startupMode = 'windows_user_startup_shortcut'
    startupRegisteredBefore = $registeredBefore
    startupRegisteredAfter = $registeredAfter
    startupRegistered = $registeredAfter
    startupFolderKind = 'current_user_startup'
    shortcutName = $shortcutName
    shortcutPathHash = Get-StringSha256 -Value $shortcutPath
    launcherPresent = $launcherPresent
    approvalRequired = $true
    approvalSupplied = [bool]$Approve
    mutationTaken = $mutationTaken
    localMutationExecutionEnabled = $false
  }
  policy = [ordered]@{
    perUserStartupOnly = $true
    machineWideStartupBlocked = $true
    explorerShellReplacementBlocked = $true
    registrationRequiresExplicitApproval = $true
    destructiveActionsAllowed = $false
    rawLocalPathDisclosureBlocked = $true
  }
  receipt = [ordered]@{
    registrationPerformed = $mutationTaken
    startupRegistered = $registeredAfter
    destructiveActionsTaken = $false
    rawCommandLineIncluded = $false
    rawStartupPathIncluded = $false
  }
}

$receiptPath = Join-Path $tmpDir 'startup-registration.json'
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
Write-Host "HoloShell startup registration receipt: $receiptPath"
Write-Host "Status: $($receipt.summary.status)"
Write-Host "Requested action: $requestedAction"
Write-Host "Startup registered: $($receipt.summary.startupRegistered)"
