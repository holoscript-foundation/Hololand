#!/usr/bin/env python3
"""
Brittney Fine-Tuning Script for OpenAI API
Usage: python finetune.py
"""
import os
import sys
from openai import OpenAI

def main():
    # Get API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        api_key = input("Enter your OpenAI API Key: ").strip()
    
    client = OpenAI(api_key=api_key)
    
    # Training file path
    training_file = os.path.join(os.path.dirname(__file__), "brittney-training-clean.jsonl")
    
    if not os.path.exists(training_file):
        # Try the original file
        training_file = os.path.join(os.path.dirname(__file__), "brittney-holoscript-training-v1.jsonl")
    
    print(f"📁 Training file: {training_file}")
    
    # Upload training file
    print("📤 Uploading training file...")
    with open(training_file, "rb") as f:
        file = client.files.create(file=f, purpose="fine-tune")
    print(f"✅ File uploaded: {file.id} ({file.bytes} bytes)")
    
    # Create fine-tuning job
    print("\n🚀 Starting fine-tuning job...")
    job = client.fine_tuning.jobs.create(
        training_file=file.id,
        model="gpt-4o-mini-2024-07-18",
        suffix="brittney",
        hyperparameters={
            "n_epochs": 3
        }
    )
    
    print(f"\n✅ Fine-tuning job started!")
    print(f"   Job ID: {job.id}")
    print(f"   Status: {job.status}")
    print(f"   Model: {job.model}")
    print(f"\n📊 Monitor progress:")
    print(f"   python -c \"from openai import OpenAI; j=OpenAI().fine_tuning.jobs.retrieve('{job.id}'); print(f'Status: {{j.status}}')\"")
    print(f"\n🌐 Or visit: https://platform.openai.com/finetune/{job.id}")

if __name__ == "__main__":
    main()
