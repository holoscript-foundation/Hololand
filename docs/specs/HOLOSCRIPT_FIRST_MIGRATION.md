# HoloScript-First Migration - Game Plan

## Overview

Migrate Hololand Central and establish HoloScript (.hsplus) as the **primary language** for building Hololand applications. TypeScript becomes the **bootstrap/platform layer only**.

**Problem**: HoloScript is a full language that compiles to browser code, yet the flagship product (Hololand Central) is 90% TypeScript.

**Solution**: Eat our own dogfood - rebuild Hololand Central in HoloScript to showcase the language.

---

## Architecture: The Correct Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                    HOLOSCRIPT APPLICATION                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              HoloScript (.hsplus)                    │    │
│  │  - Worlds, zones, scenes                            │    │
│  │  - Game logic, systems                              │    │
│  │  - NPCs, behaviors, dialogue                        │    │
│  │  - UI components (via @hololand/ui bindings)        │    │
│  │  - Easter eggs, collectibles                        │    │
│  │  - Multiplayer state                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TypeScript (Bootstrap Only)             │    │
│  │  - index.html + main.ts (entry point)               │    │
│  │  - HoloScript runtime initialization                │    │
│  │  - Build tooling (Vite config)                      │    │
│  │  - Platform packages (@hololand/*)                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Rule**: If it's content, logic, or behavior → HoloScript. If it's platform/bootstrap → TypeScript.

---

## Current State (Hololand Central)

### File Count Analysis

| Type | Count | Should Be |
|------|-------|-----------|
| `.tsx` files | ~50 | ~5 (bootstrap only) |
| `.ts` files | ~30 | ~10 (services/config) |
| `.hsplus` files | ~10 | ~50+ |
| `.holo` files | 1 | 0 (deprecated) |

### What's Currently in TypeScript That Should Be HoloScript

| Component | Current | Target |
|-----------|---------|--------|
| `App.tsx` | TypeScript/React | HoloScript composition |
| `worlds/*.tsx` | TypeScript/React | HoloScript zones |
| `components/TutorialOverlay.tsx` | TypeScript/React | HoloScript UI system |
| `components/EasterEggs*.tsx` | TypeScript | HoloScript system |
| `components/MobileControls.tsx` | TypeScript/React | HoloScript UI |
| `themes/*.ts` | TypeScript | HoloScript config |
| `services/VoiceCommand*.ts` | TypeScript | HoloScript system |

---

## Migration Plan

### Phase 1: Core App Structure

**1.1 Create Main Composition**

Location: `examples/hololand-central/src/app.hsplus`

```hsplus
// Main application entry point
import { TutorialSystem } from "./systems/Tutorial.hsplus"
import { EasterEggSystem } from "./systems/EasterEggs.hsplus"
import { ThemeSystem } from "./systems/Themes.hsplus"
import { MultiplayerSystem } from "./systems/Multiplayer.hsplus"

composition "HololandCentral" {
  config {
    title: "Hololand Central"
    version: "1.0.0"
    renderMode: "progressive"  // desktop → VR
  }

  // Global systems
  system TutorialSystem
  system EasterEggSystem
  system ThemeSystem
  system MultiplayerSystem

  // Entry flow
  page "Landing" {
    include "./pages/Landing.hsplus"
  }

  page "Oasis" {
    include "./pages/Oasis.hsplus"
  }

  page "Central" {
    include "./pages/Central.hsplus"
  }
}
```

**1.2 Minimal TypeScript Bootstrap**

Location: `examples/hololand-central/src/main.ts`

```typescript
// ONLY bootstrap code - everything else is HoloScript
import { createRuntime } from '@holoscript/core/runtime';
import { loadComposition } from '@holoscript/loader';

async function main() {
  const composition = await loadComposition('./app.hsplus');
  const runtime = createRuntime(composition, {
    target: document.getElementById('root'),
    mode: 'progressive',
  });
  runtime.start();
}

main();
```

**This is the ONLY TypeScript file needed for the app.**

---

### Phase 2: World/Zone Migration

**2.1 Main Plaza**

Convert: `src/worlds/MainPlaza.tsx` → `src/zones/main_plaza.hsplus`

```hsplus
// src/zones/main_plaza.hsplus
composition "MainPlaza" {
  environment {
    skybox: "daytime"
    ambientLight: 0.4
    fog: { color: "#87ceeb", near: 50, far: 200 }
  }

  // Templates
  template "Ground" {
    @static
    type: "plane"
    size: [100, 100]
    material: { type: "grass", repeat: [20, 20] }
  }

  template "Fountain" {
    @physics
    @collidable
    @interactive
    model: "/models/fountain.glb"

    on_click() {
      audio.play("water_splash")
      particles.emit("splash", position)
    }
  }

  // Ground
  object "Ground" using "Ground" {
    position: [0, 0, 0]
    rotation: [-90, 0, 0]
  }

  // Central fountain
  object "Fountain" using "Fountain" {
    position: [0, 0, 0]
  }

  // Portal template
  template "Portal" {
    @physics
    @collidable
    @glowing
    geometry: "torus"
  }

  // Portals to other zones
  spatial_group "Portals" {
    object "CasinoPortal" using "Portal" {
      position: [20, 0, 0]
      destination: "Casino"
      label: "Casino"
    }

    object "BuilderPortal" using "Portal" {
      position: [-20, 0, 0]
      destination: "BuilderShop"
      label: "Builder Shop"
    }

    object "LoungePortal" using "Portal" {
      position: [0, 0, 20]
      destination: "SocialLounge"
      label: "Social Lounge"
    }
  }

  // NPCs
  @import "./npcs/plaza_npcs.hsplus"
}
```

**2.2 Casino Interior**

Already exists: `src/zones/casino_interior.hsplus` - keep and expand

**2.3 All Other Zones**

Convert each `.tsx` world to `.hsplus`:
- `HololandCasino.tsx` → `casino.hsplus`
- `BuilderShop.tsx` → `builder_shop.hsplus`
- `SocialLounge.tsx` → `social_lounge.hsplus`
- `InfinityShop.tsx` → `infinity_shop.hsplus`
- `Arcade.tsx` → `arcade.hsplus`

---

### Phase 3: Systems Migration

**3.1 Tutorial System**

Convert: `components/TutorialOverlay.tsx` → `systems/Tutorial.hsplus`

```hsplus
// src/systems/Tutorial.hsplus
system TutorialSystem {
  state {
    currentStep: 0
    completed: false
    visible: true
  }

  steps: [
    {
      title: "Welcome to Hololand"
      message: "This is your gateway to the metaverse."
      action: "next"
    },
    {
      title: "Movement"
      message: "Use WASD or joystick to move around."
      action: "next"
    },
    {
      title: "Portals"
      message: "Walk through portals to visit different zones."
      action: "next"
    },
    {
      title: "VR Mode"
      message: "Click 'Enter VR' to experience in virtual reality."
      action: "finish"
    }
  ]

  on_start {
    if (storage.get("tutorial_completed")) {
      state.visible = false
      state.completed = true
    }
  }

  action next() {
    state.currentStep += 1
    if (state.currentStep >= steps.length) {
      finish()
    }
  }

  action skip() {
    finish()
  }

  action finish() {
    state.visible = false
    state.completed = true
    storage.set("tutorial_completed", true)
  }

  // UI is declared in HoloScript, rendered by runtime
  ui {
    if (state.visible) {
      panel "Tutorial" {
        @overlay
        position: "center"
        style: "glass"

        text "Title" {
          content: steps[state.currentStep].title
          size: "large"
        }

        text "Message" {
          content: steps[state.currentStep].message
        }

        button "Next" {
          label: steps[state.currentStep].action == "finish" ? "Got it!" : "Next"
          on_click: next
        }

        button "Skip" {
          label: "Skip"
          on_click: skip
        }
      }
    }
  }
}
```

**3.2 Easter Egg System**

Convert: `easter-eggs/*.tsx` → `systems/EasterEggs.hsplus`

```hsplus
// src/systems/EasterEggs.hsplus
system EasterEggSystem {
  state {
    discovered: []
    totalEggs: 16
  }

  eggs: [
    {
      id: "fountain_secret"
      zone: "MainPlaza"
      trigger: { type: "proximity", position: [5, 0, 3], radius: 2 }
      reward: { type: "badge", name: "Explorer", rarity: "common" }
    },
    {
      id: "casino_jackpot"
      zone: "Casino"
      trigger: { type: "sequence", actions: ["spin", "spin", "spin"] }
      reward: { type: "title", name: "Lucky One", rarity: "rare" }
    },
    // ... 14 more eggs
  ]

  on_player_enter_zone(zone) {
    for (egg in eggs) {
      if (egg.zone == zone && !state.discovered.includes(egg.id)) {
        activate_trigger(egg)
      }
    }
  }

  action discover(eggId) {
    if (!state.discovered.includes(eggId)) {
      state.discovered.push(eggId)
      const egg = eggs.find(e -> e.id == eggId)
      emit("egg_discovered", egg)
      grant_reward(egg.reward)
      storage.set("discovered_eggs", state.discovered)
    }
  }

  action grant_reward(reward) {
    inventory.add(reward)
    ui.show_modal("EasterEggReward", { reward })
    audio.play("reward_fanfare")
  }

  on_start {
    state.discovered = storage.get("discovered_eggs") || []
  }
}
```

**3.3 Theme System**

Convert: `themes/*.ts` → `systems/Themes.hsplus`

```hsplus
// src/systems/Themes.hsplus
system ThemeSystem {
  state {
    currentTheme: "cyberpunk"
  }

  themes: {
    cyberpunk: {
      name: "Cyberpunk Station"
      skyColor: "#1a0a2e"
      accentColor: "#ff00ff"
      fogColor: "#2a0a4e"
      ambientLight: 0.3
      neonGlow: true
    },
    western: {
      name: "Wild West Frontier"
      skyColor: "#f4a460"
      accentColor: "#8b4513"
      fogColor: "#d2b48c"
      ambientLight: 0.6
      dust: true
    },
    urban: {
      name: "Urban Cityscape"
      skyColor: "#1a1a2e"
      accentColor: "#00ffff"
      fogColor: "#2a2a4e"
      ambientLight: 0.4
      rain: false
    },
    snowy: {
      name: "Snowy Village"
      skyColor: "#e8e8e8"
      accentColor: "#ff6b6b"
      fogColor: "#ffffff"
      ambientLight: 0.7
      snow: true
    },
    tropical: {
      name: "Tropical Paradise"
      skyColor: "#87ceeb"
      accentColor: "#32cd32"
      fogColor: "#98fb98"
      ambientLight: 0.8
      palms: true
    }
  }

  action setTheme(themeName) {
    if (themes[themeName]) {
      state.currentTheme = themeName
      apply_theme(themes[themeName])
      storage.set("selected_theme", themeName)
    }
  }

  action cycleTheme() {
    const names = Object.keys(themes)
    const idx = names.indexOf(state.currentTheme)
    const next = names[(idx + 1) % names.length]
    setTheme(next)
  }

  on_start {
    const saved = storage.get("selected_theme")
    if (saved) setTheme(saved)
  }
}
```

**3.4 Multiplayer System**

Convert: placeholder → `systems/Multiplayer.hsplus`

```hsplus
// src/systems/Multiplayer.hsplus
import { NetworkClient } from "@hololand/network"

system MultiplayerSystem {
  state {
    connected: false
    isHost: false
    players: []
    sessionUrl: null
  }

  action host() {
    const server = network.createLocalServer()
    const tunnel = network.createTunnel("ngrok")
    state.sessionUrl = tunnel.url
    state.isHost = true
    state.connected = true

    server.on("player_join", (player) -> {
      state.players.push(player)
      spawn_avatar(player)
    })

    server.on("player_leave", (player) -> {
      state.players = state.players.filter(p -> p.id != player.id)
      remove_avatar(player)
    })
  }

  action join(url) {
    const client = network.connect(url)
    client.on("connected", () -> {
      state.connected = true
    })
    client.on("player_list", (players) -> {
      state.players = players
      players.forEach(spawn_avatar)
    })
  }

  action disconnect() {
    network.disconnect()
    state.connected = false
    state.players = []
  }

  // Avatar sync handled by network runtime
  on_player_move(player, position, rotation) {
    update_avatar(player.id, position, rotation)
  }

  ui {
    panel "Multiplayer" {
      @overlay
      position: "top-right"

      if (!state.connected) {
        button "Host" {
          label: "Host Session"
          on_click: host
        }
        textinput "JoinUrl" {
          placeholder: "Paste session URL..."
        }
        button "Join" {
          label: "Join"
          on_click: () -> join(ui.get("JoinUrl").value)
        }
      } else {
        text "Status" {
          content: state.isHost
            ? "Hosting: " + state.sessionUrl
            : "Connected"
        }
        text "PlayerCount" {
          content: state.players.length + " players"
        }
        button "Disconnect" {
          label: "Disconnect"
          on_click: disconnect
        }
      }
    }
  }
}
```

---

### Phase 4: UI Components

**4.1 Mobile Controls**

Convert: `components/MobileControls.tsx` → `ui/MobileControls.hsplus`

```hsplus
// src/ui/MobileControls.hsplus
component MobileControls {
  props {
    visible: true
    joystickSize: 120
    deadzone: 0.1
  }

  state {
    joystickPosition: [0, 0]
    isMoving: false
  }

  ui {
    if (device.isMobile && props.visible) {
      // Virtual joystick
      joystick "Move" {
        position: "bottom-left"
        size: props.joystickSize
        deadzone: props.deadzone
        on_move: (x, y) -> {
          state.joystickPosition = [x, y]
          state.isMoving = true
          input.setMovement(x, y)
        }
        on_release: () -> {
          state.isMoving = false
          input.setMovement(0, 0)
        }
      }

      // Action buttons
      button "Jump" {
        position: "bottom-right"
        icon: "jump"
        on_press: () -> input.jump()
      }

      button "Interact" {
        position: "bottom-right"
        offset: [0, -80]
        icon: "hand"
        on_press: () -> input.interact()
      }

      button "Menu" {
        position: "top-right"
        icon: "menu"
        on_press: () -> ui.toggleMenu()
      }
    }
  }
}
```

---

### Phase 5: Accessibility Layer

**5.1 Accessibility System**

Create: `systems/Accessibility.hsplus`

```hsplus
// src/systems/Accessibility.hsplus
system AccessibilitySystem {
  state {
    reducedMotion: false
    highContrast: false
    screenReaderEnabled: false
  }

  on_start {
    // Detect system preferences
    state.reducedMotion = device.prefersReducedMotion()
    state.highContrast = device.prefersHighContrast()
    state.screenReaderEnabled = device.hasScreenReader()

    // Load user preferences
    const prefs = storage.get("accessibility_prefs")
    if (prefs) {
      Object.assign(state, prefs)
    }
  }

  action setReducedMotion(enabled) {
    state.reducedMotion = enabled
    animation.setDuration(enabled ? 0 : 300)
    save_prefs()
  }

  action setHighContrast(enabled) {
    state.highContrast = enabled
    theme.setContrast(enabled ? "high" : "normal")
    save_prefs()
  }

  action announce(message, priority = "polite") {
    if (state.screenReaderEnabled) {
      screenReader.announce(message, priority)
    }
  }

  // Keyboard shortcuts
  keyboard {
    "?": () -> ui.showModal("KeyboardShortcuts")
    "m": () -> setReducedMotion(!state.reducedMotion)
    "h": () -> setHighContrast(!state.highContrast)
    "Tab": () -> ui.focusNext()
    "Shift+Tab": () -> ui.focusPrev()
    "Escape": () -> ui.closeModal()
  }
}
```

---

## File Structure After Migration

```
examples/hololand-central/
├── src/
│   ├── app.hsplus                    # Main composition (NEW)
│   ├── main.ts                       # Bootstrap only (MINIMAL)
│   │
│   ├── pages/
│   │   ├── Landing.hsplus            # Landing page
│   │   ├── Oasis.hsplus              # Planet view
│   │   └── Central.hsplus            # Downtown hub
│   │
│   ├── zones/
│   │   ├── main_plaza.hsplus         # (migrated from .tsx)
│   │   ├── casino.hsplus
│   │   ├── casino_interior.hsplus    # (already exists)
│   │   ├── builder_shop.hsplus
│   │   ├── social_lounge.hsplus
│   │   ├── infinity_shop.hsplus
│   │   └── arcade.hsplus
│   │
│   ├── systems/
│   │   ├── Tutorial.hsplus           # (migrated from .tsx)
│   │   ├── EasterEggs.hsplus         # (migrated from .tsx)
│   │   ├── Themes.hsplus             # (migrated from .ts)
│   │   ├── Multiplayer.hsplus        # (new)
│   │   └── Accessibility.hsplus      # (new)
│   │
│   ├── ui/
│   │   ├── MobileControls.hsplus     # (migrated from .tsx)
│   │   ├── MenuOverlay.hsplus
│   │   └── Modals.hsplus
│   │
│   ├── templates/
│   │   ├── Portal.hsplus             # Reusable portal
│   │   ├── NPC.hsplus                # Reusable NPC base
│   │   └── Collectible.hsplus        # Reusable collectible
│   │
│   └── npcs/
│       ├── plaza_npcs.hsplus
│       └── casino_npcs.hsplus
│
├── public/
│   └── models/
│
├── index.html
├── vite.config.ts                    # Build config (stays TS)
└── package.json
```

**Result**: ~5 TypeScript files, ~50+ HoloScript files

---

## Implementation Order

| Phase | Focus | Effort | Dependencies |
|-------|-------|--------|--------------|
| 1.1 | Main composition (app.hsplus) | Medium | None |
| 1.2 | Bootstrap refactor (main.ts) | Low | 1.1 |
| 2.* | Zone migrations | High | 1.* |
| 3.1 | Tutorial system | Medium | 1.* |
| 3.2 | Easter egg system | Medium | 1.* |
| 3.3 | Theme system | Low | 1.* |
| 3.4 | Multiplayer system | High | 1.*, @hololand/network |
| 4.* | UI components | Medium | 1.* |
| 5.* | Accessibility | Medium | 1.*, 4.* |

**Estimated Total**: Significant refactor, but the result is a proper showcase of HoloScript.

---

## Compiler/Runtime Requirements

Before migration, verify these work:

- [ ] `@holoscript/core` runtime executes in browser
- [ ] `@hololand/holoscript-compiler` R3F output works
- [ ] Hot reload works with Vite
- [ ] Systems can declare UI
- [ ] Imports between .hsplus files work
- [ ] Storage API available
- [ ] Network bindings available
- [ ] Device detection available

---

## Success Metrics

- **HoloScript files**: 50+ (up from ~10)
- **TypeScript files**: <10 (down from ~80)
- **Showcase**: Flagship product demonstrates the language
- **Documentation**: Example serves as HoloScript tutorial
- **AI-friendly**: Brittney can read/write the entire app

---

## Why This Matters

1. **Eat our own dogfood** - If HoloScript is the language, use it
2. **Prove the language** - Show it's not just for "content"
3. **AI generation** - Brittney generates HoloScript, not TypeScript
4. **Lower barrier** - Users learn one language, not two
5. **Consistency** - Same patterns everywhere

---

## Quick Start

```bash
# After migration, building an app is:

# 1. Create app.hsplus
# 2. Add zones, systems, UI
# 3. Run:
npx holoscript dev

# That's it. No React, no TypeScript knowledge needed.
```

**HoloScript IS the platform. TypeScript is just the bootstrap.**
