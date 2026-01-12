# @hololand/ai-bridge

> AI Bridge for Natural Language → HoloScript Translation

**@hololand/ai-bridge** enables normies and developers to build in VR using natural language, voice commands, and AI-assisted code generation. This is the critical bridge that makes Hololand accessible to everyone, not just experienced programmers.

## Features

- 🗣️ **Natural Language Translation** - Convert "create a coffee shop" to HoloScript code
- 🎤 **Voice Command Processing** - Build in VR using voice (WebXR + Web Speech API)
- 📖 **Code Explanation** - Explain HoloScript in beginner-friendly language
- ⚡ **Code Optimization** - AI-powered suggestions for better code
- 🏗️ **Template Generation** - Pre-built templates for common structures
- 🔄 **Real-time Suggestions** - Autocomplete and intelligent recommendations

## Installation

```bash
npm install @hololand/ai-bridge @hololand/core
```

## Quick Start

### Basic Natural Language Translation

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';

const bridge = new HololandAIBridge({
  enableVoice: true,
  confidenceThreshold: 0.7,
});

// Translate natural language to HoloScript
const result = await bridge.translateToHoloScript({
  naturalLanguage: "create a coffee shop with a counter and menu board",
  context: {
    userLevel: 'beginner',
    location: { x: 0, y: 0, z: 0 }
  }
});

console.log(result.holoScript);
// Output:
// orb shop_coffee {
//   type: "shop"
//   shopType: "coffee"
//   features: "counter and menu board"
//   color: "#4ecdc4"
//   size: 3
//   interactive: true
// }
// ...

console.log(result.confidence); // 0.85
console.log(result.explanation); // "Creates a coffee shop with interactive features"
```

### Voice Command Processing (VR)

```typescript
// In a VR environment with microphone access
const audioBuffer = await captureVoiceInput(); // Your VR app's audio capture

const voiceResult = await bridge.processVoiceCommand(audioBuffer);

if (voiceResult.holoScript) {
  console.log('Recognized:', voiceResult.text);
  console.log('HoloScript:', voiceResult.holoScript);
  executeHoloScript(voiceResult.holoScript);
} else if (voiceResult.needsClarification) {
  promptUser('Could you repeat that?');
}
```

### Code Explanation

```typescript
const holoScriptCode = `
orb greeting {
  message: "Hello, HoloScript World!"
  color: "#00ffff"
  glow: true
}

function displayGreeting() {
  show greeting
}
`;

const explanation = await bridge.explainCode(holoScriptCode, 'beginner');

console.log(explanation.summary);
// "This HoloScript code creates 3D objects in your VR world and defines reusable actions."

explanation.lineByLine.forEach(line => {
  console.log(`Line ${line.lineNumber}: ${line.explanation}`);
});

console.log('Key Concepts:');
explanation.concepts.forEach(concept => console.log(`- ${concept}`));
```

### Code Optimization

```typescript
const optimizationResult = await bridge.optimizeCode(holoScriptCode);

console.log('Optimized Code:');
console.log(optimizationResult.optimizedCode);

console.log('\nSuggestions:');
optimizationResult.suggestions.forEach(suggestion => {
  console.log(`[${suggestion.severity}] ${suggestion.message}`);
});

console.log('\nMetrics:');
console.log(`- Complexity: ${optimizationResult.metrics.complexity}`);
console.log(`- Orbs: ${optimizationResult.metrics.orbCount}`);
console.log(`- Functions: ${optimizationResult.metrics.functionCount}`);
```

### Template Generation

```typescript
// Generate from pre-built templates
const coffeeShop = await bridge.generateFromTemplate('coffee-shop', {
  size: 'large',
  seating: 8
});

const artGallery = await bridge.generateFromTemplate('art-gallery', {
  walls: 6,
  pedestals: 10
});

console.log(coffeeShop.holoScript);
```

### Autocomplete Suggestions

```typescript
const suggestions = await bridge.getSuggestions("create a...");

console.log(suggestions);
// [
//   "create a coffee shop",
//   "create a store",
//   "create an art gallery"
// ]
```

## Configuration

```typescript
const bridge = new HololandAIBridge({
  // Enable voice command processing (requires Web Speech API)
  enableVoice: true,

  // Enable code optimization features
  enableOptimization: true,

  // Minimum confidence threshold for translations (0.0 - 1.0)
  confidenceThreshold: 0.7,

  // Maximum number of optimization suggestions
  maxSuggestions: 5,
});

// Update configuration dynamically
bridge.updateConfig({
  confidenceThreshold: 0.8,
  maxSuggestions: 10,
});
```

## Custom Logger

```typescript
import { setHololandAILogger } from '@hololand/ai-bridge';

// Use your own logging solution
setHololandAILogger({
  info: (msg, meta) => myLogger.info(msg, meta),
  warn: (msg, meta) => myLogger.warn(msg, meta),
  error: (msg, meta) => myLogger.error(msg, meta),
  debug: (msg, meta) => myLogger.debug(msg, meta),
});
```

## Integration with Services

### For uaa2-service (Builder's Workshop)

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';
import { logger } from '@/utils/logger';
import { setHololandAILogger } from '@hololand/ai-bridge';

// Configure logging
setHololandAILogger({
  info: (msg, meta) => logger.info(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
});

const bridge = new HololandAIBridge({
  enableOptimization: true,
  confidenceThreshold: 0.75,
});

// Use in Master Brittney agent or HoloScript IDE
export const aiAssistCodeGeneration = async (naturalLanguage: string) => {
  return bridge.translateToHoloScript({
    naturalLanguage,
    context: { userLevel: 'advanced' }
  });
};
```

### For infinityassistant-service (Normie's Companion)

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';

const bridge = new HololandAIBridge({
  enableVoice: true,
  confidenceThreshold: 0.6, // Lower threshold for normies
  maxSuggestions: 8,
});

// Voice-first interface for normies
export const handleNormieVoiceCommand = async (audioBuffer: ArrayBuffer) => {
  const result = await bridge.processVoiceCommand(audioBuffer);

  if (result.needsClarification) {
    return {
      status: 'clarification_needed',
      message: 'Could you say that again?',
      suggestions: result.suggestions,
    };
  }

  return {
    status: 'success',
    holoScript: result.holoScript,
    explanation: await bridge.explainCode(result.holoScript!, 'beginner'),
  };
};
```

## Supported Patterns

The AI Bridge understands these natural language patterns:

- `create a [type] called [name]` → Creates named objects
- `build a [structure] with [features]` → Creates complex structures
- `add a [object] to [location]` → Adds objects to spaces
- `connect [object1] to [object2]` → Establishes connections
- `visualize [data]` → Creates visualizations
- `make a function called [name]` → Creates functions

## Voice Commands

Supported voice commands in VR:

- `create` / `make` / `build`
- `add` / `remove` / `delete`
- `connect` / `disconnect`
- `move` / `rotate` / `resize`
- `color` / `visualize`
- `help`

## Template Categories

Pre-built templates organized by category:

- **Commerce**: `coffee-shop`, `retail-store`, `restaurant`, `market`
- **Workspace**: `office`, `coworking-space`, `meeting-room`, `studio`
- **Entertainment**: `art-gallery`, `museum`, `theater`, `game-room`
- **Social**: `lounge`, `cafe`, `park`, `plaza`

## API Reference

### HololandAIBridge

Main AI Bridge class.

#### Methods

- `translateToHoloScript(request: BuildRequest): Promise<TranslationResult>`
- `processVoiceCommand(audio: ArrayBuffer): Promise<VoiceProcessingResult>`
- `explainCode(holoScript: string, userLevel?: 'beginner' | 'intermediate' | 'advanced'): Promise<ExplanationResult>`
- `optimizeCode(holoScript: string): Promise<OptimizationResult>`
- `generateFromTemplate(templateName: string, params?: Record<string, any>): Promise<TranslationResult>`
- `getSuggestions(partialInput: string): Promise<string[]>`
- `updateConfig(config: Partial<AIBridgeConfig>): void`
- `getConfig(): Readonly<Required<AIBridgeConfig>>`

### NaturalLanguageTranslator

Standalone natural language translator.

```typescript
import { NaturalLanguageTranslator } from '@hololand/ai-bridge';

const translator = new NaturalLanguageTranslator(0.7);
const result = await translator.translate("create a shop");
```

### VoiceProcessor

Standalone voice command processor.

```typescript
import { VoiceProcessor } from '@hololand/ai-bridge';

const processor = new VoiceProcessor();
const result = await processor.process(audioBuffer);
```

### CodeExplainer

Standalone code explainer.

```typescript
import { CodeExplainer } from '@hololand/ai-bridge';

const explainer = new CodeExplainer();
const explanation = await explainer.explain(holoScript, 'beginner');
```

### CodeOptimizer

Standalone code optimizer.

```typescript
import { CodeOptimizer } from '@hololand/ai-bridge';

const optimizer = new CodeOptimizer(5);
const optimized = await optimizer.optimize(holoScript);
```

## Browser Compatibility

- **Voice Commands**: Requires Web Speech API (Chrome, Edge, Safari)
- **Core Features**: Works in all modern browsers
- **VR/WebXR**: Requires WebXR support (Oculus Browser, Chrome with headset)

## Contributing

See the [main Hololand README](../../README.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Related Packages

- [@hololand/core](../core) - Core HoloScript engine
- [@hololand/world](../world) - VR world runtime (coming soon)
- [@hololand/builder](../builder) - Visual building tools (coming soon)

## Support

- 📖 [Documentation](https://github.com/brianonbased-dev/Hololand)
- 🐛 [Issue Tracker](https://github.com/brianonbased-dev/Hololand/issues)
- 💬 [Discussions](https://github.com/brianonbased-dev/Hololand/discussions)
