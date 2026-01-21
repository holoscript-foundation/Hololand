# @hololand/ar-foundation

Unified AR foundation for Hololand - bridges HoloScript AR declarations to AR runtime packages.

## Overview

This package serves as the **single entry point** for all AR functionality in Hololand, connecting HoloScript AR syntax to the underlying AR implementation packages.

```
HoloScript AR syntax
       ↓
@hololand/ar-foundation (this package)
       ↓
┌──────┴──────┬───────────┬────────────┐
│             │           │            │
ar-anchors  ar-detection  ar-tracking  ar-renderer
```

## Installation

```bash
pnpm add @hololand/ar-foundation
```

## Usage

```typescript
import { createARRuntime, executeARNode } from '@hololand/ar-foundation';

// Create runtime instance
const runtime = createARRuntime();

// Start pose detection
await runtime.api.startDetection({
  detector: 'blazepose',
  maxPersons: 4,
  smoothing: true,
});

// Add an AR anchor
await runtime.api.addAnchor({
  type: 'ar_anchor',
  id: 'lobby-qr',
  anchorType: 'qr',
  properties: {
    payload: 'hololand://room/lobby',
    markerSize: 0.15,
  },
});

// Get tracked persons
const persons = runtime.api.getTrackedPersons();
```

## HoloScript Integration

The runtime executes HoloScript AR nodes:

```typescript
import { executeARNode } from '@hololand/ar-foundation';

// Parse HoloScript generates these nodes
const anchorNode = {
  type: 'ar_anchor',
  id: 'entrance',
  anchorType: 'qr',
  properties: { payload: 'welcome' },
};

await executeARNode(anchorNode, runtime);
```

## API Reference

### `createARRuntime()`

Creates an AR runtime instance with state and API.

```typescript
const { state, api } = createARRuntime();
```

### State

- `anchors: Map<string, Anchor>` - Active AR anchors
- `trackedPersons: Map<string, Person>` - Detected persons
- `avatars: Map<string, Avatar>` - Loaded VRM avatars

### API Methods

| Method | Description |
|--------|-------------|
| `addAnchor(anchor)` | Register an AR anchor |
| `removeAnchor(id)` | Remove an anchor |
| `getAnchor(id)` | Get anchor by ID |
| `getTrackedPersons()` | List all tracked persons |
| `bindPersonToUser(personId, userId)` | Associate person with user |
| `loadAvatar(id, url)` | Load VRM avatar |
| `updateAvatar(id, state)` | Update avatar pose/expression |
| `removeAvatar(id)` | Remove avatar |
| `startDetection(config)` | Start pose detection |
| `stopDetection()` | Stop pose detection |

## Architecture Decision

This package was created to consolidate AR runtime code that was previously in `@hololand/core`.

**Why the separation?**

1. **Clean dependency graph** - Core shouldn't directly import AR packages
2. **Optional AR** - Apps can exclude AR by not importing this package
3. **Single entry point** - One place for all AR setup
4. **Testing** - Easier to mock AR for testing

## Related Packages

- `@hololand/ar-anchors` - QR, AprilTag, GPS, VPS anchors
- `@hololand/ar-detection` - BlazePose, MediaPipe body tracking
- `@hololand/ar-tracking` - Multi-user tracking coordination
- `@hololand/ar-renderer` - AR-specific rendering

## License

MIT
