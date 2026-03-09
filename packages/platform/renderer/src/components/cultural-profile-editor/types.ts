/**
 * Cultural Profile Editor - Shared Types
 *
 * Type definitions for the Schwartz value-based cultural profile editor.
 * Enables agents to configure their cultural identity across the 10 Schwartz
 * basic value dimensions, select cultural family archetypes, set cooperation
 * indices, and preview real-time compatibility against other agent profiles.
 *
 * Schwartz Value Theory (10 Basic Values):
 *   Schwartz's theory of basic values identifies ten motivationally distinct
 *   value types arranged in a circular structure. Adjacent values are
 *   compatible; opposing values conflict. The circular structure defines
 *   two bipolar dimensions:
 *
 *   Dimension 1: Openness to Change vs. Conservation
 *     Self-Direction, Stimulation  <-->  Conformity, Tradition, Security
 *
 *   Dimension 2: Self-Enhancement vs. Self-Transcendence
 *     Power, Achievement  <-->  Universalism, Benevolence
 *
 *   Hedonism sits between Openness to Change and Self-Enhancement.
 *
 * Cultural Families:
 *   Pre-defined cultural archetypes that set sensible defaults for the
 *   Schwartz value sliders. Based on observed cross-cultural patterns
 *   (Hofstede, Inglehart-Welzel) mapped onto Schwartz dimensions.
 *
 * Compatibility Preview:
 *   Real-time computation of cultural distance between two profiles using
 *   cosine similarity over the 10-dimensional Schwartz value vector.
 *   Compatibility scores drive VR zone entry permissions, collaboration
 *   bonuses, and stigmergic trace interaction modifiers.
 *
 * Performance Contract:
 *   - Compatibility computation: O(1) per pair (10-dim dot product)
 *   - No classifiers or ML inference in the render path
 *   - All slider interactions are debounced at 60Hz max
 *
 * @module cultural-profile-editor/types
 */

// =============================================================================
// SCHWARTZ VALUE DIMENSIONS
// =============================================================================

/**
 * The 10 Schwartz basic value dimensions.
 *
 * Arranged in motivational order around the value circle:
 * Self-Direction -> Stimulation -> Hedonism -> Achievement -> Power ->
 * Security -> Conformity -> Tradition -> Benevolence -> Universalism
 */
export type SchwartzValue =
  | 'self-direction'
  | 'stimulation'
  | 'hedonism'
  | 'achievement'
  | 'power'
  | 'security'
  | 'conformity'
  | 'tradition'
  | 'benevolence'
  | 'universalism';

/**
 * All Schwartz values in circular order for display and computation.
 */
export const ALL_SCHWARTZ_VALUES: SchwartzValue[] = [
  'self-direction',
  'stimulation',
  'hedonism',
  'achievement',
  'power',
  'security',
  'conformity',
  'tradition',
  'benevolence',
  'universalism',
];

/**
 * Metadata for each Schwartz value dimension.
 */
export interface SchwartzValueMeta {
  /** Value identifier */
  value: SchwartzValue;
  /** Human-readable label */
  label: string;
  /** Short description of the motivational goal */
  description: string;
  /** Primary display colour (hex) */
  color: string;
  /** Higher-order category */
  category: SchwartzCategory;
  /** Default value for neutral profiles (0-1) */
  defaultValue: number;
  /** Opposing value(s) in the circular structure */
  opposingValues: SchwartzValue[];
  /** Adjacent compatible value(s) */
  adjacentValues: SchwartzValue[];
}

/**
 * Higher-order categories grouping adjacent Schwartz values.
 */
export type SchwartzCategory =
  | 'openness-to-change'
  | 'self-enhancement'
  | 'conservation'
  | 'self-transcendence';

/**
 * Display metadata for higher-order categories.
 */
export interface SchwartzCategoryMeta {
  category: SchwartzCategory;
  label: string;
  description: string;
  color: string;
  values: SchwartzValue[];
}

/**
 * Configuration for all Schwartz value visual properties and metadata.
 */
export const SCHWARTZ_VALUE_CONFIG: Record<SchwartzValue, SchwartzValueMeta> = {
  'self-direction': {
    value: 'self-direction',
    label: 'Self-Direction',
    description: 'Independent thought and action, creativity, exploration',
    color: '#8B5CF6',
    category: 'openness-to-change',
    defaultValue: 0.5,
    opposingValues: ['conformity', 'tradition'],
    adjacentValues: ['stimulation', 'universalism'],
  },
  'stimulation': {
    value: 'stimulation',
    label: 'Stimulation',
    description: 'Excitement, novelty, challenge in life',
    color: '#A855F7',
    category: 'openness-to-change',
    defaultValue: 0.5,
    opposingValues: ['tradition', 'security'],
    adjacentValues: ['self-direction', 'hedonism'],
  },
  'hedonism': {
    value: 'hedonism',
    label: 'Hedonism',
    description: 'Pleasure, sensuous gratification, enjoyment of life',
    color: '#EC4899',
    category: 'openness-to-change',
    defaultValue: 0.5,
    opposingValues: ['tradition', 'conformity'],
    adjacentValues: ['stimulation', 'achievement'],
  },
  'achievement': {
    value: 'achievement',
    label: 'Achievement',
    description: 'Personal success through demonstrated competence',
    color: '#F59E0B',
    category: 'self-enhancement',
    defaultValue: 0.5,
    opposingValues: ['benevolence'],
    adjacentValues: ['hedonism', 'power'],
  },
  'power': {
    value: 'power',
    label: 'Power',
    description: 'Social status, prestige, control over resources',
    color: '#EF4444',
    category: 'self-enhancement',
    defaultValue: 0.5,
    opposingValues: ['universalism', 'benevolence'],
    adjacentValues: ['achievement', 'security'],
  },
  'security': {
    value: 'security',
    label: 'Security',
    description: 'Safety, harmony, stability of society and relationships',
    color: '#06B6D4',
    category: 'conservation',
    defaultValue: 0.5,
    opposingValues: ['stimulation', 'self-direction'],
    adjacentValues: ['power', 'conformity'],
  },
  'conformity': {
    value: 'conformity',
    label: 'Conformity',
    description: 'Restraint of actions that may violate social norms',
    color: '#14B8A6',
    category: 'conservation',
    defaultValue: 0.5,
    opposingValues: ['self-direction', 'stimulation'],
    adjacentValues: ['security', 'tradition'],
  },
  'tradition': {
    value: 'tradition',
    label: 'Tradition',
    description: 'Respect and commitment to cultural customs and ideas',
    color: '#10B981',
    category: 'conservation',
    defaultValue: 0.5,
    opposingValues: ['self-direction', 'stimulation', 'hedonism'],
    adjacentValues: ['conformity', 'benevolence'],
  },
  'benevolence': {
    value: 'benevolence',
    label: 'Benevolence',
    description: 'Preserving and enhancing welfare of close others',
    color: '#3B82F6',
    category: 'self-transcendence',
    defaultValue: 0.5,
    opposingValues: ['power', 'achievement'],
    adjacentValues: ['tradition', 'universalism'],
  },
  'universalism': {
    value: 'universalism',
    label: 'Universalism',
    description: 'Understanding, tolerance, protection for all and nature',
    color: '#6366F1',
    category: 'self-transcendence',
    defaultValue: 0.5,
    opposingValues: ['power'],
    adjacentValues: ['benevolence', 'self-direction'],
  },
};

/**
 * Higher-order category configuration.
 */
export const SCHWARTZ_CATEGORY_CONFIG: Record<SchwartzCategory, SchwartzCategoryMeta> = {
  'openness-to-change': {
    category: 'openness-to-change',
    label: 'Openness to Change',
    description: 'Valuing independent action, thought, feeling, and readiness for new experience',
    color: '#8B5CF6',
    values: ['self-direction', 'stimulation', 'hedonism'],
  },
  'self-enhancement': {
    category: 'self-enhancement',
    label: 'Self-Enhancement',
    description: 'Pursuing personal success and dominance over others',
    color: '#F59E0B',
    values: ['achievement', 'power'],
  },
  'conservation': {
    category: 'conservation',
    label: 'Conservation',
    description: 'Preserving stability, tradition, and conformity to expectations',
    color: '#06B6D4',
    values: ['security', 'conformity', 'tradition'],
  },
  'self-transcendence': {
    category: 'self-transcendence',
    label: 'Self-Transcendence',
    description: 'Concern for the welfare of others and nature',
    color: '#3B82F6',
    values: ['benevolence', 'universalism'],
  },
};

// =============================================================================
// CULTURAL FAMILIES
// =============================================================================

/**
 * Pre-defined cultural family archetypes.
 *
 * Each cultural family sets sensible defaults for the 10 Schwartz value
 * sliders based on observed cross-cultural patterns. Agents can choose
 * a family as a starting point and then fine-tune individual values.
 */
export type CulturalFamily =
  | 'individualist-western'
  | 'collectivist-east-asian'
  | 'hierarchical-south-asian'
  | 'egalitarian-nordic'
  | 'honor-mediterranean'
  | 'communal-african'
  | 'entrepreneurial-frontier'
  | 'balanced-neutral'
  | 'custom';

/**
 * Metadata for a cultural family preset.
 */
export interface CulturalFamilyMeta {
  family: CulturalFamily;
  label: string;
  description: string;
  /** Preset Schwartz value scores (0-1 per dimension) */
  presetValues: Record<SchwartzValue, number>;
  /** Suggested cooperation index */
  suggestedCooperationIndex: number;
  /** Region/archetype origin for display */
  origin: string;
}

/**
 * All cultural family presets with their Schwartz value configurations.
 */
export const CULTURAL_FAMILY_PRESETS: Record<CulturalFamily, CulturalFamilyMeta> = {
  'individualist-western': {
    family: 'individualist-western',
    label: 'Individualist Western',
    description: 'Emphasises self-direction, achievement, and personal freedom',
    origin: 'North America, Western Europe',
    suggestedCooperationIndex: 0.55,
    presetValues: {
      'self-direction': 0.85,
      'stimulation': 0.7,
      'hedonism': 0.65,
      'achievement': 0.8,
      'power': 0.55,
      'security': 0.45,
      'conformity': 0.3,
      'tradition': 0.25,
      'benevolence': 0.6,
      'universalism': 0.65,
    },
  },
  'collectivist-east-asian': {
    family: 'collectivist-east-asian',
    label: 'Collectivist East Asian',
    description: 'Values group harmony, conformity, and long-term relationships',
    origin: 'China, Japan, Korea',
    suggestedCooperationIndex: 0.8,
    presetValues: {
      'self-direction': 0.4,
      'stimulation': 0.35,
      'hedonism': 0.4,
      'achievement': 0.75,
      'power': 0.5,
      'security': 0.8,
      'conformity': 0.85,
      'tradition': 0.7,
      'benevolence': 0.75,
      'universalism': 0.5,
    },
  },
  'hierarchical-south-asian': {
    family: 'hierarchical-south-asian',
    label: 'Hierarchical South Asian',
    description: 'Respect for tradition, hierarchy, and family obligations',
    origin: 'India, Southeast Asia',
    suggestedCooperationIndex: 0.7,
    presetValues: {
      'self-direction': 0.35,
      'stimulation': 0.3,
      'hedonism': 0.35,
      'achievement': 0.65,
      'power': 0.7,
      'security': 0.75,
      'conformity': 0.8,
      'tradition': 0.9,
      'benevolence': 0.8,
      'universalism': 0.45,
    },
  },
  'egalitarian-nordic': {
    family: 'egalitarian-nordic',
    label: 'Egalitarian Nordic',
    description: 'Strong universalism, equality, and social welfare orientation',
    origin: 'Scandinavia, Northern Europe',
    suggestedCooperationIndex: 0.85,
    presetValues: {
      'self-direction': 0.8,
      'stimulation': 0.55,
      'hedonism': 0.5,
      'achievement': 0.55,
      'power': 0.2,
      'security': 0.7,
      'conformity': 0.55,
      'tradition': 0.4,
      'benevolence': 0.85,
      'universalism': 0.9,
    },
  },
  'honor-mediterranean': {
    family: 'honor-mediterranean',
    label: 'Honor-Mediterranean',
    description: 'Values personal honour, family loyalty, and social reputation',
    origin: 'Mediterranean, Middle East, Latin America',
    suggestedCooperationIndex: 0.65,
    presetValues: {
      'self-direction': 0.5,
      'stimulation': 0.55,
      'hedonism': 0.6,
      'achievement': 0.7,
      'power': 0.65,
      'security': 0.7,
      'conformity': 0.65,
      'tradition': 0.75,
      'benevolence': 0.8,
      'universalism': 0.4,
    },
  },
  'communal-african': {
    family: 'communal-african',
    label: 'Communal African',
    description: 'Ubuntu philosophy: community-centred with strong benevolence',
    origin: 'Sub-Saharan Africa',
    suggestedCooperationIndex: 0.9,
    presetValues: {
      'self-direction': 0.45,
      'stimulation': 0.5,
      'hedonism': 0.45,
      'achievement': 0.5,
      'power': 0.4,
      'security': 0.65,
      'conformity': 0.7,
      'tradition': 0.8,
      'benevolence': 0.9,
      'universalism': 0.75,
    },
  },
  'entrepreneurial-frontier': {
    family: 'entrepreneurial-frontier',
    label: 'Entrepreneurial Frontier',
    description: 'Risk-taking, innovation, and competitive achievement',
    origin: 'Silicon Valley, startup ecosystems',
    suggestedCooperationIndex: 0.5,
    presetValues: {
      'self-direction': 0.9,
      'stimulation': 0.85,
      'hedonism': 0.6,
      'achievement': 0.9,
      'power': 0.7,
      'security': 0.25,
      'conformity': 0.15,
      'tradition': 0.15,
      'benevolence': 0.45,
      'universalism': 0.5,
    },
  },
  'balanced-neutral': {
    family: 'balanced-neutral',
    label: 'Balanced Neutral',
    description: 'All values equally weighted -- no cultural bias',
    origin: 'Universal',
    suggestedCooperationIndex: 0.5,
    presetValues: {
      'self-direction': 0.5,
      'stimulation': 0.5,
      'hedonism': 0.5,
      'achievement': 0.5,
      'power': 0.5,
      'security': 0.5,
      'conformity': 0.5,
      'tradition': 0.5,
      'benevolence': 0.5,
      'universalism': 0.5,
    },
  },
  'custom': {
    family: 'custom',
    label: 'Custom',
    description: 'Manually configured value profile with no preset',
    origin: 'User-defined',
    suggestedCooperationIndex: 0.5,
    presetValues: {
      'self-direction': 0.5,
      'stimulation': 0.5,
      'hedonism': 0.5,
      'achievement': 0.5,
      'power': 0.5,
      'security': 0.5,
      'conformity': 0.5,
      'tradition': 0.5,
      'benevolence': 0.5,
      'universalism': 0.5,
    },
  },
};

/**
 * All cultural families in display order.
 */
export const ALL_CULTURAL_FAMILIES: CulturalFamily[] = [
  'balanced-neutral',
  'individualist-western',
  'collectivist-east-asian',
  'hierarchical-south-asian',
  'egalitarian-nordic',
  'honor-mediterranean',
  'communal-african',
  'entrepreneurial-frontier',
  'custom',
];

// =============================================================================
// CULTURAL PROFILE
// =============================================================================

/**
 * A complete cultural profile for an agent.
 */
export interface CulturalProfile {
  /** Agent unique identifier */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** Selected cultural family */
  culturalFamily: CulturalFamily;
  /** Schwartz value scores (0-1 per dimension) */
  values: Record<SchwartzValue, number>;
  /** Cooperation index (0-1): willingness to cooperate with other agents */
  cooperationIndex: number;
  /** Timestamp of last modification */
  lastModified: number;
}

/**
 * Compatibility result between two cultural profiles.
 */
export interface CompatibilityResult {
  /** Cosine similarity score (0-1, higher = more compatible) */
  overallScore: number;
  /** Qualitative compatibility label */
  level: CompatibilityLevel;
  /** Per-dimension compatibility breakdown (signed difference) */
  dimensionDeltas: Record<SchwartzValue, number>;
  /** Shared strengths (values where both profiles are high) */
  sharedStrengths: SchwartzValue[];
  /** Potential tensions (values with large opposing differences) */
  tensions: SchwartzValue[];
  /** Cooperation compatibility (product of both cooperation indices) */
  cooperationCompatibility: number;
  /** Aggregate category differences */
  categoryScores: Record<SchwartzCategory, number>;
}

/**
 * Qualitative compatibility levels.
 */
export type CompatibilityLevel =
  | 'highly-compatible'
  | 'compatible'
  | 'neutral'
  | 'tension'
  | 'conflicting';

// =============================================================================
// EDITOR STATE
// =============================================================================

/**
 * Complete state for the Cultural Profile Editor.
 */
export interface CulturalProfileEditorState {
  /** The profile being edited */
  profile: CulturalProfile;
  /** Other agent profiles available for comparison */
  comparisonProfiles: CulturalProfile[];
  /** Currently selected comparison profile (null = none) */
  selectedComparisonId: string | null;
  /** Computed compatibility result (null if no comparison selected) */
  compatibility: CompatibilityResult | null;
  /** Whether the editor has unsaved changes */
  isDirty: boolean;
  /** Whether the profile is being saved */
  isSaving: boolean;
  /** Validation errors keyed by field */
  errors: Record<string, string>;
}

/**
 * Actions available from the useCulturalProfileEditor hook.
 */
export interface CulturalProfileEditorActions {
  /** Update a single Schwartz value */
  setSchwartzValue: (value: SchwartzValue, score: number) => void;
  /** Update the cooperation index */
  setCooperationIndex: (index: number) => void;
  /** Select a cultural family (applies preset values) */
  selectCulturalFamily: (family: CulturalFamily) => void;
  /** Select a comparison profile for compatibility preview */
  selectComparison: (agentId: string | null) => void;
  /** Reset all values to the current family's defaults */
  resetToFamilyDefaults: () => void;
  /** Save the current profile */
  saveProfile: () => void;
  /** Update comparison profiles list */
  updateComparisonProfiles: (profiles: CulturalProfile[]) => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the Cultural Profile Editor.
 * Extends the holographic Layer 6 theme pattern from culture-dashboard.
 */
export interface CulturalProfileEditorTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor */
  fontScale: number;
  /** Border radius for panels */
  borderRadius: string;

  // Layer 6 transparency
  overlayOpacity: number;
  containerBackground: string;
  cardBackground: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderColor: string;
  glowColor: string;

  // Compatibility levels
  highlyCompatibleColor: string;
  compatibleColor: string;
  neutralColor: string;
  tensionColor: string;
  conflictingColor: string;

  // Slider
  sliderTrackColor: string;
  sliderThumbSize: string;

  // Accent
  accentColor: string;

  // Interactive
  buttonBackground: string;
  buttonHoverBackground: string;
  focusOutlineColor: string;
}

/**
 * Default holographic theme for the Cultural Profile Editor.
 * All foreground colours meet WCAG 2.1 AA minimum contrast (4.5:1)
 * against the semi-transparent backgrounds at 0.85 alpha.
 */
export const DEFAULT_CULTURAL_PROFILE_EDITOR_THEME: CulturalProfileEditorTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',

  overlayOpacity: 0.85,
  containerBackground: 'rgba(8, 12, 28, 0.85)',
  cardBackground: 'rgba(16, 20, 44, 0.85)',

  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',

  borderColor: 'rgba(48, 52, 80, 0.85)',
  glowColor: 'rgba(100, 200, 160, 0.15)',

  highlyCompatibleColor: '#22c55e',
  compatibleColor: '#3b82f6',
  neutralColor: '#7880a8',
  tensionColor: '#f97316',
  conflictingColor: '#ef4444',

  sliderTrackColor: 'rgba(48, 52, 80, 0.85)',
  sliderThumbSize: '16px',

  accentColor: '#6366f1',

  buttonBackground: 'rgba(48, 52, 80, 0.6)',
  buttonHoverBackground: 'rgba(60, 64, 96, 0.8)',
  focusOutlineColor: '#6366f1',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Compute cosine similarity between two Schwartz value vectors.
 * Returns value in [0, 1] range (mapped from [-1, 1] via (1+cos)/2).
 */
export function computeCosineSimilarity(
  a: Record<SchwartzValue, number>,
  b: Record<SchwartzValue, number>,
): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const value of ALL_SCHWARTZ_VALUES) {
    const va = a[value] ?? 0.5;
    const vb = b[value] ?? 0.5;
    dotProduct += va * vb;
    magnitudeA += va * va;
    magnitudeB += vb * vb;
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitude === 0) return 0.5;

  const cosSim = dotProduct / magnitude;
  return (1 + cosSim) / 2;
}

/**
 * Compute full compatibility result between two cultural profiles.
 */
export function computeCompatibility(
  profileA: CulturalProfile,
  profileB: CulturalProfile,
): CompatibilityResult {
  const overallScore = computeCosineSimilarity(profileA.values, profileB.values);
  const level = scoreToCompatibilityLevel(overallScore);

  const dimensionDeltas: Record<string, number> = {};
  const sharedStrengths: SchwartzValue[] = [];
  const tensions: SchwartzValue[] = [];

  for (const value of ALL_SCHWARTZ_VALUES) {
    const va = profileA.values[value] ?? 0.5;
    const vb = profileB.values[value] ?? 0.5;
    const delta = va - vb;
    dimensionDeltas[value] = delta;

    if (va >= 0.7 && vb >= 0.7) {
      sharedStrengths.push(value);
    }

    if (Math.abs(delta) >= 0.4) {
      tensions.push(value);
    }
  }

  const categoryScores: Record<string, number> = {};
  for (const [cat, meta] of Object.entries(SCHWARTZ_CATEGORY_CONFIG)) {
    let sum = 0;
    for (const val of meta.values) {
      const va = profileA.values[val] ?? 0.5;
      const vb = profileB.values[val] ?? 0.5;
      sum += 1 - Math.abs(va - vb);
    }
    categoryScores[cat] = sum / meta.values.length;
  }

  return {
    overallScore,
    level,
    dimensionDeltas: dimensionDeltas as Record<SchwartzValue, number>,
    sharedStrengths,
    tensions,
    cooperationCompatibility: profileA.cooperationIndex * profileB.cooperationIndex,
    categoryScores: categoryScores as Record<SchwartzCategory, number>,
  };
}

/**
 * Map a compatibility score to a qualitative level.
 */
export function scoreToCompatibilityLevel(score: number): CompatibilityLevel {
  if (score >= 0.85) return 'highly-compatible';
  if (score >= 0.7) return 'compatible';
  if (score >= 0.5) return 'neutral';
  if (score >= 0.35) return 'tension';
  return 'conflicting';
}

/**
 * Get the theme colour for a compatibility level.
 */
export function getCompatibilityColor(
  level: CompatibilityLevel,
  theme: CulturalProfileEditorTheme,
): string {
  switch (level) {
    case 'highly-compatible': return theme.highlyCompatibleColor;
    case 'compatible': return theme.compatibleColor;
    case 'neutral': return theme.neutralColor;
    case 'tension': return theme.tensionColor;
    case 'conflicting': return theme.conflictingColor;
    default: return theme.textMuted;
  }
}

/**
 * Get a human-readable label for a compatibility level.
 */
export function getCompatibilityLabel(level: CompatibilityLevel): string {
  switch (level) {
    case 'highly-compatible': return 'Highly Compatible';
    case 'compatible': return 'Compatible';
    case 'neutral': return 'Neutral';
    case 'tension': return 'Tension';
    case 'conflicting': return 'Conflicting';
    default: return 'Unknown';
  }
}

/**
 * Create a default (neutral) cultural profile for an agent.
 */
export function createDefaultProfile(agentId: string, agentName?: string): CulturalProfile {
  const preset = CULTURAL_FAMILY_PRESETS['balanced-neutral'];
  return {
    agentId,
    agentName,
    culturalFamily: 'balanced-neutral',
    values: { ...preset.presetValues },
    cooperationIndex: preset.suggestedCooperationIndex,
    lastModified: Date.now(),
  };
}

/**
 * Clamp a number to [0, 1] range.
 */
export function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Format a value as a percentage string.
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Apply overlay opacity to an RGBA string.
 */
export function applyOverlayOpacity(rgbaBase: string, opacity: number): string {
  const match = rgbaBase.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (!match) return rgbaBase;
  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${clampUnit(opacity).toFixed(2)})`;
}
