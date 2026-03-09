/**
 * Mobile AR UI Components
 *
 * Comprehensive set of AR-specific UI components for mobile applications.
 * Designed for iOS/Android with ARKit/ARCore integration.
 *
 * @package @hololand/ar-mobile-companion
 */

// =============================================================================
// COMPONENTS
// =============================================================================

export { PlaneDetectionReticle } from './PlaneDetectionReticle';
export type { PlaneDetectionReticleProps } from './PlaneDetectionReticle';

export { AnchorPlacementControls } from './AnchorPlacementControls';
export type {
  AnchorPlacementControlsProps,
  AnchorTransform,
} from './AnchorPlacementControls';

export { GeospatialPOIMarker } from './GeospatialPOIMarker';
export type {
  GeospatialPOIMarkerProps,
  GeospatialPOI,
  POICategory,
} from './GeospatialPOIMarker';

export { DistanceIndicator } from './DistanceIndicator';
export type {
  DistanceIndicatorProps,
  MeasurementMode,
  DistanceUnit,
  MeasurementPoint,
  Measurement,
} from './DistanceIndicator';

export { SurfaceConstraintVisualization } from './SurfaceConstraintVisualization';
export type {
  SurfaceConstraintVisualizationProps,
  SurfaceConstraint,
  SurfaceAnalysis,
} from './SurfaceConstraintVisualization';

export { LightEstimationFeedback } from './LightEstimationFeedback';
export type { LightEstimationFeedbackProps } from './LightEstimationFeedback';
