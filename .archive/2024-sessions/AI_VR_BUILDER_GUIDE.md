# 🤖 AI-Powered VR World Builder

> **Build Hololand in VR using Claude or Grok API**

This guide shows you how to use AI (Claude/Grok) to generate HoloScript code that gets rendered as VR worlds in Hololand.

---

## 🎯 Overview

**The Flow:**
```
Natural Language → AI (Claude/Grok) → HoloScript → Hololand World → VR (Quest/Vision Pro/WebXR/etc.)
```

**Example:**
```typescript
User: "Create a cyberpunk city with neon lights and flying cars"
  ↓
Claude/Grok generates HoloScript:
  composition "Cyberpunk City" {
    object "Neon Tower" { ... }
    object "Flying Car" { ... }
  }
  ↓
HoloScript → Loaded into Hololand
  ↓
Compiled to Unity/Unreal/WebXR
  ↓
Experience in VR! 🥽
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd packages/platform/world
pnpm install
```

### 2. Set API Key

**For Claude (Anthropic):**
```bash
export CLAUDE_API_KEY="sk-ant-..."
export AI_PROVIDER="anthropic"
```

**For Grok (xAI):**
```bash
export GROK_API_KEY="grok-..."
export AI_PROVIDER="grok"
```

### 3. Run Demo

```bash
# Generate a VR art gallery
tsx examples/ai-builder-demo.ts 0

# Generate a physics playground
tsx examples/ai-builder-demo.ts 1

# Generate a cyberpunk city
tsx examples/ai-builder-demo.ts 2

# Generate a nature scene
tsx examples/ai-builder-demo.ts 3
```

**Output:**
- HoloScript file saved to `output/*.holo`
- Loaded into Hololand world
- Simulation runs for 5 seconds
- Shows world statistics

---

## 📖 Usage

### Basic Example

```typescript
import { AIWorldBuilder } from '@hololand/world';
import { HololandWorld } from '@hololand/world';
import { NPCSystem, DialogManager, HoloScriptLoader } from '@hololand/world';

// 1. Create AI builder
const aiBuilder = new AIWorldBuilder({
  provider: 'anthropic',  // or 'grok'
  apiKey: process.env.CLAUDE_API_KEY,
  temperature: 0.7,
});

await aiBuilder.initialize();

// 2. Create Hololand world
const world = new HololandWorld({ name: 'My VR World' });
const loader = new HoloScriptLoader(new NPCSystem(), new DialogManager());

// 3. Generate VR scene from natural language
const result = await aiBuilder.buildAndLoad(
  {
    prompt: 'Create a meditation room with soft lighting and plants',
  },
  world,
  loader
);

console.log(result.holoScript);  // Generated HoloScript code
console.log(result.model);        // AI model used
console.log(result.loaded);       // true if successfully loaded

// 4. Start world simulation
world.start();
```

### Streaming Generation

```typescript
// Stream HoloScript generation in real-time
for await (const { chunk, holoScript, done } of aiBuilder.buildStream({
  prompt: 'Create a space station with zero gravity',
})) {
  process.stdout.write(chunk);  // Show AI thinking live

  if (done) {
    console.log('\n\nFinal HoloScript:', holoScript);
  }
}
```

### Conversational Building

```typescript
// Build iteratively with conversation context
const aiBuilder = new AIWorldBuilder({
  provider: 'anthropic',
  apiKey: process.env.CLAUDE_API_KEY,
});

await aiBuilder.initialize();

// First request
await aiBuilder.build({
  prompt: 'Create a VR office with a desk and computer',
});

// Follow-up (AI remembers context)
await aiBuilder.build({
  prompt: 'Add a window with a city view',
});

// Another follow-up
await aiBuilder.build({
  prompt: 'Make the computer screen glow blue',
});

// Clear history when starting new scene
aiBuilder.clearHistory();
```

### With Scene Context

```typescript
const result = await aiBuilder.build({
  prompt: 'Add a fountain in the center',
  sceneContext: {
    worldName: 'City Plaza',
    existingObjects: [
      'Ground Plaza',
      'Bench 1',
      'Bench 2',
      'Street Lamp',
      'Tree 1',
      'Tree 2',
    ],
    currentState: 'Day time, sunny',
  },
});
```

---

## 🎨 Example Prompts

### Architecture
```
"Create a modern house with:
- Open floor plan
- Floor-to-ceiling windows
- Minimalist furniture
- Indoor plants
- Natural lighting"
```

### Game Environments
```
"Create a boss arena with:
- Circular platform suspended in space
- Glowing pillars around the edge
- Particle effects
- Dramatic lighting
- Epic atmosphere"
```

### Interactive Experiences
```
"Create an interactive museum exhibit with:
- Display cases with artifacts
- Information panels
- Interactive buttons
- Ambient museum lighting
- Rope barriers"
```

### Abstract / Artistic
```
"Create a surreal dreamscape with:
- Floating geometric shapes
- Impossible architecture
- Color-shifting materials
- Ethereal fog
- No gravity"
```

### Data Visualization
```
"Create a 3D data dashboard with:
- Bar charts showing sales data
- Pie chart for market share
- Line graph for trends
- Interactive data points
- Professional color scheme"
```

---

## ⚙️ Configuration

### AI Builder Options

```typescript
const aiBuilder = new AIWorldBuilder({
  provider: 'anthropic',           // 'anthropic' or 'grok'
  apiKey: 'sk-ant-...',            // Your API key
  model: 'claude-sonnet-4-20250514', // Optional: specific model
  temperature: 0.7,                 // 0-1: creativity level
  maxTokens: 4096,                  // Max code length
});
```

### Provider Comparison

| Provider | Best For | Speed | Code Quality |
|----------|----------|-------|--------------|
| **Claude (Anthropic)** | Complex scenes, detailed | Moderate | Excellent |
| **Grok (xAI)** | Quick iterations | Fast | Very Good |

### Temperature Settings

- **0.3** - Predictable, consistent code
- **0.7** - Balanced creativity (recommended)
- **1.0** - Experimental, creative variations

---

## 🔧 API Reference

### `AIWorldBuilder`

#### Constructor
```typescript
new AIWorldBuilder(config: AIBuilderConfig)
```

**Config:**
- `provider: 'anthropic' | 'grok'` - AI provider to use
- `apiKey: string` - API key
- `model?: string` - Optional model override
- `temperature?: number` - Generation randomness (0-1)
- `maxTokens?: number` - Max tokens to generate

#### Methods

**`initialize()`**
Initialize the AI client.

```typescript
await aiBuilder.initialize();
```

**`build(request)`**
Generate HoloScript from prompt.

```typescript
const result = await aiBuilder.build({
  prompt: 'Create a VR classroom',
  sceneContext?: { ... },  // Optional context
});
```

Returns `BuildResult`:
- `holoScript: string` - Generated code
- `ast?: any` - Parsed AST
- `errors?: string[]` - Parse errors (if any)
- `loaded: boolean` - Whether parse succeeded
- `model: string` - Model used
- `generationTimeMs: number` - Time taken

**`buildAndLoad(request, world, loader)`**
Generate and load into Hololand world.

```typescript
const result = await aiBuilder.buildAndLoad(
  { prompt: '...' },
  world,
  holoScriptLoader
);
```

**`buildStream(request)`**
Stream generation in real-time.

```typescript
for await (const { chunk, holoScript, done } of aiBuilder.buildStream({ ... })) {
  // Process chunks
}
```

**`clearHistory()`**
Clear conversation history.

```typescript
aiBuilder.clearHistory();
```

---

## 🎯 Use Cases

### 1. **Rapid Prototyping**
Quickly generate VR prototypes from descriptions to test concepts.

```typescript
// Test different room layouts
const layouts = [
  'Create an open office layout',
  'Create a cubicle office layout',
  'Create a collaborative workspace',
];

for (const prompt of layouts) {
  const result = await aiBuilder.build({ prompt });
  // Test in VR
}
```

### 2. **Content Creation Pipeline**
Generate environments for games, training, or visualization.

```typescript
// Generate all levels for a VR game
const levels = [
  'Level 1: Tutorial room with basic obstacles',
  'Level 2: Forest with platforming challenges',
  'Level 3: Boss arena with hazards',
];

for (const level of levels) {
  const result = await aiBuilder.build({ prompt: level });
  saveToFile(`levels/${level}.holo`, result.holoScript);
}
```

### 3. **User-Generated Content**
Let users describe what they want, AI generates it.

```typescript
// In-game world builder
app.post('/generate-world', async (req, res) => {
  const userPrompt = req.body.prompt;

  const result = await aiBuilder.build({
    prompt: userPrompt,
  });

  res.json({
    holoScript: result.holoScript,
    preview: generatePreview(result.ast),
  });
});
```

### 4. **Training Simulations**
Generate training scenarios from requirements.

```typescript
const scenario = await aiBuilder.build({
  prompt: `Create a fire safety training scenario with:
  - Office building floor
  - Fire alarm stations
  - Exit routes marked
  - Obstacles to navigate around
  - Emergency lighting`,
});
```

### 5. **Data Visualization in VR**
Transform data into 3D visualizations.

```typescript
const salesData = fetchSalesData();

const result = await aiBuilder.build({
  prompt: `Create a 3D visualization showing:
  - Sales by region (3D bar chart)
  - Growth trends (line graph floating above)
  - Top products (interactive spheres)
  Use colors: blue for North, red for South, green for East, yellow for West`,
  sceneContext: {
    currentState: JSON.stringify(salesData),
  },
});
```

---

## 🚨 Best Practices

### 1. **Be Specific**
Good prompts get better results.

❌ **Bad:** "Create a room"
✅ **Good:** "Create a living room with a couch, coffee table, TV on the wall, and carpet"

### 2. **Include Scale References**
VR needs realistic dimensions.

✅ **Good:** "Create a table (1m tall, 2m wide)"
✅ **Good:** "Human-scale room (5m x 5m x 3m ceiling)"

### 3. **Mention VR Considerations**
AI should know it's for VR.

✅ **Good:** "Position objects at eye level for standing VR (1.6m)"
✅ **Good:** "Ensure walkable space (2m x 2m minimum)"

### 4. **Iterate with Context**
Build complex scenes incrementally.

```typescript
// Start simple
await aiBuilder.build({ prompt: 'Create an empty warehouse' });

// Add details
await aiBuilder.build({ prompt: 'Add shelving units along the walls' });
await aiBuilder.build({ prompt: 'Add boxes on the shelves' });
await aiBuilder.build({ prompt: 'Add a forklift near the entrance' });
```

### 5. **Validate Output**
Always check the generated code.

```typescript
const result = await aiBuilder.build({ prompt: '...' });

if (result.errors) {
  console.error('Parse errors:', result.errors);
  // Fix or regenerate
}

if (result.loaded) {
  // Safe to use
  world.start();
}
```

---

## 🔍 Troubleshooting

### API Key Issues

**Error:** `AI provider not available`

**Fix:**
```bash
# Verify API key is set
echo $CLAUDE_API_KEY
echo $GROK_API_KEY

# Test API key manually
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $CLAUDE_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}'
```

### Parse Errors

**Error:** `Parse errors: ...`

**Cause:** AI generated invalid HoloScript syntax

**Fix:**
```typescript
const result = await aiBuilder.build({ prompt: '...', temperature: 0.3 });
// Lower temperature = more predictable syntax
```

Or regenerate:
```typescript
aiBuilder.clearHistory();  // Start fresh
const result = await aiBuilder.build({ prompt: '...' });
```

### Rate Limits

**Error:** `429 Too Many Requests`

**Fix:** Add retry logic:
```typescript
async function buildWithRetry(prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await aiBuilder.build({ prompt });
    } catch (error: any) {
      if (error.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}
```

### Memory Issues

**Error:** Context window exceeded

**Fix:** Clear history periodically:
```typescript
// Clear after each major scene
aiBuilder.clearHistory();

// Or limit conversation length
if (conversationTurns > 10) {
  aiBuilder.clearHistory();
}
```

---

## 📊 Performance

### Generation Times

| Scene Complexity | Claude | Grok | Lines of HoloScript |
|------------------|--------|------|---------------------|
| Simple (1-5 objects) | 2-5s | 1-3s | 50-150 |
| Medium (5-15 objects) | 5-10s | 3-7s | 150-400 |
| Complex (15+ objects) | 10-20s | 7-15s | 400-1000+ |

### Optimization Tips

1. **Start simple, iterate:** Generate base scene, then add details
2. **Reuse templates:** Save good generations as templates
3. **Parallel generation:** Generate multiple scenes concurrently
4. **Cache results:** Store common patterns

```typescript
// Parallel generation
const [gallery, playground, city] = await Promise.all([
  aiBuilder.build({ prompt: 'Create a VR art gallery' }),
  aiBuilder.build({ prompt: 'Create a physics playground' }),
  aiBuilder.build({ prompt: 'Create a cyberpunk city' }),
]);
```

---

## 🎓 Learn More

### Resources

- **HoloScript Docs:** [HOLOSCRIPT_LANGUAGE_SPEC.md](./docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
- **@hololand/world API:** [packages/platform/world/README.md](./packages/platform/world/README.md)
- **@hololand/inference:** [packages/shared/inference/README.md](./packages/shared/inference/README.md)

### Examples

- **AI Builder Demo:** [packages/platform/world/examples/ai-builder-demo.ts](./packages/platform/world/examples/ai-builder-demo.ts)
- **HoloScript Examples:** [examples/](./examples/)

---

## 🚀 Next Steps

1. **Try the demo:** Run `tsx examples/ai-builder-demo.ts`
2. **Experiment with prompts:** Find what works best
3. **Build your own:** Use the API in your project
4. **Share your creations:** Show us what you build!

---

## 📝 License

MIT © Hololand Contributors

---

**Built with ❤️ for the Hololand ecosystem**

*AI-powered spatial computing for everyone* 🌐
