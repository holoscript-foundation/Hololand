# @hololand/brittney-toolkit

**Brittney AI Toolkit** - Local-first AI assistant for HoloScript world building.

## Overview

A lightweight toolkit that brings Brittney AI to any application. Ships with a bundled GGUF model - no cloud required. Users can optionally use cloud providers.

```typescript
import { BrittneyEngine } from '@hololand/brittney-toolkit';

const brittney = new BrittneyEngine();
await brittney.initialize();

const response = await brittney.chat('Create a floating island');
console.log(response.text); // HoloScript code
```

## Features

- **Bundled Model** - 2GB GGUF model included (TinyLlama 1.1B fine-tuned)
- **Zero Config** - Works out of the box, no API keys needed
- **Cloud Optional** - Bring your own OpenAI/Anthropic/Google/Groq key
- **Chat Widget** - Pre-built UI component
- **Device Adaptive** - Responsive layout for desktop/tablet/mobile

## Installation

```bash
pnpm add @hololand/brittney-toolkit
```

## Quick Start

### Basic Usage

```typescript
import { BrittneyEngine } from '@hololand/brittney-toolkit';

const engine = new BrittneyEngine({
  mode: 'local', // Uses bundled model
});

await engine.initialize();

const result = await engine.generate({
  prompt: 'Build a medieval castle with a drawbridge',
});
```

### With Cloud Provider

```typescript
import { CloudInference } from '@hololand/brittney-toolkit';

const cloud = new CloudInference({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});

const response = await cloud.chat([
  { role: 'user', content: 'Create a neon cyberpunk bar' }
]);
```

### Chat Widget

```typescript
import { ChatWidget } from '@hololand/brittney-toolkit/chat';

const widget = new ChatWidget({
  container: document.getElementById('chat'),
  engine: brittneyEngine,
  theme: 'dark',
});

widget.mount();
```

## API Reference

### Core Exports

| Export | Description |
|--------|-------------|
| `BrittneyEngine` | Main inference engine (local + cloud) |
| `LocalInference` | Local GGUF model inference |
| `CloudInference` | Cloud provider inference |
| `ChatWidget` | Pre-built chat UI |
| `DeviceLayout` | Responsive layout system |

### Bundled Model

```typescript
import { BUNDLED_MODEL } from '@hololand/brittney-toolkit';

console.log(BUNDLED_MODEL);
// {
//   name: 'brittney-f16',
//   file: 'brittney-f16.gguf',
//   size: '2.05 GB',
//   parameters: '1.1B',
//   contextSize: 2048,
// }
```

### Supported Cloud Providers

```typescript
import { CLOUD_PROVIDERS } from '@hololand/brittney-toolkit';

// OpenAI (with fine-tuned Brittney model)
// Anthropic (Claude 3.5 Sonnet)
// Google (Gemini 1.5)
// Groq (Llama 3.1)
// Together AI (Llama 3.2)
```

## Types

```typescript
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  InferenceProvider,
  StreamChunk,
} from '@hololand/brittney-toolkit';
```

## Related

- [@hololand/brittney-service](../brittney-service/) - Server-side service
- [@hololand/mcp-server](../mcp-server/) - MCP protocol integration

## License

Elastic License 2.0 - See [LICENSE](../../LICENSE)
