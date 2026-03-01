# @hololand/inference

**Unified AI inference layer for Hololand** — Local-first with BYOK cloud for AI orchestrations in Hololand setups.

## Features

- 🏠 **Local First** — Ollama integration for free, private AI
- ☁️ **BYOK Cloud** — Bring your own AI provider keys for building orchestrations in Hololand (OpenAI, Anthropic, Google, Grok, Azure)
- 🤖 **HoloScript Optimized** — Pre-configured Brittney models for code generation
- 🔄 **Automatic Fallback** — Seamlessly switch between providers
- 🎯 **Smart Routing** — Task-based model selection

## Installation

```bash
npm install @hololand/inference
```

## Quick Start

```typescript
import { createInferenceClient } from '@hololand/inference';

// Create client (local-first by default)
const client = createInferenceClient({
  activeProvider: 'local',
  local: {
    enabled: true,
    ollamaUrl: 'http://localhost:11434',
    defaultModel: 'brittney-qwen-v23:latest',
  },
});

// Initialize providers
await client.initialize();

// Chat with AI
const response = await client.chat({
  messages: [
    { role: 'user', content: 'Create a HoloScript scene with a spinning cube' }
  ],
});

console.log(response.content);
```

## Streaming

```typescript
// Stream responses for real-time output
for await (const chunk of client.chatStream({ messages })) {
  process.stdout.write(chunk.content);
}
```

## BYOK Providers (AI Orchestrations)

Configure your own API keys for building AI orchestrations in your Hololand setups.
AI-powered studio features are available separately through HoloScript Cloud (Pro subscription):

```typescript
const client = createInferenceClient({
  activeProvider: 'openai',
  providers: {
    openai: {
      type: 'openai',
      apiKey: 'sk-...',
      enabled: true,
    },
    anthropic: {
      type: 'anthropic',
      apiKey: 'sk-ant-...',
      enabled: true,
    },
    google: {
      type: 'google',
      apiKey: 'AIza...',
      enabled: true,
    },
    grok: {
      type: 'grok',
      apiKey: 'grok-...',
      enabled: true,
    },
  },
  fallbackToCloud: true,
});
```

## Supported Providers

| Provider | Type | Description |
|----------|------|-------------|
| **Ollama** | `local` | Local LLM inference (FREE) |
| **OpenAI** | `openai` | GPT-4, GPT-4o, GPT-4o-mini |
| **Anthropic** | `anthropic` | Claude 4, Claude 3.5 |
| **Google** | `google` | Gemini 2.0, Gemini Pro |
| **Grok** | `grok` | xAI Grok-3, Grok-2 |
| **Azure** | `azure` | Azure OpenAI Service |
| **InfinityAssistant** | `infinityassistant` | InfinityAssistant.io cloud |

## Pre-configured Brittney Models

Optimized for HoloScript code generation:

```typescript
import { BRITTNEY_MODELS } from '@hololand/inference';

// Local models (Ollama GGUF)
BRITTNEY_MODELS.local.expert    // 'brittney-qwen-v23:latest'
BRITTNEY_MODELS.local.holoscript // 'brittney-v1:latest'
BRITTNEY_MODELS.local.general   // 'brittney-v2:latest'

// Cloud fine-tuned (OpenAI)
BRITTNEY_MODELS.cloud.holoscript // Fine-tuned GPT-4o-mini for HoloScript
BRITTNEY_MODELS.cloud.general    // Fine-tuned for general Brittney tasks
```

## HoloScript Context

Pass scene context for better code generation:

```typescript
const response = await client.chat({
  messages: [{ role: 'user', content: 'Add physics to the orb' }],
  holoContext: {
    currentScene: 'demo.holo',
    holograms: [
      { id: 'orb1', type: 'sphere', position: { x: 0, y: 1.5, z: -2 } }
    ],
    recentCommands: ['create orb', 'set color cyan']
  }
});
```

## Spatial Fleet Integration

Built-in bridge for spatial fleet visualization:

```typescript
import { FleetVisualizationBridge, generateFleetVisualizationHoloScript } from '@hololand/inference';

const bridge = new FleetVisualizationBridge();

// Generate HoloScript from fleet data
const holoCode = generateFleetVisualizationHoloScript(fleetData);
```

## Status & Health

```typescript
const status = await client.getStatus();

console.log(status.ready);           // true if any provider available
console.log(status.activeProvider);  // 'local'
console.log(status.providers);       // Array of provider statuses
console.log(status.localModelDownloaded); // true if Brittney model ready
```

## API Reference

### `createInferenceClient(settings?)`

Create a new inference client with optional settings.

### `client.initialize()`

Initialize all configured providers. Call once before using.

### `client.chat(request)`

Send a chat completion request. Returns `InferenceResponse`.

### `client.chatStream(request)`

Stream chat responses. Returns `AsyncIterable<StreamChunk>`.

### `client.configureProvider(type, config)`

Configure or update a BYOK provider at runtime for AI orchestrations.

### `client.getStatus()`

Get status of all configured providers.

## Types

```typescript
import type {
  ProviderType,
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  InferenceSettings,
} from '@hololand/inference';
```

## License

MIT © Brian Joseph
