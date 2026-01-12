# @hololand/core

Core HoloScript engine - Parser, Runtime, and Types for VR spatial programming.

## Installation

```bash
npm install @hololand/core
# or
pnpm add @hololand/core
# or
yarn add @hololand/core
```

## Usage

```typescript
import {
  HoloScriptParser,
  HoloScriptRuntime,
  createHoloScriptEnvironment,
  type VoiceCommand,
  type GestureData,
  type ExecutionResult
} from '@hololand/core';

// Option 1: Use helper function
const { parser, runtime, version } = createHoloScriptEnvironment();

// Option 2: Create manually
const parser = new HoloScriptParser();
const runtime = new HoloScriptRuntime();

// Parse voice command
const voiceCommand: VoiceCommand = {
  command: 'create orb greeting',
  confidence: 0.9,
  timestamp: Date.now(),
  spatialContext: { x: 0, y: 1, z: -1 }
};

const nodes = parser.parseVoiceCommand(voiceCommand);

// Execute
const results: ExecutionResult[] = await runtime.executeProgram(nodes);

console.log(results);
// [{ success: true, output: {...}, executionTime: 5 }]
```

## Features

- **Zero Dependencies**: Pure TypeScript, no runtime dependencies
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Secure**: Built-in security patterns and runtime limits
- **Extensible**: Pluggable logger interface for custom logging
- **Fast**: Optimized parser and runtime engine
- **VR-Ready**: Designed for WebXR and spatial computing

## API

### HoloScriptParser

Parse voice commands and gestures into AST nodes.

```typescript
const parser = new HoloScriptParser();

// Parse voice
const nodes = parser.parseVoiceCommand(voiceCommand);

// Parse gesture
const nodes = parser.parseGesture(gestureData);

// Get AST
const ast = parser.getAST();

// Clear AST
parser.clear();
```

### HoloScriptRuntime

Execute HoloScript AST with spatial computation.

```typescript
const runtime = new HoloScriptRuntime();

// Execute single node
const result = await runtime.executeNode(node);

// Execute program
const results = await runtime.executeProgram(nodes);

// Get context
const context = runtime.getContext();

// Reset runtime
runtime.reset();
```

## Configuration

### Custom Logger

By default, HoloScript uses a no-op logger. You can provide your own:

```typescript
import { setHoloScriptLogger } from '@hololand/core';

setHoloScriptLogger({
  info: (message, meta) => console.log(message, meta),
  warn: (message, meta) => console.warn(message, meta),
  error: (message, meta) => console.error(message, meta),
  debug: (message, meta) => console.debug(message, meta)
});
```

## Security

HoloScript includes built-in security:

- Input length validation (max 1000 chars)
- Token count limits (max 100 tokens)
- Keyword blocking (prevents injection)
- Recursion depth limits (max 50)
- Execution timeout (5000ms)
- Particle system limits (max 1000 particles)

See [Security Patterns](../../docs/SECURITY.md) for details.

## License

MIT
