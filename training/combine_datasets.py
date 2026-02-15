#!/usr/bin/env python3
"""
Combine V13 dataset with new Hololand Oasis training data for V14.
"""

import json
from pathlib import Path

# Use normalized V13 data (modern .holo syntax)
V13_DATA = Path(__file__).parent / "v13_normalized.jsonl"
V14_NEW_DATA = Path(__file__).parent / "curriculum"
OUTPUT_DIR = Path(__file__).parent / "v14_combined"

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_data = []
    curriculum = {"easy": [], "medium": [], "hard": [], "frontier": []}

    # Load V13 data
    print(f"Loading V13 data from {V13_DATA}")
    v13_count = 0
    with open(V13_DATA, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                try:
                    item = json.loads(line)
                    # Normalize to instruction/output format
                    normalized = {
                        "instruction": item.get("instruction", ""),
                        "input": item.get("input", ""),
                        "output": item.get("output", "")
                    }
                    all_data.append(normalized)

                    # Assign to curriculum based on difficulty_score
                    score = item.get("difficulty_score", 0.5)
                    if score < 0.35:
                        curriculum["easy"].append(normalized)
                    elif score < 0.55:
                        curriculum["medium"].append(normalized)
                    elif score < 0.75:
                        curriculum["hard"].append(normalized)
                    else:
                        curriculum["frontier"].append(normalized)

                    v13_count += 1
                except json.JSONDecodeError:
                    continue

    print(f"  Loaded {v13_count:,} V13 examples")

    # Load new V14 curriculum data
    print(f"\nLoading new V14 data from {V14_NEW_DATA}")
    v14_count = 0
    for difficulty in ["easy", "medium", "hard", "frontier"]:
        filepath = V14_NEW_DATA / f"curriculum_{difficulty}.jsonl"
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        try:
                            item = json.loads(line)
                            all_data.append(item)
                            curriculum[difficulty].append(item)
                            v14_count += 1
                        except json.JSONDecodeError:
                            continue

    print(f"  Loaded {v14_count:,} new V14 examples")

    # Write combined curriculum files
    print(f"\nWriting combined curriculum to {OUTPUT_DIR}")
    for difficulty, items in curriculum.items():
        output_file = OUTPUT_DIR / f"curriculum_{difficulty}.jsonl"
        with open(output_file, 'w', encoding='utf-8') as f:
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        print(f"  {difficulty}: {len(items):,} examples")

    # Write combined file
    combined_file = OUTPUT_DIR / "brittney-v14-combined.jsonl"
    with open(combined_file, 'w', encoding='utf-8') as f:
        for item in all_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"\nCombined file: {combined_file}")

    # Summary
    total = len(all_data)
    print("\n" + "="*50)
    print("V14 COMBINED DATASET SUMMARY")
    print("="*50)
    print(f"  V13 examples:    {v13_count:,}")
    print(f"  New V14 examples: {v14_count:,}")
    print(f"  TOTAL:           {total:,}")
    print("="*50)
    for diff in ["easy", "medium", "hard", "frontier"]:
        print(f"  {diff:12}: {len(curriculum[diff]):,} examples")

    # Save summary
    summary = {
        "version": "v14",
        "total_examples": total,
        "sources": {
            "v13_comprehensive": v13_count,
            "v14_hololand_oasis": v14_count
        },
        "curriculum": {diff: len(curriculum[diff]) for diff in ["easy", "medium", "hard", "frontier"]},
        "base_model": "microsoft/Phi-3.5-mini-instruct"
    }
    with open(OUTPUT_DIR / "v14_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"\nSummary saved to {OUTPUT_DIR / 'v14_summary.json'}")

if __name__ == "__main__":
    main()
