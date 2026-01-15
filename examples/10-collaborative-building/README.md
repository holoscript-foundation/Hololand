# Example 10: Collaborative Building

Real-time collaborative world building using Hololand's networking and social features.

## Features

- **Real-time Object Sync**: Create, move, rotate, and scale objects with instant synchronization
- **Remote Cursors**: See where other builders are working in real-time
- **Object Ownership**: Track who created each object
- **Locking System**: Lock objects to prevent others from modifying them
- **Collaborative History**: View all actions performed by all builders
- **Built-in Chat**: Communicate with other builders while working

## Packages Used

- `@hololand/core` - Core utilities
- `@hololand/world` - Scene and object management
- `@hololand/network` - Real-time multiplayer synchronization
- `@hololand/social` - Presence and notifications

## Running

```bash
cd examples/10-collaborative-building
pnpm install
pnpm dev
```

## Controls

### Tools
- **Select** (👆): Click to select objects, drag to move
- **Move** (✋): Drag selected objects to reposition
- **Rotate** (🔄): Drag to rotate selected objects
- **Scale** (📐): Drag away/toward center to resize

### Primitives
- **Cube** (🧊): Create a box shape
- **Sphere** (🔵): Create a sphere
- **Cylinder** (🛢️): Create a cylinder
- **Plane** (▫️): Create a flat plane

### Actions
- **Duplicate** (📋): Copy selected object (Ctrl+D)
- **Delete** (🗑️): Remove selected object (Delete/Backspace)
- **Lock** (🔒): Lock/unlock object editing (Ctrl+L)

### Keyboard Shortcuts
- `Delete` / `Backspace` - Delete selected object
- `Ctrl+D` - Duplicate selected object
- `Ctrl+L` - Toggle lock on selected object
- `Escape` - Deselect current object

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Collaborative Building                    │
├─────────────┬─────────────────────────────┬─────────────────┤
│   Toolbar   │        Canvas View          │  Collaborators  │
│             │                             │                 │
│  - Tools    │    ┌───────────────────┐    │  - User list    │
│  - Shapes   │    │  Scene Objects    │    │  - Actions      │
│  - Actions  │    │  Remote Cursors   │    │  - Cursors      │
│             │    └───────────────────┘    │                 │
├─────────────┼─────────────────────────────┼─────────────────┤
│   History   │         Chat Panel          │   Properties    │
│             │                             │                 │
│  - Actions  │  - Messages                 │  - Position     │
│  - Users    │  - System notifications     │  - Rotation     │
│  - Times    │                             │  - Scale/Color  │
└─────────────┴─────────────────────────────┴─────────────────┘
```

## Network Protocol

### Object Messages
```typescript
// Create object
{ type: 'object_created', payload: BuildObject }

// Update object
{ type: 'object_updated', payload: { id, updates } }

// Delete object
{ type: 'object_deleted', payload: { id } }
```

### Cursor Messages
```typescript
// Cursor position
{ type: 'cursor_update', payload: { userId, position, action } }
```

### Chat Messages
```typescript
// Chat message
{ type: 'chat_message', payload: ChatMessage }
```

## Extending

To add new object types:

1. Add type to `BuildObject['type']`:
```typescript
type: 'cube' | 'sphere' | 'cylinder' | 'plane' | 'your_new_type'
```

2. Add drawing logic in `drawObject()`:
```typescript
case 'your_new_type':
  // Custom drawing code
  break;
```

3. Add button in HTML:
```html
<button class="tool-btn" data-create="your_new_type">
  <span class="icon">🆕</span>
  <span>New Type</span>
</button>
```

## Demo Mode

The example runs in demo mode with simulated network connections. To connect to a real server, update the NetworkClient configuration:

```typescript
const networkClient = new NetworkClient({
  serverUrl: 'wss://your-server.com',
  reconnect: true,
  heartbeatInterval: 5000,
});
```
