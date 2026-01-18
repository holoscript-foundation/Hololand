# Hololand Legends

A 2D RPG demo for Hololand combining Pokémon Heart Gold style graphics with Final Fantasy party mechanics.

## Features

- 🎮 **Cross-platform**: Phone (touch), Desktop (keyboard/gamepad), VR (controllers)
- 🌍 **Pixel art world**: 16x16 tile-based exploration
- ⚔️ **Turn-based combat**: ATB-style battles with capture mechanics
- 📦 **Collect creatures**: Catch and level up your party
- 💾 **Low server cost**: Client-authoritative, local saves

## Quick Start

```bash
cd examples/hololand-legends
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Controls

### Desktop
- **WASD / Arrow Keys**: Move
- **Enter / Space / Z**: Confirm
- **Escape / X**: Cancel
- **Tab**: Menu

### Mobile
- Virtual D-pad on left
- Action buttons on right

### VR
- Joystick: Move
- Trigger: Confirm
- Grip: Menu

## Project Structure

```
src/
├── game/
│   ├── Game.ts         # Core game loop
│   ├── World.ts        # Tile map renderer
│   ├── Player.ts       # Player controller
│   ├── Battle.ts       # Combat system
│   ├── Party.ts        # Party management
│   ├── InputManager.ts # Cross-platform input
│   └── AssetLoader.ts  # Asset loading
├── ui/
│   └── UIManager.ts    # UI rendering
├── creatures/          # Creature definitions
├── maps/               # Level data
└── assets/
    ├── sprites/        # Pixel art spritesheets
    └── audio/          # Sound effects & music
```

## Demo Scope

- 5 explorable zones
- 30 creatures to catch
- 10+ items
- 1 boss battle
- ~30 min gameplay
