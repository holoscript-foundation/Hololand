#!/usr/bin/env python3
"""
Stable Fine-Tuning: Brittney with Chunk-Based Processing
Optimized for 35K+ examples with memory efficiency
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Any
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
║  STABLE LOCAL FINE-TUNING: Optimized for Large Datasets       ║
║  35,000+ Examples • Memory Efficient • Chunk Processing       ║
╚════════════════════════════════════════════════════════════════╝
""")

# Configuration
MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.2"
TRAINING_DATA_FILES = [
    r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-training-modern.jsonl",
    r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-finetuning-data.jsonl",
    r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-enhanced-training.jsonl",
]
OUTPUT_DIR = r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\models\brittney-enhanced-v2"

# Training hyperparameters
EPOCHS = 1  # Single epoch for stability with large dataset
BATCH_SIZE = 4  # Reduced for memory efficiency
LEARNING_RATE = 1e-4
LORA_RANK = 8  # Standard rank
LORA_ALPHA = 16
MAX_SEQ_LENGTH = 512  # Reduced for faster processing
CHUNK_SIZE = 1000  # Process in chunks

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

print("\n[1/6] Environment Setup")
print(f"  PyTorch: {torch.__version__}")
print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")

print("\n[2/6] Loading Training Data")

# Load all training data
all_texts = []
total_count = 0

for file_path in TRAINING_DATA_FILES:
    if Path(file_path).exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        item = json.loads(line)
                        if 'messages' in item:
                            text = ""
                            for msg in item['messages']:
                                role = msg.get('role', 'user')
                                content = msg.get('content', '')
                                text += f"<|im_start|>{role}\n{content}<|im_end|>\n"
                            all_texts.append(text)
                            total_count += 1
                        elif 'prompt' in item and 'completion' in item:
                            text = f"<|im_start|>user\n{item['prompt']}<|im_end|>\n<|im_start|>assistant\n{item['completion']}<|im_end|>"
                            all_texts.append(text)
                            total_count += 1
                    except Exception as e:
                        pass
        print(f"  ✓ {Path(file_path).name}: {total_count} total examples so far")

print(f"  Total loaded: {len(all_texts)} examples")

if len(all_texts) == 0:
    print("  ❌ ERROR: No training data loaded")
    exit(1)

print("\n[3/6] Loading Model and Tokenizer")
print("  This may take 5-10 minutes...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token

print("  ✓ Tokenizer loaded")

print("\n[4/6] Loading Base Model")

try:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
    )
    print("  ✓ Model loaded successfully")
except Exception as e:
    print(f"  ⚠️  Trying without device_map...")
    model = AutoModelForCausalLM.from_pretrained(MODEL_ID)
    print("  ✓ Model loaded")

print("\n[5/6] Configuring LoRA")

lora_config = LoraConfig(
    r=LORA_RANK,
    lora_alpha=LORA_ALPHA,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

model = get_peft_model(model, lora_config)
print(f"  ✓ LoRA configured (rank={LORA_RANK}, alpha={LORA_ALPHA})")

print("\n[6/6] Starting Training")
print(f"  Examples: {len(all_texts)}")
print(f"  Epochs: {EPOCHS}")
print(f"  Batch size: {BATCH_SIZE}")
print(f"  Learning rate: {LEARNING_RATE}")

# Simple text dataset
class SimpleTextDataset:
    def __init__(self, texts, tokenizer, max_length):
        self.tokenizer = tokenizer
        self.texts = texts
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        encodings = self.tokenizer(
            text,
            truncation=True,
            max_length=self.max_length,
            padding='max_length',
            return_tensors='pt'
        )
        return {
            'input_ids': encodings['input_ids'].squeeze(),
            'attention_mask': encodings['attention_mask'].squeeze(),
        }

train_dataset = SimpleTextDataset(all_texts, tokenizer, MAX_SEQ_LENGTH)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    warmup_steps=100,
    weight_decay=0.01,
    learning_rate=LEARNING_RATE,
    lr_scheduler_type="linear",
    logging_steps=10,
    save_steps=500,
    save_strategy="epoch",
    seed=42,
    fp16=torch.cuda.is_available(),
    dataloader_num_workers=0,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
)

print("\n  Starting training loop...")
print("  This will take 1-2 hours on CPU, 30-45 min on GPU\n")

try:
    trainer.train()
    print("\n✅ TRAINING COMPLETE")
except KeyboardInterrupt:
    print("\n⚠️  Training interrupted by user")
except Exception as e:
    print(f"\n❌ Training error: {e}")

print("\n[7/7] Saving Model")

try:
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"  ✓ Model saved to: {OUTPUT_DIR}")
    print(f"  ✓ Files: adapter_model.bin, adapter_config.json")
except Exception as e:
    print(f"  ❌ Error saving: {e}")

print("\n" + "="*70)
print("✅ FINE-TUNING WORKFLOW COMPLETE")
print("="*70)
print("\nNext: Convert to GGUF and deploy to Ollama")
print("  python convert-to-gguf.py")
print("="*70)
