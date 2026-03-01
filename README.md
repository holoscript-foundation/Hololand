# HoloLand

**The Open Metaverse for Creators and Explorers**

Build, explore, and monetize immersive worlds in a seamless social VR/AR platform. Anyone can create. Everyone can play. Creators earn.

<p align="center">
  <img src="https://img.shields.io/badge/🚀_January_2026-What's_New-00cc66?style=for-the-badge" alt="What's New">
  <a href="https://github.com/brianonbased-dev/holoscript#-vrchat-alpha">
    <img src="https://img.shields.io/badge/🎮_VRChat_Export-Alpha-ff6600?style=for-the-badge" alt="VRChat Alpha">
  </a>
</p>

<p align="center">
  <img src="docs/assets/gifs/hololand-hero.gif" alt="Hololand in action - building a VR world with voice commands" width="700">
  <br>
  <em>"Create a floating island with waterfalls" → Built in seconds with voice commands</em>
</p>

---

## 🌍 What is HoloLand?

HoloLand is a **user-generated content metaverse** where you can:

- 🎨 **Create Anything** - Build worlds with voice commands, visual tools, or code
- 🚪 **Explore Infinite Worlds** - Walk through portals to user-created experiences
- 🤝 **Connect Socially** - Meet friends, form communities, attend live events
- 💰 **Earn as Creator** - Monetize your worlds and creations (70% revenue share)
- 🥽 **Seamless Experience** - Holographic UI, no loading screens, persistent identity

> **The Vision:** A social creation platform where users become creators, creators become entrepreneurs, and the metaverse builds itself.

**[📖 Read the Full Platform Vision →](./docs/PLATFORM_VISION.md)**

---

## 👥 Built for Everyone

**All ages. All interests. All professions. All skill levels.**

HoloLand serves everyone:
- 👶 **All Ages** - Kids to seniors, safe and accessible for each age group
- 🎯 **All Interests** - Gaming, social, creative, fitness, learning, shopping, entertainment
- 💼 **All Professions** - Sales, research, education, healthcare, architecture, and 12+ more industries
- 📊 **All Skill Levels** - From zero-skill players to professional developers

HoloLand has **multiple layers of experience** - start at any level:

### 🎮 Layer 1: Players
**No skills needed - just explore**
- Visit worlds built by others
- Play games, attend concerts, hang out with friends
- Zero learning curve - just put on headset and go

### 🗣️ Layer 2: Voice Creators
**No coding - just speak**
- "Create a medieval castle with a moat"
- Build worlds using natural language
- AI translates your ideas into reality instantly

### 🎨 Layer 3: Visual Builders
**No code - use drag & drop**
- HoloScript's visual editor (Unity-like interface)
- Place objects, adjust properties, connect logic
- Templates and prefabs to start quickly

### 💻 Layer 4: Script Creators
**Some coding - powerful control**
- Write HoloScript+ for custom behaviors
- Access full engine features
- Still easier than traditional game dev

### 🔧 Layer 5: Platform Developers
**Full development - extend the platform**
- Build plugins and integrations
- Create custom tools and workflows
- Contribute to open-source ecosystem

### 🏢 Layer 6: Professional Users
**Every profession can use HoloLand**

**Sales & Marketing** - Product demos, client presentations, trade shows, brand experiences
**Research & Science** - Data visualization, virtual labs, collaborative research, conferences
**Education & Training** - Virtual classrooms, field trips, simulations, student projects
**Healthcare** - Medical training, patient education, therapy, anatomy visualization
**Architecture & Real Estate** - Property tours, client walkthroughs, interior design, urban planning
**Manufacturing** - Safety training, equipment operation, process optimization, factory tours
**Legal & Government** - Virtual courtrooms, crime scene reconstruction, public hearings, disaster response
**Corporate** - Remote collaboration, virtual offices, company events, onboarding
**Creative Industries** - Virtual galleries, performance spaces, film pre-viz, fashion shows

**And more:** Retail, hospitality, automotive, aerospace, energy, finance, logistics...

**→ Start at any layer. Grow into others as you learn.**

---

## 🎮 Experience HoloLand

### For Players: Explore & Create

Put on your VR headset and jump into infinite worlds:

- 🌟 **Explore** - Visit user-created worlds (games, hangouts, art galleries, concerts)
- 🗣️ **Voice Building** - "Create a treehouse with a rope ladder" - built instantly
- 🚀 **Portal Network** - Walk through doorways between worlds, zero loading
- 👥 **Social** - Voice chat, gestures, parties, events
- 🎒 **Persistent Identity** - Your avatar, inventory, and friends travel with you

**[🎮 Player Guide →](./docs/PLAYER_GUIDE.md)** *(coming soon)*

### For Creators: Build & Monetize

Turn your ideas into immersive worlds:

- 💬 **Voice Building** - "Create a medieval castle" with AI assistance
- 🖱️ **Visual Editor** - Drag-drop interface for non-coders
- 💻 **HoloScript+** - Full spatial programming language for advanced control
- 💰 **Monetization** - Charge admission, sell items, earn 70% revenue
- 📊 **Analytics** - Track visitors, ratings, earnings in real-time

**[🛠️ Creator Guide →](#-for-developers-build-with-holoscript)** (below)

---

## 🥽 The Holographic Interface

HoloLand features a **futuristic holographic UI** inspired by advanced AR systems. When you're in VR, you're wearing virtual smart glasses with a swipeable, spatial interface.

### Key Features

- **Non-Intrusive** - UI appears only when needed, full immersion by default
- **Gesture Control** - Swipe up/down/left/right to navigate menus
- **Voice Activated** - "Show worlds", "Call friend", "Take photo"
- **3D Native** - Panels float in space at comfortable viewing distance
- **Context-Aware** - Shows relevant options based on what you're doing

### Quick Actions

```
Player View (Clean):
┌─────────────────────────────────┐
│                                 │  ← Full immersion
│     YOUR VR WORLD VIEW          │
│                                 │
│  [Friend dots]  [Compass]      │  ← Minimal indicators
└─────────────────────────────────┘

Swipe Up → Holographic Menu:
┌─────────────────────────────────┐
│  ╔═══════════════════════╗     │
│  ║ 🌍 Worlds  👥 Friends ║     │  ← Swipeable panels
│  ║ 🎒 Inventory  ⚙️ Settings ║  │
│  ╚═══════════════════════╝     │
│         YOUR VIEW               │
└─────────────────────────────────┘
```

**[📖 Full Holographic UI Guide →](./docs/HOLOGRAPHIC_UI.md)**

---

## 🚀 For Developers: Build with HoloScript

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function App() {
  return (
    <HololandCanvas worldConfig={{ enablePhysics: true }}>
      <HololandObject type="sphere" position={{ x: 0, y: 2, z: 0 }}
        physics={{ enabled: true, mass: 1 }} />
    </HololandCanvas>
  );
}
```

That's it. VR-ready, physics-enabled, runs everywhere.

### Built on HoloScript Game Engine

HoloLand **extends HoloScript's game engine and editor** with platform-specific features:

**HoloScript Engine (Foundation):**
- 🎮 **Visual Editor** - Unity-like scene editor with hierarchy, inspector, viewport
- 🎬 **Scene System** - GameObject hierarchy and component architecture
- 📦 **Asset Pipeline** - Import models, textures, sounds, animations
- ⚡ **Physics Engine** - Collision detection and rigid body simulation
- 🎨 **Rendering** - WebGL/WebGPU-based 3D rendering
- 💻 **Scripting** - HoloScript+ language for gameplay logic
- 🔨 **Build System** - Compile to WebXR for all platforms

**HoloLand Platform Enhancements:**
- 🌍 **World Publishing** - Instant deployment to HoloLand network
- 🚪 **Portal System** - Visual editor for cross-world connections
- 🤖 **AI Builder** - Natural language → scene generation
- 👥 **Multiplayer Tools** - Built-in networking and player sync
- 💰 **Monetization** - Integrate payments, analytics, ads
- 🎨 **Asset Marketplace** - Browse/buy community assets in-editor
- 📊 **Live Analytics** - Real-time player metrics and heatmaps
- 🔗 **Social Integration** - Friends, parties, events API

**Think of it as:**
- **HoloScript** = Unity (the game engine + editor)
- **HoloLand** = Platform ecosystem built on HoloScript (metaverse with social features, economy, discovery)

**[📖 HoloScript Engine Docs →](https://github.com/brianonbased-dev/HoloScript)**

---

## ⚡ Get Started in 2 Minutes

**Prerequisites:** [Node.js 18+](https://nodejs.org/) and [pnpm](https://pnpm.io/installation)

### Option A: Use in Your React App
```bash
npm install @hololand/react-three @hololand/world @hololand/renderer three
```

### Option B: Clone and Explore
```bash
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand && pnpm install && pnpm build
cd examples/hololand-central && pnpm dev
# Open http://localhost:5173
```

📖 **Full guide:** [QUICKSTART.md](./QUICKSTART.md)

### Deploy Your World

```bash
# Build and publish to Hololand network
holoscript build my-world.hsplus
holoscript publish my-world.hsplus --public

# Or deploy to your own server
holoscript build my-world.hsplus --target web
vercel deploy ./dist
```

🚀 **Deployment guide:** [USER_DEPLOYMENT_GUIDE.md](./docs/USER_DEPLOYMENT_GUIDE.md)

---

## 🚀 What's New (February 2026)

### 🧠 Autonomize Framework (Phase 11)
HoloLand now fully implements the uAA2++ Autonomize roadmap!
- **Cross-Modal Memory Bounds**: Query spatial semantic indices explicitly using `visualContext` and `audioContext`.
- **Episodic Replay Debugger**: Extract timeline graphs (`replay_episodic_timeline`) mapping simulated sequences sequentially.
- **Scene Graph Supervision**: Octree bound proximity algorithms generating standard geometric AI training triplets via `extract_scene_graph_labels`.

### 🎮 VRChat Export Alpha
HoloScript now exports directly to VRChat! Write `.hsplus`, get Udon. [Learn more →](https://github.com/brianonbased-dev/holoscript#-vrchat-alpha)

### 🛠️ Developer Tools v2.0
- **Formatter** (`@holoscript/formatter`) - Auto-format your code
- **Linter** (`@holoscript/linter`) - Catch bugs before runtime
- **LSP** (`@holoscript/lsp`) - Full IDE support
- **[HoloScript Repo](https://github.com/brianonbased-dev/HoloScript)** - Language now in separate repo

### 🤖 Brittney AI Upgrades
- 403.7K training samples with weighted superpowers
- 97% loss improvement in code generation
- Ready for Vast.ai deployment
- **NEW:** `@hololand/inference` — Unified AI with local (Ollama) + BYOK cloud for AI orchestrations

### 🔌 AI Integration
- **Claude Desktop/Code** — `.claude/settings.json` pre-configured
- **GitHub Copilot** — `.github/copilot-instructions.md` with MCP guidance
- **Cursor** — Full MCP integration support

### 🎯 HoloScript+ Migration Complete
- All packages now use `.hsplus` as the standard
- 541 tests passing across the ecosystem
- Full monorepo build pipeline

---

## Why Hololand?

- **Powered by HoloScript** → Not a library or wrapper, but a full spatial programming language. [Learn more →](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/WHY_HOLOSCRIPT.md)
- **One codebase** → Web, VR headsets, AR, mobile, desktop.
- **AI-Native Building** → 99% reduction in boilerplate + higher accuracy from LLMs.
- **Future-Proof** → Runtime independence ensures your experiences survive platform shifts.
- **SQL of Spatial Computing** → Declarative, tool-agnostic, and compiler-optimized.
- **Source available** → Elastic License 2.0, build freely.

---

## Architecture

**Hololand is built ON HoloScript, not INTO HoloScript.**

```
┌──────────────────────────────────────────────────────────────┐
│                    HOLOLAND APPLICATION                       │
│                    (@hololand/* packages)                     │
│  ├─ @hololand/gestures (gesture recognition)                │
│  ├─ @hololand/navigation (pathfinding, flow fields)         │
│  ├─ @hololand/network (multiplayer, CRDT state sync)        │
│  ├─ @hololand/social (friends, voice chat, parties)         │
│  └─ 40+ more @hololand/* packages                           │
├──────────────────────────────────────────────────────────────┤
│                    HOLOSCRIPT FRAMEWORK                       │
│              (PUBLIC APIs - Available to Everyone)            │
│  ├─ @holoscript/core (Parser, Compiler, Runtime)            │
│  ├─ @holoscript/runtime (ThreeJSRenderer, Physics)          │
│  └─ @holoscript/cli (Command-line tools)                    │
└──────────────────────────────────────────────────────────────┘
```

### Framework vs. Application Layer

| Layer | Packages | License | Purpose |
|-------|----------|---------|---------|
| **Framework** | `@holoscript/*` | MIT (open-source) | Commons-based meta-framework for spatial computing |
| **Application** | `@hololand/*` | ELv2 (source-available) | Hololand-specific VR social platform features |

**Key Point**: Hololand uses **ONLY** public HoloScript APIs. No privileged access, no special treatment.

### Even Playing Field

This architecture proves the "even playing field" strategy:
- ✅ **You can build competing platforms** using the same HoloScript APIs
- ✅ **No vendor lock-in** (HoloScript is commons-based, neutral governance)
- ✅ **Transparent quarterly audits** validate Hololand uses public APIs only

**Want to compete?** Build your own `@yourplatform/*` packages on HoloScript:
- VR training platform → `@vrtraining/scenarios`
- Robotics simulation → `@robotics/urdf-export`
- AR e-commerce → `@arstore/furniture-preview`

**[📘 Build Your Own Platform Guide →](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/BUILD_YOUR_OWN_PLATFORM.md)**

---

## Examples

### React Component

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function MyWorld() {
  return (
    <HololandCanvas rendererConfig={{ enableVR: true }}>
      {/* Ground */}
      <HololandObject type="plane" 
        rotation={{ x: -Math.PI / 2 }} 
        metadata={{ width: 50, height: 50 }} />
      
      {/* Bouncing ball */}
      <HololandObject type="sphere"
        position={{ x: 0, y: 5, z: 0 }}
        metadata={{ radius: 1, color: 0xff0000 }}
        physics={{ enabled: true, restitution: 0.8 }} />
    </HololandCanvas>
  );
}
```

### AI-Powered Building

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';

const bridge = new HololandAIBridge();
const result = await bridge.translateToHoloScript({
  naturalLanguage: "create a cozy reading nook with bookshelves"
});
// Result: Working HoloScript code
```

### Ready-to-Run Demos

```bash
cd examples/01-hello-vr-world && open index.html   # No build needed
cd examples/02-physics-playground && pnpm dev       # Interactive physics
cd examples/03-vr-shop && pnpm dev                  # Virtual store
```

## Packages

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@hololand/react-three` | 1.0.0 | React components for VR | ✅ |
| `@hololand/world` | 1.0.0 | Physics & world runtime | ✅ |
| `@hololand/renderer` | 1.0.0 | Three.js + WebXR | ✅ |
| `@hololand/ai-bridge` | 1.0.0 | Natural language → code | ✅ |
| `@hololand/network` | 1.0.0 | Multiplayer | ✅ |
| `@hololand/social` | 1.0.0 | Friends, avatars, chat | ✅ |
| `@hololand/commerce` | 1.0.0 | Shops & marketplace | ✅ |

### 🕶️ AR Suite
| Package | Purpose | Docs |
|---------|---------|------|
| `@hololand/ar-foundation` | Unified AR runtime bridge | [README](./packages/ar-foundation/README.md) |
| `@hololand/ar-tracking` | SLAM & Image tracking | [README](./packages/ar-tracking/README.md) |
| `@hololand/ar-anchors` | Geo-spatial persistence | [README](./packages/ar-anchors/README.md) |
| `@hololand/ar-detection` | Pose & object detection | [README](./packages/ar-detection/README.md) |
| `@hololand/ar-renderer` | AR overlay rendering | [README](./packages/ar-renderer/README.md) |

### 🤖 Brittney Suite (AI Architect)
| Package | Purpose |
|---------|---------|
| `@hololand/brittney-service` | The AI that builds worlds |
| `@hololand/brittney-toolkit` | Tools for self-modification |
| `@hololand/mcp-server` | Model Context Protocol for AI agents ([docs](./packages/mcp-server/README.md)) |
| `@hololand/inference` | Unified AI inference — Local (Ollama) + BYOK Cloud for AI orchestrations ([docs](./packages/shared/inference/README.md)) |

**Getting Started with Brittney:**
- [IDE Integration Setup](./packages/mcp-server/BRITTNEY_SETUP.md) - Connect Copilot/Claude/Cursor to your running app
- [Fine-tuning Guide](./packages/brittney-service/training/STEP_BY_STEP_FINETUNE.md) - Train your own Brittney model
- [AI Package Index](./docs/BRITTNEY_AI_PACKAGE_INDEX.md) - Complete AI documentation

### 🛠️ Developer Tools

> **Note:** Dev tools are now in the [HoloScript repo](https://github.com/brianonbased-dev/HoloScript).

| Package | Version | Purpose |
|---------|---------|---------|
| `@holoscript/formatter` | 2.0.0 | Code formatting for .holo/.hsplus |
| `@holoscript/linter` | 2.0.0 | Static analysis & linting |
| `@holoscript/lsp` | 1.0.0 | Language server protocol |

### 🎮 Platform Adapters

| Package | Purpose |
|---------|---------|
| `@hololand/three-adapter` | Three.js 3D world + physics |
| `@hololand/babylon-adapter` | Babylon.js integration |
| `@hololand/unity-adapter` | Unity C#/XR export |
| `@hololand/vrchat-export` | VRChat/UdonSharp (alpha) |

See [full package list](./ECOSYSTEM_STATUS.md) for all packages.

## Runs On

- **VR**: Quest, Valve Index, Vive, Apple Vision Pro
- **Web**: Chrome, Firefox, Safari
- **AR**: iOS, Android (WebXR)
- **Desktop**: Windows, Mac, Linux

## HoloScript

Hololand uses [HoloScript](https://github.com/brianonbased-dev/holoscript) - a declarative language that reduces codebase size by up to 90%.

### File Types

HoloScript uses **two complementary formats** for different purposes:

| Extension | Purpose | Best For |
|-----------|---------|----------|
| `.holo` | Declarative, visual | World layouts, agent definitions, AI-generated content |
| `.hsplus` | Imperative, full language | Complex logic, backends, custom systems |

### `.holo` - Declarative World Definition
```holo
// Visual, AI-friendly format for worlds and agents
agent Shopkeeper {
  position: [5, 0, 0]
  goals: ["sell_items", "greet_customers"]
  traits: ["talkable", "merchant"]
}

cube my_cube {
  position: [0, 1, 0]
  color: "#ff0000"
  interactive: true
}
```

### `.hsplus` - Full Programming Language
```hsplus
// Imperative code for complex systems
import { NetworkedWorldState } from "./systems/NetworkedWorldState.hsplus"

networked_object player {
  sync_rate: 20hz
  interpolation: true
  position: synced
}
```

**Use `.holo`** for world layouts, agents, and AI-generated content.  
**Use `.hsplus`** for game systems, networking, and complex logic.

See [HoloScript File Types Guide](./docs/HOLOSCRIPT_FILE_TYPES.md) for complete documentation.

## AI Agents

AI can see and build inside Hololand *(perception coming soon)*:

```typescript
import { HololandAgentBridge } from '@hololand/ai-bridge';

const agent = new HololandAgentBridge({
  name: 'BuilderBot',
  provider: 'openai',
  capabilities: { perception: true, creation: true }
});

await agent.enterWorld('my-world');
// Agent can now see and create in VR
```

Access **Brittney** (AI building assistant) at [infinityassistant.io](https://infinityassistant.io).

## Examples

```bash
# Clone and run an example
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand/examples/01-hello-vr-world
open index.html  # No build required
```

- `01-hello-vr-world` - Basic VR scene
- `02-physics-playground` - Interactive physics
- `03-vr-shop` - Virtual store
- `09-multiplayer-lobby` - Real-time collaboration

## Development

```bash
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand
pnpm install
pnpm build
pnpm test
```

## 🛠️ Development Tools

### CLI & Parsers
- **`@holoscript/cli`**: Parse and validate `.hsplus` files.
- **VS Code Extension**: Full syntax support.

### Content Workflow
1. Write `.hsplus` in VS Code with the extension.
2. Use `HoloScriptLoader` to hot-reload content in Hololand.
3. Test interactions in VR mode.

## Contributing

[Elastic License 2.0](./LICENSE). PRs welcome.

1. Fork → Branch → Commit → PR
2. Follow TypeScript best practices
3. Add tests for new features

## License

**Elastic License 2.0** - Source-available with commercial hosting restrictions. See [LICENSING.md](./LICENSING.md) for full details.

> 💡 **TL;DR:** Use it, modify it, deploy it - just don't offer it as a hosted service.

## Links

### Getting Started
- [Quick Start](./QUICKSTART.md) - Get started in 5 minutes
- [**Deployment Guide**](./docs/USER_DEPLOYMENT_GUIDE.md) - Publish your worlds
- [Documentation Index](./docs/INDEX.md) - All docs in one place

### Project Status
- [**Development Roadmap**](./DEVELOPMENT_ROADMAP_2026.md) - Current implementation status & completed features
- [Technical Vision](./ROADMAP.md) - Long-term architectural vision
- [Full Ecosystem](./ECOSYSTEM_STATUS.md) - All 40+ packages

### Resources
- [HoloScript](https://github.com/brianonbased-dev/holoscript) - The language
- [Infinity Assistant](https://infinityassistant.io) - AI building service
- [Examples](./examples/) - Working demos

---

**Built with ❤️ by the Hololand community**

*Where everyone can build in VR.*

---

**Last Updated**: February 26, 2026
