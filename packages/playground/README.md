# @hololand/playground

**HoloScript Playground** - Build 3D worlds in real-time with AI agents.

> Built WITH HoloScript, not about HoloScript.

## Vision

The playground is defined in `playground.holo` - the IDE is itself a HoloScript composition that the runtime renders. This proves the power of the language: you can build development tools, games, simulations, and entire applications using the same declarative syntax.

## Features

### 🖊️ Code Editor
- Monaco editor embedded via HoloScript `type: "monaco-editor"`
- Syntax highlighting for `.holo`, `.hsplus`, `.hs`
- Code completion with Brittney AI suggestions
- Real-time validation and error display

### 🎮 Live 3D Preview
- Real-time rendering of your HoloScript
- Hot reload on every keystroke
- Performance metrics overlay (FPS, draw calls)
- VR/AR mode support with WebXR

### 🤖 AI Agent Collaboration
- Brittney AI for natural language → HoloScript
- Real-time multi-agent editing (see `agent-collaboration.hsplus`)
- Suggestions with accept/reject workflow
- Voice command support

### 🔍 Scene Inspector
- Live object tree
- Property editing
- Trait visualization

## Quick Start

```bash
# From the Hololand monorepo
cd packages/playground
npm run dev

# Opens at http://localhost:3000
```

## Files

| File | Purpose |
|------|---------|
| `playground.holo` | Main composition - THE playground UI |
| `agent-collaboration.hsplus` | AI agent real-time editing system |
| `index.html` | Browser entry point - loads HoloScript runtime |

## How It Works

```
index.html
    ↓ loads
@holoscript/runtime
    ↓ parses
playground.holo
    ↓ renders
IDE with Editor, 3D Preview, AI Panel
```

The HoloScript runtime does the heavy lifting:
- Parses `.holo` compositions
- Renders 3D objects via Three.js/WebGL
- Handles input, networking, VR
- Provides built-in UI components (`type: "monaco-editor"`, `type: "3d-viewport"`, etc.)

## Extending

Add new features by editing `playground.holo`:

```holo
// In playground.holo
spatial_group "CustomPanel" {
  position: [4, 2, -2]
  
  object "MyTool" {
    type: "ui-button"
    label: "My Custom Tool"
    on_click: { do_something() }
  }
}
```

## Related

- [@holoscript/runtime](../runtime) - Browser runtime that powers this
- [@hololand/brittney](../brittney) - AI assistant integration
- [@holoscript/core](../../HoloScript/packages/core) - Parser and AST

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
