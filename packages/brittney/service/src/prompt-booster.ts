/**
 * Prompt Booster for Brittney AI
 * Automatically enhances user prompts with physics, materials, and spatial details
 */

export type BoosterLevel = 'off' | 'basic' | 'enhanced' | 'maximum';

export interface BoosterConfig {
  level: BoosterLevel;
  physics: boolean;
  materials: boolean;
  spatial: boolean;
  performance: boolean;
  vr: boolean;
}

export const DEFAULT_BOOSTER_CONFIG: BoosterConfig = {
  level: 'enhanced',
  physics: true,
  materials: true,
  spatial: true,
  performance: true,
  vr: true,
};

// Physics keyword detection patterns
const PHYSICS_PATTERNS = {
  // Weight/Mass
  heavy: { mass: [2, 5], hint: 'heavy objects: mass 2-5kg' },
  light: { mass: [0.1, 0.5], hint: 'light objects: mass 0.1-0.5kg' },
  massive: { mass: [10, 50], hint: 'massive objects: mass 10-50kg' },
  feather: { mass: [0.01, 0.05], hint: 'featherweight: mass 0.01-0.05kg' },

  // Bounce/Restitution
  bouncy: { restitution: [0.8, 0.95], hint: 'bouncy: restitution 0.8-0.95' },
  bounce: { restitution: [0.7, 0.9], hint: 'bouncing: restitution 0.7-0.9' },
  rubber: { restitution: [0.85, 0.95], friction: [0.9, 1.0], hint: 'rubber: high restitution + friction' },
  dead: { restitution: [0, 0.1], hint: 'dead bounce: restitution 0-0.1' },

  // Friction
  slippery: { friction: [0, 0.1], hint: 'slippery: friction 0-0.1' },
  icy: { friction: [0, 0.05], hint: 'icy surface: friction ~0.02' },
  sticky: { friction: [0.9, 1.0], hint: 'sticky: friction 0.9-1.0' },
  grip: { friction: [0.7, 0.9], hint: 'good grip: friction 0.7-0.9' },

  // Motion
  roll: { angularDamping: [0.1, 0.3], hint: 'rolling: low angular damping 0.1-0.3' },
  spin: { angularDamping: [0.05, 0.15], hint: 'spinning: very low angular damping' },
  stable: { angularDamping: [0.8, 0.95], hint: 'stable: high angular damping 0.8-0.95' },

  // Gravity environments
  moon: { gravity: 1.62, hint: 'Moon gravity: 1.62 m/s²' },
  mars: { gravity: 3.72, hint: 'Mars gravity: 3.72 m/s²' },
  space: { gravity: 0, hint: 'Zero-G: gravity 0' },
  underwater: { gravity: 2, linearDamping: [0.5, 0.8], hint: 'underwater: reduced gravity + high damping' },

  // Realistic physics triggers
  realistic: { hint: 'realistic physics: Earth gravity 9.81, typical mass 0.5-2kg, restitution 0.3-0.6' },
  physics: { hint: 'enable physics simulation with sensible defaults' },
  simulation: { hint: 'physics simulation: consider mass, friction, restitution balance' },
};

// Material keyword detection patterns
const MATERIAL_PATTERNS = {
  // Metals
  metal: { metallic: [0.85, 1.0], roughness: [0.1, 0.4], hint: 'metal: metallic 0.9+, roughness 0.1-0.4' },
  gold: { metallic: 1.0, roughness: 0.1, color: '#FFD700', hint: 'gold: metallic 1.0, roughness 0.1' },
  silver: { metallic: 1.0, roughness: 0.15, color: '#C0C0C0', hint: 'silver: metallic 1.0, roughness 0.15' },
  copper: { metallic: 0.95, roughness: 0.25, color: '#B87333', hint: 'copper: metallic 0.95, roughness 0.25' },
  steel: { metallic: 0.95, roughness: 0.3, color: '#71797E', hint: 'steel: metallic 0.95, roughness 0.3' },
  chrome: { metallic: 1.0, roughness: 0.05, hint: 'chrome: metallic 1.0, roughness 0.05 (mirror-like)' },
  rusty: { metallic: 0.7, roughness: 0.7, hint: 'rusty metal: metallic 0.7, roughness 0.7' },

  // Non-metals
  wood: { metallic: 0, roughness: [0.5, 0.8], hint: 'wood: metallic 0, roughness 0.5-0.8' },
  plastic: { metallic: 0, roughness: [0.3, 0.6], hint: 'plastic: metallic 0, roughness 0.3-0.6' },
  rubber: { metallic: 0, roughness: 0.9, hint: 'rubber: metallic 0, roughness 0.9' },
  concrete: { metallic: 0, roughness: 0.95, hint: 'concrete: metallic 0, roughness 0.95' },
  stone: { metallic: 0, roughness: [0.7, 0.9], hint: 'stone: metallic 0, roughness 0.7-0.9' },
  brick: { metallic: 0, roughness: 0.85, hint: 'brick: metallic 0, roughness 0.85' },

  // Transparent/Reflective
  glass: { metallic: 0, roughness: 0.05, transmission: 0.95, hint: 'glass: roughness 0.05, transmission 0.95' },
  crystal: { metallic: 0.1, roughness: 0.02, transmission: 0.9, hint: 'crystal: very low roughness, high transmission' },
  water: { metallic: 0, roughness: 0.1, transmission: 0.8, hint: 'water: roughness 0.1, transmission 0.8' },
  ice: { metallic: 0, roughness: 0.15, transmission: 0.85, hint: 'ice: roughness 0.15, slight transmission' },
  mirror: { metallic: 1.0, roughness: 0, hint: 'mirror: metallic 1.0, roughness 0' },

  // Fabric/Soft
  fabric: { metallic: 0, roughness: [0.8, 1.0], hint: 'fabric: metallic 0, roughness 0.8-1.0' },
  cloth: { metallic: 0, roughness: 0.9, hint: 'cloth: metallic 0, roughness 0.9' },
  leather: { metallic: 0, roughness: 0.6, hint: 'leather: metallic 0, roughness 0.6' },
  velvet: { metallic: 0, roughness: 1.0, hint: 'velvet: metallic 0, roughness 1.0 (diffuse)' },

  // Special
  emissive: { emissive: true, hint: 'emissive/glowing: add emissiveIntensity 1-5' },
  glowing: { emissive: true, hint: 'glowing: emissive material with intensity' },
  neon: { emissive: true, emissiveIntensity: [2, 5], hint: 'neon: high emissive intensity 2-5' },
  holographic: { emissive: true, transmission: 0.5, hint: 'holographic: emissive + semi-transparent' },

  // Appearance
  shiny: { roughness: [0, 0.2], hint: 'shiny: roughness 0-0.2' },
  matte: { roughness: [0.8, 1.0], hint: 'matte: roughness 0.8-1.0' },
  glossy: { roughness: [0.1, 0.3], hint: 'glossy: roughness 0.1-0.3' },
  rough: { roughness: [0.7, 0.9], hint: 'rough: roughness 0.7-0.9' },
  smooth: { roughness: [0.1, 0.3], hint: 'smooth: roughness 0.1-0.3' },
};

// Spatial/detail patterns
const SPATIAL_PATTERNS = {
  // Size
  tiny: { scale: [0.05, 0.15], hint: 'tiny: scale 0.05-0.15 (5-15cm)' },
  small: { scale: [0.2, 0.5], hint: 'small: scale 0.2-0.5 (20-50cm)' },
  large: { scale: [2, 4], hint: 'large: scale 2-4 (2-4m)' },
  huge: { scale: [5, 10], hint: 'huge: scale 5-10 (5-10m)' },
  giant: { scale: [10, 30], hint: 'giant: scale 10-30 (10-30m)' },
  'life-size': { hint: 'life-size: use real-world dimensions' },
  'human-scale': { hint: 'human-scale: ~1.7m height reference' },

  // Position
  floating: { position: 'above ground', hint: 'floating: position.y > 0, consider hover animation' },
  grounded: { position: 'on ground', hint: 'grounded: position.y = half-height (sitting on floor)' },
  ceiling: { position: 'ceiling', hint: 'ceiling: position.y at room height (~2.5-3m)' },
  overhead: { hint: 'overhead: position above eye level (y > 1.7)' },

  // Arrangement
  scattered: { hint: 'scattered: random positions within area, vary rotation' },
  grid: { hint: 'grid: regular spacing, aligned positions' },
  circular: { hint: 'circular: arrange around center point' },
  stack: { hint: 'stacked: vertical arrangement, each on top of previous' },
  cluster: { hint: 'cluster: grouped close together with slight variation' },

  // Detail level
  detailed: { hint: 'detailed: add extra geometry, bevels, small features' },
  simple: { hint: 'simple: basic geometry, clean shapes' },
  complex: { hint: 'complex: multiple parts, intricate design' },
  minimal: { hint: 'minimal: reduced geometry, essential features only' },
};

// VR-specific patterns
const VR_PATTERNS = {
  grabbable: { hint: '@grabbable: add grab points, comfortable grip distance 0.03-0.08m' },
  throwable: { hint: '@throwable: grabbable + physics enabled for throwing' },
  interactable: { hint: 'interactable: add hover/click states, visual feedback' },
  button: { hint: 'VR button: pressable depth 0.02-0.05m, haptic feedback' },
  lever: { hint: 'VR lever: rotation constraint, snap positions' },
  dial: { hint: 'VR dial: rotational input, discrete or continuous' },
  slider: { hint: 'VR slider: linear constraint, value mapping' },
  comfortable: { hint: 'VR comfort: UI at 1-2m distance, 15° below eye level' },
  ergonomic: { hint: 'ergonomic: reachable without stretching (~0.5m arm length)' },
};

// Performance patterns
const PERFORMANCE_PATTERNS = {
  many: { hint: 'many objects: consider instancing, LOD, culling' },
  lots: { hint: 'lots of objects: use GPU instancing for >50 similar objects' },
  particles: { hint: 'particles: limit count (<1000), use GPU particles if available' },
  animated: { hint: 'animated: prefer transform animations over vertex animations' },
  dynamic: { hint: 'dynamic objects: limit physics bodies (<50 active)' },
  static: { hint: 'static: mark as static for physics optimization' },
  background: { hint: 'background: lower detail, simplified materials' },
};

interface DetectedPatterns {
  physics: string[];
  materials: string[];
  spatial: string[];
  vr: string[];
  performance: string[];
}

/**
 * Detect relevant patterns from user query
 */
export function detectPatterns(query: string): DetectedPatterns {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  const detected: DetectedPatterns = {
    physics: [],
    materials: [],
    spatial: [],
    vr: [],
    performance: [],
  };

  // Check physics patterns
  for (const [keyword, data] of Object.entries(PHYSICS_PATTERNS)) {
    if (lowerQuery.includes(keyword) && data.hint) {
      detected.physics.push(data.hint);
    }
  }

  // Check material patterns
  for (const [keyword, data] of Object.entries(MATERIAL_PATTERNS)) {
    if (lowerQuery.includes(keyword) && data.hint) {
      detected.materials.push(data.hint);
    }
  }

  // Check spatial patterns
  for (const [keyword, data] of Object.entries(SPATIAL_PATTERNS)) {
    if (lowerQuery.includes(keyword) && data.hint) {
      detected.spatial.push(data.hint);
    }
  }

  // Check VR patterns
  for (const [keyword, data] of Object.entries(VR_PATTERNS)) {
    if (lowerQuery.includes(keyword) && data.hint) {
      detected.vr.push(data.hint);
    }
  }

  // Check performance patterns
  for (const [keyword, data] of Object.entries(PERFORMANCE_PATTERNS)) {
    if (lowerQuery.includes(keyword) && data.hint) {
      detected.performance.push(data.hint);
    }
  }

  return detected;
}

/**
 * Generate physics enhancement hints based on query
 */
function generatePhysicsHints(query: string, patterns: DetectedPatterns): string {
  const hints: string[] = [];

  if (patterns.physics.length > 0) {
    hints.push('**Physics Recommendations:**');
    patterns.physics.forEach(hint => hints.push(`  - ${hint}`));
  }

  // Add default physics guidance if physics-related but no specific matches
  const physicsKeywords = ['ball', 'throw', 'drop', 'fall', 'roll', 'bounce', 'physics', 'gravity'];
  const hasPhysicsIntent = physicsKeywords.some(kw => query.toLowerCase().includes(kw));

  if (hasPhysicsIntent && patterns.physics.length === 0) {
    hints.push('**Physics Defaults:**');
    hints.push('  - Standard gravity: 9.81 m/s²');
    hints.push('  - Typical object mass: 0.5-2kg');
    hints.push('  - Default restitution: 0.3-0.5');
    hints.push('  - Default friction: 0.5');
  }

  return hints.join('\n');
}

/**
 * Generate material enhancement hints based on query
 */
function generateMaterialHints(query: string, patterns: DetectedPatterns): string {
  const hints: string[] = [];

  if (patterns.materials.length > 0) {
    hints.push('**Material Specifications:**');
    patterns.materials.forEach(hint => hints.push(`  - ${hint}`));
  }

  // Add PBR guidance for common objects
  const objectTypes: Record<string, string> = {
    'car': 'car body: metallic 0.9, roughness 0.2; tires: rubber material',
    'furniture': 'furniture: wood roughness 0.6-0.8 or fabric roughness 0.9',
    'building': 'building: concrete/brick roughness 0.8-0.95',
    'weapon': 'weapon: metal parts metallic 0.9, grip rubber/leather',
    'tree': 'tree: bark roughness 0.9, leaves subsurface scattering',
    'robot': 'robot: mix of metallic (body) and emissive (lights)',
  };

  for (const [obj, hint] of Object.entries(objectTypes)) {
    if (query.toLowerCase().includes(obj)) {
      hints.push(`**${obj.charAt(0).toUpperCase() + obj.slice(1)} Materials:**`);
      hints.push(`  - ${hint}`);
    }
  }

  return hints.join('\n');
}

/**
 * Generate spatial/detail hints based on query
 */
function generateSpatialHints(query: string, patterns: DetectedPatterns): string {
  const hints: string[] = [];

  if (patterns.spatial.length > 0) {
    hints.push('**Spatial Details:**');
    patterns.spatial.forEach(hint => hints.push(`  - ${hint}`));
  }

  // Add arrangement hints for multiple objects
  const multipleIndicators = ['several', 'multiple', 'many', 'few', 'some', 'group', 'array', 'row', 'line'];
  if (multipleIndicators.some(ind => query.toLowerCase().includes(ind))) {
    hints.push('**Multi-Object Placement:**');
    hints.push('  - Use for loops or array generation');
    hints.push('  - Vary position slightly for natural look');
    hints.push('  - Consider spacing: 0.5-2m between objects typically');
  }

  return hints.join('\n');
}

/**
 * Generate VR-specific hints
 */
function generateVRHints(query: string, patterns: DetectedPatterns): string {
  const hints: string[] = [];

  if (patterns.vr.length > 0) {
    hints.push('**VR Interaction Guidelines:**');
    patterns.vr.forEach(hint => hints.push(`  - ${hint}`));
  }

  // Check for interactive intent
  const interactiveKeywords = ['pick up', 'grab', 'hold', 'press', 'push', 'pull', 'interact', 'use'];
  if (interactiveKeywords.some(kw => query.toLowerCase().includes(kw))) {
    hints.push('**VR Interaction Setup:**');
    hints.push('  - Add @grabbable trait for pick-up objects');
    hints.push('  - Comfortable grab distance: 0.03-0.08m from center');
    hints.push('  - Include hover highlight state');
    hints.push('  - Consider haptic feedback on grab/release');
  }

  return hints.join('\n');
}

/**
 * Generate performance hints
 */
function generatePerformanceHints(query: string, patterns: DetectedPatterns): string {
  const hints: string[] = [];

  if (patterns.performance.length > 0) {
    hints.push('**Performance Considerations:**');
    patterns.performance.forEach(hint => hints.push(`  - ${hint}`));
  }

  return hints.join('\n');
}

/**
 * Main boost function - enhances prompts with physics, materials, and details
 */
export function boostPrompt(
  userQuery: string,
  config: BoosterConfig = DEFAULT_BOOSTER_CONFIG
): string {
  if (config.level === 'off') {
    return '';
  }

  const patterns = detectPatterns(userQuery);
  const sections: string[] = [];

  // Add a header
  sections.push('\n--- PROMPT ENHANCEMENT (Auto-Generated) ---\n');
  sections.push('The following specifications are recommended based on the user\'s request:\n');

  // Generate hints based on config
  if (config.physics) {
    const physicsHints = generatePhysicsHints(userQuery, patterns);
    if (physicsHints) sections.push(physicsHints);
  }

  if (config.materials) {
    const materialHints = generateMaterialHints(userQuery, patterns);
    if (materialHints) sections.push(materialHints);
  }

  if (config.spatial) {
    const spatialHints = generateSpatialHints(userQuery, patterns);
    if (spatialHints) sections.push(spatialHints);
  }

  if (config.vr) {
    const vrHints = generateVRHints(userQuery, patterns);
    if (vrHints) sections.push(vrHints);
  }

  if (config.performance) {
    const perfHints = generatePerformanceHints(userQuery, patterns);
    if (perfHints) sections.push(perfHints);
  }

  // Add enhanced mode extras
  if (config.level === 'enhanced' || config.level === 'maximum') {
    sections.push('\n**General Enhancement Guidelines:**');
    sections.push('  - Add appropriate physics properties even if not explicitly requested');
    sections.push('  - Include PBR material values (metallic, roughness) for realism');
    sections.push('  - Position objects at sensible heights (not at y=0 unless floor)');
    sections.push('  - Add subtle animations for visual interest when appropriate');
  }

  // Add maximum mode extras
  if (config.level === 'maximum') {
    sections.push('\n**Maximum Detail Mode:**');
    sections.push('  - Add environmental effects (shadows, reflections, ambient occlusion)');
    sections.push('  - Include sound effects for interactions');
    sections.push('  - Add particle effects for impacts/interactions');
    sections.push('  - Create multiple LOD levels for complex objects');
    sections.push('  - Add accessibility features (audio cues, high contrast options)');
  }

  sections.push('\n--- END ENHANCEMENT ---\n');

  // Only return if we have actual content
  const content = sections.filter(s => s.trim()).join('\n');
  const hasContent = content.split('\n').filter(line =>
    line.trim() &&
    !line.includes('---') &&
    !line.includes('ENHANCEMENT') &&
    !line.includes('following specifications')
  ).length > 0;

  return hasContent ? content : '';
}

/**
 * Quick boost - returns just the key enhancements as a compact string
 */
export function quickBoost(userQuery: string): string {
  const patterns = detectPatterns(userQuery);
  const boosts: string[] = [];

  // Collect all detected hints
  [...patterns.physics, ...patterns.materials, ...patterns.spatial, ...patterns.vr]
    .slice(0, 5) // Limit to top 5 most relevant
    .forEach(hint => boosts.push(hint));

  if (boosts.length === 0) return '';

  return `[Enhanced: ${boosts.join('; ')}]`;
}

export default {
  boostPrompt,
  quickBoost,
  detectPatterns,
  DEFAULT_BOOSTER_CONFIG,
};
