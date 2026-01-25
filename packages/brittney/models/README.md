# Brittney AI Models

Official model registry and download utilities for Brittney AI.

## 🎉 Brittney V1 Expert - Free Production Release

**Brittney V1** is the **expert-level model** - the same quality used in production, now free for everyone. It runs 100% on your device with no cloud dependency.

| Model | Size | Features | License |
|-------|------|----------|---------|
| `v1-free` (Expert) | 1.57 GB | Full expert quality, best-in-class | MIT |
| `v1-q4` | ~0.9 GB | Quantized, mobile-friendly | MIT |
| `v1-q8` | ~1.2 GB | Better quality quantization | MIT |

## Quick Start

### NPM/PNPM

```bash
# Install the package
pnpm add @hololand/brittney-models

# Download the expert model (free!)
pnpm brittney-download --model v1-free

# Or use the CLI directly
npx @hololand/brittney-models download v1-free
```

### Direct Download

Download from GitHub Releases:

```bash
# V1 Expert (Full precision, 1.57 GB)
curl -L -o brittney-v1-expert.gguf \
  https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-expert.gguf

# V1 Expert Q4 (Quantized, ~0.9 GB)
curl -L -o brittney-v1-expert-q4.gguf \
  https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-expert-q4.gguf
```

## Programmatic Usage

```typescript
import { downloadModel, getModelPath, MODEL_REGISTRY } from '@hololand/brittney-models';

// Download the free V1 model
await downloadModel('v1-free', {
  destination: './models',
  showProgress: true,
});

// Get path to downloaded model
const modelPath = await getModelPath('v1-free');

// Check available models
console.log(MODEL_REGISTRY);
```

## Model Registry

```typescript
interface ModelInfo {
  id: string;
  name: string;
  version: string;
  size: string;
  sizeBytes: number;
  checksum: string;
  downloadUrl: string;
  license: 'MIT' | 'proprietary';
  features: string[];
  minMemory: string;
  recommended: boolean;
}
```

## Available Models

### Free Tier (MIT License) - Expert Quality

| ID | Name | Size | Min RAM | Features |
|----|------|------|---------|----------|
| `v1-free` | Brittney V1 Expert | 1.57 GB | 4 GB | Full expert quality, best-in-class |
| `v1-q4` | Brittney V1 Expert Q4 | ~0.9 GB | 2 GB | Quantized, mobile-friendly |
| `v1-q8` | Brittney V1 Expert Q8 | ~1.2 GB | 3 GB | Better quality quantization |

> **Note:** V1 Free IS the expert model. We're giving users the best quality - no artificial limitations.

## Integration with Brittney Desktop

The [Brittney Desktop](../../../apps/brittney-desktop) app uses this package to manage model downloads:

```typescript
import { downloadModel } from '@hololand/brittney-models';

// Downloads to src-tauri/models/ by default
await downloadModel('v1-free');
```

## Verification

All models include SHA-256 checksums for integrity verification:

```bash
# Verify a downloaded model
pnpm verify --model v1-free --file ./models/brittney-v1-free.gguf
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRITTNEY_MODELS_DIR` | `~/.brittney/models` | Model storage directory |
| `BRITTNEY_DOWNLOAD_MIRROR` | GitHub Releases | Alternative download mirror |

## License

MIT License - Free for personal and commercial use.

The V1 Expert model is trained for:
- HoloScript syntax and semantics (expert level)
- World building patterns and best practices
- VR/AR development concepts
- Code completion, explanation, and debugging
- Production-quality assistance
