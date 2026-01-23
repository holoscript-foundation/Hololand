/**
 * Semantic Expansion for Brittney Training
 *
 * Phase 1: Expand utility by teaching semantic understanding.
 * Maps literal terms to conceptual clusters so Brittney can understand
 * varied user expressions of the same intent.
 *
 * Pattern: P.TRAIN.SEMANTICS.01
 * Wisdom: W.TRAIN.MEANING.01 - "Understand intent, not just words"
 *
 * Integration with uaa2-service:
 * ─────────────────────────────────────────────────────────────
 * General action semantics live in uaa2-service:
 *   src/services/master-portal/training/augmentation/ActionSynonymDictionary.ts
 *
 * That module provides 18 canonical actions with 1000+ phrases:
 *   port, refactor, implement, fix, debug, test, deploy, configure,
 *   document, optimize, integrate, scaffold, analyze, automate
 *
 * This module extends with HoloScript/VR domain-specific semantics:
 *   - VR interactions (grab, throw, point, hover)
 *   - Animations (float, spin, pulse, fade)
 *   - Geometries (cube, sphere, cylinder)
 *   - Effects (particles, fire, smoke)
 *   - Scene concepts (skybox, lighting)
 *   - Multiplayer (networked, ownership)
 * ─────────────────────────────────────────────────────────────
 */

// =============================================================================
// Types
// =============================================================================

export interface SemanticConcept {
  /** Canonical term (what we map TO) */
  canonical: string;
  /** All variations that mean the same thing */
  synonyms: string[];
  /** Related but distinct concepts */
  related: string[];
  /** Parent concept in hierarchy */
  parent?: string;
  /** Child concepts */
  children?: string[];
  /** Intent category */
  intent: SemanticIntent;
}

export type SemanticIntent =
  | 'create'      // Making something new
  | 'modify'      // Changing existing
  | 'delete'      // Removing
  | 'query'       // Asking about
  | 'enable'      // Adding capability
  | 'disable'     // Removing capability
  | 'animate'     // Adding motion
  | 'interact'    // Adding user interaction
  | 'optimize'    // Improving performance
  | 'debug';      // Fixing issues

// =============================================================================
// Semantic Ontology for HoloScript/VR Domain
// =============================================================================

export const SEMANTIC_ONTOLOGY: SemanticConcept[] = [
  // ─────────────────────────────────────────────────────────────
  // INTERACTION CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'grabbable',
    synonyms: ['grab', 'pick up', 'hold', 'grasp', 'take', 'lift', 'carry', 'seize'],
    related: ['throwable', 'movable', 'interactable'],
    parent: 'interaction',
    intent: 'enable',
  },
  {
    canonical: 'throwable',
    synonyms: ['throw', 'toss', 'hurl', 'fling', 'launch', 'chuck'],
    related: ['grabbable', 'physics'],
    parent: 'interaction',
    intent: 'enable',
  },
  {
    canonical: 'pointable',
    synonyms: ['point', 'click', 'select', 'tap', 'press', 'activate', 'trigger'],
    related: ['hoverable', 'button'],
    parent: 'interaction',
    intent: 'enable',
  },
  {
    canonical: 'hoverable',
    synonyms: ['hover', 'highlight', 'glow', 'look at', 'gaze', 'focus', 'mouse over'],
    related: ['pointable', 'feedback'],
    parent: 'interaction',
    intent: 'enable',
  },
  {
    canonical: 'breakable',
    synonyms: ['break', 'shatter', 'destroy', 'smash', 'crack', 'fragile', 'destructible'],
    related: ['physics', 'particles'],
    parent: 'interaction',
    intent: 'enable',
  },
  {
    canonical: 'scalable',
    synonyms: ['resize', 'scale', 'grow', 'shrink', 'expand', 'contract', 'pinch', 'stretch'],
    related: ['grabbable', 'transform'],
    parent: 'interaction',
    intent: 'enable',
  },

  // ─────────────────────────────────────────────────────────────
  // ANIMATION CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'float',
    synonyms: ['bob', 'hover', 'levitate', 'drift', 'suspend', 'up and down', 'bounce gently'],
    related: ['animate', 'position'],
    parent: 'animation',
    intent: 'animate',
  },
  {
    canonical: 'spin',
    synonyms: ['rotate', 'turn', 'revolve', 'twist', 'twirl', 'orbit', 'roll'],
    related: ['animate', 'rotation'],
    parent: 'animation',
    intent: 'animate',
  },
  {
    canonical: 'pulse',
    synonyms: ['breathe', 'throb', 'beat', 'expand contract', 'scale animation', 'grow shrink'],
    related: ['animate', 'scale'],
    parent: 'animation',
    intent: 'animate',
  },
  {
    canonical: 'fade',
    synonyms: ['transparent', 'opacity', 'appear', 'disappear', 'ghost', 'invisible', 'alpha'],
    related: ['animate', 'material'],
    parent: 'animation',
    intent: 'animate',
  },
  {
    canonical: 'glow',
    synonyms: ['emit', 'shine', 'radiate', 'luminous', 'emissive', 'light up', 'bright'],
    related: ['animate', 'material', 'light'],
    parent: 'animation',
    intent: 'animate',
  },
  {
    canonical: 'shake',
    synonyms: ['vibrate', 'wobble', 'tremble', 'quiver', 'jitter', 'rattle'],
    related: ['animate', 'feedback'],
    parent: 'animation',
    intent: 'animate',
  },

  // ─────────────────────────────────────────────────────────────
  // GEOMETRY CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'cube',
    synonyms: ['box', 'block', 'square', 'rectangular', 'crate'],
    related: ['geometry', 'primitive'],
    parent: 'geometry',
    intent: 'create',
  },
  {
    canonical: 'sphere',
    synonyms: ['ball', 'orb', 'globe', 'round', 'circular'],
    related: ['geometry', 'primitive'],
    parent: 'geometry',
    intent: 'create',
  },
  {
    canonical: 'cylinder',
    synonyms: ['tube', 'pipe', 'pillar', 'column', 'rod', 'can'],
    related: ['geometry', 'primitive'],
    parent: 'geometry',
    intent: 'create',
  },
  {
    canonical: 'plane',
    synonyms: ['floor', 'wall', 'surface', 'ground', 'flat', 'panel', 'quad'],
    related: ['geometry', 'primitive'],
    parent: 'geometry',
    intent: 'create',
  },

  // ─────────────────────────────────────────────────────────────
  // EFFECT CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'particles',
    synonyms: ['particle', 'effect', 'sparks', 'dust', 'confetti', 'emitter'],
    related: ['visual', 'feedback'],
    parent: 'effects',
    children: ['fire', 'smoke', 'rain', 'snow', 'explosion'],
    intent: 'create',
  },
  {
    canonical: 'fire',
    synonyms: ['flame', 'burn', 'blaze', 'torch', 'campfire', 'inferno'],
    related: ['particles', 'light'],
    parent: 'particles',
    intent: 'create',
  },
  {
    canonical: 'smoke',
    synonyms: ['fog', 'mist', 'haze', 'steam', 'vapor', 'cloud'],
    related: ['particles', 'atmosphere'],
    parent: 'particles',
    intent: 'create',
  },
  {
    canonical: 'explosion',
    synonyms: ['explode', 'blast', 'boom', 'burst', 'detonate', 'bang'],
    related: ['particles', 'breakable', 'audio'],
    parent: 'particles',
    intent: 'create',
  },

  // ─────────────────────────────────────────────────────────────
  // SCENE CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'scene',
    synonyms: ['world', 'environment', 'level', 'map', 'space', 'room', 'area'],
    related: ['skybox', 'lighting', 'atmosphere'],
    intent: 'create',
  },
  {
    canonical: 'skybox',
    synonyms: ['sky', 'background', 'horizon', 'atmosphere', 'dome'],
    related: ['scene', 'environment'],
    parent: 'scene',
    intent: 'modify',
  },
  {
    canonical: 'lighting',
    synonyms: ['light', 'illuminate', 'bright', 'dark', 'shadow', 'lamp', 'sun'],
    related: ['scene', 'atmosphere'],
    parent: 'scene',
    intent: 'modify',
  },

  // ─────────────────────────────────────────────────────────────
  // MULTIPLAYER CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'networked',
    synonyms: ['multiplayer', 'sync', 'shared', 'online', 'connected', 'synced', 'replicated'],
    related: ['ownership', 'state'],
    parent: 'multiplayer',
    intent: 'enable',
  },
  {
    canonical: 'ownership',
    synonyms: ['own', 'control', 'claim', 'authority', 'master', 'host'],
    related: ['networked', 'transfer'],
    parent: 'multiplayer',
    intent: 'modify',
  },

  // ─────────────────────────────────────────────────────────────
  // UI CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'ui',
    synonyms: ['interface', 'menu', 'hud', 'panel', 'display', 'gui', 'screen'],
    related: ['button', 'text'],
    children: ['button', 'text', 'panel', 'slider'],
    intent: 'create',
  },
  {
    canonical: 'button',
    synonyms: ['btn', 'clickable', 'pressable', 'toggle', 'switch'],
    related: ['pointable', 'ui'],
    parent: 'ui',
    intent: 'create',
  },
  {
    canonical: 'text',
    synonyms: ['label', 'title', 'caption', 'heading', 'message', 'string', 'words'],
    related: ['ui', 'display'],
    parent: 'ui',
    intent: 'create',
  },

  // ─────────────────────────────────────────────────────────────
  // AUDIO CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'audio',
    synonyms: ['sound', 'music', 'sfx', 'noise', 'tone', 'effect'],
    related: ['spatial', 'feedback'],
    children: ['spatial_audio', 'ambient', 'sfx'],
    intent: 'create',
  },
  {
    canonical: 'spatial_audio',
    synonyms: ['3d sound', 'positional audio', 'directional sound', 'surround'],
    related: ['audio', 'position'],
    parent: 'audio',
    intent: 'enable',
  },

  // ─────────────────────────────────────────────────────────────
  // PHYSICS CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'physics',
    synonyms: ['physical', 'rigid body', 'dynamic', 'realistic'],
    related: ['collision', 'gravity'],
    children: ['gravity', 'collision', 'mass'],
    intent: 'enable',
  },
  {
    canonical: 'gravity',
    synonyms: ['fall', 'weight', 'heavy', 'drop', 'zero-g', 'weightless'],
    related: ['physics', 'force'],
    parent: 'physics',
    intent: 'modify',
  },
  {
    canonical: 'collision',
    synonyms: ['collide', 'hit', 'bump', 'touch', 'contact', 'intersect'],
    related: ['physics', 'trigger'],
    parent: 'physics',
    intent: 'enable',
  },

  // ─────────────────────────────────────────────────────────────
  // GAMEPLAY CONCEPTS
  // ─────────────────────────────────────────────────────────────
  {
    canonical: 'collectible',
    synonyms: ['pickup', 'collect', 'item', 'loot', 'coin', 'gem', 'treasure'],
    related: ['score', 'inventory'],
    parent: 'gameplay',
    intent: 'create',
  },
  {
    canonical: 'trigger',
    synonyms: ['zone', 'area', 'region', 'detect', 'sensor', 'tripwire'],
    related: ['collision', 'event'],
    parent: 'gameplay',
    intent: 'create',
  },
  {
    canonical: 'teleport',
    synonyms: ['portal', 'warp', 'transport', 'travel', 'jump to', 'fast travel'],
    related: ['locomotion', 'scene'],
    parent: 'gameplay',
    intent: 'create',
  },
  {
    canonical: 'door',
    synonyms: ['gate', 'entrance', 'exit', 'passage', 'opening'],
    related: ['interaction', 'state'],
    parent: 'gameplay',
    intent: 'create',
  },
];

// =============================================================================
// Semantic Expansion Functions
// =============================================================================

/**
 * Build a lookup map for fast semantic expansion
 */
export function buildSemanticMap(): Map<string, SemanticConcept> {
  const map = new Map<string, SemanticConcept>();

  for (const concept of SEMANTIC_ONTOLOGY) {
    // Map canonical term
    map.set(concept.canonical.toLowerCase(), concept);

    // Map all synonyms to the same concept
    for (const synonym of concept.synonyms) {
      map.set(synonym.toLowerCase(), concept);
    }
  }

  return map;
}

/**
 * Expand a query into semantic variations
 */
export function expandQuery(query: string, semanticMap: Map<string, SemanticConcept>): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const expansions = new Set<string>([query]);

  for (const word of words) {
    const concept = semanticMap.get(word);
    if (concept) {
      // Add variations with synonyms
      for (const synonym of concept.synonyms) {
        expansions.add(query.replace(new RegExp(word, 'gi'), synonym));
      }

      // Add canonical form
      if (word !== concept.canonical) {
        expansions.add(query.replace(new RegExp(word, 'gi'), concept.canonical));
      }
    }
  }

  return Array.from(expansions);
}

/**
 * Get the canonical concept for a term
 */
export function getCanonical(term: string, semanticMap: Map<string, SemanticConcept>): string | null {
  const concept = semanticMap.get(term.toLowerCase());
  return concept ? concept.canonical : null;
}

/**
 * Get related concepts
 */
export function getRelated(term: string, semanticMap: Map<string, SemanticConcept>): string[] {
  const concept = semanticMap.get(term.toLowerCase());
  if (!concept) return [];

  const related = new Set<string>(concept.related);

  // Add parent
  if (concept.parent) {
    related.add(concept.parent);
  }

  // Add children
  if (concept.children) {
    for (const child of concept.children) {
      related.add(child);
    }
  }

  return Array.from(related);
}

/**
 * Detect intent from query
 */
export function detectIntent(query: string, semanticMap: Map<string, SemanticConcept>): SemanticIntent {
  const queryLower = query.toLowerCase();

  // Check action words first
  if (queryLower.match(/\b(create|make|add|build|generate|new)\b/)) return 'create';
  if (queryLower.match(/\b(change|modify|update|edit|adjust|set)\b/)) return 'modify';
  if (queryLower.match(/\b(remove|delete|destroy|clear|hide)\b/)) return 'delete';
  if (queryLower.match(/\b(what|how|why|explain|show|list)\b/)) return 'query';
  if (queryLower.match(/\b(enable|allow|let|can|activate)\b/)) return 'enable';
  if (queryLower.match(/\b(disable|prevent|stop|block)\b/)) return 'disable';
  if (queryLower.match(/\b(animate|move|motion|tween)\b/)) return 'animate';
  if (queryLower.match(/\b(interact|touch|grab|click|point)\b/)) return 'interact';
  if (queryLower.match(/\b(optimize|improve|faster|performance|fps)\b/)) return 'optimize';
  if (queryLower.match(/\b(fix|debug|error|bug|issue|problem)\b/)) return 'debug';

  // Check concepts for default intent
  for (const word of queryLower.split(/\s+/)) {
    const concept = semanticMap.get(word);
    if (concept) {
      return concept.intent;
    }
  }

  return 'create'; // Default
}

// =============================================================================
// Training Data Generation Helpers
// =============================================================================

/**
 * Generate semantic variations of a training prompt
 */
export function generateSemanticVariations(
  prompt: string,
  semanticMap: Map<string, SemanticConcept>,
  maxVariations = 5
): string[] {
  const variations = expandQuery(prompt, semanticMap);
  return variations.slice(0, maxVariations);
}

/**
 * Get all terms in a semantic cluster
 */
export function getSemanticCluster(canonical: string): string[] {
  const concept = SEMANTIC_ONTOLOGY.find((c) => c.canonical === canonical);
  if (!concept) return [canonical];

  return [concept.canonical, ...concept.synonyms];
}

// Pre-built semantic map for direct import
export const SEMANTIC_MAP = buildSemanticMap();

// =============================================================================
// UAA2 Integration Layer
// =============================================================================

/**
 * Action synonyms from uaa2-service ActionSynonymDictionary
 * These cover general development actions (port, refactor, implement, etc.)
 *
 * To use full integration, import from uaa2-service:
 *   import { ACTION_PHRASING_DICTIONARY, detectActionFromText }
 *     from '@uaa2-service/training/augmentation/ActionSynonymDictionary'
 */
export const UAA2_ACTION_MAPPING: Record<string, string[]> = {
  // Subset of uaa2 actions relevant to Brittney/HoloScript
  implement: ['build', 'create', 'make', 'add', 'develop', 'put together', 'set up'],
  fix: ['repair', 'correct', 'resolve', 'patch', 'debug', 'get working'],
  optimize: ['speed up', 'make faster', 'improve performance', 'tune', 'streamline'],
  configure: ['set up', 'adjust', 'change settings', 'hook up', 'point to'],
  analyze: ['examine', 'understand', 'break down', 'walk through', 'review'],
  test: ['verify', 'check', 'make sure works', 'try out', 'validate'],
};

/**
 * Combined intent detection using both HoloScript and uaa2 semantics
 */
export function detectCombinedIntent(
  query: string
): { intent: SemanticIntent; source: 'holoscript' | 'uaa2' | 'default' } {
  const queryLower = query.toLowerCase();

  // First check HoloScript-specific (VR/AR domain)
  const holoIntent = detectIntent(query, SEMANTIC_MAP);
  if (holoIntent !== 'create') {
    // Non-default intent found
    return { intent: holoIntent, source: 'holoscript' };
  }

  // Check uaa2 action patterns
  for (const [action, phrases] of Object.entries(UAA2_ACTION_MAPPING)) {
    for (const phrase of phrases) {
      if (queryLower.includes(phrase)) {
        // Map uaa2 actions to our intents
        const intentMap: Record<string, SemanticIntent> = {
          implement: 'create',
          fix: 'debug',
          optimize: 'optimize',
          configure: 'modify',
          analyze: 'query',
          test: 'query',
        };
        return { intent: intentMap[action] || 'create', source: 'uaa2' };
      }
    }
  }

  return { intent: 'create', source: 'default' };
}

/**
 * Get statistics about semantic coverage
 */
export function getSemanticStats(): {
  holoscriptConcepts: number;
  holoscriptSynonyms: number;
  uaa2Actions: number;
  uaa2Phrases: number;
  totalTerms: number;
} {
  let holoscriptSynonyms = 0;
  for (const concept of SEMANTIC_ONTOLOGY) {
    holoscriptSynonyms += concept.synonyms.length;
  }

  let uaa2Phrases = 0;
  for (const phrases of Object.values(UAA2_ACTION_MAPPING)) {
    uaa2Phrases += phrases.length;
  }

  return {
    holoscriptConcepts: SEMANTIC_ONTOLOGY.length,
    holoscriptSynonyms,
    uaa2Actions: Object.keys(UAA2_ACTION_MAPPING).length,
    uaa2Phrases,
    totalTerms: SEMANTIC_ONTOLOGY.length + holoscriptSynonyms + uaa2Phrases,
  };
}
