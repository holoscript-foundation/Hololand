/**
 * AR Mobile UI Types
 *
 * Shared type definitions for the AR mobile UI components.
 * Integrates with @hololand/mobile native bridge types for
 * geospatial anchors, AR session state, and VPS availability.
 *
 * @module ar-mobile-ui/types
 */

// =============================================================================
// AR SESSION
// =============================================================================

/** AR session lifecycle state */
export type ARSessionStatus = 'inactive' | 'initializing' | 'active' | 'paused' | 'error';

/** AR tracking quality indicator */
export type TrackingQuality = 'not-available' | 'limited' | 'normal' | 'excessive-motion' | 'insufficient-features';

/** Environment understanding capabilities */
export interface EnvironmentInfo {
  /** Whether the environment has been scanned */
  scanned: boolean;
  /** Estimated ambient light level (lux) */
  ambientLightLux: number;
  /** Number of detected feature points */
  featurePointCount: number;
  /** Current world mapping status */
  worldMappingStatus: 'not-available' | 'limited' | 'extending' | 'mapped';
}

/** AR session state passed to ARSessionPanel */
export interface ARSessionInfo {
  /** Current session status */
  status: ARSessionStatus;
  /** Tracking quality level */
  trackingQuality: TrackingQuality;
  /** Environment understanding info */
  environment: EnvironmentInfo;
  /** Duration of current session in seconds */
  sessionDurationSec: number;
  /** Whether camera permission is granted */
  cameraPermission: boolean;
  /** Whether location permission is granted */
  locationPermission: boolean;
}

// =============================================================================
// PLANE DETECTION
// =============================================================================

/** Detected plane classification */
export type PlaneClassification =
  | 'horizontal-up'    // floor, table
  | 'horizontal-down'  // ceiling
  | 'vertical'         // wall
  | 'unknown';

/** A detected AR plane */
export interface DetectedPlane {
  /** Unique plane identifier */
  planeId: string;
  /** Plane classification */
  classification: PlaneClassification;
  /** Center position in local coordinates [x, y, z] */
  center: [number, number, number];
  /** Plane extent (width x height) in meters */
  extent: [number, number];
  /** Whether the plane is currently tracked */
  isTracked: boolean;
}

// =============================================================================
// ANCHORS
// =============================================================================

/** Anchor persistence status */
export type AnchorPersistenceStatus = 'local-only' | 'persisting' | 'persisted' | 'shared' | 'error';

/** Sharing status for an anchor */
export type AnchorSharingStatus = 'not-shared' | 'sharing' | 'shared' | 'error';

/** An AR anchor with geospatial metadata */
export interface ARAnchor {
  /** Unique anchor identifier */
  anchorId: string;
  /** Human-readable label */
  label: string;
  /** WGS84 coordinates */
  latitude: number;
  longitude: number;
  altitude: number;
  /** Horizontal accuracy in meters */
  horizontalAccuracy: number;
  /** Vertical accuracy in meters */
  verticalAccuracy: number | null;
  /** Persistence status */
  persistence: AnchorPersistenceStatus;
  /** Sharing status */
  sharing: AnchorSharingStatus;
  /** Timestamp when anchor was created (ms since epoch) */
  createdAt: number;
  /** Whether the anchor is currently tracked */
  isTracked: boolean;
}

// =============================================================================
// GEOSPATIAL DEBUG
// =============================================================================

/** Compass heading information */
export interface CompassHeading {
  /** Magnetic heading in degrees (0-360) */
  magnetic: number;
  /** True heading in degrees (0-360) */
  trueHeading: number;
  /** Heading accuracy in degrees */
  accuracy: number;
}

/** ENU (East-North-Up) local coordinates */
export interface ENUCoordinate {
  /** East offset in meters from origin */
  east: number;
  /** North offset in meters from origin */
  north: number;
  /** Up offset in meters from origin */
  up: number;
}

/** Geospatial debug information */
export interface GeospatialDebugInfo {
  /** Current GPS latitude */
  latitude: number;
  /** Current GPS longitude */
  longitude: number;
  /** Current GPS altitude (meters above WGS84 ellipsoid) */
  altitude: number;
  /** GPS horizontal accuracy in meters */
  gpsAccuracy: number;
  /** VPS (Visual Positioning Service) status */
  vpsStatus: 'unavailable' | 'initializing' | 'tracking' | 'error';
  /** VPS horizontal accuracy in meters (null if unavailable) */
  vpsAccuracy: number | null;
  /** Compass heading */
  compass: CompassHeading;
  /** ENU local position relative to AR session origin */
  enuPosition: ENUCoordinate;
  /** Geospatial tracking confidence (0-1) */
  confidence: number;
}

// =============================================================================
// LIGHT ESTIMATION
// =============================================================================

/** Directional light information */
export interface DirectionalLight {
  /** Light direction vector [x, y, z] */
  direction: [number, number, number];
  /** Light intensity (0-1 normalized) */
  intensity: number;
  /** Light color as CSS color string */
  color: string;
}

/** Light estimation data from AR framework */
export interface LightEstimationInfo {
  /** Ambient light intensity in lux */
  ambientIntensity: number;
  /** Ambient color temperature in Kelvin */
  colorTemperature: number;
  /** Primary directional light (if estimated) */
  primaryLight: DirectionalLight | null;
  /** Whether light estimation is active */
  isActive: boolean;
  /** Spherical harmonics coefficients (if available) */
  sphericalHarmonics: number[] | null;
}

// =============================================================================
// AR PERFORMANCE
// =============================================================================

/** Thermal state of the device */
export type ThermalState = 'nominal' | 'fair' | 'serious' | 'critical';

/** Battery state information */
export interface BatteryInfo {
  /** Battery level (0-1) */
  level: number;
  /** Whether device is charging */
  isCharging: boolean;
}

/** AR performance metrics */
export interface ARPerformanceInfo {
  /** Current tracking quality */
  trackingQuality: TrackingQuality;
  /** Number of detected feature points */
  featurePointCount: number;
  /** Point cloud density (points per cubic meter) */
  pointCloudDensity: number;
  /** Current FPS */
  fps: number;
  /** Average FPS over last 30 seconds */
  averageFps: number;
  /** CPU usage percentage (0-100) */
  cpuUsage: number;
  /** GPU usage percentage (0-100, if available) */
  gpuUsage: number | null;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Battery info */
  battery: BatteryInfo;
  /** Device thermal state */
  thermalState: ThermalState;
  /** Number of active anchors */
  activeAnchors: number;
  /** Number of detected planes */
  detectedPlanes: number;
}

// =============================================================================
// SHARED STYLES
// =============================================================================

/** Minimum touch target size per Apple HIG / WCAG (44px) */
export const MIN_TAP_TARGET = 44;

/** AR UI color palette matching HoloLand dark theme */
export const AR_COLORS = {
  /** Panel background */
  panelBg: '#0f0f17',
  /** Panel background with slight transparency */
  panelBgTranslucent: 'rgba(15, 15, 23, 0.92)',
  /** Card/section background */
  cardBg: '#1a1a2e',
  /** Primary accent */
  accent: '#7c4dff',
  /** Success / active green */
  success: '#4caf50',
  /** Warning amber */
  warning: '#ff9800',
  /** Error red */
  error: '#f44336',
  /** Info blue */
  info: '#2196f3',
  /** Primary text */
  textPrimary: '#e0e0e0',
  /** Secondary text */
  textSecondary: '#888',
  /** Muted text */
  textMuted: '#555',
  /** Border color */
  border: '#1e1e2e',
  /** Border color active */
  borderActive: '#7c4dff',
  /** Horizontal plane indicator */
  planeHorizontal: '#4caf50',
  /** Vertical plane indicator */
  planeVertical: '#2196f3',
} as const;
