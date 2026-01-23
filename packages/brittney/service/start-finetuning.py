#!/usr/bin/env python3
"""
Together AI Fine-Tuning Automation for Brittney
Uploads training data and starts fine-tuning job
"""

import os
import json
import sys
import time
import requests
from pathlib import Path
from typing import Optional


class TogetherAIClient:
    """Client for Together AI fine-tuning API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.together.ai/v1"
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "Brittney-Finetuning/1.0"
        })
    
    def upload_training_file(self, file_path: str) -> dict:
        """Upload JSONL training file"""
        print(f"📤 Uploading training file: {file_path}")
        
        file_size_mb = Path(file_path).stat().st_size / (1024 * 1024)
        print(f"   Size: {file_size_mb:.2f} MB")
        
        with open(file_path, 'rb') as f:
            files = {'file': (Path(file_path).name, f, 'application/jsonl')}
            
            response = self.session.post(
                f"{self.base_url}/files/upload",
                files=files
            )
        
        if response.status_code not in [200, 201]:
            raise Exception(f"Upload failed ({response.status_code}): {response.text}")
        
        result = response.json()
        file_id = result.get('id') or result.get('file_id')
        
        print(f"✅ File uploaded successfully")
        print(f"   File ID: {file_id}")
        return result
    
    def create_finetuning_job(
        self,
        training_file_id: str,
        model_name: str = "brittney-holoscript-v1",
        base_model: str = "mistralai/Mistral-7B-Instruct-v0.1",
        epochs: int = 3,
        batch_size: int = 4,
        learning_rate: float = 1e-4
    ) -> dict:
        """Create fine-tuning job"""
        print(f"\n🚀 Starting fine-tuning job...")
        print(f"   Base Model: {base_model}")
        print(f"   Epochs: {epochs}")
        print(f"   Batch Size: {batch_size}")
        print(f"   Learning Rate: {learning_rate}")
        
        payload = {
            "training_file": training_file_id,
            "model": base_model,
            "output_name": model_name,
            "hyperparameters": {
                "epochs": epochs,
                "batch_size": batch_size,
                "learning_rate": learning_rate,
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/fine-tuning/jobs",
            json=payload
        )
        
        if response.status_code not in [200, 201]:
            print(f"Error response: {response.text}")
            raise Exception(f"Job creation failed ({response.status_code})")
        
        result = response.json()
        job_id = result.get('id') or result.get('job_id')
        
        print(f"✅ Fine-tuning job created")
        print(f"   Job ID: {job_id}")
        return result
    
    def get_job_status(self, job_id: str) -> dict:
        """Get fine-tuning job status"""
        response = self.session.get(
            f"{self.base_url}/fine-tuning/jobs/{job_id}"
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get job status: {response.text}")
        
        return response.json()
    
    def wait_for_job_completion(self, job_id: str, max_wait_minutes: int = 45) -> dict:
        """Poll job status until completion"""
        print(f"\n⏳ Waiting for fine-tuning to complete (max {max_wait_minutes} minutes)...")
        
        start_time = time.time()
        max_wait_seconds = max_wait_minutes * 60
        check_interval = 30  # Check every 30 seconds
        
        while True:
            elapsed = time.time() - start_time
            
            try:
                job_info = self.get_job_status(job_id)
                status = job_info.get('status', 'unknown')
                
                print(f"   [{int(elapsed//60)}m] Status: {status}")
                
                if status == 'completed':
                    print(f"\n✅ Fine-tuning completed successfully!")
                    model_id = job_info.get('output_model') or job_info.get('model')
                    if model_id:
                        print(f"   Model ID: {model_id}")
                    return job_info
                
                elif status == 'failed':
                    error_msg = job_info.get('error', 'Unknown error')
                    raise Exception(f"Fine-tuning job failed: {error_msg}")
                
                elif status == 'cancelled':
                    raise Exception("Fine-tuning job was cancelled")
                
            except Exception as e:
                if "not found" not in str(e).lower():
                    print(f"   Error checking status: {e}")
            
            if elapsed > max_wait_seconds:
                raise Exception(f"Job did not complete within {max_wait_minutes} minutes")
            
            time.sleep(check_interval)


def save_job_info(job_info: dict, file_id: str, file_path: str) -> None:
    """Save job information for later reference"""
    job_record = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "job_id": job_info.get('id') or job_info.get('job_id'),
        "status": job_info.get('status'),
        "file_id": file_id,
        "training_file": file_path,
        "model_id": job_info.get('output_model') or job_info.get('model'),
        "base_model": "mistralai/Mistral-7B-Instruct-v0.1",
        "model_name": "brittney-holoscript-v1",
        "hyperparameters": {
            "epochs": 3,
            "batch_size": 4,
            "learning_rate": 1e-4
        }
    }
    
    output_file = Path("finetuning_job_info.json")
    with open(output_file, 'w') as f:
        json.dump(job_record, f, indent=2)
    
    print(f"\n💾 Job info saved to: {output_file}")


def main():
    """Main fine-tuning workflow"""
    
    # Get API key
    api_key = os.getenv("TOGETHER_API_KEY")
    if not api_key:
        print("❌ TOGETHER_API_KEY environment variable not set")
        print("   Set it with: $env:TOGETHER_API_KEY = 'your-key'")
        sys.exit(1)
    
    training_file = Path("brittney-finetuning-data.jsonl")
    if not training_file.exists():
        print(f"❌ Training file not found: {training_file}")
        sys.exit(1)
    
    try:
        # Initialize client
        client = TogetherAIClient(api_key)
        
        # Upload training file
        upload_result = client.upload_training_file(str(training_file))
        file_id = upload_result.get('id') or upload_result.get('file_id')
        
        # Create fine-tuning job
        job_result = client.create_finetuning_job(training_file_id=file_id)
        job_id = job_result.get('id') or job_result.get('job_id')
        
        # Save job info
        save_job_info(job_result, file_id, str(training_file))
        
        # Wait for completion
        completed_job = client.wait_for_job_completion(job_id)
        
        # Save final info
        save_job_info(completed_job, file_id, str(training_file))
        
        print("\n" + "="*60)
        print("🎉 Fine-tuning workflow completed!")
        print("="*60)
        print("\nNext steps:")
        print("1. Check finetuning_job_info.json for model ID")
        print("2. Create Ollama model: ollama create brittney-game-gen -f Modelfile.brittney")
        print("3. Test generation: ollama run brittney-game-gen 'prompt...'")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
