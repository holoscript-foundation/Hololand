# 🌌 HoloScript

**Text → VR Code**

A spatial programming language that compiles to React Three Fiber components. Write immersive VR/AR experiences in plain text.

[![npm version](https://img.shields.io/npm/v/@holoscript/holoscript.svg)](https://www.npmjs.com/package/@holoscript/holoscript)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## ⚡ Quick Start

```bash
# Install globally
npm install -g @holoscript/holoscript

# Or use with npx
npx @holoscript/holoscript build myworld.hs
```

### Create your first VR scene

**myworld.hs:**
```holoscript
ZONE lobby {
  position: (0, 0, 0)
  
  ENTITY cube {
    position: (0, 1, 0)
    color: #00ffff
    size: 2
  }
  
  HANDLER ON_CLICK {
    cube.rotate(45)
  }
}
```

**Compile:**
```bash
holoscript build myworld.hs
```

**Output:** `myworld.tsx` ready to import in your Next.js/React project!

---

## 🎯 Features

✨ **Simple Syntax** - Spatial programming language designed for humans  
🚀 **Fast Compilation** - Compiles to optimized React Three Fiber components  
🔄 **Watch Mode** - Auto-recompile on file changes  
📦 **Zero Config** - Works out of the box  
🎨 **Type-Safe** - Full TypeScript support  
⚙️ **Optimizations** - Built-in code optimization and minification  
🔍 **Source Maps** - Debug with original HoloScript code  

---

## 📦 Installation

### Global (recommended for CLI use)

```bash
npm install -g @holoscript/holoscript
```

### Local (for programmatic use)

```bash
npm install @holoscript/holoscript
```

---

## 🛠️ CLI Usage

### Build Command

```bash
# Basic build
holoscript build input.hs

# Custom output path
holoscript build input.hs -o output.tsx

# Watch mode (auto-rebuild on changes)
holoscript build input.hs --watch

# Enable optimizations
holoscript build input.hs --optimize

# Generate source maps
holoscript build input.hs --source-maps

# Verbose output
holoscript build input.hs --verbose
```

### Compile Command (alias for build)

```bash
holoscript compile input.hs
```

### Help

```bash
holoscript --help
holoscript build --help
```

---

## 📖 Language Guide

### Zones (Worlds/Scenes)

```holoscript
ZONE myZone {
  position: (x, y, z)
  // Entities go here
}
```

### Entities (3D Objects)

```holoscript
ENTITY cube {
  position: (0, 1, 0)
  color: #ff0000
  size: 2
  rotation: (0, 45, 0)
}

ENTITY sphere {
  position: (5, 1, 0)
  color: #00ff00
  radius: 1.5
}
```

### Handlers (Interactivity)

```holoscript
HANDLER ON_CLICK {
  cube.rotate(45)
  sphere.changeColor(#0000ff)
}

HANDLER ON_HOVER {
  cube.scale(1.2)
}
```

---

## 💻 Programmatic API

### JavaScript/TypeScript

```typescript
import { Lexer, Parser, R3FCompiler } from '@holoscript/holoscript';

// Read HoloScript source
const source = `
  ZONE test {
    position: (0, 0, 0)
  }
`;

// Tokenize
const lexer = new Lexer(source);
const tokens = lexer.tokenize();

// Parse
const parser = new Parser(tokens);
const ast = parser.parse();

// Compile to React Three Fiber
const compiler = new R3FCompiler({
  target: 'react',
  optimize: true,
  sourceMaps: false,
});

const code = compiler.compile(ast);
console.log(code); // React Three Fiber component code
```

### Builder API

```typescript
import { HoloScriptBuilder } from '@holoscript/holoscript/cli/build';

const builder = new HoloScriptBuilder({
  input: 'myworld.hs',
  output: 'MyWorld.tsx',
  optimize: true,
  sourceMaps: true,
  verbose: false,
});

const result = await builder.build();

if (result.success) {
  console.log(`Built in ${result.duration}ms`);
  console.log(`Output: ${result.output}`);
  console.log(`Size: ${result.size} bytes`);
} else {
  console.error('Build failed:', result.errors);
}
```

---

## 🔗 Integration Examples

### Next.js 14+

```typescript
// app/worlds/MyWorld.tsx (generated from myworld.hs)
import { Canvas } from '@react-three/fiber';
import MyWorld from './MyWorld'; // Compiled HoloScript

export default function WorldPage() {
  return (
    <Canvas>
      <MyWorld />
    </Canvas>
  );
}
```

### Watch Mode in Development

```json
{
  "scripts": {
    "dev": "concurrently \"holoscript build worlds/*.hs --watch\" \"next dev\""
  }
}
```

### Build Pipeline

```json
{
  "scripts": {
    "prebuild": "holoscript build worlds/*.hs --optimize",
    "build": "next build"
  }
}
```

---

## 🎨 Examples

### Coffee Shop

```holoscript
ZONE coffeeShop {
  position: (0, 0, 0)
  
  ENTITY counter {
    position: (0, 1, -3)
    color: #8B4513
    size: (4, 1, 1)
  }
  
  ENTITY sign {
    position: (0, 3, -3)
    text: "Joe's Cafe"
    fontSize: 0.5
    color: #FFD700
  }
  
  HANDLER ON_CLICK {
    sign.glow(true)
  }
}
```

### Racing Track

```holoscript
ZONE racingTrack {
  position: (0, 0, 0)
  
  ENTITY track {
    position: (0, 0, 0)
    shape: "oval"
    width: 20
    length: 50
  }
  
  ENTITY startLine {
    position: (0, 0, 0)
    color: #00ff00
  }
  
  HANDLER ON_START {
    track.startRace()
  }
}
```

---

## 📊 Performance

- **Build Speed**: <100ms for single zone
- **Output Size**: 30-40% smaller with `--optimize`
- **Runtime**: Zero overhead (compiles to native R3F)

---

## 🛣️ Roadmap

- [x] Lexer & Parser
- [x] React Three Fiber compiler
- [x] CLI tool
- [x] Watch mode
- [x] Optimizations
- [x] Source maps
- [ ] LSP (Language Server Protocol)
- [ ] VS Code extension
- [ ] Syntax highlighting
- [ ] Auto-complete
- [ ] Physics support
- [ ] Animation system
- [ ] Multi-target compilation (A-Frame, Babylon.js)

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) first.

```bash
# Clone repo
git clone https://github.com/hololand/hololand
cd hololand/packages/holoscript

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

---

## 📄 License

MIT © [Hololand Team](https://hololand.io)

---

## 🔗 Links

- [Documentation](https://docs.hololand.io/holoscript)
- [Examples](../../examples)
- [Discord Community](https://discord.gg/hololand)
- [GitHub](https://github.com/hololand/hololand)

---

<p align="center">
  Made with ❤️ by the <a href="https://hololand.io">Hololand</a> team
</p>
