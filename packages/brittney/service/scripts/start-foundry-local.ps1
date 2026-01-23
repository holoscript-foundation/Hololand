# Start Foundry Local with Brittney model

$configPath = "$env:USERPROFILE\.foundry-local\config.json"

if (-not (Test-Path $configPath)) {
    Write-Host "Config not found. Running setup first..." -ForegroundColor Yellow
    & "$PSScriptRoot\setup-foundry-local.ps1"
}

Write-Host "Starting Foundry Local server..." -ForegroundColor Cyan
Write-Host "API: http://localhost:5272/v1/chat/completions" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start Foundry Local
foundry-local serve --config $configPath
