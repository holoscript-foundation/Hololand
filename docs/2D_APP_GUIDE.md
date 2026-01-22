# 2D App Development Guide

> **Hololand supports 2D apps!** Build desktop and mobile apps with the same codebase as your VR experiences.

## Quick Start

### Option 1: React Component (Recommended)

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';

function MyApp() {
  return (
    <HololandCanvas 
      mode="2d"  // Enable 2D mode
      rendererConfig={{ renderMode: '2d' }}
    >
      <HololandObject 
        type="ui-container" 
        position={{ x: 0, y: 0 }}  // z ignored in 2D
      >
        <HololandObject type="button" text="Click Me" onClick={handleClick} />
        <HololandObject type="input" placeholder="Enter text..." />
      </HololandObject>
    </HololandCanvas>
  );
}
```

### Option 2: Direct 2D Renderer

```typescript
import { Hololand2DRenderer } from '@hololand/renderer';
import { HololandWorld } from '@hololand/world';

const canvas = document.getElementById('app') as HTMLCanvasElement;
const world = new HololandWorld({ physics: '2d' });

const renderer = new Hololand2DRenderer(canvas, world, {
  backgroundColor: '#1a1a2e',
  showGrid: true,
  viewMode: '2d-top',  // or '2d-side', '2d-front', 'isometric'
  enableZoom: true,
  enablePan: true,
});

renderer.start();
```

---

## Rendering Modes

| Mode | Use Case | Renderer |
|------|----------|----------|
| `2d` | Pure 2D apps (dashboards, forms) | Canvas 2D / DOM |
| `3d` | Full 3D worlds | Three.js |
| `hybrid` | 2D UI over 3D scene | Both |
| `vr` | VR headsets | WebXR + Three.js |
| `ar` | Mobile AR | WebXR AR |

```typescript
import { HololandRenderer } from '@hololand/renderer';

const renderer = new HololandRenderer(canvas, world, {
  renderMode: '2d',  // Start in 2D mode
});

// Switch modes dynamically
renderer.setRenderMode('hybrid');  // Add 3D preview
renderer.setRenderMode('vr');      // Enter VR
```

---

## 2D View Modes

The 2D renderer supports multiple projections:

```typescript
import { Hololand2DRenderer } from '@hololand/renderer';

const renderer = new Hololand2DRenderer(canvas, world, {
  viewMode: '2d-top',  // Bird's eye view (x, z → x, y)
});

// Available modes:
// '2d-top'   - Top-down view (good for maps, strategy games)
// '2d-side'  - Side view (good for platformers)
// '2d-front' - Front view (good for UI-focused apps)
// 'isometric' - Isometric projection (good for tactics games)

renderer.setViewMode('isometric');
```

---

## UI Components (@hololand/ui)

Pre-built 2D components:

```tsx
import { Button, TextInput, Panel, Image, List } from '@hololand/ui';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column' }}>
      <TextInput 
        placeholder="Add task..." 
        onSubmit={(text) => setTodos([...todos, { id: Date.now(), text }])}
      />
      <List data={todos} renderItem={(todo) => (
        <Panel key={todo.id} style={{ flexDirection: 'row' }}>
          <span>{todo.text}</span>
          <Button text="Delete" onClick={() => removeTodo(todo.id)} />
        </Panel>
      )} />
    </Panel>
  );
}
```

---

## HoloScript 2D Syntax

### Using @mode Directive (Coming Soon)

```hsplus
@mode: 2d
@target: desktop, mobile, web

scene "TodoApp" {
  ui {
    panel style="flex column" {
      input id="newTodo" placeholder="Add task"
      button text="Add" @on_click="addTodo()"
      
      list id="todoList" @data="todos" {
        item @key="id" {
          text "{{ item.text }}"
          button text="X" @on_click="removeTodo({{id}})"
        }
      }
    }
  }
  
  state {
    todos: []
  }
  
  logic {
    addTodo() {
      push todos { id: uuid(), text: getInput("newTodo") }
    }
    removeTodo(id) {
      filter todos != id
    }
  }
}
```

---

## Hybrid Mode (2D UI + 3D World)

Perfect for games with UI overlays or 3D product viewers with controls:

```tsx
import { HololandCanvas, HololandObject } from '@hololand/react-three';
import { Panel, Button } from '@hololand/ui';

function ProductViewer() {
  const [rotation, setRotation] = useState(0);
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 3D Canvas */}
      <HololandCanvas mode="hybrid">
        <HololandObject 
          type="model" 
          src="/product.glb"
          rotation={{ y: rotation }}
        />
      </HololandCanvas>
      
      {/* 2D UI Overlay */}
      <Panel style={{ position: 'absolute', bottom: 20, left: 20 }}>
        <Button text="Rotate Left" onClick={() => setRotation(r => r - 0.5)} />
        <Button text="Rotate Right" onClick={() => setRotation(r => r + 0.5)} />
        <Button text="Enter VR" onClick={() => renderer.setRenderMode('vr')} />
      </Panel>
    </div>
  );
}
```

---

## Deployment Targets

### Desktop (Tauri - recommended)

```bash
cd your-app
npm run tauri build
# Outputs: .exe (Windows), .dmg (Mac), .AppImage (Linux)
```

### Desktop (Electron)

```bash
npm run electron:build
```

### Mobile (React Native)

```tsx
import { HololandCanvas } from '@hololand/react-native';

function App() {
  return (
    <HololandCanvas mode="2d">
      {/* Same components work! */}
    </HololandCanvas>
  );
}
```

### Web

```bash
npm run build
# Deploy dist/ to Vercel, Netlify, etc.
```

---

## 2D Physics (Optional)

For 2D games, use simplified physics:

```typescript
import { HololandWorld } from '@hololand/world';

const world = new HololandWorld({
  physics: '2d',  // Uses 2D collision detection
  gravity: { x: 0, y: -9.8 },  // 2D gravity
});
```

---

## Performance Tips

1. **Use 2D mode for UI-heavy apps** - Avoids 3D rendering overhead
2. **Enable layer culling** - Only render visible layers
3. **Use DOM rendering for forms** - Better accessibility and native inputs
4. **Progressive enhancement** - Start 2D, upgrade to 3D/VR as needed

---

## Examples

| Example | Description | Location |
|---------|-------------|----------|
| Todo App | Pure 2D task manager | `examples/2d-todo/` |
| Dashboard | 2D charts with 3D preview | `examples/hybrid-dashboard/` |
| Product Viewer | 3D model with 2D controls | `examples/product-viewer/` |
| 2D Game | Platformer using 2D physics | `examples/2d-platformer/` |

---

## Migration from 3D to 2D

Already have a 3D app? Switch to 2D easily:

```tsx
// Before (3D)
<HololandCanvas>
  <HololandObject position={{ x: 0, y: 1, z: 5 }} />
</HololandCanvas>

// After (2D) - just add mode="2d"
<HololandCanvas mode="2d">
  <HololandObject position={{ x: 0, y: 1 }} />  {/* z ignored */}
</HololandCanvas>
```

---

## Related Documentation

- [ROADMAP.md](./ROADMAP.md#phase-2-universal-rendering) - Full 2D rendering specs
- [packages/ui/README.md](./packages/ui/README.md) - UI component docs
- [packages/renderer/README.md](./packages/renderer/README.md) - Renderer API
- [DEPLOYMENT_TAURI.md](./docs/DEPLOYMENT_TAURI.md) - Desktop deployment

---

**Questions?** Open an issue or ask Brittney: "How do I build a 2D todo app?"
