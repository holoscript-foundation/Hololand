# Hololand

**Build VR/AR experiences in minutes, not months.**

<p align="center">
  <img src="https://img.shields.io/badge/🚀_January_2026-What's_New-00cc66?style=for-the-badge" alt="What's New">
  <a href="https://github.com/brianonbased-dev/HoloScript#-vrchat-alpha">
    <img src="https://img.shields.io/badge/🎮_VRChat_Export-Alpha-ff6600?style=for-the-badge" alt="VRChat Alpha">
  </a>
</p>

<p align="center">
  <img src="docs/assets/gifs/hololand-hero.gif" alt="Hololand in action - building a VR world with voice commands" width="700">
  <br>
  <em>"Create a floating island with waterfalls" → Built in seconds</em>
</p>

---

> 💬 **Talk or type to your AI assistant.** Powered by [Infinity Assistant](https://infinityassistant.io).
>
> - 🥽 **VR:** "Create a treehouse with a rope ladder and fairy lights"
> - 🌍 **VRR (Virtual Reality Reality):** "Scan my storefront and turn it into a virtual shop" *(coming soon)*
> - 📱 **AR:** "Show me how this couch looks in my room"

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

---

## 🚀 What's New (January 2026)

### 🎮 VRChat Export Alpha
HoloScript now exports directly to VRChat! Write `.hsplus`, get Udon. [Learn more →](https://github.com/brianonbased-dev/HoloScript#-vrchat-alpha)

### 🛠️ Developer Tools v2.0
- **Formatter** (`@hololand/holoscript-formatter`) - Auto-format your code
- **Linter** (`@hololand/holoscript-linter`) - Catch bugs before runtime
- **LSP** (`@hololand/holoscript-lsp`) - Full IDE support

### 🤖 Brittney AI Upgrades
- 403.7K training samples with weighted superpowers
- 97% loss improvement in code generation
- Ready for Vast.ai deployment

### 🎯 HoloScript+ Migration Complete
- All packages now use `.hsplus` as the standard
- 541 tests passing across the ecosystem
- Full monorepo build pipeline

---

## Why Hololand?

- **One codebase** → Web, VR headsets, AR, mobile, desktop
- **React components** → Build VR like you build web apps
- **Voice & AI** → "Create a coffee shop" and watch it appear
- **Physics included** → Gravity, collisions, interactions
- **Native NPCs** → Define characters & dialogs directly in `.hsplus` *(New)*
- **Source available** → Elastic License 2.0, build freely

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

**Getting Started with Brittney:**
- [IDE Integration Setup](./packages/mcp-server/BRITTNEY_SETUP.md) - Connect Copilot/Claude/Cursor to your running app
- [Fine-tuning Guide](./packages/brittney-service/training/STEP_BY_STEP_FINETUNE.md) - Train your own Brittney model
- [AI Package Index](./docs/BRITTNEY_AI_PACKAGE_INDEX.md) - Complete AI documentation

### 🛠️ Developer Tools
| Package | Version | Purpose |
|---------|---------|---------|
| `@hololand/holoscript-formatter` | 2.0.0 | Code formatting for .holo/.hsplus |
| `@hololand/holoscript-linter` | 2.0.0 | Static analysis & linting |
| `@hololand/holoscript-lsp` | 1.0.0 | Language server protocol |

See [full package list](./ECOSYSTEM_STATUS.md) for all 40+ packages.

## Runs On

- **VR**: Quest, Valve Index, Vive, Apple Vision Pro
- **Web**: Chrome, Firefox, Safari
- **AR**: iOS, Android (WebXR)
- **Desktop**: Windows, Mac, Linux

## HoloScript

Hololand uses [HoloScript](https://github.com/brianonbased-dev/HoloScript) - a declarative language that reduces codebase size by up to 90%.

### File Types

> ⚠️ **Note:** `.holo` is the legacy format for learning. All new projects should use **`.hsplus`**.

| Extension | What It's For | Status |
|-----------|---------------|--------|
| `.hsplus` | Production apps with all features | ✅ **Recommended** |
| `.holo` | Learning & simple apps | ⚠️ Legacy (still supported) |

### `.hsplus` - Full Power (Recommended)
```hsplus
// Production-ready with all 10 system APIs
import { NetworkedWorldState } from "./systems/NetworkedWorldState.hsplus"

networked_object player {
  sync_rate: 20hz
  interpolation: true
  position: synced
}
```

### `.holo` - Simple & Clean (Legacy)
```holo
// Great for learning and simple applications
cube my_cube {
  position: [0, 1, 0]
  color: "#ff0000"
  on_click: toggle_color
}
```

**Use `.hsplus`** for all new projects.  
**Use `.holo`** only for learning tutorials.

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

- [HoloScript](https://github.com/brianonbased-dev/HoloScript) - The language
- [Infinity Assistant](https://infinityassistant.io) - AI building service
- [Examples](./examples/) - Working demos
- [Full Docs](./ECOSYSTEM_STATUS.md) - Complete ecosystem

---

**Built with ❤️ by the Hololand community**

*Where everyone can build in VR.*
