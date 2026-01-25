# Hololand Central - 3-Layer Architecture

**Hololand Central** is the unified VR/AR experience that works across desktop (Tauri) and mobile (Capacitor). It uses a 3-layer architecture that separates concerns and enables Brittney AI to assist users building and exploring worlds.

## 🏗️ The 3 Layers

```
┌───────────────────────────────────────────────────────────────┐
│                        UI LAYER                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │   Chat Panel    │ │  Navigation     │ │   Settings      │ │
│  │   (Brittney)    │ │  Menus          │ │   Overlays      │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│                       WORLD LAYER                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              3D VR/AR Content                           │ │
│  │                                                         │ │
│  │   .holo compositions    HoloScript scenes              │ │
│  │   Interactive objects   Physics simulations            │ │
│  │   Multiplayer avatars   Downtown zones                 │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│                    BACKGROUND LAYER                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│  │  Brittney AI    │ │   HoloScript    │ │   Networking    │ │
│  │  Inference      │ │   Runtime       │ │   Services      │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### UI Layer
- **Chat Interface**: Brittney AI chat panel for world building assistance
- **Navigation**: Zone menus, theme selectors, portal controls
- **Overlays**: Settings, inventory, Easter egg notifications
- **Input**: Touch, voice, keyboard, VR controllers

### World Layer
- **3D Content**: HoloScript scenes (.holo, .hsplus, .hs files)
- **Interactive Objects**: Grabbable, throwable, physics-enabled
- **Zones**: Downtown areas, building zones, social spaces
- **Rendering**: Three.js, WebXR, platform adapters

### Background Layer
- **Brittney AI**: Local GGUF inference (desktop) or WASM/cloud (mobile)
- **HoloScript Runtime**: Parsing, execution, hot-reload
- **Networking**: WebRTC, local multiplayer, state sync
- **Storage**: Preferences, AI model cache, world data

## Platform Variants

| Platform | UI Layer | World Layer | Background Layer |
|----------|----------|-------------|------------------|
| **Desktop (Tauri)** | Web + Tauri APIs | Three.js + WebXR | Native GGUF inference |
| **Mobile (Capacitor)** | Web + Native plugins | Three.js + ARCore/ARKit | WASM GGUF or Cloud |
| **Web (Browser)** | Pure Web | Three.js + WebXR | Cloud API only |

## Brittney's Role

Brittney AI is the **intelligent assistant** embedded in the Background Layer:

1. **World Building**: Users describe what they want, Brittney generates HoloScript
2. **Code Assistance**: Brittney suggests traits, fixes errors, explains code
3. **Runtime Help**: Brittney analyzes running scenes and suggests improvements
4. **Learning**: Brittney teaches HoloScript through interactive examples

### Interaction Flow

```
User (UI Layer)                    Brittney (Background Layer)
     │                                      │
     │  "Create a floating orb"            │
     ├──────────────────────────────────────► │
     │                                      │
     │  ◄────────────────────────────────── │
     │  [HoloScript generated]              │
     │                                      │
     ▼                                      │
World Layer                                 │
     │                                      │
     │  [Scene updated with orb]           │
     │                                      │
```

## Integration Points

### Desktop (Tauri)
- `apps/brittney-desktop/` - Standalone Brittney app
- Integrated into Hololand Central via shared UI components
- Model files in `src-tauri/models/`

### Mobile (Capacitor)
- `apps/brittney-mobile/` - Mobile Brittney app
- Smaller Q4 quantized model for device constraints
- Cloud fallback for complex queries

### Hololand Central
- `examples/hololand-central/` - Full VR hub experience
- Brittney accessible via chat panel overlay
- Voice activation for VR/AR modes

## Model Distribution

Brittney V1 Expert is distributed via GitHub Releases:

| Model | Size | Use Case |
|-------|------|----------|
| `brittney-v1-expert.gguf` | 1.57 GB | Desktop (full quality) |
| `brittney-v1-q4.gguf` | ~0.9 GB | Mobile (quantized) |

Download options:
- GitHub Releases: `https://github.com/brianonbased-dev/Hololand/releases`
- npm: `npx @hololand/brittney-models download v1-free`
- Auto-download: Apps fetch on first run

## License

Brittney AI is licensed under the **Brittney AI License**, which permits local use, education, research, and game development, but prohibits API hosting and reverse engineering.

See: [packages/brittney/models/LICENSE.md](../packages/brittney/models/LICENSE.md)
