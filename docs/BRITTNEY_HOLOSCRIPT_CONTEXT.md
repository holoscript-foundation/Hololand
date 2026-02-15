# Brittney HoloScript Context

Use this as system prompt context for Brittney AI when generating HoloScript.

---

## HoloScript Quick Reference

### Root Structure
```holo
composition "Name" {
  environment { sky: "gradient", sky_top: "#87CEEB", ambient_light: 0.5 }
  state { score: 0, active: true }
  objects { }
  spatial_groups { }
  lights { }
  logic { }
}
```

### Objects
```holo
object "name" {
  mesh: "sphere" | "box" | "cylinder" | "plane" | "torus"
  position: [x, y, z]
  rotation: [x, y, z]  // degrees
  scale: [x, y, z]
  radius: 0.5
  color: "#hexcolor"
  material: { color: "#fff", roughness: 0.5, metalness: 0.0 }
  @grabbable @throwable @physics(mass: 1.0)
}
```

### Spatial Groups
```holo
spatial_group "GroupName" at [0, 5, 0] {
  object "child" { position: [1, 0, 0] }
}
```

### Templates
```holo
template "Orb" {
  @grabbable @glowing
  on_grab { play_sound("pickup") }
}
object "myOrb" using "Orb" { mesh: "sphere", color: "#ff0000" }
```

### State
```holo
state { count: 0, name: "test", items: [], active: true }
```

### Operators (ALL SUPPORTED)
```holo
// Null coalescing - SUPPORTED
value ?? "default"     // returns right if left is null/undefined
state.x ??= 42         // assigns only if null/undefined

// Ternary
color: active ? "#0f0" : "#f00"

// String interpolation
content: "Score: ${state.score}"

// Spread
items: [...old, new]
```

### Logic Block
```holo
logic {
  on_scene_start { wait(1s); state.ready = true }
  on_click("btn") { state.count += 1 }
  on_grab("obj") { play_sound("grab") }
  on_collision("a", "b", force) { emit_particles("spark", 10) }
}
```

### Lifecycle Hooks
- `on_mount`, `on_unmount`, `on_update`
- `on_grab`, `on_release`, `on_throw`
- `on_hover_enter`, `on_hover_exit`
- `on_click`, `on_collision(other, force)`
- `on_player_enter`, `on_player_exit`
- `on_scene_start`, `on_first_grab`

### Traits
```holo
// VR Interaction
@grabbable(snap_to_hand: true)
@throwable(force_multiplier: 2.0)
@hoverable @clickable @scalable @rotatable

// Physics
@physics(mass: 1.0, bounce: 0.8, friction: 0.5)
@rigidbody @collidable @buoyancy

// Visual
@glowing @billboard @rotating(speed: 1.0)
@animated(idle: "bounce", loop: true)

// Audio
@spatial_audio @voice

// AI
@ai_driven @networked
```

### Lights
```holo
light "sun" { type: "directional", position: [50,80,30], color: "#FFD54F", intensity: 1.5, cast_shadow: true }
light "amb" { type: "hemisphere", sky_color: "#87CEEB", ground_color: "#7CB342", intensity: 0.5 }
```

### Animation
```holo
animation "bounce" {
  target: "obj", property: "position.y"
  from: 0, to: 2, duration: 1000
  easing: "ease-in-out", loop: true
}
```

### UI
```holo
ui_panel "hud" {
  position: [0, 2, -3], facing: "camera"
  text "score" { content: "Score: ${state.score}", font_size: 24 }
  button "start" { label: "Play", on_click: { emit("start") } }
}
```

### Built-in Actions
- `play_sound(name)`, `emit_particles(type, count)`
- `animate(target) { ... }`, `wait(time)`
- `spawn(template, config)`, `emit(event, data)`
- `show_toast(msg)`, `show_tooltip(el, text)`

---

## Common Patterns

### Interactive Object
```holo
object "ball" {
  mesh: "sphere"
  radius: 0.3
  position: [0, 1, 0]
  material: { color: "#ff4444", roughness: 0.3 }
  @grabbable @throwable @physics(mass: 0.5, bounce: 0.9)
  on_grab { play_sound("pickup") }
  on_throw { emit_particles("trail", 5) }
}
```

### Glowing Orb
```holo
object "orb" {
  mesh: "sphere"
  radius: 0.2
  material: { color: "#FFD54F", emissive: "#FFD54F", emissive_intensity: 0.5 }
  @glowing @hoverable
}
```

### Building
```holo
spatial_group "Building" at [0, 0, 0] {
  object "walls" { mesh: "box", size: [4, 3, 4], color: "#FFF8E7" }
  object "roof" { mesh: "pyramid", position: [0, 2.5, 0], size: [5, 1.5, 5], color: "#D2691E" }
}
```

### Counter UI
```holo
ui_panel "counter" {
  position: [0, 2, -2], facing: "camera"
  text "display" { content: "Count: ${state.count}", font_size: 18, color: "#333" }
  button "add" { label: "+1", on_click: { state.count += 1 } }
}
```

---

## IMPORTANT CORRECTIONS

1. **`??=` IS VALID** - Null coalescing assignment exists in HoloScript
2. **`??` IS VALID** - Null coalescing operator exists
3. **Use `composition`** not `scene` or `world` as root
4. **Rotations are in degrees**, not radians
5. **Time can be `1000` (ms) or `1s`**
6. **Templates use `using`**, not `extends`
7. **State access**: `state.var` (global), `self.var` (local)
