# 🎯 Brittney Fine-Tuning: Step-by-Step Workflow
## Azure AI Foundry via AI Toolkit Extension

**Save this file - it won't disappear!**

---

## ✅ Pre-Flight Checklist

Before starting, confirm you have:

- [ ] Azure subscription with credits
- [ ] AI Toolkit extension installed ✓ (you have this)
- [ ] Training data ready at:
  ```
  c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\brittney-holoscript-training-v1.jsonl
  ```

---

## 🚀 STEP 1: Sign Into Azure (Do This First!)

1. Press `Ctrl+Shift+P` (Command Palette)
2. Type: **Azure: Sign In**
3. Complete browser sign-in
4. Verify in bottom status bar: should show your Azure account

---

## 🚀 STEP 2: Open AI Toolkit Sidebar

1. Click the **AI Toolkit** icon in the left sidebar (looks like a robot/sparkle)
2. You should see sections:
   - **MY RESOURCES**
   - **CATALOG**
   - **PLAYGROUND**

---

## 🚀 STEP 3: Connect to Azure AI Foundry

1. In AI Toolkit sidebar → **MY RESOURCES** → **Models**
2. Click the **+** button
3. Select **Azure AI Foundry**
4. Choose your subscription
5. Select or create a project

**If you don't have a project yet:**
1. Go to https://ai.azure.com
2. Click **+ New project**
3. Name it: `brittney-finetune`
4. Choose a resource group (create one if needed)
5. Pick region: **East US** or **Sweden Central** (best model availability)

---

## 🚀 STEP 4: Start Fine-Tuning Job

### Option A: Via Command Palette (Recommended)

1. Press `Ctrl+Shift+P`
2. Type: **AI Toolkit: Fine-tune Model**
3. Select **Azure AI Foundry** as target
4. Choose base model: **gpt-4o-mini** (recommended)
5. When prompted for training data, browse to:
   ```
   c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\brittney-holoscript-training-v1.jsonl
   ```
6. Set parameters:
   - Epochs: `3`
   - Suffix: `brittney-holoscript`
7. Click **Start Fine-tuning**

### Option B: Via Azure Portal (If AI Toolkit Fails)

1. Go to https://ai.azure.com → Your project
2. Click **Fine-tuning** in left menu
3. Click **+ Fine-tune a model**
4. Select base: `gpt-4o-mini`
5. Upload training file: `brittney-holoscript-training-v1.jsonl`
6. Configure:
   - Suffix: `brittney`
   - Epochs: 3
7. Click **Submit**

---

## 🚀 STEP 5: Monitor Progress

- In AI Toolkit: Look for **Jobs** section
- In Azure Portal: **Fine-tuning** → Your job
- Training ~94 examples takes **15-60 minutes**
- Status: Pending → Running → Succeeded

---

## 🚀 STEP 6: Deploy Your Model

Once training shows **Succeeded**:

1. Go to Azure Portal → Your project → **Deployments**
2. Click **+ Deploy model**
3. Select your fine-tuned model (e.g., `gpt-4o-mini:brittney-holoscript`)
4. Choose deployment name: `brittney-v1`
5. Deploy!

---

## 🚀 STEP 7: Use in Brittney Service

Update your brittney-service to use the fine-tuned model:

```typescript
// In brittney-service/src/config.ts or similar
export const BRITTNEY_CONFIG = {
  // Azure AI Foundry endpoint
  endpoint: "https://YOUR-PROJECT.openai.azure.com/",
  deployment: "brittney-v1", // Your deployed fine-tuned model
  apiVersion: "2024-10-21"
};
```

---

## ⚠️ Common Issues & Fixes

### "Session Lost" or "Workspace Lost"
Just return to this folder - your data is always here:
```
c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\
```

### "Cannot find training file"
Use the full path:
```
c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\brittney-holoscript-training-v1.jsonl
```

### "Invalid format"
Your file is in correct ChatML/JSONL format - this is verified ✓

### "Model not available"
Try a different region (East US, Sweden Central, West Europe)

### "Quota exceeded"
You may need to request quota increase in Azure Portal:
- Go to Azure Portal → Subscriptions → Usage + quotas
- Request increase for gpt-4o-mini fine-tuning

---

## 📊 Your Training Data Summary

| File | Examples | Focus |
|------|----------|-------|
| brittney-holoscript-training-v1.jsonl | 94 | Master file (use this!) |
| phase1-holoscript-training.jsonl | 46 | Core features |
| phase2-complex-scenes.jsonl | 9 | Complex scenes |
| phase2-complex-patterns.jsonl | 8 | Advanced patterns |
| phase3-edge-cases.jsonl | 10 | Edge cases |
| phase3-golden-patterns.jsonl | 8 | Best practices |
| phase4-error-correction.jsonl | 10 | Error handling |
| phase4-game-systems.jsonl | 3 | Game systems |

---

## 🔗 Quick Links

- Azure AI Foundry: https://ai.azure.com
- Training folder: `c:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service\training\`
- This guide: `STEP_BY_STEP_FINETUNE.md`

---

## 📝 Notes

- Your training data is **94 examples** in correct JSONL/ChatML format
- Recommended base model: **gpt-4o-mini** (fast, affordable)
- Expected training time: **15-60 minutes**
- This file is saved in your workspace - won't disappear!

---

Created: January 19, 2026
