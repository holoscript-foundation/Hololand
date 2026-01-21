#!/usr/bin/env python3
"""
Simplified Fine-Tuning: Brittney with Minimal Configuration
Optimized for stability on Windows/CPU
"""

import json
from pathlib import Path
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
)
from peft import get_peft_model, LoraConfig, TaskType
import warnings

warnings.filterwarnings("ignore")

print("""
╔════════════════════════════════════════════════════════════════╗
║       SIMPLIFIED FINE-TUNING: Brittney Enhancement             ║
║       35,000+ Examples • Minimal Config • Stable               ║
╚════════════════════════════════════════════════════════════════╝
""")

# Paths
MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.2"
TRAINING_FILES = [
    "brittney-training-modern.jsonl",
    "brittney-finetuning-data.jsonl",
    "brittney-enhanced-training.jsonl",
]
OUTPUT_DIR = "models/brittney-enhanced-v2"

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

print("\n[1/4] Loading Training Data")

all_texts = []
for filename in TRAINING_FILES:
    filepath = Path(filename)
    if filepath.exists():
        count = 0
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    item = json.loads(line)
                    if 'messages' in item:
                        text = ""
                        for msg in item['messages']:
                            text += f"<|im_start|>{msg['role']}\n{msg['content']}<|im_end|>\n"
                        all_texts.append(text)
                        count += 1
                except:
                    pass
        print(f"  ✓ {filename}: {count} examples")

print(f"  Total: {len(all_texts)} examples loaded")

if not all_texts:
    print("  ❌ No data loaded!")
    exit(1)

print("\n[2/4] Loading Model & Tokenizer")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token
print("  ✓ Tokenizer ready")

print("  Loading base model (5-10 minutes)...")
model = AutoModelForCausalLM.from_pretrained(MODEL_ID)
print("  ✓ Model loaded")

print("\n[3/4] Applying LoRA")

lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(model, lora_config)
print("  ✓ LoRA applied")

print("\n[4/4] Training")

# Simple dataset class
class Dataset:
    def __init__(self, texts, tokenizer):
        self.texts = texts
        self.tokenizer = tokenizer
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, i):
        text = self.texts[i]
        tokens = self.tokenizer(
            text,
            truncation=True,
            max_length=512,
            padding='max_length',
            return_tensors='pt'
        )
        return {
            'input_ids': tokens['input_ids'].squeeze(),
            'attention_mask': tokens['attention_mask'].squeeze(),
        }

train_dataset = Dataset(all_texts, tokenizer)

args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=1,
    per_device_train_batch_size=2,
    warmup_steps=50,
    weight_decay=0.01,
    learning_rate=1e-4,
    logging_steps=10,
    save_steps=500,
    dataloader_num_workers=0,
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=train_dataset,
)

print("  Starting training loop...")
print("  ETA: 2-3 hours on CPU\n")

trainer.train()

print("\n✅ Training complete!")

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"  Saved to: {OUTPUT_DIR}")
print("\nNext: Convert to GGUF for Ollama")
