# HoloScript Plus (.hsplus) Language Specification

**Version**: 2.0.0
**Status**: Draft
**Date**: January 2026

---

## Overview

HoloScript Plus (`.hsplus`) extends HoloScript (`.holo`) with full programming capabilities while maintaining spatial computing as its core domain.

| Feature | `.holo` | `.hsplus` |
|---------|---------|-----------|
| Orbs/Objects | ✅ | ✅ |
| Properties | ✅ | ✅ |
| Events | ✅ | ✅ |
| Imports | `.holo` only | All |
| Variables | ❌ | ✅ |
| Functions | ❌ | ✅ |
| Control flow | ❌ | ✅ |
| Systems | ❌ | ✅ |
| File I/O | ❌ | ✅ |
| Network | ❌ | ✅ |
| String ops | ❌ | ✅ |
| Collections | ❌ | ✅ |
| Async/await | ❌ | ✅ |
| Macros | ❌ | ✅ |
| Meta-programming | ❌ | ✅ |

---

## Standard Library

### `@holoscript/std` - Core utilities

```hsplus
import {
  // Types
  Vec3, Quat, Color, Transform,

  // Math
  math, random, noise,

  // Collections
  List, Map, Set,

  // Strings
  string,

  // Time
  time, timer, interval,

  // Console
  log, warn, error, debug,
} from "@holoscript/std"
```

### `@holoscript/fs` - File system (agents/build tools)

```hsplus
import {
  read, write, exists, glob, watch,
  readJson, writeJson,
  mkdir, rm, cp, mv,
} from "@holoscript/fs"

// Example: Agent reads a scene file
let scene = read("./worlds/lobby.holo")
let parsed = parse(scene)
```

### `@holoscript/net` - Networking

```hsplus
import {
  fetch, ws, rtc,
  http, rest,
} from "@holoscript/net"

// Example: Agent fetches data
let response = await fetch("https://api.example.com/worlds")
let worlds = response.json()
```

### `@holoscript/spatial` - 3D utilities

```hsplus
import {
  raycast, intersect, distance,
  bounds, contains, overlap,
  pathfind, navmesh,
  transform, lerp, slerp,
} from "@holoscript/spatial"
```

### `@holoscript/physics` - Physics engine

```hsplus
import {
  RigidBody, Collider, Joint,
  gravity, force, impulse,
  raycast as physicsRaycast,
} from "@holoscript/physics"
```

### `@holoscript/ai` - AI agent utilities

```hsplus
import {
  llm, embed, similarity,
  memory, context,
  plan, execute,
} from "@holoscript/ai"

// Example: Agent generates content
let description = await llm.complete("Describe a fantasy castle")
let embedding = await embed(description)
```

---

## Language Features

### Variables & Types

```hsplus
// Immutable by default
let name = "Player"
let position: Vec3 = [0, 1, 0]
let health: int = 100
let speed: float = 5.0
let active: bool = true

// Mutable
var score = 0
score += 10

// Type inference
let items = ["sword", "shield", "potion"]  // List<string>
let inventory = { gold: 100, gems: 5 }     // Map<string, int>

// Nullable
let target: Orb? = null
```

### Functions

```hsplus
// Basic function
fn greet(name: string) -> string {
  return "Hello, " + name
}

// With default params
fn spawn_enemy(type: string, level: int = 1, pos: Vec3 = [0, 0, 0]) -> Orb {
  return orb {
    model: "enemies/" + type + ".glb"
    position: pos
    data: { level: level }
  }
}

// Async function
async fn load_world(name: string) -> World {
  let data = await fetch("/api/worlds/" + name)
  return parse(data.json())
}

// Arrow functions
let double = (x: int) => x * 2
let positions = enemies.map(e => e.position)
```

### Control Flow

```hsplus
// If/else
if health <= 0 {
  trigger("game_over")
} else if health < 20 {
  show_warning("Low health!")
}

// Match (pattern matching)
match enemy.type {
  "goblin" => damage = 10
  "dragon" => damage = 50
  "boss" => {
    damage = 100
    play_sound("boss_attack.mp3")
  }
  _ => damage = 5
}

// Loops
for item in inventory {
  log(item.name)
}

for i in 0..10 {
  spawn_enemy("goblin", level: i)
}

while game_active {
  update()
  await frame()
}

// Loop control
for enemy in enemies {
  if enemy.dead { continue }
  if player.escaped { break }
  enemy.chase(player)
}
```

### Collections

```hsplus
// Lists
let enemies: List<Orb> = []
enemies.push(goblin)
enemies.push(dragon)
let first = enemies[0]
let count = enemies.length

// Functional operations
let alive = enemies.filter(e => e.health > 0)
let positions = enemies.map(e => e.position)
let total_hp = enemies.reduce((sum, e) => sum + e.health, 0)
let boss = enemies.find(e => e.type == "boss")

// Maps
let scores: Map<string, int> = {}
scores["player1"] = 100
scores.set("player2", 200)
let p1_score = scores.get("player1")

// Sets
let visited: Set<string> = Set.new()
visited.add("room1")
if visited.has("room1") { ... }
```

### Systems (State Machines)

```hsplus
system game_state {
  state: {
    phase: "menu"      // "menu" | "playing" | "paused" | "gameover"
    score: 0
    level: 1
    lives: 3
  }

  on "start_game": {
    state.phase = "playing"
    state.score = 0
    state.level = 1
    load_level(1)
  }

  on "pause": {
    if state.phase == "playing" {
      state.phase = "paused"
      time.scale = 0
    }
  }

  on "resume": {
    state.phase = "playing"
    time.scale = 1
  }

  on "player_died": {
    state.lives -= 1
    if state.lives <= 0 {
      state.phase = "gameover"
      emit("game_over")
    } else {
      respawn_player()
    }
  }

  on "level_complete": {
    state.level += 1
    state.score += 1000 * state.level
    await transition_effect()
    load_level(state.level)
  }
}
```

### Async/Await

```hsplus
// Async functions
async fn load_assets() {
  let [models, textures, sounds] = await Promise.all([
    load_models(),
    load_textures(),
    load_sounds(),
  ])
  return { models, textures, sounds }
}

// Sequential async
async fn cutscene() {
  await camera.move_to([0, 5, 10], duration: 2)
  await dialog.show("Welcome, hero!")
  await wait(1.0)
  await npc.walk_to([5, 0, 0])
  await dialog.show("Follow me...")
}

// Timers
await wait(2.0)  // Wait 2 seconds

every 1.0 {  // Run every second
  update_timer()
}

after 5.0 {  // Run once after 5 seconds
  spawn_boss()
}
```

### Macros (Meta-programming)

```hsplus
// Define a macro
macro spawn_grid(type, rows, cols, spacing) {
  for r in 0..rows {
    for c in 0..cols {
      orb {
        type: type
        position: [c * spacing, 0, r * spacing]
      }
    }
  }
}

// Use the macro
spawn_grid!("tree", 10, 10, 5)

// Macro for component pattern
macro component(name, props, body) {
  fn name(props) -> Orb {
    orb name {
      ...props
      body
    }
  }
}

component!(Button, { label: string, on_click: fn }) {
  model: "ui/button.glb"
  text: props.label
  on_click: props.on_click
}
```

---

## Agent Capabilities

### World Generation

```hsplus
// agents/world_builder.hsplus
import { llm, spatial, noise } from "@holoscript/ai"
import { write } from "@holoscript/fs"

async fn generate_world(prompt: string) -> string {
  // Use AI to plan the world
  let plan = await llm.complete(
    "Plan a 3D world based on: " + prompt +
    "\nOutput JSON with: name, theme, regions, landmarks"
  )

  let world_data = JSON.parse(plan)

  // Generate terrain
  let terrain = generate_terrain(world_data.theme)

  // Place landmarks
  let landmarks = []
  for landmark in world_data.landmarks {
    let pos = find_suitable_position(terrain, landmark.type)
    landmarks.push(orb {
      name: landmark.name
      model: get_model_for(landmark.type)
      position: pos
      scale: landmark.scale or [1, 1, 1]
    })
  }

  // Generate the .holo file
  let holo_code = serialize_world(world_data.name, terrain, landmarks)

  // Write to file
  write("./worlds/" + world_data.name + ".holo", holo_code)

  return world_data.name
}

fn generate_terrain(theme: string) -> Terrain {
  let heightmap = match theme {
    "mountains" => noise.fbm(8, 0.5, 2.0)
    "islands" => noise.voronoi(seed: random.int())
    "plains" => noise.perlin(scale: 0.1)
    _ => noise.flat()
  }

  return terrain {
    heightmap: heightmap
    size: [1000, 1000]
    resolution: 256
  }
}
```

### NPC Behavior

```hsplus
// agents/npc_controller.hsplus
import { llm, memory } from "@holoscript/ai"
import { pathfind } from "@holoscript/spatial"

system npc_ai {
  state: {
    npcs: Map<string, NpcState>
    conversations: Map<string, List<Message>>
  }

  async fn process_npc(npc_id: string, player_input: string) {
    let npc = state.npcs.get(npc_id)
    let history = state.conversations.get(npc_id) or []

    // Build context
    let context = {
      npc_name: npc.name,
      npc_personality: npc.personality,
      npc_knowledge: npc.knowledge,
      location: npc.current_location,
      time_of_day: time.get_hour(),
      recent_events: memory.get_recent(npc_id, 5),
      conversation: history,
    }

    // Get AI response
    let response = await llm.chat({
      system: build_npc_prompt(context),
      messages: history,
      user: player_input,
    })

    // Parse for actions
    let { dialog, action, emotion } = parse_response(response)

    // Execute action if any
    if action {
      match action.type {
        "move" => {
          let path = pathfind(npc.position, action.target)
          await npc.follow_path(path)
        }
        "give_item" => {
          player.inventory.add(action.item)
          npc.inventory.remove(action.item)
        }
        "attack" => {
          npc.start_combat(action.target)
        }
      }
    }

    // Update state
    npc.emotion = emotion
    history.push({ role: "user", content: player_input })
    history.push({ role: "assistant", content: dialog })
    memory.store(npc_id, { player_input, response, action })

    return dialog
  }
}
```

### Scene Analysis

```hsplus
// agents/scene_analyzer.hsplus
import { read, glob } from "@holoscript/fs"
import { embed, similarity } from "@holoscript/ai"

async fn analyze_scene(scene_path: string) -> Analysis {
  let source = read(scene_path)
  let ast = parse(source)

  let analysis = {
    orb_count: 0,
    types: Map<string, int>.new(),
    bounds: { min: [inf, inf, inf], max: [-inf, -inf, -inf] },
    issues: [],
    suggestions: [],
  }

  for node in ast {
    if node.type == "orb" {
      analysis.orb_count += 1

      // Track types
      let orb_type = node.properties.type or "default"
      analysis.types[orb_type] = (analysis.types[orb_type] or 0) + 1

      // Update bounds
      let pos = node.properties.position or [0, 0, 0]
      analysis.bounds.min = vec3.min(analysis.bounds.min, pos)
      analysis.bounds.max = vec3.max(analysis.bounds.max, pos)

      // Check for issues
      if not node.properties.position {
        analysis.issues.push({
          type: "warning",
          message: "Orb '" + node.name + "' has no position",
          line: node.line,
        })
      }

      if node.properties.scale {
        let scale = node.properties.scale
        if scale[0] < 0 or scale[1] < 0 or scale[2] < 0 {
          analysis.issues.push({
            type: "error",
            message: "Negative scale on '" + node.name + "'",
            line: node.line,
          })
        }
      }
    }
  }

  // Generate suggestions
  if analysis.orb_count > 100 {
    analysis.suggestions.push("Consider using LOD for better performance")
  }

  let scene_size = vec3.sub(analysis.bounds.max, analysis.bounds.min)
  if vec3.length(scene_size) > 1000 {
    analysis.suggestions.push("Large scene - consider spatial partitioning")
  }

  return analysis
}

// Find similar scenes
async fn find_similar_scenes(scene_path: string) -> List<string> {
  let source = read(scene_path)
  let embedding = await embed(source)

  let all_scenes = glob("./worlds/**/*.holo")
  let similarities = []

  for other in all_scenes {
    if other == scene_path { continue }
    let other_source = read(other)
    let other_embedding = await embed(other_source)
    let sim = similarity(embedding, other_embedding)
    similarities.push({ path: other, score: sim })
  }

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.path)
}
```

### Build System

```hsplus
// build.hsplus - Self-hosted build tool
import { glob, read, write, exists, mkdir } from "@holoscript/fs"
import { compile } from "@holoscript/compiler"

async fn build(config: BuildConfig) {
  let start = time.now()
  log("Building HoloScript project...")

  // Find all source files
  let holo_files = glob(config.src + "/**/*.holo")
  let hsplus_files = glob(config.src + "/**/*.hsplus")

  log("Found " + holo_files.length + " .holo files")
  log("Found " + hsplus_files.length + " .hsplus files")

  // Ensure output directory
  if not exists(config.out) {
    mkdir(config.out)
  }

  // Compile each file
  let results = []
  for file in [...holo_files, ...hsplus_files] {
    let source = read(file)
    let result = compile(source, {
      target: config.target,
      optimize: config.optimize,
      sourceMaps: config.sourceMaps,
    })

    if result.success {
      let out_path = file
        .replace(config.src, config.out)
        .replace(/\.(holo|hsplus)$/, ".tsx")

      write(out_path, result.code)
      log("✅ " + file)
    } else {
      log("❌ " + file)
      for err in result.errors {
        error("  " + err.line + ":" + err.column + " " + err.message)
      }
    }

    results.push(result)
  }

  // Summary
  let successful = results.filter(r => r.success).length
  let failed = results.length - successful
  let duration = time.now() - start

  log("")
  log("Build complete in " + duration + "ms")
  log("  " + successful + " succeeded, " + failed + " failed")

  return failed == 0
}

// Run if executed directly
if __main__ {
  let config = {
    src: "./src",
    out: "./dist",
    target: "r3f",
    optimize: true,
    sourceMaps: true,
  }

  let success = await build(config)
  exit(success ? 0 : 1)
}
```

---

## Compilation Targets

`.hsplus` compiles to:

1. **React Three Fiber** (default) - For web/browser
2. **Native Three.js** - For vanilla JS projects
3. **Unity C#** - For Unity engine
4. **Unreal Blueprints** - For Unreal engine
5. **Native WebXR** - Direct WebXR without framework

---

## Interop with TypeScript

```hsplus
// Import TypeScript modules
import { MyComponent } from "./components/MyComponent.tsx"
import { useStore } from "./store.ts"

// Export for TypeScript consumption
export fn create_scene() -> Scene { ... }
export system game_manager { ... }
```

TypeScript can import compiled `.hsplus`:

```typescript
import { create_scene, game_manager } from './world.hsplus';

function App() {
  const scene = create_scene();
  return <Canvas>{scene}</Canvas>;
}
```

---

## Next Steps

1. Implement `@holoscript/std` library
2. Implement `@holoscript/fs` for agent file access
3. Implement `@holoscript/ai` for LLM integration
4. Update parser to support new syntax
5. Update compiler for all targets
6. Create agent templates using `.hsplus`
