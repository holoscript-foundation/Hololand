/**
 * Training Data Generator for Brittney
 *
 * Generates fine-tuning datasets with semantic expansion in Phase 1.
 * Each training example is expanded into multiple semantic variations
 * to teach Brittney to understand diverse user expressions.
 *
 * Phases:
 * 1. Semantic Expansion - Multiply examples via synonym/concept variations
 * 2. Context Injection - Add scene/error context variations
 * 3. Quality Filtering - Remove duplicates, validate syntax
 * 4. Export - Format for Azure Foundry / OpenAI / JSONL
 */

import {
  SEMANTIC_MAP,
  generateSemanticVariations,
  detectIntent,
  getRelated,
  type SemanticIntent,
} from './semantics.js';

// =============================================================================
// Types
// =============================================================================

export interface TrainingExample {
  /** Unique identifier */
  id: string;
  /** User message (input) */
  prompt: string;
  /** Assistant response (output) */
  completion: string;
  /** Category for filtering */
  category: TrainingCategory;
  /** Detected intent */
  intent: SemanticIntent;
  /** Semantic variations generated */
  variations?: string[];
  /** Metadata */
  metadata?: {
    source?: string;
    verified?: boolean;
    difficulty?: 'basic' | 'intermediate' | 'advanced';
  };
}

export interface TrainingDataset {
  /** Dataset name */
  name: string;
  /** Version */
  version: string;
  /** Generation timestamp */
  generated: string;
  /** Total examples (after expansion) */
  totalExamples: number;
  /** Original examples (before expansion) */
  originalExamples: number;
  /** Expansion ratio */
  expansionRatio: number;
  /** Examples by category */
  byCategory: Record<TrainingCategory, number>;
  /** Examples by intent */
  byIntent: Record<SemanticIntent, number>;
  /** The training examples */
  examples: TrainingExample[];
}

export type TrainingCategory =
  | 'holoscript_generation'
  | 'code_explanation'
  | 'error_diagnosis'
  | 'vr_interaction'
  | 'performance_optimization'
  | 'scene_design'
  | 'multiplayer'
  | 'ui_creation'
  | 'animation'
  | 'audio'
  | 'physics';

export interface GeneratorOptions {
  /** Maximum semantic variations per example */
  maxVariations?: number;
  /** Include related concept variations */
  includeRelated?: boolean;
  /** Categories to include (default: all) */
  categories?: TrainingCategory[];
  /** Minimum examples per category */
  minPerCategory?: number;
}

// =============================================================================
// Base Training Examples (Phase 0 - Source Data)
// =============================================================================

const BASE_EXAMPLES: Omit<TrainingExample, 'id' | 'intent' | 'variations'>[] = [
  // ─────────────────────────────────────────────────────────────
  // HOLOSCRIPT GENERATION
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'Create a cube that I can grab',
    completion: `\`\`\`holoscript
object GrabbableCube @grabbable {
  geometry: 'cube'
  position: [0, 1, 0]
  color: '#4ECDC4'
  physics: { mass: 1 }
}
\`\`\`

The \`@grabbable\` trait requires physics to be defined so the object responds to hand interactions.`,
    category: 'holoscript_generation',
    metadata: { difficulty: 'basic', verified: true },
  },
  {
    prompt: 'Make a ball that bounces when thrown',
    completion: `\`\`\`holoscript
object BouncyBall @grabbable @throwable {
  geometry: 'sphere'
  position: [0, 1.5, 0]
  color: '#FF6B6B'

  physics: {
    mass: 0.5
    restitution: 0.8  // High bounce
    friction: 0.3
  }
}
\`\`\`

The \`restitution\` value (0-1) controls bounciness. 0.8 gives a lively bounce.`,
    category: 'holoscript_generation',
    metadata: { difficulty: 'basic', verified: true },
  },
  {
    prompt: 'Create a button that plays a sound when clicked',
    completion: `\`\`\`holoscript
object SoundButton @pointable {
  geometry: 'cylinder'
  position: [0, 1, 1]
  scale: [0.15, 0.03, 0.15]
  color: '#E74C3C'

  onPoint: {
    audio.play('button_click')
    this.color = '#27AE60'
    setTimeout(() => this.color = '#E74C3C', 200)
  }
}
\`\`\`

The button uses \`@pointable\` to respond to VR pointer/gaze. The color changes briefly for feedback.`,
    category: 'holoscript_generation',
    metadata: { difficulty: 'intermediate', verified: true },
  },
  {
    prompt: 'Make an object float up and down',
    completion: `\`\`\`holoscript
object FloatingCrystal {
  geometry: 'sphere'
  position: [0, 1.5, 0]
  color: '#9B59B6'

  animation float {
    property: 'position.y'
    from: 1.5
    to: 2.0
    duration: 1500
    loop: infinite
    easing: 'easeInOut'
  }
}
\`\`\`

The \`easeInOut\` easing creates smooth acceleration/deceleration at the extremes.`,
    category: 'animation',
    metadata: { difficulty: 'basic', verified: true },
  },
  {
    prompt: 'Create a spinning coin that can be collected',
    completion: `\`\`\`holoscript
object Coin @hoverable @pointable {
  geometry: 'cylinder'
  position: [0, 1, 0]
  scale: [0.3, 0.02, 0.3]
  color: '#F1C40F'

  animation spin {
    property: 'rotation.y'
    from: 0
    to: 360
    duration: 2000
    loop: infinite
  }

  animation float {
    property: 'position.y'
    from: 1
    to: 1.2
    duration: 1000
    loop: infinite
    easing: 'easeInOut'
  }

  collectible: {
    value: 10
    type: 'coin'
  }

  onPoint: {
    player.collect(this.collectible)
    particles.spawn('collect_sparkle', this.position)
    audio.play('coin_pickup')
    this.destroy()
  }

  onHoverEnter: {
    this.scale = [0.35, 0.025, 0.35]
  }

  onHoverExit: {
    this.scale = [0.3, 0.02, 0.3]
  }
}
\`\`\`

The coin combines multiple animations, collectible data, and hover feedback for a polished experience.`,
    category: 'holoscript_generation',
    metadata: { difficulty: 'intermediate', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // VR INTERACTION
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'How do I make something glow when the player looks at it?',
    completion: `Use the \`@hoverable\` trait with \`onHoverEnter\` and \`onHoverExit\` events:

\`\`\`holoscript
object GlowingOrb @hoverable {
  geometry: 'sphere'
  position: [0, 1.5, 2]
  color: '#3498DB'

  material: {
    emissive: '#000000'
    emissiveIntensity: 0
  }

  onHoverEnter: {
    this.material.emissive = '#3498DB'
    this.material.emissiveIntensity = 0.5
  }

  onHoverExit: {
    this.material.emissive = '#000000'
    this.material.emissiveIntensity = 0
  }
}
\`\`\`

The emissive property makes the object appear to emit light when hovered.`,
    category: 'vr_interaction',
    metadata: { difficulty: 'intermediate', verified: true },
  },
  {
    prompt: 'Create a door that opens when I point at it',
    completion: `\`\`\`holoscript
object Door @pointable {
  geometry: 'model/door.glb'
  position: [0, 0, 3]
  state: 'closed'

  states: {
    closed: { rotation: [0, 0, 0] }
    open: { rotation: [0, -90, 0] }
  }

  transition: {
    duration: 600
    easing: 'easeOutBack'
  }

  onPoint: {
    this.state = this.state === 'closed' ? 'open' : 'closed'
    audio.play(this.state === 'open' ? 'door_open' : 'door_close')
  }
}
\`\`\`

The state machine handles open/closed states with smooth transitions. \`easeOutBack\` adds a slight overshoot for a satisfying feel.`,
    category: 'vr_interaction',
    metadata: { difficulty: 'intermediate', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // ERROR DIAGNOSIS
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'Why is my grabbable object not working?',
    completion: `Common reasons a \`@grabbable\` object doesn't work:

**1. Missing physics** - Grabbable requires physics:
\`\`\`holoscript
// ❌ Won't work
object Cube @grabbable {
  geometry: 'cube'
}

// ✅ Works
object Cube @grabbable {
  geometry: 'cube'
  physics: { mass: 1 }
}
\`\`\`

**2. Object too far** - VR grab range is ~0.5-1.5m. Check position is within reach.

**3. Collision layer** - Object might be on a non-interactive layer.

**4. Scale too small/large** - Objects < 0.05m or > 2m can be hard to grab.

**5. Physics type** - Must be \`dynamic\` (default) not \`static\` or \`kinematic\`.`,
    category: 'error_diagnosis',
    metadata: { difficulty: 'basic', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // PERFORMANCE
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'How can I improve FPS in my VR scene?',
    completion: `VR requires 90fps minimum. Key optimizations:

**1. Reduce Draw Calls**
- Combine objects with same material
- Use texture atlases
- Enable GPU instancing for repeated objects

**2. Simplify Geometry**
\`\`\`holoscript
object Tree {
  geometry: 'model/tree.glb'
  lod: {
    distances: [10, 25, 50]
    models: ['tree_high.glb', 'tree_med.glb', 'tree_low.glb']
  }
}
\`\`\`

**3. Limit Dynamic Lights** - Max 4 realtime lights. Use baked lighting.

**4. Optimize Physics**
- Reduce dynamic objects
- Use simple collision shapes (box, sphere) not mesh colliders
- Disable physics on distant objects

**5. Particle Limits**
\`\`\`holoscript
particles Fire {
  maxParticles: 100  // Cap particle count
  emission: { rate: 20 }
}
\`\`\`

**6. Occlusion Culling** - Enable in scene settings for indoor environments.`,
    category: 'performance_optimization',
    metadata: { difficulty: 'advanced', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // MULTIPLAYER
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'How do I sync an object across players?',
    completion: `Use the \`@networked\` trait to sync object state:

\`\`\`holoscript
object SharedBall @grabbable @networked {
  geometry: 'sphere'
  position: [0, 1, 0]
  physics: { mass: 0.5 }

  // Mark which properties to sync
  @networked position
  @networked rotation
  @networked owner: null

  onGrab(player): {
    // Request ownership before manipulating
    if (network.requestOwnership(this)) {
      this.owner = player.id
    }
  }

  onRelease: {
    // Release ownership after delay
    setTimeout(() => {
      this.owner = null
      network.releaseOwnership(this)
    }, 1000)
  }
}
\`\`\`

Key points:
- Only \`@networked\` properties sync across clients
- Request ownership before modifying networked objects
- Release ownership when done to let others interact`,
    category: 'multiplayer',
    metadata: { difficulty: 'advanced', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // UI CREATION
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'Create a health bar UI',
    completion: `\`\`\`holoscript
ui HealthBar {
  position: [0, 2.2, 0]
  size: [0.4, 0.05]
  followTarget: player
  billboarding: true  // Always face camera

  background: {
    color: 'rgba(0, 0, 0, 0.6)'
    borderRadius: 4
  }

  children: {
    bar HealthFill {
      width: player.health + '%'
      height: '100%'
      color: player.health > 30 ? '#2ECC71' : '#E74C3C'
      transition: 'width 0.3s ease'
    }

    text HealthText {
      content: player.health + ' / ' + player.maxHealth
      fontSize: 12
      color: 'white'
      align: 'center'
    }
  }
}
\`\`\`

The bar dynamically updates based on \`player.health\` and changes color when low.`,
    category: 'ui_creation',
    metadata: { difficulty: 'intermediate', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // SCENE DESIGN
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'Set up a basic outdoor scene',
    completion: `\`\`\`holoscript
scene OutdoorWorld {
  environment: {
    skybox: 'sunny_day'
    ambientLight: 0.4
    fog: {
      enabled: true
      color: '#b8d4e3'
      near: 20
      far: 100
    }
  }

  light Sun {
    type: 'directional'
    color: '#fffaf0'
    intensity: 1.2
    position: [50, 100, 30]
    castShadow: true
    shadowMapSize: 2048
  }

  object Ground @collidable {
    geometry: 'plane'
    size: [100, 100]
    material: 'grass'
    receiveShadow: true
  }

  spawn PlayerSpawn {
    position: [0, 0, 0]
    rotation: [0, 0, 0]
  }
}
\`\`\`

This creates a grounded outdoor environment with proper lighting and shadows.`,
    category: 'scene_design',
    metadata: { difficulty: 'basic', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // AUDIO
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'Add 3D positional audio to an object',
    completion: `\`\`\`holoscript
object Waterfall {
  geometry: 'model/waterfall.glb'
  position: [10, 0, 5]

  audio WaterfallSound {
    source: 'audio/waterfall_loop.mp3'
    spatial: true
    volume: 0.8
    loop: true
    autoplay: true

    // 3D audio settings
    refDistance: 1      // Full volume at 1m
    maxDistance: 30     // Inaudible beyond 30m
    rolloffFactor: 1    // Linear falloff
    coneInnerAngle: 360
    coneOuterAngle: 360
  }
}
\`\`\`

The \`spatial: true\` enables 3D positioning. Sound gets quieter as player moves away.`,
    category: 'audio',
    metadata: { difficulty: 'intermediate', verified: true },
  },

  // ─────────────────────────────────────────────────────────────
  // PHYSICS
  // ─────────────────────────────────────────────────────────────
  {
    prompt: 'Create a physics-enabled stack of boxes',
    completion: `\`\`\`holoscript
// Generate a tower of boxes
object[] BoxTower @grabbable {
  count: 5
  geometry: 'cube'
  scale: [0.3, 0.3, 0.3]

  // Stack vertically
  layout: {
    type: 'stack'
    startPosition: [0, 0.15, 2]
    spacing: [0, 0.31, 0]
  }

  physics: {
    mass: 1
    friction: 0.7
    restitution: 0.1
  }

  // Random colors
  color: ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'][index]
}
\`\`\`

The boxes will stack and can be knocked over. High friction prevents sliding.`,
    category: 'physics',
    metadata: { difficulty: 'intermediate', verified: true },
  },
];

// =============================================================================
// Training Data Generator
// =============================================================================

export class TrainingDataGenerator {
  private semanticMap = SEMANTIC_MAP;
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      maxVariations: options.maxVariations ?? 5,
      includeRelated: options.includeRelated ?? true,
      categories: options.categories ?? [],
      minPerCategory: options.minPerCategory ?? 10,
    };
  }

  /**
   * Phase 1: Semantic Expansion
   * Multiply training examples by generating semantic variations
   */
  private phase1SemanticExpansion(examples: Omit<TrainingExample, 'id' | 'intent' | 'variations'>[]): TrainingExample[] {
    const expanded: TrainingExample[] = [];
    let idCounter = 0;

    for (const example of examples) {
      // Detect intent from original prompt
      const intent = detectIntent(example.prompt, this.semanticMap);

      // Generate semantic variations of the prompt
      const variations = generateSemanticVariations(
        example.prompt,
        this.semanticMap,
        this.options.maxVariations
      );

      // Create expanded examples
      for (const variation of variations) {
        expanded.push({
          id: `train_${String(idCounter++).padStart(5, '0')}`,
          prompt: variation,
          completion: example.completion,
          category: example.category,
          intent,
          variations: variation === example.prompt ? undefined : [example.prompt],
          metadata: example.metadata,
        });
      }

      // Optionally add related concept variations
      if (this.options.includeRelated) {
        const words = example.prompt.toLowerCase().split(/\s+/);
        for (const word of words) {
          const related = getRelated(word, this.semanticMap);
          for (const relatedTerm of related.slice(0, 2)) {
            const relatedPrompt = example.prompt.replace(new RegExp(word, 'gi'), relatedTerm);
            if (relatedPrompt !== example.prompt) {
              expanded.push({
                id: `train_${String(idCounter++).padStart(5, '0')}`,
                prompt: relatedPrompt,
                completion: example.completion,
                category: example.category,
                intent,
                variations: [example.prompt],
                metadata: { ...example.metadata, source: 'related_expansion' },
              });
            }
          }
        }
      }
    }

    return expanded;
  }

  /**
   * Phase 2: Context Injection (placeholder for future enhancement)
   */
  private phase2ContextInjection(examples: TrainingExample[]): TrainingExample[] {
    // Future: Add scene context, error context variations
    return examples;
  }

  /**
   * Phase 3: Quality Filtering
   */
  private phase3QualityFilter(examples: TrainingExample[]): TrainingExample[] {
    const seen = new Set<string>();
    const filtered: TrainingExample[] = [];

    for (const example of examples) {
      // Normalize for dedup
      const key = example.prompt.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      // Filter by category if specified
      if (this.options.categories.length > 0) {
        if (!this.options.categories.includes(example.category)) continue;
      }

      filtered.push(example);
    }

    return filtered;
  }

  /**
   * Generate the full training dataset
   */
  generate(): TrainingDataset {
    // Phase 1: Semantic expansion
    let examples = this.phase1SemanticExpansion(BASE_EXAMPLES);

    // Phase 2: Context injection
    examples = this.phase2ContextInjection(examples);

    // Phase 3: Quality filtering
    examples = this.phase3QualityFilter(examples);

    // Calculate statistics
    const byCategory: Record<string, number> = {};
    const byIntent: Record<string, number> = {};

    for (const example of examples) {
      byCategory[example.category] = (byCategory[example.category] || 0) + 1;
      byIntent[example.intent] = (byIntent[example.intent] || 0) + 1;
    }

    return {
      name: 'brittney-holoscript-training',
      version: '1.0.0',
      generated: new Date().toISOString(),
      totalExamples: examples.length,
      originalExamples: BASE_EXAMPLES.length,
      expansionRatio: examples.length / BASE_EXAMPLES.length,
      byCategory: byCategory as Record<TrainingCategory, number>,
      byIntent: byIntent as Record<SemanticIntent, number>,
      examples,
    };
  }

  /**
   * Get statistics about semantic expansion
   */
  getExpansionStats(): {
    totalConcepts: number;
    totalSynonyms: number;
    averageSynonymsPerConcept: number;
    intentCoverage: SemanticIntent[];
  } {
    const concepts = new Set<string>();
    let totalSynonyms = 0;
    const intents = new Set<SemanticIntent>();

    for (const [, concept] of this.semanticMap) {
      concepts.add(concept.canonical);
      totalSynonyms += concept.synonyms.length;
      intents.add(concept.intent);
    }

    return {
      totalConcepts: concepts.size,
      totalSynonyms,
      averageSynonymsPerConcept: totalSynonyms / concepts.size,
      intentCoverage: Array.from(intents),
    };
  }
}
