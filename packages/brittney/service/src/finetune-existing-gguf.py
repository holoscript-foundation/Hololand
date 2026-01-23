#!/usr/bin/env python3
"""
Fine-tune existing brittney-f16.gguf model with HoloScript examples
Preserves 300K+ existing knowledge + adds 27 new game generation examples
Uses unsloth for efficient fine-tuning on consumer GPUs
"""

import os
import json
from pathlib import Path
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, TextIterableDataset
from datasets import Dataset
import argparse
from typing import Dict, List, Any
import warnings

warnings.filterwarnings("ignore")


class ExistingModelFineTuner:
    """Fine-tune existing brittney model with new HoloScript examples"""
    
    def __init__(self, model_path: str, training_data_path: str):
        """
        Args:
            model_path: Path to brittney-f16.gguf or HF model
            training_data_path: Path to brittney-finetuning-data.jsonl
        """
        self.model_path = model_path
        self.training_data_path = Path(training_data_path)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.examples: List[Dict[str, Any]] = []
        
        print(f"✅ Using device: {self.device}")
        print(f"✅ GPU available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
            print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    
    def load_training_data(self) -> None:
        """Load JSONL training examples"""
        print(f"\n📂 Loading training data from {self.training_data_path}...")
        
        with open(self.training_data_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        self.examples.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        
        print(f"✅ Loaded {len(self.examples)} training examples")
    
    def prepare_dataset(self):
        """Convert training examples to HF Dataset format"""
        print(f"\n📋 Preparing dataset...")
        
        formatted_examples = []
        for example in self.examples:
            text = f"""System: You are Brittney, an AI specialist in HoloScript game development and Hololand world creation. Generate production-ready game code.

User: {example['messages'][1]['content']}