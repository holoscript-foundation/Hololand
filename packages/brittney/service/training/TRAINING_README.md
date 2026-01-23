# ✱brittney Training Materials

## 🎯 Master Training File

**`brittney-holoscript-training-v1.jsonl`** - 94 examples (merged, validated, deduplicated)

Use this file for fine-tuning. It combines all phases below.

---

## Training Datasets by Phase

### Phase 1: Core Features (46 examples)
- **File**: `phase1-holoscript-training.jsonl`
- **Categories**: Objects, Traits, Animations, UI, Effects, Scenes, Audio, Materials, Physics

### Phase 2: Complex Scenes (17 examples)
- **Files**: `phase2-complex-scenes.jsonl` (9) + `phase2-complex-patterns.jsonl` (8)
- **Includes**:
  - Physics demo, Battle arena, Forest clearing, Puzzle room
  - NPC patrol, Shop UI, Racing checkpoints
  - Advanced patterns from additional agent

### Phase 3: Edge Cases & Limitations (18 examples)
- **Files**: `phase3-edge-cases.jsonl` (10) + `phase3-golden-patterns.jsonl` (8)
- **Teaches**:
  - Acknowledging hardware limitations
  - Offering realistic alternatives
  - Using [SPECULATIVE] tags
  - Golden syntax patterns

### Phase 4: Production Game Systems (13 examples)
- **Files**: `phase4-game-systems.jsonl` (3) + `phase4-error-correction.jsonl` (10)
- **Includes**:
  - Multiplayer arena shooter
  - RPG inventory system
  - NPC dialogue system
  - Error correction patterns

---

## Summary

| Phase | Examples | Focus |
|-------|----------|-------|
| Phase 1 | 46 | Core HoloScript features |
| Phase 2 | 17 | Complex scenes & patterns |
| Phase 3 | 18 | Edge cases & golden patterns |
| Phase 4 | 13 | Production systems & error correction |
| **Total** | **94** | **Complete coverage** |

---

## Connecting Hugging Face in AI Toolkit

### Step 1: Add Hugging Face Connection
1. In VS Code, open **AI Toolkit** sidebar
2. Under **MY RESOURCES** → **Models**, click **+**
3. Select **Hugging Face**
4. Enter your Hugging Face API token

### Step 2: Recommended Base Models for Fine-Tuning

| Model | Size | Best For | HF ID |
|-------|------|----------|-------|
| **Phi-3-mini-4k-instruct** | 3.8B | Fast, low VRAM | `microsoft/Phi-3-mini-4k-instruct` |
| **Mistral-7B-Instruct** | 7B | Balanced quality | `mistralai/Mistral-7B-Instruct-v0.3` |
| **Llama-3.1-8B-Instruct** | 8B | Best quality | `meta-llama/Llama-3.1-8B-Instruct` |
| **Qwen2.5-7B-Instruct** | 7B | Code-focused | `Qwen/Qwen2.5-7B-Instruct` |

### Step 3: Fine-Tuning Options

#### Option A: Use AI Toolkit's Built-in Fine-Tuning
1. Right-click model → **Fine-tune**
2. Upload `phase1-holoscript-training.jsonl`
3. Set training parameters (LoRA recommended for speed)

#### Option B: Push to Hugging Face for Cloud Training
```bash
# Install huggingface_hub
pip install huggingface_hub

# Login
huggingface-cli login

# Upload dataset
python -c "
from huggingface_hub import HfApi
api = HfApi()
api.upload_file(
    path_or_fileobj='phase1-holoscript-training.jsonl',
    path_in_repo='data/train.jsonl',
    repo_id='YOUR_USERNAME/brittney-holoscript-data',
    repo_type='dataset'
)
"
```

#### Option C: Local Fine-Tuning with Ollama + OpenWebUI
1. Start Ollama
2. Load base model: `ollama pull mistral`
3. Create Modelfile with system prompt
4. Train with examples from JSONL

## Training Data Sources

### Already Extracted:
- ✅ `holoscript-knowledge.hs` (917 lines, 50+ examples)
- ✅ `brittney-prompts.hs` (262 lines, prompt templates)
- ✅ `HoloScript/examples/*.hs` (10 files, full programs)
- ✅ `holoscript-knowledge.ts` (1061 lines, RAG chunks)

### Categories Covered:
- **Objects**: cube, sphere, cylinder, model import
- **VR Traits**: @grabbable, @throwable, @pointable, @hoverable, @breakable, @networked, @collidable, @scalable
- **Animations**: float, spin, pulse, fade, glow, shake
- **Gameplay**: collectibles, doors, platforms, triggers, teleporters, weapons, containers
- **UI**: panels, buttons, health bars, score displays
- **Effects**: snow, rain, fire, explosion particles
- **Scenes**: outdoor, indoor, beach environments
- **Audio**: background music, spatial 3D audio
- **Lighting**: directional, point lights
- **Materials**: metal, wood, glass, PBR
- **Physics**: dynamic, kinematic, gravity

## Next Steps

1. **Connect Hugging Face** to AI Toolkit
2. **Select base model** (Phi-3-mini recommended for speed)
3. **Fine-tune** with `phase1-holoscript-training.jsonl`
4. **Test** in Brittney agent
5. **Iterate** - add more examples from user feedback

## File Locations

```
brittney-service/
├── training/
│   ├── phase1-holoscript-training.jsonl   ← TRAINING DATA
│   └── TRAINING_README.md                  ← THIS FILE
├── src/
│   └── knowledge/
│       ├── holoscript-knowledge.hs         ← Source examples
│       ├── brittney-prompts.hs             ← System prompts
│       └── brittney-server.hs              ← Server config
```
