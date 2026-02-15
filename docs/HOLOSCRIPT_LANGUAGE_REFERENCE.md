# HoloScript Language Reference v2.0

> Official specification for training AI models on HoloScript syntax.

## 1. Root Structure

Every HoloScript file uses `composition` as the root:

```holo
composition "SceneName" {
  metadata { }
  environment { }
  state { }
  templates { }
  objects { }
  spatial_groups { }
  lights { }
  camera { }
  logic { }
  audio { }
  ui { }
}
```

## 2. Objects

```holo
object "myObject" {
  type: "mesh"
  mesh: "sphere" | "box" | "cylinder" | "plane" | "torus" | "pyramid"
  position: [x, y, z]
  rotation: [x, y, z]    // degrees
  scale: [x, y, z]
  radius: 0.5
  size: [w, h, d]
  color: "#hexcolor"
  material: {
    color: "#ffffff"
    metalness: 0.0-1.0
    roughness: 0.0-1.0
    emissive: "#hexcolor"
    emissive_intensity: 0.5
    opacity: 0.0-1.0
    transparent: true
  }

  // Traits
  @grabbable
  @throwable(force_multiplier: 2.0)
  @physics(mass: 1.0, bounce: 0.8)
}
```

## 3. Spatial Groups

Hierarchical containers with local coordinates:

```holo
spatial_group "MyGroup" at [0, 5, 0] {
  object "child1" { position: [1, 0, 0] }
  object "child2" { position: [-1, 0, 0] }
}
```

## 4. Templates (Inheritance)

```holo
template "InteractiveOrb" {
  @grabbable(snap_to_hand: true)
  @throwable
  @glowing

  state {
    grabbed: false
  }

  action onGrab() {
    self.grabbed = true
    play_sound("pickup")
  }
}

// Usage
object "redOrb" using "InteractiveOrb" {
  mesh: "sphere"
  color: "#ff0000"
}
```

## 5. State Management

```holo
state {
  score: 0
  health: 100
  isActive: true
  items: []
  player: null
}
```

### State Access
- `state.variableName` - global state
- `self.variableName` - object's own state

## 6. Operators

### Null Coalescing (SUPPORTED)
```holo
// Returns right side if left is null/undefined
let value = state.optional ?? "default"

// Assignment only if null/undefined
state.value ??= 42
```

### Ternary
```holo
color: state.active ? "#00ff00" : "#ff0000"
```

### String Interpolation
```holo
content: "Score: ${state.score}"
content: "Player ${player.name} has ${player.health} HP"
```

### Spread Operator
```holo
items: [...existingItems, newItem]
```

## 7. Logic Block

```holo
logic {
  on_scene_start {
    wait(2s)
    state.initialized = true
  }

  on_click("buttonName") {
    state.count += 1
  }

  on_grab("objectName") {
    play_sound("pickup")
  }

  on_collision("obj1", "obj2", force) {
    if force > 10 {
      emit_particles("impact", 20)
    }
  }
}
```

## 8. Lifecycle Hooks

```holo
on_mount { }           // Created
on_unmount { }         // Destroyed
on_update { }          // Every frame
on_grab { }            // User grabbed
on_release { }         // Released
on_hover_enter { }     // Pointer enters
on_hover_exit { }      // Pointer leaves
on_click { }           // Clicked
on_collision(other, force) { }
on_trigger_enter { }
on_trigger_exit { }
on_player_enter { }
on_player_exit { }
on_scene_start { }
on_first_grab { }
on_first_throw { }
```

## 9. Actions (Methods)

```holo
action myMethod(param1, param2) {
  // Implementation
  play_sound("effect")
  emit_particles("sparkle", 10)
  animate(self) { property: "position.y", to: 5, duration: 1000 }
}
```

### Built-in Actions
```holo
play_sound(name, options)
emit_particles(type, count)
animate(target) { property, from, to, duration, easing }
wait(time)
spawn(template, config)
emit(event, data)
show_toast(message)
show_tooltip(element, text)
unlock_achievement(id)
```

## 10. Traits (@directives)

### VR Interaction
```holo
@grabbable(snap_to_hand: true)
@throwable(force_multiplier: 2.0)
@hoverable
@clickable
@pointable
@scalable
@rotatable
@stackable
@breakable(threshold: 10, fragments: 5)
```

### Physics
```holo
@physics(mass: 1.0, bounce: 0.8, friction: 0.5, static: false)
@rigidbody
@gravity_modifier(strength: 0.5)
@collidable
@buoyancy
```

### Visual
```holo
@animated(idle: "bounce", loop: true)
@glowing
@billboard
@rotating(speed: 1.0)
@particle
@trail
@lod
```

### Audio
```holo
@spatial_audio
@voice
@reactive_audio
```

### Networking
```holo
@networked
@ai_driven
@llm_agent
```

### Accessibility
```holo
@accessible
@alt_text("Description")
@haptic_cue
```

## 11. Animation

```holo
animation "bounce" {
  target: "objectName"
  property: "position.y"
  from: 0
  to: 2
  duration: 1000
  easing: "ease-in-out"
  loop: true
  yoyo: true
}
```

### Timeline
```holo
timeline "intro" {
  autoplay: true

  at 0ms { animate "title" { opacity: 0, to: 1, duration: 500 } }
  at 500ms { play_sound("whoosh") }
  at 1000ms { emit("intro_complete") }
}
```

## 12. Environment

```holo
environment {
  sky: "gradient"
  sky_top: "#87CEEB"
  sky_bottom: "#1a1a2e"
  ambient_light: 0.5
  fog: {
    color: "#ffffff"
    near: 10
    far: 100
  }
}
```

## 13. Lights

```holo
light "sun" {
  type: "directional"
  position: [50, 100, 50]
  color: "#FFD54F"
  intensity: 1.5
  cast_shadow: true
}

light "ambient" {
  type: "hemisphere"
  sky_color: "#87CEEB"
  ground_color: "#7CB342"
  intensity: 0.5
}
```

## 14. UI Panels

```holo
ui_panel "hud" {
  position: [0, 2, -3]
  facing: "camera"

  text "score" {
    content: "Score: ${state.score}"
    font_size: 24
    color: "#ffffff"
  }

  button "startBtn" {
    label: "Start Game"
    on_click: { emit("game_start") }
  }

  slider "volume" {
    label: "Volume"
    min: 0
    max: 100
    default: 50
    on_change(val): { state.volume = val }
  }
}
```

## 15. Conditionals

```holo
conditional {
  if state.health > 75 {
    color: "#00ff00"
  } else if state.health > 25 {
    color: "#ffff00"
  } else {
    color: "#ff0000"
  }
}
```

## 16. Iteration

```holo
for_each {
  source: state.items
  item: "item"

  object "${item.id}" {
    position: item.position
    color: item.color
  }
}
```

## 17. NPCs (Brittney AI)

```holo
npc "guide" {
  model: "humanoid"
  position: [0, 0, 5]

  @ai_driven
  @dialogue

  dialogues: [
    "Welcome to the world!",
    "Need help with anything?"
  ]

  on_interact(player) {
    show_dialogue("greeting")
  }
}
```

## 18. State Machines

```holo
state_machine "enemy_ai" {
  initial: "idle"

  state "idle" {
    on_entry { play_animation("idle") }
    transition "patrol" when state.playerNearby == false
    transition "chase" when state.playerNearby == true
  }

  state "patrol" {
    on_entry { start_patrol() }
    transition "chase" when state.playerDetected
  }

  state "chase" {
    on_entry { play_animation("run") }
    on_exit { stop_movement() }
  }
}
```

## 19. Complete Example

```holo
composition "Mediterranean Plaza" {
  metadata {
    title: "Sunny Plaza"
    author: "Hololand"
    version: "1.0.0"
  }

  environment {
    sky: "gradient"
    sky_top: "#87CEEB"
    sky_bottom: "#5DADE2"
    ambient_light: 0.6
  }

  state {
    visitors: 0
    fountainActive: true
  }

  template "ClickableOrb" {
    @grabbable
    @throwable(force_multiplier: 1.5)
    @glowing
    @physics(mass: 0.5, bounce: 0.9)

    on_grab {
      play_sound("pickup")
      state.visitors += 1
    }
  }

  spatial_group "Plaza" at [0, 0, 0] {
    object "ground" {
      mesh: "plane"
      size: [50, 50]
      material: { color: "#7CB342", roughness: 0.9 }
    }

    object "fountain" {
      type: "model"
      src: "fountain.glb"
      position: [0, 0, 0]
      scale: [2, 2, 2]

      @animated(idle: "water_flow", loop: true)
    }

    object "orb" using "ClickableOrb" {
      mesh: "sphere"
      radius: 0.3
      position: [3, 1, 0]
      material: {
        color: "#FFD54F"
        emissive: "#FFD54F"
        emissive_intensity: 0.3
      }
    }
  }

  light "sun" {
    type: "directional"
    position: [50, 80, 30]
    color: "#FFD54F"
    intensity: 1.5
    cast_shadow: true
  }

  ui_panel "info" {
    position: [0, 3, -5]
    facing: "camera"

    text "counter" {
      content: "Visitors: ${state.visitors}"
      font_size: 20
      color: "#3D2914"
    }
  }

  logic {
    on_scene_start {
      wait(1s)
      show_toast("Welcome to the Plaza!")

      // Null coalescing example
      state.visitors ??= 0
    }

    on_player_enter("plaza_zone") {
      state.visitors += 1
    }
  }
}
```

---

## Key Syntax Notes

1. **Null Coalescing IS supported**: `??` and `??=`
2. **Time values**: Use `1000` (ms) or `1s` (seconds)
3. **Colors**: Hex `"#ff0000"` or named in themes
4. **Positions**: Always `[x, y, z]` arrays
5. **Rotations**: In degrees, not radians
6. **Templates**: Use `using "TemplateName"` for inheritance
7. **State access**: `state.var` (global) or `self.var` (local)
8. **String interpolation**: `${expression}` inside strings
