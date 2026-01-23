# HoloScript File Types Guide

**TL;DR:** `.holo` and `.hsplus` are **complementary formats** - use both together! `.holo` describes *what exists*, `.hsplus` defines *how it behaves*.

<p align="center">
  <img src="assets/gifs/holo-simple-demo.gif" alt=".holo file defining a world" width="400">
  <img src="assets/gifs/hsplus-multiplayer-demo.gif" alt=".hsplus file with game logic" width="400">
  <br>
  <em>Left: .holo (world definition) • Right: .hsplus (game systems)</em>
</p>

---

## Quick Summary

| Extension | Purpose | Best For |
|-----------|---------|----------|
| `.holo` | Declarative, visual | World layouts, agent definitions, AI-generated content |
| `.hsplus` | Imperative, full language | Game systems, networking, complex logic |

> ⚠️ **These are NOT legacy/new!** They serve different purposes and work together.

---

## `.holo` - Declarative World Language

### What It Is
A **visual, declarative format** designed for AI agents and creators to read/write. Think of it as a **blueprint** - defining *what exists* and *how things connect*.

### When to Use
- ✅ World layouts and scene composition
- ✅ Agent/NPC definitions with goals and behaviors
- ✅ AI-generated content (Brittney uses .holo)
- ✅ Object placement and spatial relationships
- ✅ Event flows and connections between nodes
- ✅ Templates and reusable patterns

### Features Included
```holo
// Objects and positioning
cube my_cube {
  position: [0, 1, 0]
  size: 1
  color: "#ff0000"
}

// Materials and appearance
sphere glass_ball {
  position: [2, 1, 0]
  material: glass
  opacity: 0.8
}

// Basic interactions
button start_btn {
  label: "Start"
  on_click: start_game
}

// Simple animations
animation rotate {
  target: my_cube
  property: rotation.y
  duration: 2s
  loop: true
}

// UI panels
panel settings_menu {
  position: [0, 1.5, -2]
  size: [1.2, 0.8]
  
  slider volume {
    range: [0, 100]
    default: 75
  }
}
```

### Features NOT Included
- ❌ Multiplayer networking
- ❌ Advanced physics (joints, constraints)
- ❌ Procedural generation
- ❌ Marketplace integration
- ❌ Version control
- ❌ Offline sync
- ❌ Party systems
- ❌ Analytics

### Icon
![HoloScript Icon](../packages/builder/icons/holoscript.svg)
- Holographic "H" symbol
- Cyan → Purple → Pink gradient
- Clean, approachable design

---

## `.hsplus` - HoloScript Plus (Advanced)

### What It Is
The **production-ready** format with access to all 10 system APIs for building full-featured applications.

### When to Use
- ✅ Production applications
- ✅ Multiplayer games and experiences
- ✅ Physics-based interactions
- ✅ AI-generated content
- ✅ Offline-first applications
- ✅ Cross-platform deployment (Web, Desktop, Mobile)
- ✅ Marketplace publishing

### All 10 System APIs

#### Tier 3 Systems (Advanced Features)
1. **NetworkedWorldState.hsplus** - Multiplayer synchronization
2. **PhysicsConstraints.hsplus** - Joints, springs, constraints
3. **ProceduralGeneration.hsplus** - Noise, terrain, AI-assisted generation

#### Tier 4 Systems (Platform Features)
4. **HoloScriptMarketplace.hsplus** - Asset marketplace client
5. **SceneVersionControl.hsplus** - Snapshots, diff, merge

#### Local-First Systems
6. **PartySystem.hsplus** - Local multiplayer parties
7. **LocalAnalytics.hsplus** - Privacy-preserving analytics
8. **OfflineSync.hsplus** - Offline-first with cloud sync
9. **LocalNetworking.hsplus** - Peer-to-peer connections
10. **ExampleWorlds.hsplus** - Built-in world templates

### Example Usage
```hsplus
// Import systems
import { NetworkedWorldState } from "./systems/NetworkedWorldState.hsplus"
import { PhysicsConstraints } from "./systems/PhysicsConstraints.hsplus"

// Multiplayer-synced object
networked_object player {
  sync_rate: 20hz
  interpolation: true
  
  position: synced
  rotation: synced
  health: synced
}

// Physics constraint
constraint door_hinge {
  type: hinge
  body_a: door
  body_b: frame
  axis: [0, 1, 0]
  limits: [-90deg, 0deg]
}

// Procedural terrain
terrain island {
  generator: perlin
  size: [100, 100]
  height_scale: 10
  seed: random
}

// Party system
party game_session {
  max_players: 4
  discovery: local_network
  
  on_player_join: spawn_player
  on_player_leave: cleanup_player
}
```

### Icon
![HoloScript Plus Icon](../packages/builder/icons/holoscript-plus.svg)
- Enhanced "H" symbol with gold "+" badge
- 5-color gradient (Cyan → Blue → Purple → Pink → Gold)
- Energy particles and connecting lines
- Premium/upgraded visual treatment

---

## Decision Flowchart

```
Start
  │
  ▼
┌─────────────────────────────────┐
│ Do you need multiplayer?        │
└─────────────────────────────────┘
  │ Yes → Use .hsplus
  │ No
  ▼
┌─────────────────────────────────┐
│ Do you need physics constraints │
│ (joints, springs, etc.)?        │
└─────────────────────────────────┘
  │ Yes → Use .hsplus
  │ No
  ▼
┌─────────────────────────────────┐
│ Do you need procedural          │
│ generation or AI content?       │
└─────────────────────────────────┘
  │ Yes → Use .hsplus
  │ No
  ▼
┌─────────────────────────────────┐
│ Do you need offline sync,       │
│ analytics, or marketplace?      │
└─────────────────────────────────┘
  │ Yes → Use .hsplus
  │ No
  ▼
┌─────────────────────────────────┐
│ Use .holo                       │
│ (Simple, clean, sufficient)     │
└─────────────────────────────────┘
```

---

## Learning Path

### Phase 1: `.holo` Fundamentals
1. Objects and positioning
2. Materials and colors
3. Basic interactions (click, hover)
4. Simple animations
5. UI panels and controls

### Phase 2: Upgrade to `.hsplus`
1. Add networking for multiplayer
2. Implement physics constraints
3. Use procedural generation
4. Integrate with marketplace
5. Add offline support

### Phase 3: Production
1. Full 10-system integration
2. Cross-platform deployment
3. Performance optimization
4. Analytics and monitoring

---

## File Association

### VS Code / Editor Integration
```json
{
  "files.associations": {
    "*.holo": "holoscript",
    "*.hsplus": "holoscript-plus"
  }
}
```

### Icon Theme
See [icon-theme.json](../packages/builder/icons/icon-theme.json) for file icon configuration.

---

## Common Questions

### Can I use .holo for production?
Yes, for **simple, single-user applications**. If your app doesn't need multiplayer, advanced physics, or system integrations, `.holo` is perfectly fine.

### Can I mix .holo and .hsplus?
Yes. You can import `.holo` content into `.hsplus` files. The upgrade path is seamless.

### Is .holo deprecated?
**No.** `.holo` is the intentional entry point for learning. It reduces cognitive load and lets users focus on core concepts before tackling advanced systems.

### Which format does Brittney AI generate?
Brittney generates both:
- Simple requests → `.holo` syntax
- Complex requests (multiplayer, physics, etc.) → `.hsplus` syntax

---

## Related Documentation

- [HoloScript Language Spec](./HOLOSCRIPT_LANGUAGE_SPEC.md)
- [Tier 3 & 4 Systems Guide](../packages/playground/src/systems/TIER3_TIER4_GUIDE.md)
- [Integration Complete](./INTEGRATION_COMPLETE.md)
- [Brittney Context](./BRITTNEY_CONTEXT.md)

---

**Last Updated**: January 2026  
**Version**: 1.0
