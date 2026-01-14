# 07 - Hybrid World

The flagship Phase 2 example: **2D UI controlling a 3D VR world**.

This demonstrates Hololand's hybrid rendering mode where a 2D control panel overlays and interacts with a full 3D WebXR-ready world.

## Features Demonstrated

- **Dual Canvas Rendering**: Separate canvases for 3D world and 2D UI
- **Real-time Object Spawning**: Create 3D objects from UI controls
- **Object Manipulation**: Size, height, glow controls
- **Camera Controls**: Reset view, auto-rotate
- **VR-Ready**: WebXR support for VR headsets
- **Live Stats**: FPS counter, object count

## Running the Example

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Architecture

```
+------------------------------------------------------------------+
|                         3D World Canvas                          |
|                      (Three.js + WebXR)                          |
|                                                                   |
|                           [Orb]                                   |
|                                                                   |
|        [Cube]                              [Sphere]               |
|                                                                   |
|     -------------------Ground Plane-----------------------        |
|                                                                   |
+------------------------------------------------------------------+
|  2D UI Overlay  |
|  +------------+ |
|  | Controls   | |
|  | [Dropdown] | |
|  | [Spawn]    | |
|  | [Sliders]  | |
|  | [Toggles]  | |
|  | [Stats]    | |
|  +------------+ |
+-----------------+
```

## UI to World Interaction

```typescript
// Spawn 3D object from UI button
spawnBtn.onClick = () => {
  world.createObject('cube', {
    position: { x: Math.random() * 10, y: 1, z: Math.random() * 10 },
    metadata: { color: 0xff0000 }
  });
};

// Control object properties with slider
sizeSlider.onChange = (value) => {
  centerOrb.setScale({ x: value, y: value, z: value });
};
```

## Components Used

### 3D Layer
| Package | Component | Purpose |
|---------|-----------|---------|
| `@hololand/world` | `HololandWorld` | Physics & object management |
| `@hololand/renderer` | `HololandRenderer` | Three.js + WebXR rendering |

### 2D Layer
| Package | Component | Purpose |
|---------|-----------|---------|
| `@hololand/ui` | `UICanvas` | Transparent overlay |
| `@hololand/ui` | `Panel` | Control sections |
| `@hololand/ui` | `Dropdown` | Object type selection |
| `@hololand/ui` | `Slider` | Size, height controls |
| `@hololand/ui` | `Toggle` | Glow, auto-rotate |
| `@hololand/ui` | `Button` | Spawn, clear, VR |
| `@hololand/ui` | `Modal` | Notifications |

## VR Support

The 3D world is WebXR-ready. When viewed on a VR headset:
1. The 2D UI remains as an overlay (or can be hidden)
2. The 3D world becomes immersive
3. Objects can still be manipulated via the panel

## Use Cases

- **World Builder**: Create VR experiences with visual tools
- **Game Editor**: Design levels with real-time preview
- **Digital Twin Control**: Monitor and adjust 3D simulations
- **VR Dashboard**: Business metrics in 3D space
