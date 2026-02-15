#!/usr/bin/env python3
"""
Merge Brittney V14 LoRA with Phi-3.5-mini-instruct and convert to GGUF
======================================================================
Optimized for systems with limited VRAM (uses CPU offloading)
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Paths
LORA_PATH = Path("C:/Users/josep/Documents/GitHub/Hololand/packages/brittney/loras/brittney-v14-lora")
BASE_MODEL = "microsoft/Phi-3.5-mini-instruct"
OUTPUT_DIR = Path("C:/Users/josep/Documents/GitHub/Hololand/packages/brittney/models")
MERGED_PATH = OUTPUT_DIR / "brittney-v14-merged"
GGUF_F16 = OUTPUT_DIR / "brittney-v14-f16.gguf"
GGUF_Q8 = OUTPUT_DIR / "brittney-v14-q8_0.gguf"
GGUF_Q4 = OUTPUT_DIR / "brittney-v14-q4_k_m.gguf"

def install_dependencies():
    """Install required packages"""
    print("\n[1/5] Installing dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install", "--quiet",
        "transformers>=4.36.0",
        "peft>=0.7.0",
        "accelerate>=0.25.0",
        "sentencepiece",
        "protobuf",
        "torch",
    ], check=True)
    print("Dependencies installed.")

def clone_llama_cpp():
    """Clone llama.cpp for conversion"""
    llama_cpp_path = OUTPUT_DIR / "llama.cpp"

    if not llama_cpp_path.exists():
        print("\n[2/5] Cloning llama.cpp...")
        subprocess.run([
            "git", "clone", "--depth=1",
            "https://github.com/ggerganov/llama.cpp.git",
            str(llama_cpp_path)
        ], check=True)

    # Install conversion requirements (skip torch version constraint)
    print("  Installing llama.cpp conversion dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install", "--quiet",
        "numpy", "sentencepiece", "transformers", "gguf>=0.1.0"
    ], check=True)

    return llama_cpp_path

def merge_lora():
    """Merge LoRA adapter with base model using CPU to save VRAM"""
    print("\n[3/5] Merging LoRA with base model (using CPU)...")
    print(f"  Base model: {BASE_MODEL}")
    print(f"  LoRA path: {LORA_PATH}")
    print(f"  Output: {MERGED_PATH}")

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    # Force CPU to avoid VRAM issues
    device = "cpu"
    print(f"  Using device: {device}")

    print("  Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map=device,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )

    print("  Loading LoRA adapter...")
    model = PeftModel.from_pretrained(base_model, str(LORA_PATH))

    print("  Merging weights...")
    model = model.merge_and_unload()

    print("  Saving merged model...")
    MERGED_PATH.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(MERGED_PATH), safe_serialization=True)

    # Save tokenizer
    print("  Saving tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    tokenizer.save_pretrained(str(MERGED_PATH))

    print("  Merge complete!")
    return MERGED_PATH

def convert_to_gguf(llama_cpp_path: Path):
    """Convert merged model to GGUF format"""
    print("\n[4/5] Converting to GGUF (F16)...")

    convert_script = llama_cpp_path / "convert_hf_to_gguf.py"

    subprocess.run([
        sys.executable, str(convert_script),
        str(MERGED_PATH),
        "--outfile", str(GGUF_F16),
        "--outtype", "f16",
    ], check=True)

    print(f"  F16 GGUF saved to: {GGUF_F16}")
    return GGUF_F16

def quantize_gguf(llama_cpp_path: Path):
    """Quantize GGUF to Q8_0 and Q4_K_M"""
    print("\n[5/5] Quantizing GGUF models...")

    # Check if llama-quantize exists, if not build it
    quantize_bin = llama_cpp_path / "build" / "bin" / "llama-quantize"
    if sys.platform == "win32":
        quantize_bin = llama_cpp_path / "build" / "bin" / "Release" / "llama-quantize.exe"

    if not quantize_bin.exists():
        print("  Building llama.cpp (this may take a few minutes)...")
        build_dir = llama_cpp_path / "build"
        build_dir.mkdir(exist_ok=True)

        # Configure with CMake
        subprocess.run([
            "cmake", "-B", str(build_dir), "-S", str(llama_cpp_path),
            "-DLLAMA_CUDA=OFF",  # Use CPU for quantization
        ], check=True)

        # Build
        subprocess.run([
            "cmake", "--build", str(build_dir), "--config", "Release", "-j"
        ], check=True)

        # Find the quantize binary
        for possible_path in [
            llama_cpp_path / "build" / "bin" / "llama-quantize",
            llama_cpp_path / "build" / "bin" / "Release" / "llama-quantize.exe",
            llama_cpp_path / "build" / "llama-quantize",
            llama_cpp_path / "build" / "Release" / "llama-quantize.exe",
        ]:
            if possible_path.exists():
                quantize_bin = possible_path
                break

    if not quantize_bin.exists():
        print(f"  WARNING: Could not find llama-quantize at {quantize_bin}")
        print("  Skipping quantization - you can quantize manually later.")
        return

    # Quantize to Q8_0
    print("  Quantizing to Q8_0...")
    subprocess.run([
        str(quantize_bin),
        str(GGUF_F16),
        str(GGUF_Q8),
        "Q8_0"
    ], check=True)
    print(f"  Q8_0 saved to: {GGUF_Q8}")

    # Quantize to Q4_K_M
    print("  Quantizing to Q4_K_M...")
    subprocess.run([
        str(quantize_bin),
        str(GGUF_F16),
        str(GGUF_Q4),
        "Q4_K_M"
    ], check=True)
    print(f"  Q4_K_M saved to: {GGUF_Q4}")

def create_modelfiles():
    """Create Ollama Modelfiles for all variants"""
    print("\nCreating Ollama Modelfiles...")

    system_prompt = '''You are Brittney V14, an expert AI assistant specializing in HoloScript development for the Hololand metaverse platform. You were fine-tuned on 114,656 examples of modern HoloScript code.

Your capabilities:
- Generate HoloScript code (.holo files) for 3D scenes, objects, and interactions
- Explain HoloScript syntax and best practices
- Debug and optimize HoloScript code
- Create compositions, objects, materials, and behaviors
- Help with VR/AR spatial design and user interactions

IMPORTANT - Always use MODERN HoloScript syntax:
- Use composition/object structure (NOT legacy 'orb' syntax)
- Use 'mesh:' property (NOT 'geometry:')
- Use '#RRGGBB' color format (NOT '0xRRGGBB')
- Use 'box' mesh type (NOT 'cube')
- Use .holo file extension

Example modern syntax:
```holo
composition "MyScene" {
  object "cube" {
    mesh: "box"
    position: [0, 1, 0]
    scale: [1, 1, 1]
    material {
      color: "#4287f5"
      metalness: 0.5
    }
  }
}
```'''

    template = '''<|system|>
{system_prompt}
<|end|>
<|user|>
{{{{ .Prompt }}}}
<|end|>
<|assistant|>
'''

    variants = [
        ("brittney-v14-f16", GGUF_F16, "Full precision F16"),
        ("brittney-v14-q8", GGUF_Q8, "Q8_0 quantized"),
        ("brittney-v14", GGUF_Q4, "Q4_K_M quantized (recommended)"),
    ]

    for name, gguf_path, desc in variants:
        modelfile_path = OUTPUT_DIR / f"Modelfile.{name}"

        content = f'''# {name} - {desc}
FROM {gguf_path.name}

TEMPLATE """<|system|>
You are Brittney V14, an expert AI assistant for HoloScript and Hololand development.
<|end|>
<|user|>
{{{{ .Prompt }}}}
<|end|>
<|assistant|>
"""

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_predict 2048
PARAMETER stop "<|end|>"
PARAMETER stop "<|user|>"
PARAMETER stop "<|assistant|>"

SYSTEM """{system_prompt}"""
'''

        with open(modelfile_path, 'w') as f:
            f.write(content)

        print(f"  Created: {modelfile_path}")

def print_summary():
    """Print final summary and next steps"""
    print("\n" + "="*60)
    print("CONVERSION COMPLETE!")
    print("="*60)

    print("\nOutput files:")
    for f in [MERGED_PATH, GGUF_F16, GGUF_Q8, GGUF_Q4]:
        if f.exists():
            if f.is_dir():
                size = sum(p.stat().st_size for p in f.rglob("*") if p.is_file())
            else:
                size = f.stat().st_size
            print(f"  {f.name}: {size / 1024 / 1024 / 1024:.2f} GB")

    print("\nTo import into Ollama, run:")
    print(f"  cd {OUTPUT_DIR}")
    print(f"  ollama create brittney-v14 -f Modelfile.brittney-v14")
    print(f"  ollama create brittney-v14-q8 -f Modelfile.brittney-v14-q8")
    print(f"  ollama create brittney-v14-f16 -f Modelfile.brittney-v14-f16")

def main():
    print("="*60)
    print("BRITTNEY V14 - LoRA Merge & GGUF Conversion")
    print("="*60)
    print(f"LoRA: {LORA_PATH}")
    print(f"Base: {BASE_MODEL}")
    print(f"Output: {OUTPUT_DIR}")

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        install_dependencies()
        llama_cpp_path = clone_llama_cpp()
        merge_lora()
        convert_to_gguf(llama_cpp_path)
        quantize_gguf(llama_cpp_path)
        create_modelfiles()
        print_summary()

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
