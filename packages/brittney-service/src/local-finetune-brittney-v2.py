#!/usr/bin/env python3
"""
Local Fine-Tuning of Brittney v2 with Latest HoloScript Training Data
Uses existing brittney-hololand merged model + enhanced training data
Optimized for RTX 3060 (6GB VRAM) with 4-bit quantization
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
import torch

print("""
================================================================
  BRITTNEY V2 LOCAL FINE-TUNING
  Base: brittney-hololand (TinyLlama 1.1B)
  Data: Enhanced HoloScript Training (35K+ examples)
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

    if vram_gb < 6:
        print("  [!]  Less than 6GB VRAM - may need to reduce batch size")
else:
    print("  [X] No CUDA GPU detected. This script requires a GPU.")
    sys.exit(1)

# Check dependencies
print("\n[2/6] Checking Dependencies...")
try:
    from unsloth import FastLanguageModel
    print("  [OK] unsloth installed")
except ImportError:
    print("  [X] unsloth not installed. Run:")
    print("     pip install unsloth")
    sys.exit(1)

try:
    from datasets import Dataset
    from transformers import TrainingArguments
    from trl import SFTTrainer
    print("  [OK] transformers, datasets, trl installed")
except ImportError as e:
    print(f"  [X] Missing dependency: {e}")
    print("     pip install transformers datasets trl")
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
print(f"  Base model: {BASE_MODEL_PATH}")

if not BASE_MODEL_PATH.exists():
    print(f"  [X] Base model not found at {BASE_MODEL_PATH}")
    print("  Falling back to TinyLlama from HuggingFace...")
    model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
else:
    model_name = str(BASE_MODEL_PATH)

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=model_name,
    max_seq_length=2048,
    dtype=None,  # Auto-detect
    load_in_4bit=True,  # 4-bit quantization for 6GB VRAM
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=64,  # LoRA rank
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=128,
    lora_dropout=0.05,
    bias="none",
    use_gradient_checkpointing="unsloth",  # Memory optimization
    random_state=42,
)

print("  [OK] Model loaded with LoRA adapters")
model.print_trainable_parameters()

# Setup training
print("\n[6/6] Starting Training...")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

training_args = TrainingArguments(
    output_dir=str(OUTPUT_DIR),
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=50,
    num_train_epochs=1,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_steps=200,
    save_total_limit=2,
    optim="adamw_8bit",
    seed=42,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=2048,
    args=training_args,
)

print(f"\n{'='*60}")
print("TRAINING STARTED")
print(f"{'='*60}")
print(f"  Examples: {len(dataset)}")
print(f"  Epochs: 1")
print(f"  Batch size: 2 (x4 accumulation = effective 8)")
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
print("Saving model...")
model.save_pretrained(OUTPUT_DIR / "lora_adapter")
tokenizer.save_pretrained(OUTPUT_DIR / "lora_adapter")

# Merge and save
print("Merging LoRA weights...")
merged_model = model.merge_and_unload()
merged_model.save_pretrained(OUTPUT_DIR / "merged")
tokenizer.save_pretrained(OUTPUT_DIR / "merged")

# Save config
config = {
    "name": "brittney-v2-local",
    "version": datetime.now().strftime("%Y%m%d"),
    "base_model": str(model_name),
    "training_examples": len(dataset),
    "training_loss": float(result.training_loss),
    "lora_r": 64,
    "lora_alpha": 128,
    "created_at": datetime.now().isoformat(),
}

with open(OUTPUT_DIR / "training_config.json", 'w') as f:
    json.dump(config, f, indent=2)

print(f"""
================================================================
  TRAINING COMPLETE!
================================================================
  Output: {str(OUTPUT_DIR)}

  Next steps:
  1. Convert to GGUF:
     python -m llama_cpp.convert {str(OUTPUT_DIR / 'merged')}
     --outtype q4_k_m -o brittney-v2.gguf

  2. Deploy:
     copy brittney-v2.gguf ~/.hololand/models/
================================================================
""")
