# 🎭 Hololand - HoloScript Programming Language

> **The first programming language designed for Virtual Reality environments**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()

## 🌟 Vision

**HoloScript** is a revolutionary programming language where code exists as spatial objects in 3D VR space. Unlike traditional text-based languages, HoloScript treats code as **interactive holograms** that developers manipulate with voice commands, hand gestures, and spatial reasoning.

### "Code is Architecture. Programming is Spatial Design."

## 🏗️ Monorepo Structure

```
hololand/
├── packages/
│   ├── core/          # @hololand/core - Core HoloScript engine
│   └── react/         # @hololand/react - React components (future)
├── docs/              # Documentation and language spec
└── examples/          # Example HoloScript programs
```

## 📦 Packages

### @hololand/core

The core HoloScript engine with no UI dependencies:
- **Parser**: Converts voice commands & gestures to AST
- **Runtime**: Executes HoloScript programs with spatial computation
- **Security**: Built-in security patterns and runtime limits

```bash
pnpm add @hololand/core
```

## 🚀 Quick Start

```typescript
import { HoloScriptParser, HoloScriptRuntime } from '@hololand/core';

// Create HoloScript environment
const parser = new HoloScriptParser();
const runtime = new HoloScriptRuntime();

// Parse voice command
const nodes = parser.parseVoiceCommand({
  command: 'create orb greeting',
  confidence: 0.9,
  timestamp: Date.now()
});

// Execute
const results = await runtime.executeProgram(nodes);
```

## 🎯 Features

- **Spatial Programming**: Code as 3D holograms
- **Multi-Modal Input**: Voice + Gesture + Spatial
- **VR-Native**: Designed for WebXR, Oculus, HTC Vive, Apple Vision Pro
- **AI Integration**: Built-in AI assistance
- **Secure**: Runtime limits and input sanitization
- **Type-Safe**: Full TypeScript support

## 📖 Documentation

See [HOLOSCRIPT_LANGUAGE_SPEC.md](./docs/HOLOSCRIPT_LANGUAGE_SPEC.md) for the complete language specification.

## 🔧 Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## 🌐 Platform Support

- ✅ WebXR
- ✅ Oculus Quest
- ✅ HTC Vive
- ✅ Valve Index
- ✅ Apple Vision Pro
- ✅ Windows Mixed Reality

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🤝 Contributing

We're preparing to open source this project! Contributing guidelines coming soon.

## 🚧 Status

**Alpha**: Core engine complete, preparing for public release.

---

**HoloScript: Where Code Becomes Reality** ✨🌟
