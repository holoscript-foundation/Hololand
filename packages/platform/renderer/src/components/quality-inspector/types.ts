/**
 * Quality Inspector Types
 *
 * Type definitions for quality inspector component and related utilities.
 */

import type { QualityProfileName } from '@hololand/quality-profiles';

// =============================================================================
// EFFECT PARAMETERS
// =============================================================================

/**
 * Fire effect parameters
 */
export interface FireEffectParams {
  /** Fire intensity (0-1) */
  intensity: number;
  /** Fire color as hex string */
  color: string;
  /** Particle count (10-5000) */
  particleCount: number;
  /** Fire size scale multiplier */
  sizeScale: number;
  /** Emission rate (particles per second) */
  emissionRate: number;
}

// =============================================================================
// LOD PARAMETERS
// =============================================================================

/**
 * Level-of-detail configuration
 */
export interface LODParams {
  /** Enable LOD system */
  enabled: boolean;
  /** Number of LOD levels */
  levels: number;
  /** Distance multiplier for LOD transitions */
  distanceMultiplier: number;
  /** Auto-switch LOD based on distance */
  autoSwitch: boolean;
  /** Maximum distance for LOD 0 (highest quality) */
  maxDistanceLOD0: number;
}

// =============================================================================
// GEOMETRY PARAMETERS
// =============================================================================

/**
 * Geometry resolution settings
 */
export interface GeometryParams {
  /** Maximum polygon count */
  maxPolyCount: number;
  /** Maximum texture size (pixels) */
  maxTextureSize: number;
  /** Anisotropic filtering level */
  anisotropy: number;
  /** Shadow map resolution */
  shadowMapSize: number;
}

// =============================================================================
// QUALITY PRESET
// =============================================================================

/**
 * Complete quality configuration preset
 */
export interface QualityPreset {
  /** Preset identifier */
  id: string;
  /** Preset display name */
  name: string;
  /** Profile tier */
  profile: QualityProfileName;
  /** LOD parameters */
  lod: LODParams;
  /** Geometry parameters */
  geometry: GeometryParams;
  /** Fire effect parameters (optional) */
  fireEffect?: FireEffectParams;
  /** Custom user preset */
  isCustom: boolean;
  /** Creation timestamp */
  createdAt: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Quality inspector component props
 */
export interface QualityInspectorProps {
  /** Current quality profile */
  currentProfile: QualityProfileName;
  /** Callback when profile changes */
  onProfileChange?: (profile: QualityProfileName) => void;
  /** Callback when LOD params change */
  onLODChange?: (params: LODParams) => void;
  /** Callback when geometry params change */
  onGeometryChange?: (params: GeometryParams) => void;
  /** Callback when fire effect params change */
  onFireEffectChange?: (params: FireEffectParams) => void;
  /** Callback when preset is saved */
  onPresetSave?: (preset: QualityPreset) => void;
  /** Callback when preset is loaded */
  onPresetLoad?: (preset: QualityPreset) => void;
  /** Available presets */
  presets?: QualityPreset[];
  /** Show fire effect controls */
  showFireControls?: boolean;
  /** Enable real-time preview */
  enablePreview?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Tab identifier for inspector UI
 */
export type InspectorTab = 'quality' | 'lod' | 'geometry' | 'fire';

/**
 * Profile metadata for UI display
 */
export interface ProfileMetadata {
  name: QualityProfileName;
  label: string;
  color: string;
  description: string;
}
