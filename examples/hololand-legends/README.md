# Hololand Legends

A 2D RPG demo for Hololand

## 🎮 Features

- **Cross-platform**: Phone (touch), Desktop (keyboard/gamepad), VR (controllers)
- **Pixel art world**: 16x16 tile-based exploration
- **Turn-based combat**: ATB-style battles with capture mechanics
- **Collect creatures**: Catch and level up your party
- **Low server cost**: Client-authoritative, local saves

---

## 🔄 HoloScript Refactor

This game uses a **hybrid architecture** that combines:

1. **HoloScript (`.holo` files)** - Declarative scene definitions
2. **TypeScript** - Runtime engine and game loop

### Why HoloScript?

| Before (Pure TypeScript) | After (HoloScript + TypeScript) |
|--------------------------|--------------------------------|
| Hardcoded game data | Declarative `.holo` files |
| Mix of logic and content | Clean separation |
| Dev-only editing | Designer-friendly format |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  .holo Files (Declarative)           TypeScript (Engine)   │
│  ───────────────────────             ────────────────────   │
│  game.holo          ─────┐                                  │
│  creatures.holo     ─────┼──▶  HoloScriptLoader.ts ──▶ Game │
│  maps/*.holo        ─────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
hololand-legends/
├── game.holo           # Main scene composition
├── creatures.holo      # All creature definitions
├── maps/
│   └── starting_town.holo  # Tile map data
└── src/
    └── game/
        └── HoloScriptLoader.ts  # Bridges .holo → TypeScript
```

### Example: Defining a Creature

**creatures.holo:**
```holoScript
creature "slime" {
  name: "Slime"
  class: "tank"
  element: "water"
  captureRate: 0.4
  
  baseStats {
    hp: 30
    atk: 5
    def: 10
    speed: 3
  }
  
  skills: ["tackle", "absorb"]
  habitat: "meadow"
}
```

### Example: Defining a Map

**maps/starting_town.holo:**
```holoScript
map "starting_town" {
  width: 20
  height: 15
  tileset: "tiles.png"
  
  encounters {
    rate: 0.02
    creatures: ["slime", "goblin"]
  }
  
  spawn { x: 10, y: 5 }
}
```

---

## 🚀 Quick Start

```bash
cd examples/hololand-legends
npm install
npm run dev
```

Open http://localhost:5173

---

## 🎮 Controls

| Platform | Move | Confirm | Cancel | Menu |
|----------|------|---------|--------|------|
| Desktop | WASD/Arrows | Enter/Z | Esc/X | Tab |
| Mobile | D-Pad | A Button | B Button | ☰ |
| Gamepad | Left Stick | A | B | Start |

---

## 📁 Project Structure

```
src/
├── game/
│   ├── Game.ts              # Core game loop
│   ├── HoloScriptLoader.ts  # .holo ↔ TypeScript bridge
│   ├── World.ts             # Tile map renderer
│   ├── Player.ts            # Player controller
│   ├── Battle.ts            # Combat system
│   └── Party.ts             # Party management
├── ui/
│   └── UIManager.ts
└── index.ts
```
