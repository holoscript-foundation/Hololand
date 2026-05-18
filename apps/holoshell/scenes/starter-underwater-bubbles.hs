// HoloShell Bubble Field Trait
//
// Reusable trait for the underwater starter scene's bubble system.
// Drives count, size, rise speed, iridescence, interaction, and spatial audio
// from a single density_mode binding.
//
// density_mode: calm (8-12 bubbles) | cluttered (20-30) | urgent (35+, some merging)
//
// Used by: apps/holoshell/scenes/starter-underwater.holo → BubbleField spatial_group

trait BubbleField {
  // ─── Core parameters ───────────────────────────────────────
  count_range: {
    calm: [8, 12]
    cluttered: [20, 30]
    urgent: [35, 45]
  }
  size: {
    min: 0.05
    max: 0.25
    distribution: "log_uniform"    // more small, fewer large — natural
  }
  rise_speed: {
    min: 0.3
    max: 0.8
    variance_per_bubble: true       // each bubble gets its own constant speed
  }
  rise_path: "perlin_drift"         // gentle lateral drift as bubbles rise; not straight
  rise_path_amplitude: 0.06         // max lateral deviation per unit rise

  // ─── Material ──────────────────────────────────────────────
  iridescent: true
  material: "thin_film"
  thin_film_ior: 1.33               // water
  thin_film_thickness_range: [320, 480]   // nm — produces rainbow sheen variation
  base_opacity: 0.68
  emissive_base: "#88ccff"
  emissive_intensity_base: 0.22
  roughness: 0.04

  // ─── Hover response ────────────────────────────────────────
  hover_scale_delta: 0.22           // 22% enlarge on gaze/cursor proximity
  hover_emissive_boost: 0.38
  hover_transition_duration: 0.18

  // ─── Interaction ───────────────────────────────────────────
  pop_on_touch: true
  pop_on_click: true
  pop_particle_burst: {
    effect: "bubble_pop_particles"
    count: 18
    color: "#88ccff"
    size: 0.04
    lifetime: 0.8
    spread_radius: 0.22
  }
  respawn_delay: 2.0                // seconds before a popped bubble respawns at floor
  respawn_origin: "rise_origin"     // respawns from the floor position, not current pos

  // ─── Audio ─────────────────────────────────────────────────
  spatial_audio: true
  pop_sound: "bubble_pop_soft"
  pop_sound_volume: 0.65
  pop_sound_pitch_random: [0.88, 1.14]  // slight pitch variation per pop

  // ─── Density mode ──────────────────────────────────────────
  density_mode: "calm"              // calm | cluttered | urgent — set by worldState binding

  // ─── Urgent mode extras ────────────────────────────────────
  // When density_mode == urgent: large bubbles near each other may merge visually
  merging: {
    enabled_when: "urgent"
    merge_distance_threshold: 0.18  // bubbles closer than this merge into one larger
    merge_size_factor: 1.35         // merged bubble is 35% larger than largest constituent
    merge_emissive_boost: 0.25
    unmerge_on_touch: true          // touching a merged bubble splits it back
  }

  // ─── Scene distribution ────────────────────────────────────
  spawn_volume: {
    x_range: [-4.5, 4.5]
    y_range: [-3.0, -2.6]          // rise origins at or just above the floor
    z_range: [-4.0, 3.5]
  }
  rise_ceiling: 5.0                 // bubbles despawn and respawn when they reach this Y

  // ─── Performance ───────────────────────────────────────────
  lod: {
    near_distance: 4               // full iridescent shader
    far_distance: 12               // simplified emissive-only sphere
    cull_distance: 22
  }
}
