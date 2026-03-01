# Hololand Packages

All packages in this directory are licensed under **Elastic License 2.0** - source-available, build freely.

## Available Packages

### Platform Core (`platform/`)
- **[@hololand/core](./platform/core)** - Core VR/AR engine and runtime
- **[@hololand/renderer](./platform/renderer)** - WebGL/WebGPU rendering engine
- **[@hololand/world](./platform/world)** - World building and management utilities
- **[@hololand/network](./platform/network)** - Multiplayer + CRDT state sync + WebRTC
- **[@hololand/audio](./platform/audio)** - 3D sound + lip sync
- **[@hololand/animation](./platform/animation)** - Skeletal animation + IK solvers
- **[@hololand/social](./platform/social)** - Friends, avatars, chat
- **[@hololand/auth](./platform/auth)** - Authentication (email, OAuth, Web3)
- **[@hololand/ui](./platform/ui)** - UI components for VR/AR
- **[@hololand/spatial](./platform/spatial)** - Spatial computing
- **[@hololand/haptics](./platform/haptics)** - Haptic feedback
- **[@hololand/navigation](./platform/navigation)** - Pathfinding, flow fields
- **[@hololand/pcg](./platform/pcg)** - Procedural generation
- **[@hololand/portals](./platform/portals)** - VR portals, teleportation
- **[@hololand/accessibility](./platform/accessibility)** - W3C XR accessibility
- **[@hololand/lod](./platform/lod)** - Level of Detail, culling
- **[@hololand/voice](./platform/voice)** - Speech recognition + TTS
- **[@hololand/gestures](./platform/gestures)** - Hand/body gesture recognition
- **[@hololand/streaming](./platform/streaming)** - Asset streaming, caching
- **[@hololand/holofilter](./platform/holofilter)** - VRR scanning + AR filters
- **[@hololand/agents](./platform/agents)** - AI agent framework
- **[@hololand/library](./platform/library)** - Asset library
- **[@hololand/logger](./platform/logger)** - Error tracking
- **[@hololand/commerce](./platform/commerce)** - E-commerce integration

### Adapters (`adapters/`)
- **[@hololand/react-three](./adapters/react-three)** - React bindings for Three.js
- **[@hololand/three-adapter](./adapters/three)** - Three.js 3D world + physics
- **[@hololand/babylon-adapter](./adapters/babylon)** - Babylon.js integration
- **[@hololand/playcanvas-adapter](./adapters/playcanvas)** - PlayCanvas 3D world

### AR Suite (`ar/`)
- **[@hololand/ar-foundation](./ar/foundation)** - Unified AR runtime bridge
- **[@hololand/ar-detection](./ar/detection)** - Surface and object detection
- **[@hololand/ar-tracking](./ar/tracking)** - Face, hands, body tracking
- **[@hololand/ar-anchors](./ar/anchors)** - World anchoring
- **[@hololand/ar-renderer](./ar/renderer)** - AR overlay rendering
- **[@hololand/ar-embeddings](./ar/embeddings)** - AR vector embeddings
- **[@hololand/ar-mobile-companion](./ar/mobile-companion)** - Flutter + ARKit/ARCore

### Brittney AI (`brittney/`)
- **[@hololand/brittney-service](./brittney/service)** - AI world builder
- **[@hololand/brittney-toolkit](./brittney/toolkit)** - Self-modification tools
- **[@hololand/brittney-models](./brittney/models)** - Model definitions
- **[@hololand/mcp-server](./brittney/mcp-server)** - Model Context Protocol
- **[@hololand/ai-bridge](./brittney/ai-bridge)** - AI agent integration
- **[@hololand/iot-digital-twins](./brittney/iot-digital-twins)** - IoT digital twin generation

### Developer Tools (`devtools/`)
- **[@hololand/builder](./devtools/builder)** - Visual world builder
- **[@hololand/creator-tools](./devtools/creator-tools)** - Visual editors
- **[@hololand/devtools-extension](./devtools/extension)** - Browser extension

### Standalone
- **[@hololand/traits](./traits)** - 60+ VR/AR trait system
- **[@hololand/components](./components)** - Shared components
- **[@hololand/playground](./playground)** - Browser IDE + Monaco Editor

## License

All packages are licensed under **Elastic License 2.0**. You are free to:

- Use commercially
- Modify and distribute
- Build applications with these packages
- Build competing platforms

Just don't offer the packages themselves as a hosted service. See [LICENSE](../LICENSE) for full details.

## Installation

```bash
# Install individual packages
npm install @hololand/react-three @hololand/world @hololand/renderer three

# Or for AI-powered building
npm install @hololand/ai-bridge
```

## Contributing

We welcome contributions to all packages! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

All contributions are made under the Elastic License 2.0.

## Questions?

- [GitHub Discussions](https://github.com/brianonbased-dev/Hololand/discussions)
- [Discord Community](https://discord.gg/hololand)
- [Documentation](https://hololand.io/docs)

---

**Elastic License 2.0** - See [LICENSE](../LICENSE) for full text.
