#!/usr/bin/env python3
"""
Pure Local Fine-Tuning of brittney with HoloScript Examples
Uses unsloth for 5-10x faster training on consumer GPUs
Preserves 300K+ existing knowledge + adds game generation
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
import torch
from datasets import Dataset
import warnings

warnings.filterwarnings("ignore")

print("""
╔════════════════════════════════════════════════════════════════╗
║  PURE LOCAL FINE-TUNING (unsloth)                              ║
║  Enhance brittney with HoloScript Knowledge                    ║
╚════════════════════════════════════════════════════════════════╝
""")

# Check GPU
print("\n[1/5] Hardware Check...")
if torch.cuda.is_available():
    print(f"  ✅ GPU: {torch.cuda.get_device_name(0)}")
    print(f"     VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
else:
    print(f"  ⚠️ CPU mode (slower)")

# Load training data
print("\n[2/5] Loading Training Data...")
training_data = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-finetuning-data.jsonl")

examples = []
with open(training_data, 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            examples.append(json.loads(line))

print(f"  ✅ Loaded {len(examples)} examples")

# Format training data
print("\n[3/5] Formatting Dataset...")
training_texts = []

for example in examples:
    messages = example['messages']
    system = messages[0]['content']
    user = messages[1]['content']
    assistant = messages[2]['content']
    
    text = f"""System: {system}

User: {user}