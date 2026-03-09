/**
 * Dragon Preview Types
 *
 * Type definitions for the DragonPreview studio component.
 * Provides an interactive 3D dragon model preview with LOD control,
 * fire effect parameters, and performance monitoring.
 *
 * Designed to integrate with the SceneProfilerDashboard for
 * comprehensive VR studio development workflows.
 *
 * @module dragon-preview/types
 */

import type React from 'react';
import type { BudgetHealthStatus, SceneProfilerTheme } from '../scene-profiler/types';

// =============================================================================
// LOD CONFIGURATION
// =============================================================================

/**
 * LOD level (0 = highest detail, 3 = lowest detail)
 */
export type DragonLODLevel = 0 | 1 | 2 | 3;

/**
 * LOD level metadata for display
 */
export interface LODLevelInfo {
  /** LOD level */
  level: DragonLODLevel;
  /** Human-readable label */
  label: string;
  /** Approximate triangle percentage relative to LOD 0 */
  trianglePercent: number;
  /** Description of what changes at this LOD */
  description: string;
}

/**
 * LOD level definitions matching CreatureLODProfile strategy
 */
export const LOD_LEVEL_INFO: Record<DragonLODLevel, LODLevelInfo> = {
  0: {
    level: 0,
    label: 'Ultra',
    trianglePercent: 100,
    description: 'Full detail. All procedural geometry at original resolution.',
  },
  1: {
    level: 1,
    label: 'High',
    trianglePercent: 55,
    description: 'Medium detail. Hull -40%, Spline -50%, Membrane -40%.',
  },
  2: {
    level: 2,
    label: 'Medium',
    trianglePercent: 28,
    description: 'Low detail. Hull -70%, Spline -75%, Membrane -70%. Sub-membranes disabled.',
  },
  3: {
    level: 3,
    label: 'Low',
    trianglePercent: 10,
    description: 'Minimal detail. Hull bounding box, Spline linear, Membrane billboard.',
  },
};

// =============================================================================
// FIRE EFFECT CONTROLS
// =============================================================================

/**
 * Fire quality level (0 = low, 3 = ultra)
 */
export type FireQualityLevel = 0 | 1 | 2 | 3;

/**
 * Wind direction preset
 */
export type WindDirectionPreset = 'none' | 'north' | 'south' | 'east' | 'west' | 'up' | 'custom';

/**
 * Fire effect control state
 */
export interface FireEffectControls {
  /** Whether fire effect is enabled */
  enabled: boolean;
  /** Fire quality level (0-3) */
  quality: FireQualityLevel;
  /** Wind direction preset */
  windDirection: WindDirectionPreset;
  /** Custom wind vector (used when windDirection is 'custom') */
  customWindVector: { x: number; y: number; z: number };
  /** Wind strength (0-2) */
  windStrength: number;
  /** Turbulence intensity (0-1) */
  turbulence: number;
  /** Fire intensity multiplier (0-2) */
  intensity: number;
}

/**
 * Default fire effect controls
 */
export const DEFAULT_FIRE_CONTROLS: FireEffectControls = {
  enabled: true,
  quality: 1,
  windDirection: 'up',
  customWindVector: { x: 0, y: 1, z: 0 },
  windStrength: 0.3,
  turbulence: 0.5,
  intensity: 1.0,
};

/**
 * Wind direction vectors for presets
 */
export const WIND_DIRECTION_VECTORS: Record<WindDirectionPreset, { x: number; y: number; z: number }> = {
  none:  { x: 0, y: 0, z: 0 },
  north: { x: 0, y: 0, z: -1 },
  south: { x: 0, y: 0, z: 1 },
  east:  { x: 1, y: 0, z: 0 },
  west:  { x: -1, y: 0, z: 0 },
  up:    { x: 0, y: 1, z: 0 },
  custom: { x: 0, y: 1, z: 0 },
};

/**
 * Fire quality label map
 */
export const FIRE_QUALITY_LABELS: Record<FireQualityLevel, string> = {
  0: 'Low (12 steps)',
  1: 'Medium (24 steps)',
  2: 'High (32 steps)',
  3: 'Ultra (48 steps)',
};

// =============================================================================
// PERFORMANCE METRICS
// =============================================================================

/**
 * Dragon scene performance metrics
 */
export interface DragonPerformanceMetrics {
  /** Total triangle count in the scene */
  triangleCount: number;
  /** Total draw call count */
  drawCallCount: number;
  /** Current FPS */
  fps: number;
  /** Current frame time in ms */
  frameTimeMs: number;
  /** Performance health status */
  health: BudgetHealthStatus;
  /** GPU time estimate for fire pass (ms) */
  fireGpuTimeMs: number;
  /** Memory usage estimate (MB) */
  memoryEstimateMB: number;
}

/**
 * Performance health thresholds
 */
export const DRAGON_PERF_THRESHOLDS = {
  /** Triangle count thresholds */
  triangles: {
    healthy: 500_000,
    warning: 1_000_000,
    critical: 2_000_000,
  },
  /** Draw call thresholds */
  drawCalls: {
    healthy: 50,
    warning: 100,
    critical: 200,
  },
  /** FPS thresholds (lower bound) */
  fps: {
    healthy: 60,
    warning: 30,
    critical: 15,
  },
} as const;

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * DragonPreview component props
 */
export interface DragonPreviewProps {
  /** Path to dragon.glb model file */
  modelPath?: string;
  /** Current LOD level */
  lodLevel?: DragonLODLevel;
  /** Fire effect controls */
  fireControls?: FireEffectControls;
  /** Whether to show the ground plane */
  showGround?: boolean;
  /** Whether to show grid helper */
  showGrid?: boolean;
  /** Environment preset for lighting */
  environment?: 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'night' | 'park' | 'studio' | 'sunset' | 'warehouse';
  /** Camera auto-rotate */
  autoRotate?: boolean;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Custom CSS class */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
  /** Callback with performance metrics on each frame */
  onPerformanceUpdate?: (metrics: DragonPerformanceMetrics) => void;
}

/**
 * DragonInspector component props
 */
export interface DragonInspectorProps {
  /** Current LOD level */
  lodLevel: DragonLODLevel;
  /** LOD level change handler */
  onLODChange: (level: DragonLODLevel) => void;
  /** Fire effect controls state */
  fireControls: FireEffectControls;
  /** Fire controls change handler */
  onFireControlsChange: (controls: FireEffectControls) => void;
  /** Current performance metrics */
  performance: DragonPerformanceMetrics;
  /** Whether to show the SceneProfilerDashboard integration */
  showProfiler?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Theme override */
  theme?: Partial<DragonPreviewTheme>;
}

/**
 * DragonPreviewPanel (top-level integration) props
 */
export interface DragonPreviewPanelProps {
  /** Path to dragon.glb model file */
  modelPath?: string;
  /** Initial LOD level */
  initialLOD?: DragonLODLevel;
  /** Initial fire controls */
  initialFireControls?: Partial<FireEffectControls>;
  /** Whether to show SceneProfilerDashboard */
  showProfiler?: boolean;
  /** Whether inspector starts collapsed */
  inspectorCollapsed?: boolean;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
  /** Custom CSS class */
  className?: string;
  /** Custom style */
  style?: React.CSSProperties;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Dragon preview theme (extends scene profiler dark theme)
 */
export interface DragonPreviewTheme extends SceneProfilerTheme {
  /** Fire effect accent color */
  fireAccent: string;
  /** LOD indicator colors per level */
  lodColors: Record<DragonLODLevel, string>;
  /** Inspector panel width */
  inspectorWidth: number;
}

/**
 * Default dark theme consistent with VR studio aesthetic
 */
export const DEFAULT_DRAGON_PREVIEW_THEME: DragonPreviewTheme = {
  bg: '#0a0a1a',
  panelBg: '#121228',
  text: '#e0e0f0',
  accent: '#6366f1',
  healthy: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  exceeded: '#dc2626',
  grid: '#1a1a3e',
  border: '#2a2a4e',
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 12,
  fireAccent: '#ff6b35',
  lodColors: {
    0: '#22c55e',
    1: '#6366f1',
    2: '#f59e0b',
    3: '#ef4444',
  },
  inspectorWidth: 320,
};
