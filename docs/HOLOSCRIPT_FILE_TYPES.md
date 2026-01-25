# HoloScript File Types Guide

HoloScript has **three file formats** that serve different purposes. Understanding when to use each is key to productive development.

---

## Quick Summary

| Extension | Purpose | Syntax Style | Parser Status |
|-----------|---------|--------------|---------------|
| `.hs` | Classic HoloScript | Object-centric (`orb {}`) | ✅ Implemented |
| `.hsplus` | HoloScript Plus | Object-centric + VR traits | ✅ Implemented |
| `.holo` | Declarative Composition | Scene-centric (`composition {}`) | ✅ Implemented |

> **Key Insight:** `.hs` and `.hsplus` use the same parser with the same syntax. `.holo` uses a completely different declarative syntax for scene-level composition.

---

## `.hs` - Classic HoloScript

### What It Is
The **original HoloScript format** - an object-centric language for defining spatial objects, functions, and connections.

### When to Use
- ✅ Simple worlds and prototypes
- ✅ Learning HoloScript basics
- ✅ Single-file demos
- ✅ Configuration and simple logic

### Syntax
```hs
// Define orbs (spatial objects)
orb greeting {
  message: "Hello, HoloScript World!"
  color: "#00ffff"
  glow: true
  position: { x: 0, y: 1.5, z: -2 }
}

// Functions for behavior
function displayGreeting() {
  show greeting
  pulse greeting with duration 1000
}

// Connect objects together
connect memoryStore to agentCore as "knowledge"

// Execute on load
execute displayGreeting
```

### Key Constructs
| Construct | Purpose | Example |
|-----------|---------|---------|
| `orb {}` | Define a spatial object | `orb player { health: 100 }` |
| `function` | Imperative logic | `function attack() { ... }` |
| `connect` | Wire objects together | `connect A to B as "link"` |
| `execute` | Run on load | `execute init` |

---

## `.hsplus` - HoloScript Plus (Advanced)

### What It Is
The **production-ready format** extending `.hs` with VR traits, networking, and advanced features. Uses the **same syntax** as `.hs` but unlocks more capabilities.

### When to Use
- ✅ VR/AR experiences with @traits
- ✅ Multiplayer games
- ✅ Physics-based interactions
- ✅ Production applications
- ✅ Cross-platform deployment

### Syntax (extends .hs)
```hsplus
// Orbs with VR traits
orb player {
  @grabbable
  @collidable
  @networked
  
  position: [0, 1.6, 0]
  health: 100
  
  state {
    isAlive: true
    score: 0
  }
}

// Typed functions
function takeDamage(amount: number): void {
  player.health -= amount
  if player.health <= 0 {
    player.state.isAlive = false
    emit "player_died"
  }
}

// Reactive streams
stream userInput {
  source: microphone
  through: [transcribe, normalize, classify]
  subscribe: handleVoiceCommand
}

// Networking
networked_object syncedPlayer {
  sync_rate: 20hz
  interpolation: true
  
  position: synced
  rotation: synced
  health: synced
}
```

### Additional Constructs (beyond .hs)
| Construct | Purpose | Example |
|-----------|---------|---------|
| `@trait` | VR/physics behaviors | `@grabbable`, `@collidable` |
| `state {}` | Reactive state container | `state { health: 100 }` |
| `stream` | Reactive data streams | `stream input { ... }` |
| `networked_object` | Multiplayer sync | `networked_object player { ... }` |
| `constraint` | Physics joints | `constraint hinge { type: hinge }` |

### All 10 System APIs

#### Tier 3 Systems (Advanced Features)
1. **NetworkedWorldState** - Multiplayer synchronization
2. **PhysicsConstraints** - Joints, springs, constraints
3. **ProceduralGeneration** - Noise, terrain, AI-assisted generation

#### Tier 4 Systems (Platform Features)
4. **HoloScriptMarketplace** - Asset marketplace client
5. **SceneVersionControl** - Snapshots, diff, merge

#### Local-First Systems
6. **PartySystem** - Local multiplayer parties
7. **LocalAnalytics** - Privacy-preserving analytics
8. **OfflineSync** - Offline-first with cloud sync
9. **LocalNetworking** - Peer-to-peer connections
10. **ExampleWorlds** - Built-in world templates

---

## `.holo` - Declarative Composition (AI-Focused)

### What It Is
A **scene-centric, declarative format** designed for AI agents to read and write. Defines entire compositions as units with environment, state, and logic blocks.

> ⚠️ **Status:** Parser is planned but not yet implemented in `@holoscript/core`. The format is defined and used in documentation.

### When to Use
- ✅ AI-generated worlds (Brittney output)
- ✅ Scene composition and layouts
- ✅ Template-based content
- ✅ High-level world architecture
- ✅ Cross-tool interoperability

### Syntax (Different from .hs/.hsplus!)
```holo
composition "Landing Experience" {
  // Environment configuration
  environment {
    theme: "spaceship-command"
    skybox: "deep_space_nebula_4k"
    ambient_light: 0.3
    
    particle_system "stardust" {
      count: 200
      spread: 50
      speed: 0.1
    }
  }
  
  // Centralized state
  state {
    newsletter_email: ""
    form_status: "idle"
    visitors: 0
  }
  
  // Object templates
  template "InteractivePanel" {
    size: [1.2, 0.8]
    material: "glass"
    
    state { 
      isActive: false 
    }
    
    action toggle() {
      this.state.isActive = !this.state.isActive
    }
  }
  
  // Spatial layout
  spatial_group "MainHub" {
    object "WelcomePanel" using "InteractivePanel" {
      position: [0, 1.5, -3]
    }
    
    object "InfoKiosk" {
      model: "kiosk_v2"
      position: [2, 0, -2]
      interactive: true
    }
  }
  
  // Scene logic
  logic {
    on_enter {
      state.visitors += 1
      animate "WelcomePanel" { scale: [1.1, 1.1, 1.1], duration: 0.3 }
    }
    
    action submit_newsletter() {
      if validate_email(state.newsletter_email) {
        state.form_status = "submitting"
        await api_call("/newsletter/subscribe", { email: state.newsletter_email })
        state.form_status = "success"
      }
    }
  }
}
```

### Key Differences from .hs/.hsplus

| Aspect | `.hs` / `.hsplus` | `.holo` |
|--------|-------------------|---------|
| **Top-level** | Flat: `orb`, `function`, `connect` | Nested: `composition {}` |
| **Objects** | `orb name {}` | `object "name" {}` |
| **Environment** | Implicit | Explicit `environment {}` block |
| **State** | Inside orbs | Centralized `state {}` block |
| **Logic** | `function` at top level | `logic {}` block with `action` |
| **Templates** | N/A | `template "Name" {}` |
| **Grouping** | N/A | `spatial_group "Name" {}` |
| **Focus** | Object-by-object | Entire scene as unit |

### Why Two Syntaxes?

| Format | Best For | Think Of It As |
|--------|----------|----------------|
| `.hs`/`.hsplus` | Developers writing code | "Programming in 3D space" |
| `.holo` | AI agents, visual tools | "Blueprint/schematic" |

**They will interoperate:** `.holo` files can reference `.hsplus` modules for complex logic, and Brittney can generate either format based on task complexity.

---

## Decision Flowchart

```
Start
  │
  ▼
┌─────────────────────────────────┐
│ Are you an AI agent or visual   │
│ tool generating a scene?        │
└─────────────────────────────────┘
  │ Yes → Use .holo (composition syntax)
  │ No
  ▼
┌─────────────────────────────────┐
│ Do you need VR traits, physics, │
│ networking, or system APIs?     │
└─────────────────────────────────┘
  │ Yes → Use .hsplus
  │ No
  ▼
┌─────────────────────────────────┐
│ Use .hs                         │
│ (Simple, clean, sufficient)     │
└─────────────────────────────────┘
```

---

## Learning Path

### Phase 1: `.hs` Fundamentals
1. Orbs and positioning (`orb {}`)
2. Properties and colors
3. Functions for behavior
4. Connecting objects (`connect A to B`)
5. Execute on load

### Phase 2: Upgrade to `.hsplus`
1. Add VR traits (`@grabbable`, `@collidable`)
2. Use `state {}` for reactive state
3. Add networking for multiplayer
4. Implement physics constraints
5. Use reactive streams

### Phase 3: `.holo` for AI/Visual Tools
1. Understand `composition {}` syntax
2. Use `environment {}` for scene setup
3. Define reusable `template {}` blocks
4. Organize with `spatial_group {}`
5. Centralize with `state {}` and `logic {}`

### Phase 4: Production
1. Full 10-system integration
2. Cross-platform deployment
3. Mix formats as needed
4. Analytics and monitoring

---

## File Association

### VS Code / Editor Integration
```json
{
  "files.associations": {
    "*.hs": "holoscriptplus",
    "*.holo": "holoscript",
    "*.hsplus": "holoscriptplus"
  }
}
```

### Icon Theme
See [icon-theme.json](../packages/builder/icons/icon-theme.json) for file icon configuration.

---

## Common Questions

### What's the difference between .hs and .hsplus?
Same syntax, different capabilities. `.hsplus` enables VR traits, networking, physics, and system APIs. Think of `.hsplus` as `.hs` with superpowers.

### Is .holo the same as .hs?
**No.** They use completely different syntax:
- `.hs`: Object-centric → `orb player { ... }`
- `.holo`: Scene-centric → `composition "World" { ... }`

### Can I use .holo now?
The format is **defined but the parser is not yet implemented** in `@holoscript/core`. It's used in documentation and AI training data. Parser coming soon.

### Can I mix formats?
Yes (planned). `.holo` files will be able to import `.hsplus` modules for complex logic.

### Which format does Brittney AI generate?
Brittney can generate both:
- Scene descriptions → `.holo` syntax (composition)
- Complex logic → `.hsplus` syntax (orb + traits)

### Which should I learn first?
Start with `.hs` to understand the fundamentals. Upgrade to `.hsplus` when you need advanced features. Learn `.holo` if you're building AI integrations or visual tools.

---

## Format Comparison Table

| Feature | `.hs` | `.hsplus` | `.holo` |
|---------|-------|-----------|---------|
| **Parser** | ✅ | ✅ | ✅ Implemented |
| **Orb syntax** | ✅ | ✅ | ❌ |
| **Composition syntax** | ❌ | ❌ | ✅ |
| **VR Traits** | ❌ | ✅ | ❌ |
| **Networking** | ❌ | ✅ | ❌ |
| **Physics** | ❌ | ✅ | ❌ |
| **Templates** | ❌ | ❌ | ✅ |
| **Environment block** | ❌ | ❌ | ✅ |
| **AI-friendly** | Medium | Medium | High |
| **Human-friendly** | High | High | High |

---

## Related Documentation

- [HoloScript Language Spec](./HOLOSCRIPT_LANGUAGE_SPEC.md)
- [Tier 3 & 4 Systems Guide](../packages/playground/src/systems/TIER3_TIER4_GUIDE.md)
- [Integration Complete](./INTEGRATION_COMPLETE.md)
- [Brittney Context](./BRITTNEY_CONTEXT.md)

---

**Last Updated**: January 2026  
**Version**: 2.0 (Added .hs documentation, clarified .holo status)
