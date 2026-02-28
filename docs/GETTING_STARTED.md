# 🚀 Getting Started with Hololand

> **Build your first VR scene in 5 minutes**

Welcome to Hololand! This guide will take you from zero to your first immersive VR experience in just a few minutes.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Your First Scene](#first-scene)
4. [View in Browser](#view-browser)
5. [Deploy to VR](#deploy-vr)
6. [Next Steps](#next-steps)

---

## ✅ Prerequisites {#prerequisites}

Before you begin, make sure you have:

### Required

- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
- ✅ **pnpm** - Fast package manager
- ✅ **Git** - Version control
- ✅ **Code Editor** - VS Code recommended

### Optional (for VR deployment)

- 🥽 **VR Headset** - Quest, Vision Pro, etc.
- 📱 **Smartphone** - For AR experiences
- 🎮 **Game Engine** - Unity or Unreal (for native builds)

### Check Your Setup

```bash
# Check Node.js version (should be 18+)
node --version

# Install pnpm if you don't have it
npm install -g pnpm

# Verify pnpm installation
pnpm --version
```

---

## 📦 Installation {#installation}

### Option 1: Clone Full Repository (Recommended)

```bash
# Clone Hololand repository
git clone https://github.com/hololand/hololand.git
cd hololand

# Install all dependencies
pnpm install

# Build all packages
pnpm build

# This may take 2-3 minutes on first run
```

### Option 2: Install as NPM Package

```bash
# Create new project
mkdir my-vr-project
cd my-vr-project

# Initialize package.json
pnpm init

# Install Hololand packages
pnpm add @hololand/world @hololand/react-three

# Install development dependencies
pnpm add -D typescript vite @types/node
```

### Verify Installation

```bash
# Check that build completed successfully
ls packages/*/dist

# You should see compiled JavaScript files
```

---

## 🎨 Your First Scene {#first-scene}

### Step 1: Create a HoloScript File

Create a new file called `my-first-scene.holo`:

```holoscript
// @holoscript-version 3.4

composition "My First VR Scene" {
  // Add a floor
  object "Floor" {
    geometry: "plane"
    position: [0, 0, 0]
    scale: [10, 1, 10]
    material: {
      color: "#2C3E50"
      roughness: 0.8
    }
  }

  // Add a floating cube
  object "Cube" {
    @interactive @animated
    geometry: "box"
    position: [0, 1.5, 0]
    rotation: [0, 45, 0]
    material: {
      color: "#E74C3C"
      metalness: 0.5
      roughness: 0.2
    }

    // Rotate continuously
    animation "spin" {
      property: "rotation.y"
      from: 0
      to: 360
      duration: 3
      loop: true
      easing: "linear"
    }
  }

  // Add a light
  object "Main Light" {
    @light
    type: "point"
    position: [0, 5, 0]
    intensity: 1.0
    color: "#FFFFFF"
    castShadow: true
  }

  // Add ambient light
  object "Ambient" {
    @light
    type: "ambient"
    intensity: 0.3
    color: "#87CEEB"
  }
}
```

### Understanding the Code

Let's break down what each part does:

#### Composition
```holoscript
composition "My First VR Scene" {
  // Everything goes here
}
```
- The top-level container for your scene
- Can have multiple compositions in one file

#### Objects
```holoscript
object "Cube" {
  geometry: "box"      // Shape: box, sphere, plane, cylinder, etc.
  position: [0, 1, 0]  // [x, y, z] in meters
  rotation: [0, 45, 0] // [x, y, z] in degrees
  scale: [1, 1, 1]     // [x, y, z] scale factors
  material: { ... }    // Visual appearance
}
```

#### Traits
```holoscript
@interactive  // Can be clicked/grabbed
@animated     // Has animations
@light        // Is a light source
@networked    // Syncs across clients
@sensor       // IoT sensor data
```

#### Materials
```holoscript
material: {
  color: "#E74C3C"        // Hex color
  metalness: 0.5          // 0 = plastic, 1 = metal
  roughness: 0.2          // 0 = mirror, 1 = rough
  emissive: "#FF0000"     // Glow color
  emissiveIntensity: 1.0  // Glow strength
}
```

#### Animations
```holoscript
animation "spin" {
  property: "rotation.y"  // What to animate
  from: 0                 // Start value
  to: 360                 // End value
  duration: 3             // Seconds
  loop: true              // Repeat forever
  easing: "linear"        // Timing function
}
```

---

## 🌐 View in Browser {#view-browser}

### Option 1: Use Playground (Quickest)

```bash
# Navigate to playground package
cd packages/playground

# Start development server
pnpm dev

# Open browser (automatically opens at http://localhost:5173)
```

**Then:**
1. Click "Upload Scene" button
2. Select your `my-first-scene.holo` file
3. See your scene in 3D!

**Controls:**
- 🖱️ **Left Click + Drag** - Rotate camera
- 🖱️ **Right Click + Drag** - Pan camera
- 🖱️ **Scroll** - Zoom in/out
- 🖱️ **Click Cube** - Interact with @interactive objects

### Option 2: Compile to HTML

```bash
# Compile HoloScript to Three.js
pnpm holoscript compile my-first-scene.holo --target threejs --output output/

# Serve the generated files
cd output
python -m http.server 8000

# Open http://localhost:8000
```

### Option 3: React Integration

Create `App.tsx`:

```typescript
import { HololandScene } from '@hololand/react-three';
import { Canvas } from '@react-three/fiber';
import sceneData from './my-first-scene.holo?raw';

function App() {
  return (
    <Canvas>
      <HololandScene source={sceneData} />
    </Canvas>
  );
}

export default App;
```

Run React app:

```bash
pnpm dev
```

---

## 🥽 Deploy to VR {#deploy-vr}

### For Meta Quest

```bash
# Compile for Quest
pnpm holoscript compile my-first-scene.holo --target quest --output quest-build/

# The output includes:
# - Android APK
# - OBB data files
# - Installation instructions
```

**Install on Quest:**
1. Enable Developer Mode on your Quest
2. Connect Quest to PC via USB-C
3. Run: `adb install quest-build/app.apk`
4. Find app in "Unknown Sources" on Quest

### For Apple Vision Pro

```bash
# Compile for Vision Pro
pnpm holoscript compile my-first-scene.holo --target visionpro --output visionpro-build/

# The output includes:
# - Xcode project
# - Swift code
# - Reality Composer assets
```

**Build in Xcode:**
1. Open `visionpro-build/HololandApp.xcodeproj`
2. Select Vision Pro target
3. Click Run (or Archive for distribution)

### For WebXR (Any VR Headset)

```bash
# Compile for WebXR
pnpm holoscript compile my-first-scene.holo --target webxr --output webxr-build/

# Deploy to static host (Vercel, Netlify, etc.)
cd webxr-build
vercel --prod
```

**Use on any VR headset:**
1. Open the deployed URL on your VR browser
2. Click "Enter VR" button
3. Experience your scene in VR!

### For Unity

```bash
# Compile for Unity
pnpm holoscript compile my-first-scene.holo --target unity --output unity-build/

# Open Unity:
# 1. Create new 3D project
# 2. Import generated C# scripts
# 3. Drag SceneManager.cs to empty GameObject
# 4. Press Play
```

---

## 🎯 Next Steps {#next-steps}

### 1. **Learn More HoloScript**

Explore the full language capabilities:

- **[HoloScript Language Spec](HOLOSCRIPT_LANGUAGE_SPEC.md)** - Complete syntax reference
- **[HoloScript+ Advanced](HSPLUS_LANGUAGE_SPEC.md)** - Extended features
- **[Language Comparison](HOLOSCRIPT_LANGUAGE_COMPARISON.md)** - vs Unity/Unreal

### 2. **Try Example Scenes**

We have 50+ example scenes to learn from:

```bash
# Browse examples
ls examples/

# Run an example
cd packages/playground
pnpm dev
# Upload any example from examples/ folder
```

**Popular examples:**
- `examples/battle-arena.holo` - Multiplayer game
- `examples/solar-system.holo` - Planetary simulation
- `examples/art-gallery.holo` - Virtual gallery
- `examples/physics-playground.holo` - Interactive physics

**[→ See All Examples](HOLOSCRIPT_SECTOR_EXAMPLES.md)**

### 3. **Build with IoT**

Transform real-world devices into VR:

```bash
# Run the IoT demo
cd packages/brittney/iot-digital-twins/demo
node smart-home-showcase.mjs
```

**[→ IoT Digital Twins Guide](IOT_DIGITAL_TWINS_SHOWCASE.md)**

### 4. **Add Multiplayer**

Make your scene multiplayer:

```holoscript
composition "Multiplayer Scene" {
  state {
    @networked
    players: []
    chatMessages: []
  }

  object "Player Avatar" {
    @networked @avatar
    geometry: "capsule"
    // Automatically syncs position/rotation
  }
}
```

**[→ Multiplayer Guide](ARCHITECTURE_DECISIONS.md#networking)**

### 5. **Use Brittney AI**

Let AI help you build:

```bash
# Start Brittney MCP server
cd packages/mcp-server
node dist/index.js

# Use in Claude Desktop or Code
# Ask: "Create a VR art gallery with 5 paintings"
```

**Available AI Tools:**
- `brittney_iot_generate_holoscript` - Generate from IoT devices
- `brittney_scene_analyze` - Analyze performance
- `brittney_scene_optimize` - Optimize for platform
- `brittney_iot_mqtt_connect` - Connect to devices

**[→ Brittney Documentation](BRITTNEY_SYSTEM_REFERENCE.md)**

### 6. **Deploy Your App**

Ship your VR experience to users:

- **[Browser Deployment](DEPLOYMENT_BROWSER.md)** - Netlify, Vercel
- **[Desktop Apps](DEPLOYMENT_TAURI.md)** - Windows, Mac, Linux
- **[Mobile Apps](DEPLOYMENT_MOBILE.md)** - iOS, Android
- **[Cloud Sync](DEPLOYMENT_CLOUD_SYNC.md)** - Multiplayer backend

---

## 💡 Quick Tips

### Performance Optimization

```holoscript
// Use lower polygon geometries
geometry: "box"  // Good (12 faces)
geometry: "icosphere"  // Okay (80 faces)
geometry: "sphere"  // Fine (800 faces)

// Limit object count
// Browser: ~1000 objects
// Mobile: ~500 objects
// Quest: ~800 objects

// Use instancing for repeated objects
object "Tree" {
  @instanced
  instances: [
    { position: [0, 0, 0] },
    { position: [5, 0, 0] },
    { position: [10, 0, 0] }
  ]
}
```

### Common Patterns

**Toggle object visibility:**
```holoscript
object "SecretRoom" {
  state {
    visible: false
  }

  on "player.foundKey" {
    visible = true
  }
}
```

**Respond to user input:**
```holoscript
object "Button" {
  @interactive

  on "click" {
    emit "buttonPressed"
  }
}
```

**Update state over time:**
```holoscript
composition "Timer" {
  state {
    elapsed: 0
  }

  update {
    elapsed += deltaTime
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### **"Module not found" errors**

```bash
# Make sure you installed dependencies
pnpm install

# Rebuild packages
pnpm build
```

#### **Scene not loading in browser**

```bash
# Check browser console for errors (F12)
# Common fixes:

# 1. Syntax error in HoloScript
#    - Check line number in error message
#    - Verify closing braces }

# 2. Missing traits
#    - All @ traits must be defined
#    - See list of valid traits in docs

# 3. Invalid geometry
#    - Use: box, sphere, plane, cylinder, cone, torus
```

#### **Low FPS in VR**

```holoscript
// Reduce object count
// Use simpler geometries
// Lower texture resolutions

// Enable Level of Detail (LOD)
object "Complex Model" {
  @lod
  levels: [
    { distance: 0, geometry: "high-poly.glb" },
    { distance: 10, geometry: "medium-poly.glb" },
    { distance: 20, geometry: "low-poly.glb" }
  ]
}
```

#### **Objects not interactive in VR**

```holoscript
// Add @interactive trait
object "Button" {
  @interactive  // <-- Required for VR interaction
  // ...
}
```

---

## 📚 Additional Resources

### Documentation

| Resource | Description |
|----------|-------------|
| [Developer Portal](DEVELOPER_PORTAL.md) | Central hub for all resources |
| [API Reference](#) | Complete API docs (coming soon) |
| [Video Tutorials](#) | Video walkthroughs (coming soon) |
| [FAQ](QUICKSTART.md) | Frequently asked questions |

### Community

- 💬 **Discord** - Get help from community (coming soon)
- 🐛 **GitHub Issues** - Report bugs and request features
- 📧 **Email** - support@hololand.dev
- 🐦 **Twitter** - @hololand (coming soon)

### Code Examples

- [Basic Usage](../packages/brittney/iot-digital-twins/examples/basic-usage.ts)
- [IoT Demo](../packages/brittney/iot-digital-twins/demo/smart-home-showcase.mjs)
- [Battle Arena](BATTLEARENA_QUICK_REFERENCE.md)
- [50+ Sector Examples](HOLOSCRIPT_SECTOR_EXAMPLES.md)

---

## 🎉 Congratulations!

You've created your first VR scene with Hololand! 🎊

### What you've learned:

✅ How to install Hololand
✅ HoloScript basic syntax
✅ Creating objects and materials
✅ Adding animations and traits
✅ Viewing in browser
✅ Deploying to VR headsets

### Ready for more?

- 🏆 **Build a Game** - [Battle Arena Tutorial](BATTLEARENA_DOCUMENTATION_INDEX.md)
- 🏠 **IoT Integration** - [Smart Home Demo](IOT_DIGITAL_TWINS_SHOWCASE.md)
- 🤖 **AI Assistant** - [Use Brittney](BRITTNEY_SYSTEM_REFERENCE.md)
- 🚀 **Deploy to Production** - [Deployment Guides](DEPLOYMENT_CHECKLIST.md)

---

## 🆘 Need Help?

Stuck on something? We're here to help!

1. **Check the docs** - [Full documentation](INDEX.md)
2. **Search GitHub Issues** - Someone may have had the same question
3. **Ask on Discord** - Community support (coming soon)
4. **Email us** - support@hololand.dev

---

**Happy building! 🚀**

---

**Built with ❤️ for the Hololand community**

*Making VR development accessible to everyone*
