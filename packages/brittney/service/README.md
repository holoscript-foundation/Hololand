# @hololand/brittney-service

> **DEPRECATED**: This service (port 11435) has been replaced by the unified inference architecture.
>
> **Migration Guide:**
>
> - All inference now goes through Ollama (port 11434) via `@hololand/inference`
> - The Hololand MCP Server uses `@hololand/inference` directly
> - The Brittney Desktop (Tauri) app has built-in inference with BYOK support
> - Fine-tuned Brittney models are available in Ollama: `brittney-v4-expert:latest`
>
> See [`packages/shared/inference/`](../../shared/inference/) for the new unified package.

---

**✱brittney** - AI-powered assistant for Hololand with local & cloud inference.

## Overview

Brittney is the AI that builds VR worlds. Give her a description, get working HoloScript code.

```typescript
import { BrittneyServer, BrittneyInference } from '@hololand/brittney-service';

const brittney = new BrittneyInference();
const response = await brittney.chat({
  messages: [{ role: 'user', content: 'Create a cozy coffee shop with a fireplace' }]
});
// Returns: HoloScript code for the scene
```

## Features

- **Local Inference** - Run Brittney locally with GGUF models (no API key needed)
- **Cloud Providers** - OpenAI, Anthropic, Google, Groq, Together AI
- **Knowledge Pipeline** - RAG-powered HoloScript expertise
- **Agent Orchestration** - Multi-step task execution
- **Fine-tuning Scripts** - Train your own Brittney model

## Installation

```bash
pnpm add @hololand/brittney-service
```

## Quick Start

### Start the Server

```bash
# Using CLI
npx brittney serve

# Or programmatically
import { BrittneyServer } from '@hololand/brittney-service';
const server = new BrittneyServer({ port: 11435 });
await server.start();
```

### Use the Inference API

```typescript
import { BrittneyInference } from '@hololand/brittney-service';

const brittney = new BrittneyInference({
  provider: 'local', // or 'openai', 'anthropic', etc.
});

const result = await brittney.generate({
  prompt: 'Create a VR lobby with 4 portals',
  context: { worldType: 'social-hub' }
});

console.log(result.holoScript);
```

### Cloud Provider Setup

```typescript
import { CloudProvider } from '@hololand/brittney-service';

const cloud = new CloudProvider('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4' // Fine-tuned Brittney
});
```

## API Reference

### Exports

| Export | Description |
|--------|-------------|
| `BrittneyServer` | HTTP/WebSocket server for Brittney |
| `BrittneyInference` | Direct inference API |
| `CloudProvider` | Cloud AI provider abstraction |
| `AgentOrchestrator` | Multi-step task orchestration |
| `KnowledgeService` | RAG knowledge base |
| `OrchestrationRuntime` | Task execution runtime |
| `KnowledgePipeline` | Training data pipeline |

### Configuration

```typescript
import { loadConfig, saveConfig, getModelsDir } from '@hololand/brittney-service';

const config = await loadConfig();
config.defaultProvider = 'anthropic';
await saveConfig(config);
```

## Fine-tuning

See [training/](./training/) for fine-tuning scripts:

- `finetune-simple.py` - Basic fine-tuning
- `finetune-stable.py` - Production-ready training
- `local-finetune-unsloth.py` - Unsloth optimized training

## Related

- [@hololand/brittney-toolkit](../brittney-toolkit/) - Client-side toolkit
- [@hololand/mcp-server](../mcp-server/) - MCP protocol integration
- [BRITTNEY_SETUP.md](../mcp-server/BRITTNEY_SETUP.md) - IDE integration guide

## License

Elastic License 2.0 - See [LICENSE](../../LICENSE)
