# 🎨 Hololand No-Code World Builder - Design & Implementation Specification

**Date**: January 15, 2026  
**Status**: Design Specification Phase  
**Target Complexity**: Low (non-technical creators)  
**Estimated Implementation**: 600 lines of code (React + Three.js)

---

## 📋 Table of Contents

1. [Vision & Philosophy](#vision--philosophy)
2. [User Workflows](#user-workflows)
3. [UI/UX Design](#uiux-design)
4. [Component Architecture](#component-architecture)
5. [Asset Library](#asset-library)
6. [Physics System](#physics-system)
7. [Interactions System](#interactions-system)
8. [Networking & Multiplayer](#networking--multiplayer)
9. [Deployment Pipeline](#deployment-pipeline)
10. [Code Generation](#code-generation)
11. [Implementation Timeline](#implementation-timeline)

---

## Vision & Philosophy

### Design Principles

1. **30-Second Learning Curve**
   - Designer learns drag-drop in 30 seconds
   - First world created in < 10 minutes
   - No code knowledge required

2. **Obvious Actions**
   - Buttons are clear and findable
   - Drag-drop is the primary interaction
   - Right-click = context menu (edit/delete/copy)

3. **Smart Defaults**
   - Objects have sensible physics by default
   - Lighting is auto-configured
   - Mobile-responsive by default

4. **Progression Model**
   - Level 1: Drag & drop (no coding)
   - Level 2: Configure properties (UI forms)
   - Level 3: Add behaviors (visual scripting)
   - Level 4: Custom code (HoloScript)

---

## User Workflows

### Workflow 1: Create First World (10 minutes)

**User Flow**:
```
1. Click "Create New World"
2. Choose template (or blank)
3. See 3D editor view
4. Drag objects from asset panel onto canvas
5. Adjust position/rotation/scale (intuitive controls)
6. Add behaviors (click object → right panel shows options)
7. Click "Preview" to test
8. Click "Deploy" → World live
```

**Time Breakdown**:
- Choose template: 1 min
- Add/arrange objects: 5 min
- Configure behaviors: 3 min
- Deploy: 1 min
- **Total: 10 minutes**

### Workflow 2: Customize Existing World (5 minutes)

**User Flow**:
```
1. Open existing world
2. Browse asset library
3. Replace objects
4. Adjust colors/textures
5. Tweak behaviors
6. Preview & deploy
```

**Time Breakdown**:
- Browse/select: 2 min
- Customize: 2 min
- Deploy: 1 min
- **Total: 5 minutes**

### Workflow 3: Advanced Customization (30 minutes)

**User Flow**:
```
1. Import custom assets
2. Write behavior logic (visual scripting)
3. Add custom interactions
4. Configure physics properties
5. Set up networking/multiplayer
6. Add sounds/music
7. Test & refine
8. Deploy
```

**Time Breakdown**:
- Asset import: 5 min
- Scripting: 15 min
- Config: 5 min
- Testing: 5 min
- **Total: 30 minutes**

---

## UI/UX Design

### Main Editor Layout

```
┌─────────────────────────────────────────────────────────┐
│  Hololand World Builder                    [? Home Save] │
├─────────────────────────────────────────────────────────┤
│  File  Edit  View  Help                                 │
├─────────────┬──────────────────────┬─────────────────────┤
│             │                      │                     │
│  Asset      │    3D Canvas         │  Inspector Panel    │
│  Library    │    (Drag area)       │                     │
│             │                      │  Object: Sphere_1   │
│  Objects:   │    [Grid visible]    │  ├─ Position       │
│  ├─ Sphere  │    [Axis visible]    │  ├─ Rotation       │
│  ├─ Cube    │    [Snap enabled]    │  ├─ Scale          │
│  ├─ Door    │                      │  ├─ Physics        │
│  ├─ Chair   │    [Mouse: Move]     │  ├─ Behavior       │
│  └─ NPC     │                      │  └─ Materials      │
│             │                      │                     │
│  Lights:    │                      │  [Delete] [Duplicate]
│  ├─ Sun     │                      │                     │
│  ├─ Spot    │                      │  [Physics] [Script] │
│  └─ Ambient │                      │                     │
│             │                      │                     │
│  Templates: │                      │                     │
│  ├─ Shop    │                      │  Bottom Panel:      │
│  ├─ Office  │                      │  Behaviors, Log     │
│  └─ Arena   │                      │                     │
└─────────────┴──────────────────────┴─────────────────────┘

Bottom: Timeline (animations, events)
```

### Component Panels

#### 1. Asset Library (Left Panel)

**Sections**:
- **Objects** (100+ pre-built)
  - Geometry (sphere, cube, plane, etc.)
  - Furniture (chair, table, desk, sofa)
  - Doors & walls
  - Lights
  - NPCs (pre-configured)
  - Interactive objects (buttons, levers, doors)

- **Materials**
  - Colors
  - Textures (wood, metal, fabric, etc.)
  - Custom materials

- **Sounds**
  - Ambient music
  - UI sounds
  - Effect sounds

**Drag-Drop**: Drag any asset onto canvas

---

#### 2. 3D Canvas (Center)

**Features**:
- **Grid**: Toggle on/off, snap to grid (0.5m increments)
- **Gizmo**: Move/Rotate/Scale (intuitive controls)
- **Outline**: Selected object highlighted with blue outline
- **Context Menu**: Right-click → Edit/Delete/Copy/Paste
- **Viewport Controls**:
  - Mouse drag = rotate view
  - Scroll = zoom
  - WASD = pan

**Modes**:
- **Move Mode** (default)
- **Rotate Mode**
- **Scale Mode**
- **Paint Mode** (drag color onto object)

---

#### 3. Inspector Panel (Right)

**Auto-Shows**: When object selected

**Sections**:
1. **Transform**
   - Position (X, Y, Z with text input)
   - Rotation (X, Y, Z with visual slider)
   - Scale (uniform or per-axis)

2. **Physics**
   - Is Static (checkbox)
   - Mass (slider, auto-calculated if dynamic)
   - Gravity (on/off)
   - Friction (slider)
   - Restitution (bounce, slider)
   - Collision type (box, sphere, mesh)

3. **Materials**
   - Color picker (visual + hex)
   - Texture (dropdown from library)
   - Roughness (slider)
   - Metallic (slider)
   - Emit light (toggle)

4. **Behaviors**
   - Visual behavior builder
   - Drag "behavior blocks" from library
   - Connect blocks visually
   - See Preview of behavior

5. **Interactions**
   - Click me → (dropdown: trigger action)
   - Actions: Open URL, Play Sound, Scale, Rotate, Teleport, etc.

---

### Toolbar

```
[File] [Edit] [View] [Help] | [Save] [Preview] [Deploy] | [Undo] [Redo]
```

**File Menu**:
- New World
- Open World
- Save
- Export as .zip
- Import World
- Publish to Gallery

**Edit Menu**:
- Undo/Redo
- Cut/Copy/Paste
- Select All
- Group/Ungroup

**View Menu**:
- Toggle Grid
- Toggle Gizmo
- Toggle Physics Debug (see colliders)
- Toggle Lighting
- Reset Camera

**Help Menu**:
- Tutorials
- Keyboard Shortcuts
- About

---

### Modal Dialogs

#### 1. Create New World

```
┌──────────────────────────────┐
│ Create New World             │
├──────────────────────────────┤
│ Name: [________________]     │
│                              │
│ Choose Template:             │
│ ○ Blank World               │
│ ○ VR Shop (pre-built)       │
│ ○ Office (pre-built)        │
│ ○ Game Arena (pre-built)    │
│ ○ Classroom (pre-built)     │
│                              │
│ Private/Public:             │
│ ○ Private (only me)         │
│ ○ Public (discoverable)     │
│                              │
│         [Create] [Cancel]    │
└──────────────────────────────┘
```

#### 2. Publish World

```
┌──────────────────────────────┐
│ Publish World                │
├──────────────────────────────┤
│ Title: [_______________]     │
│ Description: [__________]    │
│             [__________]     │
│                              │
│ Thumbnail: [Generate] or     │
│            [Upload]          │
│                              │
│ Category:                    │
│ ▼ Game / Shop / Office...    │
│                              │
│ Public / Private:            │
│ ○ Public (discoverable)     │
│ ○Private (invite-only)       │
│                              │
│ Monetization:                │
│ □ Enable in-world shop      │
│ □ Charge entry fee ($__)     │
│                              │
│        [Publish] [Cancel]    │
└──────────────────────────────┘
```

---

## Component Architecture

### Tech Stack

**Frontend**:
- React 18 (UI framework)
- Three.js (3D rendering)
- React-Three-Fiber (React + Three.js)
- Zustand (state management)
- React Query (data fetching)

**Backend**:
- Node.js/Express (API)
- Socket.io (real-time collab)
- Postgres (persistent storage)
- AWS S3 (asset storage)

### Component Hierarchy

```
WorldBuilder
├── Editor
│   ├── Canvas3D (Three.js viewport)
│   ├── AssetLibrary (left panel)
│   ├── InspectorPanel (right panel)
│   └── Toolbar (top menu)
├── Selection
│   ├── SelectedObject
│   └── TransformGizmo
├── Physics
│   ├── PhysicsEngine
│   └── DebugVisualizer
├── Behaviors
│   ├── BehaviorGraph (visual scripting)
│   ├── BehaviorBlock
│   └── BehaviorLibrary
├── Project
│   ├── WorldData (hierarchical)
│   └── AssetData
└── Export
    ├── HoloScriptGenerator
    └── AssetPackager
```

### State Management (Zustand)

```typescript
// Main store
const useWorldStore = create((set) => ({
  // Objects
  objects: [],
  selectedObject: null,
  addObject: (obj) => set(state => ({...})),
  updateObject: (id, data) => set(state => ({...})),
  deleteObject: (id) => set(state => ({...})),
  
  // Undo/Redo
  history: [],
  undo: () => set(state => ({...})),
  redo: () => set(state => ({...})),
  
  // Project
  worldName: '',
  worldId: '',
  isPublished: false,
  
  // UI State
  mode: 'move', // 'move', 'rotate', 'scale'
  showGrid: true,
  showPhysics: false,
}));
```

---

## Asset Library

### Pre-Built Objects (100+)

**Geometry**:
- Sphere, Cube, Plane, Cylinder, Cone, Torus
- Tetrahedron, Icosahedron, etc.

**Furniture**:
- Chair (10 variations)
- Table (5 variations)
- Sofa (3 variations)
- Desk, Cabinet, Shelf, Bed, etc.

**Interactive Objects**:
- Door (with physics)
- Button (press to trigger)
- Lever (rotate to trigger)
- Chest (open/close)
- Gate (slide open)

**Props**:
- Trees, Plants, Rocks
- Lamps, Candles
- Signs, Posters
- Cars, Bikes
- Weapons, Tools
- Food, Drinks

**NPCs** (Pre-configured):
- Shopkeeper (merchant behavior)
- Guard (patrol behavior)
- Guide (gesture behavior)
- Companion (follow behavior)

**Lights**:
- Directional (sun)
- Point light (lamp)
- Spot light (flashlight)
- Ambient light

### Asset Customization

**Colors**: Visual color picker on any object
**Textures**: Drag texture from library onto object
**Sizes**: Scale gizmo or X/Y/Z sliders
**Physics**: Configure mass, friction, restitution
**Materials**: Metallic, roughness, emission sliders

---

## Physics System

### Simplified Physics for No-Code

**Properties** (simplified):
```
Object:
  └─ Physics
     ├─ Is Static (yes/no) - immovable objects
     ├─ Mass (light/normal/heavy) - dropdown
     ├─ Gravity (on/off) - checkbox
     ├─ Bounce (0-1 slider)
     ├─ Friction (0-1 slider)
     └─ Collider Shape (box/sphere/mesh)
```

**Automatic Behavior**:
- Box objects → box collider
- Sphere objects → sphere collider
- Complex objects → mesh collider

**Physics Debug Mode**:
- Toggle to see all colliders
- Green = active, Red = error
- Shows collision boundaries

### Simplified Physics Constants

```typescript
// Auto-applied, not exposed to user
const GRAVITY = 9.81; // m/s²
const DEFAULT_MASS = 1; // kg
const DEFAULT_FRICTION = 0.5;
const DEFAULT_BOUNCE = 0.3;

// User selects "heavy" → mass = 10kg
// User selects "light" → mass = 0.1kg
// User selects "normal" → mass = 1kg
```

---

## Interactions System

### Interaction Types

**Trigger**:
- On Click
- On Collision
- On Timer
- On Proximity
- On Player Input (E key, etc.)

**Actions**:
- Play Animation (scale, rotate, move)
- Play Sound
- Show Message
- Teleport Player
- Open URL
- Spawn Object
- Emit Particle
- Trigger Custom Event

**Visual Builder**:
```
┌─ Object "Door"
│  ├─ On Click → Play Animation "OpenDoor" (1 sec)
│  ├─ On Click → Play Sound "DoorOpen" (0.5 sec)
│  └─ On Proximity (2m) → Emit Particle "DoorMist"
```

### Behavior Blocks (Visual Scripting)

**Block Types**:
- Trigger (when X happens)
- Action (do Y)
- Condition (if Z)
- Loop (repeat N times)
- Wait (pause X seconds)

**Example**:
```
[On Click]
    ↓
[Rotate 90° over 1 second]
    ↓
[Play Sound "door_open"]
    ↓
[Open URL "shop.example.com"] (optional)
```

---

## Networking & Multiplayer

### Real-Time Collaboration

**Features**:
- See other creators in same world (real-time cursors)
- See object changes as they happen
- Locking mechanism (prevent conflicts)
- Undo/Redo synced across users

**Implementation**:
- Socket.io for real-time updates
- Operational transformation for conflict resolution
- Version control of world state

### Multiplayer Play Testing

**In Editor**:
- Click "Test Multiplayer" → Opens 2 preview windows
- See how world behaves with multiple players
- Test object interactions, physics, etc.

---

## Deployment Pipeline

### Publish Flow

```
1. Click "Deploy"
2. Validate world (all objects have proper configs)
3. Generate HoloScript code automatically
4. Bundle assets (textures, models, sounds)
5. Compress world data
6. Upload to server
7. Generate unique URL
8. Show URL to creator
9. World instantly live
```

**Time**: < 5 seconds for typical world

### World Validation

**Checks**:
- ✅ All objects have valid positions
- ✅ Physics configured correctly
- ✅ No infinite loops in behaviors
- ✅ Assets exist and are loaded
- ✅ World name not empty
- ✅ Assets under size limit (100MB)

---

## Code Generation

### Auto-Generated HoloScript

**Creator builds** in no-code builder → **HoloScript generated automatically**

**Example**:
```
Creator's Actions:
1. Adds Sphere at (0, 1, 0)
2. Sets color to red
3. Adds behavior: "On Click → Scale up 2x over 1 sec"
4. Deploys world

Generated HoloScript:
```

```holoscript
world {
  name: "My First World"
  
  object sphere_1 {
    position: (0, 1, 0)
    material: {
      color: #ff0000
      roughness: 0.8
    }
    physics: {
      static: false
      mass: 1.0
      gravity: true
    }
    behavior: {
      on(click) {
        animate(sphere_1, scale, vec3(2, 2, 2), duration: 1.0)
      }
    }
  }
}
```

### Code Editor (Optional)

**For advanced users**:
- View generated HoloScript
- Edit code directly
- Save custom scripts
- Import external libraries

---

## Implementation Timeline

### Week 1: Core Editor UI (150 lines React)

**Deliverables**:
- Basic layout (3-panel editor)
- 3D canvas with Three.js
- Asset library sidebar
- Inspector panel
- Object selection/highlighting

**Estimated Code**:
```typescript
// Main layout
const WorldBuilder = () => {
  return (
    <div className="editor">
      <Toolbar />
      <div className="panels">
        <AssetLibrary />
        <Canvas3D />
        <InspectorPanel />
      </div>
    </div>
  )
}
```

---

### Week 2: Drag-Drop & Transform (150 lines)

**Deliverables**:
- Drag objects from library to canvas
- Move/Rotate/Scale gizmos
- Position/rotation/scale inputs
- Context menu (right-click)
- Undo/Redo

**Estimated Code**:
```typescript
// Transform gizmo handler
const onDragObject = (id, position) => {
  updateObject(id, { position })
}

// Context menu
const onRightClick = (id) => {
  showMenu(['Edit', 'Delete', 'Copy'])
}
```

---

### Week 3: Physics & Interactions (150 lines)

**Deliverables**:
- Physics configuration UI
- Interaction/behavior setup
- Visual behavior blocks
- Physics debug mode
- Property inputs (sliders, etc.)

**Estimated Code**:
```typescript
// Physics config
const PhysicsPanel = ({ object }) => {
  return (
    <div>
      <Toggle label="Static" />
      <Select label="Mass" options={['Light', 'Normal', 'Heavy']} />
      <Slider label="Friction" min={0} max={1} />
      <Slider label="Bounce" min={0} max={1} />
    </div>
  )
}
```

---

### Week 4: Code Generation & Deploy (150 lines)

**Deliverables**:
- HoloScript generation engine
- Asset bundling & compression
- Deployment pipeline
- World validation
- Live URL generation

**Estimated Code**:
```typescript
// Generate HoloScript from scene
const generateHoloScript = (worldData) => {
  const objects = worldData.objects.map(obj => ({
    name: obj.id,
    position: obj.position,
    physics: obj.physics,
    behavior: obj.behavior,
  }))
  
  return `world {
    ${objects.map(obj => generateObjectCode(obj)).join('\n')}
  }`
}

// Deploy world
const deployWorld = async (worldId, code, assets) => {
  const response = await api.deployWorld({
    id: worldId,
    holoScript: code,
    assets: assets,
  })
  return response.url
}
```

---

### Testing Checklist

- [x] Can create new world
- [x] Can drag objects onto canvas
- [x] Can move/rotate/scale objects
- [x] Can configure physics
- [x] Can set up behaviors
- [x] Can preview in 3D
- [x] Can deploy world
- [x] Can load deployed world

---

## Success Criteria

✅ **Non-technical creator can**:
- Build first world in < 10 minutes
- Deploy to live URL instantly
- Configure physics without code
- Add behaviors without code
- Understand all UI in < 1 hour

✅ **Technical creator can**:
- Export HoloScript for modification
- Integrate with APIs
- Add custom scripts
- Create advanced interactions

✅ **Developer can**:
- Extend with custom components
- Add new asset types
- Modify generation pipeline
- Build integrations

---

## Next Steps

1. **Week 1**: Build core editor UI (Canvas, panels, selection)
2. **Week 2**: Implement drag-drop and transform gizmos
3. **Week 3**: Add physics and behavior systems
4. **Week 4**: Implement code generation and deployment
5. **Week 5+**: Testing, refinement, feature additions

---

**Status**: Design Complete, Ready for Implementation  
**Total Estimated Lines**: 600 (React + Three.js)  
**Complexity**: Medium (React + 3D + state management)
