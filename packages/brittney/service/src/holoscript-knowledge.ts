/**
 * HoloScript Knowledge Base for RAG
 * 
 * Provides curated HoloScript examples and documentation for Brittney
 * to generate accurate code without fine-tuning.
 */

// =============================================================================
// Core Language Concepts
// =============================================================================

export const HOLOSCRIPT_OVERVIEW = `
# HoloScript Language Overview

HoloScript is a declarative DSL for building VR/AR experiences in Hololand.
It uses a clean, CSS-like syntax for defining 3D objects, scenes, and behaviors.

## Core Concepts

1. **Objects** - 3D entities with geometry, materials, physics
2. **Scenes** - Containers for objects with environment settings
3. **Traits** - Decorators that add behavior (@grabbable, @pointable, etc.)
4. **Animations** - Declarative property animations
5. **Events** - Interaction handlers (onPoint, onGrab, onHoverEnter, etc.)
6. **UI** - Spatial UI panels and controls
7. **Prefabs** - Reusable object templates

## Basic Syntax

\`\`\`holoscript
// Object declaration
object MyObject {
  geometry: 'cube'
  position: [0, 1, 0]
  color: '#ff0000'
}

// With traits
object InteractiveBox @grabbable @throwable {
  geometry: 'cube'
  physics: { mass: 1 }
}
\`\`\`
`;

// =============================================================================
// VR Traits
// =============================================================================

export const VR_TRAITS = `
# VR Interaction Traits

## @grabbable
Makes objects grabbable in VR. Requires physics.

\`\`\`holoscript
object Ball @grabbable {
  geometry: 'sphere'
  physics: { mass: 0.5 }
}
\`\`\`

## @throwable
Adds throwing physics. Usually combined with @grabbable.

\`\`\`holoscript
object ThrowableCube @grabbable @throwable {
  geometry: 'cube'
  physics: {
    mass: 0.5
    restitution: 0.6
  }
}
\`\`\`

## @pointable
Makes objects respond to VR pointer/gaze.

\`\`\`holoscript
object Button @pointable {
  geometry: 'cylinder'
  scale: [0.1, 0.02, 0.1]
  color: 'red'

  onPoint: {
    audio.play('click')
    this.pressed()
  }
}
\`\`\`

## @hoverable
Adds hover detection for visual feedback.

\`\`\`holoscript
object HighlightCube @hoverable {
  geometry: 'cube'
  color: '#4488cc'

  onHoverEnter: {
    this.color = '#66aaff'
    this.scale = 1.1
  }

  onHoverExit: {
    this.color = '#4488cc'
    this.scale = 1.0
  }
}
\`\`\`

## @breakable
Makes objects destructible.

\`\`\`holoscript
object Glass @grabbable @throwable @breakable {
  geometry: 'model/glass.glb'
  physics: { mass: 0.3 }

  breakable: {
    threshold: 3
    shatterPattern: 'glass'
  }
}
\`\`\`

## @networked
Syncs object state across multiplayer sessions.

\`\`\`holoscript
object SharedBall @grabbable @networked {
  geometry: 'sphere'

  @networked position
  @networked rotation
  @networked owner: null

  onGrab(player): {
    if (network.requestOwnership(this)) {
      this.owner = player.id
    }
  }
}
\`\`\`

## @collidable
Enables collision detection.

\`\`\`holoscript
object Floor @collidable {
  geometry: 'plane'
  size: [10, 10]
  material: 'wood_floor'
}
\`\`\`

## @scalable
Allows runtime scaling with gestures.

\`\`\`holoscript
object ResizableBox @grabbable @scalable {
  geometry: 'cube'
  minScale: 0.5
  maxScale: 3.0
}
\`\`\`
`;

// =============================================================================
// Common Patterns
// =============================================================================

export const COMMON_PATTERNS = `
# Common HoloScript Patterns

## Floating Object with Animation

\`\`\`holoscript
object FloatCube {
  geometry: 'cube'
  color: 'cyan'

  animation float {
    property: 'position.y'
    from: 0
    to: 0.5
    duration: 1000
    loop: infinite
    easing: 'easeInOut'
  }
}
\`\`\`

## Collectible Pickup

\`\`\`holoscript
object Coin @hoverable @pointable {
  geometry: 'model/coin.glb'

  animation float {
    property: 'position.y'
    from: 0
    to: 0.2
    duration: 1000
    loop: infinite
    easing: 'easeInOut'
  }

  animation spin {
    property: 'rotation.y'
    from: 0
    to: 360
    duration: 2000
    loop: infinite
  }

  collectible: {
    value: 10
    type: 'coin'
  }

  onPoint: {
    player.collect(this.collectible)
    particles.spawn('collect', this.position)
    audio.play('pickup')
    this.destroy()
  }
}
\`\`\`

## Interactive Door

\`\`\`holoscript
object Door @pointable {
  geometry: 'model/door.glb'
  state: 'closed'
  isLocked: false

  states: {
    closed: { rotation: [0, 0, 0] }
    open: { rotation: [0, -90, 0] }
  }

  transition: {
    duration: 800
    easing: 'easeOutBack'
  }

  onPoint: {
    if (this.isLocked) {
      audio.play('locked')
      ui.showMessage('Door is locked')
    } else {
      this.state = this.state == 'closed' ? 'open' : 'closed'
      audio.play(this.state == 'open' ? 'door_open' : 'door_close')
    }
  }
}
\`\`\`

## UI Panel

\`\`\`holoscript
ui InfoPanel {
  position: [0, 1.5, 1]
  size: [0.4, 0.3]

  background: {
    color: 'rgba(0, 0, 0, 0.8)'
    borderRadius: 10
  }

  children: {
    text Title {
      content: 'Welcome'
      fontSize: 24
      color: 'white'
    }
  }
}
\`\`\`

## Button

\`\`\`holoscript
button StartButton @pointable {
  text: 'Start'
  width: 120
  height: 40

  style: {
    background: '#4ECDC4'
    borderRadius: 8
    fontSize: 18
  }

  onPoint: {
    game.start()
  }
}
\`\`\`

## Particle Effect

\`\`\`holoscript
particles SnowEffect {
  emitter: 'box'
  position: [0, 10, 0]
  size: [20, 1, 20]

  emission: {
    rate: 100
  }

  particle: {
    texture: 'snow'
    size: [0.05, 0.1]
    lifetime: [3, 5]
    color: '#ffffff'
  }

  physics: {
    velocity: [0, -1, 0]
    gravity: 0
  }
}
\`\`\`

## Light Source

\`\`\`holoscript
light SunLight {
  type: 'directional'
  color: '#fffaf0'
  intensity: 1.2
  position: [10, 20, 10]
  castShadow: true
}

light PointLight {
  type: 'point'
  color: '#ffaa00'
  intensity: 0.8
  position: [0, 3, 0]
  range: 10
}
\`\`\`

## Audio

\`\`\`holoscript
audio BackgroundMusic {
  source: 'audio/ambient.mp3'
  spatial: false
  volume: 0.5
  loop: true
  autoplay: true
}

audio SpatialSound {
  source: 'audio/waterfall.mp3'
  spatial: true
  volume: 1.0
  position: [5, 0, 0]
  maxDistance: 20
}
\`\`\`

## NPC / Prefab

\`\`\`holoscript
prefab Merchant {
  geometry: 'model/merchant.glb'

  npc: {
    name: 'Tom'
    type: 'merchant'
    dialogue: 'dialogues/merchant_intro'
  }

  @pointable {
    onPoint: {
      dialogue.start(this.npc.dialogue)
    }
  }

  animator: {
    idle: 'idle'
    talk: 'talking'
  }
}
\`\`\`

## Moving Platform

\`\`\`holoscript
object MovingPlatform @collidable {
  geometry: 'box'
  size: [2, 0.3, 2]
  material: 'metal'

  physics: {
    type: 'kinematic'
  }

  animation move {
    property: 'position.y'
    from: 0
    to: 5
    duration: 3000
    loop: infinite
    easing: 'easeInOut'
  }
}
\`\`\`

## Trigger Zone

\`\`\`holoscript
object TriggerZone {
  geometry: 'box'
  size: [3, 2, 3]
  visible: false

  trigger: {
    layers: ['Player']
    once: true
  }

  onTriggerEnter(other): {
    if (other.tag == 'Player') {
      game.startCutscene('intro')
    }
  }
}
\`\`\`
`;

// =============================================================================
// Scene Setup
// =============================================================================

export const SCENE_PATTERNS = `
# Scene Patterns

## Basic Scene

\`\`\`holoscript
scene MyWorld {
  environment: {
    skybox: 'sunset'
    ambientLight: 0.3
  }

  object Floor @collidable {
    geometry: 'plane'
    size: [20, 20]
    material: 'grass'
  }
}
\`\`\`

## Indoor Environment

\`\`\`holoscript
scene LivingRoom {
  environment: {
    type: 'indoor'
    size: [8, 3, 8]
  }

  object Floor @collidable {
    geometry: 'plane'
    size: [8, 8]
    material: 'wood_floor'
  }

  object[] Walls @collidable {
    count: 4
    geometry: 'plane'
    material: 'painted_wall'
  }

  light RoomLight {
    type: 'point'
    position: [0, 2.8, 0]
    intensity: 1.0
  }
}
\`\`\`

## Environment Controls

\`\`\`holoscript
// Time of day
scene.environment.timeOfDay = 'evening'
scene.environment.updateLighting()

// Weather
scene.weather.set('rain')

// Physics
scene.physics.gravity = -9.81
\`\`\`
`;

// =============================================================================
// Material & Graphics Traits
// =============================================================================

export const GRAPHICS_TRAITS = `
# Graphics Trait Annotations

## @material - PBR Material

\`\`\`holoscript
orb GoldSphere {
  position: [0, 1, 0]
  @material {
    type: pbr
    metallic: 0.9
    roughness: 0.1
    color: { r: 1.0, g: 0.84, b: 0.0 }
  }
}
\`\`\`

## @lighting - Light Configuration

\`\`\`holoscript
orb LitObject {
  @lighting {
    type: directional
    intensity: 1.5
    shadows: true
    shadowType: soft
  }
}
\`\`\`

## @rendering - Quality Settings

\`\`\`holoscript
orb OptimizedObject {
  @rendering {
    quality: high
    platform: vr
    lod: true
    culling: true
  }
}
\`\`\`

## Material Presets
Available presets: gold, copper, steel, plastic, wood, concrete, glass
\`\`\`holoscript
object MetalCube {
  geometry: 'cube'
  material: { preset: 'steel' }
}
\`\`\`
`;

// =============================================================================
// Quick Reference
// =============================================================================

export const QUICK_REFERENCE = `
# HoloScript Quick Reference

## Geometries
cube, sphere, cylinder, cone, torus, capsule, plane, model/path.glb

## Colors
Named: red, blue, green, cyan, orange, purple, white, black
Hex: '#ff0000', '#4ECDC4'
RGB: { r: 1.0, g: 0.5, b: 0.0 }

## Position/Rotation/Scale
position: [x, y, z]
rotation: [x, y, z] (degrees)
scale: 1.0 or [x, y, z]

## Traits
@grabbable - VR grab
@throwable - Throw physics
@pointable - Pointer/gaze interaction
@hoverable - Hover detection
@breakable - Destructible
@networked - Multiplayer sync
@collidable - Collision
@scalable - Resize with gestures

## Animation Properties
position.x/y/z, rotation.x/y/z, scale, opacity, color, material.emission.intensity

## Easing Functions
linear, easeIn, easeOut, easeInOut, easeInBack, easeOutBack, easeInOutBack

## Events
onPoint, onGrab, onRelease, onHoverEnter, onHoverExit, onTriggerEnter, onTriggerExit, onSwing

## Physics Types
dynamic, kinematic, static
`;

// =============================================================================
// RAG Search
// =============================================================================

interface KnowledgeChunk {
  id: string;
  category: string;
  content: string;
  keywords: string[];
}

const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  // Objects
  {
    id: 'basic-object',
    category: 'objects',
    content: `object MyObject {\n  geometry: 'cube'\n  position: [0, 1, 0]\n  color: '#ff0000'\n}`,
    keywords: ['object', 'cube', 'create', 'basic', 'simple'],
  },
  {
    id: 'sphere',
    category: 'objects',
    content: `object MySphere {\n  geometry: 'sphere'\n  position: [0, 1, 0]\n  color: 'blue'\n}`,
    keywords: ['sphere', 'ball', 'round', 'circle'],
  },
  {
    id: 'grabbable',
    category: 'traits',
    content: `object Ball @grabbable {\n  geometry: 'sphere'\n  physics: { mass: 0.5 }\n}`,
    keywords: ['grab', 'pick up', 'hold', 'hand', 'vr'],
  },
  {
    id: 'throwable',
    category: 'traits',
    content: `object ThrowableCube @grabbable @throwable {\n  geometry: 'cube'\n  physics: {\n    mass: 0.5\n    restitution: 0.6\n  }\n}`,
    keywords: ['throw', 'toss', 'physics', 'bounce'],
  },
  {
    id: 'pointable-button',
    category: 'interaction',
    content: `object Button @pointable {\n  geometry: 'cylinder'\n  scale: [0.1, 0.02, 0.1]\n  color: 'red'\n\n  onPoint: {\n    audio.play('click')\n  }\n}`,
    keywords: ['button', 'click', 'press', 'point', 'interact'],
  },
  {
    id: 'hoverable',
    category: 'interaction',
    content: `object HighlightCube @hoverable {\n  geometry: 'cube'\n  color: '#4488cc'\n\n  onHoverEnter: {\n    this.color = '#66aaff'\n    this.scale = 1.1\n  }\n\n  onHoverExit: {\n    this.color = '#4488cc'\n    this.scale = 1.0\n  }\n}`,
    keywords: ['hover', 'highlight', 'glow', 'look', 'gaze'],
  },
  {
    id: 'animation-float',
    category: 'animation',
    content: `object FloatCube {\n  geometry: 'cube'\n\n  animation float {\n    property: 'position.y'\n    from: 0\n    to: 0.5\n    duration: 1000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['float', 'bob', 'hover', 'animate', 'up down'],
  },
  {
    id: 'animation-spin',
    category: 'animation',
    content: `object SpinCube {\n  geometry: 'cube'\n\n  animation spin {\n    property: 'rotation.y'\n    from: 0\n    to: 360\n    duration: 2000\n    loop: infinite\n  }\n}`,
    keywords: ['spin', 'rotate', 'turn', 'twist'],
  },
  {
    id: 'animation-pulse',
    category: 'animation',
    content: `object PulseSphere {\n  geometry: 'sphere'\n\n  animation pulse {\n    property: 'scale'\n    from: 1\n    to: 1.2\n    duration: 1000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['pulse', 'breathe', 'scale', 'grow', 'shrink'],
  },
  {
    id: 'collectible',
    category: 'gameplay',
    content: `object Coin @hoverable @pointable {\n  geometry: 'model/coin.glb'\n\n  animation float {\n    property: 'position.y'\n    from: 0\n    to: 0.2\n    duration: 1000\n    loop: infinite\n  }\n\n  animation spin {\n    property: 'rotation.y'\n    from: 0\n    to: 360\n    duration: 2000\n    loop: infinite\n  }\n\n  collectible: { value: 10, type: 'coin' }\n\n  onPoint: {\n    player.collect(this.collectible)\n    particles.spawn('collect', this.position)\n    audio.play('pickup')\n    this.destroy()\n  }\n}`,
    keywords: ['coin', 'gem', 'pickup', 'collect', 'score', 'point'],
  },
  {
    id: 'door',
    category: 'interaction',
    content: `object Door @pointable {\n  geometry: 'model/door.glb'\n  state: 'closed'\n  isLocked: false\n\n  states: {\n    closed: { rotation: [0, 0, 0] }\n    open: { rotation: [0, -90, 0] }\n  }\n\n  transition: {\n    duration: 800\n    easing: 'easeOutBack'\n  }\n\n  onPoint: {\n    if (this.isLocked) {\n      audio.play('locked')\n      ui.showMessage('Door is locked')\n    } else {\n      this.state = this.state == 'closed' ? 'open' : 'closed'\n      audio.play(this.state == 'open' ? 'door_open' : 'door_close')\n    }\n  }\n}`,
    keywords: ['door', 'open', 'close', 'lock', 'unlock', 'enter'],
  },
  {
    id: 'breakable',
    category: 'traits',
    content: `object Glass @grabbable @throwable @breakable {\n  geometry: 'model/glass.glb'\n  physics: { mass: 0.3 }\n\n  breakable: {\n    threshold: 3\n    shatterPattern: 'glass'\n  }\n}`,
    keywords: ['break', 'shatter', 'destroy', 'fragile', 'glass', 'bottle'],
  },
  {
    id: 'ui-panel',
    category: 'ui',
    content: `ui InfoPanel {\n  position: [0, 1.5, 1]\n  size: [0.4, 0.3]\n\n  background: {\n    color: 'rgba(0, 0, 0, 0.8)'\n    borderRadius: 10\n  }\n\n  children: {\n    text Title {\n      content: 'Welcome'\n      fontSize: 24\n      color: 'white'\n    }\n  }\n}`,
    keywords: ['ui', 'panel', 'menu', 'hud', 'interface', 'text', 'display'],
  },
  {
    id: 'ui-button',
    category: 'ui',
    content: `button StartButton @pointable {\n  text: 'Start'\n  width: 120\n  height: 40\n\n  style: {\n    background: '#4ECDC4'\n    borderRadius: 8\n    fontSize: 18\n  }\n\n  onPoint: {\n    game.start()\n  }\n}`,
    keywords: ['button', 'ui', 'start', 'menu', 'click'],
  },
  {
    id: 'particles',
    category: 'effects',
    content: `particles SnowEffect {\n  emitter: 'box'\n  position: [0, 10, 0]\n  size: [20, 1, 20]\n\n  emission: { rate: 100 }\n\n  particle: {\n    texture: 'snow'\n    size: [0.05, 0.1]\n    lifetime: [3, 5]\n    color: '#ffffff'\n  }\n\n  physics: {\n    velocity: [0, -1, 0]\n    gravity: 0\n  }\n}`,
    keywords: ['particle', 'snow', 'rain', 'effect', 'weather', 'explosion', 'fire'],
  },
  {
    id: 'light',
    category: 'lighting',
    content: `light SunLight {\n  type: 'directional'\n  color: '#fffaf0'\n  intensity: 1.2\n  position: [10, 20, 10]\n  castShadow: true\n}\n\nlight PointLight {\n  type: 'point'\n  color: '#ffaa00'\n  intensity: 0.8\n  position: [0, 3, 0]\n}`,
    keywords: ['light', 'sun', 'lamp', 'illuminate', 'bright', 'dark', 'shadow'],
  },
  {
    id: 'audio',
    category: 'audio',
    content: `audio BackgroundMusic {\n  source: 'audio/ambient.mp3'\n  spatial: false\n  volume: 0.5\n  loop: true\n  autoplay: true\n}\n\naudio SpatialSound {\n  source: 'audio/waterfall.mp3'\n  spatial: true\n  position: [5, 0, 0]\n  maxDistance: 20\n}`,
    keywords: ['audio', 'sound', 'music', 'play', 'ambient', '3d sound', 'spatial'],
  },
  {
    id: 'npc',
    category: 'characters',
    content: `prefab Merchant {\n  geometry: 'model/merchant.glb'\n\n  npc: {\n    name: 'Tom'\n    type: 'merchant'\n    dialogue: 'dialogues/merchant_intro'\n  }\n\n  @pointable {\n    onPoint: {\n      dialogue.start(this.npc.dialogue)\n    }\n  }\n\n  animator: {\n    idle: 'idle'\n    talk: 'talking'\n  }\n}`,
    keywords: ['npc', 'character', 'merchant', 'guard', 'wizard', 'talk', 'dialogue'],
  },
  {
    id: 'platform',
    category: 'gameplay',
    content: `object MovingPlatform @collidable {\n  geometry: 'box'\n  size: [2, 0.3, 2]\n  material: 'metal'\n\n  physics: { type: 'kinematic' }\n\n  animation move {\n    property: 'position.y'\n    from: 0\n    to: 5\n    duration: 3000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['platform', 'elevator', 'lift', 'move', 'kinematic'],
  },
  {
    id: 'trigger',
    category: 'gameplay',
    content: `object TriggerZone {\n  geometry: 'box'\n  size: [3, 2, 3]\n  visible: false\n\n  trigger: {\n    layers: ['Player']\n    once: true\n  }\n\n  onTriggerEnter(other): {\n    if (other.tag == 'Player') {\n      game.startCutscene('intro')\n    }\n  }\n}`,
    keywords: ['trigger', 'zone', 'area', 'detect', 'enter', 'spawn'],
  },
  {
    id: 'networked',
    category: 'multiplayer',
    content: `object SharedBall @grabbable @networked {\n  geometry: 'sphere'\n\n  @networked position\n  @networked rotation\n  @networked owner: null\n\n  onGrab(player): {\n    if (network.requestOwnership(this)) {\n      this.owner = player.id\n    }\n  }\n\n  onRelease: {\n    setTimeout(() => this.owner = null, 1000)\n  }\n}`,
    keywords: ['network', 'multiplayer', 'sync', 'share', 'player', 'online'],
  },
  {
    id: 'scene',
    category: 'scene',
    content: `scene MyWorld {\n  environment: {\n    skybox: 'sunset'\n    ambientLight: 0.3\n  }\n\n  object Floor @collidable {\n    geometry: 'plane'\n    size: [20, 20]\n    material: 'grass'\n  }\n}`,
    keywords: ['scene', 'world', 'environment', 'skybox', 'floor', 'ground'],
  },
  {
    id: 'weather',
    category: 'environment',
    content: `scene.weather.set('rain')\nscene.weather.set('snow')\nscene.weather.set('fog')\nscene.weather.set('clear')`,
    keywords: ['weather', 'rain', 'snow', 'fog', 'clear', 'storm'],
  },
  {
    id: 'time-of-day',
    category: 'environment',
    content: `scene.environment.timeOfDay = 'morning'\nscene.environment.timeOfDay = 'noon'\nscene.environment.timeOfDay = 'evening'\nscene.environment.timeOfDay = 'night'\nscene.environment.updateLighting()`,
    keywords: ['time', 'day', 'night', 'morning', 'evening', 'noon', 'sunset'],
  },
  {
    id: 'physics',
    category: 'physics',
    content: `// Dynamic object (affected by forces)\nobject Ball {\n  geometry: 'sphere'\n  physics: {\n    type: 'dynamic'\n    mass: 1\n    friction: 0.5\n    restitution: 0.8\n  }\n}\n\n// Change gravity\nscene.physics.gravity = -9.81`,
    keywords: ['physics', 'gravity', 'mass', 'bounce', 'friction', 'dynamic'],
  },
  {
    id: 'teleporter',
    category: 'gameplay',
    content: `object Teleporter @pointable {\n  geometry: 'cylinder'\n  size: [1, 0.1, 1]\n  color: '#00ffff'\n\n  particles: {\n    type: 'teleport_sparkle'\n    emitFrom: 'surface'\n  }\n\n  destination: 'next_level'\n\n  onPoint: {\n    effects.teleportOut(player)\n    setTimeout(() => {\n      player.teleportTo(this.destination)\n      effects.teleportIn(player)\n    }, 1000)\n  }\n}`,
    keywords: ['teleport', 'portal', 'warp', 'transport', 'level', 'travel'],
  },
  // ==========================================================================
  // Additional patterns from training data
  // ==========================================================================
  {
    id: 'weapon-hammer',
    category: 'combat',
    content: `object Hammer @grabbable {\n  geometry: 'model/hammer.glb'\n\n  weapon: {\n    type: 'melee'\n    damage: 23\n    attackSpeed: 1.0\n  }\n\n  physics: { mass: 2 }\n\n  onSwing(velocity): {\n    if (velocity.magnitude > 2) {\n      let hits = physics.overlapSphere(this.tipPosition, 0.3)\n      hits.forEach(hit => {\n        if (hit.health) {\n          hit.takeDamage(this.weapon.damage)\n        }\n      })\n    }\n  }\n}`,
    keywords: ['hammer', 'weapon', 'melee', 'sword', 'axe', 'damage', 'attack', 'swing', 'hit'],
  },
  {
    id: 'container-crate',
    category: 'containers',
    content: `object Crate @pointable {\n  geometry: 'model/crate.glb'\n  state: 'closed'\n\n  inventory: {\n    slots: 6\n    items: []\n  }\n\n  states: {\n    closed: { lidRotation: 0 }\n    open: { lidRotation: -110 }\n  }\n\n  onPoint: {\n    if (this.state == 'closed') {\n      this.state = 'open'\n      audio.play('crate_open')\n      ui.showInventory(this.inventory)\n    } else {\n      this.state = 'closed'\n      audio.play('crate_close')\n      ui.hideInventory()\n    }\n  }\n}`,
    keywords: ['crate', 'chest', 'container', 'inventory', 'storage', 'loot', 'box', 'barrel'],
  },
  {
    id: 'shop',
    category: 'commerce',
    content: `scene FurnitureShop {\n  environment: {\n    template: 'retail-store'\n    lighting: 'warm'\n  }\n\n  object Counter @pointable {\n    geometry: 'model/counter.glb'\n    position: [0, 0, -2]\n  }\n\n  object[] ShopItems @grabbable {\n    count: 6\n    geometry: 'model/furniture_item.glb'\n    layout: 'grid'\n    spacing: 0.5\n  }\n\n  shop {\n    type: 'furniture'\n    currency: 'coins'\n  }\n}`,
    keywords: ['shop', 'store', 'buy', 'sell', 'commerce', 'retail', 'counter', 'items'],
  },
  {
    id: 'indoor-room',
    category: 'scene',
    content: `scene LivingRoom {\n  environment: {\n    type: 'indoor'\n    size: [8, 3, 8]\n  }\n\n  object Floor @collidable {\n    geometry: 'plane'\n    size: [8, 8]\n    material: 'wood_floor'\n  }\n\n  object[] Walls @collidable {\n    count: 4\n    geometry: 'plane'\n    material: 'painted_wall'\n  }\n\n  light RoomLight {\n    type: 'point'\n    position: [0, 2.8, 0]\n    intensity: 1.0\n  }\n}`,
    keywords: ['room', 'indoor', 'living', 'bedroom', 'office', 'gym', 'interior', 'walls', 'floor'],
  },
  {
    id: 'beach-scene',
    category: 'scene',
    content: `scene BeachWorld {\n  environment: {\n    skybox: 'tropical_beach'\n    ambientLight: 0.4\n  }\n\n  terrain {\n    type: 'beach'\n    size: [100, 100]\n  }\n\n  weather {\n    type: 'clear'\n  }\n}`,
    keywords: ['beach', 'tropical', 'ocean', 'sand', 'outdoor', 'island', 'vacation'],
  },
  {
    id: 'animation-glow',
    category: 'animation',
    content: `object GlowTorus {\n  geometry: 'torus'\n\n  animation glow {\n    property: 'material.emission.intensity'\n    from: 0\n    to: 1\n    duration: 1000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['glow', 'emission', 'shine', 'light up', 'emissive'],
  },
  {
    id: 'animation-fade',
    category: 'animation',
    content: `object FadeCone {\n  geometry: 'cone'\n\n  animation fade {\n    property: 'opacity'\n    from: 1\n    to: 0\n    duration: 1000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['fade', 'opacity', 'transparent', 'disappear', 'appear', 'alpha'],
  },
  {
    id: 'animation-shake',
    category: 'animation',
    content: `object ShakeCone {\n  geometry: 'cone'\n\n  animation shake {\n    property: 'rotation.z'\n    from: -5\n    to: 5\n    duration: 100\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['shake', 'vibrate', 'wobble', 'tremble', 'earthquake'],
  },
  {
    id: 'animation-grow',
    category: 'animation',
    content: `object GrowCapsule {\n  geometry: 'capsule'\n\n  animation grow {\n    property: 'scale'\n    from: 0.5\n    to: 1.5\n    duration: 3000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n}`,
    keywords: ['grow', 'shrink', 'size', 'expand', 'contract', 'scale'],
  },
  {
    id: 'particles-explosion',
    category: 'effects',
    content: `particles ExplosionEffect {\n  emitter: 'point'\n  position: [0, 0, 0]\n\n  emission: { rate: 500 }\n\n  particle: {\n    texture: 'explosion'\n    size: [0.1, 0.3]\n    lifetime: [1, 2]\n    color: ['#ffaa00', '#ff0000']\n  }\n\n  physics: {\n    velocity: [0, 5, 0]\n    gravity: -0.5\n  }\n}`,
    keywords: ['explosion', 'blast', 'boom', 'burst', 'detonate'],
  },
  {
    id: 'particles-rain',
    category: 'effects',
    content: `particles RainEffect {\n  emitter: 'box'\n  position: [0, 10, 0]\n  size: [20, 1, 20]\n\n  emission: { rate: 200 }\n\n  particle: {\n    texture: 'rain'\n    size: [0.02, 0.1]\n    lifetime: [1, 2]\n    color: '#aaccff'\n  }\n\n  physics: {\n    velocity: [0, -10, 0]\n    gravity: 0\n  }\n}`,
    keywords: ['rain', 'drops', 'water', 'falling'],
  },
  {
    id: 'particles-fire',
    category: 'effects',
    content: `particles FireEffect {\n  emitter: 'point'\n  position: [0, 0, 0]\n\n  emission: { rate: 50 }\n\n  particle: {\n    texture: 'fire'\n    size: [0.2, 0.5]\n    lifetime: [0.5, 1.5]\n    color: ['#ff6600', '#ffaa00', '#ff3300']\n  }\n\n  physics: {\n    velocity: [0, 2, 0]\n    gravity: -0.1\n  }\n}`,
    keywords: ['fire', 'flame', 'burn', 'torch', 'campfire'],
  },
  {
    id: 'material-metal',
    category: 'materials',
    content: `object MetalCube {\n  geometry: 'cube'\n  material: {\n    type: 'metal'\n    metallic: 0.9\n    roughness: 0.1\n  }\n}`,
    keywords: ['metal', 'steel', 'iron', 'chrome', 'shiny', 'reflective'],
  },
  {
    id: 'material-wood',
    category: 'materials',
    content: `object WoodCube {\n  geometry: 'cube'\n  material: {\n    type: 'wood'\n    texture: 'oak'\n  }\n}`,
    keywords: ['wood', 'wooden', 'oak', 'pine', 'timber', 'plank'],
  },
  {
    id: 'material-glass',
    category: 'materials',
    content: `object GlassSphere {\n  geometry: 'sphere'\n  material: {\n    type: 'glass'\n    transparency: 0.8\n    ior: 1.5\n  }\n}`,
    keywords: ['glass', 'transparent', 'see-through', 'crystal', 'window'],
  },
  {
    id: 'circular-platform',
    category: 'gameplay',
    content: `object RotatingPlatform @collidable {\n  geometry: 'cylinder'\n  size: [3, 0.3, 3]\n  material: 'metal'\n\n  physics: { type: 'kinematic' }\n\n  animation rotate {\n    property: 'rotation.y'\n    from: 0\n    to: 360\n    duration: 10000\n    loop: infinite\n    easing: 'linear'\n  }\n}`,
    keywords: ['circular', 'rotating', 'spin', 'carousel', 'turntable'],
  },
  {
    id: 'health-bar',
    category: 'ui',
    content: `ui HealthBar {\n  position: [0, 2, 0]\n  size: [0.5, 0.05]\n  followPlayer: true\n\n  bar: {\n    current: player.health\n    max: player.maxHealth\n    color: '#ff0000'\n    background: '#333333'\n  }\n}`,
    keywords: ['health', 'hp', 'life', 'bar', 'status', 'vitality'],
  },
  {
    id: 'score-display',
    category: 'ui',
    content: `ui ScoreDisplay {\n  position: [0.8, 0.9, 0]\n  anchor: 'top-right'\n\n  children: {\n    text Score {\n      content: 'Score: ' + player.score\n      fontSize: 32\n      color: 'white'\n    }\n  }\n}`,
    keywords: ['score', 'points', 'counter', 'display', 'number'],
  },
  {
    id: 'gem-collectible',
    category: 'gameplay',
    content: `object Gem @hoverable @pointable {\n  geometry: 'sphere'\n  color: '#4ECDC4'\n\n  animation float {\n    property: 'position.y'\n    from: 0\n    to: 0.2\n    duration: 1000\n    loop: infinite\n    easing: 'easeInOut'\n  }\n\n  animation spin {\n    property: 'rotation.y'\n    from: 0\n    to: 360\n    duration: 2000\n    loop: infinite\n  }\n\n  collectible: {\n    value: 5\n    type: 'gem'\n  }\n\n  onPoint: {\n    player.collect(this.collectible)\n    particles.spawn('collect', this.position)\n    audio.play('pickup')\n    this.destroy()\n  }\n}`,
    keywords: ['gem', 'crystal', 'jewel', 'diamond', 'ruby', 'emerald'],
  },
  {
    id: 'heart-collectible',
    category: 'gameplay',
    content: `object Heart @hoverable @pointable {\n  geometry: 'model/heart.glb'\n  color: 'red'\n\n  animation float {\n    property: 'position.y'\n    from: 0\n    to: 0.2\n    duration: 1000\n    loop: infinite\n  }\n\n  collectible: {\n    value: 1\n    type: 'health'\n  }\n\n  onPoint: {\n    player.heal(this.collectible.value)\n    particles.spawn('heal', this.position)\n    audio.play('heal')\n    this.destroy()\n  }\n}`,
    keywords: ['heart', 'health', 'heal', 'life', 'restore', 'recovery'],
  },
  {
    id: 'ambient-audio',
    category: 'audio',
    content: `audio ForestAmbient {\n  source: 'audio/forest_ambient.mp3'\n  spatial: false\n  volume: 0.5\n  loop: true\n  autoplay: true\n}`,
    keywords: ['ambient', 'background', 'atmosphere', 'environment', 'forest', 'nature'],
  },
  {
    id: 'gravity-setting',
    category: 'physics',
    content: `// Normal Earth gravity\nscene.physics.gravity = -9.81\n\n// Moon gravity\nscene.physics.gravity = -1.62\n\n// Zero gravity\nscene.physics.gravity = 0`,
    keywords: ['gravity', 'fall', 'weight', 'moon', 'space', 'zero-g'],
  },
];

/**
 * Simple keyword-based RAG search
 * Returns relevant HoloScript examples based on query
 */
export function searchKnowledge(query: string, limit: number = 5): string[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // Score each chunk based on keyword matches
  const scored = KNOWLEDGE_CHUNKS.map(chunk => {
    let score = 0;

    // Check keywords
    for (const keyword of chunk.keywords) {
      if (queryLower.includes(keyword)) {
        score += 3;
      }
      for (const word of queryWords) {
        if (keyword.includes(word) || word.includes(keyword)) {
          score += 1;
        }
      }
    }

    // Check content
    if (chunk.content.toLowerCase().includes(queryLower)) {
      score += 2;
    }

    return { chunk, score };
  });

  // Sort by score and return top matches
  const results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.chunk.content);

  return results;
}

/**
 * Get the full system prompt with embedded HoloScript knowledge
 */
export function getEnhancedSystemPrompt(): string {
  return `You are Brittney, the AI assistant for Hololand and HoloScript development.

# Your Role
You help developers build immersive VR/AR experiences using HoloScript, the declarative DSL for the Hololand platform. You are an expert in:
- HoloScript syntax and best practices
- VR interaction patterns (grab, throw, point, hover)
- 3D scene composition and animation
- Performance optimization for VR
- Multiplayer/networked experiences

# Important Guidelines
1. **Always use correct HoloScript syntax** - Never invent properties or syntax
2. **Use traits for behavior** - @grabbable, @pointable, @hoverable, etc.
3. **Be concise** - Provide working code with minimal explanation
4. **Consider VR ergonomics** - Objects should be reachable, UI readable
5. **Spatial Manipulation** - You can move or change objects in the scene by emitting an action tag:
   \`[UPDATE: id { "position": [x, y, z], "color": "red" }]\`
   Use this when the user asks to "move the box" or "change the color of the sphere". Always use the correct #id found in the context.

${QUICK_REFERENCE}

# Key Syntax Examples

## Basic Object
\`\`\`holoscript
object MyObject {
  geometry: 'cube'
  position: [0, 1, 0]
  color: '#ff0000'
}
\`\`\`

## Interactive Object with Traits
\`\`\`holoscript
object Ball @grabbable @throwable {
  geometry: 'sphere'
  physics: {
    mass: 0.5
    restitution: 0.6
  }
}
\`\`\`

## Animated Object
\`\`\`holoscript
object FloatingCube {
  geometry: 'cube'
  
  animation float {
    property: 'position.y'
    from: 0
    to: 0.5
    duration: 1000
    loop: infinite
    easing: 'easeInOut'
  }
}
\`\`\`

## Button with Interaction
\`\`\`holoscript
object Button @pointable {
  geometry: 'cylinder'
  scale: [0.1, 0.02, 0.1]
  color: 'red'

  onPoint: {
    audio.play('click')
    this.pressed()
  }
}
\`\`\`

## UI Panel
\`\`\`holoscript
ui Panel {
  position: [0, 1.5, 1]
  size: [0.4, 0.3]
  background: { color: 'rgba(0,0,0,0.8)' }
  
  children: {
    text Title {
      content: 'Hello'
      fontSize: 24
      color: 'white'
    }
  }
}
\`\`\`

When users ask for code, provide complete, working HoloScript that follows these patterns.`;
}

/**
 * Build context-aware prompt with RAG results
 */
export function buildRAGPrompt(userQuery: string): string {
  const relevantExamples = searchKnowledge(userQuery, 3);
  
  if (relevantExamples.length === 0) {
    return '';
  }

  return `\n\n# Relevant HoloScript Examples\nBased on your query, here are some relevant patterns:\n\n${relevantExamples.map((ex, i) => `## Example ${i + 1}\n\`\`\`holoscript\n${ex}\n\`\`\``).join('\n\n')}`;
}
