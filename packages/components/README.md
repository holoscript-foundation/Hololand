# @hololand/components

Pre-built HoloScript templates for common VR/AR patterns.

## Installation

```bash
pnpm add @hololand/components
```

## Usage

```holo
import { PatrolNPC, Sword, Portal, HUD, QuestSystem } from "@hololand/components"

composition "My Game" {
  
  // Spawn a patrolling guard
  object "Guard" using "PatrolNPC" {
    position: [0, 0, 5]
    patrol_points: [[0, 0, 5], [10, 0, 5], [10, 0, 15], [0, 0, 15]]
  }
  
  // Place a sword
  object "MagicSword" using "Sword" {
    position: [3, 1, 0]
    damage: 25
  }
  
  // Create a portal
  object "ExitPortal" using "Portal" {
    position: [0, 1, -10]
    destination: "hub_world"
    color: "#ff00ff"
  }
  
  // Add HUD
  object "PlayerHUD" using "HUD" {}
  
  // Quest system
  object "Quests" using "QuestSystem" {
    quest_definitions: {
      "first_quest": {
        title: "The Beginning",
        objectives: [
          { id: "talk", type: "interact", target: "Guard", target: 1 }
        ],
        rewards: [
          { type: "gold", value: 100 }
        ]
      }
    }
  }
}
```

## Template Categories

### NPCs (`@hololand/components/npcs`)
- `BaseNPC` - Foundation with health, damage
- `PatrolNPC` - Waypoint patrolling
- `CombatNPC` - Attack AI with targeting
- `DialogueNPC` - Conversation trees
- `ShopNPC` - Buy/sell items

### Weapons (`@hololand/components/weapons`)
- `MeleeWeapon` - Sword, Axe with swing mechanics
- `RangedWeapon` - Bow with projectiles
- `MagicStaff` - Spell casting with mana

### Environment (`@hololand/components/environment`)
- `Portal` - Teleportation with effects
- `Door` - Open/close, lockable
- `Trap` - Damage on contact
- `Collectible` - Coins, items with respawn
- `Light` - Point/spot with flicker, pulse

### UI (`@hololand/components/ui`)
- `HealthBar` - Animated health display
- `InventoryPanel` - Grid-based inventory
- `HUD` - Health, mana, minimap, crosshair
- `ChatBubble` - NPC speech bubbles

### Game Systems (`@hololand/components/game-systems`)
- `QuestSystem` - Objectives, tracking, rewards
- `AchievementSystem` - Stat-based unlocks
- `SaveSystem` - Save/load with auto-save
- `DialogueSystem` - Branching conversations
