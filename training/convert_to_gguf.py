#!/usr/bin/env python3
"""
Convert Brittney V14 LoRA to GGUF format for Ollama
===================================================
1. Merge LoRA with base model (Phi-3.5-mini-instruct)
2. Convert merged model to GGUF
3. Quantize to Q4_K_M for efficient inference
"""

import os
import subprocess
import shutil
from pathlib import Path

# Paths
LORA_PATH = "/workspace/brittney-loras/brittney-v14-lora"
BASE_MODEL = "microsoft/Phi-3.5-mini-instruct"
MERGED_PATH = "/workspace/brittney-v14-merged"
GGUF_OUTPUT = "/workspace/brittney-v14.gguf"
GGUF_Q4 = "/workspace/brittney-v14-q4_k_m.gguf"

def install_dependencies():
    """Install required packages"""
    print("Installing dependencies...")
    subprocess.run([
        "pip", "install", "--quiet",
        "transformers>=4.36.0",
        "peft>=0.7.0",
        "accelerate>=0.25.0",
        "sentencepiece",
        "protobuf",
    ], check=True)

    # Clone llama.cpp if not present
    if not Path("/workspace/llama.cpp").exists():
        print("Cloning llama.cpp...")
        subprocess.run([
            "git", "clone", "--depth=1",
            "https://github.com/ggerganov/llama.cpp.git",
            "/workspace/llama.cpp"
        ], check=True)

        # Install Python requirements for conversion
        subprocess.run([
            "pip", "install", "--quiet", "-r",
            "/workspace/llama.cpp/requirements.txt"
        ], check=True)

def merge_lora():
    """Merge LoRA adapter with base model"""
    print(f"\n{'='*60}")
    print("STEP 1: Merging LoRA with base model")
    print(f"{'='*60}")

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from peft import PeftModel

    print(f"Loading base model: {BASE_MODEL}")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )

    print(f"Loading LoRA adapter: {LORA_PATH}")
    model = PeftModel.from_pretrained(base_model, LORA_PATH)

    print("Merging LoRA weights...")
    model = model.merge_and_unload()

    print(f"Saving merged model to: {MERGED_PATH}")
    model.save_pretrained(MERGED_PATH, safe_serialization=True)

    # Save tokenizer
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    tokenizer.save_pretrained(MERGED_PATH)

    print("Merge complete!")
    return MERGED_PATH

def convert_to_gguf():
    """Convert merged model to GGUF format"""
    print(f"\n{'='*60}")
    print("STEP 2: Converting to GGUF format")
    print(f"{'='*60}")

    convert_script = "/workspace/llama.cpp/convert_hf_to_gguf.py"

    subprocess.run([
        "python3", convert_script,
        MERGED_PATH,
        "--outfile", GGUF_OUTPUT,
        "--outtype", "f16",
    ], check=True)

    print(f"GGUF saved to: {GGUF_OUTPUT}")
    return GGUF_OUTPUT

def quantize_gguf():
    """Quantize GGUF to Q4_K_M for efficient inference"""
    print(f"\n{'='*60}")
    print("STEP 3: Quantizing to Q4_K_M")
    print(f"{'='*60}")

    # Build llama.cpp quantize tool if needed
    quantize_bin = "/workspace/llama.cpp/build/bin/llama-quantize"
    if not Path(quantize_bin).exists():
        print("Building llama.cpp...")
        subprocess.run([
            "cmake", "-B", "build", "-DLLAMA_CUDA=ON"
        ], cwd="/workspace/llama.cpp", check=True)
        subprocess.run([
            "cmake", "--build", "build", "--config", "Release", "-j"
        ], cwd="/workspace/llama.cpp", check=True)

    subprocess.run([
        quantize_bin,
        GGUF_OUTPUT,
        GGUF_Q4,
        "Q4_K_M"
    ], check=True)

    print(f"Quantized GGUF saved to: {GGUF_Q4}")
    return GGUF_Q4

def create_modelfile():
    """Create Ollama Modelfile"""
    print(f"\n{'='*60}")
    print("STEP 4: Creating Ollama Modelfile")
    print(f"{'='*60}")

    modelfile_content = '''FROM ./brittney-v14-q4_k_m.gguf

TEMPLATE """<|system|>
You are Brittney, an expert AI assistant for HoloScript and Hololand development. You help create immersive VR/AR experiences using HoloScript (.holo files). Always provide clean, working code with proper syntax.
<|end|>
<|user|>
{{ .Prompt }}
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

SYSTEM """You are Brittney, an expert AI assistant specializing in HoloScript development for the Hololand metaverse platform.

Your capabilities:
- Generate HoloScript code (.holo files) for 3D scenes, objects, and interactions
- Explain HoloScript syntax and best practices
- Debug and optimize HoloScript code
- Create compositions, objects, materials, and behaviors
- Help with VR/AR spatial design and user interactions

Always use modern HoloScript syntax with:
- composition/object structure (not legacy orb syntax)
- mesh: property (not geometry:)
- #RRGGBB color format (not 0xRRGGBB)
- .holo file extension

Provide clear, working code examples with explanations."""
'''

    modelfile_path = "/workspace/Modelfile.brittney-v14"
    with open(modelfile_path, 'w') as f:
        f.write(modelfile_content)

    print(f"Modelfile saved to: {modelfile_path}")
    return modelfile_path

def main():
    print("="*60)
    print("BRITTNEY V14 - LoRA to GGUF Conversion")
    print("="*60)

    try:
        install_dependencies()
        merge_lora()
        convert_to_gguf()
        quantize_gguf()
        create_modelfile()

        print(f"\n{'='*60}")
        print("CONVERSION COMPLETE!")
        print(f"{'='*60}")
        print(f"\nOutput files:")
        print(f"  - Merged model:   {MERGED_PATH}")
        print(f"  - GGUF (f16):     {GGUF_OUTPUT}")
        print(f"  - GGUF (Q4_K_M):  {GGUF_Q4}")
        print(f"  - Modelfile:      /workspace/Modelfile.brittney-v14")
        print(f"\nTo import into Ollama:")
        print(f"  cd /workspace && ollama create brittney-v14 -f Modelfile.brittney-v14")

    except Exception as e:
        print(f"\nERROR: {e}")
        raise

if __name__ == "__main__":
    main()
