# @hololand/playground

**HoloScript IDE** - The centerpiece development tool for Hololand.

## Features

### 🖊️ Monaco Editor
- Syntax highlighting for `.holo` and `.hsplus` files
- Code completion with Brittney AI suggestions
- Real-time error squiggles with live validation
- Bracket matching and auto-indent

### 🎮 Live 3D Preview
- Real-time Three.js rendering
- Hot reload on code changes
- Performance metrics overlay (FPS, draw calls, triangles)
- Error visualization in 3D space

### 🤖 Brittney AI Panel
- Natural language → HoloScript generation
- One-click code injection to running scene
- Code explanation and optimization suggestions
- Context-aware scene understanding

### 🔍 Scene Inspector
- Hierarchical object tree
- Live property editing
- Trait visualization
- Performance profiling

## Quick Start

```tsx
import { Playground } from '@hololand/playground';

function App() {
  return (
    <Playground
      initialCode={`
        composition "My Scene" {
          environment { skybox: "sunset" }
          object "Player" { position: [0, 1, 0] }
        }
      `}
      onCodeChange={(code) => console.log('Code updated:', code)}
    />
  );
}
```

## Components

### `<Playground />`
Full IDE with all panels.

### `<HoloEditor />`
Standalone Monaco editor with HoloScript support.

### `<LivePreview />`
3D preview panel with Three.js rendering.

### `<BrittneyPanel />`
AI assistant chat interface.

### `<SceneInspector />`
Object tree and property editor.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Playground Layout                     │
├─────────────┬─────────────────────────┬─────────────────┤
│  Inspector  │      HoloEditor          │  Brittney AI   │
│  (tree)     │      (Monaco)            │  (chat)        │
│             │                           │                │
│             ├─────────────────────────┤                │
│             │      LivePreview         │                │
│             │      (Three.js)          │                │
└─────────────┴─────────────────────────┴─────────────────┘
```

## State Management

Uses Zustand for playground state:
- `code` - Current HoloScript source
- `ast` - Parsed AST (from @holoscript/core)
- `entities` - 3D objects in scene
- `errors` - Parse/runtime errors
- `selectedEntity` - Currently selected object
