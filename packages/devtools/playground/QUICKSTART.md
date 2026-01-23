# HoloScript Playground - Quick Start & Next Steps

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd packages/playground
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

The playground will open at `http://localhost:5173`

### 3. Start Coding!

```
1. Edit code in the left editor
2. See 3D preview update in real-time
3. Chat with Brittney for help
4. Fix any errors shown in error panel
```

## 📋 First Run Checklist

- [ ] Dependencies installed successfully
- [ ] Dev server running on port 5173
- [ ] Editor shows default HoloScript cube code
- [ ] Preview panel renders a green cube
- [ ] No errors in error panel
- [ ] Chat panel ready for interaction
- [ ] All panels visible and responsive

## 🎮 Try These Examples

### Example 1: Modify the Cube Color
```holoscript
world ColorfulWorld {
  object cube {
    position: [0, 0, 0]
    
    trait Material {
      color: 0xff0000    // Change to red
      metalness: 0.8     // More shiny
      roughness: 0.2     // Less rough
    }
  }
}
```

### Example 2: Create a Sphere
```holoscript
world SphereWorld {
  object sphere {
    position: [0, 2, 0]
    scale: [1.5, 1.5, 1.5]
    
    trait Material {
      color: 0x0080ff    // Blue
      metalness: 0.6
      roughness: 0.4
    }
  }
}
```

### Example 3: Load from Menu
Use the "Cube", "Sphere", or "Grid" buttons in the top bar to instantly load examples.

## 💬 Chat with Brittney

Try these prompts:
- "Create a spinning cube"
- "Add a platform below"
- "Generate a sphere with material"
- "Fix my code"
- "Explain HoloScript"
- "Optimize this code"

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save code |
| `Ctrl+Enter` | Compile & run |
| `Ctrl+/` | Toggle comment |
| `Ctrl+Shift+K` | Delete line |
| `Alt+↑` / `Alt+↓` | Move line |
| `Ctrl+H` | Find & replace |
| `Ctrl+Space` | Trigger completions |

## 🐛 Debugging Tips

### Check Browser Console
```javascript
// Open DevTools (F12) → Console
// Look for any errors
```

### Enable Debug Logging
```javascript
localStorage.setItem('debug', 'playground:*');
location.reload();
```

### Monitor Performance
- Watch the metrics in the preview panel
- Look for FPS drops or high frame times
- Check memory usage in DevTools

### Common Issues

**Issue**: "Module not found" error
- **Solution**: Run `pnpm install` again
- **Check**: All dependencies in package.json

**Issue**: Editor not rendering
- **Solution**: Check Monaco is loaded (browser DevTools)
- **Check**: No TypeScript errors in terminal

**Issue**: Preview not updating
- **Solution**: Check error panel for compilation errors
- **Check**: Try the "Compile" button manually

**Issue**: Chat not responding
- **Solution**: This is expected in Week 1 (mock responses)
- **Feature**: Real integration comes in Week 2

## 📈 Development Workflow

### Daily Development
```bash
# 1. Start dev server
pnpm dev

# 2. Make changes
# (they auto-reload)

# 3. Test in browser
# (preview updates instantly)

# 4. Check errors
# (error panel shows issues)

# 5. Iterate
# (< 100ms per cycle)
```

### Before Committing
```bash
# 1. Check for errors
pnpm type-check

# 2. Build for production
pnpm build

# 3. Preview build
pnpm preview

# 4. Commit changes
git add .
git commit -m "description"
```

## 📚 Next Features (Week 2)

### High Priority
- [ ] Real Brittney AI integration with brittney-toolkit
- [ ] Streaming responses from AI
- [ ] Code generation templates
- [ ] Performance profiler in preview
- [ ] Property inspector panel

### Medium Priority
- [ ] Animation timeline editor
- [ ] Material editor with live preview
- [ ] Physics simulation support
- [ ] Particle system
- [ ] Network synchronization

### Lower Priority
- [ ] Undo/redo system
- [ ] Version control integration
- [ ] Collaborative editing
- [ ] Custom shader editor
- [ ] Asset library browser

## 🧪 Testing the Build

```bash
# Build production bundle
pnpm build

# Preview the production build
pnpm preview

# Check bundle size
pnpm analyze  # (after npm install rollup-plugin-analyzer)
```

## 🔧 Customization Guide

### Change Editor Theme
Edit [src/components/MonacoEditor.tsx](src/components/MonacoEditor.tsx#L60):
```typescript
theme: 'vs-dark',  // Change to 'vs' for light theme
```

### Modify Preview Background
Edit [src/services/PreviewService.ts](src/services/PreviewService.ts#L30):
```typescript
this.scene.background = new THREE.Color(0x1a1a2e);  // Change hex color
```

### Adjust Default Code
Edit [src/hooks/usePlaygroundStore.ts](src/hooks/usePlaygroundStore.ts#L35):
```typescript
code: `world MyWorld { ... }`  // Change default code
```

### Change Layout Proportions
Edit [src/App.tsx](src/App.tsx#L30):
```jsx
<div className="flex-1 ...">  {/* Left panel size */}
<div className="w-1/2 ...">   {/* Right panel size */}
```

## 📞 Getting Help

### Documentation
- [README.md](README.md) - Feature overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical design
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What's built

### Code Comments
- Components have JSDoc comments
- Services explain each function
- Complex logic has inline comments

### External Resources
- [HoloScript Spec](../docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
- [Integration Guide](../docs/HOLOSCRIPT_INTEGRATION_GUIDE.md)
- [Hololand README](../../README.md)

## ✅ Project Status

**Current Phase**: Week 1 (80% Complete)

**What's Done**:
- ✅ Monaco editor integration
- ✅ HoloScript syntax highlighting
- ✅ Live Three.js preview
- ✅ Error visualization
- ✅ Brittney AI chat (mock responses)
- ✅ Hot reload & HMR
- ✅ Comprehensive documentation

**What's Next**:
- 🔄 Real Brittney toolkit integration
- 🔄 Streaming AI responses
- 🔄 Performance optimization
- 🔄 Production testing
- 🔄 Deployment pipeline

## 🚢 Deployment

### Staging Deployment
```bash
pnpm build
# Upload dist/ to staging server
# Test at https://playground-staging.hololand.app
```

### Production Deployment
```bash
pnpm build
# Run tests
pnpm test
# Upload dist/ to production
# Verify at https://playground.hololand.app
```

## 📊 Success Metrics

Track these during development:

### Performance
- **Build Time**: < 5 seconds (dev), < 30s (prod)
- **Startup Time**: < 3 seconds
- **Iteration Time**: < 100ms (edit → see change)
- **FPS**: 60 FPS with 100+ objects
- **Bundle Size**: < 2MB main, < 500KB per chunk

### User Experience
- **Time to First Visual**: < 2 seconds
- **Code Completion**: < 50ms
- **Error Display**: < 10ms
- **AI Response**: < 1 second (Week 2)

### Code Quality
- **Test Coverage**: > 80%
- **Type Safety**: 100% (TypeScript strict)
- **Accessibility**: WCAG AA compliant
- **Performance Audit**: Google Lighthouse > 90

## 🎯 Long-term Vision

The HoloScript Playground is the gateway to Hololand development. Future versions will include:

1. **Integrated Builder** - Drag-and-drop world creation
2. **Marketplace** - Share and discover worlds
3. **Collaboration** - Real-time co-editing
4. **Mobile App** - iOS/Android playground
5. **VR Preview** - Preview in actual VR headset
6. **Cloud Sync** - Auto-save and version control
7. **Deployment** - One-click publish to Hololand

## 🎓 Learning Path

1. Start: Run the playground, modify examples
2. Learn: Read HoloScript language spec
3. Build: Create your first world
4. Share: Upload to Hololand community
5. Integrate: Extend with custom traits
6. Master: Build complex interactive worlds

## 🙏 Contributing

Found a bug? Have a feature idea? See [CONTRIBUTING.md](../../CONTRIBUTING.md)

---

**Happy Coding! Let's build amazing worlds together.** 🚀

For questions, open an issue on [GitHub](https://github.com/hololand/Hololand/issues)
