<#
.SYNOPSIS
    Installs the Brittney Native Messaging Host for Chrome/Edge

.DESCRIPTION
    This script registers the native messaging host with Chrome and Edge browsers.
    The host enables communication between the Hololand DevTools extension and 
    IDE agents (VS Code, Cursor, etc.) via the MCP server.

.PARAMETER ExtensionId
    The Chrome extension ID (found in chrome://extensions after loading the extension)

.EXAMPLE
    .\install-host.ps1 -ExtensionId "abcdefghijklmnopqrstuvwxyz123456"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ExtensionId
)

$ErrorActionPreference = "Stop"

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManifestSource = Join-Path $ScriptDir "com.hololand.brittney.json"
$HostBat = Join-Path $ScriptDir "brittney-host.bat"

# Read and update manifest with extension ID
$Manifest = Get-Content $ManifestSource -Raw | ConvertFrom-Json
$Manifest.allowed_origins = @("chrome-extension://$ExtensionId/")
$Manifest.path = $HostBat

# Create manifest in a temp location first
$TempManifest = Join-Path $env:TEMP "com.hololand.brittney.json"
$Manifest | ConvertTo-Json -Depth 10 | Set-Content $TempManifest -Encoding UTF8

Write-Host "Installing Brittney Native Messaging Host..." -ForegroundColor Cyan

# Chrome registry path
$ChromeKey = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.hololand.brittney"

# Edge registry path  
$EdgeKey = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.hololand.brittney"

# Install for Chrome
try {
    if (-not (Test-Path (Split-Path $ChromeKey))) {
        New-Item -Path (Split-Path $ChromeKey) -Force | Out-Null
    }
    New-Item -Path $ChromeKey -Force | Out-Null
    Set-ItemProperty -Path $ChromeKey -Name "(Default)" -Value $TempManifest
    Write-Host "  ✓ Registered with Chrome" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Chrome registration failed: $_" -ForegroundColor Yellow
}

# Install for Edge
try {
    if (-not (Test-Path (Split-Path $EdgeKey))) {
        New-Item -Path (Split-Path $EdgeKey) -Force | Out-Null
    }
    New-Item -Path $EdgeKey -Force | Out-Null
    Set-ItemProperty -Path $EdgeKey -Name "(Default)" -Value $TempManifest
    Write-Host "  ✓ Registered with Edge" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Edge registration failed: $_" -ForegroundColor Yellow
}

# Copy manifest to final location
$FinalManifest = Join-Path $ScriptDir "com.hololand.brittney.installed.json"
Copy-Item $TempManifest $FinalManifest -Force

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart Chrome/Edge"
Write-Host "  2. Open a page with Hololand"
Write-Host "  3. Open DevTools (F12) → 'Brittney' tab"
Write-Host ""
Write-Host "Manifest installed at: $FinalManifest" -ForegroundColor Gray
