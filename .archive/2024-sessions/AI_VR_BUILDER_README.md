# 🚀 AI-Powered Hololand VR Builder

> **Build Hololand in VR using Claude or Grok API** ✨

## What We Built

A complete AI-powered VR world generation system that transforms natural language into HoloScript, which then gets rendered in Hololand and compiled to VR platforms.

### Architecture

```
User Prompt
    ↓
Claude/Grok API (via @hololand/inference)
    ↓
HoloScript Code Generated
    ↓
Loaded into @hololand/world
    ↓
Compiled to Unity/Unreal/WebXR/Quest/Vision Pro
    ↓
Experience in VR! 🥽
```

---

## 🎯 Key Components

### 1. **AIWorldBuilder** (`packages/platform/world/src/ai/AIWorldBuilder.ts`)
- Connects to Claude or Grok API
- Generates HoloScript from natural language
- Supports streaming for real-time output
- Maintains conversation context
- Validates and parses generated code

### 2. **Demo** (`packages/platform/world/examples/ai-builder-demo.ts`)
- 4 pre-configured scene types:
  - VR Art Gallery
  - Physics Playground
  - Cyberpunk City
  - Nature Scene
- Streaming generation with live output
- Automatic world loading and simulation
- Saves generated .holo files

### 3. **Guide** (`AI_VR_BUILDER_GUIDE.md`)
- Complete documentation
- API reference
- Best practices
- Troubleshooting
- Use cases and examples

---

## 🚀 Quick Start

### 1. Set API Key

```bash
# For Claude
export CLAUDE_API_KEY="sk-ant-..."
export AI_PROVIDER="anthropic"

# OR for Grok
export GROK_API_KEY="grok-..."
export AI_PROVIDER="grok"
```

### 2. Run Demo

```bash
cd packages/platform/world
pnpm demo:ai 0  # VR Art Gallery
pnpm demo:ai 1  # Physics Playground
pnpm demo:ai 2  # Cyberpunk City
pnpm demo:ai 3  # Nature Scene
```

### 3. Use in Your Code

```typescript
import { AIWorldBuilder, HololandWorld } from '@hololand/world';

// Create AI builder
const aiBuilder = new AIWorldBuilder({
  provider: 'anthropic',
  apiKey: process.env.CLAUDE_API_KEY,
});

await aiBuilder.initialize();

// Create world
const world = new HololandWorld({ name: 'My VR World' });

// Generate VR scene
const result = await aiBuilder.buildAndLoad(
  { prompt: 'Create a meditation room with plants' },
  world,
  holoScriptLoader
);

console.log(result.holoScript);  // Generated HoloScript
world.start();  // Start simulation
```

---

## 📚 Documentation

- **Full Guide:** [AI_VR_BUILDER_GUIDE.md](./AI_VR_BUILDER_GUIDE.md)
- **HoloScript Spec:** [docs/HOLOSCRIPT_LANGUAGE_SPEC.md](./docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
- **@hololand/inference:** [packages/shared/inference/README.md](./packages/shared/inference/README.md)

---

## 🎨 Example Prompts

```typescript
// Architecture
"Create a modern minimalist house with floor-to-ceiling windows"

// Game Environment
"Create a boss arena floating in space with glowing pillars"

// Interactive
"Create an interactive museum with display cases and info panels"

// Data Visualization
"Create a 3D dashboard with bar charts and pie charts for sales data"

// Abstract
"Create a surreal dreamscape with impossible geometry and floating shapes"
```

---

## 🔧 Features

✅ **Claude & Grok Support** - Use either API
✅ **Streaming Generation** - See AI thinking in real-time
✅ **Conversation Context** - Build iteratively
✅ **HoloScript Validation** - Auto-parse and validate
✅ **World Integration** - Direct loading into Hololand
✅ **Multi-Platform** - Compiles to 18+ platforms
✅ **Production Ready** - Full error handling

---

## 🎯 Use Cases

1. **Rapid Prototyping** - Test VR concepts instantly
2. **Content Pipeline** - Generate environments at scale
3. **User-Generated Content** - Let users describe, AI creates
4. **Training Simulations** - Generate scenarios from requirements
5. **Data Visualization** - Transform data into 3D VR

---

## 📊 What Gets Generated

**Input:**
```
"Create a cyberpunk city with neon lights"
```

**Output:**
```holoscript
composition "Cyberpunk City" {
  object "Neon Tower" {
    @spatial @networked @emissive
    geometry: "box"
    position: [0, 10, -20]
    scale: [5, 20, 5]
    material: {
      color: "#FF00FF"
      emissive: "#FF00FF"
      emissiveIntensity: 2.0
    }
  }

  object "Flying Car" {
    @spatial @physics @networked
    geometry: "capsule"
    position: [10, 15, -10]
    scale: [2, 1, 4]
    material: { color: "#00FFFF" }
  }

  // ... more objects
}
```

**Compiles to:**
- Unity C# scripts
- Unreal Engine C++ code
- WebXR JavaScript
- And 15+ other platforms!

---

## 🚨 Important Notes

### What This Does
✅ Generates HoloScript from natural language
✅ Loads into Hololand world runtime
✅ Ready to compile to VR platforms

### What This Doesn't Do (Yet)
❌ Direct VR rendering (need to compile HoloScript first)
❌ Auto-deploy to VR headsets
❌ Real-time 3D preview (coming soon)

### Next Steps After Generation
1. Save generated .holo file
2. Compile to your target platform (Unity/Unreal/WebXR)
3. Deploy to VR headset
4. Experience in VR!

---

## 🎉 Success!

You now have:
- ✅ AI-powered VR world generation
- ✅ Natural language → HoloScript pipeline
- ✅ Integration with Hololand world runtime
- ✅ Support for Claude & Grok APIs
- ✅ Streaming generation
- ✅ Full documentation

**Ready to build Hololand in VR with AI!** 🚀

---

## 📝 Files Created

```
Hololand/
├── AI_VR_BUILDER_GUIDE.md                           # Full documentation
├── AI_VR_BUILDER_README.md                          # This file
└── packages/platform/world/
    ├── src/ai/
    │   └── AIWorldBuilder.ts                        # Main AI builder class
    ├── examples/
    │   ├── ai-builder-demo.ts                       # Demo script
    │   └── output/                                  # Generated .holo files
    └── package.json                                 # Updated with inference dependency
```

---

## 🤝 Contributing

Want to improve the AI builder? Ideas:
- Add more providers (Gemini, DeepSeek, etc.)
- Improve prompts for better generation
- Add templates for common scenes
- Build a web UI for non-developers
- Create a VR builder inside VR itself!

---

**Built with ❤️ using HoloScript**

*The future of spatial computing is declarative* ✨
