/**
 * Dragon Preview
 *
 * Interactive 3D dragon model preview component for the VR studio.
 * Provides GLB model loading, LOD control, fire effects,
 * performance monitoring, and SceneProfilerDashboard integration.
 *
 * Component hierarchy:
 *   DragonPreviewPanel (top-level integration)
 *     -> DragonPreview (R3F Canvas with dragon model)
 *       -> DragonModel (useGLTF loader, LOD switching)
 *       -> DragonFireEffect (particle fire system)
 *     -> DragonInspector (controls + perf counters)
 *       -> HealthIndicator (performance status)
 *       -> LOD Controls (slider + button group)
 *       -> Fire Controls (toggle, quality, wind, turbulence)
 *       -> Performance Counters (triangles, draw calls, FPS)
 *     -> SceneProfilerDashboard (optional overlay)
 *
 * @module dragon-preview
 */

// Top-level panel
export { DragonPreviewPanel } from './DragonPreviewPanel';
export type { DragonPreviewPanelProps } from './types';

// Preview viewport
export { DragonPreview } from './DragonPreview';
export type { DragonPreviewProps } from './types';

// Inspector panel
export { DragonInspector } from './DragonInspector';
export type { DragonInspectorProps } from './types';

// Fire effect
export { DragonFireEffect } from './DragonFireEffect';
export type { DragonFireEffectProps } from './DragonFireEffect';

// Performance hook
export { useDragonPerformance } from './useDragonPerformance';
export type {
  UseDragonPerformanceConfig,
  UseDragonPerformanceReturn,
} from './useDragonPerformance';

// Types
export type {
  DragonLODLevel,
  LODLevelInfo,
  FireQualityLevel,
  WindDirectionPreset,
  FireEffectControls,
  DragonPerformanceMetrics,
  DragonPreviewTheme,
} from './types';

// Constants
export {
  LOD_LEVEL_INFO,
  DEFAULT_FIRE_CONTROLS,
  WIND_DIRECTION_VECTORS,
  FIRE_QUALITY_LABELS,
  DRAGON_PERF_THRESHOLDS,
  DEFAULT_DRAGON_PREVIEW_THEME,
} from './types';
