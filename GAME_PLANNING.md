# Hololand Game Planning Document
## Session: 2026-01-31 | AI: Brittney + Claude

---

## Current State Analysis

### Existing Game Assets (236 HoloScript files)
| Zone | File | Status | Features |
|------|------|--------|----------|
| **Main Plaza** | `MainPlaza.holo` | Complete | Central hub, 4 portals, theme changer |
| **Arcade District** | `arcade_district.holo` | Complete | NPC Brian, shops, collectibles, quests |
| **Enchanted Forest** | `enchanted-forest.holo` | Complete | Full gameplay: NPCs, dialogue, teleport orbs, quest system |
| **Builder Shop** | `BuilderShop.holo` | Partial | Asset creation zone |
| **Social Lounge** | `SocialLounge.holo` | Partial | Multiplayer social space |
| **Forest Portal** | `ForestPortal.holo` | Partial | Zone transition |

### Proven HoloScript Patterns
```holoscript
// Template system for reusable objects
template "TeleportOrb" {
  @grabbable @throwable @glowing @physics
  on_throw(direction, velocity) { ... }
}

// NPC dialogue trees
dialogue_tree: {
  start: { text: "...", options: [...] }
}

// Game state management
state { player_mana: 100, orbs_collected: 0 }

// Event-driven logic
on_orb_grabbed(data) { show_hint("...") }
```

---

## Brittney's Top 3 Development Priorities

### 1. Multiplayer Mechanics (HIGH PRIORITY)
**Why:** Foundation for social VR - players need to interact

**Required Features:**
- Player state synchronization
- World ownership/permissions
- Voice chat zones
- Shared object manipulation

**HoloScript Syntax Proposal:**
```holoscript
// Networked player sync
object Player {
  @networked(sync: "transform,state")
  @voice_zone(radius: 10)

  state { position, rotation, avatar, voice_active }
}

// Ownership system
object OwnedArea {
  @ownership(owner_id: "player_123")
  @permissions(guests: ["view"], friends: ["view", "interact"])
}
```

### 2. Procedural Generation (MEDIUM PRIORITY)
**Why:** Infinite content without manual creation

**Required Features:**
- Terrain generation
- Building/structure placement
- NPC spawning rules
- Resource distribution

**HoloScript Syntax Proposal:**
```holoscript
// Procedural forest
generator "ForestGenerator" {
  seed: world_seed
  rules: {
    trees: { density: 0.3, types: ["oak", "pine", "magic"] }
    mushrooms: { density: 0.5, near: "trees" }
    clearings: { size: [10, 20], frequency: 0.1 }
  }
}

spatial_group "GeneratedForest" {
  @procedural(generator: "ForestGenerator", area: 1000)
}
```

### 3. Enhanced VR/AR Integration (MEDIUM PRIORITY)
**Why:** Immersive experiences drive retention

**Required Features:**
- Hand tracking gestures
- Haptic feedback zones
- Mixed reality anchors
- Comfort options (vignette, snap-turn)

---

## Game Loop Design

### Core Gameplay Loops

#### Loop 1: Exploration & Discovery
```
Enter Zone → Discover Secrets → Unlock Rewards → New Zones Available
```

#### Loop 2: Quest Completion
```
Meet NPC → Accept Quest → Complete Objectives → Earn XP/Items → Level Up
```

#### Loop 3: Social & Creation
```
Join Friends → Visit Worlds → Create Together → Share Creations → Gain Followers
```

### Progression System

| Level | XP Required | Unlocks |
|-------|-------------|---------|
| 1-5 | 0-500 | Basic avatar, Main Plaza access |
| 6-10 | 500-2000 | Arcade District, first pet |
| 11-20 | 2000-10000 | Building tools, private world |
| 21-50 | 10000-100000 | Advanced traits, world templates |
| 51+ | 100000+ | Creator tools, economy features |

### Reward Types
- **XP:** Character progression
- **Coins:** In-game currency
- **Traits:** Special abilities (flying, glow, speed)
- **Assets:** 3D models, textures, effects
- **Achievements:** Profile badges

---

## Zone Roadmap

### Phase 1: Core Zones (Current)

**VALIDATION AUDIT (2026-01-31):** Parser validation completed

| Zone | Code | Parser | VR Runtime | Status |
|------|------|--------|------------|--------|
| Main Plaza | ✅ | ❌ FAIL (`#id` syntax not supported) | ❌ | **Needs Parser Fix** |
| Arcade District | ✅ | ✅ PASS | ❌ | **Ready for VR Test** |
| Enchanted Forest | ✅ | ❌ FAIL (nested blocks) | ❌ | **Needs Parser Fix** |
| Social Lounge | Partial | ❓ | ❌ | Incomplete |

**Issues Found:**
1. `MainPlaza.holo` uses `#id` syntax (e.g., `cylinder #platform`) - parser expects different format
2. `enchanted-forest.holo` uses nested `composition { environment { } }` blocks - parser fails on nested structures
3. `arcade_district.holo` validates correctly - uses `building Name { }` syntax

**Action Required:**
- Fix HoloScript parser to support `#id` syntax
- Fix parser to handle nested block structures
- Then re-validate all zones

### Phase 2: Expansion Zones (Next Sprint)
- [ ] **Crystal Caves** - Mining, resources, puzzles
- [ ] **Sky Islands** - Flying mechanics, parkour
- [ ] **Cyber City** - Futuristic, racing, tech themes
- [ ] **Ancient Ruins** - Exploration, lore, boss fights

### Phase 3: User-Generated Zones
- [ ] **World Builder** - Create custom zones
- [ ] **Template Library** - Pre-made zone templates
- [ ] **Asset Marketplace** - Trade creations

---

## Technical Sprint Backlog

### Sprint 1: Foundation (1-2 weeks)
1. [ ] Implement `@networked` trait for player sync
2. [ ] Add voice chat zone detection
3. [ ] Create player persistence (save/load state)
4. [ ] Fix LOD system for large worlds

### Sprint 2: Content (2-3 weeks)
1. [ ] Complete Crystal Caves zone
2. [ ] Add 5 new NPC dialogue trees
3. [ ] Implement mining mechanic
4. [ ] Create resource inventory UI

### Sprint 3: Polish (1-2 weeks)
1. [ ] Performance optimization pass
2. [ ] Accessibility options (text size, colors)
3. [ ] Tutorial sequence
4. [ ] Beta testing feedback integration

---

## New Zone Template: Crystal Caves

```holoscript
// Crystal Caves - Resource gathering zone
composition "Crystal Caves" {

  environment {
    skybox: "underground_dark"
    ambient_light: 0.2
    fog: { color: "#0a0a1a", density: 0.05 }

    particle_system "crystal_sparkle" {
      count: 500
      spread: 100
      color: "#00ffff"
      behavior: "twinkle"
    }
  }

  state {
    crystals_mined: 0
    pickaxe_durability: 100
    discovered_veins: []
  }

  // Mineable crystal template
  template "Crystal" {
    @mineable(tool: "pickaxe", hits: 3)
    @glowing
    @physics

    on_mined(player) {
      state.crystals_mined += 1
      spawn_item("crystal_shard", self.position)
      play_sound("crystal_break")
      emit "crystal_mined" { type: self.crystal_type }
    }
  }

  // Crystal veins (procedural placement)
  generator "CrystalVeinGenerator" {
    seed: world_seed + 42
    rules: {
      common_crystals: { density: 0.4, color: "#00ffff" }
      rare_crystals: { density: 0.1, color: "#ff00ff" }
      legendary_crystals: { density: 0.02, color: "#ffff00" }
    }
  }

  spatial_group "CrystalField" {
    @procedural(generator: "CrystalVeinGenerator", area: 500)
  }

  // Mining guide NPC
  object "Miner_Greta" {
    model: "dwarf_miner"
    position: [0, 0, 5]

    @npc @dialog @look_at_player

    dialogue_tree: {
      start: {
        text: "Lookin' for crystals, are ya? These caves run deep!"
        options: [
          { text: "How do I mine?", next: "tutorial" },
          { text: "What's valuable here?", next: "rare_info" }
        ]
      }
      tutorial: {
        text: "Grab a pickaxe from the rack. Hit crystals 3 times. Watch your durability!"
        action: { type: "give_item", item: "basic_pickaxe" }
      }
      rare_info: {
        text: "Pink crystals are rare. Gold ones... legendary. I've only seen one in 40 years!"
      }
    }
  }

  // Exit portal
  object "CaveExit" {
    model: "mine_cart_track"
    position: [0, 0, -50]

    on_player_enter {
      if state.crystals_mined >= 10 {
        transition_to("main_plaza", { reward: state.crystals_mined })
      } else {
        show_message("Mine at least 10 crystals before leaving")
      }
    }
  }
}
```

---

## Session Analytics

| Metric | Value |
|--------|-------|
| Tools Used | 8 |
| Brittney Responses | 6 |
| Zones Analyzed | 6 |
| New Zone Designed | 1 (Crystal Caves) |
| GPU Usage | 91% VRAM |

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize** Sprint 1 tasks
3. **Prototype** Crystal Caves zone
4. **Test** multiplayer sync on local network
5. **Iterate** based on playtest feedback

---

*Generated by Brittney AI + Claude | Hololand Game Planning Session*
