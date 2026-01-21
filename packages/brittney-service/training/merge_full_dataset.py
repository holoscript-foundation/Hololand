#!/usr/bin/env python3
"""
Merge all Brittney training data into a single JSONL file for OpenAI fine-tuning.
"""
import json
import hashlib
from pathlib import Path
from collections import defaultdict
from typing import Any

# Paths
UAA2_TRAINING = Path(r'C:\Users\josep\Documents\GitHub\AI_Workspace\uAA2\training')
HOLOLAND_TRAINING = Path(r'C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training')
OUTPUT_FILE = HOLOLAND_TRAINING / 'brittney-full-training.jsonl'

# Files to merge (in priority order)
FILES_TO_MERGE = [
    # Phase 1: Foundation (identity, anti-hallucination, basics)
    UAA2_TRAINING / 'phase1_foundation' / 'train.jsonl',
    
    # HoloScript specific
    UAA2_TRAINING / 'brittney_curriculum' / 'holoscript_nl_to_code.jsonl',
    UAA2_TRAINING / 'brittney' / 'phase2' / 'holoscript_syntax.jsonl',
    
    # VR/AR capabilities
    UAA2_TRAINING / 'brittney' / 'phase2' / 'vr_ar_interaction.jsonl',
    UAA2_TRAINING / 'brittney' / 'phase2' / 'spatial_reasoning.jsonl',
    UAA2_TRAINING / 'brittney' / 'phase2' / 'oasis_navigation.jsonl',
    UAA2_TRAINING / 'brittney' / 'phase2' / 'hybrid_mode.jsonl',
    
    # Curriculum layers
    UAA2_TRAINING / 'brittney_curriculum' / 'layer1_foundation.jsonl',
    UAA2_TRAINING / 'brittney_curriculum' / 'layer2_core.jsonl',
    UAA2_TRAINING / 'brittney_curriculum' / 'layer3_advanced.jsonl',
    
    # Knowledge modules
    UAA2_TRAINING / 'brittney_curriculum' / 'hololand_examples_knowledge.jsonl',
    UAA2_TRAINING / 'brittney_curriculum' / 'best_practices_knowledge.jsonl',
    UAA2_TRAINING / 'brittney_curriculum' / 'bug_fix_patterns_knowledge.jsonl',
    UAA2_TRAINING / 'brittney_curriculum' / 'tool_usage_knowledge.jsonl',
    
    # Clean HoloScript examples (highest quality)
    HOLOLAND_TRAINING / 'brittney-training-clean.jsonl',
]

def get_content_hash(obj: dict[str, Any]) -> str:
    """Create a hash of the message content for deduplication."""
    content: str
    if 'messages' in obj:
        content = ''.join(str(m.get('content', '')) for m in obj['messages'])
    else:
        content = str(obj.get('prompt', '')) + str(obj.get('completion', ''))
    return hashlib.md5(content.encode()).hexdigest()

def main():
    seen_hashes: set[str] = set()
    total_read = 0
    total_written = 0
    stats: defaultdict[str, int] = defaultdict(int)
    
    print("🔄 Merging Brittney training data...")
    print("=" * 60)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_file:
        for file_path in FILES_TO_MERGE:
            if not file_path.exists():
                print(f"⚠️  Skipping (not found): {file_path.name}")
                continue
            
            file_count = 0
            file_dupes = 0
            
            with open(file_path, 'r', encoding='utf-8') as in_file:
                for line in in_file:
                    total_read += 1
                    try:
                        obj = json.loads(line.strip())
                        content_hash = get_content_hash(obj)
                        
                        if content_hash in seen_hashes:
                            file_dupes += 1
                            continue
                        
                        seen_hashes.add(content_hash)
                        out_file.write(json.dumps(obj, ensure_ascii=False) + '\n')
                        total_written += 1
                        file_count += 1
                    except json.JSONDecodeError:
                        continue
            
            stats[file_path.name] = file_count
            status = f"✅ {file_path.name}: {file_count:,} examples"
            if file_dupes > 0:
                status += f" ({file_dupes:,} duplicates skipped)"
            print(status)
    
    print("=" * 60)
    print(f"\n📊 Summary:")
    print(f"   Files processed: {len([f for f in FILES_TO_MERGE if f.exists()])}")
    print(f"   Total read: {total_read:,}")
    print(f"   Total written: {total_written:,}")
    print(f"   Duplicates removed: {total_read - total_written:,}")
    print(f"\n📁 Output: {OUTPUT_FILE}")
    print(f"   Size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.1f} MB")
    
    # OpenAI has a limit - check if we need to sample
    if total_written > 100000:
        print(f"\n⚠️  Note: {total_written:,} examples is large for OpenAI fine-tuning.")
        print("   Consider using first 50K-100K for cost efficiency.")

if __name__ == '__main__':
    main()
