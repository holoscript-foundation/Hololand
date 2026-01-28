# Hololand Ecosystem

**Everything you need to build VR/AR experiences.**

*Last Updated: January 27, 2026*

---

## 📦 All Packages

### Core (The Essentials)

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/core](./packages/core) | The brain - runs HoloScript code | ✅ Ready |
| [@hololand/ai-bridge](./packages/ai-bridge) | Talk to AI → get VR code | ✅ Ready |
| [@hololand/world](./packages/world) | Physics, gravity, collisions | ✅ Ready |
| [@hololand/renderer](./packages/renderer) | Draws 3D graphics | ✅ Ready |
| [@hololand/react-three](./packages/react-three) | React components for VR | ✅ Ready |

### Features

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/builder](./packages/builder) | Drag-drop world creation | ✅ Ready |
| @hololand/commerce | Shops & payments | 🔒 Proprietary |
| [@hololand/social](./packages/social) | Friends & avatars | ✅ Ready |
| [@hololand/network](./packages/network) | Multiplayer + CRDT state sync + WebRTC | ✅ Ready |
| [@hololand/audio](./packages/audio) | 3D sound + lip sync + avatar embodiment pipeline | ✅ Ready |
| [@hololand/animation](./packages/animation) | Skeletal animation + IK solvers + emotion directives | ✅ Ready |
| [@hololand/haptics](./packages/platform/haptics) | Haptic feedback for controllers & wearables | ✅ NEW |
| [@hololand/navigation](./packages/platform/navigation) | Pathfinding, flow fields, crowd simulation | ✅ NEW |
| [@hololand/pcg](./packages/platform/pcg) | Procedural generation - noise, terrain, dungeons, WFC | ✅ NEW |
| [@hololand/portals](./packages/platform/portals) | VR portals, teleportation, scene transitions | ✅ NEW |
| [@hololand/accessibility](./packages/platform/accessibility) | W3C XR accessibility, screen readers, motor | ✅ NEW |
| [@hololand/lod](./packages/platform/lod) | Level of Detail, frustum/occlusion culling | ✅ NEW |
| [@hololand/voice](./packages/platform/voice) | Speech recognition (STT) and text-to-speech (TTS) | ✅ NEW |
| [@hololand/gestures](./packages/platform/gestures) | Hand/body gesture recognition, emotion detection | ✅ NEW |
| [@hololand/streaming](./packages/platform/streaming) | Asset streaming, caching, predictive preloading | ✅ NEW |

### AR/VRR (Reality Features)

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/holofilter](./packages/holofilter) | VRR scanning + AR filters | ✅ NEW |
| [@hololand/ar-detection](./packages/ar-detection) | Find surfaces & objects | ✅ Ready |
| [@hololand/ar-tracking](./packages/ar-tracking) | Track face, hands, body | ✅ Ready |
| [@hololand/ar-anchors](./packages/ar-anchors) | Pin things to real world | ✅ Ready |
| [@hololand/ar-renderer](./packages/ar-renderer) | Draw AR overlays | ✅ Ready |

### HoloScript Language (External Repo)

> **Note:** HoloScript is now maintained in a [separate repository](https://github.com/brianonbased-dev/HoloScript) for better modularity.

| Package | What It Does | Status |
|---------|--------------|--------|
| [@holoscript/core](https://github.com/brianonbased-dev/HoloScript) | Parser & runtime | ✅ v2.1.0 |
| [@holoscript/runtime](https://github.com/brianonbased-dev/HoloScript) | Execution engine | ✅ v2.1.0 |
| [@holoscript/cli](https://github.com/brianonbased-dev/HoloScript) | Command line tools | ✅ v2.1.0 |
| [@holoscript/formatter](https://github.com/brianonbased-dev/HoloScript) | Code formatting | ✅ v2.0.0 |
| [@holoscript/linter](https://github.com/brianonbased-dev/HoloScript) | Static analysis | ✅ v2.0.0 |
| [@holoscript/lsp](https://github.com/brianonbased-dev/HoloScript) | Language Server | ✅ v1.0.0 |
| [@holoscript/std](https://github.com/brianonbased-dev/HoloScript) | Standard library | ✅ Ready |
| [@holoscript/fs](https://github.com/brianonbased-dev/HoloScript) | File system utils | ✅ Ready |
| [@holoscript/network](https://github.com/brianonbased-dev/HoloScript) | Multiplayer sync | ✅ Ready |
| [@hololand/vscode-holoscript](./packages/vscode-holoscript) | VS Code Extension | ✅ Ready |

### Platform Adapters

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/babylon-adapter](./packages/babylon-adapter) | Babylon.js 3D world | ✅ Ready |
| [@hololand/three-adapter](./packages/three-adapter) | Three.js 3D world + physics | ✅ Ready |
| [@hololand/playcanvas-adapter](./packages/playcanvas-adapter) | PlayCanvas 3D world | ✅ Ready |
| @hololand/unity-adapter | Unity C# + XR export | 🔒 Proprietary |
| @hololand/vrchat-export | VRChat/UdonSharp export | 🔒 Proprietary |
| [@hololand/creator-tools](./packages/creator-tools) | Visual editors | ✅ Ready |

### AI & Brittney

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/brittney-service](./packages/brittney-service) | AI world builder | ✅ Ready |
| [@hololand/brittney-toolkit](./packages/brittney-toolkit) | Self-modification tools | ✅ Ready |
| [@hololand/mcp-server](./packages/mcp-server) | Model Context Protocol | ✅ Ready |

### Infrastructure

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/auth](./packages/auth) | Login & accounts | ✅ Ready |
| [@hololand/ui](./packages/ui) | Buttons, forms, menus | ✅ Ready |
| [@hololand/logger](./packages/logger) | Error tracking | ✅ Ready |
| [@hololand/devtools](./packages/devtools) | Debugging helpers | ✅ Ready |
| [@hololand/devtools-extension](./packages/devtools-extension) | Browser extension | ✅ Ready |
| [@hololand/spatial](./packages/spatial) | Spatial computing | ✅ Ready |
| [@hololand/library](./packages/library) | Asset library | ✅ Ready |
| [@hololand/ar-embeddings](./packages/ar-embeddings) | AR vector embeddings | ✅ Ready |

### Apps

| Package | What It Does | Status |
|---------|--------------|--------|
| [@hololand/frontend](./packages/frontend) | Web dashboard | ✅ Ready |
| @hololand/backend | API server | 🔒 Proprietary |
| [@hololand/playground](./packages/playground) | Browser IDE | ✅ Ready |

---

## 🎯 What You Can Build

### Right Now ✅

- **VR Worlds** - 3D spaces with physics (Quest, Valve Index, Vive)
- **Web Apps** - Same code works on desktop browsers
- **AR Experiences** - Overlay digital on real world (phones)
- **Multiplayer** - Real-time with friends
- **Shops** - Sell virtual items
- **Social Spaces** - Avatars, chat, presence

### Coming Soon 🔜

- **VRR Scanning** - Turn real objects into VR assets
- **Face Filters** - Snapchat-style AR filters
- **Voice Building** - "Create a castle" → castle appears
- **AI Companions** - NPCs that actually understand you

---

## 🏗️ How It Fits Together

```
Your App
   │
   ├── @hololand/react-three ← React components
   │      │
   │      ├── @hololand/renderer ← Draws graphics
   │      └── @hololand/world ← Physics engine
   │             │
   │             └── @hololand/core ← HoloScript brain
   │
   ├── @hololand/ai-bridge ← Natural language
   │
   └── @hololand/holofilter ← VRR + AR
          │
          ├── @hololand/ar-detection
          └── @hololand/ar-tracking
```

---

## 🔗 Related Services

| Service | For Who | What It Does |
|---------|---------|--------------|
| [Infinity Assistant](https://infinityassistant.io) | Everyone | AI that builds VR for you |
| uaa2-service | Developers | Agent orchestration |

---

## 📊 Quick Stats

- **43 packages** in Hololand platform repo (public)
- **4 packages** proprietary (available via enterprise license)
- **14 packages** in HoloScript language repo (language tools only)
- **All building** ✅
- **All tested** ✅
- **TypeScript** 100%
- **Elastic License 2.0** - source-available, build freely

### Repo Structure (January 2026)

| Repo | Purpose | Packages |
|------|---------|----------|
| **Hololand** | VR/AR platform, adapters, Brittney AI | 43 (open) + 4 (proprietary) |
| **HoloScript** | Language, parser, dev tools | 14 (language-only) |
   - "Create a coffee shop with a counter" → Full 3D scene
   - "Build a VR office with 4 desks" → Rendered in Three.js
   - "Add a meeting room to my workspace" → Live in VR

## 🎓 Getting Started

### Quick Start with React (Recommended) 🆕

```bash
# 1. Install packages
npm install @hololand/react-three @hololand/world @hololand/renderer three react

# 2. Create your first VR app
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
---

## 🚀 Get Started

```bash
# Install the essentials
npm install @hololand/react-three @hololand/world @hololand/renderer three

# Or for AI-powered building
npm install @hololand/ai-bridge
```

See [README.md](./README.md) for full examples.

---

## 📝 Version History

| Date | What Changed |
|------|--------------|
| Jan 22, 2026 | **Repo reorganization** - HoloScript now separate repo, adapters consolidated |
| Jan 19, 2026 | Added HoloFilter (VRR + AR) |
| Jan 18, 2026 | Fixed all build issues |
| Jan 15, 2026 | Phase 2 complete |
| Jan 13, 2026 | Universal 2D/3D rendering |

---

**Questions?** Open an issue or visit [infinityassistant.io](https://infinityassistant.io)
