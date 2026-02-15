#!/usr/bin/env python3
"""
BRITTNEY V14 TRAINING SCRIPT - Hololand Oasis Dataset
======================================================
- Fine-tuned on HoloScript, VR interactions, and capabilities
- Curriculum learning: easy → medium → hard → frontier
- Phi-3.5-mini base model
- QLoRA with 4-bit quantization

Based on V13 configuration with updated dataset.
"""

import os
import torch
import json
from pathlib import Path
from datetime import datetime

torch.cuda.empty_cache()

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import Dataset, concatenate_datasets

# Configuration - Same as V13
BASE_MODEL = "microsoft/Phi-3.5-mini-instruct"
DATA_DIR = "/workspace/brittney-v14"
OUTPUT_DIR = "/workspace/brittney-loras/brittney-v14-lora"
LOG_FILE = "/workspace/brittney-v14-training.log"

CONFIG = {
    "num_epochs": 1,  # Quick training - single epoch
    "batch_size": 16,  # Larger batch for H100 (was 2)
    "gradient_accumulation_steps": 2,  # Effective batch size = 32
    "learning_rate": 2e-4,  # Slightly higher LR for faster convergence
    "max_length": 2048,
    "warmup_ratio": 0.03,
    "weight_decay": 0.01,
    "save_steps": 500,
    "eval_steps": 500,
    "logging_steps": 25,
    "lora_r": 32,  # Same as v13
    "lora_alpha": 64,  # Same as v13
    "lora_dropout": 0.05,
    "target_modules": ["qkv_proj", "o_proj", "gate_up_proj", "down_proj"],
}

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {msg}\n")

def load_curriculum_data():
    """Load curriculum datasets in order: easy → medium → hard → frontier"""
    log("Loading curriculum datasets...")

    all_data = []
    difficulties = ["easy", "medium", "hard", "frontier"]

    for difficulty in difficulties:
        filepath = Path(DATA_DIR) / f"curriculum_{difficulty}.jsonl"
        if filepath.exists():
            count = 0
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        try:
                            item = json.loads(line)
                            instruction = item.get('instruction', '')
                            input_text = item.get('input', '')
                            output = item.get('output', '')

                            if input_text:
                                text = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output}"
                            else:
                                text = f"### Instruction:\n{instruction}\n\n### Response:\n{output}"

                            all_data.append({
                                "text": text,
                                "difficulty": difficulty
                            })
                            count += 1
                        except json.JSONDecodeError:
                            continue
            log(f"  - {difficulty}: {count:,} examples")

    # Also load any combined file if it exists
    combined_path = Path(DATA_DIR) / "brittney-v14-combined.jsonl"
    if combined_path.exists():
        count = 0
        with open(combined_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        item = json.loads(line)
                        instruction = item.get('instruction', item.get('prompt', ''))
                        output = item.get('output', item.get('completion', ''))

                        text = f"### Instruction:\n{instruction}\n\n### Response:\n{output}"
                        all_data.append({
                            "text": text,
                            "difficulty": "medium"  # Default to medium
                        })
                        count += 1
                    except json.JSONDecodeError:
                        continue
        log(f"  - combined: {count:,} examples")

    log(f"Total examples: {len(all_data):,}")
    return Dataset.from_list(all_data)

def prepare_model():
    """Load and prepare model with QLoRA - Same as V13"""
    log("Loading base model with 4-bit quantization...")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
    )

    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    model.gradient_checkpointing_enable()
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=CONFIG["lora_r"],
        lora_alpha=CONFIG["lora_alpha"],
        target_modules=CONFIG["target_modules"],
        lora_dropout=CONFIG["lora_dropout"],
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    return model

def main():
    log("="*60)
    log("BRITTNEY V14 - Hololand Oasis HoloScript Training")
    log("="*60)
    log(f"Epochs: {CONFIG['num_epochs']}")
    log(f"Batch size: {CONFIG['batch_size']} x {CONFIG['gradient_accumulation_steps']} = {CONFIG['batch_size'] * CONFIG['gradient_accumulation_steps']}")
    log(f"Max length: {CONFIG['max_length']}")
    log(f"LoRA: r={CONFIG['lora_r']}, alpha={CONFIG['lora_alpha']}")
    log(f"Target modules: {CONFIG['target_modules']}")
    log(f"4-bit quantization: enabled")

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load curriculum dataset
    dataset = load_curriculum_data()

    # Tokenize
    def tokenize(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=CONFIG["max_length"],
            padding="max_length",
        )

    log("Tokenizing dataset...")
    tokenized = dataset.map(tokenize, batched=True, remove_columns=["text", "difficulty"])

    # Split train/eval
    split = tokenized.train_test_split(test_size=0.05, seed=42)
    log(f"Train: {len(split['train']):,}, Eval: {len(split['test']):,}")

    # Load model
    model = prepare_model()

    # Create output dir
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Calculate total steps
    total_steps = (len(split['train']) // (CONFIG['batch_size'] * CONFIG['gradient_accumulation_steps'])) * CONFIG['num_epochs']
    log(f"Total training steps: {total_steps:,}")

    # Training arguments
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=CONFIG["num_epochs"],
        per_device_train_batch_size=CONFIG["batch_size"],
        gradient_accumulation_steps=CONFIG["gradient_accumulation_steps"],
        learning_rate=CONFIG["learning_rate"],
        warmup_ratio=CONFIG["warmup_ratio"],
        weight_decay=CONFIG["weight_decay"],
        logging_steps=CONFIG["logging_steps"],
        save_steps=CONFIG["save_steps"],
        eval_steps=CONFIG["eval_steps"],
        eval_strategy="steps",
        save_strategy="steps",
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        bf16=True,
        gradient_checkpointing=True,
        optim="paged_adamw_8bit",
        dataloader_num_workers=4,
        report_to="none",
    )

    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=split["train"],
        eval_dataset=split["test"],
        data_collator=data_collator,
    )

    # Train
    log("Starting V14 training...")
    start_time = datetime.now()

    try:
        trainer.train()

        log("Training complete! Saving final model...")
        trainer.save_model(OUTPUT_DIR)
        tokenizer.save_pretrained(OUTPUT_DIR)

        duration = datetime.now() - start_time
        log(f"V14 Training completed in {duration}")
        log(f"Model saved to: {OUTPUT_DIR}")

        with open(Path(OUTPUT_DIR) / "training_info.json", "w") as f:
            json.dump({
                "version": "v14",
                "dataset": "Hololand Oasis HoloScript Training Data",
                "completed": True,
                "epochs": CONFIG["num_epochs"],
                "duration": str(duration),
                "examples": len(dataset),
                "curriculum": ["easy", "medium", "hard", "frontier"],
                "lora_r": CONFIG["lora_r"],
                "lora_alpha": CONFIG["lora_alpha"],
                "base_model": "Phi-3.5-mini-instruct",
            }, f, indent=2)

    except Exception as e:
        log(f"ERROR: {str(e)}")
        raise

if __name__ == "__main__":
    main()
