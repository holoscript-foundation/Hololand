#!/usr/bin/env python3
"""
Local Fine-Tuning Pipeline for Brittney
Converts training data and prepares for cloud fine-tuning with Modal/Together AI
"""

import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any
import argparse


class BrittneyFineTuningPipeline:
    """Manages fine-tuning pipeline for Brittney using Mistral 7B base model"""
    
    def __init__(self, training_data_path: str):
        self.training_data_path = Path(training_data_path)
        self.examples: List[Dict[str, Any]] = []
        self.formatted_examples: List[Dict[str, Any]] = []
        
    def load_jsonl_training_data(self) -> None:
        """Load JSONL training examples"""
        if not self.training_data_path.exists():
            raise FileNotFoundError(f"Training data not found: {self.training_data_path}")
        
        with open(self.training_data_path, 'r') as f:
            for line in f:
                if line.strip():
                    self.examples.append(json.loads(line))
        
        print(f"✅ Loaded {len(self.examples)} training examples")
    
    def convert_to_lora_format(self) -> None:
        """Convert examples to LoRA fine-tuning format (system + user + assistant)"""
        self.formatted_examples = []
        
        for idx, example in enumerate(self.examples):
            formatted = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Brittney, an AI assistant specialized in HoloScript code generation for game development. You create production-ready game code including NPCs, quests, abilities, dialogues, scenes, state machines, and more. Your responses are complete, well-structured HoloScript code blocks."
                    },
                    {
                        "role": "user",
                        "content": example.get("prompt", "")
                    },
                    {
                        "role": "assistant",
                        "content": example.get("completion", "")
                    }
                ]
            }
            self.formatted_examples.append(formatted)
        
        print(f"✅ Converted {len(self.formatted_examples)} examples to LoRA format")
    
    def save_formatted_data(self, output_path: str) -> None:
        """Save formatted training data as JSONL"""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            for example in self.formatted_examples:
                f.write(json.dumps(example) + '\n')
        
        print(f"✅ Saved formatted training data to {output_file}")
        print(f"   File size: {output_file.stat().st_size / 1024:.2f} KB")
    
    def validate_training_data(self) -> Dict[str, Any]:
        """Validate training data quality"""
        stats = {
            "total_examples": len(self.formatted_examples),
            "avg_tokens_per_example": 0,
            "examples_by_feature": {},
            "quality_checks": {
                "all_have_messages": True,
                "all_have_system_role": True,
                "all_have_user_role": True,
                "all_have_assistant_role": True
            }
        }
        
        total_tokens = 0
        feature_keywords = {
            "npc": "NPC Behavior",
            "quest": "Quest System",
            "ability": "Ability/Spell",
            "dialogue": "Dialogue Tree",
            "scene": "Scene/Environment",
            "stateMachine": "State Machine",
            "sequence": "Sequence",
            "achievement": "Achievement",
            "localized": "Localization",
            "talent": "Talent Tree"
        }
        
        for example in self.formatted_examples:
            # Basic validation
            if "messages" not in example:
                stats["quality_checks"]["all_have_messages"] = False
            else:
                msgs = example["messages"]
                roles = [msg.get("role") for msg in msgs]
                
                if "system" not in roles:
                    stats["quality_checks"]["all_have_system_role"] = False
                if "user" not in roles:
                    stats["quality_checks"]["all_have_user_role"] = False
                if "assistant" not in roles:
                    stats["quality_checks"]["all_have_assistant_role"] = False
                
                # Count tokens (rough estimate)
                total_tokens += sum(len(msg.get("content", "").split()) * 1.3 for msg in msgs)
                
                # Categorize by feature
                user_content = next((msg.get("content", "") for msg in msgs if msg.get("role") == "user"), "")
                for keyword, feature in feature_keywords.items():
                    if keyword.lower() in user_content.lower():
                        stats["examples_by_feature"][feature] = stats["examples_by_feature"].get(feature, 0) + 1
        
        stats["avg_tokens_per_example"] = total_tokens / len(self.formatted_examples) if self.formatted_examples else 0
        
        return stats
    
    def print_validation_report(self, stats: Dict[str, Any]) -> None:
        """Print validation report"""
        print("\n" + "="*60)
        print("TRAINING DATA VALIDATION REPORT")
        print("="*60)
        print(f"\nTotal Examples: {stats['total_examples']}")
        print(f"Avg Tokens/Example: {stats['avg_tokens_per_example']:.0f}")
        print(f"Estimated Total Tokens: {stats['total_examples'] * stats['avg_tokens_per_example']:.0f}")
        
        print("\n📊 Examples by Feature:")
        for feature, count in sorted(stats['examples_by_feature'].items()):
            pct = (count / stats['total_examples']) * 100
            print(f"  • {feature}: {count} ({pct:.1f}%)")
        
        print("\n✓ Quality Checks:")
        for check, passed in stats['quality_checks'].items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"  {status} - {check}")
        
        print("\n" + "="*60)
        print("Ready for fine-tuning! 🚀")
        print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Prepare Brittney fine-tuning data")
    parser.add_argument(
        "--input",
        default="holoscript-enhanced-training-examples.jsonl",
        help="Input JSONL training file"
    )
    parser.add_argument(
        "--output",
        default="brittney-finetuning-data.jsonl",
        help="Output formatted training file"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Run validation checks"
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize pipeline
        pipeline = BrittneyFineTuningPipeline(args.input)
        
        # Load and process
        pipeline.load_jsonl_training_data()
        pipeline.convert_to_lora_format()
        pipeline.save_formatted_data(args.output)
        
        # Validate if requested
        if args.validate:
            stats = pipeline.validate_training_data()
            pipeline.print_validation_report(stats)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
