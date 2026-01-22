# Brittney Fine-Tuned Models Deployment

## Model Overview

| Model | ID | Examples | Purpose | Location |
|-------|-----|----------|---------|----------|
| **V1** | `ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4` | 94 | HoloScript code generation | Hololand (FREE LLM) |
| **V2** | `ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CzuzuPXc` | 10,000 | General agent assistance | uAA2 Service |

---

## Hololand Integration (V1)

**Location**: `packages/brittney-service/`

**Files Modified**:
- [config.ts](../packages/brittney-service/src/config.ts) - Added `BRITTNEY_MODELS` constant
- [cloud-provider.ts](../packages/brittney-service/src/cloud-provider.ts) - Simplified to always use V1

**Usage**:
```typescript
import { BRITTNEY_MODELS } from './config.js';

// Hololand always uses V1 (HoloScript specialist)
const model = BRITTNEY_MODELS.holoscript;
```

**Configuration**:
```typescript
export const BRITTNEY_MODELS = {
  holoscript: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
  general: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CzuzuPXc',
  default: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4', // V1 for Hololand
};
```

---

## uAA2 Service Integration (V2)

**Location**: `AI_Workspace/uAA2++_Protocol/config/`

**Files Created**:
- [brittney-models.ts](../uAA2++_Protocol/config/brittney-models.ts) - Model config for uAA2

**Usage**:
```typescript
import BRITTNEY_MODELS, { selectBrittneyModel } from './config/brittney-models';

// uAA2 defaults to V2 (general assistant)
const model = BRITTNEY_MODELS.default; // V2

// Or intelligently select based on task
const smartModel = selectBrittneyModel(taskDescription);
```

---

## API Configuration

Both models require an OpenAI API key:

```bash
OPENAI_API_KEY=sk-proj-...
```

**Request Format**:
```typescript
const response = await openai.chat.completions.create({
  model: BRITTNEY_MODELS.holoscript, // or .general
  messages: [
    { role: 'system', content: 'You are Brittney, the AI assistant for Hololand and HoloScript development.' },
    { role: 'user', content: 'Create a scene with...' }
  ],
  temperature: 0.7,
  max_tokens: 2000
});
```

---

## Training Details

### V1 - HoloScript Specialist
- **Training Date**: January 19, 2026
- **Base Model**: gpt-4o-mini-2024-07-18
- **Examples**: 94 curated HoloScript code samples
- **Focus**: Code generation, DSL syntax, game mechanics, VR/AR scenes
- **Training File**: `brittney-training-clean.jsonl`

### V2 - General Assistant
- **Training Date**: January 19, 2026
- **Base Model**: gpt-4o-mini-2024-07-18
- **Examples**: 10,000 (sampled from 120K+ dataset)
- **Focus**: Agent assistance, planning, design patterns, general queries
- **Training File**: `brittney-10k-clean.jsonl`

---

## Build & Test

```bash
# Hololand brittney-service
cd packages/brittney-service
npm run build

# Test the integration
npm run dev
```

---

## Bundled Model (Desktop & Mobile)

For **Tauri** (desktop) and **Capacitor/React Native** (mobile) apps, use the bundled local model:

| Property | Value |
|----------|-------|
| **Package** | `@hololand/brittney-toolkit` |
| **Model** | TinyLlama 1.1B (fine-tuned on HoloScript) |
| **Format** | GGUF (quantized) |
| **Size** | ~2 GB |
| **Inference** | llama.cpp via WASM |

```typescript
import { BrittneyEngine, BUNDLED_MODEL } from '@hololand/brittney-toolkit';

const brittney = new BrittneyEngine({
  mode: 'local',
  model: BUNDLED_MODEL, // Works offline
});

await brittney.initialize();
const scene = await brittney.generate({ prompt: 'Medieval village' });
```

---

## Next Steps

1. ✅ Hololand brittney-service configured with V1
2. ✅ uAA2 config created with V2
3. ✅ Bundled GGUF model for Tauri/mobile apps
4. ⏳ Set `OPENAI_API_KEY` in production environment
5. ⏳ Integrate brittney-models.ts into uAA2-service package
6. ⏳ Test end-to-end with both services
