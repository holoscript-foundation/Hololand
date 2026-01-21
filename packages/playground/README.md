# HoloScript Playground

**What is this?** An interactive editor for building 3D worlds. Write code on the left, see it render on the right, chat with AI for help.

<p align="center">
  <img src="../../docs/assets/gifs/playground-demo.gif" alt="HoloScript Playground - live coding a 3D scene" width="650">
  <br>
  <em>Type HoloScript → See it render instantly</em>
</p>

---

## 📁 File Types

**Which file type should I use?**

- **`.holo`** → You're learning or building something simple
- **`.hsplus`** → You need multiplayer, physics joints, or advanced features

> 📖 See [HOLOSCRIPT_FILE_TYPES.md](../../docs/HOLOSCRIPT_FILE_TYPES.md) for details.

---

## 🎯 Features

### Editor

- **Monaco Editor Integration** - Professional code editor with syntax highlighting, auto-completion, and error visualization
- **HoloScript Language Support** - Custom language definition with keyword highlighting, hover documentation, and code snippets
- **Real-time Validation** - Instant syntax checking with detailed error messages
- **Smart Completions** - Context-aware auto-completion for HoloScript keywords and properties

### Preview

- **Live 3D Rendering** - Three.js-powered real-time visualization of HoloScript worlds
- **Hot Reload** - See changes instantly as you type (< 100ms iteration)
- **Performance Metrics** - FPS, frame time, draw calls, and memory monitoring
- **Object Inspector** - Click on objects to inspect and edit properties

### AI Assistant

- **Brittney AI** - Chat-based code generation and assistance
- **Smart Suggestions** - Generate HoloScript boilerplate for common patterns
- **Error Fixing** - AI-powered error detection and fixes
- **Code Optimization** - Performance and readability improvements

### Error Handling

- **Comprehensive Reporting** - Syntax, runtime, and warning messages with precise line numbers
- **Visual Feedback** - Inline error markers in editor and dedicated error panel
- **Stack Traces** - Detailed debugging information for runtime errors
- **Quick Fixes** - Suggested resolutions for common issues

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Using the Playground

1. **Write Code** - Use the editor on the left to write HoloScript
2. **Preview** - See your 3D world render in real-time on the right
3. **Chat with Brittney** - Ask for code generation or debugging help
4. **Check Errors** - View detailed error messages in the error panel
5. **Save & Deploy** - Save your code and deploy to Hololand

## 📝 Example Code

```holoscript
world MyFirstWorld {
  object cube {
    position: [0, 0, 0]
    rotation: [0, 0, 0]
    scale: [1, 1, 1]
    
    trait Material {
      color: 0x00ff00
      metalness: 0.5
      roughness: 0.5
    }
    
    behavior Rotate {
      speed: 2.0
    }
  }
}
```

## 🏗️ Architecture

```
src/
├── components/        # React components
│   ├── MonacoEditor   # Code editor
│   ├── PreviewPanel   # 3D preview
│   ├── BrittneyChat   # AI assistant
│   ├── ErrorVisualizer # Error reporting
│   └── TopBar         # Navigation bar
├── services/          # Business logic
│   ├── HoloScriptService    # Compiler & validation
│   ├── PreviewService       # 3D rendering
│   └── AIService            # AI integration
├── hooks/             # Zustand store
│   └── usePlaygroundStore   # State management
├── types/             # TypeScript definitions
│   └── playground.ts        # Type definitions
└── styles/            # CSS & styling
    ├── globals.css    # Global styles
    └── editor.css     # Editor-specific styles
```

## 🛠️ Key Technologies

- **React 18.2** - UI framework
- **Vite 5.0** - Build tool with HMR
- **TypeScript 5.0** - Type-safe development
- **Monaco Editor 0.50** - Professional code editor
- **Three.js r160** - 3D rendering engine
- **React Three Fiber 8.15** - React renderer for Three.js
- **Zustand 4.4** - State management
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Brittney Toolkit** - AI code generation

## 📊 Performance Targets

- **Startup Time**: < 3 seconds
- **Iteration Time**: < 100ms (edit → see change)
- **FPS**: 60fps at 1080p with 100+ objects
- **Memory**: < 200MB for typical worlds

## 🎓 Learning Resources

- **[HoloScript Documentation](../docs/HOLOSCRIPT_LANGUAGE_SPEC.md)** - Language reference
- **[Integration Guide](../docs/HOLOSCRIPT_INTEGRATION_GUIDE.md)** - How Playground integrates with Hololand
- **[Architecture Decisions](../docs/ARCHITECTURE_DECISIONS.md)** - Design patterns and decisions

## 🐛 Debugging

### Enable Debug Logging
```javascript
localStorage.setItem('debug', 'playground:*');
```

### Performance Profiling
Use the Metrics panel (top-right) to monitor:
- FPS - Frames per second
- Frame Time - Time to render one frame
- Objects - Number of objects in scene
- Memory - JS heap usage

### Monaco Editor Shortcuts
- `Ctrl+/` - Toggle comment
- `Ctrl+Shift+K` - Delete line
- `Alt+Up/Down` - Move line
- `Ctrl+H` - Find and replace
- `Ctrl+Space` - Trigger suggestions

## 📦 Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "immer": "^10.0.0",
    "monaco-editor": "^0.50.0",
    "three": "r160",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.100.0",
    "tailwindcss": "^3.4.0"
  }
}
```

## 🔄 Development Workflow

```bash
# 1. Start dev server with HMR
pnpm dev

# 2. Open http://localhost:5173

# 3. Make changes - they'll reload instantly

# 4. Test in browser DevTools

# 5. Build when ready
pnpm build

# 6. Preview production build
pnpm preview
```

## 📈 Roadmap

### Week 1
- ✅ Monaco editor integration
- ✅ HoloScript syntax highlighting
- ✅ Live Three.js preview
- ✅ Error visualization
- 🔄 Hot reload optimization

### Week 2
- 🔄 Brittney AI integration
- 🔄 Code generation templates
- 🔄 Performance optimization
- 🔄 Mobile responsive design
- 🔄 Documentation

### Future
- [ ] Multiplayer collaboration
- [ ] Asset library browser
- [ ] Performance profiler
- [ ] Animation timeline
- [ ] Networking debugger
- [ ] VR/AR preview
- [ ] Export to Hololand

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📄 License

See [LICENSE](../../LICENSE) for license information.

## 🆘 Getting Help

- **Documentation**: Check the [docs folder](../docs/)
- **Issues**: [GitHub Issues](https://github.com/hololand/Hololand/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hololand/Hololand/discussions)
- **Chat**: Discord (link in README)

---

**Made with ❤️ by the Hololand team**
