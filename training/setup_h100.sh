#!/bin/bash
# Brittney V14 Training Setup for H100 NVL
# Vast.ai Instance: 172.172.52.178:7928

set -e

echo "=============================================="
echo "BRITTNEY V14 - H100 NVL Training Setup"
echo "=============================================="

# Create directories
mkdir -p /workspace/brittney-v14
mkdir -p /workspace/brittney-loras

# Install dependencies
echo "[1/5] Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install --quiet transformers>=4.36.0 accelerate>=0.25.0 peft>=0.7.0 bitsandbytes>=0.41.0 datasets>=2.16.0

echo "[2/5] Downloading base model..."
python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
print('Downloading Phi-3.5-mini-instruct...')
tokenizer = AutoTokenizer.from_pretrained('microsoft/Phi-3.5-mini-instruct', trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained('microsoft/Phi-3.5-mini-instruct', trust_remote_code=True, torch_dtype='auto')
print('Model downloaded successfully!')
"

echo "[3/5] Verifying GPU..."
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
"

echo "[4/5] Checking training data..."
if [ -f /workspace/brittney-v14/curriculum_easy.jsonl ]; then
    echo "Training data found:"
    wc -l /workspace/brittney-v14/curriculum_*.jsonl
else
    echo "WARNING: Training data not found! Please upload curriculum files to /workspace/brittney-v14/"
fi

echo "[5/5] Setup complete!"
echo ""
echo "=============================================="
echo "NEXT STEPS:"
echo "=============================================="
echo "1. Upload training data:"
echo "   scp -P 7928 training/curriculum/*.jsonl root@172.172.52.178:/workspace/brittney-v14/"
echo ""
echo "2. Upload training script:"
echo "   scp -P 7928 training/train_v14.py root@172.172.52.178:/workspace/"
echo ""
echo "3. Start training:"
echo "   cd /workspace && python train_v14.py"
echo ""
echo "4. Monitor training:"
echo "   tail -f /workspace/brittney-v14-training.log"
echo "=============================================="
