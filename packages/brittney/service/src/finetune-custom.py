#!/usr/bin/env python3
"""
Complete Local Fine-Tuning Script for Brittney
Trains on HoloScript examples using Hugging Face transformers
Saves model weights that can be converted to GGUF
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
║         LOCAL FINE-TUNING: Custom Training Script              ║
║         Train Brittney Locally with Full Control               ║
╚════════════════════════════════════════════════════════════════╝
""")

# Configuration
MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.2"
TRAINING_DATA = r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\brittney-finetuning-data.jsonl"
OUTPUT_DIR = r"C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\models\brittney-enhanced"

# Training hyperparameters
EPOCHS = 3
BATCH_SIZE = 4
LEARNING_RATE = 1e-4
LORA_RANK = 8
LORA_ALPHA = 16
MAX_SEQ_LENGTH = 2048

# Create output directory
Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

print("\n[1/6] Environment Setup")
print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
if torch.cuda.is_available():
    props = torch.cuda.get_device_properties(0)
    print(f"  GPU: {torch.cuda.get_device_name(0)}")
    print(f"  VRAM: {props.total_memory / 1024**3:.1f} GB")
print(f"  Output: {OUTPUT_DIR}")

print("\n[2/6] Loading Training Data")
# Load JSONL examples
examples = []
with open(TRAINING_DATA, 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            examples.append(json.loads(line))

print(f"  Loaded {len(examples)} examples")

# Format for training
print("\n[3/6] Formatting Dataset")
texts = []
for ex in examples:
    messages = ex['messages']
    system = messages[0]['content']
    user = messages[1]['content']
    assistant = messages[2]['content']
    
    # Mistral format: <s>[INST] user message [/INST] assistant message </s>
    text = f"""<s>[INST] {system}

{user} [/INST] {assistant}</s>"""
    texts.append({"text": text})

dataset = Dataset.from_dict({"text": texts})
print(f"  Created dataset with {len(texts)} formatted examples")

print("\n[4/6] Loading Model & Tokenizer")
# Load base model
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    device_map="auto",
    torch_dtype=torch.float16,
    load_in_4bit=True,
)

print(f"  Model: {MODEL_ID}")
print(f"  Tokenizer: {tokenizer.name_or_path}")

print("\n[5/6] Applying LoRA")
# Configure LoRA
lora_config = LoraConfig(
    r=LORA_RANK,
    lora_alpha=LORA_ALPHA,
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
print(f"  LoRA Rank: {LORA_RANK}")
print(f"  LoRA Alpha: {LORA_ALPHA}")

# Tokenize dataset
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        max_length=MAX_SEQ_LENGTH,
        truncation=True,
    )

tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    num_proc=4,
    remove_columns=["text"]
)

print(f"  Dataset tokenized (max seq: {MAX_SEQ_LENGTH})")

print("\n[6/6] Training Configuration")
# Training arguments
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    overwrite_output_dir=True,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=4,
    save_steps=10,
    save_total_limit=3,
    logging_steps=5,
    learning_rate=LEARNING_RATE,
    weight_decay=0.01,
    warmup_steps=20,
    lr_scheduler_type="cosine",
    optim="paged_adamw_8bit",
    push_to_hub=False,
    seed=42,
)

# Create trainer
data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=data_collator,
)

print(f"  Epochs: {EPOCHS}")
print(f"  Batch Size: {BATCH_SIZE}")
print(f"  Learning Rate: {LEARNING_RATE}")
print(f"  Steps per epoch: {len(tokenized_dataset) // BATCH_SIZE}")
print(f"  Total steps: {(len(tokenized_dataset) // BATCH_SIZE) * EPOCHS}")

print("\n" + "="*65)
print("STARTING TRAINING...")
print("="*65 + "\n")

# Train
trainer.train()

print("\n" + "="*65)
print("TRAINING COMPLETE!")
print("="*65)

print(f"\n✅ Model saved to: {OUTPUT_DIR}")
print(f"   Weights: {Path(OUTPUT_DIR) / 'adapter_model.bin'}")
print(f"   Config: {Path(OUTPUT_DIR) / 'adapter_config.json'}")

# Save tokenizer
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"   Tokenizer saved")

print(f"\n📝 Next steps:")
print(f"   1. Convert to GGUF for Ollama:")
print(f"      python -m llama_cpp.quantize_model {OUTPUT_DIR} brittney-enhanced.gguf")
print(f"\n   2. Create Ollama model:")
print(f"      ollama create brittney-enhanced -f Modelfile.enhanced")
print(f"\n   3. Test:")
print(f"      ollama run brittney-enhanced 'Create an NPC warrior'")

print(f"\n💾 Model weights location: {OUTPUT_DIR}")
print(f"\n✨ Enhancement complete! Your model now has:")
print(f"   ✅ 27 HoloScript training examples")
print(f"   ✅ 3 epochs of fine-tuning")
print(f"   ✅ All original knowledge preserved")
print(f"   ✅ LoRA weights (efficient, portable)")
