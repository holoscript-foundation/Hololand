# Brittney V14 - Upload and Train on H100 NVL
# Vast.ai Instance: 172.172.52.178:7928

$H100_HOST = "172.172.52.178"
$H100_PORT = "7928"
$H100_USER = "root"

Write-Host "=============================================="
Write-Host "BRITTNEY V14 - Upload to H100 NVL"
Write-Host "=============================================="

# Step 1: Create workspace directory
Write-Host "[1/4] Creating workspace directories..."
ssh -p $H100_PORT "$H100_USER@$H100_HOST" "mkdir -p /workspace/brittney-v14 /workspace/brittney-loras"

# Step 2: Upload training data
Write-Host "[2/4] Uploading curriculum training data..."
scp -P $H100_PORT training/v14_combined/*.jsonl "$H100_USER@${H100_HOST}:/workspace/brittney-v14/"

# Step 3: Upload training script
Write-Host "[3/4] Uploading training script..."
scp -P $H100_PORT training/train_v14.py "$H100_USER@${H100_HOST}:/workspace/"

# Step 4: Upload and run setup script
Write-Host "[4/4] Uploading setup script..."
scp -P $H100_PORT training/setup_h100.sh "$H100_USER@${H100_HOST}:/workspace/"

Write-Host ""
Write-Host "=============================================="
Write-Host "FILES UPLOADED SUCCESSFULLY!"
Write-Host "=============================================="
Write-Host ""
Write-Host "Connect to instance and start training:"
Write-Host "  ssh -p $H100_PORT $H100_USER@$H100_HOST"
Write-Host ""
Write-Host "Then run:"
Write-Host "  chmod +x /workspace/setup_h100.sh"
Write-Host "  /workspace/setup_h100.sh"
Write-Host "  cd /workspace && python train_v14.py"
Write-Host ""
Write-Host "Monitor training:"
Write-Host "  tail -f /workspace/brittney-v14-training.log"
Write-Host "=============================================="
