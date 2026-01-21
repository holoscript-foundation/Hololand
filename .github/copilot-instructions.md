# GitHub Copilot Instructions for Hololand

## Project Overview

Hololand is a VR/AR platform using HoloScript - a visual flow language designed for AI agents to understand and generate 3D worlds.

## Two File Types

### .holo - Visual Flow Language
- **For AI agents** to read and write
- Represents a graph: nodes (objects) + edges (connections) + flow (events)
- Declarative, visual, easy to understand

### .hsplus - Full Programming Language
- For complex logic, backends, systems
- Variables, functions, loops, async/await

## How to Generate .holo

Think in terms of **nodes and connections**:

```holo
composition "Scene Name" {
  // Templates = node types
  template "Enemy" {
    state { health: 100 }
    action attack(target) { }
  }

  // Instances = nodes
  spatial_group "Battlefield" {
    object "Goblin_1" using "Enemy" { position: [0, 0, 5] }
    object "Goblin_2" using "Enemy" { position: [3, 0, 5] }
  }

  // Logic = flow/connections
  logic {
    on_player_attack(enemy) {
      enemy.health -= 10
    }
  }
}
```

## Quick Reference

| Element | Syntax |
|---------|--------|
| Object | `object "Name" { position: [x,y,z] }` |
| NPC | `traits: ["talkable", "patrol"]` |
| Interactive | `interactive: true, on_interact { }` |
| Event | `on_event_name { action() }` |
| Periodic | `every(milliseconds) { }` |
| Template | `template "Type" { state {}, action() {} }` |

## File Organization

- `*.holo` - Scene definitions, world layouts, NPC configs
- `*.hsplus` - Game systems, complex logic, backends
- `/packages/` - Core libraries and tooling
- `/examples/` - Reference implementations

## Key Insight

.holo is a **visual blueprint** for 3D worlds. When generating, visualize the graph of objects and their relationships first, then write it in .holo syntax.
