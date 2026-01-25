# Fresh HoloScript Examples

> **Production-ready starter templates for learning and building**

These examples demonstrate HoloScript patterns from basic to advanced. Each file is self-contained and ready to run in the HoloScript Playground.

---

## Tier 1: Starter Templates

### 1. [hello_vr.holo](./hello_vr.holo) - Hello VR World

The simplest possible VR scene. Perfect for your first HoloScript file.

**Concepts:**
- Composition structure
- Environment setup (skybox, lighting)
- Object placement (cube, plane, particles)
- Basic animations (float, rotate)
- Simple interactions (hover, click)

```holo
cube "HelloCube" {
  position: [0, 1.5, -3]
  material: { color: "#00cec9" }
  traits: ["hoverable", "glow"]
}
```

---

### 2. [interactive_basics.holo](./interactive_basics.holo) - Interactive Basics

Learn the core interaction patterns used in VR/AR applications.

**Concepts:**
- Templates (reusable object definitions)
- Event handlers (click, hover, enter/exit)
- State management
- Audio feedback
- Trigger zones
- UI elements (buttons, panels, tooltips)

```holo
template "InteractiveButton" {
  traits: ["clickable", "hoverable"]
  state { pressed: false }

  on_click {
    this.state.pressed = !this.state.pressed
    audio.play_spatial("button_click", this.position)
  }
}
```

---

### 3. [npc_dialogue.holo](./npc_dialogue.holo) - NPC Dialogue System

Create talking NPCs with branching conversation trees.

**Concepts:**
- NPC templates with personalities
- Dialogue trees with multiple branches
- Player choices and consequences
- Quest integration
- Emotion/expression changes
- Item giving and state effects

```holo
node "greeting" {
  speaker: "Elara"
  text: "Welcome to the Wanderer's Rest, traveler!"
  choices: [
    { text: "I'm looking for information.", next: "info_request" },
    { text: "What's good to drink?", next: "drink_offer" }
  ]
}
```

---

## How to Use

### Option A: HoloScript Playground

1. Open the [HoloScript Playground](https://playground.hololand.dev)
2. Copy any `.holo` file content into the editor
3. See the 3D preview update in real-time
4. Modify and experiment!

### Option B: Local Development

```bash
# Clone Hololand
git clone https://github.com/brianonbased-dev/Hololand.git
cd Hololand

# Install dependencies
pnpm install

# Start playground with examples
cd packages/devtools/playground
pnpm dev

# Open http://localhost:5173 and load an example
```

### Option C: React Integration

```tsx
import { HololandCanvas, HoloScriptLoader } from '@hololand/react-three';

function App() {
  return (
    <HololandCanvas>
      <HoloScriptLoader src="/examples/fresh/hello_vr.holo" />
    </HololandCanvas>
  );
}
```

---

## Progression Path

```
1. hello_vr.holo          → Understand the basics
2. interactive_basics.holo → Master interactions
3. npc_dialogue.holo       → Build complex systems
   ↓
4. Combine patterns        → Create your own worlds!
```

---

## Tier 2: Game Systems (`.hsplus`)

These examples use HoloScript+ for complex game logic and systems.

### 4. [combat_arena.hsplus](./combat_arena.hsplus) - Combat Arena

A complete combat system with AI enemies and wave-based gameplay.

**Concepts:**
- State machines for AI behavior (idle, patrol, chase, attack)
- Health/damage calculations with crits and defense
- Weapon definitions with cooldowns
- Hit detection and visual feedback
- Death/respawn mechanics
- Combat UI (health bars, damage numbers)

```hsplus
fn deal_damage(attacker: CombatEntity, target: CombatEntity, weapon: Weapon) -> int {
  let baseDamage = weapon.damage + attacker.stats.attack
  let reduction = target.stats.defense * 0.5
  let damage = max(1, baseDamage - reduction)

  // Critical hit check
  let isCrit = random() < attacker.stats.critChance
  if (isCrit) {
    damage = floor(damage * attacker.stats.critMultiplier)
  }
  // ...
}
```

---

### 5. [inventory_system.hsplus](./inventory_system.hsplus) - Inventory System

Full inventory management with items, equipment, and loot.

**Concepts:**
- Item definitions with rarity, stats, effects
- Grid-based inventory with drag/drop
- Item stacking and splitting
- Equipment slots with stat bonuses
- Loot tables and drop systems
- Crafting basics

```hsplus
items {
  "flame_blade" {
    name: "Flame Blade"
    type: "weapon"
    rarity: "rare"
    equipSlot: "mainhand"
    stats: { attack: 25, fireDamage: 10, critChance: 8 }
  }
}
```

---

### 6. [quest_tracker.hsplus](./quest_tracker.hsplus) - Quest Tracker

Complete quest system with objectives, chains, and rewards.

**Concepts:**
- Quest definitions with prerequisites
- Multiple objective types (kill, collect, explore, talk)
- Quest chains and unlocking
- Progress tracking and persistence
- Reward distribution (XP, gold, items, reputation)
- Quest log UI with tracking
- NPC quest givers with indicators

```hsplus
quests {
  "main_the_temple" {
    title: "The Temple of Echoes"
    category: "main"
    prerequisites: ["main_first_steps"]
    objectives: [
      { type: "collect", target: "old_map", required: 1 },
      { type: "explore", target: "whispering_woods", hidden: true }
    ]
    rewards: { experience: 500, gold: 100, items: [...] }
  }
}
```

---

## Progression Path

```
Tier 1: Basics (.holo)
├── 1. hello_vr.holo          → Minimal scene
├── 2. interactive_basics.holo → Interactions
└── 3. npc_dialogue.holo       → Dialogue trees
         ↓
Tier 2: Systems (.hsplus)
├── 4. combat_arena.hsplus     → Combat & AI
├── 5. inventory_system.hsplus → Items & loot
└── 6. quest_tracker.hsplus    → Quests & progress
         ↓
Combine → Build complete games!
```

---

## Coming Soon (Tier 3+)

- `vr_training_sim.holo` - Safety training scenario
- `virtual_showroom.holo` - Product visualization
- `procedural_world.hsplus` - Noise-based terrain generation
- `social_hub.hsplus` - Multiplayer social space
- `ai_npc_behaviors.hsplus` - Advanced AI patterns

---

## Need Help?

- [HoloScript Language Spec](../../docs/HOLOSCRIPT_LANGUAGE_SPEC.md)
- [File Types Guide](../../docs/HOLOSCRIPT_FILE_TYPES.md)
- [Integration Guide](../../docs/HOLOSCRIPT_INTEGRATION_GUIDE.md)

---

**Built with HoloScript** | [Hololand](https://github.com/brianonbased-dev/Hololand)
