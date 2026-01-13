# Hololand Core Packages

All packages in this directory are licensed under **MIT License** - completely free and open source with no restrictions.

## Available Packages

### Core Engine
- **[@hololand/core](./core)** - Core VR/AR engine and runtime
- **[@hololand/renderer](./renderer)** - WebGL/WebGPU rendering engine
- **[@hololand/world](./world)** - World building and management utilities

### React Integration
- **[@hololand/react-three](./react-three)** - React bindings for Three.js and Hololand

### Features
- **[@hololand/auth](./auth)** - Authentication utilities (email, OAuth, Web3)
- **[@hololand/builder](./builder)** - Visual world builder tools
- **[@hololand/commerce](./commerce)** - E-commerce and payment integration
- **[@hololand/social](./social)** - Social features (chat, presence, avatars)
- **[@hololand/ai-bridge](./ai-bridge)** - AI agent integration
- **[@hololand/ui](./ui)** - UI components for VR/AR experiences

## License

All packages are licensed under **MIT License**. You are free to:

✅ Use commercially without restrictions
✅ Modify and distribute
✅ Include in proprietary software
✅ Sublicense
✅ Sell applications built with these packages
✅ Build competing platforms

No attribution required (though appreciated!).

## Installation

```bash
# Install individual packages
npm install @hololand/core
npm install @hololand/renderer
npm install @hololand/react-three

# Or install all at once
npm install @hololand/core @hololand/renderer @hololand/world @hololand/react-three
```

## Usage

```typescript
import { World } from '@hololand/core';
import { WebGLRenderer } from '@hololand/renderer';
import { Canvas } from '@hololand/react-three';

// Build your VR experience
const world = new World();
world.initialize();
```

## Documentation

- [Getting Started](../docs/getting-started.md)
- [API Reference](../docs/api-reference.md)
- [Examples](../examples)
- [HoloScript Guide](../docs/holoscript.md)

## Contributing

We welcome contributions to all packages! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

All contributions are made under the MIT License.

## Questions?

- [GitHub Discussions](https://github.com/brianonbased-dev/Hololand/discussions)
- [Discord Community](https://discord.gg/hololand)
- [Documentation](https://hololand.io/docs)

---

**MIT License** - See [LICENSE](../LICENSE) for full text.
