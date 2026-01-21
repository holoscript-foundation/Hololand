# 🔥 Brittney Fine-Tuning Guide for Azure AI Foundry

## ⚠️ SAVE THIS FILE - Your training data and workspace are preserved here

---

## 📁 Your Training Data Location (ALWAYS HERE)

```
c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\
├── brittney-holoscript-training-v1.jsonl  ← MASTER FILE (94 examples)
├── phase1-holoscript-training.jsonl       ← Core features (46 examples)
├── phase2-complex-scenes.jsonl            ← Complex scenes (9 examples)
├── phase2-complex-patterns.jsonl          ← Complex patterns (8 examples)
├── phase3-edge-cases.jsonl                ← Edge cases (10 examples)
├── phase3-golden-patterns.jsonl           ← Golden patterns (8 examples)
├── phase4-error-correction.jsonl          ← Error correction (10 examples)
└── phase4-game-systems.jsonl              ← Game systems (3 examples)
```

---

## 🎯 Quick Start: Fine-Tune Brittney on Azure AI Foundry

### Step 1: Open Your Azure AI Foundry Project

1. Go to: https://ai.azure.com
2. Sign in with your Azure account
3. Create or select an existing **Project**
4. Make note of your:
   - **Project name**: _________________
   - **Resource group**: _________________
   - **Subscription ID**: _________________

### Step 2: Upload Training Data

**Method A: Azure Portal (Easiest)**
1. In Azure AI Foundry portal → **Data** → **+ New data**
2. Upload: `brittney-holoscript-training-v1.jsonl`
3. Name it: `brittney-training-v1`

**Method B: AI Toolkit Extension (VS Code)**
1. Open Command Palette: `Ctrl+Shift+P`
2. Search: `AI Toolkit: Fine-tune model`
3. Select Azure AI Foundry as target
4. Browse to: `c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\brittney-holoscript-training-v1.jsonl`

### Step 3: Choose Base Model

Recommended models for fine-tuning on Azure AI Foundry:

| Model | Good For | Notes |
|-------|----------|-------|
| **gpt-4o-mini** | Best balance | Fast, affordable |
| **gpt-4o** | Highest quality | More expensive |
| **Phi-3-mini** | Cost-effective | Microsoft model |

### Step 4: Configure Fine-Tuning Job

```json
{
  "training_file": "brittney-training-v1",
  "model": "gpt-4o-mini",
  "suffix": "brittney-holoscript",
  "hyperparameters": {
    "n_epochs": 3,
    "learning_rate_multiplier": 1.0,
    "batch_size": "auto"
  }
}
```

### Step 5: Monitor Training

- In Azure AI Foundry: **Fine-tuning** → View your job
- Training typically takes 15-60 minutes for 94 examples
- Status will show: Pending → Running → Succeeded

### Step 6: Deploy Your Model

1. Once training completes, go to **Deployments**
2. Click **+ Create deployment**
3. Select your fine-tuned model: `gpt-4o-mini:brittney-holoscript`
4. Choose deployment settings

---

## 🔧 VS Code AI Toolkit Setup (Step-by-Step)

### First-Time Setup

1. **Install AI Toolkit Extension**
   - Extensions → Search "AI Toolkit" → Install (Microsoft)

2. **Sign In to Azure**
   - Click AI Toolkit icon in sidebar
   - Under "Connections" → Sign in to Azure

3. **Connect to Azure AI Foundry**
   - AI Toolkit → "+" next to Models
   - Select "Azure AI Foundry"
   - Choose your subscription and project

### Start Fine-Tuning Job

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Type**: `AI Toolkit: Fine-tune`
3. **Select target**: Azure AI Foundry
4. **Select base model**: gpt-4o-mini (or your choice)
5. **Browse training file**: Navigate to:
   ```
   c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\brittney-holoscript-training-v1.jsonl
   ```
6. **Configure and start**

---

## 📊 Data Format Verification

Your training data is in **ChatML format** (correct for OpenAI/Azure):

```jsonl
{"messages":[{"role":"system","content":"You are ✱brittney..."},{"role":"user","content":"Create a basic cube"},{"role":"assistant","content":"```holoscript\nobject MyObject {...}\n```"}]}
```

✅ This format is correct for:
- Azure OpenAI fine-tuning
- OpenAI API fine-tuning
- Azure AI Foundry

---

## ⚡ If Things Go Wrong

### "Connection Lost" or "Workspace Lost"

Your data is ALWAYS here:
```
c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\
```

Just navigate back to this folder and re-upload.

### "Invalid Training Data Format"

Run this to validate your JSONL:
```powershell
cd c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training
Get-Content brittney-holoscript-training-v1.jsonl | ForEach-Object { $_ | ConvertFrom-Json } | Measure-Object
```

Should show: Count = 94 (or whatever your file has)

### "Model Not Found"

Make sure you're in the correct Azure region. Some models are only available in:
- East US
- West Europe
- Sweden Central

### Training Takes Forever

- 94 examples should take 15-60 minutes max
- If stuck over 2 hours, cancel and restart
- Try reducing to `n_epochs: 2`

---

## 🚀 Alternative: Local Fine-Tuning (No Cloud Needed)

If Azure keeps failing, you can fine-tune locally with:

### Option 1: Unsloth (Fastest, Recommended)

```powershell
pip install unsloth
```

```python
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Phi-3-mini-4k-instruct",
    max_seq_length = 2048,
    load_in_4bit = True,
)

# Fine-tune with your data
from datasets import load_dataset
dataset = load_dataset('json', data_files='brittney-holoscript-training-v1.jsonl')

# ... training code
```

### Option 2: Ollama with Modelfile

```
# brittney.modelfile
FROM mistral

SYSTEM """You are ✱brittney, the AI assistant for Hololand and HoloScript development. You help developers build immersive VR/AR experiences using HoloScript, a declarative DSL for the Hololand platform."""
```

```powershell
ollama create brittney -f brittney.modelfile
```

---

## 📋 Checklist Before Fine-Tuning

- [ ] Azure subscription active
- [ ] Azure AI Foundry project created
- [ ] AI Toolkit extension installed in VS Code
- [ ] Signed in to Azure in AI Toolkit
- [ ] Training file ready: `brittney-holoscript-training-v1.jsonl`
- [ ] Base model selected (gpt-4o-mini recommended)
- [ ] Sufficient Azure credits/quota

---

## 📞 Quick Commands

```powershell
# Navigate to training folder
cd c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training

# Count training examples
Get-Content brittney-holoscript-training-v1.jsonl | Measure-Object -Line

# Validate JSON format
Get-Content brittney-holoscript-training-v1.jsonl -First 5 | ForEach-Object { $_ | ConvertFrom-Json | ConvertTo-Json -Compress }

# Open in VS Code
code brittney-holoscript-training-v1.jsonl
```

---

## 💡 Tips

1. **Start small**: Try fine-tuning with just `phase1-holoscript-training.jsonl` (46 examples) first
2. **Use gpt-4o-mini**: It's cheaper and fine-tunes faster than gpt-4o
3. **Set n_epochs to 3**: This is usually optimal for 50-100 examples
4. **Save this guide**: Bookmark this file so you don't lose your progress

---

Last updated: January 19, 2026
Training data version: v1 (94 examples)
