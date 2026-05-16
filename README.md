# HoloLand

**The lived platform for HoloScript worlds**

HoloLand is where HoloScript becomes a persistent, social, hardware-tested
world. HoloScript defines the source semantics; HoloLand materializes them as
playable browser, VR, AR, and agent-inhabited experiences.

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

## What Is HoloLand?

HoloLand is the product/runtime layer of the HoloScript ecosystem. Its job is
not to redefine the language or hide product behavior in hand-written renderer
code. Its job is to make HoloScript worlds livable:

- Run validated `.holo`, `.hs`, and `.hsplus` source through the HoloScript runtime/compiler stack.
- Materialize worlds on browser, desktop, VR, AR, and hardware-specific surfaces.
- Host identity, multiplayer, portals, discovery, creator publishing, commerce, analytics, and receipts.
- Give Brittney and other agents a world-facing embodiment.
- Send missing primitives upstream to HoloScript instead of turning TypeScript bridges into product truth.

HoloLand proves that HoloScript can operate an actual world, not just generate a
demo.

### Zero TypeScript Goal

The end state is **zero hand-authored `.ts` and `.tsx` files in HoloLand**.
HoloLand source should be HoloScript: `.holo`, `.hs`, and `.hsplus`.

Any remaining TypeScript or TSX in this repository is migration debt. Bridge
code, renderer glue, host APIs, tests, and build plumbing are temporary surfaces
until they are expressed as HoloScript runtime/compiler capabilities, moved
upstream into the HoloScript toolchain, or generated as ignored disposable
output.

**[Read the HoloLand Purpose Doc ->](./docs/HOLOLAND_PURPOSE.md)**

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
- Write `.hs` templates, `.hsplus` modules, or `.holo` compositions
- Access the full three-format language system
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
- 💻 **HoloScript+** - Typed HoloScript systems for advanced control
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

```holo
composition "StarterWorld" {
  environment {
    skybox: "clear_day"
    ambient_light: 0.6
  }

  spatial_group "Spawn" {
    object "WelcomeOrb" {
      shape: "sphere"
      position: [0, 2, -3]
      material: { color: "#00c2a8" }
      physics: { enabled: true, mass: 1 }
    }
  }
}
```

Validate it, run it, then let HoloLand materialize it.

```powershell
pnpm exec hs parse path\to\StarterWorld.holo
pnpm exec hs run path\to\StarterWorld.holo
```

Current TypeScript packages for adapters, renderers, host APIs, tooling, and
tests are migration debt. New world behavior starts in HoloScript, and the final
HoloLand platform should require no hand-authored TypeScript or TSX.

### Built on the HoloScript Source Layer

HoloLand consumes HoloScript as the source layer:

- **Three source formats** - `.holo` compositions, `.hs` reusable semantic programs, `.hsplus` typed systems.
- **Validation and diagnostics** - syntax, traits, contracts, and graph shape.
- **Runtime and compiler targets** - direct execution when possible, target compilation when needed.
- **Provenance** - replayable receipts for generated worlds, agent actions, and runtime claims.

**HoloLand Platform Enhancements:**
- **World publishing** - Deploy HoloScript-authored worlds to the HoloLand network.
- **Runtime materialization** - Turn source artifacts into playable browser, VR, AR, and desktop experiences.
- **Brittney and agent embodiment** - Let agents create, inspect, guide, and steward live worlds.
- **Multiplayer and persistence** - Identity, parties, portals, state sync, receipts, and social systems.
- **Creator economy** - Publishing, marketplace, analytics, payments, and moderation.
- **Hardware validation** - Local browser, WebXR, headset, AR, and performance checks.

**Think of it as:**
- **HoloScript** = source of reality: language, semantics, validators, compilers, runtime contracts.
- **HoloLand** = lived platform: worlds, players, creators, agents, devices, publishing, and receipts.

For Brittney's role across the ecosystem:

- **HoloScript** is Brittney's substrate
- **Studio** is Brittney's primary creation surface
- **HoloLand** is Brittney's flagship runtime embodiment

See [docs/BRITTNEY_OWNERSHIP_MODEL.md](./docs/BRITTNEY_OWNERSHIP_MODEL.md).

### HoloShell Hardware Reality Receipts

HoloShell is the non-developer hardware surface. Its host adapters are not the
product truth; they consume `.hsplus` product source and emit local receipts for
Brittney and other agents.

- `apps/holoshell/source/holoshell-network-reality.hsplus` defines local network truth.
- `apps/holoshell/source/holoshell-network-freshness-watch.hsplus` prevents stale network receipts from driving live feed or Brittney after Wi-Fi, hotspot, VPN, or metered-state changes.
- `apps/holoshell/source/holoshell-home.hsplus` surfaces the freshness guard as a visible HoloShell object.

Useful local commands:

```powershell
pnpm run holoshell:network-watch
pnpm run holoshell:network-reality
pnpm run test:holoshell-network-freshness
```

**[📖 HoloScript Framework Docs →](https://github.com/brianonbased-dev/HoloScript)**

---

## ⚡ Get Started in 2 Minutes

**Prerequisites:** [Node.js 18+](https://nodejs.org/) and [pnpm](https://pnpm.io/installation)

### Option A: Write a HoloScript World
```holo
composition "MyFirstWorld" {
  environment {
    skybox: "clear_day"
  }

  object "Beacon" {
    shape: "sphere"
    position: [0, 2, -4]
    material: { color: "#00c2a8" }
  }
}
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

- **Powered by HoloScript** - HoloScript is the source/runtime substrate, not a decorative export. [Learn more ->](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/WHY_HOLOSCRIPT.md)
- **Runtime first** - HoloLand can execute HoloScript directly, then compile or bridge to target renderers when needed.
- **Hardware checked** - Browser, desktop, VR, AR, and headset claims need local validation.
- **Agent inhabited** - Brittney and other agents can create, inspect, guide, and steward live worlds.
- **Platform scoped** - HoloLand owns product experience and host bridges; HoloScript owns canonical semantics.

---

## Architecture

**HoloLand is built on HoloScript, not into HoloScript.**

```
┌──────────────────────────────────────────────────────────────┐
│                    HOLOLAND PRODUCT/RUNTIME                    │
│                    (@hololand/* packages)                     │
│  ├─ @hololand/gestures (gesture recognition)                │
│  ├─ @hololand/navigation (pathfinding, flow fields)         │
│  ├─ @hololand/network (multiplayer, CRDT state sync)        │
│  ├─ @hololand/social (friends, voice chat, parties)         │
│  └─ platform bridges, adapters, hardware, and product APIs   │
├──────────────────────────────────────────────────────────────┤
│                    HOLOSCRIPT SOURCE LAYER                    │
│              (PUBLIC APIs - Available to Everyone)            │
│  ├─ @holoscript/core (Parser, Compiler, Runtime)            │
│  ├─ @holoscript/runtime (execution contracts)               │
│  └─ @holoscript/cli (Command-line tools)                    │
└──────────────────────────────────────────────────────────────┘
```

### Framework vs. Application Layer

| Layer | Packages | License | Purpose |
|-------|----------|---------|---------|
| **Source layer** | `@holoscript/*` | MIT (open-source) | Language, semantics, validation, compiler, runtime contracts |
| **Platform layer** | `@hololand/*` | ELv2 (source-available) | HoloLand-specific worlds, players, creators, agents, bridges, and hardware validation |

**Key Point**: HoloLand uses public HoloScript APIs. No privileged language path, no private semantic fork.

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

### HoloScript Composition

```holo
composition "PhysicsGarden" {
  environment {
    skybox: "clear_day"
    ambient_light: 0.6
  }

  spatial_group "MainArea" {
    object "Ground" {
      shape: "plane"
      position: [0, 0, 0]
      size: [50, 1, 50]
    }

    object "BouncingBall" {
      shape: "sphere"
      position: [0, 5, 0]
      material: { color: "#ff3366" }
      physics: { enabled: true, restitution: 0.8 }
    }
  }
}
```

### AI-Powered Building

AI building must emit HoloScript source. That source is what HoloLand validates,
executes, materializes, and records.

```holo
composition "ReadingNook" {
  environment {
    skybox: "warm_library"
  }

  spatial_group "Nook" {
    object "Bookshelves" {
      shape: "wall_shelf"
      position: [-2, 1, -4]
    }

    object "ReadingChair" {
      shape: "chair"
      position: [0, 0, -3]
    }
  }
}
```

### Ready-to-Run Demos

```bash
cd examples/01-hello-vr-world && open index.html   # No build needed
cd examples/02-physics-playground && pnpm dev       # Interactive physics
cd examples/03-vr-shop && pnpm dev                  # Virtual store
```

## Packages

This table is current implementation inventory, not the target architecture.
Packages whose purpose is React, Three.js, or TypeScript bridging are migration
surfaces until HoloLand reaches the zero-TypeScript source contract.

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@hololand/react-three` | 1.0.0 | React components for VR | ✅ |
| `@hololand/world` | 1.0.0 | Physics & world runtime | ✅ |
| `@hololand/renderer` | 1.0.0 | Three.js + WebXR | ✅ |
| `@hololand/ai-bridge` | 1.0.0 | Natural language → code | ✅ |
| `@hololand/network` | 1.0.0 | Multiplayer | ✅ |
| `@hololand/social` | 1.0.0 | Friends, avatars, chat | ✅ |
| `@hololand/commerce` | 1.0.0 | Shops & marketplace | ✅ |

### AR Suite
| Package | Purpose | Location |
|---------|---------|----------|
| `@hololand/ar-foundation` | Unified AR runtime bridge | [packages/ar/foundation](./packages/ar/foundation) |
| `@hololand/ar-tracking` | SLAM & Image tracking | [packages/ar/tracking](./packages/ar/tracking) |
| `@hololand/ar-anchors` | Geo-spatial persistence | [packages/ar/anchors](./packages/ar/anchors) |
| `@hololand/ar-detection` | Pose & object detection | [packages/ar/detection](./packages/ar/detection) |
| `@hololand/ar-renderer` | AR overlay rendering | [packages/ar/renderer](./packages/ar/renderer) |
| `@hololand/ar-mobile-companion` | Flutter + ARKit/ARCore | [packages/ar/mobile-companion](./packages/ar/mobile-companion) |

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

### Platform Adapters

| Package | Purpose | Location |
|---------|---------|----------|
| `@hololand/three-adapter` | Three.js 3D world + physics | [packages/adapters/three](./packages/adapters/three) |
| `@hololand/babylon-adapter` | Babylon.js integration | [packages/adapters/babylon](./packages/adapters/babylon) |
| `@hololand/playcanvas-adapter` | PlayCanvas 3D world | [packages/adapters/playcanvas](./packages/adapters/playcanvas) |
| `@hololand/unity-adapter` | Unity C#/XR export | Proprietary |
| `@hololand/vrchat-export` | VRChat/UdonSharp (alpha) | Proprietary |

See [full package list](./ECOSYSTEM_STATUS.md) for all 60+ packages.

## Runs On

- **VR**: Quest, Valve Index, Vive, Apple Vision Pro
- **Web**: Chrome, Firefox, Safari
- **AR**: iOS, Android (WebXR)
- **Desktop**: Windows, Mac, Linux

## HoloScript

HoloLand uses [HoloScript](https://github.com/brianonbased-dev/holoscript) as its source and runtime substrate.

### File Types

HoloScript provides **three specialized formats** for different domains:

| Extension | Domain | Best For |
|-----------|--------|----------|
| `.holo` | Scene Graph | Immersive worlds, environments, NPC dialogs, quests, networking |
| `.hs` | Core Language | Templates, agents, IoT streams, logic gates, spatial awareness |
| `.hsplus` | Typed systems | Full applications: modules, types, physics, state machines, async |

### `.holo` — Scene Graph
```holo
composition "My World" {
  environment {
    skybox: "sunset_4k"
    ambient_light: 0.6
  }

  spatial_group "MainArea" {
    object "WelcomeSign" {
      geometry: "plane"
      position: [0, 2, -3]
      text: "Welcome to HoloLand!"
    }
  }
}
```

### `.hs` — Core Language
```hs
// Reusable templates, agent AI, IoT streams
template "GuardAgent" {
  @agent { type: "guard" }
  @spatialAwareness { detection_radius: 15 }
  @patrol { waypoints: [[0,0,0], [10,0,0], [10,0,10]] }
}
```

### `.hsplus` — Typed Systems
```hsplus
// Full programming language with modules and types
module GameState {
  export let score: number = 0;
  export function addScore(points: number) {
    score += points;
    emit("score_changed", score);
  }
}
```

**Use `.holo`** for world compositions and scene layout.
**Use `.hs`** for reusable templates, agents, and utilities.
**Use `.hsplus`** for complex game systems and typed application logic.

See [HoloScript File Types Guide](./docs/HOLOSCRIPT_FILE_TYPES.md) for complete documentation.

## AI Agents

AI can see and build inside Hololand *(perception coming soon)*:

Agents should enter through HoloScript-authored capabilities, world receipts,
and runtime permissions. Direct TypeScript agent bridge code remains migration
debt until the equivalent behavior is owned by HoloScript source/runtime tools.

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
- **`@holoscript/cli`**: Parse and validate `.holo`, `.hs`, and `.hsplus` files.
- **VS Code Extension**: Full syntax support for all three formats.

### Content Workflow
1. Write `.holo` scenes, `.hs` templates/agents, and `.hsplus` modules in VS Code.
2. Use `HoloScriptLoader` to hot-reload content in Hololand.
3. Test interactions in VR mode.

## Contributing

[Elastic License 2.0](./LICENSE). PRs welcome.

1. Fork → Branch → Commit → PR
2. Add HoloScript source for product behavior.
3. Do not add hand-authored `.ts` or `.tsx` without an explicit migration exception.
4. Add tests for new features.

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
- [Full Ecosystem](./ECOSYSTEM_STATUS.md) - All 60+ packages

### Resources
- [HoloScript](https://github.com/brianonbased-dev/holoscript) - The language
- [Infinity Assistant](https://infinityassistant.io) - AI building service
- [Examples](./examples/) - Working demos

---

**Built with ❤️ by the Hololand community**

*Where everyone can build in VR.*

---

**Last Updated**: March 1, 2026
