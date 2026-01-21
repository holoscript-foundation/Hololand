#!/usr/bin/env python3
"""
Modal/Together AI Fine-Tuning Script for Brittney
Handles cloud-based fine-tuning of Mistral 7B with LoRA
"""

import os
import json
import sys
from pathlib import Path
from typing import Optional
import requests
import time


class TogetherAIFineTuner:
    """Fine-tune Mistral 7B on Together AI"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("TOGETHER_API_KEY")
        if not self.api_key:
            raise ValueError("TOGETHER_API_KEY environment variable not set")
        
        self.base_url = "https://api.together.ai/v1"
        self.model_name = "mistralai/Mistral-7B-Instruct-v0.1"
        
    def upload_training_file(self, file_path: str) -> str:
        """Upload training data file"""
        print(f"📤 Uploading {file_path}...")
        
        with open(file_path, 'rb') as f:
            files = {'file': f}
            headers = {'Authorization': f'Bearer {self.api_key}'}
            
            response = requests.post(
                f"{self.base_url}/files/upload",
                files=files,
                headers=headers
            )
        
        if response.status_code != 200:
            raise Exception(f"Upload failed: {response.text}")
        
        file_id = response.json()['id']
        print(f"✅ File uploaded with ID: {file_id}")
        return file_id
    
    def start_finetuning_job(
        self,
        training_file_id: str,
        model_name: str = "brittney-holoscript-v1",
        epochs: int = 3,
        batch_size: int = 4,
        learning_rate: float = 1e-4
    ) -> str:
        """Start fine-tuning job on Together AI"""
        
        payload = {
            "training_file_id": training_file_id,
            "model": self.model_name,
            "n_epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "suffix": model_name
        }
        
        headers = {'Authorization': f'Bearer {self.api_key}'}
        
        print(f"\n🔧 Starting fine-tuning job...")
        print(f"   Base Model: {self.model_name}")
        print(f"   Epochs: {epochs}")
        print(f"   Batch Size: {batch_size}")
        print(f"   Learning Rate: {learning_rate}")
        
        response = requests.post(
            f"{self.base_url}/fine-tuning/jobs",
            json=payload,
            headers=headers
        )
        
        if response.status_code != 200:
            raise Exception(f"Fine-tuning job creation failed: {response.text}")
        
        job_id = response.json()['id']
        print(f"✅ Fine-tuning job created with ID: {job_id}")
        return job_id
    
    def check_job_status(self, job_id: str) -> dict:
        """Check fine-tuning job status"""
        headers = {'Authorization': f'Bearer {self.api_key}'}
        
        response = requests.get(
            f"{self.base_url}/fine-tuning/jobs/{job_id}",
            headers=headers
        )
        
        if response.status_code != 200:
            raise Exception(f"Status check failed: {response.text}")
        
        return response.json()
    
    def wait_for_completion(self, job_id: str, check_interval: int = 60) -> str:
        """Wait for fine-tuning to complete"""
        print(f"\n⏳ Waiting for fine-tuning to complete...")
        print(f"   (checking every {check_interval}s)")
        
        while True:
            status_data = self.check_job_status(job_id)
            status = status_data.get('status', 'unknown')
            
            if status == 'succeeded':
                model_id = status_data.get('fine_tuned_model', '')
                print(f"✅ Fine-tuning completed!")
                print(f"   Model ID: {model_id}")
                return model_id
            elif status == 'failed':
                print(f"❌ Fine-tuning failed!")
                print(f"   Error: {status_data.get('error', 'Unknown error')}")
                sys.exit(1)
            else:
                pct = status_data.get('progress', {}).get('percent_complete', 0)
                print(f"   Status: {status} ({pct}%)")
                time.sleep(check_interval)


class OllamaLocalSetup:
    """Setup for local Ollama deployment"""
    
    @staticmethod
    def create_modelfile(model_id: str, adapter_path: str = "") -> str:
        """Create Modelfile for Ollama"""
        modelfile = f"""FROM mistral:7b-instruct

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40

SYSTEM You are Brittney, an AI assistant specialized in HoloScript code generation for game development. You create production-ready game code with complete, well-structured implementations.
"""
        
        if adapter_path:
            modelfile += f"ADAPTER {adapter_path}\n"
        
        return modelfile
    
    @staticmethod
    def save_ollama_instructions(output_dir: str = ".") -> None:
        """Save Ollama setup instructions"""
        instructions = """# Ollama Setup Instructions for Brittney

## 1. Install Ollama
Download from: https://ollama.ai

## 2. Pull Base Model
```bash
ollama pull mistral:7b-instruct
```

## 3. Create Custom Model with LoRA Adapter
Create a file called `Modelfile`:

```
FROM mistral:7b-instruct

PARAMETER temperature 0.7
PARAMETER top_p 0.9

SYSTEM You are Brittney, an AI assistant specialized in HoloScript code generation.
```

Then create the model:
```bash
ollama create brittney-finetuned -f Modelfile
```

## 4. Run Local Inference
```bash
ollama run brittney-finetuned "Create an NPC warrior with patrol and attack behaviors"
```

## 5. API Access (used by Hololand)
Ollama exposes API at: http://localhost:11434/api

Example request:
```bash
curl -X POST http://localhost:11434/api/generate \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "brittney-finetuned",
    "prompt": "Create an NPC warrior...",
    "stream": false
  }'
```

## 6. Performance Optimization
- Use quantized models (Q4, Q5 for better speed)
- Adjust context size if needed
- Run on dedicated GPU if available (your 6GB GPU is good)

## 7. Integration with Hololand
Update BrittneyGameIntegration.ts to point to:
- Ollama endpoint: http://localhost:11434/api
- Model: brittney-finetuned
- No API key needed for local deployment
"""
        
        output_file = Path(output_dir) / "OLLAMA_SETUP.md"
        output_file.write_text(instructions)
        print(f"✅ Saved Ollama instructions to {output_file}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Fine-tune Brittney on Together AI")
    parser.add_argument("--training-file", required=True, help="Path to training data JSONL file")
    parser.add_argument("--api-key", help="Together AI API key (or set TOGETHER_API_KEY env var)")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--wait", action="store_true", help="Wait for job completion")
    
    args = parser.parse_args()
    
    try:
        # Initialize fine-tuner
        tuner = TogetherAIFineTuner(args.api_key)
        
        # Upload training file
        file_id = tuner.upload_training_file(args.training_file)
        
        # Start fine-tuning job
        job_id = tuner.start_finetuning_job(
            training_file_id=file_id,
            epochs=args.epochs,
            batch_size=args.batch_size
        )
        
        # Save job info
        job_info = {
            "job_id": job_id,
            "file_id": file_id,
            "model_name": "brittney-holoscript-v1",
            "base_model": "mistralai/Mistral-7B-Instruct-v0.1",
            "created_at": time.strftime("%Y-%m-%d %Human:%M:%S")
        }
        
        job_file = Path("finetuning_job.json")
        with open(job_file, 'w') as f:
            json.dump(job_info, f, indent=2)
        
        print(f"\n✅ Job information saved to {job_file}")
        
        # Wait if requested
        if args.wait:
            model_id = tuner.wait_for_completion(job_id)
            job_info["model_id"] = model_id
            with open(job_file, 'w') as f:
                json.dump(job_info, f, indent=2)
        else:
            print(f"\n💡 Check job status later with: together-ai-status {job_id}")
        
        # Create Ollama setup instructions
        OllamaLocalSetup.save_ollama_instructions()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
