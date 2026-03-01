# Hololand Ecosystem

**Everything you need to build VR/AR experiences.**

*Last Updated: March 1, 2026*

---

## All Packages

### Core (The Essentials)

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/core](./packages/platform/core) | The brain - runs HoloScript code | Ready |
| [@hololand/ai-bridge](./packages/brittney/ai-bridge) | Talk to AI, get VR code | Ready |
| [@hololand/world](./packages/platform/world) | Physics, gravity, collisions | Ready |
| [@hololand/renderer](./packages/platform/renderer) | Draws 3D graphics | Ready |
| [@hololand/react-three](./packages/adapters/react-three) | React components for VR | Ready |

### Features

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/network](./packages/platform/network) | Multiplayer + CRDT state sync + WebRTC | Ready |
| [@hololand/audio](./packages/platform/audio) | 3D sound + lip sync + avatar embodiment | Ready |
| [@hololand/animation](./packages/platform/animation) | Skeletal animation + IK solvers + emotion directives | Ready |
| [@hololand/haptics](./packages/platform/haptics) | Haptic feedback for controllers and wearables | Ready |
| [@hololand/navigation](./packages/platform/navigation) | Pathfinding, flow fields, crowd simulation | Ready |
| [@hololand/pcg](./packages/platform/pcg) | Procedural generation - noise, terrain, dungeons, WFC | Ready |
| [@hololand/portals](./packages/platform/portals) | VR portals, teleportation, scene transitions | Ready |
| [@hololand/accessibility](./packages/platform/accessibility) | W3C XR accessibility, screen readers, motor | Ready |
| [@hololand/lod](./packages/platform/lod) | Level of Detail, frustum/occlusion culling | Ready |
| [@hololand/voice](./packages/platform/voice) | Speech recognition (STT) and text-to-speech (TTS) | Ready |
| [@hololand/gestures](./packages/platform/gestures) | Hand/body gesture recognition, emotion detection | Ready |
| [@hololand/streaming](./packages/platform/streaming) | Asset streaming, caching, predictive preloading | Ready |
| [@hololand/social](./packages/platform/social) | Friends and avatars | Ready |
| @hololand/commerce | Shops and payments | Proprietary |
| [@hololand/agents](./packages/platform/agents) | AI agent framework | Ready |
| [@hololand/three-plains](./packages/platform/three-plains) | Three.js plain rendering | Ready |

### AR Suite

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/holofilter](./packages/platform/holofilter) | VRR scanning + AR filters | Ready |
| [@hololand/ar-foundation](./packages/ar/foundation) | Unified AR runtime bridge | Ready |
| [@hololand/ar-detection](./packages/ar/detection) | Find surfaces and objects | Ready |
| [@hololand/ar-tracking](./packages/ar/tracking) | Track face, hands, body | Ready |
| [@hololand/ar-anchors](./packages/ar/anchors) | Pin things to real world | Ready |
| [@hololand/ar-renderer](./packages/ar/renderer) | Draw AR overlays | Ready |
| [@hololand/ar-embeddings](./packages/ar/embeddings) | AR vector embeddings | Ready |
| [@hololand/ar-hooks](./packages/ar/hooks) | AR React hooks | Ready |
| [@hololand/ar-mobile-companion](./packages/ar/mobile-companion) | Flutter + ARKit/ARCore mobile AR | Ready |
| [@hololand/ar-volumetric-bridge](./packages/ar/volumetric-bridge) | Volumetric capture bridge | Ready |

### Platform Adapters

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/babylon-adapter](./packages/adapters/babylon) | Babylon.js 3D world | Ready |
| [@hololand/three-adapter](./packages/adapters/three) | Three.js 3D world + physics | Ready |
| [@hololand/playcanvas-adapter](./packages/adapters/playcanvas) | PlayCanvas 3D world | Ready |
| @hololand/unity-adapter | Unity C# + XR export | Proprietary |
| @hololand/vrchat-export | VRChat/UdonSharp export | Proprietary |

### AI and Brittney

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/brittney-service](./packages/brittney/service) | AI world builder | Ready |
| [@hololand/brittney-toolkit](./packages/brittney/toolkit) | Self-modification tools | Ready |
| [@hololand/brittney-models](./packages/brittney/models) | Brittney model definitions | Ready |
| [@hololand/mcp-server](./packages/brittney/mcp-server) | Model Context Protocol | Ready |
| [@hololand/inference](./packages/shared/inference) | Unified AI - Local (Ollama) + BYOK Cloud | Ready |
| [@hololand/iot-digital-twins](./packages/brittney/iot-digital-twins) | IoT digital twin generation | Ready |
| [@hololand/brittney-cloud-api](./packages/brittney-cloud-api) | Cloud API for Brittney | Ready |

### Infrastructure

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/auth](./packages/platform/auth) | Login and accounts | Ready |
| [@hololand/ui](./packages/platform/ui) | Buttons, forms, menus | Ready |
| [@hololand/shared-ui](./packages/shared/ui) | Shared UI component library | Ready |
| [@hololand/logger](./packages/platform/logger) | Error tracking | Ready |
| [@hololand/spatial](./packages/platform/spatial) | Spatial computing | Ready |
| [@hololand/library](./packages/platform/library) | Asset library | Ready |
| @hololand/backend | API server | Proprietary |

### Developer Tools

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/builder](./packages/devtools/builder) | Visual world builder | Ready |
| [@hololand/creator-tools](./packages/devtools/creator-tools) | Visual editors | Ready |
| [@hololand/devtools-extension](./packages/devtools/extension) | Browser extension | Ready |
| [@hololand/video-tutorials](./packages/devtools/video-tutorials) | Tutorial system | Ready |

### Standalone Packages

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@hololand/traits](./packages/traits) | 60+ VR/AR trait system | Ready |
| [@hololand/components](./packages/components) | Shared components | Ready |
| [@hololand/playground](./packages/playground) | Browser IDE + Monaco Editor | Ready |
| [@hololand/base-token-viz](./packages/base-token-viz) | Token visualization | Ready |
| [@hololand/spatial-builder](./packages/spatial-builder) | Spatial building tools | Ready |
| [@hololand/trait-marketplace](./packages/trait-marketplace) | Trait marketplace | Ready |

### HoloScript Language (External Repo)

> **Note:** HoloScript is maintained in a [separate repository](https://github.com/brianonbased-dev/HoloScript) for better modularity.

**Current Version:** v3.43.0 (Production-Ready)

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [@holoscript/core](https://github.com/brianonbased-dev/HoloScript) | Parser, runtime, type-checker, debugger | v3.43.0 |
| [@holoscript/runtime](https://github.com/brianonbased-dev/HoloScript) | Execution engine with R3F integration | v3.1.1 |
| [@holoscript/cli](https://github.com/brianonbased-dev/HoloScript) | Command line tools and compilation | v3.6.0 |
| [@holoscript/compiler](https://github.com/brianonbased-dev/HoloScript) | Cross-platform compilation (20+ targets) | v3.43.0 |
| [@holoscript/formatter](https://github.com/brianonbased-dev/HoloScript) | Code formatting | v3.2.0 |
| [@holoscript/linter](https://github.com/brianonbased-dev/HoloScript) | Static analysis and linting | v3.2.0 |
| [@holoscript/lsp](https://github.com/brianonbased-dev/HoloScript) | Language Server Protocol | v3.2.0 |
| [@holoscript/sdk](https://github.com/brianonbased-dev/HoloScript) | SDK for building HoloScript tools | v3.6.0 |
| [@holoscript/collaboration](https://github.com/brianonbased-dev/HoloScript) | CRDT collaborative editing | v3.4.0 |
| [@holoscript/self-improvement](https://github.com/brianonbased-dev/HoloScript) | Auto-correction pipeline | v3.4.0 |
| [@holoscript/components](https://github.com/brianonbased-dev/HoloScript) | 25 reusable .holo templates | v3.4.0 |
| [@holoscript/std](https://github.com/brianonbased-dev/HoloScript) | Standard library | v3.4.0 |
| [@holoscript/fs](https://github.com/brianonbased-dev/HoloScript) | File system utils | v3.4.0 |
| [@holoscript/network](https://github.com/brianonbased-dev/HoloScript) | Multiplayer sync | v3.4.0 |
| [@holoscript/benchmark](https://github.com/brianonbased-dev/HoloScript) | Performance benchmarking | v3.4.0 |

**Compiler Targets (20+):** Unity, Unreal, Godot, Babylon.js, R3F, PlayCanvas, VRChat, WebGPU, WASM, OpenXR, VisionOS, iOS, Android, Robotics (ROS2, MoveIt, Gazebo), Medical (HL7 FHIR, DICOM), IoT (MQTT, OPC-UA)

### Apps and Examples

| Package | What It Does | Status |
| ------- | ------------ | ------ |
| [hololand-central](./examples/hololand-central) | Public VR gateway hub | Ready |
| [oasis](./examples/oasis) | Social VR experience | Ready |
| + 16 more examples | Demos and templates | Ready |

---

## What You Can Build

### Right Now

- **VR Worlds** - 3D spaces with physics (Quest, Valve Index, Vive)
- **Web Apps** - Same code works on desktop browsers
- **AR Experiences** - Overlay digital on real world (phones)
- **Multiplayer** - Real-time with friends
- **Shops** - Sell virtual items
- **Social Spaces** - Avatars, chat, presence
- **IoT Digital Twins** - Smart home device visualization
- **Mobile AR** - Flutter + ARKit/ARCore companion apps

### Coming Soon

- **VRR Scanning** - Turn real objects into VR assets
- **Face Filters** - Snapchat-style AR filters
- **Voice Building** - "Create a castle" and castle appears
- **AI Companions** - NPCs that actually understand you

---

## How It Fits Together

```text
Your App
   |
   +-- @hololand/react-three <-- React components
   |      |
   |      +-- @hololand/renderer <-- Draws graphics
   |      +-- @hololand/world <-- Physics engine
   |             |
   |             +-- @hololand/core <-- HoloScript brain
   |
   +-- @hololand/ai-bridge <-- Natural language
   |
   +-- @hololand/holofilter <-- VRR + AR
          |
          +-- @hololand/ar-detection
          +-- @hololand/ar-tracking
```

---

## Related Services

| Service | For Who | What It Does |
| ------- | ------- | ------------ |
| [Infinity Assistant](https://infinityassistant.io) | Everyone | AI that builds VR for you |
| uaa2-service | Developers | Agent orchestration |

---

## Quick Stats

- **60 packages** in Hololand platform repo (public)
- **4 packages** proprietary (available via enterprise license)
- **47+ packages** in HoloScript language repo (language tools only)
- **18 examples** with working demos
- **All building**
- **All tested**
- **TypeScript** 100%
- **Elastic License 2.0** - source-available, build freely

### Repo Structure (March 2026)

| Repo | Purpose | Packages |
| ---- | ------- | -------- |
| **Hololand** | VR/AR platform, adapters, Brittney AI | 60 (open) + 4 (proprietary) |
| **HoloScript** | Language, parser, dev tools | 47+ (language-only) |

## Getting Started

### Quick Start with React (Recommended)

```bash
# 1. Install packages
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
      </HololandCanvas>
    </div>
  );
}
```

---

## Get Started

```bash
# Install the essentials
npm install @hololand/react-three @hololand/world @hololand/renderer three

# Or for AI-powered building
npm install @hololand/ai-bridge
```

See [README.md](./README.md) for full examples.

---

## Version History

| Date | What Changed |
| ---- | ------------ |
| Mar 1, 2026 | **Documentation audit** - Fixed package counts, paths, license references |
| Feb 28, 2026 | **Adaptive Platform Layers** - Mobile AR, WebXR preview, Robotics AR |
| Jan 22, 2026 | **Repo reorganization** - HoloScript now separate repo, adapters consolidated |
| Jan 19, 2026 | Added HoloFilter (VRR + AR) |
| Jan 18, 2026 | Fixed all build issues |
| Jan 15, 2026 | Phase 2 complete |
| Jan 13, 2026 | Universal 2D/3D rendering |

---

**Questions?** Open an issue or visit [infinityassistant.io](https://infinityassistant.io)
