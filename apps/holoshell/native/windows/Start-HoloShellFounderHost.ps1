#Requires -Version 5.1
[CmdletBinding()]
param(
  [string]$RepoRoot,
  [string]$BrowserPath,
  [string]$ProfileDir,
  [switch]$RefreshReceipts,
  [switch]$NoLaunch,
  [switch]$Kiosk
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  param([string]$ProvidedRoot)
  if ($ProvidedRoot) {
    return (Resolve-Path -LiteralPath $ProvidedRoot).Path
  }
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..\..\..')).Path
}

function Find-Browser {
  param([string]$ExplicitPath)
  $candidates = @(
    $ExplicitPath,
    $env:CHROME,
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }
  throw 'No Chrome or Edge executable was found for the HoloShell wrapper.'
}

function Convert-ToFileUri {
  param([string]$Path)
  $resolved = (Resolve-Path -LiteralPath $Path).Path
  return ([System.Uri]$resolved).AbsoluteUri
}

$root = Resolve-RepoRoot -ProvidedRoot $RepoRoot
$tmpDir = Join-Path $root '.tmp\holoshell'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

if (-not $ProfileDir) {
  $ProfileDir = Join-Path $tmpDir 'native-profile'
}
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

if ($RefreshReceipts) {
  & node (Join-Path $root 'scripts\holoshell-startup-integration.mjs') | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'Startup integration receipt refresh failed.' }
  & node (Join-Path $root 'scripts\holoshell-native-wrapper.mjs') | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'Native wrapper receipt refresh failed.' }
  & node (Join-Path $root 'scripts\holoshell-founder-host.mjs') --refresh | Out-Host
  if ($LASTEXITCODE -ne 0) { throw 'Founder host receipt refresh failed.' }
}

$surfacePath = Join-Path $root 'apps\holoshell\prototype\local-capability-room.html'
$surfaceUri = Convert-ToFileUri -Path $surfacePath
$browser = Find-Browser -ExplicitPath $BrowserPath
$arguments = @(
  "--app=$surfaceUri",
  "--user-data-dir=$ProfileDir",
  '--no-first-run',
  '--disable-translate'
)
if ($Kiosk) {
  $arguments += '--kiosk'
}

$launchedProcess = $null
if (-not $NoLaunch) {
  $launchedProcess = Start-Process -FilePath $browser -ArgumentList $arguments -PassThru
}

$browserName = Split-Path -Leaf $browser
$receipt = [ordered]@{
  schemaVersion = 'hololand.holoshell.native-wrapper-launch.v0.1.0'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  sourceAnchors = [ordered]@{
    launcher = 'apps/holoshell/native/windows/Start-HoloShellFounderHost.ps1'
    wrapperReceipt = '.tmp/holoshell/native-wrapper.json'
    founderHostReceipt = '.tmp/holoshell/founder-host.json'
    surface = 'apps/holoshell/prototype/local-capability-room.html'
  }
  summary = [ordered]@{
    status = if ($NoLaunch) { 'dry_run' } else { 'launched' }
    launchMode = if ($Kiosk) { 'chromium_kiosk_app_mode' } else { 'chromium_app_mode' }
    browserFamily = if ($browserName -like 'msedge*') { 'edge' } else { 'chrome' }
    processId = if ($launchedProcess) { $launchedProcess.Id } else { 0 }
    startupRegistered = $false
    localMutationExecutionEnabled = $false
    surface = 'apps/holoshell/prototype/local-capability-room.html'
  }
  policy = [ordered]@{
    localOnly = $true
    appModeOnly = $true
    startupRegistrationRequiresApproval = $true
    daemonExecuteDisabledByDefault = $true
    destructiveActionsAllowed = $false
    rawBrowserPathIncluded = $false
  }
  receipt = [ordered]@{
    launchPerformed = -not [bool]$NoLaunch
    startupRegistered = $false
    destructiveActionsTaken = $false
    rawCommandLineIncluded = $false
  }
}

$receiptPath = Join-Path $tmpDir 'native-wrapper-launch.json'
$receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptPath -Encoding UTF8
Write-Host "HoloShell native wrapper launch receipt: $receiptPath"
Write-Host "Status: $($receipt.summary.status)"
Write-Host "Browser: $($receipt.summary.browserFamily)"
Write-Host "Surface: $($receipt.summary.surface)"
