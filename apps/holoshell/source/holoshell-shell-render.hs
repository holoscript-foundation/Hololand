// HoloShell Shell Render Slice
//
// A simple renderable .hs scene for the first HoloShell avatar and skin proof.
// The richer graph lives in holoshell-shell-world.holo and the behavior
// lives in holoshell-home.hsplus.

environment {
  skybox: "deep_machine_ocean"
  ambient_light: 0.45
}

light "WorldKeyLight" {
  type: "directional"
  color: "#dffcff"
  intensity: 1.0
  rotation: { x: -35, y: 24, z: 0 }
  cast_shadows: true
}

light "LiquidBacklight" {
  type: "point"
  color: "#0acfe8"
  intensity: 1.8
  position: { x: 0, y: 2.2, z: -3.4 }
}

object "LiquidDesktopPlane" {
  geometry: "plane"
  width: 12
  height: 7
  color: "#06131f"
  material: "glass"
  opacity: 0.72
  emissive: "#043d48"
  emissiveIntensity: 1.4
  position: { x: 0, y: 1.5, z: -4 }
  animate: "pulse"
  animSpeed: 0.35
}

object "BrittneyPresence" {
  geometry: "capsule"
  color: "#8fffe9"
  material: "hologram"
  opacity: 0.82
  glow: true
  emissive: "#15ffe1"
  emissiveIntensity: 1.7
  position: { x: -3.4, y: 1.75, z: -2.15 }
  scale: { x: 0.72, y: 1.2, z: 0.72 }
  animate: "float"
  animSpeed: 0.62
  avatarSource: "apps/holoshell/source/holoshell-brittney-avatar.hsplus"
  runtimePackage: "@holoscript/aibrittney"
  accessibilityRole: "button"
  keyboardShortcut: "Alt+B"
  lipSync: true
  emotionDirectives: true
}

object "BrittneyAvatarHead" {
  geometry: "sphere"
  color: "#eafff8"
  material: "glass"
  opacity: 0.9
  glow: true
  emissive: "#8fffe9"
  emissiveIntensity: 1.35
  position: { x: -3.4, y: 2.44, z: -2.08 }
  scale: { x: 0.38, y: 0.46, z: 0.3 }
  animate: "float"
  animSpeed: 0.68
}

object "BrittneyAvatarVoiceRing" {
  geometry: "torus"
  color: "#64f7ff"
  material: "neon"
  glow: true
  emissiveIntensity: 2.2
  position: { x: -3.4, y: 2.42, z: -2.08 }
  scale: { x: 0.72, y: 0.72, z: 0.72 }
  animate: "pulse"
  animSpeed: 0.5
}

object "BrittneyAvatarFocusHalo" {
  geometry: "torus"
  color: "#ffd66e"
  material: "glass"
  opacity: 0.48
  glow: true
  position: { x: -3.4, y: 1.82, z: -2.1 }
  scale: { x: 0.95, y: 0.95, z: 0.95 }
  animate: "spin"
  animSpeed: 0.22
}

object "OutcomeChatWindow" {
  geometry: "cube"
  width: 3.7
  height: 1.55
  depth: 0.08
  color: "#0c1724"
  material: "glass"
  opacity: 0.86
  emissive: "#0b9baa"
  emissiveIntensity: 0.8
  position: { x: -2.15, y: 0.45, z: -2.35 }
}

object "BrowserBubble" {
  geometry: "sphere"
  radius: 0.42
  color: "#36e5ff"
  material: "hologram"
  glow: true
  emissiveIntensity: 1.9
  position: { x: -2.8, y: 2.55, z: -2.45 }
  animate: "float"
  animSpeed: 0.42
}

object "FilesBubble" {
  geometry: "sphere"
  radius: 0.42
  color: "#79ffa8"
  material: "hologram"
  glow: true
  emissiveIntensity: 1.8
  position: { x: -1.55, y: 3.05, z: -2.3 }
  animate: "float"
  animSpeed: 0.5
}

object "AgentsBubble" {
  geometry: "sphere"
  radius: 0.45
  color: "#e7c66d"
  material: "hologram"
  glow: true
  emissiveIntensity: 1.6
  position: { x: 0, y: 3.2, z: -2.22 }
  animate: "float"
  animSpeed: 0.46
}

object "ProgramsBubble" {
  geometry: "sphere"
  radius: 0.42
  color: "#ff8870"
  material: "hologram"
  glow: true
  emissiveIntensity: 1.7
  position: { x: 1.55, y: 3.05, z: -2.3 }
  animate: "float"
  animSpeed: 0.54
}

object "CommandBubble" {
  geometry: "sphere"
  radius: 0.42
  color: "#f4f7ff"
  material: "hologram"
  glow: true
  emissiveIntensity: 1.35
  position: { x: 2.8, y: 2.55, z: -2.45 }
  animate: "float"
  animSpeed: 0.48
}

object "HoloLandBubble" {
  geometry: "sphere"
  radius: 0.6
  color: "#58ffc7"
  material: "glass"
  glow: true
  emissive: "#00d49b"
  emissiveIntensity: 2.1
  position: { x: 0, y: 1.55, z: -1.85 }
  animate: "pulse"
  animSpeed: 0.4
}

object "LiquidSkinPortal" {
  geometry: "torus"
  color: "#20def0"
  material: "neon"
  effect: "water_ripple_caustics_sim"
  glow: true
  position: { x: -1.8, y: -1.7, z: -2.1 }
  animate: "spin"
  animSpeed: 0.3
}

object "FireSkinPortal" {
  geometry: "torus"
  color: "#ff6f38"
  material: "neon"
  effect: "fire_embers_heat_haze_sim"
  glow: true
  position: { x: -0.6, y: -1.7, z: -2.1 }
  animate: "spin"
  animSpeed: 0.34
}

object "DeveloperSkinPortal" {
  geometry: "torus"
  color: "#c9ff7c"
  material: "neon"
  effect: "circuit_trace_data_pulse_sim"
  glow: true
  position: { x: 0.6, y: -1.7, z: -2.1 }
  animate: "spin"
  animSpeed: 0.38
}

object "AuraSkinPortal" {
  geometry: "torus"
  color: "#b893ff"
  material: "neon"
  effect: "aura_field_orbital_particle_sim"
  glow: true
  position: { x: 1.8, y: -1.7, z: -2.1 }
  animate: "spin"
  animSpeed: 0.32
}

object "ReceiptUnderlay" {
  geometry: "crystal"
  color: "#f7f3ce"
  material: "glass"
  opacity: 0.5
  glow: true
  position: { x: 3.25, y: -0.75, z: -3.15 }
  animate: "pulse"
  animSpeed: 0.28
}

post_processing {
  bloom: { enabled: true, intensity: 0.55, threshold: 0.72, radius: 0.65 }
  tone_mapping: { enabled: true, type: "aces", exposure: 1.05 }
}
