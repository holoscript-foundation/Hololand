# @hololand/ar-renderer

WebXR and Three.js AR rendering with VRM avatar support.

## Overview

This package provides AR/VR rendering capabilities:

- **WebXR Integration** - AR and VR session management
- **Three.js Scene** - Complete scene setup with lighting/shadows
- **VRM Avatars** - Load and animate VRM models
- **IK Retargeting** - Apply detected poses to avatars

## Installation

```bash
npm install @hololand/ar-renderer three
```

For VRM support (optional):
```bash
npm install @pixiv/three-vrm
```

## Quick Start

```typescript
import { ARSceneManager, VRMAvatarManager } from '@hololand/ar-renderer';

// Create and initialize scene
const scene = new ARSceneManager({
  antialias: true,
  alpha: true,
  shadows: true,
});
scene.initialize(document.body);

// Start AR session
await scene.startARSession();

// Load avatar
const avatars = new VRMAvatarManager(scene.getScene()!);
await avatars.initialize();
await avatars.loadAvatar('player', {
  vrmUrl: 'https://example.com/avatar.vrm',
  scale: 1,
});

// Animation loop
scene.onFrame((time, frame) => {
  avatars.update();
});
scene.start();
```

## WebXR Sessions

### AR Mode

```typescript
// Check AR support
if (await navigator.xr?.isSessionSupported('immersive-ar')) {
  await scene.startARSession();
}
```

### VR Mode (Fallback)

```typescript
// Start VR if AR not available
await scene.startVRSession();
```

### Session Features

The AR session requests these features:

- `local-floor` - Floor-relative tracking (required)
- `hand-tracking` - Hand/controller input (optional)
- `hit-test` - Surface detection (optional)
- `depth-sensing` - Depth estimation (optional)
- `light-estimation` - Environment lighting (optional)

## VRM Avatars

### Loading

```typescript
const avatars = new VRMAvatarManager(scene.getScene()!);
await avatars.initialize();

const state = await avatars.loadAvatar('npc_01', {
  vrmUrl: 'https://cdn.example.com/characters/guide.vrm',
  scale: 1.0,
  enableIK: true,
  enableExpressions: true,
  enableLookAt: true,
});
```

### Transform

```typescript
avatars.setTransform('npc_01', {
  position: { x: 0, y: 0, z: -2 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  scale: { x: 1, y: 1, z: 1 },
});
```

### Expressions

VRM models support blend shape expressions:

```typescript
// Set expression with weight
avatars.setExpression('npc_01', 'happy', 0.8);
avatars.setExpression('npc_01', 'blink', 1.0);

// Standard VRM expressions:
// - neutral, happy, angry, sad, relaxed
// - surprised, aa, ih, ou, ee, oh
// - blink, blinkLeft, blinkRight
// - lookUp, lookDown, lookLeft, lookRight
```

### Look-At

```typescript
// Make avatar look at point
avatars.setLookAt('npc_01', { x: 0, y: 1.6, z: 0 });

// Look at camera
const camera = scene.getCamera()!;
avatars.setLookAt('npc_01', camera.position);
```

### Pose Application

```typescript
// Apply skeleton pose from detection
avatars.applyPose('player', {
  timestamp: Date.now(),
  rootTransform: {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  },
  bones: [
    { name: 'left_shoulder', position: {...}, rotation: {...} },
    { name: 'left_upper_arm', position: {...}, rotation: {...} },
    // ... more bones
  ],
});
```

## IK Retargeting

Retarget detected poses to VRM avatars:

```typescript
import { PoseRetargeter } from '@hololand/ar-renderer';

const retargeter = new PoseRetargeter();

// From detection keypoints
const keypoints = new Map<string, Vector3>([
  ['LEFT_WRIST', { x: -0.5, y: 1.2, z: 0.3 }],
  ['RIGHT_WRIST', { x: 0.5, y: 1.0, z: 0.2 }],
  ['LEFT_ANKLE', { x: -0.2, y: 0, z: 0 }],
  ['RIGHT_ANKLE', { x: 0.2, y: 0, z: 0 }],
]);

// Apply to avatar
const avatar = avatars.getModel('player')!;
retargeter.retarget(keypoints, avatar);
```

### Custom IK Solver

```typescript
import { IKSolver } from '@hololand/ar-renderer';

const solver = new IKSolver({
  maxIterations: 20,
  tolerance: 0.0001,
  usePoleTargets: true,
  jointLimits: true,
});

solver.initialize(avatarSkeleton);
solver.solve({
  bone: 'leftHand',
  position: { x: -0.5, y: 1.0, z: 0.5 },
  weight: 1.0,
});
```

## Integration with AR Pipeline

```typescript
import { ARSceneManager, VRMAvatarManager, PoseRetargeter } from '@hololand/ar-renderer';
import { BlazePoseDetector } from '@hololand/ar-detection';
import { ARTrackingClient } from '@hololand/ar-tracking/client';

// Setup
const scene = new ARSceneManager();
scene.initialize(document.body);

const avatars = new VRMAvatarManager(scene.getScene()!);
await avatars.initialize();

const detector = new BlazePoseDetector();
await detector.initialize();

const client = new ARTrackingClient('wss://tracking.server.com');
const retargeter = new PoseRetargeter();

// Track persons → avatars map
const personAvatars = new Map<string, string>();

// Handle tracked persons from server
client.onTrackedPersons((persons) => {
  for (const person of persons) {
    let avatarId = personAvatars.get(person.id);
    
    // Create avatar if new person
    if (!avatarId) {
      avatarId = `avatar_${person.id}`;
      await avatars.loadAvatar(avatarId, { vrmUrl: 'default.vrm' });
      personAvatars.set(person.id, avatarId);
    }
    
    // Update avatar position
    avatars.setTransform(avatarId, {
      position: person.position,
      rotation: person.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    });
  }
});

// Animation loop
scene.onFrame((time, frame) => {
  avatars.update();
});

await scene.startARSession();
scene.start();
```

## Scene Configuration

```typescript
const scene = new ARSceneManager({
  canvas: existingCanvas,        // Use existing canvas
  antialias: true,               // Enable antialiasing
  alpha: true,                   // Transparent background for AR
  preserveDrawingBuffer: false,  // Set true for screenshots
  pixelRatio: 2,                 // Override device pixel ratio
  shadows: true,                 // Enable shadow mapping
  toneMapping: true,             // Enable HDR tone mapping
  postProcessing: false,         // Enable post-processing (future)
});
```

## API Reference

### ARSceneManager

| Method | Description |
|--------|-------------|
| `initialize(container?)` | Initialize Three.js scene |
| `startARSession()` | Start WebXR AR session |
| `startVRSession()` | Start WebXR VR session |
| `endSession()` | End XR session |
| `start()` / `stop()` | Start/stop animation loop |
| `onFrame(callback)` | Register frame callback |
| `add(object)` / `remove(object)` | Add/remove scene objects |
| `getScene()` | Get Three.js scene |
| `getCamera()` | Get camera |
| `getRenderer()` | Get WebGL renderer |
| `getXRSession()` | Get XR session |
| `worldToScreen(pos)` | Convert world to screen coords |
| `screenToRay(x, y)` | Get raycaster from screen pos |
| `dispose()` | Clean up resources |

### VRMAvatarManager

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize loader |
| `loadAvatar(id, config)` | Load VRM model |
| `setTransform(id, transform)` | Set position/rotation |
| `applyPose(id, pose)` | Apply skeleton pose |
| `setExpression(id, name, weight)` | Set face expression |
| `setLookAt(id, target)` | Set look-at target |
| `setVisible(id, visible)` | Show/hide avatar |
| `update()` | Update all avatars |
| `getState(id)` | Get avatar state |
| `getModel(id)` | Get Three.js object |
| `removeAvatar(id)` | Remove avatar |
| `dispose()` | Clean up all |

### IKSolver

| Method | Description |
|--------|-------------|
| `initialize(skeleton)` | Setup for skeleton |
| `solve(target)` | Solve IK for target |
| `addChain(chain)` | Add custom IK chain |
| `setConfig(config)` | Update solver config |

### PoseRetargeter

| Method | Description |
|--------|-------------|
| `retarget(keypoints, avatar)` | Retarget pose to avatar |
| `setMapping(source, target)` | Set bone mapping |
| `getIKSolver()` | Get underlying solver |

## Types

```typescript
interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale?: Vector3;
}

interface AvatarConfig {
  vrmUrl: string;
  scale?: number;
  enableIK?: boolean;
  enableExpressions?: boolean;
  enableLookAt?: boolean;
}

interface AvatarState {
  id: string;
  transform: Transform;
  pose?: SkeletonPose;
  expression?: string;
  visible: boolean;
}

interface IKTarget {
  bone: VRMBoneName;
  position: Vector3;
  rotation?: Quaternion;
  weight?: number;
}
```

## License

MIT - see LICENSE file
