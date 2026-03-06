# @hololand/portals

**VR portal and scene transition system**

Advanced portal system for creating seamless teleportation, scene transitions, and cross-world traversal in VR/AR environments. Includes comfort features to reduce motion sickness and support for Portal-style recursive rendering.

---

## Features

- ✅ **Portal Rendering** - Recursive portal views (Portal-style)
- ✅ **Teleportation** - Instant and smooth transitions
- ✅ **Scene Loading** - Async scene transitions with loading screens
- ✅ **Comfort Features** - Vignette, snap-turn, fade transitions
- ✅ **Cross-Server Portals** - Travel between different worlds
- ✅ **Portal Collision** - Automatic player traversal detection
- ✅ **Rotation Mapping** - Transform player orientation through portals
- ✅ **Zero Dependencies** - Lightweight and performant

---

## Installation

```bash
pnpm add @hololand/portals
```

---

## Quick Start

### Basic Portal

```typescript
import { PortalManager, PortalFactory } from '@hololand/portals';

// Create portal manager
const manager = new PortalManager();

// Create a portal
const portal = PortalFactory.create({
  id: 'portal-1',
  position: { x: 0, y: 1, z: -5 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  destination: {
    position: { x: 100, y: 0, z: 100 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  },
  size: { width: 2, height: 3 }
});

// Add portal to manager
manager.addPortal(portal);

// Check for player traversal (every frame)
function update() {
  const traversed = manager.checkTraversal(player.position, player.previousPosition);

  if (traversed) {
    // Teleport player
    player.position = traversed.newPosition;
    player.rotation = traversed.newRotation;
  }
}
```

### Teleport System

```typescript
import { TeleportSystem } from '@hololand/portals';

// Create teleport system
const teleport = new TeleportSystem({
  fadeColor: '#000000',
  fadeDuration: 0.5,  // seconds
  comfort: 'medium'   // 'none', 'low', 'medium', 'high'
});

// Teleport player
teleport.teleport(player, {
  position: { x: 50, y: 0, z: 50 },
  rotation: { x: 0, y: Math.PI, z: 0, w: 1 }
});

// Result: Smooth fade-out, teleport, fade-in
```

### Scene Transitions

```typescript
import { SceneLoader, TransitionManager } from '@hololand/portals';

// Create scene loader
const sceneLoader = new SceneLoader();

// Create transition manager
const transitions = new TransitionManager({
  defaultTransition: 'fade',
  loadingScreen: true
});

// Load new scene
await transitions.transitionToScene('world-2', {
  transition: 'fade',
  duration: 1.0,
  onProgress: (progress) => {
    console.log(`Loading: ${progress * 100}%`);
  }
});
```

---

## API Reference

### PortalManager

Manages all portals in a scene.

#### Methods

##### `addPortal(portal)`

Add a portal to the manager.

```typescript
import { PortalFactory } from '@hololand/portals';

const portal = PortalFactory.create({
  id: 'portal-1',
  position: { x: 0, y: 1, z: -5 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  destination: {
    position: { x: 100, y: 0, z: 100 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  },
  size: { width: 2, height: 3 },
  color: '#00ffff',      // Portal tint color
  renderDistance: 50     // Max render distance
});

manager.addPortal(portal);
```

##### `removePortal(portalId)`

Remove a portal from the manager.

```typescript
manager.removePortal('portal-1');
```

##### `checkTraversal(currentPos, previousPos)`

Check if player crossed a portal threshold.

```typescript
function update() {
  const result = manager.checkTraversal(
    player.position,
    player.previousPosition
  );

  if (result) {
    // Player crossed portal
    player.position = result.newPosition;
    player.rotation = result.newRotation;
    player.velocity = result.newVelocity;

    // Optional: Trigger events
    onPortalTraversal(result.portal);
  }

  // Store position for next frame
  player.previousPosition = { ...player.position };
}
```

##### `getPortalView(portalId, viewerPos, viewerRot)`

Get camera transform for recursive portal rendering.

```typescript
// Render portal's destination view
const portal = manager.getPortal('portal-1');
const portalView = manager.getPortalView(
  'portal-1',
  camera.position,
  camera.rotation
);

// Render scene from portal's perspective
renderer.render(scene, portalView.camera);
```

---

### TeleportSystem

Smooth teleportation with comfort features.

```typescript
const teleport = new TeleportSystem({
  fadeColor: '#000000',    // Fade color
  fadeDuration: 0.5,       // Fade duration (seconds)
  comfort: 'medium',       // Comfort level
  snapTurn: true,          // Enable snap turning
  snapAngle: 45,           // Snap turn angle (degrees)
  vignette: true           // Enable vignette during movement
});
```

#### Methods

##### `teleport(player, destination, options?)`

Teleport player to a destination.

```typescript
await teleport.teleport(player, {
  position: { x: 50, y: 0, z: 50 },
  rotation: { x: 0, y: Math.PI, z: 0, w: 1 }
}, {
  fadeColor: '#ffffff',   // Override default
  fadeDuration: 0.3,      // Faster fade
  onComplete: () => {
    console.log('Teleport complete!');
  }
});
```

##### `snapTurn(player, direction)`

Snap turn player by configured angle.

```typescript
// Snap turn left
teleport.snapTurn(player, 'left');   // Rotates -45°

// Snap turn right
teleport.snapTurn(player, 'right');  // Rotates +45°
```

##### `setComfortLevel(level)`

Change comfort settings.

```typescript
// Comfort levels:
// - 'none': No comfort features
// - 'low': Light vignette during movement
// - 'medium': Vignette + reduced FOV during movement
// - 'high': Strong vignette + snap turning only

teleport.setComfortLevel('high');
```

---

### TransitionManager

Manages scene transitions with various effects.

```typescript
const transitions = new TransitionManager({
  defaultTransition: 'fade',
  loadingScreen: true,
  minLoadingTime: 1000  // Min loading screen time (ms)
});
```

#### Methods

##### `transitionToScene(sceneId, options?)`

Transition to a new scene.

```typescript
await transitions.transitionToScene('beach-world', {
  transition: 'fade',     // 'fade', 'wipe', 'dissolve', 'portal'
  duration: 1.0,          // seconds
  color: '#87CEEB',       // Transition color
  loadingScreen: true,    // Show loading screen
  onProgress: (progress) => {
    loadingBar.value = progress;
  },
  onComplete: () => {
    console.log('Scene loaded!');
  }
});
```

#### Transition Types

```typescript
// Fade (default)
await transitions.transitionToScene('world-2', {
  transition: 'fade',
  duration: 1.0
});

// Wipe (directional)
await transitions.transitionToScene('world-2', {
  transition: 'wipe',
  direction: 'left',  // 'left', 'right', 'up', 'down'
  duration: 0.8
});

// Dissolve
await transitions.transitionToScene('world-2', {
  transition: 'dissolve',
  duration: 1.5
});

// Portal effect
await transitions.transitionToScene('world-2', {
  transition: 'portal',
  portalPosition: { x: 0, y: 1, z: -3 },
  duration: 2.0
});
```

---

### SceneLoader

Asynchronous scene loading with progress tracking.

```typescript
const sceneLoader = new SceneLoader();
```

#### Methods

##### `loadScene(sceneId, options?)`

Load a scene asynchronously.

```typescript
await sceneLoader.loadScene('world-2', {
  unloadCurrent: true,    // Unload current scene
  preloadAssets: true,    // Preload all assets
  onProgress: (progress) => {
    console.log(`Loading: ${Math.floor(progress * 100)}%`);
  }
});
```

##### `preloadScene(sceneId)`

Preload a scene in the background.

```typescript
// Preload next scene while player is in current scene
await sceneLoader.preloadScene('world-3');

// Later, instant transition
await transitions.transitionToScene('world-3', {
  duration: 0.5  // Fast transition since already loaded
});
```

##### `unloadScene(sceneId)`

Unload a scene to free memory.

```typescript
sceneLoader.unloadScene('world-1');
```

---

### ComfortManager

VR comfort features to reduce motion sickness.

```typescript
const comfort = new ComfortManager({
  vignetteIntensity: 0.7,  // 0.0 - 1.0
  fovReduction: 0.3,       // Reduce FOV during movement (0.0 - 0.5)
  snapTurnAngle: 45,       // Snap turn angle
  tunnelVision: true       // Enable tunnel vision effect
});
```

#### Methods

##### `enableVignette(intensity?)`

Show vignette during movement.

```typescript
// Enable vignette when player moves
player.on('move', () => {
  comfort.enableVignette(0.5);  // 50% intensity
});

player.on('stop', () => {
  comfort.disableVignette();
});
```

##### `applyCageFOV(enabled)`

Reduce FOV during movement ("cage" effect).

```typescript
// Reduce FOV during fast movement
if (player.velocity.length() > 5.0) {
  comfort.applyCageFOV(true);
} else {
  comfort.applyCageFOV(false);
}
```

---

## Advanced Usage

### Recursive Portal Rendering

Render portals that show their destination (like Portal game).

```typescript
import { PortalManager, PortalFactory } from '@hololand/portals';

const manager = new PortalManager();

// Create two-way portals
const portal1 = PortalFactory.create({
  id: 'portal-1',
  position: { x: 0, y: 1, z: -5 },
  destination: {
    position: { x: 100, y: 0, z: 100 },
    linkedPortalId: 'portal-2'  // Link to exit portal
  },
  size: { width: 2, height: 3 }
});

const portal2 = PortalFactory.create({
  id: 'portal-2',
  position: { x: 100, y: 1, z: 100 },
  destination: {
    position: { x: 0, y: 0, z: 0 },
    linkedPortalId: 'portal-1'
  },
  size: { width: 2, height: 3 }
});

manager.addPortal(portal1);
manager.addPortal(portal2);

// Render loop
function render() {
  // 1. Render portal views to textures
  manager.getAllPortals().forEach(portal => {
    const portalView = manager.getPortalView(
      portal.id,
      camera.position,
      camera.rotation
    );

    // Render scene from portal's perspective
    portalCamera.position = portalView.position;
    portalCamera.rotation = portalView.rotation;
    portalCamera.setViewOffset(...portalView.viewOffset);

    renderer.setRenderTarget(portal.renderTarget);
    renderer.render(scene, portalCamera);
  });

  // 2. Render main scene (portals use textures from step 1)
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
```

### Cross-Server Portals

Portals that connect to different servers/worlds.

```typescript
const crossServerPortal = PortalFactory.create({
  id: 'cross-server-portal',
  position: { x: 0, y: 1, z: -5 },
  destination: {
    server: 'world-server-2.hololand.io',
    worldId: 'fantasy-realm',
    position: { x: 0, y: 0, z: 0 }
  },
  size: { width: 2, height: 3 }
});

manager.addPortal(crossServerPortal);

// Handle cross-server traversal
manager.on('crossServerTraversal', async (portal, player) => {
  // Show loading screen
  await transitions.transitionToScene(portal.destination.worldId, {
    server: portal.destination.server,
    loadingScreen: true,
    onProgress: (progress) => {
      console.log(`Connecting: ${progress * 100}%`);
    }
  });
});
```

### Dynamic Portal Creation

Create portals at runtime.

```typescript
// Portal gun mechanic (like Portal game)
class PortalGun {
  manager: PortalManager;
  portals = { orange: null, blue: null };

  shootPortal(color: 'orange' | 'blue', position, rotation) {
    // Remove existing portal of this color
    if (this.portals[color]) {
      this.manager.removePortal(this.portals[color].id);
    }

    // Create new portal
    const portal = PortalFactory.create({
      id: `${color}-portal-${Date.now()}`,
      position,
      rotation,
      destination: {
        position: this.portals[color === 'orange' ? 'blue' : 'orange']?.position || position,
        rotation: this.portals[color === 'orange' ? 'blue' : 'orange']?.rotation || rotation
      },
      size: { width: 2, height: 3 },
      color: color === 'orange' ? '#ff6600' : '#0099ff'
    });

    this.portals[color] = portal;
    this.manager.addPortal(portal);

    // Update other portal's destination
    if (this.portals[color === 'orange' ? 'blue' : 'orange']) {
      const otherPortal = this.portals[color === 'orange' ? 'blue' : 'orange'];
      otherPortal.destination.position = position;
      otherPortal.destination.rotation = rotation;
    }
  }
}
```

---

## Use Cases

### Metaverse Hub

```typescript
// Central hub with portals to different worlds
const hub = new PortalManager();

const worlds = [
  { id: 'beach', position: { x: -5, y: 1, z: 0 }, name: 'Beach Paradise' },
  { id: 'space', position: { x: 0, y: 1, z: -5 }, name: 'Space Station' },
  { id: 'fantasy', position: { x: 5, y: 1, z: 0 }, name: 'Fantasy Castle' },
  { id: 'city', position: { x: 0, y: 1, z: 5 }, name: 'Cyberpunk City' }
];

worlds.forEach(world => {
  const portal = PortalFactory.create({
    id: `portal-${world.id}`,
    position: world.position,
    destination: {
      worldId: world.id,
      position: { x: 0, y: 0, z: 0 }
    },
    size: { width: 2, height: 3 },
    label: world.name
  });

  hub.addPortal(portal);
});
```

### Multi-Room Building

```typescript
// House with portals between rooms
const house = new PortalManager();

// Living room <-> Kitchen
house.addPortal(PortalFactory.create({
  id: 'living-to-kitchen',
  position: { x: 5, y: 1, z: 0 },
  destination: { position: { x: 0, y: 0, z: 0 }, room: 'kitchen' },
  size: { width: 1.5, height: 2.5 }
}));

house.addPortal(PortalFactory.create({
  id: 'kitchen-to-living',
  position: { x: 0, y: 1, z: 0 },
  destination: { position: { x: 0, y: 0, z: 0 }, room: 'living' },
  size: { width: 1.5, height: 2.5 }
}));

// Bedroom <-> Bathroom
// ... more portals
```

### Fast Travel System

```typescript
// Unlock fast travel points
class FastTravelSystem {
  teleport: TeleportSystem;
  unlocked = new Set<string>();

  unlockLocation(id: string, position) {
    this.unlocked.add(id);
    console.log(`Unlocked fast travel: ${id}`);
  }

  canTravelTo(id: string): boolean {
    return this.unlocked.has(id);
  }

  async travelTo(id: string, location) {
    if (!this.canTravelTo(id)) {
      console.log('Location not unlocked');
      return;
    }

    await this.teleport.teleport(player, location, {
      fadeDuration: 1.0,
      onComplete: () => {
        console.log(`Traveled to ${id}`);
      }
    });
  }
}

// Usage
const fastTravel = new FastTravelSystem();

// Unlock when player discovers location
player.on('discover', (location) => {
  fastTravel.unlockLocation(location.id, location.position);
});

// Open fast travel menu
ui.on('fastTravelOpen', () => {
  const locations = Array.from(fastTravel.unlocked);
  showFastTravelMenu(locations);
});
```

---

## Best Practices

### Portal Performance

```typescript
// ❌ Bad - Render all portals every frame
portals.forEach(portal => renderPortal(portal));

// ✅ Good - Only render visible portals
const visiblePortals = portals.filter(portal => {
  return isInView(portal.position, camera) &&
         distance(portal.position, camera.position) < portal.renderDistance;
});

visiblePortals.forEach(portal => renderPortal(portal));
```

### Comfort Settings

```typescript
// Let users customize comfort level
function setUserComfort(level) {
  const settings = {
    none: { vignette: false, snapTurn: false, fovReduction: 0 },
    low: { vignette: true, snapTurn: false, fovReduction: 0.1 },
    medium: { vignette: true, snapTurn: true, fovReduction: 0.3 },
    high: { vignette: true, snapTurn: true, fovReduction: 0.5 }
  };

  comfort.applySettings(settings[level]);
}

// Provide in-game settings menu
ui.addSetting('comfort-level', {
  type: 'select',
  options: ['none', 'low', 'medium', 'high'],
  default: 'medium',
  onChange: setUserComfort
});
```

---

## Browser Support

| Browser | Portals | Teleport | Transitions |
|---------|---------|----------|-------------|
| **Chrome/Edge** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Firefox** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Safari** | ✅ Yes | ✅ Yes | ✅ Yes |

**Note**: All features work in any modern JavaScript environment with WebXR support.

---

## Examples

See [examples/portals](../../../examples/portals) for complete demos:
- Basic portal
- Recursive portal rendering
- Cross-server portals
- Teleport system
- Scene transitions

---

## TypeScript

Full TypeScript support:

```typescript
import type {
  Portal,
  PortalConfig,
  TeleportConfig,
  TransitionConfig,
  ComfortSettings,
  Vec3,
  Quaternion
} from '@hololand/portals';

const portal: PortalConfig = {
  id: 'portal-1',
  position: { x: 0, y: 1, z: -5 },
  destination: {
    position: { x: 100, y: 0, z: 100 }
  },
  size: { width: 2, height: 3 }
};
```

---

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

---

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../../../CONTRIBUTING.md).

**Areas we'd love help with**:
- Portal rendering optimizations
- More transition effects
- Comfort mode research
- Documentation improvements

---

## License

Elastic License 2.0 - See [LICENSE](../../../LICENSE)

---

## Related Packages

- [@hololand/renderer](../renderer) - VR/AR rendering engine
- [@hololand/physics](../physics) - Physics and collision
- [@hololand/networking](../networking) - Multiplayer networking
- [@hololand/world](../world) - World management

---

**Last Updated**: February 21, 2026

---

*Part of the [Hololand](https://github.com/brianonbased-dev/Hololand) VR/AR platform*
