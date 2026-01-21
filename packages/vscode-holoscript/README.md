# HoloScript for VS Code

Language support and file icons for HoloScript (`.holo`) and HoloScript Plus (`.hsplus`) files.

## Features

### File Icons
- Holographic "H" icon for `.holo` files (cyan-purple-pink gradient)
- Enhanced icon with gold "+" badge for `.hsplus` files

### Syntax Highlighting
Full syntax highlighting for both HoloScript formats:
- Object definitions (cube, sphere, panel, etc.)
- Properties (position, rotation, color, etc.)
- Events (on_click, on_hover, etc.)
- Materials and constants
- Comments and strings

### HoloScript Plus Extras
Additional highlighting for `.hsplus` advanced features:
- Networked objects and multiplayer keywords
- Physics constraints (hinge, spring, etc.)
- Procedural generation (terrain, noise)
- System imports (NetworkedWorldState, PartySystem, etc.)

### IntelliSense
Auto-completion for:
- Object types with snippets
- Properties and events
- System imports (`.hsplus` only)

## File Types

| Extension | Purpose | Use Case |
|-----------|---------|----------|
| `.holo` | Standard HoloScript | Learning, prototyping, simple apps |
| `.hsplus` | HoloScript Plus | Production, multiplayer, advanced features |

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install hololand.holoscript`

### From VSIX
1. Download the `.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
4. Type "Install from VSIX"
5. Select the downloaded file

### Development Install
```bash
cd packages/vscode-holoscript
npm install
npm run compile
code --install-extension holoscript-1.0.0.vsix
```

## Example Code

### .holo (Basic)
```holo
// Simple spinning cube
cube my_cube {
  position: [0, 1, 0]
  size: 1
  color: "#00d4ff"
}

animation spin {
  target: my_cube
  property: rotation.y
  duration: 2s
  loop: true
}
```

### .hsplus (Advanced)
```hsplus
import { NetworkedWorldState } from "./systems/NetworkedWorldState.hsplus"
import { PhysicsConstraints } from "./systems/PhysicsConstraints.hsplus"

// Multiplayer-synced player
networked_object player {
  sync_rate: 20hz
  interpolation: true

  position: synced
  rotation: synced
  health: synced
}

// Physics door
constraint door_hinge {
  type: hinge
  body_a: door
  body_b: frame
  axis: [0, 1, 0]
  limits: [-90deg, 0deg]
}
```

## Icon Theme

To use the HoloScript file icons:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Preferences: File Icon Theme"
3. Select "HoloScript Icons"

Or add to your `settings.json`:
```json
{
  "workbench.iconTheme": "holoscript-icons"
}
```

## Related

- [Hololand](https://github.com/hololand/hololand) - The spatial computing platform
- [HoloScript Docs](https://hololand.dev/docs/holoscript) - Language documentation
- [Brittney AI](https://hololand.dev/brittney) - AI assistant for HoloScript

## License

MIT
