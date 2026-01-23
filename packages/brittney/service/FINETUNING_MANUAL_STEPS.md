# Together AI Fine-Tuning - Manual Steps

Your training data is ready: `brittney-finetuning-data.jsonl` (40.93 KB, 27 examples)

## Option A: Web Console (Recommended - Most Reliable)

1. **Go to Together AI Console:**
   - URL: https://www.together.ai/console
   - Sign in with your account

2. **Navigate to Fine-tuning:**
   - Click "Fine-tuning" in left sidebar
   - Click "Create new job" or "New Fine-tune"

3. **Upload Training File:**
   - Click "Upload data" or "Select file"
   - Choose: `brittney-finetuning-data.jsonl`
   - Wait for upload to complete
   - Note the **File ID** (shown after upload)

4. **Configure Fine-tuning Job:**
   - **Model:** Select `mistralai/Mistral-7B-Instruct-v0.3`
   - **Training Data:** Select your uploaded file
   - **Model Name:** Enter `brittney-holoscript-v1`
   - **Epochs:** 3
   - **Batch Size:** 4
   - **Learning Rate:** 0.0001

5. **Start Training:**
   - Click "Start Training" or "Create Job"
   - You'll see a **Job ID** (save this)
   - Training begins (~20-30 minutes)

6. **Monitor Progress:**
   - Status page shows: Queued → Running → Completed
   - Check back in 20-30 minutes
   - When done, you'll get the **Model ID**

---

## Option B: CLI (If you prefer command line)

### Install Together CLI:
```powershell
pip install together
```

### Login:
```powershell
together login
# Paste your API key when prompted
```

### Start Training:
```powershell
together fine-tune create \
  --model mistralai/Mistral-7B-Instruct-v0.3 \
  --training-file brittney-finetuning-data.jsonl \
  --output-name brittney-holoscript-v1 \
  --epochs 3 \
  --batch-size 4 \
  --learning-rate 0.0001
```

### Monitor Status:
```powershell
together fine-tune status <job-id>
# Or list all jobs:
together fine-tune list
```

---

## What to Expect

| Timeline | What's Happening |
|----------|-----------------|
| 0-2 min | File uploading |
| 2-5 min | Job queued, waiting for GPU |
| 5-25 min | **Training in progress** |
| 25-30 min | Post-processing, model optimization |
| 30+ min | ✅ Complete - Model ID ready |

**Cost:** ~$5-10 USD (Usually completes during free tier trial period)

---

## After Training Completes

Once you have your **Model ID** (format: `together-ai-xxx`):

### 1. Create Ollama Modelfile:

```powershell
$modelId = "YOUR_MODEL_ID_HERE"  # Replace with actual ID from Together AI

$modelfile = @"
FROM $modelId

SYSTEM You are Brittney, an AI specialist in HoloScript game development. You generate production-ready game code with NPCs, quests, abilities, scenes, and detailed 3D mappings.

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER stop "</s>"
"@

$modelfile | Out-File -Encoding UTF8 Modelfile.brittney
Write-Host "✅ Created Modelfile.brittney"
```

### 2. Create Ollama Model:

```powershell
ollama create brittney-game-gen -f Modelfile.brittney
Write-Host "✅ Ollama model created"
```

### 3. Test Generation:

```powershell
ollama run brittney-game-gen "Create a mage NPC with fireball spell"
```

### 4. Integration Test:

```powershell
# Test with Game Gen
cd C:\Users\josep\Documents\GitHub\Hololand\packages\playground
npm test -- BrittneyGameIntegration.test.ts --run
```

---

## Save Your Job Info

Once fine-tuning is done, save this info:

```json
{
  "job_id": "YOUR_JOB_ID",
  "file_id": "YOUR_FILE_ID",
  "model_id": "YOUR_MODEL_ID",
  "model_name": "brittney-holoscript-v1",
  "base_model": "mistralai/Mistral-7B-Instruct-v0.3",
  "created_at": "2026-01-20T...",
  "training_file": "brittney-finetuning-data.jsonl",
  "epochs": 3,
  "batch_size": 4,
  "learning_rate": 0.0001
}
```

---

## Troubleshooting

**Issue: "File not found" during upload**
- Fix: Ensure you're in the right directory
- Check: `Test-Path brittney-finetuning-data.jsonl`

**Issue: API key invalid**
- Fix: Get new key from https://api.together.ai/settings/api-keys
- Verify: Key starts with `tgp_v1_`

**Issue: Quota exceeded**
- Fix: Check console for usage limits
- May need to add payment method for more GPU time

**Issue: Training stuck in "Queued"**
- Fix: This is normal - just means waiting for GPU availability
- Usually takes <5 minutes
- Check status page every 2-3 minutes

**Issue: Model not found after training**
- Fix: Check Job Details page for exact Model ID
- May have different format than expected

---

## Next Steps

1. ✅ **Upload file** to Together AI web console
2. ⏳ **Wait for training** (~30 minutes)
3. 📋 **Get Model ID** from completed job
4. 🔨 **Create Ollama model** with returned ID
5. ✔️ **Test generation** with sample prompts
6. 🚀 **Deploy to production** with confidence

---

## Help & Support

- Together AI Docs: https://docs.together.ai/docs/fine-tuning
- Ollama Docs: https://github.com/ollama/ollama
- Check training_file: `brittney-finetuning-data.jsonl` (40.93 KB)
- Contact: Check Together AI support if issues persist
