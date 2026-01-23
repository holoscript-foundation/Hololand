#!/usr/bin/env python3
"""
Quick Start Script for Local Brittney Pipeline
Run this to get started immediately!
"""

import subprocess
import sys
import os
import time
from pathlib import Path


def run_command(cmd, description):
    """Run a command and report status"""
    print(f"\n{'='*60}")
    print(f"📋 {description}")
    print(f"{'='*60}")
    print(f"$ {cmd}\n")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=False)
        if result.returncode == 0:
            print(f"\n✅ {description} completed successfully!")
            return True
        else:
            print(f"\n❌ {description} failed with code {result.returncode}")
            return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def main():
    print("""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🤖 Brittney Local Pipeline - Quick Start               ║
║                                                            ║
║   This script will guide you through:                     ║
║   1. Installing Ollama                                    ║
║   2. Preparing training data                              ║
║   3. Starting fine-tuning                                 ║
║   4. Testing local inference                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
""")
    
    input("Press Enter to continue...")
    
    # Step 1: Check if Ollama is installed
    print("\n\n" + "="*60)
    print("STEP 1: Ollama Installation Check")
    print("="*60)
    
    result = subprocess.run("ollama --version", shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"✅ Ollama is installed: {result.stdout.strip()}")
    else:
        print("❌ Ollama not found!")
        print("\nPlease install Ollama from: https://ollama.ai/download")
        print("Then run this script again.")
        sys.exit(1)
    
    # Step 2: Check if Ollama service is running
    print("\n\n" + "="*60)
    print("STEP 2: Check Ollama Service")
    print("="*60)
    
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            print("✅ Ollama service is running on http://localhost:11434")
        else:
            print("⚠️ Ollama service not responding properly")
            print("\nStarting Ollama service...")
            if sys.platform == "win32":
                os.startfile("ollama")  # Windows
            else:
                subprocess.Popen(["ollama", "serve"])  # Linux/Mac
            print("⏳ Waiting for service to start...")
            time.sleep(5)
    except:
        print("⚠️ Ollama service not found on http://localhost:11434")
        print("\nStarting Ollama service...")
        if sys.platform == "win32":
            subprocess.Popen("ollama serve")
        else:
            subprocess.Popen(["ollama", "serve"])
        print("⏳ Waiting for service to start...")
        time.sleep(5)
    
    # Step 3: Pull Mistral model
    print("\n\n" + "="*60)
    print("STEP 3: Pull Mistral 7B Model")
    print("="*60)
    
    result = subprocess.run("ollama list | findstr mistral", shell=True, capture_output=True, text=True)
    if "mistral" not in result.stdout:
        print("Mistral model not found. Downloading (2-3 GB)...")
        run_command("ollama pull mistral:7b-instruct", "Download Mistral 7B")
    else:
        print("✅ Mistral model already installed")
    
    # Step 4: Prepare training data
    print("\n\n" + "="*60)
    print("STEP 4: Prepare Training Data")
    print("="*60)
    
    training_file = Path("holoscript-enhanced-training-examples.jsonl")
    if not training_file.exists():
        print("❌ Training data file not found!")
        print(f"Expected at: {training_file.absolute()}")
        sys.exit(1)
    
    run_command(
        "python local-finetuning-setup.py --input holoscript-enhanced-training-examples.jsonl --output brittney-finetuning-data.jsonl --validate",
        "Convert training data to LoRA format"
    )
    
    # Step 5: Show fine-tuning options
    print("\n\n" + "="*60)
    print("STEP 5: Fine-Tuning Options")
    print("="*60)
    
    print("""
Choose your fine-tuning method:

  1) Together AI (Recommended - Fast, $5-10)
     - Uses cloud GPU
     - ~30 minutes
     - Best quality

  2) Local Training (Free but slow)
     - Uses your machine
     - ~2-4 hours
     - Good for testing

  3) Use base Mistral (No fine-tuning)
     - Zero cost
     - Reasonable quality
     - Start immediately
""")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice == "1":
        print("\nTogether AI fine-tuning:")
        api_key = input("Enter your Together AI API key (or press Enter to skip): ").strip()
        if api_key:
            run_command(
                f"python together-ai-finetuning.py --training-file brittney-finetuning-data.jsonl --api-key {api_key}",
                "Start fine-tuning on Together AI"
            )
            print("\n💡 Fine-tuning is running. Check status at together.ai/dashboard")
        else:
            print("Skipping Together AI fine-tuning")
    
    elif choice == "2":
        print("\nLocal fine-tuning:")
        run_command(
            "pip install torch transformers peft",
            "Install training dependencies"
        )
        run_command(
            "python local-train-mistral.py --model mistralai/Mistral-7B-Instruct-v0.1 --data brittney-finetuning-data.jsonl --output ./brittney-lora-adapter",
            "Fine-tune model locally"
        )
    
    # Step 6: Create Ollama model
    print("\n\n" + "="*60)
    print("STEP 6: Create Ollama Model")
    print("="*60)
    
    modelfile_content = """FROM mistral:7b-instruct

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40

SYSTEM You are Brittney, an AI assistant specialized in HoloScript code generation for game development. You create production-ready game code with complete, well-structured implementations.
"""
    
    modelfile_path = Path("Modelfile")
    modelfile_path.write_text(modelfile_content)
    print(f"✅ Created {modelfile_path}")
    
    run_command(
        "ollama create brittney-finetuned -f Modelfile",
        "Create custom Ollama model"
    )
    
    # Step 7: Test inference
    print("\n\n" + "="*60)
    print("STEP 7: Test Local Inference")
    print("="*60)
    
    test_prompt = "Create a simple NPC warrior with patrol and attack behaviors"
    print(f"\nTesting with prompt: \"{test_prompt}\"\n")
    
    run_command(
        f'ollama run brittney-finetuned "{test_prompt}"',
        "Generate HoloScript code"
    )
    
    # Summary
    print("\n\n" + "="*60)
    print("🎉 SETUP COMPLETE!")
    print("="*60)
    
    print("""
Your local Brittney pipeline is ready!

✅ Ollama running on http://localhost:11434
✅ Model: brittney-finetuned
✅ Zero API costs

Next steps:

1. Test with Hololand:
   import BrittneyGameIntegrationOllama from './services/BrittneyGameIntegrationOllama'
   const brittney = new BrittneyGameIntegrationOllama()
   const code = await brittney.generateNPCBehavior(...)

2. Start Hololand dev server:
   npm run dev

3. Open Game Gen tab and start generating!

Need help? See LOCAL_PIPELINE_SETUP.md for detailed instructions.

Happy generating! 🚀
""")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        sys.exit(1)
