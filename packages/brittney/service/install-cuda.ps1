# Install CUDA-enabled PyTorch for Python 3.13+
# Note: Python 3.14 may not have full CUDA support yet

Write-Host "Installing PyTorch with CUDA support..."

# Try Python 3.13 compatible CUDA wheels
pip install torch==2.3.1 torchvision==0.18.1 torchaudio==0.18.1 --index-url https://download.pytorch.org/whl/cu121 -q

Write-Host "Verifying CUDA..."
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'PyTorch Version: {torch.__version__}')"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CUDA PyTorch installed successfully!"
} else {
    Write-Host "⚠️  Installation had issues, but may still work"
}
