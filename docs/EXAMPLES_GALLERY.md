# 🎨 Hololand Examples Gallery

> **50+ production-ready examples to learn from and customize**

Browse our comprehensive collection of VR/AR scenes, games, and applications built with HoloScript.

---

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/hololand/hololand.git
cd hololand

# Install dependencies
pnpm install

# Run any example
cd packages/playground
pnpm dev
# Upload any .holo file from examples/
```

---

## 📑 Table of Contents

- [Featured Examples](#featured)
- [Games & Entertainment](#games)
- [IoT & Smart Environments](#iot)
- [Education & Training](#education)
- [Business & Enterprise](#business)
- [Art & Creative](#art)
- [Social & Collaboration](#social)
- [Technical Demos](#technical)
- [Templates & Starters](#templates)

---

## 🌟 Featured Examples {#featured}

### 🏆 Battle Arena - Complete Multiplayer Game

**The flagship Hololand game demonstrating the full platform capabilities.**

<table>
<tr>
<td width="40%">

**Features:**
- 🎮 Real-time PvP combat
- ⚔️ Weapons & abilities system
- 🏆 Matchmaking & leaderboards
- 📊 Player stats & progression
- 🎨 Beautiful environments
- 🌐 Cross-platform multiplayer

</td>
<td width="60%">

**Tech Highlights:**
- 450+ LOC HoloScript+
- Networked world state
- Physics-based combat
- Party system integration
- Local-first architecture
- Offline play support

</td>
</tr>
</table>

**Files:**
- `examples/battle-arena/BattleArena.hsplus` - Main game logic
- `examples/battle-arena/weapons/` - Weapon definitions
- `examples/battle-arena/arenas/` - Map designs

**[→ Full Documentation](BATTLEARENA_DOCUMENTATION_INDEX.md)** | **[→ Quick Reference](BATTLEARENA_QUICK_REFERENCE.md)**

---

### 🏡 Smart Home VR Dashboard - IoT Digital Twins

**Transform 24 IoT devices into an immersive VR control interface.**

<table>
<tr>
<td width="40%">

**Performance:**
- ⚡ 2ms generation time
- 🏠 24 devices, 9 types
- 📝 408 lines generated
- 🔄 <100ms MQTT sync
- 🌐 18+ platforms

</td>
<td width="60%">

**Device Types:**
- 💡 Smart lights (RGB, brightness)
- 🌡️ Climate control (thermostats, AC)
- 📹 Security cameras (motion, recording)
- 🔒 Smart locks (battery monitoring)
- 📊 Sensors (temp, humidity, air quality)

</td>
</tr>
</table>

**Files:**
- `packages/brittney/iot-digital-twins/demo/smart-home-showcase.mjs`
- `packages/brittney/iot-digital-twins/demo/visualizer.html`
- `packages/brittney/iot-digital-twins/demo/output/smart-home-dashboard.holo`

**[→ IoT Showcase](IOT_DIGITAL_TWINS_SHOWCASE.md)** | **[→ Run Demo](../packages/brittney/iot-digital-twins/demo/README.md)**

---

### 🌍 Procedural Island - Terrain Generation

**Infinite procedurally generated island with realistic terrain.**

**Features:**
- 🗺️ Perlin noise terrain generation
- 🌊 Water with reflections
- 🌲 Procedural tree placement
- 🏰 Structure generation
- ☀️ Day/night cycle
- 🎨 Biome system (beach, forest, mountains)

**Tech:**
- Deterministic generation (same seed = same island)
- LOD terrain optimization
- Chunk-based loading
- Physics collision meshes

**Files:**
- `examples/procedural/Island.hsplus`
- `examples/procedural/TerrainGenerator.hsplus`

---

### 🎨 Art Gallery - Virtual Exhibition Space

**Elegant VR art gallery with 10 paintings and interactive features.**

**Features:**
- 🖼️ High-res artwork display
- 💡 Spotlighting system
- 📝 Information plaques
- 🚶 Teleportation system
- 🎧 Audio guide
- 👥 Multiplayer tours

**Use Cases:**
- Virtual museum exhibitions
- NFT galleries
- Portfolio showcases
- Art sales platforms

**Files:**
- `examples/art-gallery/Gallery.holo`
- `examples/art-gallery/artworks/` - Painting assets

---

## 🎮 Games & Entertainment {#games}

### 🏓 Ping Pong VR

**Classic table tennis in VR with physics-based gameplay.**

```holoscript
// Paddle with realistic physics
object "Paddle" {
  @interactive @physics
  geometry: "paddle"
  physics: {
    mass: 0.2
    restitution: 0.9  // Bouncy
  }
}
```

**Features:**
- Realistic ball physics
- Score tracking
- AI opponent
- Multiplayer mode

**Files:** `examples/games/ping-pong.holo`

---

### 🎯 Target Practice

**Shooting range with multiple targets and scoring system.**

**Features:**
- 🎯 Moving targets
- 🔫 Different weapons
- 📊 Score tracking
- ⏱️ Time challenges
- 🏆 Leaderboards

**Files:** `examples/games/target-practice.holo`

---

### 🧩 Puzzle Rooms

**Escape room with physics-based puzzles.**

**Features:**
- 🔑 Key collection
- 🚪 Locked doors
- ⚙️ Mechanisms
- 💡 Hint system
- ⏰ Timer

**Files:** `examples/games/puzzle-room.holo`

---

### 🎲 Board Game Table

**Virtual table for playing board games in VR.**

**Features:**
- 🎲 Dice rolling
- 🃏 Card decks
- 📋 Game boards
- 👥 Multiplayer
- 💾 Save/load games

**Files:** `examples/games/board-game-table.holo`

---

## 🏠 IoT & Smart Environments {#iot}

### 🏭 Industrial Factory Dashboard

**Monitor 100+ sensors in a VR factory environment.**

**Features:**
- 🏭 3D factory floor layout
- 📊 Real-time sensor data
- ⚠️ Alert system
- 📈 Trend visualization
- 🔧 Maintenance scheduling

**Use Cases:**
- Manufacturing monitoring
- Predictive maintenance
- Safety compliance
- Production optimization

**Files:** `examples/iot/factory-dashboard.holo`

---

### 🏥 Patient Monitoring - Healthcare

**VR patient room with vital signs visualization.**

**Features:**
- ❤️ Heart rate monitor
- 🫁 Blood oxygen levels
- 🌡️ Temperature tracking
- 💉 IV fluid levels
- 🔔 Alert notifications

**Files:** `examples/iot/patient-monitoring.holo`

---

### 🌾 Smart Farm Dashboard

**Monitor agricultural sensors across 100 acres.**

**Features:**
- 🌱 Soil moisture sensors
- 🌤️ Weather stations
- 💧 Irrigation control
- 📷 Crop cameras
- 🚜 Equipment tracking

**Files:** `examples/iot/smart-farm.holo`

---

### 🏢 Building Management System

**Complete BMS for office building in VR.**

**Features:**
- 🌡️ HVAC control (50 zones)
- 💡 Lighting control (200 fixtures)
- 🔒 Access control (30 doors)
- 📹 Security cameras (15 cameras)
- ⚡ Energy monitoring

**Files:** `examples/iot/building-management.holo`

---

## 🎓 Education & Training {#education}

### 🔬 Physics Classroom

**Interactive physics simulations for students.**

**Experiments:**
- 🎱 Momentum & collision
- 🪐 Gravity & orbits
- ⚡ Electrical circuits
- 🌊 Wave propagation
- 🎢 Energy conservation

**Files:** `examples/education/physics-lab.holo`

---

### 🧬 Biology VR - Cell Exploration

**Explore inside a living cell at microscopic scale.**

**Features:**
- 🧬 DNA visualization
- 🔬 Organelle interactions
- ⚗️ Chemical reactions
- 🎥 Recorded narration
- 📝 Quiz system

**Files:** `examples/education/biology-cell.holo`

---

### 🗺️ Historical Recreations

**Walk through historical events and locations.**

**Scenes:**
- 🏛️ Ancient Rome
- 🏰 Medieval castle
- 🚢 Titanic ship
- 🗽 Ellis Island 1900s
- 🌍 Ancient Egypt

**Files:** `examples/education/historical/`

---

### ✈️ Flight Simulator Training

**Realistic cockpit for pilot training.**

**Features:**
- 🎛️ Full instrument panel
- 🗺️ Real-world airports
- ☁️ Weather simulation
- 📻 ATC communications
- 🚨 Emergency scenarios

**Files:** `examples/education/flight-simulator.holo`

---

## 💼 Business & Enterprise {#business}

### 📊 Data Visualization Dashboard

**3D charts and graphs for business analytics.**

**Visualizations:**
- 📈 Line charts (time series)
- 📊 Bar charts (comparisons)
- 🥧 Pie charts (proportions)
- 🗺️ Geographic heat maps
- 🌐 Network graphs

**Data Sources:**
- CSV files
- REST APIs
- SQL databases
- Real-time WebSocket
- Google Sheets

**Files:** `examples/business/data-viz-dashboard.holo`

---

### 🏠 Real Estate Virtual Tours

**Show properties in immersive VR.**

**Features:**
- 🏡 Multiple room types
- 📐 Measurement tools
- 🎨 Material customization
- 🪟 Day/night views
- 📍 Neighborhood context

**Files:** `examples/business/real-estate-tour.holo`

---

### 🏪 Virtual Retail Store

**Shop in VR with product interactions.**

**Features:**
- 🛍️ Product display
- 🔍 Zoom & inspect
- 🛒 Shopping cart
- 💳 Checkout process
- 📦 Virtual try-on

**Files:** `examples/business/retail-store.holo`

---

### 💼 Virtual Conference Room

**Host meetings in professional VR space.**

**Features:**
- 👥 Avatar system
- 📊 Presentation screen
- 💬 Chat & voice
- ✋ Raise hand
- 📝 Whiteboard
- 🎥 Screen sharing

**Files:** `examples/business/conference-room.holo`

---

## 🎨 Art & Creative {#art}

### 🖌️ VR Painting Studio

**Create 3D art in virtual space.**

**Tools:**
- 🖍️ 10+ brush types
- 🎨 Color palette
- ↩️ Undo/redo
- 💾 Save/export
- 🖼️ Gallery mode

**Files:** `examples/art/painting-studio.holo`

---

### 🎭 Theater Performance Space

**Virtual theater with stage and audience.**

**Features:**
- 🎭 Stage with lighting
- 🪑 Audience seating
- 🎬 Performance recording
- 🎤 Audio system
- 🎨 Set changes

**Files:** `examples/art/theater.holo`

---

### 🎵 Music Visualizer

**See music come alive in 3D.**

**Features:**
- 🎵 Audio reactive
- 🌈 Color based on frequency
- 💫 Particle effects
- 🎚️ Control parameters
- 📁 Load audio files

**Files:** `examples/art/music-visualizer.holo`

---

### 📷 Photography Studio

**Professional photo studio setup in VR.**

**Features:**
- 📸 Camera controls
- 💡 Lighting setups
- 🎨 Backdrops
- 📐 Composition guides
- 🖼️ Gallery export

**Files:** `examples/art/photography-studio.holo`

---

## 👥 Social & Collaboration {#social}

### ☕ Virtual Cafe - Hangout Space

**Casual social space for chatting and relaxing.**

**Features:**
- ☕ Cafe environment
- 🪑 Seating areas
- 🎮 Mini-games
- 💬 Voice chat
- 🎵 Ambient music

**Files:** `examples/social/virtual-cafe.holo`

---

### 🏫 Study Group Room

**Collaborative study space for students.**

**Features:**
- 📚 Shared whiteboards
- 📖 Document viewing
- ⏱️ Pomodoro timer
- 🎧 Focus mode
- 📝 Note sharing

**Files:** `examples/social/study-room.holo`

---

### 🎉 Party Space - Events

**Host virtual parties and events.**

**Features:**
- 🎵 DJ booth
- 💃 Dance floor
- 🍕 Food & drinks
- 🎁 Gift giving
- 📸 Photo booth

**Files:** `examples/social/party-space.holo`

---

## 🔧 Technical Demos {#technical}

### ⚙️ Physics Playground

**Demonstrate all physics features.**

**Examples:**
- 🎱 Rigid body dynamics
- 🪢 Rope & cloth simulation
- 💧 Fluid dynamics
- 🔗 Joint constraints
- 💥 Destruction

**Files:** `examples/technical/physics-playground.holo`

---

### 🌐 Networking Stress Test

**Test multiplayer performance limits.**

**Tests:**
- 👥 100+ simultaneous players
- 📦 1000+ networked objects
- 🔄 High-frequency updates
- 📊 Bandwidth monitoring
- ⏱️ Latency testing

**Files:** `examples/technical/networking-stress-test.holo`

---

### 🎮 Input Systems Demo

**All supported input methods.**

**Inputs:**
- 🖱️ Mouse & keyboard
- 🎮 Gamepad
- 👋 Hand tracking
- 🎙️ Voice commands
- 👁️ Eye tracking
- 🏃 Full body tracking

**Files:** `examples/technical/input-systems.holo`

---

### 🎨 Material Showcase

**All material types and features.**

**Materials:**
- 🌟 PBR (Metallic-Roughness)
- 🔥 Emissive
- 🪞 Reflective
- 🌈 Refractive
- 🎭 Toon shading
- 🌊 Custom shaders

**Files:** `examples/technical/material-showcase.holo`

---

## 📝 Templates & Starters {#templates}

### 🎯 Minimal Template

**Bare minimum to get started.**

```holoscript
// @holoscript-version 3.4

composition "Minimal Template" {
  object "Floor" {
    geometry: "plane"
    position: [0, 0, 0]
    scale: [10, 1, 10]
  }

  object "Light" {
    @light
    type: "ambient"
    intensity: 1.0
  }
}
```

**Files:** `examples/templates/minimal.holo`

---

### 🎨 Standard Scene Template

**Good starting point with common setup.**

**Includes:**
- Floor & ceiling
- Walls (optional)
- Lighting setup (ambient + directional)
- Camera setup
- Basic materials

**Files:** `examples/templates/standard-scene.holo`

---

### 🎮 Game Template

**Starter template for games.**

**Includes:**
- Player controller
- Input handling
- Score system
- UI overlay
- Menu system
- Game state management

**Files:** `examples/templates/game-template.holo`

---

### 🌐 Multiplayer Template

**Ready-to-use multiplayer scene.**

**Includes:**
- Networked state
- Player avatars
- Spawn points
- Chat system
- Connection UI

**Files:** `examples/templates/multiplayer-template.holo`

---

## 📦 Download Examples

### Clone Individual Examples

```bash
# Clone specific example
curl -O https://raw.githubusercontent.com/hololand/hololand/main/examples/games/ping-pong.holo

# Or clone entire category
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/hololand/hololand.git
cd hololand
git sparse-checkout set examples/games/
```

### Download Example Pack

```bash
# Download all examples (ZIP)
curl -L https://github.com/hololand/hololand/archive/refs/heads/main.zip -o hololand.zip
unzip hololand.zip
cd hololand-main/examples/
```

---

## 🔨 Customize Examples

All examples are MIT licensed and free to customize!

### Basic Customization

```holoscript
// Change colors
material: { color: "#YOUR_COLOR" }

// Change positions
position: [x, y, z]

// Change sizes
scale: [x, y, z]

// Add your own objects
object "My Object" {
  // ...
}
```

### Advanced Customization

```holoscript
// Add custom behaviors
on "click" {
  // Your code here
}

// Connect to your data
state {
  data: bind("api://your-api.com/data")
}

// Modify physics
physics: {
  mass: 10
  friction: 0.5
}
```

---

## 🎓 Learning Path

### Beginner (Start Here)

1. **Minimal Template** - Understand basic structure
2. **Art Gallery** - Learn object placement
3. **Ping Pong** - Add physics
4. **Virtual Cafe** - Try multiplayer

### Intermediate

1. **Battle Arena** - Complex game logic
2. **Smart Home** - IoT integration
3. **Data Dashboard** - External data
4. **Flight Simulator** - Advanced controls

### Advanced

1. **Procedural Island** - Algorithms
2. **Factory Dashboard** - Large-scale IoT
3. **Networking Stress Test** - Performance
4. **Custom Materials** - Shader programming

---

## 🌟 Community Examples

Want to showcase your creation?

1. **Build something awesome** with Hololand
2. **Open source it** on GitHub
3. **Submit PR** to add to this gallery
4. **Get featured!** 🎉

**Submission requirements:**
- Working .holo or .hsplus file
- README with description
- Screenshot or video
- MIT license

---

## 📊 Example Statistics

| Category | Count | Total LOC |
|----------|-------|-----------|
| Games | 12 | 3,500+ |
| IoT | 8 | 2,200+ |
| Education | 10 | 4,100+ |
| Business | 7 | 1,800+ |
| Art | 6 | 1,500+ |
| Social | 5 | 1,200+ |
| Technical | 8 | 2,800+ |
| Templates | 4 | 400+ |
| **Total** | **60+** | **17,500+** |

---

## 🆘 Need Help?

### Documentation
- [Getting Started](GETTING_STARTED.md)
- [HoloScript Reference](HOLOSCRIPT_LANGUAGE_SPEC.md)
- [Developer Portal](DEVELOPER_PORTAL.md)

### Support
- 💬 Discord (coming soon)
- 🐛 [GitHub Issues](https://github.com/hololand/hololand/issues)
- 📧 support@hololand.dev

---

## 📄 License

All examples are MIT licensed and free to use in your projects!

---

**🎨 Browse, learn, and build amazing VR experiences!**

---

**Built with ❤️ for the Hololand community**

*Empowering creators with 50+ production-ready examples*
