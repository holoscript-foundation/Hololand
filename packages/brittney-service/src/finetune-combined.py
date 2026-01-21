#!/usr/bin/env python3
"""
Enhanced Fine-Tuning: Brittney with Modern Training Data
Combines:
  - 7 curated modern examples (latest HoloScript syntax, NO legacy)
  - 27 curated HoloScript examples with 3D mappings
  - 35,000+ HoloScript NL-to-Code + curriculum examples
Total: ~35,000+ training examples (all verified for modernity)
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import get_peft_model, LoraConfig, TaskType
import warnings

warnings.filterwarnings("ignore")

print("""
╔════════════════════════════════════════════════════════════════╗
║    ENHANCED LOCAL FINE-TUNING: Consolidated Training Data      ║
║    35,000+ Examples: HoloScript + Curriculum + 3D Knowledge    ║
╚════════════════════════════════════════════════════════════════╝
""")

# Configuration
MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.2"
TRAINING_DATA_FILES = [
    r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-training-modern.jsonl",     # 7 modern examples (no legacy)
    r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-finetuning-data.jsonl",     # 27 examples with 3D
    r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-enhanced-training.jsonl",   # 35K+ HoloScript + curriculum
]
OUTPUT_DIR = r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\models\brittney-enhanced-v2"

# Training hyperparameters
EPOCHS = 2  # Reduced due to larger dataset
BATCH_SIZE = 8  # Increased batch size for stability
LEARNING_RATE = 5e-5  # Lower learning rate for larger dataset
LORA_RANK = 16  # Increased rank for better adaptation
LORA_ALPHA = 32  # Scaled up
MAX_SEQ_LENGTH = 2048

# Create output directory
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

print("\n[1/7] Environment Setup")
print(f"  PyTorch: {torch.__version__}")
print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
if torch.cuda.is_available():
    print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

print("\n[2/7] Loading Training Data")
all_data = []
for file_path in TRAINING_DATA_FILES:
    if Path(file_path).exists():
        with open(file_path, 'r') as f:
            lines = f.readlines()
            count = len(lines)
            all_data.extend(lines)
            print(f"  ✓ {Path(file_path).name}: {count} examples")
    else:
        print(f"  ✗ Not found: {file_path}")

print(f"  Total: {len(all_data)} examples loaded")

print("\n[3/7] Formatting Dataset")

def format_examples(lines: List[str]) -> List[Dict[str, str]]:
    """Convert JSONL lines to training format"""
    formatted = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
            
            # Handle different formats
            if 'messages' in item:
                # Already formatted as chat messages
                text = ""
                for msg in item['messages']:
                    role = msg.get('role', 'user')
                    content = msg.get('content', '')
                    text += f"<|im_start|>{role}\n{content}<|im_end|>\n"
                formatted.append({"text": text})
            elif 'instruction' in item and 'output' in item:
                # Instruction-output format
                text = f"<|im_start|>system\nYou are Brittney, HoloScript expert<|im_end|>\n"
                text += f"<|im_start|>user\n{item['instruction']}<|im_end|>\n"
                text += f"<|im_start|>assistant\n{item['output']}<|im_end|>"
                formatted.append({"text": text})
            elif 'text' in item:
                # Direct text
                formatted.append({"text": item['text']})
            else:
                # Fallback: convert to text
                formatted.append({"text": json.dumps(item)})
        except Exception as e:
            print(f"  ⚠ Skip line: {str(e)[:50]}")
            continue
    return formatted

examples = format_examples(all_data)
print(f"  ✓ Formatted: {len(examples)} examples")

# Create dataset
dataset = Dataset.from_dict({
    "text": [ex["text"] for ex in examples]
})

print("\n[4/7] Loading Model and Tokenizer")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token

# Tokenize dataset
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        max_length=MAX_SEQ_LENGTH,
        padding="max_length",
    )

tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    remove_columns=["text"]
)

print(f"  ✓ Tokenizer loaded: {len(tokenizer)} vocab")

print("\n[5/7] Configuring Model with LoRA")

# Load model with 4-bit quantization
print("  Loading base model (may take 2-3 minutes)...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    load_in_4bit=True,
    device_map="auto",
    torch_dtype=torch.float16,
)

# LoRA config
lora_config = LoraConfig(
    r=LORA_RANK,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(model, lora_config)
print(f"  ✓ LoRA configured: rank={LORA_RANK}, alpha={LORA_ALPHA}")

print("\n[6/7] Starting Training")
print(f"  Dataset: {len(examples)} examples")
print(f"  Epochs: {EPOCHS}")
print(f"  Batch size: {BATCH_SIZE}")
print(f"  Learning rate: {LEARNING_RATE}")
print(f"  Output: {OUTPUT_DIR}")

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=2,
    warmup_steps=100,
    weight_decay=0.01,
    learning_rate=LEARNING_RATE,
    lr_scheduler_type="cosine",
    logging_steps=10,
    save_strategy="epoch",
    seed=42,
    bf16=False,  # Use fp16 on older GPUs
    fp16=torch.cuda.is_available(),
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
)

trainer.train()

print("\n[7/7] Saving Model")
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"  ✓ Model saved: {OUTPUT_DIR}")
print(f"  ✓ Weights: {Path(OUTPUT_DIR) / 'adapter_model.bin'}")
print(f"  ✓ Config: {Path(OUTPUT_DIR) / 'adapter_config.json'}")

print("\n" + "="*60)
print("✅ TRAINING COMPLETE")
print("="*60)
print("\nNext steps:")
print("  1. Convert to GGUF: python convert-to-gguf.py")
print("  2. Create Ollama model: ollama create brittney-v2 -f Modelfile.enhanced")
print("  3. Test: ollama run brittney-v2 'Create a scene'")
print("\nModel info:")
print(f"  • Base: {MODEL_ID}")
print(f"  • Examples: {len(examples):,}")
print(f"  • LoRA adapters: {OUTPUT_DIR}")
print("="*60)
