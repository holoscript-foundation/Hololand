# Foundry Local Setup Script for Brittney
# Enables offline inference with the Brittney fine-tuned model

param(
    [string]$ModelAlias = "brittney",
    [string]$ModelPath = "",
    [int]$Port = 5272
)

Write-Host "=== Foundry Local Setup for Brittney ===" -ForegroundColor Cyan

# Check if Foundry Local is installed
$foundryPath = "$env:LOCALAPPDATA\FoundryLocal\foundry-local.exe"
if (-not (Test-Path $foundryPath)) {
    Write-Host "Foundry Local not found. Installing..." -ForegroundColor Yellow

    # Install via winget if available
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Microsoft.FoundryLocal
    } else {
        Write-Host "Please install Foundry Local from: https://github.com/microsoft/foundry-local" -ForegroundColor Red
        Write-Host "Or via winget: winget install Microsoft.FoundryLocal" -ForegroundColor Yellow
        exit 1
    }
}

# Check if model path provided
if (-not $ModelPath) {
    # Look for common locations
    $possiblePaths = @(
        "$env:USERPROFILE\.hololand\models\brittney-q4_k_m.gguf",
        "$env:USERPROFILE\.lmstudio\models\brittney\brittney-q4_k_m.gguf",
        ".\models\brittney-q4_k_m.gguf"
    )

    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $ModelPath = $path
            Write-Host "Found model at: $ModelPath" -ForegroundColor Green
            break
        }
    }

    if (-not $ModelPath) {
        Write-Host "No model found. Please specify -ModelPath or train the model first." -ForegroundColor Red
        Write-Host "Training: python train-brittney-local.py" -ForegroundColor Yellow
        Write-Host "Convert:  python convert-to-gguf.py" -ForegroundColor Yellow
        exit 1
    }
}

# Create Foundry Local config
$configDir = "$env:USERPROFILE\.foundry-local"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$config = @{
    models = @{
        $ModelAlias = @{
            path = $ModelPath
            context_length = 8192
            gpu_layers = 35
        }
    }
    server = @{
        port = $Port
        host = "127.0.0.1"
    }
    logging = @{
        level = "info"
    }
} | ConvertTo-Json -Depth 4

$configPath = "$configDir\config.json"
$config | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "Config written to: $configPath" -ForegroundColor Green

# Update Hololand config to enable Foundry Local
$hololandConfigPath = "$env:USERPROFILE\.hololand\config.json"
if (Test-Path $hololandConfigPath) {
    $hololandConfig = Get-Content $hololandConfigPath | ConvertFrom-Json

    # Add Foundry Local settings
    $hololandConfig | Add-Member -NotePropertyName "foundryLocal" -NotePropertyValue @{
        enabled = $true
        endpoint = "http://localhost:$Port"
        modelAlias = $ModelAlias
    } -Force

    $hololandConfig | ConvertTo-Json -Depth 4 | Out-File -FilePath $hololandConfigPath -Encoding UTF8
    Write-Host "Updated Hololand config with Foundry Local settings" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start Foundry Local:" -ForegroundColor Yellow
Write-Host "  foundry-local serve --config `"$configPath`"" -ForegroundColor White
Write-Host ""
Write-Host "Or use the start script:" -ForegroundColor Yellow
Write-Host "  .\start-foundry-local.ps1" -ForegroundColor White
Write-Host ""
Write-Host "API Endpoint: http://localhost:$Port/v1/chat/completions" -ForegroundColor Green
Write-Host "Model Alias:  $ModelAlias" -ForegroundColor Green
