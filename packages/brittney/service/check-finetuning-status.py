#!/usr/bin/env python3
"""
Monitor Together AI Fine-Tuning Job Status
Use this to check on your training job after starting it in the web console
"""

import os
import json
import sys
import time
from pathlib import Path


def check_job_status():
    """Check if job info file exists and show saved info"""
    job_info_file = Path("finetuning_job_info.json")
    
    if job_info_file.exists():
        with open(job_info_file, 'r') as f:
            info = json.load(f)
        
        print("📋 Previous Fine-Tuning Job Found:")
        print(f"   Job ID: {info.get('job_id', 'N/A')}")
        print(f"   Status: {info.get('status', 'N/A')}")
        print(f"   Model ID: {info.get('model_id', 'N/A')}")
        print(f"   Created: {info.get('timestamp', 'N/A')}")
        
        return info
    
    return None


def save_job_info(job_id: str, file_id: str, status: str = "submitted"):
    """Save job info for later reference"""
    job_record = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "job_id": job_id,
        "status": status,
        "file_id": file_id,
        "training_file": "brittney-finetuning-data.jsonl",
        "model_name": "brittney-holoscript-v1",
        "base_model": "mistralai/Mistral-7B-Instruct-v0.1",
        "hyperparameters": {
            "epochs": 3,
            "batch_size": 4,
            "learning_rate": 1e-4
        },
        "next_step": "Check Together AI console for job status and model ID when complete"
    }
    
    output_file = Path("finetuning_job_info.json")
    with open(output_file, 'w') as f:
        json.dump(job_record, f, indent=2)
    
    print(f"\n💾 Job info saved to: {output_file}")
    print(f"   Check this file for Job ID and final Model ID")


def show_instructions():
    """Show web console instructions"""
    print("\n" + "="*70)
    print("TOGETHER AI FINE-TUNING - WEB CONSOLE INSTRUCTIONS")
    print("="*70)
    
    print("\n1. GO TO TOGETHER AI CONSOLE:")
    print("   👉 https://www.together.ai/console")
    
    print("\n2. NAVIGATE TO FINE-TUNING:")
    print("   - Click 'Fine-tuning' in left sidebar")
    print("   - Click 'Create new job' button")
    
    print("\n3. UPLOAD TRAINING DATA:")
    print("   - Click 'Upload data' or select file")
    print("   - File: brittney-finetuning-data.jsonl")
    print("   - Location: C:\\Users\\josep\\Documents\\GitHub\\Hololand\\packages\\brittney-service")
    print("   - Wait for upload confirmation")
    print("   - 📝 SAVE: Your File ID (shown after upload)")
    
    print("\n4. CONFIGURE FINE-TUNING:")
    print("   - Model: mistralai/Mistral-7B-Instruct-v0.1")
    print("   - Training File: (select your uploaded file)")
    print("   - Output Name: brittney-holoscript-v1")
    print("   - Epochs: 3")
    print("   - Batch Size: 4")
    print("   - Learning Rate: 0.0001")
    
    print("\n5. START TRAINING:")
    print("   - Click 'Start Training' button")
    print("   - 📝 SAVE: Job ID (shown in job details)")
    print("   - ⏳ Training starts (usually <5 min wait for GPU)")
    
    print("\n6. MONITOR PROGRESS:")
    print("   - Status shows: Queued → Running → Completed")
    print("   - Expected time: 20-30 minutes")
    print("   - ✅ WHEN COMPLETE: Get Model ID from job page")
    
    print("\n" + "="*70)
    print("WHAT TO DO NEXT")
    print("="*70)
    
    print("\nOnce training completes and you have the Model ID:")
    
    print("\n1. CREATE OLLAMA MODEL:")
    print("""
    # In PowerShell:
    cd C:\\Users\\josep\\Documents\\GitHub\\Hololand\\packages\\brittney-service
    
    $modelId = "YOUR_MODEL_ID"  # Replace with Model ID from Together AI
    
    @"
FROM $modelId

SYSTEM You are Brittney, an AI specialist in HoloScript game development.

PARAMETER temperature 0.7
PARAMETER top_p 0.9
"@ | Out-File -Encoding UTF8 Modelfile.brittney
    
    ollama create brittney-game-gen -f Modelfile.brittney
    """)
    
    print("\n2. TEST GENERATION:")
    print("   ollama run brittney-game-gen \"Create a warrior NPC\"")
    
    print("\n3. RUN INTEGRATION TESTS:")
    print("   npm test -- BrittneyGameIntegration.test.ts")
    
    print("\n" + "="*70)


if __name__ == "__main__":
    # Check for existing job
    print("🔍 Checking for previous fine-tuning jobs...\n")
    existing_job = check_job_status()
    
    if existing_job and existing_job.get('job_id'):
        print("\n" + "="*70)
        print("JOB IN PROGRESS")
        print("="*70)
        print(f"\nYour job ID: {existing_job['job_id']}")
        print(f"File ID: {existing_job['file_id']}")
        print("\nCheck status at:")
        print("  👉 https://www.together.ai/console/fine-tuning")
        
        if existing_job.get('status') == 'completed' and existing_job.get('model_id'):
            print(f"\n✅ TRAINING COMPLETED!")
            print(f"   Model ID: {existing_job['model_id']}")
            print(f"\n   You can now create the Ollama model!")
    else:
        print("❌ No previous job found.\n")
        show_instructions()
        
        # Offer to save job info for later
        print("\n" + "="*70)
        print("READY TO START?")
        print("="*70)
        
        response = input("\nAfter starting the job in Together AI console, enter your Job ID (or press Enter to skip): ").strip()
        
        if response:
            file_id = input("Enter your File ID (from upload confirmation): ").strip()
            save_job_info(response, file_id, "submitted")
            print("\n✅ Job info saved! Check back later by running this script again.")
