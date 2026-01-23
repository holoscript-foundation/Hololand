#!/usr/bin/env python3
"""
Setup and Run Pure Local Fine-Tuning
Step-by-step guide for local Brittney enhancement
"""

import subprocess
import sys
import os
from pathlib import Path

print("""
╔════════════════════════════════════════════════════════════════╗
║         PURE LOCAL FINE-TUNING SETUP                           ║
║  Train brittney-f16.gguf locally with HoloScript examples      ║
╚════════════════════════════════════════════════════════════════╝
""")

# Step 1: Install dependencies
print("\n[STEP 1] Installing dependencies...")
print("  This will install: unsloth, torch, transformers, bitsandbytes, datasets")
print("  This may take 5-10 minutes on first install...\n")

deps = [
    "torch>=2.0.0",
    "transformers>=4.36.0",
    "bitsandbytes>=0.41.0",
    "datasets>=2.15.0",
    "accelerate>=0.24.0",
]

for dep in deps:
    print(f"  Installing {dep.split('>=')[0]}...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-q", dep],
        capture_output=True
    )
    if result.returncode != 0:
        print(f"    ⚠️ Warning: {result.stderr.decode()}")
    else:
        print(f"    ✅ Installed")

# Try unsloth (optional but recommended)
print("\n  Installing unsloth (optional, speeds up training 5-10x)...")
result = subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q", 
     "git+https://github.com/unslothai/unsloth.git"],
    capture_output=True
)
if result.returncode == 0:
    print(f"    ✅ Installed (will use optimized training)")
else:
    print(f"    ⚠️ Not available (will use standard training, slower)")

# Step 2: Check directories
print("\n[STEP 2] Verifying paths...")

training_data = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-finetuning-data.jsonl")
output_dir = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\models\brittney-enhanced")

if training_data.exists():
    print(f"  ✅ Training data: {training_data.name} ({training_data.stat().st_size / 1024:.1f} KB)")
else:
    print(f"  ❌ Training data not found: {training_data}")
    sys.exit(1)

output_dir.mkdir(parents=True, exist_ok=True)
print(f"  ✅ Output directory: {output_dir}")

# Step 3: Show next steps
print("\n[STEP 3] Ready to train locally!")
print("""
Next commands to run (copy-paste into terminal):

═══════════════════════════════════════════════════════════════

1. OPTION A: Quick Test (recommended first)
   Trains for just 1 epoch to verify everything works:

   python -m unsloth.train_local \\
     --model mistralai/Mistral-7B-Instruct-v0.2 \\
     --data brittney-finetuning-data.jsonl \\
     --output models/brittney-enhanced \\
     --epochs 1 \\
     --batch-size 4 \\
     --learning-rate 0.0001

2. OPTION B: Full Training (production)
   Trains for 3 epochs (best quality):

   python -m unsloth.train_local \\
     --model mistralai/Mistral-7B-Instruct-v0.2 \\
     --data brittney-finetuning-data.jsonl \\
     --output models/brittney-enhanced \\
     --epochs 3 \\
     --batch-size 4 \\
     --learning-rate 0.0001 \\
     --lora-rank 8 \\
     --lora-alpha 16

═══════════════════════════════════════════════════════════════

Or use the custom training script:

   cd C:\\Users\\josep\\Documents\\GitHub\\Hololand\\packages\\brittney-service
   python src\\finetune-custom.py

═══════════════════════════════════════════════════════════════

TRAINING WILL:
  ✅ Download base model (Mistral-7B, ~4GB)
  ✅ Load 27 HoloScript training examples
  ✅ Fine-tune with LoRA (efficient)
  ✅ Save to: models/brittney-enhanced/
  ✅ Produce GGUF-compatible weights

ESTIMATED TIME:
  - Model download: 5-10 min (one time)
  - 1 epoch: 10-15 minutes
  - 3 epochs: 30-45 minutes
  - GPU acceleration: 5-10x faster

THEN:
  1. Convert to GGUF format (optional but recommended)
  2. Create Ollama model
  3. Test with ollama run brittney-enhanced
  4. Deploy to production

═══════════════════════════════════════════════════════════════
""")

print("\n💡 HARDWARE REQUIREMENTS:")
print(f"  RAM: ≥16GB (you have 32GB ✅)")
print(f"  GPU: ≥6GB VRAM (you have 6GB ✅)")
print(f"  GPU: NVIDIA CUDA or Apple Metal")
print(f"  Disk: ≥20GB free (for model + training)")

print("\n📚 UNDERSTANDING THE APPROACH:")
print("""
  1. Download Mistral-7B-Instruct-v0.2 (same base as brittney-f16.gguf)
  2. Apply LoRA (Low-Rank Adaptation) for efficient fine-tuning
  3. Train on 27 HoloScript examples (3 epochs)
  4. Save weights to models/brittney-enhanced/
  5. Convert to GGUF for Ollama
  6. Load in Ollama with your existing knowledge

  Result: Enhanced brittney with game generation expertise
          + all 300K+ existing knowledge preserved
""")

print("\n⚡ RECOMMENDED WORKFLOW:")
print("""
  1. Start with OPTION A (1 epoch, quick test)
  2. Verify it works: check output quality
  3. If satisfied, run OPTION B (3 epochs, full training)
  4. Convert to GGUF when done
  5. Test with Ollama
""")

print("\n✨ Ready to train locally? Let's go!")
print("   Copy one of the commands above and paste into terminal.")
