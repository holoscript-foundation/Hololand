# Hololand Examples

Welcome to the Hololand examples! These examples demonstrate different ways to build VR experiences using Hololand.

## 🎯 Examples Overview

| Example | Difficulty | Time | What You'll Learn |
|---------|-----------|------|-------------------|
| [holoscript-studio](./holoscript-studio) | ⭐ Featured | 10 min | **Build full apps in 3D** - Backend logic + Frontend UI |
| [01-hello-vr-world](./01-hello-vr-world) | Beginner | 5 min | Basic 3D scene, VR mode, HoloScript intro |
| [02-physics-playground](./02-physics-playground) | Beginner | 10 min | Physics simulation, collisions |
| [03-vr-shop](./03-vr-shop) | Intermediate | 15 min | Commerce features, inventory |
| [04-react-starter](./04-react-starter) | Intermediate | 10 min | React components, hooks |
| [08-progressive-vr](./08-progressive-vr) | Advanced | 15 min | Desktop to VR progressive enhancement |

## ⭐ Start Here: HoloScript Studio

**The flagship demo!** Build complete applications using visual 3D blocks:

1. **Backend Mode** - Add Variables, Functions, Conditionals, API Calls
2. **Frontend Mode** - Add Headers, Buttons, Cards, Navigation
3. **Live Preview** - See your app render in real-time (phone/tablet)
4. **Generated Code** - View the JavaScript/JSX that powers your app

```bash
cd holoscript-studio
python -m http.server 8080
# Visit http://localhost:8080
```

## 🚀 Quick Start

### Option 1: No Build Required

For examples **01** and **02**, simply open `index.html` in your browser!

```bash
cd 01-hello-vr-world
open index.html  # or double-click the file
```

### Option 2: Local Development Server

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Then visit http://localhost:8000
```

### Option 3: React App

For example **04**, use npm/pnpm:

```bash
cd 04-react-starter
npm install
npm run dev
```

## 📚 Learning Path

### Complete Beginner?

Start here: **01-hello-vr-world**

Learn:
- How to create a basic 3D scene
- How to enable VR mode
- How to add lights and shadows
- How to control the camera

### Want Physics?

Next: **02-physics-playground**

Learn:
- Gravity simulation
- Collision detection
- Object spawning
- Interactive controls

### Building Applications?

Check out: **04-react-starter**

Learn:
- React components for VR
- React hooks (useHololandObject, usePhysics)
- Event-driven architecture
- State management in VR

### Building Commerce?

Advanced: **03-vr-shop**

Learn:
- Shop creation
- Inventory management
- Transaction processing
- Commerce features

## 🥽 VR Support

All examples work with:
- 🎮 **Desktop** - Mouse and keyboard controls
- 🥽 **VR Headsets** - Meta Quest, Valve Index, HTC Vive, Windows MR
- 📱 **Mobile VR** - Compatible browsers (experimental)

## 🎨 Example Features

### 01 - Hello VR World

**What's Included:**
- Colorful "HELLO VR" text made from 3D boxes
- Floating animated sphere
- Ground plane with shadows
- Ambient and directional lighting
- OrbitControls for navigation
- Instant VR mode

**Perfect For:**
- First-time VR developers
- Learning Three.js basics
- Understanding WebXR
- Quick prototyping

### 02 - Physics Playground

**What's Included:**
- Real-time physics simulation
- Interactive object spawning
- Gravity, friction, and restitution
- Collision detection
- Multiple object types (spheres, boxes, cylinders)
- Physics controls (pause/play)

**Perfect For:**
- Game developers
- Learning physics engines
- Interactive VR experiences
- Prototyping gameplay mechanics

### 03 - VR Shop

**What's Included:**
- Complete VR shop structure
- Inventory management system
- Transaction processing
- Product display areas
- Shop statistics dashboard
- Revenue tracking

**Perfect For:**
- E-commerce in VR
- Virtual showrooms
- Marketplace applications
- Learning @hololand/commerce

### 04 - React Starter

**What's Included:**
- Full React + TypeScript setup
- Declarative VR components
- React hooks for VR
- Event handling
- State management
- Vite development server
- Hot module replacement

**Perfect For:**
- React developers
- Production applications
- Team collaboration
- Scalable VR apps

## 🔧 Technologies Used

### Core Technologies

- **Three.js** - 3D graphics rendering
- **WebXR** - VR device support
- **React** - UI framework (example 04)
- **TypeScript** - Type safety (example 04)
- **Vite** - Build tool (example 04)

### Hololand Packages

- `@hololand/world` - VR world runtime with physics
- `@hololand/renderer` - Three.js renderer with WebXR
- `@hololand/react-three` - React components (example 04)
- `@hololand/commerce` - Commerce features (example 03)
- `@hololand/social` - Social features (future examples)

## 💡 Tips & Best Practices

### Performance

- **Limit Object Count** - Keep under 100 objects for best performance
- **Shadow Quality** - Lower shadow map size if needed (1024 vs 2048)
- **Physics Tick Rate** - Default 60 FPS is good for most cases
- **Geometry Complexity** - Use simple shapes when possible

### VR Development

- **Test on Desktop First** - Faster iteration
- **Use HTTPS** - Required for WebXR (or localhost)
- **Camera Position** - Place user at comfortable height (1.6m)
- **UI Scale** - Make UI elements larger for VR (1.5-2x)

### Code Organization

- **Component Reusability** - Extract common VR objects into components
- **Event Handling** - Use world events instead of polling
- **State Management** - Keep VR state separate from UI state
- **Type Safety** - Use TypeScript for large projects

## 🆘 Common Issues

### VR Button Doesn't Appear

**Solution:**
- Use HTTPS or localhost
- Try Chrome or Edge (best WebXR support)
- Check if WebXR is supported: `navigator.xr`

### Objects Fall Through Ground

**Solution:**
- Ensure ground has `receiveShadow: true`
- Check ground position is at y: 0
- Verify physics is enabled

### Performance Issues

**Solution:**
- Reduce object count
- Lower shadow map size
- Disable antialiasing
- Reduce tick rate

### Module Not Found

**Solution:**
- Ensure packages are installed: `npm install`
- Build packages: `cd ../../packages/renderer && npm run build`
- Clear cache: `rm -rf node_modules && npm install`

## 📖 Further Learning

### Documentation

- [Main README](../README.md) - Project overview
- [Package Docs](../packages/) - Individual package documentation
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute

### External Resources

- [Three.js Journey](https://threejs-journey.com/) - Comprehensive Three.js course
- [WebXR Samples](https://immersive-web.github.io/webxr-samples/) - WebXR examples
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) - Similar React approach

## 🤝 Contributing Examples

Have a cool example? We'd love to include it!

### Creating an Example

1. Create a new directory: `examples/05-your-example`
2. Include:
   - Working code
   - Comprehensive README.md
   - Clear comments
   - Screenshots or GIFs
3. Focus on one concept
4. Keep it simple and understandable

### Example Template

```
examples/XX-your-example/
├── README.md           # Comprehensive guide
├── index.html          # Entry point
├── package.json        # Dependencies (if needed)
├── src/                # Source files
└── assets/             # Images, models, etc.
```

## 🎯 Example Roadmap

### Coming Soon

- [ ] 05-multiplayer-basics - Real-time collaboration
- [ ] 06-voice-commands - AI-powered building
- [ ] 07-spatial-audio - 3D sound positioning
- [x] 08-progressive-vr - Desktop to VR upgrade (Phase 4)
- [ ] 09-hand-tracking - VR controller support
- [ ] 10-advanced-physics - Character controllers

### Community Examples

Check [GitHub Discussions](https://github.com/brianonbased-dev/Hololand/discussions) for community-contributed examples!

## 📊 Example Statistics

- **Total Examples**: 5
- **Lines of Code**: ~3,000+
- **Difficulty Levels**: Beginner to Advanced
- **Technologies**: Vanilla JS, React, TypeScript
- **Total Documentation**: 1,500+ lines

## 🌟 Featured Examples

### Most Beginner-Friendly

**01-hello-vr-world** - Perfect starting point!

### Most Comprehensive

**04-react-starter** - Production-ready template

### Most Interactive

**02-physics-playground** - Engaging physics demo

### Most Practical

**03-vr-shop** - Real-world commerce application

## 📞 Need Help?

- **GitHub Issues** - [Report bugs](https://github.com/brianonbased-dev/Hololand/issues)
- **Discussions** - [Ask questions](https://github.com/brianonbased-dev/Hololand/discussions)
- **Documentation** - [Read the docs](../README.md)

---

**Happy Building!** 🥽✨

*Start with example 01 and work your way through. Each example builds on concepts from the previous one.*
