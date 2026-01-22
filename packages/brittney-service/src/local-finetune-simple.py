#!/usr/bin/env python3
"""
Local Fine-Tuning of Brittney v2 - Simple Version (no unsloth)
Uses standard transformers + peft + trl stack
Optimized for RTX 3060 (6GB VRAM) with 4-bit quantization
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# CUDA memory configuration - MUST be before importing torch
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
os.environ["CUDA_LAUNCH_BLOCKING"] = "0"

import torch
# Clear any existing allocations
torch.cuda.empty_cache()

print("""
================================================================
  BRITTNEY V2 LOCAL FINE-TUNING (Simple)
  Base: brittney-hololand (TinyLlama 1.1B)
  Data: Enhanced HoloScript Training
================================================================
""")

# Paths
BASE_MODEL_PATH = Path(r"C:\Users\josep\Documents\GitHub\AI_Workspace\uAA2\training\brittney-hololand\merged")
TRAINING_DATA = Path(r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-training-enhanced.jsonl")
OUTPUT_DIR = Path(r"C:\Users\josep\Documents\GitHub\AI_Workspace\uAA2\training\brittney-v2-local")

# Check GPU
print("\n[1/6] Hardware Check...")
if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"  [OK] GPU: {gpu_name}")
    print(f"     VRAM: {vram_gb:.1f} GB")
else:
    print("  [X] No CUDA GPU detected. This script requires a GPU.")
    sys.exit(1)

# Check dependencies
print("\n[2/6] Checking Dependencies...")
try:
    from datasets import Dataset
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
        TrainingArguments,
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from trl import SFTTrainer
    print("  [OK] All dependencies installed")
except ImportError as e:
    print(f"  [X] Missing dependency: {e}")
    print("     pip install transformers datasets trl peft bitsandbytes")
    sys.exit(1)

# Load training data
print("\n[3/6] Loading Training Data...")
if not TRAINING_DATA.exists():
    print(f"  [X] Training data not found: {TRAINING_DATA}")
    sys.exit(1)

examples = []
with open(TRAINING_DATA, 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            try:
                examples.append(json.loads(line))
            except json.JSONDecodeError:
                continue

print(f"  [OK] Loaded {len(examples)} training examples")

# Format dataset
print("\n[4/6] Formatting Dataset...")

def format_example(example):
    """Format example for training"""
    if 'messages' in example:
        messages = example['messages']
        parts = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            if role == 'system':
                parts.append(f"System: {content}")
            elif role == 'user':
                parts.append(f"User: {content}")
            elif role == 'assistant':
                parts.append(f"Assistant: {content}")
        return "\n\n".join(parts)
    elif 'input' in example and 'output' in example:
        return f"User: {example['input']}\n\nAssistant: {example['output']}"
    elif 'prompt' in example and 'completion' in example:
        return f"User: {example['prompt']}\n\nAssistant: {example['completion']}"
    else:
        return str(example)

formatted_examples = [{"text": format_example(ex)} for ex in examples]
dataset = Dataset.from_list(formatted_examples)
print(f"  [OK] Dataset ready: {len(dataset)} examples")

# Load model
print("\n[5/6] Loading Model...")

if not BASE_MODEL_PATH.exists():
    print(f"  [X] Base model not found at {BASE_MODEL_PATH}")
    print("  Falling back to TinyLlama from HuggingFace...")
    model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
else:
    model_name = str(BASE_MODEL_PATH)

print(f"  Base model: {model_name}")

# 4-bit quantization config for 6GB VRAM
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)

# Load model
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)

tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# Prepare for training
model = prepare_model_for_kbit_training(model)

# LoRA config - very conservative for 6GB VRAM
lora_config = LoraConfig(
    r=16,  # Lower rank for 6GB VRAM
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],  # Only attention projections
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
print("  [OK] Model loaded with LoRA adapters")
model.print_trainable_parameters()

# Setup training
print("\n[6/6] Starting Training...")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Training config moved to SFTConfig below

from trl import SFTConfig

sft_config = SFTConfig(
    output_dir=str(OUTPUT_DIR),
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,  # Reduced for stability
    warmup_steps=50,
    num_train_epochs=1,
    learning_rate=1e-4,  # Lower LR for stability
    fp16=True,
    logging_steps=25,
    save_steps=1000,
    save_total_limit=1,  # Only keep latest
    optim="paged_adamw_8bit",
    seed=42,
    report_to="none",
    gradient_checkpointing=True,
    max_length=512,  # Reduced for 6GB VRAM
    dataset_text_field="text",
)

trainer = SFTTrainer(
    model=model,
    processing_class=tokenizer,
    train_dataset=dataset,
    args=sft_config,
)

print(f"\n{'='*60}")
print("TRAINING STARTED")
print(f"{'='*60}")
print(f"  Examples: {len(dataset)}")
print(f"  Epochs: 1")
print(f"  Batch size: 1 (x4 accumulation = effective 4)")
print(f"  Output: {OUTPUT_DIR}")
print(f"{'='*60}\n")

# Train
result = trainer.train()

print(f"\n{'='*60}")
print("TRAINING COMPLETE!")
print(f"{'='*60}")
print(f"  Final loss: {result.training_loss:.4f}")
print(f"{'='*60}\n")

# Save model
print("Saving LoRA adapter...")
model.save_pretrained(OUTPUT_DIR / "lora_adapter")
tokenizer.save_pretrained(OUTPUT_DIR / "lora_adapter")

# Merge LoRA with base model
print("Merging LoRA weights with base model...")
try:
    from peft import AutoPeftModelForCausalLM

    # Clear VRAM first
    del trainer
    torch.cuda.empty_cache()

    # Load and merge
    merged_model = model.merge_and_unload()
    merged_model.save_pretrained(OUTPUT_DIR / "merged")
    tokenizer.save_pretrained(OUTPUT_DIR / "merged")
    print("  [OK] Merged model saved")
except Exception as e:
    print(f"  [!] Merge failed (can be done later): {e}")

# Save config
config = {
    "name": "brittney-v2-local",
    "version": datetime.now().strftime("%Y%m%d"),
    "base_model": str(model_name),
    "training_examples": len(dataset),
    "training_loss": float(result.training_loss),
    "lora_r": 16,
    "lora_alpha": 32,
    "created_at": datetime.now().isoformat(),
}

with open(OUTPUT_DIR / "training_config.json", 'w') as f:
    json.dump(config, f, indent=2)

print(f"""
================================================================
  TRAINING COMPLETE!
================================================================
  Output: {str(OUTPUT_DIR)}
  LoRA adapter: {str(OUTPUT_DIR / 'lora_adapter')}
  Merged model: {str(OUTPUT_DIR / 'merged')}

  Next steps:
  1. Convert to GGUF:
     python -m llama_cpp.convert_hf_to_gguf {str(OUTPUT_DIR / 'merged')} --outtype q4_k_m --outfile brittney-v2.gguf

  2. Deploy:
     copy brittney-v2.gguf %USERPROFILE%\\.hololand\\models\\
================================================================
""")
