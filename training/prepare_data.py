#!/usr/bin/env python3
"""
Prepare Brittney V14 Training Data
==================================
Converts prompt/completion format to curriculum-based alpaca format.
Assigns difficulty based on code complexity.
"""

import json
import re
from pathlib import Path
from collections import defaultdict

# Input/Output paths
INPUT_FILE = Path(__file__).parent.parent / "docs" / "brittney-training-data.jsonl"
OUTPUT_DIR = Path(__file__).parent / "curriculum"

def estimate_difficulty(prompt: str, completion: str) -> str:
    """Estimate difficulty based on content complexity."""

    # Count complexity indicators
    score = 0

    # Length-based scoring
    if len(completion) < 300:
        score += 0
    elif len(completion) < 800:
        score += 1
    elif len(completion) < 1500:
        score += 2
    else:
        score += 3

    # Trait count (each @ trait adds complexity)
    trait_count = len(re.findall(r'@\w+', completion))
    score += min(trait_count, 4)  # Cap at 4

    # Advanced features
    advanced_keywords = [
        '@networked', '@llm_agent', '@behavior_tree', '@gpu_', '@compute',
        '@procedural_', '@wfc', '@gaussian_splat', '@nerf', 'state_machine',
        '@digital_twin', '@nft', '@token_gated', 'compute_shader', 'vertex_shader',
        'fragment_shader', '@hand_tracking', '@body_tracking'
    ]
    for kw in advanced_keywords:
        if kw in completion.lower():
            score += 2

    # Medium features
    medium_keywords = [
        '@physics', '@grabbable', '@throwable', 'on_collision', 'animation',
        'particle_system', '@spatial_audio', 'state {', '@clickable',
        '@hoverable', 'template'
    ]
    for kw in medium_keywords:
        if kw in completion.lower():
            score += 1

    # Simple explanations (not code) are easy
    if '```' not in completion and len(completion) < 500:
        score = max(0, score - 2)

    # Assign difficulty tier
    if score <= 2:
        return "easy"
    elif score <= 5:
        return "medium"
    elif score <= 9:
        return "hard"
    else:
        return "frontier"

def convert_to_alpaca(item: dict) -> dict:
    """Convert prompt/completion to alpaca format."""
    return {
        "instruction": item.get("prompt", ""),
        "input": "",
        "output": item.get("completion", "")
    }

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Load data
    print(f"Loading data from {INPUT_FILE}")
    data = []
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    data.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    print(f"Loaded {len(data)} examples")

    # Classify by difficulty
    curriculum = defaultdict(list)
    for item in data:
        prompt = item.get("prompt", "")
        completion = item.get("completion", "")

        difficulty = estimate_difficulty(prompt, completion)
        alpaca_item = convert_to_alpaca(item)
        curriculum[difficulty].append(alpaca_item)

    # Write curriculum files
    for difficulty, items in curriculum.items():
        output_file = OUTPUT_DIR / f"curriculum_{difficulty}.jsonl"
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        print(f"  {difficulty}: {len(items)} examples -> {output_file}")

    # Also write combined file
    combined_file = OUTPUT_DIR / "brittney-v14-combined.jsonl"
    with open(combined_file, 'w', encoding='utf-8') as f:
        # Write in curriculum order
        for difficulty in ["easy", "medium", "hard", "frontier"]:
            for item in curriculum[difficulty]:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"\nCombined file: {combined_file} ({len(data)} examples)")

    # Summary
    print("\n" + "="*50)
    print("CURRICULUM SUMMARY")
    print("="*50)
    total = 0
    for diff in ["easy", "medium", "hard", "frontier"]:
        count = len(curriculum[diff])
        total += count
        print(f"  {diff:12}: {count:4} examples")
    print(f"  {'TOTAL':12}: {total:4} examples")

    # Save summary
    summary = {
        "version": "v14",
        "total_examples": total,
        "curriculum": {diff: len(curriculum[diff]) for diff in ["easy", "medium", "hard", "frontier"]},
        "base_model": "microsoft/Phi-3.5-mini-instruct"
    }
    with open(OUTPUT_DIR / "v14_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"\nSummary saved to {OUTPUT_DIR / 'v14_summary.json'}")

if __name__ == "__main__":
    main()
