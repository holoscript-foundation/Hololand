/**
 * uAA2++ Wisdom Injector for BYOK Inference
 *
 * Injects compressed HoloScript+ knowledge (W/P/G format) into system prompts
 * for non-fine-tuned models. This gives BYOK users "hyper mode" — any model
 * immediately generates correct HoloScript+ syntax instead of inventing its own.
 *
 * Proven effective: Grok-3-mini went from C#/Unity OOP → correct HoloScript+
 * declarative syntax with a single W/P/G injection.
 */

import type { InferenceRequest, ProviderType } from './types.js';

// =============================================================================
// Types
// =============================================================================

export type WisdomInjectionLevel = 'off' | 'basic' | 'full';

export interface WisdomInjectionConfig {
  /** Injection level: off (disabled), basic (~300 tokens), full (~800 tokens) */
  level: WisdomInjectionLevel;
  /** Skip injection when using local Brittney models (already fine-tuned) */
  skipForLocalBrittney: boolean;
  /** Skip injection for OpenAI fine-tuned models (ft:...) */
  skipForFineTunedModels: boolean;
  /** Optional custom preamble prepended to the wisdom payload */
  customPreamble?: string;
}

export const DEFAULT_WISDOM_CONFIG: WisdomInjectionConfig = {
  level: 'full',
  skipForLocalBrittney: true,
  skipForFineTunedModels: true,
};

// =============================================================================
// W/P/G Payloads (derived from TrainingMonkey canonical constants)
// =============================================================================

// ~300 tokens — Quick syntax reference + critical gotchas
const WISDOM_BASIC = `[HoloScript+ Quick Reference]
W.001: HoloScript+ is declarative. Objects use: object "Name" @trait { geometry: "type", position: [x,y,z] }
W.002: Names MUST be quoted strings. Wrong: object MyObj — Right: object "MyObj"
W.003: Use geometry: key (NOT type:). Valid: cube|sphere|cylinder|cone|torus|plane|text|model|sparkles|particles
W.004: Traits go on declaration line with @ prefix: object "Ball" @grabbable @physics { }
W.005: Objects need negative z to be visible: position: [0, 1, -2]

P.001: composition "Name" { } wraps entire scenes
P.002: spatial_group "Name" { } groups related objects
P.003: template "Name" { } defines reusable patterns; use via: object "X" using "Template" { }

G.001: NEVER use type: for geometry — use geometry: "sphere"
G.002: NEVER write OOP (class, function, new, this) — HoloScript is declarative, not imperative
G.003: NEVER generate C#/Unity/Unreal/JavaScript code — output HoloScript+ syntax only`;

// ~800 tokens — Full W/P/G format with comprehensive coverage
const WISDOM_FULL = `[HoloScript+ Compressed Wisdom — uAA2++ W/P/G Format]

=== WISDOM (Core Rules) ===
W.001: HoloScript+ is a FULL PROGRAMMING LANGUAGE (not a DSL). Declarative syntax for spatial computing.
W.002: Object syntax: object "Name" @trait1 @trait2 { geometry: "type", position: [x,y,z], scale: [1,1,1], material: "name" }
W.003: Names MUST be quoted strings. ALWAYS: object "Ball" NEVER: object Ball
W.004: geometry: key (NOT type:). Valid: cube|sphere|cylinder|cone|torus|plane|text|model|sparkles|particles
W.005: Objects need negative z to be visible to camera. Default camera faces -z.
W.006: material: accepts named materials: plastic|metal|chrome|gold|glass|crystal|wood|fabric|rubber|water|emissive|hologram|stone|marble|neon|toon|wireframe
W.007: Traits use @ prefix on declaration line. 1535 valid traits exist. Common: @grabbable @physics @collidable @glowing @interactive @networked @animated @floating @clickable @spinning @orbit @particle_emitter @emissive
W.008: File types: .hs (full declarative), .hsplus (production VR/AR with orb/state), .holo (scene composition wrapper)
W.009: Compiles to 15+ targets: Unity, Unreal, Godot, VRChat, Babylon, WebGPU, visionOS, AndroidXR

=== PATTERNS (Structure) ===
P.001: Scene structure: composition "Name" { environment { } object "X" { } spatial_group "G" { object "Y" { } } }
P.002: Grouping: spatial_group "Name" { } for organizing related objects. Use for rooms, orbital systems, UI panels.
P.003: Templates: template "Base" { geometry: "cube" } then object "Instance" using "Base" { position: [1,0,0] }
P.004: Events: on_interact { play_sound("click") } | on_collision { apply_force([0,5,0]) } | every(2s) { rotate([0,45,0]) }
P.005: State machines: state "idle" { on_interact { transition("active") } } state "active" { every(1s) { rotate([0,90,0]) } }
P.006: Spawn/despawn: spawn "Template" at [x,y,z] | despawn "Name" after 5s
P.007: Environment: environment { skybox: "sunset", ambient_light: 0.4, fog: { color: "#cccccc", density: 0.01 }, physics: { gravity: [0,-9.81,0] } }

=== GOTCHAS (Avoid These) ===
G.001: NEVER use type: for geometry — ALWAYS geometry: "sphere"
G.002: NEVER write OOP (class, function, new, this) — HoloScript is declarative, not imperative
G.003: NEVER generate C#/Unity/Unreal/JavaScript code — output HoloScript+ syntax only
G.004: NEVER use camelCase traits — use snake_case: @spatial_audio NOT @spatialAudio
G.005: NEVER use unquoted object names — "Name" not Name
G.006: Common hallucinated traits to avoid: @interactable(use @clickable or @grabbable) @touchable(use @hoverable) @movable(use @draggable)
G.007: Position all objects explicitly. Multiple objects at [0,0,0] = invisible overlap. Spread them out with unique positions.
G.008: Materials go as property, not trait: material: "glass" NOT @glass`;

// =============================================================================
// Injection Logic
// =============================================================================

/**
 * Inject uAA2++ compressed wisdom into an inference request for BYOK users.
 *
 * Skip conditions:
 * - level is 'off'
 * - Local provider with Brittney model (already fine-tuned)
 * - OpenAI fine-tuned model (ft:...)
 * - InfinityAssistant provider (local Ollama proxy)
 *
 * When an existing system message already contains HoloScript knowledge,
 * downgrades to 'basic' to avoid redundancy.
 */
export function injectWisdom(
  request: InferenceRequest,
  providerType: ProviderType,
  model: string | undefined,
  config: WisdomInjectionConfig = DEFAULT_WISDOM_CONFIG,
): InferenceRequest {
  // Skip: injection disabled
  if (config.level === 'off') return request;

  const modelName = (model || '').toLowerCase();

  // Skip: local Brittney models are already fine-tuned
  if (config.skipForLocalBrittney && providerType === 'local') {
    if (modelName.includes('brittney')) return request;
  }

  // Skip: OpenAI fine-tuned Brittney models
  if (config.skipForFineTunedModels && modelName.startsWith('ft:')) {
    return request;
  }

  // Skip: InfinityAssistant runs local Ollama behind the scenes
  if (providerType === 'infinityassistant') return request;

  // Determine effective level
  let effectiveLevel = config.level;

  // Downgrade if existing system prompt already has HoloScript knowledge
  const existingSystem = request.messages.find((m) => m.role === 'system');
  if (
    existingSystem &&
    existingSystem.content.includes('HoloScript') &&
    existingSystem.content.includes('geometry')
  ) {
    effectiveLevel = 'basic';
  }

  // Select payload
  let payload = effectiveLevel === 'basic' ? WISDOM_BASIC : WISDOM_FULL;

  if (config.customPreamble) {
    payload = config.customPreamble + '\n\n' + payload;
  }

  // Inject into messages (immutable — does not mutate original request)
  const newMessages = [...request.messages];
  const systemIndex = newMessages.findIndex((m) => m.role === 'system');

  if (systemIndex >= 0) {
    // Prepend to existing system message
    newMessages[systemIndex] = {
      ...newMessages[systemIndex],
      content: payload + '\n\n---\n\n' + newMessages[systemIndex].content,
    };
  } else {
    // Insert new system message at beginning
    newMessages.unshift({ role: 'system', content: payload });
  }

  return { ...request, messages: newMessages };
}
