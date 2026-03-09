/**
 * AR Mobile UI Components
 *
 * Barrel export for mobile AR UI components used in HoloLand studio.
 * All components are touch-friendly with minimum 44px tap targets
 * and follow the HoloLand dark theme design system.
 *
 * @module ar-mobile-ui
 */

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export { ARSessionPanel } from './ARSessionPanel';
export type { ARSessionPanelProps } from './ARSessionPanel';

export { PlaneDetectionOverlay } from './PlaneDetectionOverlay';
export type { PlaneDetectionOverlayProps } from './PlaneDetectionOverlay';

export { AnchorManagerPanel } from './AnchorManagerPanel';
export type { AnchorManagerPanelProps } from './AnchorManagerPanel';

export { GeospatialDebugOverlay } from './GeospatialDebugOverlay';
export type { GeospatialDebugOverlayProps } from './GeospatialDebugOverlay';

export { LightEstimationPanel } from './LightEstimationPanel';
export type { LightEstimationPanelProps } from './LightEstimationPanel';

export { ARPerformanceMonitor } from './ARPerformanceMonitor';
export type { ARPerformanceMonitorProps } from './ARPerformanceMonitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  // AR Session
  ARSessionStatus,
  TrackingQuality,
  EnvironmentInfo,
  ARSessionInfo,
  // Plane Detection
  PlaneClassification,
  DetectedPlane,
  // Anchors
  AnchorPersistenceStatus,
  AnchorSharingStatus,
  ARAnchor,
  // Geospatial Debug
  CompassHeading,
  ENUCoordinate,
  GeospatialDebugInfo,
  // Light Estimation
  DirectionalLight,
  LightEstimationInfo,
  // Performance
  ThermalState,
  BatteryInfo,
  ARPerformanceInfo,
} from './types';

export { MIN_TAP_TARGET, AR_COLORS } from './types';
