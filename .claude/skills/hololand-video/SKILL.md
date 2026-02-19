---
name: hololand-video
description: >
  Generate instructional video components for the HoloLand VR/AR platform.
  Use when asked to create tutorial videos, 3D scene walkthroughs, XR deployment
  demos, Brittney AI demonstrations, adapter comparisons, or any educational
  content about HoloLand packages. Auto-triggers on: "create a video", "make a
  tutorial", "walkthrough", "demo video", "show how HoloLand works".
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# HoloLand Video Tutorial Skill

## Your Mission
You create professional instructional videos for the HoloLand VR/AR platform using
Remotion + Code Hike. HoloLand is the ecosystem layer on top of HoloScript — it
provides physics, rendering adapters, AI (Brittney), AR features, and a full
social/multiplayer stack for building immersive XR experiences.

---

## HoloLand Architecture (Always Authoritative)

### Repository Structure
- pnpm monorepo at `c:/Users/Josep/Documents/GitHub/Hololand/`
- Packages: `packages/adapters/*`, `packages/ar/*`, `packages/brittney/*`,
  `packages/platform/*`, `packages/devtools/*`, `packages/shared/*`
- Examples: `examples/01-hello-vr-world/`, `examples/02-physics-playground/`, etc.
- Links to HoloScript: `../HoloScript/packages/*` via pnpm overrides

### Core .holo File Formats (Three types used in HoloLand)

**1. Visual .holo (declarative scenes)**
```holo
scene EnchantedForest {
  object Tree {
    mesh: Cylinder { radius: 0.3, height: 8 }
    material: PBRMaterial { color: #2d4a1e, roughness: 0.8 }
    position: [0, 4, -5]
    traits: [Interactable, PhysicsBody]
  }
  environment: Forest { fog: 0.02, ambient: #112200 }
}
```

**2. .hsplus (full programming language with logic)**
```hsplus
import { Scene, Physics } from "@hololand/core"
scene PhysicsPlayground extends Scene {
  state { selectedObject: string | null = null }
  on click(obj) { this.state.selectedObject = obj.id }
}
```

**3. .hs (classic HoloScript — simple demos)**

### Key Packages to Explain in Videos

| Package | What it does | Video priority |
|---------|-------------|----------------|
| `@hololand/core` | Runs HoloScript code, coordinates all subsystems | HIGH |
| `@hololand/world` | Physics engine (gravity, collisions, rigid bodies) | HIGH |
| `@hololand/renderer` | 3D graphics via adapters | HIGH |
| `@hololand/babylon-adapter` | Babylon.js rendering backend | MEDIUM |
| `@hololand/three-adapter` | Three.js + physics | MEDIUM |
| `@hololand/ar/*` | Spatial anchors, AR detection, tracking | HIGH |
| `@hololand/brittney-service` | AI world generation | VERY HIGH |
| `@hololand/playground` | In-browser interactive editor | HIGH |
| `@hololand/react-three` | React components for XR | MEDIUM |
| `@hololand/vrchat-export` | VRChat world export | MEDIUM |

---

## Video Types and Strategies

### Type 1: .holo Syntax for XR Scenes
**Approach**: Code Hike markdown walkthrough
**Strategy**: Show building a room from scratch — floor, walls, objects, NPCs, lighting
**Duration**: 4-5 minutes
**Target audience**: New HoloLand developers

### Type 2: Adapter Comparison
**Approach**: Side-by-side code split screen in Remotion
**Strategy**: Same .holo scene, rendered by Babylon adapter vs Three.js adapter
**Duration**: 2-3 minutes
**Key message**: Write once, choose renderer at deploy time

### Type 3: Brittney AI Demo
**Approach**: Playwright recording of the Brittney web interface
**Strategy**: Show natural language prompt → generated .holo scene → rendered in browser
**Special**: Requires running local dev server on port 3000 + port 11435
**Duration**: 3-4 minutes

### Type 4: Physics Playground Walkthrough
**Approach**: Remotion composition with embedded iframe or GIF
**Strategy**: Walk through `examples/02-physics-playground/scene.holo` step by step
**Duration**: 3 minutes

### Type 5: AR Feature Tutorial
**Approach**: Device recording + narration overlay in Remotion
**Strategy**: Spatial anchors, AR detection, volumetric bridge
**Special**: Requires physical AR device for capture segments
**Duration**: 5 minutes

### Type 6: Full Project Build (Hero Video)
**Approach**: Multi-agent Code2Video-style orchestration
**Strategy**: Build the VR shop example from scratch start to finish
**Duration**: 8-10 minutes
**Key resource**: `examples/03-vr-shop/scene.holo`

---

## Video Package Location

HoloLand does NOT have its own video-tutorials package yet.
Use one of two approaches:

**Option A** (Recommended): Create `packages/devtools/video-tutorials/` in HoloLand
- Follows existing devtools pattern
- Can reference `@hololand/core` and `@hololand/playground` directly

**Option B**: Use HoloScript's `packages/video-tutorials/` with cross-repo imports
- Avoids duplication
- More complex setup

If creating the HoloLand package, use this structure:
```
packages/devtools/video-tutorials/
├── package.json         (@hololand/video-tutorials)
├── remotion.config.ts
├── src/
│   ├── index.ts
│   ├── Root.tsx
│   ├── compositions/
│   │   ├── SyntaxIntroductionXR.tsx
│   │   ├── BabylonAdapterDemo.tsx
│   │   ├── BrittneyAIDemo.tsx
│   │   └── PhysicsPlaygroundWalkthrough.tsx
│   ├── content/
│   │   └── *.md  (Code Hike markdown)
│   └── components/
│       ├── TitleCard.tsx     (reuse from @holoscript/video-tutorials)
│       ├── CodeStep.tsx
│       └── XRDeviceFrame.tsx (NEW: device mockup overlay for AR videos)
└── scripts/
    ├── render-all.ts
    └── capture-browser-demo.ts  (Playwright-based browser recording)
```

---

## Special Component: XR Device Frame

For videos showing AR/VR device output, use an XR device frame overlay:
```tsx
// Wraps Babylon.js WebXR canvas in a device mockup
export const XRDeviceFrame: React.FC<{
  device: 'hololens2' | 'vision-pro' | 'quest3' | 'phone-ar'
  children: React.ReactNode
}> = ({ device, children }) => {
  // Renders a 3D device outline around the content
}
```

---

## Playwright Browser Recording

For Brittney AI demos and interactive playground demos:
```ts
// scripts/capture-browser-demo.ts
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  recordVideo: { dir: "public/captures/", size: { width: 1920, height: 1080 } }
});
const page = await context.newPage();

await page.goto("http://localhost:3000");
// Interact with the playground or Brittney AI
await page.locator('[data-testid="brittney-prompt"]').fill(
  "Create a forest scene with an NPC wizard who gives quests"
);
await page.keyboard.press("Enter");
await page.waitForSelector('[data-testid="scene-rendered"]', { timeout: 30000 });

await context.close();
// Video saved to public/captures/
```

---

## Brittney AI Prompt Templates for Video Generation

When demonstrating Brittney in tutorials:

**Simple scene** (for beginners):
> "Create a peaceful Japanese garden with a stone lantern, koi pond with fish,
>  cherry blossom trees, and ambient night sounds"

**Game mechanics** (for advanced):
> "Create a dungeon room with a chest that opens when the player approaches,
>  a locked door that requires a key item, and a patrolling skeleton guard NPC"

**Social space**:
> "Create a virtual conference room with 8 seats, a presentation screen,
>  whiteboard, and ambient office music"

---

## MCP Tools Available in HoloLand

These MCP tools are available when developing in the HoloLand repo:
- `brittney_scan_project` — Scan for .holo files and analyze structure
- `brittney_diagnostics` — Get diagnostics for the workspace
- `brittney_autocomplete` — Get completion suggestions
- `generate_object` — Generate a .holo object from natural language
- `generate_scene` — Generate a full .holo scene
- `suggest_traits` — Get trait suggestions for an object type

Use these tools BEFORE writing video scripts to get accurate, current API details.

---

## Brand Guidelines (HoloLand)

```ts
export const hololandTheme = {
  bg: "#070b14",             // Deep space black
  surface: "#0d1526",        // Card background
  accent: "#7c3aed",         // HoloLand purple
  accentGlow: "#5b21b6",     // Purple glow
  accentDim: "#7c3aed22",    // Transparent purple
  secondary: "#06b6d4",      // Cyan (Brittney AI)
  text: "#f8fafc",
  textMuted: "#94a3b8",
  font: "'JetBrains Mono', monospace",
  titleFont: "'Inter', system-ui, sans-serif",
}
```

---

## Quick Prompt Templates

**"Create an intro to HoloLand .holo syntax":**
> "Using the hololand-video skill, create a Code Hike walkthrough showing how
>  to build a simple VR room scene. Include: floor, walls, a door, ambient
>  lighting, and background music. Show the Babylon.js adapter rendering it.
>  5 steps, 4 minutes."

**"Demo Brittney AI":**
> "Using the hololand-video skill, create a Playwright capture script that
>  records the Brittney AI interface generating a scene, then wrap it in a
>  Remotion composition with narration. Show: type prompt → see generation → scene renders."

**"Adapter comparison":**
> "Using the hololand-video skill, create a split-screen video comparing
>  Babylon.js and Three.js adapters rendering the same .holo scene. Show the
>  adapter config change and the visual difference."
