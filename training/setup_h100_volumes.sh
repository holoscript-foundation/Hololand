#!/bin/bash
# Brittney V14 Training Setup for H100 NVL with Volumes
# Vast.ai Instance with persistent storage

set -e

echo "=============================================="
echo "BRITTNEY V14 - H100 NVL Training Setup"
echo "=============================================="

# Vast.ai volumes are typically mounted at /workspace or /root/data
# Check available storage
echo "[0/6] Checking storage..."
df -h
echo ""

# Use workspace for persistent data (typically a volume mount)
WORKSPACE="/workspace"
DATA_DIR="${WORKSPACE}/brittney-v14"
MODELS_DIR="${WORKSPACE}/models"
LORAS_DIR="${WORKSPACE}/brittney-loras"
CACHE_DIR="${WORKSPACE}/.cache"

# Create directories
echo "[1/6] Creating directories..."
mkdir -p ${DATA_DIR}
mkdir -p ${MODELS_DIR}
mkdir -p ${LORAS_DIR}
mkdir -p ${CACHE_DIR}/huggingface

# Set cache directories for persistence
export HF_HOME="${CACHE_DIR}/huggingface"
export TRANSFORMERS_CACHE="${CACHE_DIR}/huggingface"
export TORCH_HOME="${CACHE_DIR}/torch"

# Add to bashrc for persistence
echo "export HF_HOME=${CACHE_DIR}/huggingface" >> ~/.bashrc
echo "export TRANSFORMERS_CACHE=${CACHE_DIR}/huggingface" >> ~/.bashrc
echo "export TORCH_HOME=${CACHE_DIR}/torch" >> ~/.bashrc

# Install dependencies
echo "[2/6] Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install --quiet transformers>=4.36.0 accelerate>=0.25.0 peft>=0.7.0 bitsandbytes>=0.41.0 datasets>=2.16.0

# Download base model to persistent storage
echo "[3/6] Downloading base model to persistent volume..."
python3 << 'EOF'
import os
os.environ['HF_HOME'] = '/workspace/.cache/huggingface'
os.environ['TRANSFORMERS_CACHE'] = '/workspace/.cache/huggingface'

from transformers import AutoModelForCausalLM, AutoTokenizer
print('Downloading Phi-3.5-mini-instruct to persistent storage...')
tokenizer = AutoTokenizer.from_pretrained('microsoft/Phi-3.5-mini-instruct', trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    'microsoft/Phi-3.5-mini-instruct',
    trust_remote_code=True,
    torch_dtype='auto',
    cache_dir='/workspace/.cache/huggingface'
)
print('Model cached to /workspace/.cache/huggingface')
EOF

echo "[4/6] Verifying GPU..."
python3 -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    print(f'VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
"

echo "[5/6] Checking training data..."
if [ -f ${DATA_DIR}/curriculum_easy.jsonl ]; then
    echo "Training data found:"
    wc -l ${DATA_DIR}/curriculum_*.jsonl
    echo ""
    echo "Total examples:"
    cat ${DATA_DIR}/curriculum_*.jsonl | wc -l
else
    echo "WARNING: Training data not found!"
    echo "Please upload curriculum files to ${DATA_DIR}/"
fi

echo "[6/6] Creating run script..."
cat > ${WORKSPACE}/run_training.sh << 'RUNSCRIPT'
#!/bin/bash
cd /workspace
export HF_HOME=/workspace/.cache/huggingface
export TRANSFORMERS_CACHE=/workspace/.cache/huggingface

echo "Starting Brittney V14 Training..."
echo "Output will be saved to: /workspace/brittney-loras/brittney-v14-lora"
echo ""

python3 train_v14.py

echo ""
echo "Training complete!"
echo "LoRA saved to: /workspace/brittney-loras/brittney-v14-lora"
RUNSCRIPT
chmod +x ${WORKSPACE}/run_training.sh

echo ""
echo "=============================================="
echo "SETUP COMPLETE!"
echo "=============================================="
echo ""
echo "Storage locations (persistent):"
echo "  Training data: ${DATA_DIR}"
echo "  Model cache:   ${CACHE_DIR}/huggingface"
echo "  LoRA output:   ${LORAS_DIR}/brittney-v14-lora"
echo ""
echo "To start training:"
echo "  ${WORKSPACE}/run_training.sh"
echo ""
echo "Or manually:"
echo "  cd /workspace && python train_v14.py"
echo ""
echo "Monitor training:"
echo "  tail -f /workspace/brittney-v14-training.log"
echo "=============================================="
