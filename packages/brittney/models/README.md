# Brittney AI Models

Official model registry and download utilities for Brittney AI.

## 🎉 Brittney V1 Free - Production Ready

**Brittney V1** is a free, locally-running AI assistant trained for HoloScript world building. It runs 100% on your device with no cloud dependency.

| Model | Size | Features | License |
|-------|------|----------|---------|
| `brittney-v1-free` | ~2.0 GB | HoloScript help, code completion, world building | MIT |
| `brittney-v1-q4` | ~1.2 GB | Quantized for lower memory devices | MIT |

## Quick Start

### NPM/PNPM

```bash
# Install the package
pnpm add @hololand/brittney-models

# Download the free V1 model
pnpm brittney-download --model v1-free

# Or use the CLI directly
npx @hololand/brittney-models download v1-free
```

### Direct Download

Download from GitHub Releases:

```bash
# V1 Free (Full precision, ~2.0 GB)
curl -L -o brittney-v1-free.gguf \
  https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-free.gguf

# V1 Q4 (Quantized, ~1.2 GB)
curl -L -o brittney-v1-q4.gguf \
  https://github.com/hololand/hololand/releases/download/brittney-v1.0.0/brittney-v1-q4.gguf
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

### Free Tier (MIT License)

| ID | Name | Size | Min RAM | Features |
|----|------|------|---------|----------|
| `v1-free` | Brittney V1 Free | 2.0 GB | 4 GB | Full HoloScript, code completion |
| `v1-q4` | Brittney V1 Q4 | 1.2 GB | 2 GB | Quantized, mobile-friendly |
| `v1-q8` | Brittney V1 Q8 | 1.6 GB | 3 GB | Better quality quantization |

### Pro Tier (Proprietary - Coming Soon)

| ID | Name | Size | Features |
|----|------|------|----------|
| `v2-pro` | Brittney V2 Pro | 4 GB | Enhanced generation, multi-world |
| `v2-enterprise` | Brittney V2 Enterprise | 8 GB | Full training, custom fine-tuning |

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

The free V1 model is trained for:
- HoloScript syntax and semantics
- World building patterns
- VR/AR development concepts
- Code completion and explanation

For advanced features like custom fine-tuning, enterprise deployment, or extended training data, see our Pro tier.
