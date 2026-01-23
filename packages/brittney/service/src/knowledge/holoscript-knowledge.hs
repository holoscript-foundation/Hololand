// =============================================================================
// HoloScript Knowledge Base - HoloScript+ Format
// =============================================================================
// Queryable knowledge chunks for RAG. Agents can search and retrieve
// relevant examples based on keywords.
//
// Pattern: P.KNOWLEDGE.RAG.01
// Wisdom: W.RAG.CHUNKS.01 - "Small, focused examples beat large docs"
// =============================================================================

meta {
  id: "KB_HOLOSCRIPT_001"
  name: "HoloScript Knowledge Base"
  version: "1.0.0"
  chunks: 50
  categories: ["objects", "traits", "animation", "interaction", "ui", "effects", "scene", "gameplay", "audio", "materials"]
}

// === OBJECTS ===
knowledge objects {
  basic_object {
    keywords: ["object", "cube", "create", "basic", "simple"]
    example: ```
      object MyObject {
        geometry: 'cube'
        position: [0, 1, 0]
        color: '#ff0000'
      }
    ```
  }

  sphere {
    keywords: ["sphere", "ball", "round", "circle"]
    example: ```
      object MySphere {
        geometry: 'sphere'
        position: [0, 1, 0]
        color: 'blue'
      }
    ```
  }

  model_import {
    keywords: ["model", "glb", "gltf", "import", "3d", "mesh"]
    example: ```
      object Character {
        geometry: 'model/character.glb'
        position: [0, 0, 0]
        scale: 1.0
      }
    ```
  }
}

// === VR TRAITS ===
knowledge traits {
  grabbable {
    keywords: ["grab", "pick up", "hold", "hand", "vr"]
    requires: ["physics"]
    example: ```
      object Ball @grabbable {
        geometry: 'sphere'
        physics: { mass: 0.5 }
      }
    ```
  }

  throwable {
    keywords: ["throw", "toss", "physics", "bounce"]
    combines_with: ["@grabbable"]
    example: ```
      object ThrowableCube @grabbable @throwable {
        geometry: 'cube'
        physics: {
          mass: 0.5
          restitution: 0.6
        }
      }
    ```
  }

  pointable {
    keywords: ["button", "click", "press", "point", "interact", "gaze"]
    example: ```
      object Button @pointable {
        geometry: 'cylinder'
        scale: [0.1, 0.02, 0.1]
        color: 'red'

        onPoint: {
          audio.play('click')
        }
      }
    ```
  }

  hoverable {
    keywords: ["hover", "highlight", "glow", "look", "gaze", "cursor"]
    example: ```
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
    ```
  }

  breakable {
    keywords: ["break", "shatter", "destroy", "fragile", "glass", "bottle"]
    example: ```
      object Glass @grabbable @throwable @breakable {
        geometry: 'model/glass.glb'
        physics: { mass: 0.3 }

        breakable: {
          threshold: 3
          shatterPattern: 'glass'
        }
      }
    ```
  }

  networked {
    keywords: ["network", "multiplayer", "sync", "share", "player", "online"]
    example: ```
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
    ```
  }

  collidable {
    keywords: ["collision", "collide", "hit", "detect", "floor", "wall"]
    example: ```
      object Floor @collidable {
        geometry: 'plane'
        size: [10, 10]
        material: 'wood_floor'
      }
    ```
  }

  scalable {
    keywords: ["scale", "resize", "pinch", "gesture", "grow", "shrink"]
    example: ```
      object ResizableBox @grabbable @scalable {
        geometry: 'cube'
        minScale: 0.5
        maxScale: 3.0
      }
    ```
  }
}

// === ANIMATIONS ===
knowledge animation {
  float {
    keywords: ["float", "bob", "hover", "animate", "up down", "levitate"]
    example: ```
      object FloatCube {
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
    ```
  }

  spin {
    keywords: ["spin", "rotate", "turn", "twist", "revolve"]
    example: ```
      object SpinCube {
        geometry: 'cube'

        animation spin {
          property: 'rotation.y'
          from: 0
          to: 360
          duration: 2000
          loop: infinite
        }
      }
    ```
  }

  pulse {
    keywords: ["pulse", "breathe", "scale", "heartbeat", "throb"]
    example: ```
      object PulseSphere {
        geometry: 'sphere'

        animation pulse {
          property: 'scale'
          from: 1
          to: 1.2
          duration: 1000
          loop: infinite
          easing: 'easeInOut'
        }
      }
    ```
  }

  fade {
    keywords: ["fade", "opacity", "transparent", "disappear", "appear", "alpha"]
    example: ```
      object FadeObject {
        geometry: 'cone'

        animation fade {
          property: 'opacity'
          from: 1
          to: 0
          duration: 1000
          loop: infinite
          easing: 'easeInOut'
        }
      }
    ```
  }

  glow {
    keywords: ["glow", "emission", "shine", "light up", "emissive", "neon"]
    example: ```
      object GlowTorus {
        geometry: 'torus'

        animation glow {
          property: 'material.emission.intensity'
          from: 0
          to: 1
          duration: 1000
          loop: infinite
          easing: 'easeInOut'
        }
      }
    ```
  }

  shake {
    keywords: ["shake", "vibrate", "wobble", "tremble", "earthquake", "jitter"]
    example: ```
      object ShakeObject {
        geometry: 'cone'

        animation shake {
          property: 'rotation.z'
          from: -5
          to: 5
          duration: 100
          loop: infinite
          easing: 'easeInOut'
        }
      }
    ```
  }
}

// === GAMEPLAY PATTERNS ===
knowledge gameplay {
  collectible {
    keywords: ["coin", "gem", "pickup", "collect", "score", "point", "crystal"]
    example: ```
      object Coin @hoverable @pointable {
        geometry: 'model/coin.glb'

        animation float {
          property: 'position.y'
          from: 0
          to: 0.2
          duration: 1000
          loop: infinite
        }

        animation spin {
          property: 'rotation.y'
          from: 0
          to: 360
          duration: 2000
          loop: infinite
        }

        collectible: { value: 10, type: 'coin' }

        onPoint: {
          player.collect(this.collectible)
          particles.spawn('collect', this.position)
          audio.play('pickup')
          this.destroy()
        }
      }
    ```
  }

  door {
    keywords: ["door", "open", "close", "lock", "unlock", "enter", "gate"]
    example: ```
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
    ```
  }

  platform {
    keywords: ["platform", "elevator", "lift", "move", "kinematic", "ride"]
    example: ```
      object MovingPlatform @collidable {
        geometry: 'box'
        size: [2, 0.3, 2]
        material: 'metal'

        physics: { type: 'kinematic' }

        animation move {
          property: 'position.y'
          from: 0
          to: 5
          duration: 3000
          loop: infinite
          easing: 'easeInOut'
        }
      }
    ```
  }

  trigger {
    keywords: ["trigger", "zone", "area", "detect", "enter", "spawn", "cutscene"]
    example: ```
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
    ```
  }

  teleporter {
    keywords: ["teleport", "portal", "warp", "transport", "level", "travel"]
    example: ```
      object Teleporter @pointable {
        geometry: 'cylinder'
        size: [1, 0.1, 1]
        color: '#00ffff'

        particles: {
          type: 'teleport_sparkle'
          emitFrom: 'surface'
        }

        destination: 'next_level'

        onPoint: {
          effects.teleportOut(player)
          setTimeout(() => {
            player.teleportTo(this.destination)
            effects.teleportIn(player)
          }, 1000)
        }
      }
    ```
  }

  weapon {
    keywords: ["hammer", "weapon", "melee", "sword", "axe", "damage", "attack", "swing"]
    example: ```
      object Hammer @grabbable {
        geometry: 'model/hammer.glb'

        weapon: {
          type: 'melee'
          damage: 23
          attackSpeed: 1.0
        }

        physics: { mass: 2 }

        onSwing(velocity): {
          if (velocity.magnitude > 2) {
            let hits = physics.overlapSphere(this.tipPosition, 0.3)
            hits.forEach(hit => {
              if (hit.health) {
                hit.takeDamage(this.weapon.damage)
              }
            })
          }
        }
      }
    ```
  }

  container {
    keywords: ["crate", "chest", "container", "inventory", "storage", "loot", "box"]
    example: ```
      object Crate @pointable {
        geometry: 'model/crate.glb'
        state: 'closed'

        inventory: {
          slots: 6
          items: []
        }

        states: {
          closed: { lidRotation: 0 }
          open: { lidRotation: -110 }
        }

        onPoint: {
          if (this.state == 'closed') {
            this.state = 'open'
            audio.play('crate_open')
            ui.showInventory(this.inventory)
          } else {
            this.state = 'closed'
            audio.play('crate_close')
            ui.hideInventory()
          }
        }
      }
    ```
  }
}

// === UI ===
knowledge ui {
  panel {
    keywords: ["ui", "panel", "menu", "hud", "interface", "text", "display"]
    example: ```
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
    ```
  }

  button {
    keywords: ["button", "ui", "start", "menu", "click", "action"]
    example: ```
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
    ```
  }

  health_bar {
    keywords: ["health", "hp", "life", "bar", "status", "vitality", "progress"]
    example: ```
      ui HealthBar {
        position: [0, 2, 0]
        size: [0.5, 0.05]
        followPlayer: true

        bar: {
          current: player.health
          max: player.maxHealth
          color: '#ff0000'
          background: '#333333'
        }
      }
    ```
  }

  score_display {
    keywords: ["score", "points", "counter", "display", "number", "hud"]
    example: ```
      ui ScoreDisplay {
        position: [0.8, 0.9, 0]
        anchor: 'top-right'

        children: {
          text Score {
            content: 'Score: ' + player.score
            fontSize: 32
            color: 'white'
          }
        }
      }
    ```
  }
}

// === PARTICLE EFFECTS ===
knowledge effects {
  snow {
    keywords: ["particle", "snow", "weather", "winter", "falling"]
    example: ```
      particles SnowEffect {
        emitter: 'box'
        position: [0, 10, 0]
        size: [20, 1, 20]

        emission: { rate: 100 }

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
    ```
  }

  rain {
    keywords: ["rain", "drops", "water", "falling", "storm"]
    example: ```
      particles RainEffect {
        emitter: 'box'
        position: [0, 10, 0]
        size: [20, 1, 20]

        emission: { rate: 200 }

        particle: {
          texture: 'rain'
          size: [0.02, 0.1]
          lifetime: [1, 2]
          color: '#aaccff'
        }

        physics: {
          velocity: [0, -10, 0]
          gravity: 0
        }
      }
    ```
  }

  fire {
    keywords: ["fire", "flame", "burn", "torch", "campfire", "heat"]
    example: ```
      particles FireEffect {
        emitter: 'point'
        position: [0, 0, 0]

        emission: { rate: 50 }

        particle: {
          texture: 'fire'
          size: [0.2, 0.5]
          lifetime: [0.5, 1.5]
          color: ['#ff6600', '#ffaa00', '#ff3300']
        }

        physics: {
          velocity: [0, 2, 0]
          gravity: -0.1
        }
      }
    ```
  }

  explosion {
    keywords: ["explosion", "blast", "boom", "burst", "detonate"]
    example: ```
      particles ExplosionEffect {
        emitter: 'point'
        position: [0, 0, 0]

        emission: { rate: 500 }

        particle: {
          texture: 'explosion'
          size: [0.1, 0.3]
          lifetime: [1, 2]
          color: ['#ffaa00', '#ff0000']
        }

        physics: {
          velocity: [0, 5, 0]
          gravity: -0.5
        }
      }
    ```
  }
}

// === SCENES ===
knowledge scene {
  basic {
    keywords: ["scene", "world", "environment", "skybox", "floor", "ground"]
    example: ```
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
    ```
  }

  indoor {
    keywords: ["room", "indoor", "living", "bedroom", "office", "interior", "walls"]
    example: ```
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
    ```
  }

  beach {
    keywords: ["beach", "tropical", "ocean", "sand", "outdoor", "island"]
    example: ```
      scene BeachWorld {
        environment: {
          skybox: 'tropical_beach'
          ambientLight: 0.4
        }

        terrain {
          type: 'beach'
          size: [100, 100]
        }

        weather {
          type: 'clear'
        }
      }
    ```
  }
}

// === AUDIO ===
knowledge audio {
  background {
    keywords: ["ambient", "background", "atmosphere", "music", "loop"]
    example: ```
      audio BackgroundMusic {
        source: 'audio/ambient.mp3'
        spatial: false
        volume: 0.5
        loop: true
        autoplay: true
      }
    ```
  }

  spatial {
    keywords: ["3d sound", "spatial", "positional", "direction", "waterfall"]
    example: ```
      audio SpatialSound {
        source: 'audio/waterfall.mp3'
        spatial: true
        volume: 1.0
        position: [5, 0, 0]
        maxDistance: 20
      }
    ```
  }
}

// === LIGHTING ===
knowledge lighting {
  directional {
    keywords: ["light", "sun", "directional", "shadow", "illuminate"]
    example: ```
      light SunLight {
        type: 'directional'
        color: '#fffaf0'
        intensity: 1.2
        position: [10, 20, 10]
        castShadow: true
      }
    ```
  }

  point {
    keywords: ["point light", "lamp", "bulb", "glow", "radius"]
    example: ```
      light PointLight {
        type: 'point'
        color: '#ffaa00'
        intensity: 0.8
        position: [0, 3, 0]
        range: 10
      }
    ```
  }
}

// === MATERIALS ===
knowledge materials {
  metal {
    keywords: ["metal", "steel", "iron", "chrome", "shiny", "reflective"]
    example: ```
      object MetalCube {
        geometry: 'cube'
        material: {
          type: 'metal'
          metallic: 0.9
          roughness: 0.1
        }
      }
    ```
  }

  wood {
    keywords: ["wood", "wooden", "oak", "pine", "timber", "plank"]
    example: ```
      object WoodCube {
        geometry: 'cube'
        material: {
          type: 'wood'
          texture: 'oak'
        }
      }
    ```
  }

  glass {
    keywords: ["glass", "transparent", "see-through", "crystal", "window"]
    example: ```
      object GlassSphere {
        geometry: 'sphere'
        material: {
          type: 'glass'
          transparency: 0.8
          ior: 1.5
        }
      }
    ```
  }

  pbr {
    keywords: ["pbr", "realistic", "gold", "copper", "custom"]
    example: ```
      object GoldSphere {
        position: [0, 1, 0]
        @material {
          type: pbr
          metallic: 0.9
          roughness: 0.1
          color: { r: 1.0, g: 0.84, b: 0.0 }
        }
      }
    ```
  }
}

// === PHYSICS ===
knowledge physics {
  dynamic {
    keywords: ["physics", "gravity", "mass", "bounce", "friction", "dynamic"]
    example: ```
      // Dynamic object (affected by forces)
      object Ball {
        geometry: 'sphere'
        physics: {
          type: 'dynamic'
          mass: 1
          friction: 0.5
          restitution: 0.8
        }
      }

      // Change gravity
      scene.physics.gravity = -9.81
    ```
  }

  gravity {
    keywords: ["gravity", "fall", "weight", "moon", "space", "zero-g"]
    example: ```
      // Normal Earth gravity
      scene.physics.gravity = -9.81

      // Moon gravity
      scene.physics.gravity = -1.62

      // Zero gravity
      scene.physics.gravity = 0
    ```
  }
}

// === QUICK REFERENCE ===
reference {
  geometries: ["cube", "sphere", "cylinder", "cone", "torus", "capsule", "plane", "model/path.glb"]

  colors: {
    named: ["red", "blue", "green", "cyan", "orange", "purple", "white", "black"]
    hex: "'#ff0000', '#4ECDC4'"
    rgb: "{ r: 1.0, g: 0.5, b: 0.0 }"
  }

  transforms: {
    position: "[x, y, z]"
    rotation: "[x, y, z] (degrees)"
    scale: "1.0 or [x, y, z]"
  }

  traits: ["@grabbable", "@throwable", "@pointable", "@hoverable", "@breakable", "@networked", "@collidable", "@scalable"]

  animation_properties: ["position.x/y/z", "rotation.x/y/z", "scale", "opacity", "color", "material.emission.intensity"]

  easing_functions: ["linear", "easeIn", "easeOut", "easeInOut", "easeInBack", "easeOutBack", "easeInOutBack"]

  events: ["onPoint", "onGrab", "onRelease", "onHoverEnter", "onHoverExit", "onTriggerEnter", "onTriggerExit", "onSwing"]

  physics_types: ["dynamic", "kinematic", "static"]
}
