# 🌐 Hololand Developer Portal

> **The Unity for Spatial Computing** - Build immersive VR/AR/XR experiences with HoloScript

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/hololand/hololand)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-complete-brightgreen.svg)](docs/INDEX.md)

---

## 🚀 Quick Navigation

<table>
<tr>
<td width="33%">

### 🎯 Getting Started
- [5-Minute Quickstart](#quickstart)
- [What is Hololand?](#what-is-hololand)
- [Core Concepts](#core-concepts)
- [First Project Tutorial](#tutorials)

</td>
<td width="33%">

### 📚 Documentation
- [HoloScript Language](#holoscript)
- [API Reference](#api-reference)
- [Deployment Guides](#deployment)
- [Architecture Docs](#architecture)

</td>
<td width="33%">

### 💡 Showcases
- [IoT Digital Twins](#iot-showcase) 🔥
- [Battle Arena Game](#battle-arena)
- [Example Gallery](#examples)
- [Video Tutorials](#videos)

</td>
</tr>
</table>

---

## 🎉 Featured: IoT Digital Twins Demo {#iot-showcase}

**Transform IoT devices into immersive VR experiences in 2 milliseconds!**

<table>
<tr>
<td width="50%">

### 🏡 Smart Home VR Showcase

Our latest demo generates a complete VR smart home from 24 realistic IoT devices.

**Performance Highlights:**
- ⚡ **2ms generation time** (25x faster than target)
- 🏠 **24 devices** across 9 types
- 📝 **408 lines** of HoloScript generated
- 🔄 **Real-time MQTT sync** (<100ms latency)
- 🌐 **Cross-platform** (Quest, Vision Pro, WebVR)

</td>
<td width="50%">

### 📊 Device Types Supported

- 💡 **Lights** (10 devices) - RGB, brightness, effects
- 🌡️ **Climate** (2 devices) - Thermostats, HVAC
- 📹 **Cameras** (2 devices) - Motion detection, recording
- 🔒 **Locks** (2 devices) - Smart locks with battery
- 📊 **Sensors** (4 devices) - Temperature, humidity, air quality
- 🔌 **Switches** (1 device) - Power monitoring
- ⚡ **Binary Sensors** (1 device) - On/off states
- 🚪 **Covers** (1 device) - Garage doors, blinds
- 📺 **Media Players** (1 device) - Smart TVs

</td>
</tr>
</table>

**[→ View Full IoT Demo](../packages/brittney/iot-digital-twins/demo/DEMO_COMPLETE.md)** | **[→ Run the Demo](../packages/brittney/iot-digital-twins/demo/README.md)** | **[→ Presentation Guide](../packages/brittney/iot-digital-twins/demo/PRESENTATION_GUIDE.md)**

---

## 🌟 What is Hololand? {#what-is-hololand}

Hololand is a comprehensive platform for building spatial computing experiences using **HoloScript**, a declarative language that compiles to 18+ platforms.

### Key Features

<table>
<tr>
<td width="50%">

#### 🎨 **Declarative Language**
Write once in HoloScript, deploy everywhere:
```holoscript
composition "My First Scene" {
  object "Cube" {
    @interactive
    geometry: "box"
    position: [0, 1, 0]
    material: { color: "#FF6B35" }
  }
}
```

</td>
<td width="50%">

#### 🚀 **18+ Target Platforms**
- **VR:** Quest, Vision Pro, SteamVR, PSVR2
- **AR:** ARCore, ARKit, HoloLens
- **Web:** WebXR, Three.js, Babylon.js
- **Game Engines:** Unity, Unreal, Godot
- **Mobile:** iOS, Android
- **Desktop:** Windows, macOS, Linux
- **IoT:** URDF, SDF robotics formats

</td>
</tr>
<tr>
<td width="50%">

#### 🤖 **AI-Powered Assistant**
**Brittney** - Your AI spatial computing companion:
- Natural language scene creation
- Real-time code generation
- Smart debugging assistance
- Performance optimization
- 6+ MCP tools for automation

</td>
<td width="50%">

#### ⚡ **Blazing Fast Performance**
- 2ms IoT → VR transformation
- <100ms MQTT real-time sync
- 60 FPS desktop, 30 FPS mobile
- Optimized for low-end devices
- Efficient memory management

</td>
</tr>
</table>

---

## 🎓 Getting Started {#quickstart}

### 5-Minute Quickstart

#### 1. **Install Hololand**

```bash
# Clone the repository
git clone https://github.com/hololand/hololand.git
cd hololand

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

#### 2. **Create Your First Scene**

Create a file named `my-scene.holo`:

```holoscript
// @holoscript-version 3.4

composition "My First VR Scene" {
  object "Floor" {
    geometry: "plane"
    position: [0, 0, 0]
    scale: [10, 1, 10]
    material: { color: "#2C3E50" }
  }

  object "Floating Cube" {
    @interactive @animated
    geometry: "box"
    position: [0, 1.5, 0]
    material: { color: "#E74C3C" }

    animation "rotate" {
      property: "rotation.y"
      from: 0
      to: 360
      duration: 3
      loop: true
    }
  }

  object "Point Light" {
    @light
    type: "point"
    position: [0, 3, 0]
    intensity: 1.0
    color: "#FFFFFF"
  }
}
```

#### 3. **View in Browser**

```bash
cd packages/playground
pnpm dev
# Open http://localhost:5173
# Upload your my-scene.holo file
```

#### 4. **Deploy to VR**

```bash
# Export for Quest
pnpm holoscript compile my-scene.holo --target quest

# Export for Vision Pro
pnpm holoscript compile my-scene.holo --target visionpro

# Export for WebXR
pnpm holoscript compile my-scene.holo --target webxr
```

**[→ Full Quickstart Guide](CREATOR_QUICKSTART.md)**

---

## 📖 Core Concepts {#core-concepts}

### 1. **Compositions**
Compositions are complete VR/AR scenes. They contain objects, lights, cameras, and logic.

```holoscript
composition "Game Level" {
  // Your scene here
}
```

### 2. **Objects**
3D objects with geometry, materials, and behaviors.

```holoscript
object "Player" {
  @interactive @networked
  geometry: "capsule"
  position: [0, 1, 0]
  state { health: 100 }
}
```

### 3. **Traits**
Reusable behaviors attached with `@` symbol.

```holoscript
@interactive    // Can be clicked/grabbed
@networked      // Syncs across clients
@animated       // Has animations
@emissive       // Emits light
@sensor         // IoT sensor data
@controllable   // Can be controlled remotely
```

### 4. **State Management**
Reactive state with automatic UI updates.

```holoscript
state {
  score: 0
  gameOver: false
  players: bind("network://players")
}
```

### 5. **Data Bindings**
Connect to external data sources.

```holoscript
state {
  temperature: bind("mqtt://sensor/temp")
  users: bind("network://connected_users")
  content: bind("api://cms/content")
}
```

**[→ Complete Language Reference](HOLOSCRIPT_LANGUAGE_SPEC.md)**

---

## 🎮 Examples & Showcases {#examples}

### 🏆 Battle Arena - Complete Multiplayer Game

A fully-featured VR battle arena game built entirely in HoloScript.

**Features:**
- 🎮 Real-time multiplayer (up to 8 players)
- ⚔️ Combat system with weapons and abilities
- 🏆 Matchmaking and leaderboards
- 📊 Player stats and progression
- 🎨 Beautiful environments

**[→ Battle Arena Documentation](BATTLEARENA_DOCUMENTATION_INDEX.md)** | **[→ Quick Reference](BATTLEARENA_QUICK_REFERENCE.md)**

---

### 🏡 IoT Smart Home (Featured)

Transform 24 smart home devices into an immersive VR dashboard.

**Technologies:**
- Home Assistant integration
- MQTT real-time sync
- 9 device type mappings
- Room-based spatial layout

**[→ View Demo](../packages/brittney/iot-digital-twins/demo/DEMO_COMPLETE.md)**

---

### 🌍 Example Worlds Collection

10 pre-built example worlds demonstrating different features:

1. **Arena** - PvP combat arena
2. **Island** - Procedural terrain generation
3. **Sandbox** - Creative building mode
4. **Showcase** - Feature demonstrations
5. **Builder** - Collaborative construction
6. **Physics Lab** - Physics constraints demo
7. **Marketplace** - Content discovery
8. **Party Hub** - Social gathering space
9. **Analytics Dashboard** - Data visualization
10. **Offline Playground** - Local-first features

**[→ Browse Examples](HOLOSCRIPT_SECTOR_EXAMPLES.md)**

---

## 📚 Documentation {#holoscript}

### Language References

| Document | Description |
|----------|-------------|
| [HoloScript Language Spec](HOLOSCRIPT_LANGUAGE_SPEC.md) | Complete syntax reference |
| [HoloScript+ (Advanced)](HSPLUS_LANGUAGE_SPEC.md) | Extended features |
| [File Types Guide](HOLOSCRIPT_FILE_TYPES.md) | .holo vs .hsplus explained |
| [Language Comparison](HOLOSCRIPT_LANGUAGE_COMPARISON.md) | HoloScript vs Unity/Unreal |
| [Integration Guide](HOLOSCRIPT_INTEGRATION_GUIDE.md) | Embed HoloScript in your app |

---

### API Reference {#api-reference}

| Package | Documentation |
|---------|---------------|
| **@hololand/world** | [World API](../packages/world/README.md) |
| **@hololand/react-three** | [React Integration](../packages/react-three/README.md) |
| **@hololand/iot-digital-twins** | [IoT → VR Generator](../packages/brittney/iot-digital-twins/README.md) |
| **@hololand/mcp-server** | [MCP Tools](../packages/mcp-server/README.md) |
| **@hololand/ar-foundation** | [AR Features](../packages/ar-foundation/README.md) |
| **@hololand/inference** | [AI Inference](../packages/shared/inference/README.md) |

**[→ Complete Package List](../ECOSYSTEM_STATUS.md)** (40+ packages)

---

### Brittney AI Assistant {#brittney}

Brittney is your AI companion for building in Hololand.

**Capabilities:**
- Natural language scene creation
- Code generation and debugging
- Performance optimization
- IoT device integration
- Real-time collaboration

**Available Tools:**
1. `brittney_iot_generate_holoscript` - Generate VR from IoT devices
2. `brittney_iot_mqtt_connect` - Connect to MQTT broker
3. `brittney_iot_mqtt_publish` - Publish state updates
4. `brittney_iot_list_device_types` - List supported devices
5. `brittney_scene_analyze` - Analyze scene performance
6. `brittney_scene_optimize` - Optimize scene for target platform

**[→ Brittney Documentation](BRITTNEY_SYSTEM_REFERENCE.md)** | **[→ AI Package Index](BRITTNEY_AI_PACKAGE_INDEX.md)**

---

## 🚀 Deployment Guides {#deployment}

### Target Platforms

<table>
<tr>
<td width="50%">

#### 🌐 **Web Deployment**
Deploy to any static host:
- Netlify
- Vercel
- GitHub Pages
- AWS S3

**[→ Browser Deployment Guide](DEPLOYMENT_BROWSER.md)**

</td>
<td width="50%">

#### 🖥️ **Desktop Apps**
Build native apps with Tauri:
- Windows (signed .exe)
- macOS (notarized .dmg)
- Linux (.AppImage, .deb)

**[→ Desktop Deployment Guide](DEPLOYMENT_TAURI.md)**

</td>
</tr>
<tr>
<td width="50%">

#### 📱 **Mobile Apps**
Publish to app stores:
- iOS App Store
- Google Play Store
- React Native + Expo

**[→ Mobile Deployment Guide](DEPLOYMENT_MOBILE.md)**

</td>
<td width="50%">

#### ☁️ **Cloud Sync**
Optional cloud backend:
- Real-time multiplayer
- Cloud save/load
- Marketplace hosting
- Analytics collection

**[→ Cloud Sync Guide](DEPLOYMENT_CLOUD_SYNC.md)**

</td>
</tr>
</table>

**[→ Deployment Checklist](DEPLOYMENT_CHECKLIST.md)**

---

## 🏗️ Architecture {#architecture}

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Hololand Platform                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  HoloScript  │──▶│   Compiler   │──▶│  18+ Target  │    │
│  │  Source Code │   │    Engine    │   │  Platforms   │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│         │                    │                   │           │
│         ▼                    ▼                   ▼           │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │   Brittney   │   │  IoT Bridge  │   │  Cloud Sync  │    │
│  │  AI Engine   │   │   (MQTT)     │   │   (WebRTC)   │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Architecture Documents

| Document | Description |
|----------|-------------|
| [Architecture Decisions](ARCHITECTURE_DECISIONS.md) | Design rationale |
| [Hololand Central](HOLOLAND_CENTRAL_ARCHITECTURE.md) | Central hub architecture |
| [uAA2 API Contract](UAA2_API_CONTRACT.md) | Agent API specification |
| [MCP Best Practices](MCP_BEST_PRACTICES.md) | MCP integration patterns |
| [OpenAPI Spec](api.openapi.yaml) | REST API specification |

---

## 🎬 Video Tutorials {#videos}

### Official Tutorial Series

1. **Getting Started** (5 min)
   - Installing Hololand
   - Your first scene
   - Deploying to VR

2. **IoT Digital Twins** (7 min)
   - Connecting Home Assistant
   - Generating VR dashboards
   - Real-time MQTT sync

3. **Building Games** (15 min)
   - Creating Battle Arena
   - Multiplayer networking
   - Combat systems

4. **Advanced Features** (20 min)
   - Custom traits
   - Physics constraints
   - Procedural generation

**[→ Video Tutorial Scripts](../packages/brittney/iot-digital-twins/demo/PRESENTATION_GUIDE.md)**

---

## 🎯 Use Cases

### Industries & Applications

<table>
<tr>
<td width="33%">

#### 🏠 **Smart Home**
- VR device dashboards
- Remote control interfaces
- Energy monitoring
- Security visualization

</td>
<td width="33%">

#### 🏭 **Industrial IoT**
- Factory monitoring
- Equipment visualization
- Predictive maintenance
- Safety systems

</td>
<td width="33%">

#### 🏥 **Healthcare**
- Patient monitoring
- Medical device VR
- Surgical planning
- Therapy environments

</td>
</tr>
<tr>
<td width="33%">

#### 🏫 **Education**
- Virtual classrooms
- Science simulations
- Historical recreations
- Collaborative learning

</td>
<td width="33%">

#### 🏢 **Enterprise**
- Virtual meetings
- Data visualization
- Training simulations
- Facility management

</td>
<td width="33%">

#### 🎮 **Gaming**
- Multiplayer games
- Social VR
- Esports arenas
- Creative sandboxes

</td>
</tr>
</table>

**[→ See Sector Examples](HOLOSCRIPT_SECTOR_EXAMPLES.md)**

---

## 🛠️ Developer Tools

### Available Tools & SDKs

| Tool | Description |
|------|-------------|
| **HoloScript CLI** | Command-line compiler and tools |
| **Brittney MCP** | AI assistant with 6+ tools |
| **IoT Generator** | Transform IoT → VR automatically |
| **Scene Validator** | Validate HoloScript syntax |
| **Performance Profiler** | Optimize scenes for targets |
| **Asset Pipeline** | Import 3D models, textures |
| **Multiplayer SDK** | Real-time networking |
| **Analytics SDK** | Track user behavior |

---

## 📊 Performance Benchmarks

### Real-World Performance

| Metric | Browser | Desktop | Mobile | Quest |
|--------|---------|---------|--------|-------|
| **FPS Target** | 60 | 90 | 30 | 72 |
| **Objects** | 1000+ | 2000+ | 500+ | 800+ |
| **Physics** | 100 | 200 | 50 | 75 |
| **Networked** | 50 | 100 | 25 | 40 |
| **Memory** | 512MB | 1GB | 256MB | 384MB |

### Compilation Speed

| Source Size | Compilation Time | Platforms |
|-------------|------------------|-----------|
| 100 LOC | <50ms | All 18 |
| 500 LOC | <200ms | All 18 |
| 2000 LOC | <1s | All 18 |
| 10000 LOC | <5s | All 18 |

---

## 🌟 Community & Support

### Get Help

- 📖 [Documentation](INDEX.md)
- 💬 [Discord Community](#) (coming soon)
- 🐛 [GitHub Issues](https://github.com/hololand/hololand/issues)
- 📧 Email: support@hololand.dev

### Contributing

We welcome contributions! See our [Contributing Guide](../CONTRIBUTING.md).

**Areas we need help:**
- Platform integrations (new export targets)
- Device mappings (more IoT devices)
- Example scenes
- Documentation improvements
- Bug fixes and testing

---

## 📈 Roadmap

### Current Version: 1.0.0

### ✅ **Completed**
- HoloScript language (v3.4)
- 18+ platform compilers
- Brittney AI assistant
- IoT Digital Twins
- Battle Arena game
- Multiplayer networking
- Cloud sync
- 40+ packages

### 🚧 **In Progress**
- Developer Portal (this document!)
- Video tutorials
- Public beta testing
- Performance optimizations

### 🔮 **Coming Soon**
- Visual scene editor
- Marketplace launch
- Mobile apps (iOS/Android)
- More IoT integrations
- Advanced physics
- VR hand tracking
- Voice commands

**[→ Full Roadmap](#)** (coming soon)

---

## 🎉 Get Started Now!

Ready to build the spatial future?

1. **[→ 5-Minute Quickstart](#quickstart)**
2. **[→ Run the IoT Demo](../packages/brittney/iot-digital-twins/demo/README.md)**
3. **[→ Read the Docs](INDEX.md)**
4. **[→ Join Discord](#)** (coming soon)

---

## 📄 License

Hololand is open source under the [MIT License](../LICENSE).

---

**Built with ❤️ by the Hololand community**

*Transforming imagination into immersive reality*
