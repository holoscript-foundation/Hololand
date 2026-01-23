# Brittney Fine-Tuning with Together AI

## Status: Ready to Train ✅

Your training data is prepared with **31 high-quality HoloScript examples** including comprehensive 3D mappings (geometry, materials, dimensions, scales).

**Base Model:** `brittney-f16.gguf` (2.05 GB, 300K+ trained examples)
**New Training Data:** 1,870+ lines of curated code across 10 HoloScript features
**Cost:** ~$5-10 USD
**Time:** ~20-30 minutes

---

## Step 1: Format Training Data

Run this command to convert examples to Together AI format:

```powershell
cd "C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service"

python -c "
import json
from pathlib import Path

input_file = r'C:\Users\josep\Documents\GitHub\HoloScript\holoscript-enhanced-training-examples.jsonl'
output_file = Path('brittney-finetuning-data.jsonl')

with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(output_file, 'w', encoding='utf-8') as f:
    for line in lines:
        if line.strip():
            try:
                data = json.loads(line)
                formatted = {
                    'messages': [
                        {'role': 'system', 'content': 'You are Brittney, AI specialist for HoloScript game development. Generate production-ready game code.'},
                        {'role': 'user', 'content': data.get('prompt', '')},
                        {'role': 'assistant', 'content': data.get('completion', '')}
                    ]
                }
                f.write(json.dumps(formatted) + '\n')
            except:
                pass

print('✅ Created brittney-finetuning-data.jsonl')
"
```

**Result:** `brittney-finetuning-data.jsonl` (ready for upload)

---

## Step 2: Upload to Together AI

Go to [https://www.together.ai](https://www.together.ai):

1. Sign in with your account
2. Navigate to **Fine-tuning** section
3. Click **Upload Training Data**
4. Select `brittney-finetuning-data.jsonl`
5. Copy the **File ID** (looks like: `file-xxx`)

---

## Step 3: Start Fine-Tuning Job

Still in Together AI console:

1. Click **Create Fine-Tuning Job**
2. Configure:
   - **Base Model:** `mistralai/Mistral-7B-Instruct-v0.1`
   - **Training File:** (paste your File ID)
   - **Model Name:** `brittney-holoscript-v1`
   - **Epochs:** 3
   - **Batch Size:** 4
   - **Learning Rate:** 0.0001

3. Click **Start Training**
4. Copy the **Job ID** (looks like: `ft-xxx`)
5. Wait for completion (~20-30 minutes)

---

## Step 4: Monitor Training

Check job status:
- In Together AI console: Job shows **Status: Completed**
- When done, you'll get a **Model ID** (looks like: `together-ai-xxx`)

---

## Step 5: Create Ollama Model

Once training completes:

```powershell
cd "C:\Users\josep\Documents\GitHub\Hololand\packages\brittney-service"

# Create Modelfile for Ollama
@"
FROM ./models/brittney-base/brittney-f16.gguf

SYSTEM You are Brittney, an AI specialist in HoloScript game development and Hololand world creation. You generate production-ready game code with NPCs, quests, abilities, scenes, and more. Your responses are complete, well-structured HoloScript code blocks with proper 3D mappings.

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
"@ | Out-File -Encoding UTF8 Modelfile.brittney

# Create Ollama model
ollama create brittney-game-gen -f Modelfile.brittney
```

---

## Step 6: Test Generation

```powershell
# Test basic generation
ollama run brittney-game-gen "Create an NPC warrior that patrols and attacks"

# Expected: Structured HoloScript code with 3D mappings
```

---

## Files Created

✅ **brittney-enhanced-training-examples.jsonl** (31 examples, 1,870+ LOC)
- 3 NPC examples with 3D geometry & materials
- 3 Quest examples (fetch, exploration, chain)
- 3 Ability examples (fireball, melee, healing) with visual specs
- 3 Dialogue examples with branching & localization
- 2 Scene examples (forest, boss arena) with 3D environmental details
- 2 State machine examples (boss phases, patrol AI)
- 2 Sequence examples (summon, spell cast)
- 3 Achievement examples with progress tracking
- 3 Localization examples (multilingual content)
- 3 Talent tree examples (mage, warrior, rogue)

✅ **3D Mapping Features**
Every example includes:
- `geometry`: Type, dimensions (width/height/radius/depth)
- `material`: Colors, metallic/roughness values, emissive properties
- `scale`: XYZ scaling factors
- `boundingBox`: Collision dimensions
- Lighting: Ambient/directional/point lights with shadows
- Particles: Size, count, colors, effects
- Audio: Ambient sounds, music, volume levels

---

## Cost & Time Estimate

| Item | Amount |
|------|--------|
| Base Model | 300K+ examples (already trained) |
| New Training | 31 examples (focused HoloScript) |
| GPU Cost | ~$5-10 |
| Training Time | ~20-30 minutes |
| Setup Time | ~5-10 minutes |
| **Total** | ~30-40 minutes, ~$10 |

---

## Next Steps

1. **Now:** Format data & upload to Together AI
2. **In 20 min:** Get model ID from completed job
3. **Then:** Create Ollama model with returned ID
4. **Finally:** Test with Game Gen and deploy

---

## Troubleshooting

**Issue:** Upload fails with 404 error
- **Fix:** Check API key is valid (dashboard → Account → API Keys)
- Ensure Together AI free tier allows fine-tuning (usually requires $5+ balance)

**Issue:** File rejected by Together AI
- **Fix:** Ensure JSONL is valid (each line = one JSON object)
- Check encoding is UTF-8

**Issue:** Ollama can't find model
- **Fix:** Ensure file is at correct path
- Run `ollama list` to see available models
- Try `ollama pull brittney-game-gen`

---

## Success Criteria ✅

- [ ] Training data formatted to JSONL
- [ ] File uploaded to Together AI (have File ID)
- [ ] Fine-tuning job started (have Job ID)
- [ ] Job completes successfully (have Model ID)
- [ ] Ollama model created (`ollama run brittney-game-gen`)
- [ ] Can generate valid HoloScript code
- [ ] Output includes 3D mappings (geometry, materials, scales)
- [ ] Game Gen integration tests pass

---

## Questions?

Check:
- Together AI docs: https://docs.together.ai/docs/fine-tuning
- Ollama docs: https://github.com/ollama/ollama
- HoloScript spec: [HOLOSCRIPT_LANGUAGE_SPEC.md](../../../docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
