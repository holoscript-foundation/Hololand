# GitHub Copilot Instructions for Hololand

## Project Overview

Hololand is a VR/AR platform using HoloScript - a visual flow language designed for AI agents to understand and generate 3D worlds.

## Three File Formats

| Extension | Purpose | Syntax Style | Status |
|-----------|---------|--------------|--------|
| `.hs` | Classic HoloScript | Object-centric (`orb {}`) | ✅ Working |
| `.hsplus` | HoloScript Plus | Object + VR traits | ✅ Working |
| `.holo` | Declarative Composition | Scene-centric (`composition {}`) | 🚧 Parser planned |

---

### .hs - Classic HoloScript
- **For**: Simple prototypes, learning, single-file demos
- **Syntax**: `orb {}`, `function`, `connect`
- **Parser**: ✅ Implemented in `@holoscript/core`

```hs
orb player {
  position: { x: 0, y: 1.6, z: 0 }
  health: 100
  color: "#00ffff"
}

function attack(target) {
  target.health -= 10
}

connect inventory to player as "items"
execute init
```

---

### .hsplus - HoloScript Plus (Advanced)
- **For**: Production apps, VR traits, networking, physics
- **Syntax**: Same as `.hs` + `@traits`, `state {}`, `stream`
- **Parser**: ✅ Implemented in `@holoscript/core`

```hsplus
orb player {
  @grabbable
  @collidable
  @networked
  
  position: [0, 1.6, 0]
  
  state {
    health: 100
    isAlive: true
  }
}

networked_object syncedPlayer {
  sync_rate: 20hz
  position: synced
}
```

---

### .holo - Declarative World Language (AI-Focused)
- **For**: AI agents, visual tools, scene composition
- **Syntax**: `composition {}`, `environment {}`, `template {}`
- **Parser**: 🚧 **Planned** (not yet in @holoscript/core)

```holo
composition "Scene Name" {
  environment {
    skybox: "nebula"
    ambient_light: 0.3
  }

  template "Enemy" {
    state { health: 100 }
    action attack(target) { }
  }

  spatial_group "Battlefield" {
    object "Goblin_1" using "Enemy" { position: [0, 0, 5] }
    object "Goblin_2" using "Enemy" { position: [3, 0, 5] }
  }

  logic {
    on_player_attack(enemy) {
      enemy.health -= 10
    }
  }
}
```

---

## When to Use Each

```
AI generating a scene? → .holo (composition syntax)
Need VR traits/networking? → .hsplus
Simple prototype? → .hs
```

## Quick Reference

### .hs / .hsplus Syntax
| Construct | Example |
|-----------|---------|
| Object | `orb name { property: value }` |
| Function | `function name() { ... }` |
| Connect | `connect A to B as "link"` |
| VR Trait (.hsplus) | `@grabbable`, `@collidable` |
| State (.hsplus) | `state { key: value }` |

### .holo Syntax
| Construct | Example |
|-----------|---------|
| Composition | `composition "Name" { }` |
| Environment | `environment { skybox: "..." }` |
| Template | `template "Type" { state {}, action() {} }` |
| Object | `object "Name" { position: [x,y,z] }` |
| Spatial Group | `spatial_group "Area" { objects... }` |
| Logic | `logic { on_event { action() } }` |

## File Organization

- `*.hs` - Simple demos, prototypes
- `*.hsplus` - Game systems, complex logic, networking
- `*.holo` - Scene definitions, AI-generated content (when parser ready)
- `/packages/` - Core libraries and tooling
- `/examples/` - Reference implementations

## Key Insight

- `.hs`/`.hsplus` = **Object-centric** (define orbs, wire them together)
- `.holo` = **Scene-centric** (define entire composition as a unit)

When generating for AI/visual tools, prefer `.holo` syntax. When writing imperative code, use `.hs`/`.hsplus`.
