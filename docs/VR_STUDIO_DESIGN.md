# HoloLand OASIS — Wrist Powers & Holographic Creator System

> The HoloScript Studio experience inside HoloLand VR. Lightweight, holographic, 90% invisible.
> Users get **basic powers** via their wrists. Every power is extensible — users can build custom ones.

## Design Principles

1. **90% invisible** — Zero UI unless actively creating
2. **Holographic glass** — Translucent, glowing edges, no solid backgrounds
3. **One thing at a time** — Never more than 1 floating card visible
4. **Physical metaphors** — Marketplace = portal, assets = shelf, tools = wrist powers
5. **Contextual** — Appears on intent, fades on disengagement
6. **Gamers first** — Playing a game should feel like a game, not an IDE

---

## Wrist Powers (Basic Set)

Double-tap wrist → power ring appears as a glowing arc around the user's hand.

| Power | Gesture | Effect |
|---|---|---|
| **🔍 Select** | Point at object | Highlights object, whisper-label appears (name, type, creator) |
| **✋ Grab** | Pinch object | Pick up, move in 3D space |
| **🔄 Rotate** | Spin wrist while grabbing | Rotate selected object |
| **📏 Scale** | Spread/pinch with two hands | Resize selected object |
| **🎨 Paint** | Draw in air | Creates HoloScript geometry (lines, shapes, volumes) |
| **📋 Inspect** | Hold palm up toward object | Single holographic card: properties, code, edit button |
| **🗑️ Delete** | Flick away while grabbing | Remove from scene (undo via wrist menu) |
| **📦 Spawn** | Cup hands and pull apart | Opens asset shelf — pull items off to place |
| **🛒 Portal** | Draw circle in air | Opens marketplace portal — walk through to browse/buy |
| **💾 Save** | Tap wrists together | Saves current scene state |

### Wrist Menu (always accessible)

Tap wrist → minimal ring with 5 icons:
- ⚡ Powers (toggle creator mode)
- 👤 Avatar
- 🌍 Teleport
- 💬 Chat / Brittney AI
- ⚙️ Settings

---

## Holographic UI Elements

### Object Whisper
- Appears: 0.5s after pointing at an object
- Shows: Name + 1-line description + creator badge
- Style: Translucent glass card, 20cm wide, floats 10cm above object
- Fades: 2s after looking away

### Property Card (Inspect Power)
- Appears: When user holds palm toward selected object
- Shows: Key properties (position, material, behaviors), mini code snippet, **Edit** button
- Style: Single holographic card, ~40cm, slight glass blur
- Dismiss: Lower hand or swipe away

### Asset Shelf (Spawn Power)
- Appears: Cup hands and pull apart
- Shows: 3D carousel of recent/favorite assets
- Browse: Swipe left/right through categories
- Place: Grab item off shelf, drop into world
- Categories: Scenes | Characters | Props | Skills | Templates

### Marketplace Portal
- Appears: Draw circle gesture in air
- Shows: Glowing ring portal (like a Stargate)
- Enter: Walk through → immersive marketplace space
- Inside: Browse 3D previews of content, try before buy
- Exit: Walk back through portal → return to creation space

---

## Power Extension System

Users can build custom wrist powers using HoloScript:

```holoscript
power "Laser Cutter" {
  gesture: "finger_gun"
  trigger: "index_pinch"
  
  on_activate {
    emit ray from hand.index_tip
    on_hit(object) {
      split(object, ray.plane)
      play_effect("slice_spark")
    }
  }
  
  icon: "⚡"
  slot: 6  // custom slot on power ring
}
```

### Power Marketplace
- Users sell custom powers on the marketplace
- Powers can be: tools, weapons, effects, utilities
- Free powers come pre-installed (the 10 basic set)
- Pro powers are purchasable or craftable

---

## Mode Transitions

```
Game Mode (default)
  │
  ├── double-tap wrist → Creator Mode
  │     │
  │     ├── tap wrist → Wrist Menu (minimal ring)
  │     ├── gestures → Use powers directly
  │     ├── draw circle → Marketplace Portal
  │     └── double-tap wrist → back to Game Mode
  │
  └── No UI. No overlays. Pure immersion.
```

---

## Technical Bridge

| HoloScript Studio (2D) | → | HoloLand VR (3D) |
|---|---|---|
| `useSceneStore` (Zustand) | shared | Same store, different renderers |
| `panelVisibilityStore` | maps to | Power ring slot visibility |
| Scene Graph panel | becomes | Select + Inspect whispers |
| Properties panel | becomes | Property Card |
| Asset library | becomes | Asset Shelf (3D carousel) |
| Upload Wizard | becomes | Marketplace Portal |
| Code editor | becomes | Single floating code card |
| Marketplace filters | becomes | Spatial categories in portal |

Edits made in VR sync to web Studio and vice versa — same underlying `useSceneStore`.

---

*Part of the HoloLand OASIS — where everyone builds.*
