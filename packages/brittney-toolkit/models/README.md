# Brittney GGUF Models

Place your trained Brittney GGUF models here.

## Model Files

| File | Description | Status |
|------|-------------|--------|
| `brittney-base.gguf` | Basic model (available now) | ✅ Ready |
| `brittney-v2.gguf` | Enhanced model (training) | 🔄 Coming soon |

## Setup

1. Copy your `.gguf` file to this directory
2. The engine will auto-detect models in this folder
3. Default model: `brittney-base.gguf`

## Configuration

Set model in code:
```typescript
import { BrittneyEngine } from '@hololand/brittney-toolkit';

const engine = new BrittneyEngine({
  modelPath: './models/brittney-base.gguf',
});
```

Or via environment variable:
```bash
BRITTNEY_MODEL_PATH=./models/brittney-v2.gguf
```

## Model Training

Models are trained using the Brittney training pipeline:
- Training data: `training/` directory (403.7K samples)
- Framework: llama.cpp compatible GGUF format
- Quantization: Q4_K_M recommended for balance of speed/quality

## Git LFS

Large model files should use Git LFS:
```bash
git lfs track "*.gguf"
```

## Model Sizes

| Quantization | Size | Quality | Speed |
|--------------|------|---------|-------|
| Q4_K_M | ~4GB | Good | Fast |
| Q5_K_M | ~5GB | Better | Medium |
| Q8_0 | ~8GB | Best | Slower |
| F16 | ~14GB | Original | Slowest |
