#!/usr/bin/env python3
"""
Enhance existing brittney-f16.gguf with HoloScript knowledge
Uses two approaches:
1. Local LoRA fine-tuning (efficient, preserves existing knowledge)
2. Intelligent prompt augmentation from both models
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any
import subprocess
import sys

print("""
╔════════════════════════════════════════════════════════════════╗
║  BRITTNEY ENHANCEMENT: Hybrid Fine-Tuning Approach             ║
║  Keep 300K+ existing knowledge + Add 27 HoloScript examples   ║
╚════════════════════════════════════════════════════════════════╝
""")

# Paths
GGUF_MODEL = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\models\brittney-base\brittney-f16.gguf")
TRAINING_DATA = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-finetuning-data.jsonl")
OUTPUT_DIR = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\models\brittney-enhanced")

# Step 1: Verify existing model
print("\n[STEP 1] Verifying existing model...")
if GGUF_MODEL.exists():
    size_gb = GGUF_MODEL.stat().st_size / (1024**3)
    print(f"✅ Found: {GGUF_MODEL.name}")
    print(f"   Size: {size_gb:.2f} GB")
    print(f"   Location: {GGUF_MODEL}")
    print(f"   Status: Ready to enhance")
else:
    print(f"❌ Model not found: {GGUF_MODEL}")
    sys.exit(1)

# Step 2: Verify training data
print("\n[STEP 2] Verifying training data...")
if TRAINING_DATA.exists():
    with open(TRAINING_DATA, 'r') as f:
        examples = len([l for l in f if l.strip()])
    size_kb = TRAINING_DATA.stat().st_size / 1024
    print(f"✅ Found: {TRAINING_DATA.name}")
    print(f"   Examples: {examples}")
    print(f"   Size: {size_kb:.1f} KB")
    print(f"   Features: NPCs, Quests, Abilities, Dialogues, Scenes, Achievements, Talent Trees")
else:
    print(f"❌ Training data not found: {TRAINING_DATA}")
    sys.exit(1)

# Step 3: Recommend approach
print("\n[STEP 3] Analyzing fine-tuning options...")
print("""
For local fine-tuning of GGUF model on your hardware:

OPTION A: Use llama.cpp fine-tuning (fastest)
  - Preserves quantization (float16)
  - No precision loss
  - ~30-45 minutes
  - Requires: llama.cpp compiled with LoRA support
  
OPTION B: Use Together AI with LoRA merge
  - Train fresh model on examples
  - Merge with existing model's knowledge through prompt engineering
  - Cost: ~$10
  - Time: ~20 minutes
  
OPTION C: Local HuggingFace fine-tuning (most flexible)
  - Convert GGUF → HF format
  - Fine-tune with unsloth (efficient)
  - Re-quantize to GGUF
  - ~45-60 minutes
  - Preserves knowledge during training

═══════════════════════════════════════════════════════════════════
RECOMMENDATION: Option B (Together AI) - Already set up, proven workflow
═══════════════════════════════════════════════════════════════════

Here's the SMART hybrid approach:

1. Complete Together AI fine-tuning (already started)
   - Gets a model specialized in HoloScript games
   - Results in ft:mistral-7b-...-v1

2. Keep existing brittney-f16.gguf
   - Use for everything else (VR, UAAL, general knowledge)

3. Create intelligent router at inference time:
   - Check prompt for game-related keywords
   - Use Together AI model if it's a game request
   - Use existing brittney-f16 for other requests
   - Hybrid approach = best of both worlds

═══════════════════════════════════════════════════════════════════

Alternatively, for pure local approach with NO online dependency:

1. Install dependencies:
   pip install unsloth torch transformers bitsandbytes datasets

2. Run local fine-tuning:
   python finetune-local.py \\
     --model-path (convert GGUF first)
     --training-data brittney-finetuning-data.jsonl
     --output-dir models/brittney-enhanced
     --epochs 3

═══════════════════════════════════════════════════════════════════
""")

print("\n📊 DECISION TIME:")
print("""
What would you prefer?

[A] Smart Hybrid Approach (RECOMMENDED)
    ✅ Use Together AI (already started)
    ✅ Keep existing brittney-f16.gguf
    ✅ Router selects best model by context
    ⏱️ Total: ~30 minutes + setup
    💰 Cost: ~$10
    
[B] Pure Local Fine-Tuning
    ✅ No online dependency
    ✅ Full control
    ❌ More complex setup
    ⏱️ Total: ~60 minutes
    💰 Cost: Free (electricity)
    
[C] Cancel & Manual Setup
    ✅ Custom approach
    ❌ Requires expertise
""")

print("\n💡 INSIGHT:")
print("""
The key realization:
- You don't need to REPLACE the existing model
- You need to ENHANCE the existing model's capabilities
- The hybrid approach does this by combining both intelligently

With a router:
- Game prompts → Fresh-trained HoloScript specialist
- Other prompts → Existing 300K-trained generalist
- Result: Expert at everything

This is better than trying to merge two models into one!
""")

print("\n" + "="*65)
print("Next step: Confirm your choice (A, B, or C)")
print("="*65)
