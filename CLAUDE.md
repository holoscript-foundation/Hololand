# HoloScript Agent Guide

> **NORTH STAR**: Read `NORTH_STAR.md` in this repo for project-specific decisions. Read `~/.ai-ecosystem/NORTH_STAR.md` for ecosystem-wide decision trees. Consult both before asking the user.
> **GOLD VAULT**: When D: is mounted, `D:/GOLD/` contains graduated knowledge that overrides the knowledge store.
> **STATUS**: HoloLand is the platform/product surface that fully utilizes HoloScript. Build canonical gaps in HoloScript first, then consume them here.
> **AGENT TOOLING**: Read `docs/AGENT_HOLOSCRIPT_TOOLING.md` before changing behavior. HoloScript tools are the first path for generation, validation, graph analysis, compilation, and impact analysis.

You are working in the Hololand codebase. This guide teaches you how to understand and work with HoloScript files.

## Mandatory Agent Workflow

1. Classify the task as docs-only, HoloScript source, TS bridge, product/platform integration, or migration work.
2. Read the relevant local files before describing or changing them.
3. Use HoloScript MCP/Absorb tools when available:
   - `suggest_tools_for_goal` / `get_tool_manifest` for tool routing
   - `suggest_traits`, `generate_scene`, `generate_object` for HoloScript authoring
   - `validate_holoscript`, `hs_diagnostics`, `hs_ai_fix_code` for validation
   - `holo_graph_status`, `holo_absorb_repo`, `holo_query_codebase`, `holo_impact_analysis` for codebase intelligence
   - `compile_holoscript` or target-specific compilers when runtime output matters
4. Follow `docs/HOLOSCRIPT_SOURCE_CONTRACT.md`: feature behavior needs `.holo`, `.hs`, or `.hsplus` source, with TypeScript as bootstrap/bridge/runtime infrastructure.
5. Leave unrelated dirty worktree changes untouched.

## The Two File Types

### `.holo` - Visual Flow Language (FOR AGENTS)

**.holo files are designed for YOU (AI agents) to read and write.** They represent a visual graph of:

- **Nodes** (objects with purposes)
- **Connections** (how they relate)
- **Flow** (events → actions → effects)

When you read a .holo file, think of it as a **visual architecture diagram**, not code.

### `.hsplus` - Full Programming Language

.hsplus is for complex logic, systems, backends. Use it when you need:

- Variables, loops, conditionals
- Async/await, promises
- Complex state management
- Backend/server code

## Reading .holo Files (How to Think)

When you see a .holo file, mentally construct a graph:

```holo
composition "Battle Arena" {

  template "Fighter" {           // NODE TYPE: defines a category
    state { health: 100 }        // Node has internal state
    action attack(target) { }    // Node has behaviors
  }

  spatial_group "Arena" {        // GROUPING: organizes nodes
    object "Player" using "Fighter" { }   // NODE: instance of type
    object "Enemy" using "Fighter" { }    // NODE: another instance
  }

  logic {                        // FLOW: how nodes connect
    on_start { }                 // Entry point
    on_event("attack") {         // Event triggers flow
      Player.attack(Enemy)       // CONNECTION: Player → Enemy
    }
  }
}
```

**Your mental model should be:**

```text
[Player] ──attack()──→ [Enemy]
    ↑                      ↑
    └── both are "Fighter" ┘
           (template)
```

## Writing .holo Files (How to Generate)

When asked to create something, think in terms of:

1. **What objects exist?** (nodes)
2. **What types are they?** (templates)
3. **How are they grouped?** (spatial_groups)
4. **What events connect them?** (logic flows)

### Example: "Create a shop with NPCs"

```holo
composition "Marketplace" {

  // 1. Define the node types
  template "Merchant" {
    state {
      inventory: []
      gold: 1000
    }
    action sell(item, buyer) {
      buyer.inventory.push(item)
      this.gold += item.price
    }
  }

  template "Collectible" {
    state { collected: false }
    on_interact {
      if (!this.collected) {
        this.collected = true
        user.inventory.push(this)
      }
    }
  }

  // 2. Place instances in space
  spatial_group "ShopDistrict" {

    object "WeaponSmith" using "Merchant" {
      position: [0, 0, 5]
      inventory: ["Sword", "Shield", "Bow"]
    }

    object "Potion_01" using "Collectible" {
      position: [3, 0.5, 2]
      item: "Health Potion"
    }
  }

  // 3. Define the flow
  logic {
    on_user_interact("WeaponSmith") {
      ui.show_shop(WeaponSmith.inventory)
    }

    on_user_collect("Potion_01") {
      ui.toast("You found a Health Potion!")
    }
  }
}
```

## Common Patterns

### NPC with Dialogue

```holo
object "Guard" {
  position: [10, 0, 0]
  traits: ["talkable", "patrol"]
  properties: {
    dialogue: "Halt! State your business."
    patrol_path: [[10,0,0], [20,0,0], [20,0,10]]
  }
}
```

### Interactive Object

```holo
orb "TreasureChest" {
  shape: "chest"
  position: [5, 0, 3]
  interactive: true
  traits: ["openable", "lootable"]
  on_interact {
    if (!this.opened) {
      this.opened = true
      spawn_loot(this.position)
    }
  }
}
```

### Event Flow

```holo
logic {
  // Trigger → Action → Effect
  on_player_enter("DangerZone") {
    spawn("Enemy", DangerZone.center)
    audio.play("alert")
    ui.toast("Enemies incoming!")
  }
}
```

### Periodic Systems

```holo
logic {
  every(5000) {  // Every 5 seconds
    for (npc in NPCs) {
      npc.wander()
    }
  }
}
```

## When to Use Each File Type

| Task | File Type | Why |
| ---- | --------- | --- |
| Create a scene/world | `.holo` | Visual structure, easy to understand |
| Define objects/NPCs | `.holo` | Declarative, clear relationships |
| Complex game logic | `.hsplus` | Need variables, loops, functions |
| Backend/API | `.hsplus` | Server code needs full language |
| AI agent behaviors | `.holo` | Agent can read/understand flow |
| Data transformations | `.hsplus` | Need programming constructs |

## MCP Tools Available

### Brittney MCP (runtime, scenes, debugging)

- `brittney_generate_holoscript` - Generate .holo from description
- `brittney_inject_holoscript` - Inject into running app
- `brittney_holoscript_playground` - Parse, validate, explain code
- `execute_holoscript` - Execute in a world
- `brittney_explain_scene` - Understand current scene

### HoloScript MCP (language, codebase intelligence)

Start with: `npx tsx packages/mcp-server/src/index.ts` in the HoloScript repo.

| Tool | When to Use |
| ---- | ----------- |
| `suggest_traits` | Before writing any .hsplus object |
| `generate_object` / `generate_scene` | Create HoloScript from description |
| `validate_holoscript` | After generating any code |
| `holo_graph_status` | Before editing TypeScript — check cache age |
| `holo_absorb_repo` | Scan codebase (cache-first: ~21ms if < 24h old) |
| `holo_impact_analysis` | Blast radius before refactoring |
| `holo_query_codebase` | Architectural questions (auto-loads cache) |

## Key Insight for Agents

**.holo is your interface to the 3D world.**

When a user asks you to "build X", think:

1. What does X look like as a graph of connected objects?
2. Write that graph in .holo syntax
3. The runtime turns your .holo into a 3D scene

You're not writing code - you're **drawing a blueprint** that gets built.

## Strategic Product Direction

When making architectural or roadmap decisions in this repo, assume:

- Brittney is the primary interface
- Studio is the primary creation environment
- Hololand is Brittney's runtime embodiment in live worlds
- HoloScript is the underlying substrate

Use Hololand for runtime presence, player guidance, social/spatial interaction, and experiential delivery of Brittney's intelligence. Do not treat generic IDE workflows as the strategic center of gravity.
