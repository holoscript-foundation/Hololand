/**
 * GeospatialBridge
 *
 * Native bridge for ARKit Location Anchors (iOS) and ARCore Geospatial API (Android).
 * Provides persistent AR content anchored to real-world GPS coordinates.
 *
 * ARCHITECTURE:
 * - iOS: ARKit Location Anchors (~5-10m accuracy)
 * - Android: ARCore Geospatial API + VPS (~1-5m accuracy)
 * - WebXR: Browser Geolocation API fallback (~3-15m accuracy)
 *
 * COORDINATE SYSTEM:
 * - Universal: WGS84 (latitude, longitude, altitude)
 * - Local: ENU (East-North-Up) for rendering
 *
 * @module GeospatialBridge
 */

import { registerPlugin } from '@capacitor/core';

// =============================================================================
// TYPES
// =============================================================================

/**
 * WGS84 Geographic Coordinate
 */
export interface WGS84Coordinate {
  /** Latitude in decimal degrees (-90 to 90) */
  latitude: number;
  /** Longitude in decimal degrees (-180 to 180) */
  longitude: number;
  /** Altitude in meters above WGS84 ellipsoid */
  altitude: number;
}

/**
 * Quaternion rotation
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Geospatial anchor result from native AR frameworks
 */
export interface NativeGeospatialAnchor {
  /** Platform-specific anchor ID */
  anchorId: string;
  /** WGS84 coordinates */
  coordinate: WGS84Coordinate;
  /** Orientation (quaternion) */
  rotation: Quaternion;
  /** Horizontal accuracy estimate (meters, 95% confidence) */
  horizontalAccuracy: number;
  /** Vertical accuracy estimate (meters, 95% confidence) */
  verticalAccuracy: number | null;
  /** Platform that created this anchor */
  platform: 'arkit' | 'arcore' | 'webxr';
  /** Timestamp when anchor was created (ms since epoch) */
  timestamp: number;
}

/**
 * AR session state
 */
export type ARSessionState =
  | 'not-available'
  | 'not-tracking'
  | 'insufficient-features'
  | 'limited'
  | 'normal'
  | 'relocalizing';

/**
 * VPS (Visual Positioning Service) availability
 */
export type VPSAvailability =
  | 'unknown'
  | 'available'
  | 'unavailable-insufficient-visual-data'
  | 'unavailable-device-incompatible';

/**
 * Geospatial tracking capabilities
 */
export interface GeospatialCapabilities {
  /** Whether geospatial tracking is supported on this device */
  supported: boolean;
  /** Whether VPS (Visual Positioning Service) is available */
  vpsAvailable: boolean;
  /** VPS availability reason */
  vpsAvailability: VPSAvailability;
  /** Estimated horizontal accuracy (meters) */
  horizontalAccuracy: number | null;
  /** Estimated vertical accuracy (meters) */
  verticalAccuracy: number | null;
  /** AR session state */
  sessionState: ARSessionState;
  /** Platform type */
  platform: 'arkit' | 'arcore' | 'webxr' | 'none';
}

/**
 * Options for creating a geospatial anchor
 */
export interface CreateGeospatialAnchorOptions {
  /** WGS84 coordinate for anchor placement */
  coordinate: WGS84Coordinate;
  /** Anchor orientation (defaults to identity if not provided) */
  rotation?: Quaternion;
  /** Optional label for debugging */
  label?: string;
}

/**
 * Options for resolving a geospatial anchor
 */
export interface ResolveGeospatialAnchorOptions {
  /** Native anchor ID to resolve */
  anchorId: string;
}

// =============================================================================
// PLUGIN INTERFACE
// =============================================================================

/**
 * Native plugin interface for geospatial AR
 */
export interface GeospatialBridgePlugin {
  /**
   * Initialize the AR session and check geospatial capabilities.
   * Must be called before any other methods.
   *
   * @returns Current geospatial capabilities
   */
  initialize(): Promise<GeospatialCapabilities>;

  /**
   * Start AR session with geospatial tracking enabled.
   * Required before creating or resolving anchors.
   *
   * iOS: Starts ARSession with ARGeoTrackingConfiguration
   * Android: Enables ARCore Geospatial Mode
   * WebXR: Starts XR session with geolocation permission
   */
  startARSession(): Promise<{ success: boolean }>;

  /**
   * Stop AR session and release resources.
   */
  stopARSession(): Promise<{ success: boolean }>;

  /**
   * Create a geospatial anchor at a GPS location.
   *
   * iOS: Creates ARGeoAnchor with CLLocationCoordinate2D
   * Android: Creates Anchor with Geospatial API
   * WebXR: Creates virtual anchor (no native AR anchor support)
   *
   * @param options Anchor creation options
   * @returns Created anchor
   */
  createGeospatialAnchor(
    options: CreateGeospatialAnchorOptions,
  ): Promise<NativeGeospatialAnchor>;

  /**
   * Resolve a geospatial anchor to get its current transform.
   * Used to track anchor position in AR session.
   *
   * @param options Resolve options
   * @returns Anchor with updated pose
   */
  resolveGeospatialAnchor(
    options: ResolveGeospatialAnchorOptions,
  ): Promise<NativeGeospatialAnchor>;

  /**
   * Remove a geospatial anchor from the AR session.
   *
   * @param options Anchor ID to remove
   */
  removeGeospatialAnchor(options: { anchorId: string }): Promise<{ success: boolean }>;

  /**
   * Get current geospatial capabilities and session state.
   * Call periodically to check tracking quality.
   */
  getCapabilities(): Promise<GeospatialCapabilities>;

  /**
   * Request location permissions (required for geospatial tracking).
   *
   * iOS: Requests "When In Use" location permission
   * Android: Requests FINE_LOCATION permission
   * WebXR: Requests browser geolocation permission
   */
  requestLocationPermission(): Promise<{ granted: boolean }>;

  /**
   * Check if location permissions have been granted.
   */
  checkLocationPermission(): Promise<{ granted: boolean }>;
}

// =============================================================================
// PLUGIN REGISTRATION
// =============================================================================

/**
 * GeospatialBridge native plugin
 *
 * Provides access to ARKit Location Anchors (iOS) and ARCore Geospatial API (Android).
 */
const GeospatialBridge = registerPlugin<GeospatialBridgePlugin>('GeospatialBridge', {
  web: async () => {
    // Lazy-load web implementation
    return import('./web/GeospatialBridgeWeb').then((m) => new m.GeospatialBridgeWeb());
  },
});

export default GeospatialBridge;

// =============================================================================
// CONVENIENCE HELPERS
// =============================================================================

/**
 * Check if geospatial AR is supported on this device
 */
export async function isGeospatialSupported(): Promise<boolean> {
  const capabilities = await GeospatialBridge.getCapabilities();
  return capabilities.supported;
}

/**
 * Check if VPS (Visual Positioning Service) is available
 */
export async function isVPSAvailable(): Promise<boolean> {
  const capabilities = await GeospatialBridge.getCapabilities();
  return capabilities.vpsAvailable;
}

/**
 * Request location permission if not already granted
 */
export async function ensureLocationPermission(): Promise<boolean> {
  const { granted } = await GeospatialBridge.checkLocationPermission();
  if (granted) return true;

  const result = await GeospatialBridge.requestLocationPermission();
  return result.granted;
}

/**
 * Initialize geospatial AR and start session
 *
 * Convenience wrapper that:
 * 1. Requests location permission
 * 2. Initializes AR session
 * 3. Starts geospatial tracking
 *
 * @returns Capabilities if successful, null if failed
 */
export async function initializeGeospatialAR(): Promise<GeospatialCapabilities | null> {
  try {
    // Request permission
    const permissionGranted = await ensureLocationPermission();
    if (!permissionGranted) {
      console.error('[GeospatialBridge] Location permission denied');
      return null;
    }

    // Initialize
    const capabilities = await GeospatialBridge.initialize();
    if (!capabilities.supported) {
      console.error('[GeospatialBridge] Geospatial AR not supported on this device');
      return null;
    }

    // Start session
    const { success } = await GeospatialBridge.startARSession();
    if (!success) {
      console.error('[GeospatialBridge] Failed to start AR session');
      return null;
    }

    return capabilities;
  } catch (error) {
    console.error('[GeospatialBridge] Initialization failed:', error);
    return null;
  }
}

/**
 * Calculate Haversine distance between two WGS84 coordinates
 *
 * @param a First coordinate
 * @param b Second coordinate
 * @returns Distance in meters
 */
export function haversineDistance(a: WGS84Coordinate, b: WGS84Coordinate): number {
  const EARTH_RADIUS = 6371000; // meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * Calculate bearing from point A to point B
 *
 * @param from Starting coordinate
 * @param to Target coordinate
 * @returns Bearing in degrees (0-360, 0=North, 90=East)
 */
export function calculateBearing(from: WGS84Coordinate, to: WGS84Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Create identity quaternion (no rotation)
 */
export function identityQuaternion(): Quaternion {
  return { x: 0, y: 0, z: 0, w: 1 };
}
