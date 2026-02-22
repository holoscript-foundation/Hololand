# 🌍 Holoverse AI Zone Builder

> **Build zones for the Holoverse metaverse using Claude or Grok API**

## The Holoverse Paradigm

**Holoverse = Ready Player One's OASIS**

- ONE persistent shared metaverse
- Zones are PLACES that exist in the world (not separate apps)
- Users portal between zones
- Everything social, multiplayer, persistent
- HoloScript defines what exists

### Current Mess → Clean Vision

**Current (messy):**
```
examples/
├── 01-hello-vr-world/      (standalone demo)
├── 02-physics-playground/  (standalone demo)
├── 03-vr-shop/            (standalone demo)
├── hololand-central/      (another standalone)
└── 15+ more folders...    (fragmented)
```

**Vision (clean):**
```
Holoverse (THE metaverse)
├── Main Plaza             (zone: main_plaza.holo)
├── Physics Playground     (zone: physics.holo)
├── VR Shop               (zone: shop.holo)
├── Coffee Shop           (zone: coffee.holo)
├── Art Gallery           (zone: gallery.holo)
├── Casino                (zone: casino.holo)
└── [Your AI-generated zones...]
```

All zones are HoloScript compositions loaded into the ONE Holoverse world.

---

## 🚀 Quick Start

### 1. Set API Key

```bash
# Claude
export CLAUDE_API_KEY="sk-ant-..."
export AI_PROVIDER="anthropic"

# OR Grok
export GROK_API_KEY="grok-..."
export AI_PROVIDER="grok"
```

### 2. Generate a Zone

```bash
cd packages/platform/world

# Coffee shop zone
tsx examples/holoverse-zone-generator-demo.ts 0

# Physics playground
tsx examples/holoverse-zone-generator-demo.ts 1

# Art gallery
tsx examples/holoverse-zone-generator-demo.ts 2

# Casino
tsx examples/holoverse-zone-generator-demo.ts 3
```

### 3. Add to Holoverse

```bash
# Zone saved to output/zones/

# Copy to Hololand Central
cp output/zones/neon-brew-cafe.holo \
   ../../examples/hololand-central/src/zones/

# Add portal in MainPlaza.tsx
# Register in zone router
# Deploy!
```

---

## 🎯 How It Works

```
User: "Create a cyberpunk coffee shop with neon lights"
  ↓
AI (Claude/Grok) generates HoloScript:
  @zone "Neon Brew Cafe" category:"social"

  composition "Neon Brew Cafe" {
    object "Ground" { ... }
    object "Counter" { ... }
    npc "Barista" { ... }
    portal "BackToPlaza" { ... }
  }
  ↓
Zone loads into Holoverse
  ↓
Portal appears in Main Plaza
  ↓
Everyone can visit! 🎉
```

---

## 💻 Programmatic Usage

```typescript
import { HololandZoneGenerator } from '@hololand/world';

// Initialize generator
const generator = new HololandZoneGenerator({
  provider: 'anthropic',
  apiKey: process.env.CLAUDE_API_KEY,
});

await generator.initialize();

// Generate a zone
const zone = await generator.generateZone({
  prompt: 'Create a cozy reading library with bookshelves and armchairs',
  metadata: {
    name: 'Infinite Library',
    category: 'education',
    maxPlayers: 50,
  },
});

console.log(zone.holoScript);  // HoloScript code
console.log(zone.portal);      // Portal config for Main Plaza
console.log(zone.metadata);    // Zone info

// Zone is ready to add to Holoverse!
```

### Stream Generation

```typescript
// See AI thinking in real-time
for await (const { chunk, done } of generator.generateZoneStream(request)) {
  process.stdout.write(chunk);

  if (done) {
    console.log('\n✅ Zone complete!');
  }
}
```

---

## 🎨 Example Prompts

### Social Zones
```
"Create a cozy coffee shop with:
- Comfortable seating
- Ambient music
- Barista NPC
- Menu on the wall
- Windows with city views"

"Create a park with:
- Walking paths
- Benches
- Fountain in center
- Trees and grass
- Playground area"
```

### Entertainment Zones
```
"Create a VR arcade with:
- Game cabinets
- Neon lighting
- High score leaderboards
- Prize redemption counter
- Retro music"

"Create a nightclub with:
- Dance floor
- DJ booth
- Laser lights
- VIP area
- Bar with drinks"
```

### Business Zones
```
"Create a virtual retail store with:
- Product displays
- Checkout counter
- Shopping carts
- Sales associate NPCs
- Fitting rooms"

"Create a co-working space with:
- Desks and chairs
- Meeting rooms
- Coffee station
- Whiteboards
- Quiet zones"
```

### Art/Culture Zones
```
"Create an art gallery with:
- White walls
- Spotlights on art
- Sculpture pedestals
- Curator NPC
- Classical music"

"Create a museum with:
- Exhibit halls
- Information plaques
- Tour guide NPC
- Gift shop
- Educational displays"
```

---

## 🔧 Zone Anatomy

Every generated zone includes:

### 1. Zone Metadata
```holoscript
@zone "Zone Name" category:"social" maxPlayers:50
```

### 2. Composition
```holoscript
composition "Zone Name" {
  config {
    bounds: { min: {...}, max: {...} }
    skybox: "sunset"
    ambientLight: { intensity: 0.5 }
  }

  // Objects, NPCs, systems...
}
```

### 3. Ground/Walls
```holoscript
object "Ground" {
  @spatial @networked
  geometry: "plane"
  // ...
}
```

### 4. Interactive Objects
```holoscript
object "Fountain" {
  @spatial @networked @interactive @emissive
  geometry: "cylinder"
  particles: { ... }
}
```

### 5. NPCs
```holoscript
npc "Greeter" {
  @spatial @networked @dialogue
  position: [5, 0, 5]
  start_dialog: "greeting"
}
```

### 6. Dialogue
```holoscript
dialog "greeting" {
  text: "Welcome! How can I help?"
  option "Tell me more" -> @dialog("about")
  option "Thanks!" -> @close
}
```

### 7. Portal Back to Plaza
```holoscript
portal "ReturnToPlaza" {
  @spatial @networked @interactive
  position: [-20, 0, -20]
  destination: "main_plaza"
  label: "← Back to Plaza"
}
```

### 8. Multiplayer Spawn
```holoscript
spawnpoint "Entrance" {
  position: [0, 1, 20]
  rotation: [0, 180, 0]
}
```

---

## 🏗️ Adding Zones to Holoverse

### Step 1: Generate Zone

```bash
tsx examples/holoverse-zone-generator-demo.ts 0
# Creates output/zones/zone-name.holo
```

### Step 2: Add to Hololand Central

```typescript
// examples/hololand-central/src/zones/index.ts

export { default as NeonBrewCafe } from './neon-brew-cafe.holo';

// Map zone names to files
export const ZONES = {
  'neon-brew-cafe': NeonBrewCafe,
  // ... other zones
};
```

### Step 3: Add Portal in Main Plaza

```typescript
// examples/hololand-central/src/worlds/MainPlaza.tsx

<Portal
  position={[15, 1, 15]}      // From zone.portal.position
  color={0x4a90e2}            // From zone.portal.color
  label="Neon Brew Cafe"      // From zone.portal.label
  onClick={() => navigateTo('neon-brew-cafe')}
/>
```

### Step 4: Register in Router

```typescript
// examples/hololand-central/src/App.tsx

function renderZone(zoneName: string) {
  switch (zoneName) {
    case 'neon-brew-cafe':
      return <HoloScriptZone code={ZONES['neon-brew-cafe']} />;
    // ... other zones
  }
}
```

### Step 5: Deploy

```bash
cd examples/hololand-central
pnpm build
vercel --prod

# Zone now live in the Holoverse! 🎉
```

---

## 🌐 Holoverse Architecture

```
Holoverse (Persistent Metaverse)
│
├── Main Plaza (Hub)
│   ├── Portal 1 → Coffee Shop
│   ├── Portal 2 → Physics Playground
│   ├── Portal 3 → Art Gallery
│   ├── Portal 4 → Casino
│   └── Portal N → [Your Zone]
│
├── Zone Runtime (@hololand/world)
│   ├── Physics Engine
│   ├── Multiplayer Sync
│   ├── NPC System
│   ├── Dialogue Manager
│   └── Spatial Index
│
├── HoloScript Loader
│   ├── Parse .holo files
│   ├── Create zone objects
│   ├── Initialize systems
│   └── Start simulation
│
└── Rendering Layer
    ├── Three.js / React Three Fiber
    ├── WebXR for VR headsets
    └── Desktop/Mobile fallback
```

---

## 🎯 Zone Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **social** | Hangouts, meeting spaces | Cafes, parks, lounges |
| **business** | Commerce, services | Shops, offices, banks |
| **entertainment** | Games, fun | Arcades, casinos, clubs |
| **education** | Learning, culture | Museums, libraries, schools |
| **art** | Creative spaces | Galleries, studios, stages |
| **custom** | Unique experiences | Anything else! |

---

## 📊 Generated Zone Stats

Example generation stats:

```
Zone: Neon Brew Cafe
├── HoloScript Size: 3,247 characters
├── Lines of Code: 142
├── Objects: 18
├── NPCs: 2
├── Dialogues: 4
├── Portals: 1
├── Generation Time: 8.3s
└── Model: claude-sonnet-4-20250514
```

---

## 🔄 Iterative Building

Build zones conversationally:

```typescript
// Start with base
await generator.generateZone({
  prompt: 'Create a coffee shop'
});

// Add details (AI remembers context)
await generator.generateZone({
  prompt: 'Add a rooftop terrace with outdoor seating'
});

// More features
await generator.generateZone({
  prompt: 'Add a live music stage in the corner'
});

// Polish
await generator.generateZone({
  prompt: 'Make the lighting more atmospheric'
});

// Clear history when starting new zone
generator.clearHistory();
```

---

## 🚨 Best Practices

### 1. Think Social
Zones should encourage interaction:
- Add NPCs for conversation
- Include gathering spots (seating, tables)
- Create shared activities

### 2. Performance Matters
Keep zones performant:
- ~50 objects max for mobile VR
- Use instanced meshes for repeated objects
- Limit real-time particle effects

### 3. Navigation
Always include:
- Spawn point (where users enter)
- Portal back to Main Plaza
- Clear sightlines (don't block paths)

### 4. Multiplayer
Design for multiple users:
- Walkable space (2m x 2m minimum)
- @networked trait on interactive objects
- Spawn points spread out

### 5. Accessibility
Make zones accessible:
- Ramps, not stairs
- Clear signage
- Audio cues
- High contrast colors

---

## 🎉 Success!

You now have:
- ✅ AI-powered zone generation for the Holoverse
- ✅ HoloScript-first development
- ✅ Ready Player One-style metaverse building
- ✅ Claude & Grok integration
- ✅ Streaming generation
- ✅ Complete zone workflow

**Start building the Holoverse!** 🌍

---

## 📝 Files Created

```
Hololand/
├── HOLOVERSE_AI_BUILDER.md                          # This guide
├── packages/platform/world/
│   ├── src/ai/
│   │   └── HololandZoneGenerator.ts                 # Zone generator
│   └── examples/
│       ├── holoverse-zone-generator-demo.ts         # Demo script
│       └── output/zones/                            # Generated zones
│           ├── zone-name.holo
│           └── zone-name.json
└── examples/hololand-central/                       # The Holoverse
    ├── src/zones/                                   # Zone .holo files
    └── src/worlds/MainPlaza.tsx                     # Portal hub
```

---

**Built for the Holoverse** 🌐

*ONE world. Infinite possibilities.* ✨
