#!/usr/bin/env python3
"""
Normalize V13 HoloScript Syntax to Modern .holo Format
======================================================
Converts:
- hsplus code blocks → holo code blocks
- geometry: "cube" → mesh: "box"
- orb name {} → composition "name" { object "main" {} }
- color: 0xff0000 → color: "#ff0000"
"""

import json
import re
from pathlib import Path

V13_DATA = Path("C:/Users/josep/Documents/GitHub/TrainingMonkey/generated/v13_combined/brittney-v13-combined.jsonl")
OUTPUT_FILE = Path(__file__).parent / "v13_normalized.jsonl"

# Syntax conversion mappings
GEOMETRY_TO_MESH = {
    '"cube"': '"box"',
    '"sphere"': '"sphere"',
    '"cylinder"': '"cylinder"',
    '"plane"': '"plane"',
    '"cone"': '"cone"',
    '"torus"': '"torus"',
}

def normalize_code(code: str) -> str:
    """Convert hsplus syntax to modern holo syntax."""

    # Skip if already using holo format
    if 'composition' in code:
        return code

    # Replace code block markers
    code = re.sub(r'```hsplus', '```holo', code)
    code = re.sub(r'```hs\b', '```holo', code)

    # Convert geometry to mesh
    code = re.sub(r'\bgeometry:', 'mesh:', code)

    # Normalize mesh type names (cube → box in modern syntax)
    code = re.sub(r'mesh:\s*"cube"', 'mesh: "box"', code)
    code = re.sub(r'"cube"', '"box"', code)  # Also catch standalone references

    # Convert hex colors from 0x format to # format
    def convert_hex(match):
        hex_val = match.group(1)
        return f'"#{hex_val}"'
    code = re.sub(r'\b0x([0-9a-fA-F]{6})\b', convert_hex, code)

    # Convert orb to composition/object structure
    # Match: orb Name { ... } or orb Name @trait { ... }
    def convert_orb(match):
        indent = match.group(1) or ''
        name = match.group(2)
        traits = match.group(3) or ''
        body = match.group(4)

        # Clean up traits
        traits = traits.strip()
        if traits:
            traits = f'\n    {traits}'

        # Properly indent the body
        body_lines = body.strip().split('\n')
        indented_body = '\n'.join(f'      {line.strip()}' for line in body_lines if line.strip())

        return f'''{indent}composition "{name}" {{
  object "main" {{{traits}
{indented_body}
  }}
}}'''

    # Simple orb conversion (without nested parsing)
    code = re.sub(
        r'^(\s*)orb\s+(\w+)\s*(@[\w\s@(),:.\-\"\']+)?\s*\{([^}]+)\}',
        convert_orb,
        code,
        flags=re.MULTILINE
    )

    return code

def normalize_instruction(instruction: str) -> str:
    """Normalize instruction text for consistency."""
    # Replace HoloScript+ references with HoloScript
    instruction = re.sub(r'HoloScript\+', 'HoloScript', instruction)
    instruction = re.sub(r'\.hsplus', '.holo', instruction)
    return instruction

def process_item(item: dict) -> dict:
    """Process a single training item."""
    instruction = item.get('instruction', '')
    output = item.get('output', '')

    # Base result with preserved difficulty_score
    result = {
        'instruction': normalize_instruction(instruction),
        'input': item.get('input', ''),
        'output': output
    }

    # Preserve difficulty_score if present
    if 'difficulty_score' in item:
        result['difficulty_score'] = item['difficulty_score']

    # Skip non-code items (explanations, questions)
    if '```' not in output:
        return result

    # Normalize code in output
    result['output'] = normalize_code(output)

    return result

def main():
    print(f"Loading V13 data from {V13_DATA}")

    normalized = []
    skipped = 0
    converted = 0

    with open(V13_DATA, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if not line.strip():
                continue

            try:
                item = json.loads(line)
                output = item.get('output', '')

                # Skip items that don't have code or are already in holo format
                if '```hsplus' in output or '```hs\n' in output or 'geometry:' in output:
                    result = process_item(item)
                    if result['output'] != output:
                        converted += 1
                else:
                    result = process_item(item)

                normalized.append(result)

            except json.JSONDecodeError:
                skipped += 1
                continue

            if (i + 1) % 10000 == 0:
                print(f"  Processed {i + 1:,} items...")

    # Write normalized data
    print(f"\nWriting {len(normalized):,} normalized items to {OUTPUT_FILE}")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        for item in normalized:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')

    print(f"\n{'='*50}")
    print("NORMALIZATION SUMMARY")
    print(f"{'='*50}")
    print(f"  Total items:    {len(normalized):,}")
    print(f"  Converted:      {converted:,}")
    print(f"  Skipped:        {skipped}")
    print(f"  Output:         {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
