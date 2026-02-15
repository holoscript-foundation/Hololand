#!/usr/bin/env python3
"""
BRITTNEY V15 TRAINING SCRIPT - Optimized LoRA with DoRA/rsLoRA
==============================================================
Based on uAA2++ Protocol audit recommendations (2026-02-04):
- DoRA: +22-37% improvement via weight decomposition
- rsLoRA: Stabilizes high-rank training
- Full target modules: All attention + MLP layers
- Optimized rank: r=64 for local, r=128 for cloud

Improvements over V14:
- use_dora=True (Weight-Decomposed Low-Rank Adaptation)
- use_rslora=True (Rank-Stabilized LoRA)
- Increased rank from 32 to 64 for better DSL learning
- Full module targeting for maximum adaptation capacity
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
from datasets import Dataset

# =============================================================================
# V15 OPTIMIZED CONFIGURATION (Based on uAA2++ Audit)
# =============================================================================

BASE_MODEL = "microsoft/Phi-3.5-mini-instruct"
DATA_DIR = "/workspace/brittney-v15"
OUTPUT_DIR = "/workspace/brittney-loras/brittney-v15-lora"
LOG_FILE = "/workspace/brittney-v15-training.log"

# Detect hardware and set optimal config
def detect_hardware():
    """Detect GPU and return optimal configuration."""
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)

        if vram_gb >= 40:  # H100/H200/A100
            return "cloud"
        elif vram_gb >= 20:  # RTX 4090/3090
            return "high_local"
        else:  # RTX 3060/4060
            return "local"
    return "local"

HARDWARE = detect_hardware()

# Hardware-specific configurations
CONFIGS = {
    "cloud": {
        "num_epochs": 1,
        "batch_size": 16,
        "gradient_accumulation_steps": 2,
        "learning_rate": 2e-4,
        "max_length": 4096,
        "lora_r": 128,        # Higher rank for cloud
        "lora_alpha": 256,    # 2x rank
    },
    "high_local": {
        "num_epochs": 1,
        "batch_size": 4,
        "gradient_accumulation_steps": 8,
        "learning_rate": 2e-4,
        "max_length": 2048,
        "lora_r": 64,         # Optimized for DSL
        "lora_alpha": 128,    # 2x rank
    },
    "local": {
        "num_epochs": 1,
        "batch_size": 2,
        "gradient_accumulation_steps": 16,
        "learning_rate": 2e-4,
        "max_length": 1024,
        "lora_r": 64,         # Minimum for DSL quality
        "lora_alpha": 128,    # 2x rank
    },
}

# Select config based on hardware
HW_CONFIG = CONFIGS[HARDWARE]

CONFIG = {
    # Training parameters (hardware-specific)
    **HW_CONFIG,

    # Common parameters
    "warmup_ratio": 0.03,
    "weight_decay": 0.01,
    "save_steps": 500,
    "eval_steps": 500,
    "logging_steps": 25,
    "lora_dropout": 0.05,

    # V15 CRITICAL: Full module targeting for best adaptation
    "target_modules": [
        # Attention layers
        "q_proj", "k_proj", "v_proj", "o_proj",
        # MLP layers (critical for code generation)
        "gate_proj", "up_proj", "down_proj",
        # Phi-3 specific combined projections
        "qkv_proj", "gate_up_proj",
    ],

    # V15 NEW: Advanced LoRA features
    "use_dora": True,      # Weight-Decomposed LoRA (+22-37% improvement)
    "use_rslora": True,    # Rank-Stabilized LoRA (stable high-rank training)
}

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{timestamp}] {msg}\n")

def load_curriculum_data():
    """Load curriculum datasets in order: easy -> medium -> hard -> frontier"""
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

    # Also load combined file if exists
    combined_path = Path(DATA_DIR) / "brittney-v15-combined.jsonl"
    if not combined_path.exists():
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
                            "difficulty": "medium"
                        })
                        count += 1
                    except json.JSONDecodeError:
                        continue
        log(f"  - combined: {count:,} examples")

    log(f"Total examples: {len(all_data):,}")
    return Dataset.from_list(all_data)

def get_available_target_modules(model):
    """Dynamically detect available target modules in the model."""
    available = []
    target_candidates = CONFIG["target_modules"]

    for name, module in model.named_modules():
        for target in target_candidates:
            if target in name and target not in available:
                available.append(target)

    log(f"Available target modules: {available}")
    return available

def prepare_model():
    """Load and prepare model with optimized QLoRA + DoRA + rsLoRA"""
    log(f"Loading base model with 4-bit quantization (Hardware: {HARDWARE})...")

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

    # Detect available modules for this specific model
    available_modules = get_available_target_modules(model)

    # V15 OPTIMIZED LORA CONFIG
    lora_config = LoraConfig(
        r=CONFIG["lora_r"],
        lora_alpha=CONFIG["lora_alpha"],
        target_modules=available_modules,
        lora_dropout=CONFIG["lora_dropout"],
        bias="none",
        task_type="CAUSAL_LM",
        # V15 NEW: Advanced features
        use_dora=CONFIG["use_dora"],     # Weight decomposition
        use_rslora=CONFIG["use_rslora"], # Rank stabilization
    )

    log(f"LoRA Config:")
    log(f"  - Rank (r): {CONFIG['lora_r']}")
    log(f"  - Alpha: {CONFIG['lora_alpha']}")
    log(f"  - DoRA: {CONFIG['use_dora']} (Weight-Decomposed)")
    log(f"  - rsLoRA: {CONFIG['use_rslora']} (Rank-Stabilized)")
    log(f"  - Target Modules: {available_modules}")

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    return model

def main():
    log("=" * 70)
    log("BRITTNEY V15 - Optimized LoRA with DoRA + rsLoRA")
    log("Based on uAA2++ Protocol Audit (2026-02-04)")
    log("=" * 70)
    log(f"Hardware Profile: {HARDWARE}")
    log(f"Epochs: {CONFIG['num_epochs']}")
    log(f"Batch size: {CONFIG['batch_size']} x {CONFIG['gradient_accumulation_steps']} = {CONFIG['batch_size'] * CONFIG['gradient_accumulation_steps']}")
    log(f"Max length: {CONFIG['max_length']}")
    log(f"LoRA: r={CONFIG['lora_r']}, alpha={CONFIG['lora_alpha']}")
    log(f"DoRA: {CONFIG['use_dora']} | rsLoRA: {CONFIG['use_rslora']}")
    log(f"4-bit quantization: enabled (NF4)")

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
    log("Starting V15 training with DoRA + rsLoRA...")
    start_time = datetime.now()

    try:
        trainer.train()

        log("Training complete! Saving final model...")
        trainer.save_model(OUTPUT_DIR)
        tokenizer.save_pretrained(OUTPUT_DIR)

        duration = datetime.now() - start_time
        log(f"V15 Training completed in {duration}")
        log(f"Model saved to: {OUTPUT_DIR}")

        # Save training info
        training_info = {
            "version": "v15",
            "dataset": "Hololand Oasis HoloScript Training Data",
            "completed": True,
            "epochs": CONFIG["num_epochs"],
            "duration": str(duration),
            "examples": len(dataset),
            "curriculum": ["easy", "medium", "hard", "frontier"],
            "lora_r": CONFIG["lora_r"],
            "lora_alpha": CONFIG["lora_alpha"],
            "use_dora": CONFIG["use_dora"],
            "use_rslora": CONFIG["use_rslora"],
            "target_modules": CONFIG["target_modules"],
            "base_model": BASE_MODEL,
            "hardware_profile": HARDWARE,
            "audit_source": "uAA2++ Protocol 2026-02-04",
        }

        with open(Path(OUTPUT_DIR) / "training_info.json", "w") as f:
            json.dump(training_info, f, indent=2)

        log("V15 Training Info saved.")

    except Exception as e:
        log(f"ERROR: {str(e)}")
        raise

if __name__ == "__main__":
    main()
