# Brittney Native Messaging Host Installer for Windows
# Run as Administrator

param(
    [string]$ExtensionId,
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$HostName = "com.hololand.brittney"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageDir = Split-Path -Parent $ScriptDir
$DistDir = Join-Path $PackageDir "dist"
$HostPath = Join-Path $DistDir "native-messaging-host.js"
$ManifestPath = Join-Path $DistDir "com.hololand.brittney.json"
$BatchPath = Join-Path $DistDir "brittney-host.bat"

# Registry path for Chrome Native Messaging
$RegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"

function Write-Info($message) {
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[SUCCESS] $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

function Install-NativeHost {
    Write-Info "Installing Brittney Native Messaging Host..."

    # Verify dist directory exists
    if (-not (Test-Path $DistDir)) {
        Write-Error "dist directory not found. Please run 'pnpm build' first."
        exit 1
    }

    # Verify host script exists
    if (-not (Test-Path $HostPath)) {
        Write-Error "native-messaging-host.js not found in dist. Please run 'pnpm build' first."
        exit 1
    }

    # Create batch wrapper (Chrome needs an executable)
    $NodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $NodePath) {
        Write-Error "Node.js not found. Please install Node.js and add to PATH."
        exit 1
    }

    $BatchContent = "@echo off`r`n`"$NodePath`" `"$HostPath`" %*"
    Set-Content -Path $BatchPath -Value $BatchContent -Encoding ASCII
    Write-Info "Created batch wrapper: $BatchPath"

    # Create manifest with actual extension ID
    if (-not $ExtensionId) {
        Write-Info "No extension ID provided. Using placeholder."
        Write-Info "After installing the extension, run with -ExtensionId <id> to update."
        $ExtensionId = "EXTENSION_ID_PLACEHOLDER"
    }

    $Manifest = @{
        name = $HostName
        description = "Brittney MCP Native Messaging Host - Connects IDE agents to Hololand DevTools"
        path = $BatchPath
        type = "stdio"
        allowed_origins = @("chrome-extension://$ExtensionId/")
    }

    $Manifest | ConvertTo-Json | Set-Content -Path $ManifestPath -Encoding UTF8
    Write-Info "Created manifest: $ManifestPath"

    # Register in Windows Registry
    if (-not (Test-Path (Split-Path $RegistryPath))) {
        New-Item -Path (Split-Path $RegistryPath) -Force | Out-Null
    }
    New-Item -Path $RegistryPath -Force | Out-Null
    Set-ItemProperty -Path $RegistryPath -Name "(Default)" -Value $ManifestPath
    Write-Info "Registered in registry: $RegistryPath"

    Write-Success "Installation complete!"
    Write-Host ""
    Write-Host "Extension ID: $ExtensionId" -ForegroundColor Yellow
    Write-Host "Manifest Path: $ManifestPath" -ForegroundColor Yellow
    Write-Host "Registry Path: $RegistryPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. Load the extension in Chrome (chrome://extensions)"
    Write-Host "2. Copy the extension ID"
    Write-Host "3. Run: .\install-windows.ps1 -ExtensionId <your-extension-id>"
    Write-Host "4. Restart Chrome"
}

function Uninstall-NativeHost {
    Write-Info "Uninstalling Brittney Native Messaging Host..."

    # Remove registry entry
    if (Test-Path $RegistryPath) {
        Remove-Item -Path $RegistryPath -Force
        Write-Info "Removed registry entry"
    }

    # Remove files
    if (Test-Path $ManifestPath) {
        Remove-Item -Path $ManifestPath -Force
        Write-Info "Removed manifest"
    }

    if (Test-Path $BatchPath) {
        Remove-Item -Path $BatchPath -Force
        Write-Info "Removed batch wrapper"
    }

    Write-Success "Uninstallation complete!"
}

# Main
if ($Uninstall) {
    Uninstall-NativeHost
} else {
    Install-NativeHost
}
