# GitHub Copilot Instructions for Hololand

## ⚠️ CRITICAL: Use Brittney MCP Tools First

**Before writing HoloScript code, ALWAYS use MCP tools for guidance.**

Two MCP servers are available:
- **Brittney MCP** (`Hololand/packages/brittney/mcp-server`) - AI assistant for IDE help, debugging, runtime analysis
- **HoloScript MCP** (`HoloScript/packages/mcp-server`) - Language parsing, validation, code generation

Both servers can be used by Brittney or any cloud AI agent (Copilot, Claude, Cursor, etc.).

### Required Workflow

```
1. User asks for HoloScript code
2. Use `suggest_traits` to get appropriate VR traits
3. Use `generate_object` or `generate_scene` to create code
4. Use `validate_holoscript` to verify syntax
5. Use `brittney_diagnostics` to check project-wide issues
6. Return validated code to user
```

### Essential MCP Tools

| Tool | When to Use |
|------|-------------|
| `brittney_scan_project` | First action - understand project structure |
| `brittney_diagnostics` | Before/after edits - check for errors |
| `brittney_autocomplete` | Get context-aware completions |
| `suggest_traits` | For any VR object |
| `generate_object` | Create objects from descriptions |
| `generate_scene` | Create complete .holo files |
| `brittney_suggest_fix` | When encountering issues |

### Codebase Intelligence (HoloScript MCP — Cache-First)

> **Use before editing TypeScript. `force=false` returns in ~21ms from cache if < 24h old.**

| Tool | When to Use |
|------|-------------|
| `holo_graph_status` | **First**: check cache freshness |
| `holo_absorb_repo` | Scan codebase (omit `force` to use cache) |
| `holo_query_codebase` | Architectural Q&A (auto-loads cache) |
| `holo_impact_analysis` | Blast radius for a symbol (auto-loads cache) |
| `holo_detect_changes` | Compare two git refs — always fresh |

**NEVER call `holo_absorb_repo` with `force: true`** unless `holo_graph_status` says stale.

### MCP Recovery Protocol

If any MCP tool call fails:

1. **Diagnose** — `npx tsx packages/mcp-server/src/index.ts --help`
2. **Start** — `npx tsx packages/mcp-server/src/index.ts` (background)
3. **Verify** — retry `holo_graph_status({})` or `brittney_diagnostics({})`
4. **CLI fallbacks** if server won't start:
   - `holo_absorb_repo` → `npx tsx packages/cli/src/cli.ts absorb <dir> --json`
   - `holo_query_codebase` → `npx tsx packages/cli/src/cli.ts query "<question>"`
   - `validate_holoscript` → `npx tsx packages/cli/src/cli.ts parse <file>`
   - `suggest_traits` / `generate_*` → no CLI equivalent; notify user
5. **Notify user**: `"Start server: npx tsx packages/mcp-server/src/index.ts"`

> **Note:** Claude Desktop/Code configuration is already set up in `.claude/settings.json` with preferred tools and MCP servers.

---

## ⚠️ HoloScript-First Development

**DO NOT default to React, TypeScript, or conventional web stacks.**

HoloScript is not another framework—it's a paradigm shift:
- **One source → 9 platforms** (Web, VR, AR, iOS, Android, Desktop, Unity, VRChat, Unreal)
- **50,000 lines → 500 lines** through declarative composition
- **Made for AI**: Agents generate `.holo` files, not JSX components

When asked to build features:
1. **First**: Can this be a `.holo` composition?
2. **Second**: Does it need `.hsplus` for VR traits/networking?
3. **Third**: Is `.hs` sufficient for simple logic?
4. **Last resort**: Only use TypeScript for tooling (parsers, CLI, adapters)

```
❌ WRONG: "I'll create a React component for the UI..."
✅ RIGHT: "I'll define this as a .holo composition with ui objects..."

❌ WRONG: "Let me set up a Next.js app..."
✅ RIGHT: "Let me create a .holo scene that compiles to web..."
```

---

## Project Overview

Hololand is a VR/AR platform using HoloScript - a visual flow language designed for AI agents to understand and generate 3D worlds.

## Three File Formats

| Extension | Purpose | Syntax Style | Status |
|-----------|---------|--------------|--------|
| `.hs` | Classic HoloScript | Object-centric (`orb {}`) | ✅ Working |
| `.hsplus` | HoloScript Plus | Object + VR traits | ✅ Working |
| `.holo` | Declarative Composition | Scene-centric (`composition {}`) | ✅ Working |

---

### .hs - Classic HoloScript
- **For**: Simple prototypes, learning, single-file demos
- **Syntax**: `orb {}`, `function`, `connect`
- **Parser**: ✅ Implemented in `@holoscript/core`

```hs
composition "PlayerDemo" {
  template "Player" {
    @physics
    @collidable
    geometry: "humanoid"
    color: "#00ffff"

    state {
      health: 100
    }
  }

  object "Player" using "Player" {
    position: [0, 1.6, 0]
  }

  action attack(target) {
    target.state.health -= 10
  }
}
```

---

### .hsplus - HoloScript Plus (Advanced)
- **For**: Production apps, VR traits, networking, physics
- **Syntax**: Same as `.hs` + `@traits`, `state {}`, `stream`
- **Parser**: ✅ Implemented in `@holoscript/core`

```hsplus
composition "NetworkedPlayerDemo" {
  template "NetworkedPlayer" {
    @physics
    @collidable
    @grabbable
    @networked
    geometry: "humanoid"

    state {
      health: 100
      isAlive: true
    }

    networked {
      sync_rate: 20hz
      position: synced
    }
  }

  object "Player" using "NetworkedPlayer" {
    position: [0, 1.6, 0]
  }
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
| Composition | `composition "Name" { }` |
| Template | `template "Type" { @traits; properties }` |
| Object | `object "Name" using "Template" { position: [x,y,z] }` |
| VR Trait (.hsplus) | `@grabbable`, `@collidable`, `@networked` |
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
---

## 49 VR Traits (Use These!)

HoloScript has 49 built-in traits that make objects spatial and interactive:

### Interaction
`@grabbable` `@throwable` `@holdable` `@clickable` `@hoverable` `@draggable`

### Physics
`@collidable` `@physics` `@rigid` `@kinematic` `@trigger` `@gravity`

### Visual
`@glowing` `@emissive` `@transparent` `@reflective` `@animated` `@billboard`

### Networking
`@networked` `@synced` `@persistent` `@owned` `@host_only`

### Behavior
`@stackable` `@attachable` `@equippable` `@consumable` `@destructible`

### Spatial
`@anchor` `@tracked` `@world_locked` `@hand_tracked` `@eye_tracked`

### Audio
`@spatial_audio` `@ambient` `@voice_activated`

### State
`@state` `@reactive` `@observable` `@computed`

---

## The Power of HoloScript

### Before (React/Three.js) - 200+ lines:
```jsx
// App.jsx, GrabbableOrb.jsx, useVR.js, OrbMaterial.js...
```

### After (HoloScript) - 15 lines:
```holo
composition "Interactive Demo" {
  template "TeleportOrb" {
    @physics
    @collidable
    @grabbable
    @throwable
    @glowing
    geometry: "sphere"
    color: "#00ffff"

    on_throw() {
      teleport_user(throw_target)
    }
  }

  object "Orb" using "TeleportOrb" {
    position: [0, 1.5, -2]
  }
}
```

**This compiles to**: Three.js, Unity, VRChat, Babylon.js, Web, Mobile, Desktop.

---

## AI Integration Points

- `@holoscript/infinityassistant`: Voice-to-code generation
- `@holoscript/llm`: Local LLM inference for procedural generation
- `brittney-toolkit`: AI that understands scene context and generates .holo

Example prompt → HoloScript flow:
```
User: "Create a marketplace with NPCs selling potions"
↓
AI generates: marketplace.holo
↓
Compiles to: Web (Three.js), VR (Quest), Mobile (AR)
```