# 🥽 Hololand - Build the Metaverse Together

> **An open-source VR/AR metaverse platform where developers and creators build together using natural language, code, or voice commands**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

![Hololand Banner - VR Metaverse Platform]()

## 🌟 Vision

**Hololand** is building the open metaverse - a **Ready Player One-style world** intersecting VR and AR. We're creating a universal platform with **Three Plains of Reality**:

### 🌌 The Three Plains

| Plain | Description | Location-Bound? |
|-------|-------------|-----------------|
| **🌌 Hololand** | Pure VR world - the OASIS | ❌ Accessible anywhere |
| **🥽 VR Real World** | Digital twin of Earth in VR | ✅ GPS-anchored |
| **📱 AR Real World** | Augmented overlay on reality | ✅ GPS-anchored |

**[Read Full Three Plains Architecture →](docs/archive/HOLOLAND_HUB_AND_AR.md)**

### Build With Any Method

- 🎨 **Natural Language**: "Create a coffee shop with a counter"
- 🗣️ **Voice Commands**: Build in VR by speaking
- ⚛️ **React Components**: Familiar declarative patterns
- 💻 **HoloScript Code**: Spatial programming language
- 🤖 **AI Assistance**: Built-in AI translation and optimization

### Deploy Everywhere

- 🥽 **VR Headsets**: Quest, Valve Index, Vive (WebXR)
- 📱 **Mobile**: iOS and Android (AR support)
- 💻 **Desktop**: Windows, Mac, Linux
- 🕶️ **Future-Ready**: Prepared for uaa2 VR glasses

### **"Where Everyone Can Build in VR - And Beyond"** ✨

*Hololand is an open-source project. We believe the holoverse should be built by everyone, for everyone.*

## 📜 Licensing - Hybrid Open Source Model

Hololand uses a **hybrid licensing approach** to balance developer freedom with sustainable business:

| Component | License | Use Freely | Commercial Hosting |
|-----------|---------|------------|-------------------|
| **Core Packages** (`@hololand/*`) | MIT | ✅ Unlimited | ✅ Unlimited |
| **HoloScript Language** | MIT | ✅ Unlimited | ✅ Unlimited |
| **Platform Code** (Central, Themes) | Elastic 2.0 | ✅ Internal Use | ❌ Requires License |
| **Official Hosting** (central.hololand.io) | Proprietary | N/A | 💰 Paid Service |

**In Short:**
- ✅ Build anything with core packages - zero restrictions
- ✅ Self-host for your company/community - completely free
- ❌ Offer "Hololand as a Service" - requires commercial license

**[Read Full Licensing Details →](LICENSING.md)**

## 🎯 Key Features

- **🥽 WebXR VR Support** - Works with Quest, Valve Index, Vive, and all WebXR headsets
- **⚛️ React Components** - Build VR worlds with JSX (`<HololandObject type="sphere" />`)
- **🎨 Real-time 3D Rendering** - Three.js powered with physics simulation
- **🤖 AI-Powered Building** - Natural language → working VR code
- **🏪 Built-in Commerce** - Create and manage VR shops with inventory
- **👥 Social Features** - Avatars, presence tracking, and multiplayer (coming soon)
- **🎮 Physics Engine** - Gravity, collisions, friction, and realistic interactions
- **📦 Zero Dependencies** - Core packages have no external dependencies
- **🔒 TypeScript** - 100% type coverage for excellent DX

## 📦 Packages

Hololand is a monorepo containing 12 packages for building metaverse experiences across all devices:

### Core Packages

| Package | Size | Description |
|---------|------|-------------|
| [@hololand/core](./packages/core) | 28 KB | HoloScript language engine |
| [@hololand/ai-bridge](./packages/ai-bridge) | 42 KB | Natural language → HoloScript translation |
| [@hololand/world](./packages/world) | 28 KB | VR world runtime with physics |

### Rendering Stack

| Package | Size | Description |
|---------|------|-------------|
| [@hololand/renderer](./packages/renderer) | 10 KB | Universal renderer (VR, desktop, mobile) |
| [@hololand/react-three](./packages/react-three) | 7 KB | React components & hooks for 3D |
| [@hololand/ui](./packages/ui) | 8 KB | 2D UI components for desktop/mobile 🆕 |

### Networking & Social

| Package | Size | Description |
|---------|------|-------------|
| [@hololand/network](./packages/network) | 15 KB | Real-time multiplayer networking 🆕 |
| [@hololand/social](./packages/social) | 12 KB | Friends, parties, emotes, notifications v2.0 🆕 |

### Feature Packages

| Package | Size | Description |
|---------|------|-------------|
| [@hololand/commerce](./packages/commerce) | 10 KB | Shops & marketplace systems |
| [@hololand/builder](./packages/builder) | 2 KB | Visual tools & templates |

### Infrastructure Packages

| Package | Size | Description |
|---------|------|-------------|
| [@hololand/auth](./packages/auth) | 4 KB | Authentication & wallet integration |
| [@hololand/mcp-server](./packages/mcp-server) | 3 KB | MCP server for AI tool integration |

> **🚀 Phase 3 Complete**: Real-time multiplayer with @hololand/network and @hololand/social v2.0. See [ROADMAP.md](./ROADMAP.md)

## 🚀 Quick Start

### Option 1: React (Recommended for Web Developers)

```bash
npm install @hololand/react-three @hololand/world @hololand/renderer three react
```

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <HololandCanvas
        worldConfig={{ enablePhysics: true }}
        rendererConfig={{ enableVR: true, enableShadows: true }}
      >
        {/* Ground */}
        <HololandObject
          type="plane"
          position={{ x: 0, y: 0, z: 0 }}
          rotation={{ x: -Math.PI / 2, y: 0, z: 0, w: 1 }}
          metadata={{ width: 50, height: 50, color: 0x808080 }}
        />

        {/* Bouncing ball with physics */}
        <HololandObject
          type="sphere"
          position={{ x: 0, y: 5, z: 0 }}
          metadata={{ radius: 1, color: 0xff0000 }}
          physics={{ enabled: true, mass: 1, restitution: 0.7 }}
        />
      </HololandCanvas>
    </div>
  );
}
```

### Option 2: Vanilla JavaScript

```bash
npm install @hololand/renderer @hololand/world three
```

```typescript
import { HololandWorld } from '@hololand/world';
import { HololandRenderer } from '@hololand/renderer';

// Create world
const world = new HololandWorld({
  name: 'my-world',
  enablePhysics: true,
});

// Create renderer
const canvas = document.getElementById('canvas');
const renderer = new HololandRenderer(canvas, world, {
  enableVR: true,
  enableShadows: true,
});

// Add objects
world.addObject({
  type: 'sphere',
  position: { x: 0, y: 5, z: 0 },
  metadata: { radius: 1, color: 0xff0000 },
  physics: { enabled: true, mass: 1, restitution: 0.7 },
});

// Start
world.start();
renderer.start();
```

### Option 3: Natural Language (AI-Powered)

```bash
npm install @hololand/ai-bridge @hololand/world @hololand/renderer
```

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';
import { HololandWorld } from '@hololand/world';

const bridge = new HololandAIBridge();
const world = new HololandWorld({ enablePhysics: true });

// Build with natural language
const result = await bridge.translateToHoloScript({
  naturalLanguage: "create a coffee shop with a counter and menu board"
});

// Execute the generated code
const shop = world.addObject(result.generatedCode);
```

## 🎓 Examples

**📚 [View Complete Examples →](./examples/)**

Get started quickly with our complete working examples:

- **[01-hello-vr-world](./examples/01-hello-vr-world/)** - Your first VR scene (no build required!)
- **[02-physics-playground](./examples/02-physics-playground/)** - Interactive physics simulation
- **[03-vr-shop](./examples/03-vr-shop/)** - Complete virtual store with commerce
- **[04-react-starter](./examples/04-react-starter/)** - Production-ready React template
- **[05-desktop-app](./examples/05-desktop-app/)** - Standard desktop application
- **[06-mobile-app](./examples/06-mobile-app/)** - Mobile-optimized interface
- **[07-hybrid-world](./examples/07-hybrid-world/)** - 2D UI controlling 3D VR world
- **[08-progressive-vr](./examples/08-progressive-vr/)** - Starts 2D, upgrades to VR
- **[09-multiplayer-lobby](./examples/09-multiplayer-lobby/)** - Join rooms and see avatars 🆕
- **[10-collaborative-building](./examples/10-collaborative-building/)** - Build together in real-time 🆕
- **[11-social-hub](./examples/11-social-hub/)** - Complete social features demo 🆕

Each example includes complete source code and comprehensive documentation. Start with `01-hello-vr-world` if you're new to VR development!

**[📋 Project Templates →](./docs/archive/TEMPLATES.md)** - Copy-paste starter templates for common use cases

### Create a VR Shop

```tsx
<HololandCanvas>
  {/* Shop building */}
  <HololandObject
    type="box"
    position={{ x: 0, y: 2, z: 0 }}
    metadata={{ width: 10, height: 4, depth: 8, color: 0x8b4513 }}
  />

  {/* Counter */}
  <HololandObject
    type="box"
    position={{ x: 0, y: 1, z: 3 }}
    metadata={{ width: 6, height: 1, depth: 2, color: 0x654321 }}
  />

  {/* Menu board */}
  <HololandObject
    type="plane"
    position={{ x: 0, y: 3, z: -3.9 }}
    metadata={{ width: 4, height: 2, color: 0x000000 }}
  />
</HololandCanvas>
```

### Physics Playground

```tsx
import { useHololandObject } from '@hololand/react-three';

function SpawnButton() {
  const addObject = useHololandObject();

  const spawnBall = () => {
    addObject({
      type: 'sphere',
      position: { x: 0, y: 10, z: 0 },
      metadata: {
        radius: Math.random() + 0.5,
        color: Math.random() * 0xffffff
      },
      physics: { enabled: true, mass: 1, restitution: 0.8 }
    });
  };

  return <button onClick={spawnBall}>Spawn Ball</button>;
}
```

### Voice Commands (In VR)

```typescript
import { HololandAIBridge } from '@hololand/ai-bridge';

const bridge = new HololandAIBridge({ enableVoice: true });

// User says: "create a store"
const audioBuffer = await captureVoiceInput();
const result = await bridge.processVoiceCommand(audioBuffer);

if (result.holoScript) {
  world.addObject(result.holoScript);
}
```

## 🏗️ Architecture

```
Hololand Metaverse Ecosystem
│
├── Core Packages
│   ├── @hololand/core           # HoloScript language engine
│   ├── @hololand/ai-bridge      # Natural language AI translation
│   └── @hololand/world          # VR world runtime & physics
│
├── 3D Rendering Stack
│   ├── @hololand/renderer       # Three.js renderer with WebXR
│   └── @hololand/react-three    # React components & hooks
│
├── Feature Packages
│   ├── @hololand/commerce       # Shops & marketplace
│   ├── @hololand/social         # Avatars & presence
│   └── @hololand/builder        # Visual tools & templates
│
└── Service Integrations
    ├── uaa2-service             # Builder's Workshop (for devs)
    └── infinityassistant         # Normie's Companion (for everyone)
```

## 📚 Documentation

- **[Ecosystem Status](./ECOSYSTEM_STATUS.md)** - Complete ecosystem overview
- **[Session Complete](./SESSION_COMPLETE_2026-01-12.md)** - Initial development summary
- **[3D Upgrade Complete](./3D_UPGRADE_COMPLETE_2026-01-12.md)** - 3D rendering implementation
- **[HoloScript Language Spec](./docs/HOLOSCRIPT_LANGUAGE_SPEC.md)** - Language specification

### Package Documentation

- [@hololand/core](./packages/core/README.md) - HoloScript engine
- [@hololand/ai-bridge](./packages/ai-bridge/README.md) - Natural language translation
- [@hololand/world](./packages/world/README.md) - VR world & physics
- [@hololand/renderer](./packages/renderer/README.md) - Three.js rendering
- [@hololand/react-three](./packages/react-three/README.md) - React components
- [@hololand/commerce](./packages/commerce/README.md) - Commerce systems
- [@hololand/social](./packages/social/README.md) - Social features
- [@hololand/builder](./packages/builder/README.md) - Visual tools

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Build specific package
cd packages/renderer
pnpm build
```

## 🌐 Browser & VR Headset Support

### Desktop Browsers
- ✅ Chrome/Edge (Chromium) - Recommended
- ✅ Firefox
- ✅ Safari (iOS 15+)

### VR Headsets (WebXR)
- ✅ Meta Quest 2/3/Pro
- ✅ Valve Index
- ✅ HTC Vive / Vive Pro
- ✅ Windows Mixed Reality
- ✅ Any WebXR-compatible device

## 🎨 What You Can Build

### 1. **VR Shops & Marketplaces**
Create virtual stores with inventory management, transactions, and revenue tracking.

### 2. **Social Spaces**
Build meeting rooms, art galleries, and collaborative workspaces with avatars and presence.

### 3. **Physics Games**
Create interactive VR games with realistic physics, collisions, and gravity.

### 4. **Educational Environments**
Design virtual classrooms, museums, and training simulations.

### 5. **Creative Tools**
Build VR sculpting tools, 3D modeling environments, and collaborative art spaces.

## 🤝 Contributing

We welcome contributions from everyone! Here's how you can help:

### Ways to Contribute

1. **Code Contributions**
   - Fix bugs
   - Add features
   - Improve documentation
   - Write tests

2. **Create Examples**
   - Build demo VR worlds
   - Create tutorials
   - Share your Hololand projects

3. **Report Issues**
   - Bug reports
   - Feature requests
   - Documentation improvements

4. **Community**
   - Help others in discussions
   - Share your knowledge
   - Spread the word

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Keep commits atomic and well-described
- Use conventional commit messages

## 🗺️ Roadmap

**📋 [View Full Roadmap →](./ROADMAP.md)** - Complete vision for the open metaverse

### Phase 1: Foundation ✅ (Complete - Q4 2025)

- ✅ HoloScript language core with voice support
- ✅ AI bridge for natural language translation
- ✅ VR world runtime with physics simulation
- ✅ 3D rendering with Three.js and WebXR
- ✅ React component library with hooks
- ✅ Commerce & social systems

### Phase 2: Universal Rendering ✅ (Q1 2026)

- [x] **2D rendering mode** for desktop/mobile apps
- [x] **Hybrid mode** - 2D UI + 3D worlds
- [x] **@hololand/ui** - 2D component library
- [x] **AR support** - Mobile augmented reality
- [x] **Progressive enhancement** - Upgrade from 2D → VR

### Phase 3: Network & Multiplayer ✅ (Q1 2026)

- [x] Real-time networking (@hololand/network)
- [x] Multi-user collaboration and shared worlds
- [x] Voice chat and spatial audio
- [x] Avatar synchronization
- [x] Room system with permissions
- [x] @hololand/social v2.0 - Friends, parties, emotes, notifications

### Phase 4: Advanced Features 🔮 (Q4 2026)

- [ ] Spatial audio system (@hololand/audio)
- [ ] Animation system with IK
- [ ] Custom shaders & post-processing
- [ ] Unified authentication (@hololand/auth)
- [ ] Developer tools and profiler

### Phase 5: Ecosystem 🌐 (2027)

- [ ] Asset marketplace with revenue sharing
- [ ] Hololand Cloud hosting platform
- [ ] Metaverse client app (desktop & mobile)
- [ ] Creator tools and visual editor
- [ ] World discovery and distribution

### Phase 6: Hardware Integration 🥽 (2028+)

- [ ] **uaa2 VR glasses** native support
- [ ] Standalone VR apps (no browser)
- [ ] Eye tracking and foveated rendering
- [ ] Hand tracking and haptics
- [ ] Neural interface (long-term vision)

### Phase 7: The Open Metaverse 🌌 (2029+)

- [ ] Millions of concurrent users
- [ ] Seamless world portals
- [ ] Cross-platform interoperability
- [ ] AI-generated infinite worlds
- [ ] Real-world integration (digital twins)

**The vision: A Ready Player One OASIS, built by everyone, for everyone.**

## 📊 Project Stats

- **Total Packages**: 12 (all stable)
- **Total Lines of Code**: ~15,000+
- **Combined Build Size**: ~165 KB (minified)
- **TypeScript Coverage**: 100%
- **Documentation**: 7,000+ lines
- **Examples**: 11 working demos

## 🏆 Use Cases

### For Developers
- Build VR applications with React
- Create physics-based games
- Develop metaverse platforms
- Prototype VR experiences
- Learn WebXR development

### For Creators
- Build VR shops without coding
- Design social spaces
- Create art galleries
- Prototype ideas with voice commands
- Collaborate in VR

### For Businesses
- Virtual showrooms
- Training simulations
- Remote collaboration spaces
- Product demonstrations
- Virtual events

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

### What This Means
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ⚠️ Liability and warranty limitations

## 🙏 Acknowledgments

- Built with [Three.js](https://threejs.org/) for 3D rendering
- Powered by [React](https://react.dev/) for component architecture
- TypeScript for type safety
- WebXR for VR support
- Open source community ❤️

## 🌟 Star History

If you find Hololand useful, please consider giving it a star ⭐ on GitHub!

## 📞 Community & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/brianonbased-dev/Hololand/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/brianonbased-dev/Hololand/discussions)
- **Documentation**: [Read the full docs](./ECOSYSTEM_STATUS.md)
- **Examples**: [Browse examples](./packages/)

## 🚀 Quick Links

- [Documentation](./ECOSYSTEM_STATUS.md)
- [Contributing Guide](#-contributing)
- [Roadmap](#️-roadmap)
- [License](./LICENSE)
- [Changelog](./CHANGELOG.md) (coming soon)

---

**Built with ❤️ by the Hololand community**

**Co-Authored-By**: uAA2++, infinityassistant.io Team & $BRIAN On Based

---

### 🎯 "Where Everyone Can Build in VR" 🥽✨

*Hololand is an open-source project. We believe the holoverse should be built by everyone, for everyone.*
