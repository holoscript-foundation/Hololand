# HoloScript File Types Guide

HoloScript provides **three specialized file formats**, each designed for a distinct domain of spatial computing. Understanding when to use each is key to building on HoloLand.

> **Key Insight**: HoloScript is three languages in one platform:
> - **`.hs`** = Core Language — templates, agents, logic, IoT streams, and spatial awareness
> - **`.hsplus`** = TypeScript for XR — build complete spatial applications with modules and types
> - **`.holo`** = Scene Graph — compose immersive worlds with environments and networking

For the full language reference, see the [HoloScript File Types Reference](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/FILE_TYPES.md).

---

## Quick Reference

| Extension | Domain | Parser | Primary Use Case |
|-----------|--------|--------|------------------|
| **`.holo`** | Scene Graph | `HoloCompositionParser` | Immersive worlds, environments, NPC dialogs, quests, networking |
| **`.hsplus`** | TypeScript for XR | `HoloScriptPlusParser` | Full applications: modules, types, physics, state machines, async |
| **`.hs`** | Core Language | `HoloScriptPlusParser` | Templates, agents, logic, IoT streams, spatial awareness, utilities |

All three parsers are **implemented and working** in `@holoscript/core` v3.43.0.

> **Note:** Both `.hs` and `.hsplus` use the same `HoloScriptPlusParser` — the difference is semantic, not syntactic. `.holo` uses a completely different declarative syntax via `HoloCompositionParser`.

---

## Three Formats, One Platform

```
┌──────────────────────────────────────────────────────────────┐
│                    .holo (Scene Graph)                        │
│   Declarative world compositions and immersive environments  │
│   NPC dialog trees, quest systems, multiplayer networking    │
│   Environment settings, spatial groups, portals, audio zones │
│   Compiles to 18+ targets (Unity, Unreal, WebXR, VRChat)    │
└───────────────┬──────────────────────────┬───────────────────┘
    imports     │                          │    imports
┌───────────────▼──────────────┐  ┌────────▼──────────────────────┐
│    .hs (Core Language)       │  │   .hsplus (TypeScript for XR)  │
│  Templates & components      │  │  Full programming language     │
│  Agent SDK & spatial queries │  │  Modules with import/export    │
│  IoT streams, gates, logic   │  │  Physics, joints, constraints  │
│  Zone systems, patrol AI     │  │  State machines, async/await   │
│  Reusable utilities          │  │  732-line pinball game         │
└──────────────────────────────┘  └────────────────────────────────┘
```

---

## `.holo` — Scene Graph

### What It Is

`.holo` files define **immersive world compositions** using a declarative scene graph syntax. They handle world layout, environments, NPC dialogs, quest systems, multiplayer networking, portals, and audio zones. This is the primary entry point for compilation to 18+ targets.

### When to Use in HoloLand

- Creating complete VR/AR worlds and experiences
- AI-generated scenes (Brittney output format)
- Composing worlds with NPC dialogs, quests, and spatial groups
- Exporting to HoloLand's portal network
- Building multiplayer experiences

### Syntax

```holo
composition "VR Escape Room" {
  environment {
    skybox: "none"
    ambient_light: 0.1
    fog: { enabled: true, color: "#111122", density: 0.05 }
  }

  state GameState {
    started: false
    timeRemaining: 3600
    puzzlesSolved: 0
  }

  spatial_group "Puzzle_CombinationLock" {
    object "SafeBox" {
      geometry: "model/safe.glb"
      position: [-4, 1, -4]

      state {
        locked: true
        combination: [7, 2, 5]
        entered: [0, 0, 0]
      }
    }

    object "Dial1" {
      @clickable
      @rotatable
      geometry: "cylinder"
      position: [-4.2, 1.1, -3.7]

      onClick: {
        this.state.value = (this.state.value + 1) % 10
        SafeBox.state.entered[0] = this.state.value
      }
    }
  }
}
```

### Key Constructs

| Construct | Purpose | Example |
|-----------|---------|---------|
| `composition {}` | Top-level scene definition | `composition "My World" { ... }` |
| `environment {}` | Scene settings (skybox, lighting, fog) | `environment { skybox: "sunset" }` |
| `state {}` | Centralized state management | `state GameState { score: 0 }` |
| `spatial_group {}` | Group objects with shared logic | `spatial_group "Room1" { ... }` |
| `object {}` | Named object in the scene | `object "Cube" { geometry: "cube" }` |
| `template {}` | Reusable object blueprints | `template "Button" { @clickable }` |
| `logic {}` | Scene-level actions and events | `logic { on_enter { ... } }` |

---

## `.hs` — Core Language

### What It Is

`.hs` files are the **core HoloScript language** — versatile files used for templates, components, agent behaviors, IoT streams, logic gates, utility functions, and reusable libraries. They serve as the building blocks that `.holo` compositions import and assemble.

### When to Use in HoloLand

- Reusable templates and component blueprints (Button, Door, NPC)
- Agent orchestration with spatial awareness and patrol AI
- IoT data pipelines with streams, gates, and connections
- Utility functions and shared libraries across worlds
- Zone-based behaviors (safe zones, combat arenas, treasure rooms)

### Syntax

```hs
// Templates & Components
template Button {
  geometry: "cylinder"
  scale: [0.2, 0.05, 0.2]
  @clickable
  @pointable
  @glowing
}

// Functions and utilities
function calculateDistance(a, b) {
  return sqrt((a.x - b.x)^2 + (a.y - b.y)^2 + (a.z - b.z)^2)
}

// IoT streams and data processing
stream TemperatureData from IoTSensor {
  filter: value > 0
  transform: celsius_to_fahrenheit
  aggregate: moving_average(window: 10)
}

// Logic gates for automation
gate SafetyCheck {
  condition: temperature < 100
  true_path: continue_operation
  false_path: emergency_shutdown
}

// Agent SDK — spatial awareness and patrol
template "GuardAgent" {
  @agent {
    type: "guard"
    capabilities: ["patrol", "combat", "alert"]
  }

  @spatialAwareness {
    detection_radius: 15
    track_agents: true
    alert_on: ["player", "intruder"]
  }

  @patrol {
    zone: "TreasureRoom"
    waypoints: [[-45,1,-55], [-55,1,-55], [-55,1,-45], [-45,1,-45]]
    speed: 2
  }

  on entityNearby(entity, layer) {
    if (entity.type == "player" && !entity.hasAccess) {
      broadcast("guard_channel", {
        type: "intruder_detected",
        location: entity.position
      })
    }
  }
}

// Zone definitions
zone "TreasureRoom" {
  shape: "sphere"
  center: [-50, 5, -50]
  radius: 15
  type: "treasure"
  properties: { access_level: "key_required" }
}
```

### Key Constructs

| Construct | Purpose | Example |
|-----------|---------|---------|
| `template {}` | Reusable object blueprint | `template Button { @clickable }` |
| `orb {}` | Spatial object instance | `orb player { health: 100 }` |
| `function` | Imperative logic | `function attack() { ... }` |
| `connect` | Wire objects together | `connect A to B as "link"` |
| `stream` | Data stream pipeline | `stream Data from Sensor { ... }` |
| `gate` | Logic gate for automation | `gate Check { condition: ... }` |
| `zone` | Spatial zone definition | `zone "Safe" { shape: "sphere" }` |
| `@agent` | Agent behavior decorator | `@agent { type: "guard" }` |
| `@spatialAwareness` | Proximity detection | `@spatialAwareness { radius: 15 }` |
| `@patrol` | Patrol route definition | `@patrol { waypoints: [...] }` |

---

## `.hsplus` — TypeScript for XR

### What It Is

`.hsplus` is a **full programming language** — think TypeScript designed specifically for spatial computing. It provides modules, types, physics primitives, state machines, joints, event handlers, and async/await. Not an "advanced" version of HoloScript — it's a complete language for building complex interactive experiences.

### When to Use in HoloLand

- Building complete games with physics (pinball, shooters, puzzles)
- Complex game systems with module organization
- Physics simulations (joints, constraints, collision handlers)
- State machines with reactive updates
- Typed variables and functions for production code
- Robotics simulations (URDF, USD, SDF export)

### Syntax

```hsplus
// Module system with TypeScript types
module GameState {
  export let score: number = 0;
  export let ballsRemaining: number = 3;
  export let multiplier: number = 1;

  export function addScore(points: number) {
    score += points * multiplier;
    emit("score_changed", score);
  }

  export function loseBall() {
    ballsRemaining--;
    emit("ball_lost", ballsRemaining);
    if (ballsRemaining <= 0) {
      emit("game_over", score);
    }
  }
}

// Physics module with interfaces
module PinballPhysics {
  const GRAVITY = 9.8;
  const BALL_MASS = 0.08;
  const FLIPPER_SPEED = 1700;

  export interface BallState {
    position: Vector3;
    velocity: Vector3;
  }

  export function applyTableGravity(ball: BallState, dt: number) {
    const tiltRad = TABLE_TILT * Math.PI / 180;
    ball.velocity.z += GRAVITY * Math.sin(tiltRad) * dt;
  }
}

// Physics objects with joints and event handlers
template "Flipper" {
  @kinematic
  @collidable
  geometry: "box"

  joint: {
    type: "hinge"
    anchor: [-0.75, 0.25, 2.2]
    axis: [0, 1, 0]
    limits: [-30, 30]
    motor_speed: 1700
  }

  @on_event("flipper_left"): (active) => {
    this.rotation.y = active ? 45 : 15;
    play_sound("flipper_up");
  }
}
```

### Key Constructs (beyond `.hs`)

| Construct | Purpose | Example |
|-----------|---------|---------|
| `module {}` | Code organization | `module Physics { ... }` |
| `export` / `import` | Module system | `export function calc() { ... }` |
| `interface` | Type definitions | `interface BallState { ... }` |
| `joint` | Physics joints | `joint: { type: "hinge" }` |
| `@on_event` | Event handlers | `@on_event("click"): () => { ... }` |
| `@on_collision` | Collision response | `@on_collision: (other) => { ... }` |
| Arrow functions | Callbacks | `(x) => { x * 2 }` |
| `async/await` | Async operations | `await moveTo(target)` |

---

## How They Work Together in HoloLand

### Project Structure

```
my-hololand-world/
├── main.holo                    # Scene graph — compile & publish this
├── scenes/
│   ├── lobby.holo               # World composition
│   └── game-arena.holo          # Another world
├── agents/
│   ├── guard.hs                 # Agent SDK — patrol AI
│   ├── shopkeeper.hs            # Agent — merchant behavior
│   └── companion.hs             # Agent — follower AI
├── components/
│   ├── combat.hsplus            # TypeScript for XR — damage, physics
│   ├── inventory.hsplus         # TypeScript for XR — item management
│   └── ui.hsplus                # TypeScript for XR — HUD, menus
├── templates/
│   ├── ui/
│   │   ├── Button.hs            # Reusable button template
│   │   └── HUD.hs
│   └── environment/
│       ├── Tree.hs
│       └── Door.hs
└── logic/
    ├── scoring.hs               # Shared scoring logic
    └── inventory.hs             # Shared inventory utils
```

### Import Flow

```holo
// In main.holo — import agents and templates from .hs and .hsplus files
composition "My HoloLand World" {
  import { GuardAgent } from "./agents/guard.hs"
  import { Button } from "./templates/ui/Button.hs"
  import { CombatSystem } from "./components/combat.hsplus"

  environment {
    skybox: "sunset_4k"
    ambient_light: 0.6
  }

  object "StartButton" {
    ...Button
    position: [0, 1.5, -2]
    color: "#00ff00"
  }
}
```

### Compilation & Publishing

```bash
# Compile for HoloLand deployment
holoscript compile main.holo --target web -o dist/

# Publish to HoloLand portal network
holoscript publish main.holo --public

# Compile for other platforms
holoscript compile main.holo --target unity -o dist/unity/
holoscript compile main.holo --target vrchat -o dist/vrchat/
```

---

## Decision Tree

```
Need to create ->
  |
  +-- Immersive world, environment, or scene? -> .holo
  |
  +-- Reusable template or component? -> .hs
  |
  +-- Agent AI, spatial awareness, or patrol? -> .hs
  |
  +-- IoT streams, gates, or data pipelines? -> .hs
  |
  +-- Game with physics, modules, or types? -> .hsplus
  |
  +-- Robotics simulation (URDF/USD)? -> .hsplus
  |
  +-- Maximum portability & simplicity? -> .holo
```

---

## Key Differences from `.hs`/`.hsplus`

| Aspect | `.hs` / `.hsplus` | `.holo` |
|--------|-------------------|---------|
| **Top-level** | Flat: `orb`, `function`, `connect` | Nested: `composition {}` |
| **Objects** | `orb name {}` or `template Name {}` | `object "name" {}` |
| **Environment** | Implicit | Explicit `environment {}` block |
| **State** | Inside orbs / modules | Centralized `state {}` block |
| **Logic** | `function` at top level | `logic {}` block with `action` |
| **Templates** | `template Name {}` | `template "Name" {}` |
| **Grouping** | N/A | `spatial_group "Name" {}` |
| **Focus** | Object/module-focused | Entire scene as unit |

---

## Common Questions

### What's the difference between .hs and .hsplus?

Same parser, different scope. `.hs` is for focused components: templates, agents, IoT streams, utilities. `.hsplus` is a full programming language with modules, types, physics, and async/await. Think of `.hs` as building blocks, `.hsplus` as complete applications.

### Can I mix formats?

Yes. `.holo` files import from `.hs` and `.hsplus` files. This is the recommended pattern — compose worlds in `.holo`, build components in `.hs`, write complex logic in `.hsplus`.

### Which format does Brittney AI generate?

Brittney generates `.holo` for scene descriptions and world layouts, and `.hsplus` for complex logic and game systems.

### Which should I learn first?

Start with `.holo` if you're building worlds (most HoloLand users). Learn `.hs` for custom templates and agents. Use `.hsplus` when you need a full programming language.

---

## Format Comparison

| Feature | `.hs` | `.hsplus` | `.holo` |
|---------|-------|-----------|---------|
| **Parser** | HoloScriptPlusParser | HoloScriptPlusParser | HoloCompositionParser |
| **Status** | Implemented | Implemented | Implemented |
| **Orb syntax** | Yes | Yes | No |
| **Composition syntax** | No | No | Yes |
| **VR Traits** | Yes | Yes | Yes (via import) |
| **Modules** | No | Yes | No |
| **Types/Interfaces** | No | Yes | No |
| **Physics/Joints** | Basic | Full | Via import |
| **Templates** | Yes | Yes | Yes |
| **Environment block** | No | No | Yes |
| **Agent SDK** | Yes | Yes | Via import |
| **AI-friendly** | Medium | Medium | High |

---

## Related Documentation

- [HoloScript File Types Reference](https://github.com/brianonbased-dev/HoloScript/blob/main/docs/FILE_TYPES.md) — Full language reference
- [HoloScript Language Spec](./HOLOSCRIPT_LANGUAGE_SPEC.md) — Grammar and syntax specification
- [Brittney Context](./BRITTNEY_CONTEXT.md) — AI training and generation
- [Platform Vision](./PLATFORM_VISION.md) — HoloLand platform architecture

---

**Last Updated**: March 2026
**HoloScript Version**: v3.43.0
