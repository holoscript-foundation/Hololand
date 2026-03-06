/**
 * GeospatialAnchorBridge
 *
 * Bridges the SharedSpatialAnchorManager with WGS84 geospatial coordinates,
 * enabling spatial anchors to persist across devices via the only universal
 * reference frame: GPS lat/lon/alt.
 *
 * PROBLEM:
 * SharedSpatialAnchorManager uses local Vec3 coordinates relative to a world
 * origin. These are meaningless on a different device in a different physical
 * space. Geospatial coordinates (WGS84) are the only universal anchor shared
 * by all form factors -- VR headsets, AR glasses, phones, cars.
 *
 * SOLUTION:
 * This bridge maintains a mapping between local Vec3 positions and WGS84
 * coordinates. When a geospatial origin is established (via GPS, VPS, or
 * manual calibration), all local anchors can be projected to/from geospatial
 * space for cross-device sharing.
 *
 * COORDINATE SYSTEM:
 * - Local: Right-handed Y-up (Three.js / WebXR convention)
 *   - +X = East, +Y = Up, +Z = South (EUS)
 * - Geospatial: WGS84 (lat, lon, alt)
 * - Conversion uses a tangent plane approximation (valid within ~10km of origin)
 *
 * @module GeospatialAnchorBridge
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type { GeospatialCoordinate, GeospatialSource } from './CrossRealityContinuityTypes';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Earth's mean radius in meters (WGS84) */
const EARTH_RADIUS_M = 6_371_000;

/** Degrees to radians */
const DEG_TO_RAD = Math.PI / 180;

/** Radians to degrees */
const RAD_TO_DEG = 180 / Math.PI;

// =============================================================================
// GEOSPATIAL ORIGIN
// =============================================================================

/**
 * The geospatial origin anchoring the local coordinate system to the real world.
 * All local Vec3 ↔ WGS84 conversions are relative to this origin.
 */
export interface GeospatialOrigin {
  /** WGS84 coordinate of the local origin (0,0,0) */
  coordinate: GeospatialCoordinate;
  /** Heading offset: degrees clockwise from true north to local +X axis */
  headingOffsetDeg: number;
  /** When this origin was calibrated */
  calibratedAt: number;
  /** Calibration quality (0-1, higher = more accurate) */
  quality: number;
}

// =============================================================================
// GEOSPATIAL ANCHOR DATA
// =============================================================================

/**
 * An anchor enriched with geospatial coordinates.
 */
export interface GeospatialAnchor {
  /** Anchor ID from SharedSpatialAnchorManager */
  anchorId: string;
  /** Local-space position */
  localPosition: Vec3;
  /** Computed geospatial coordinate (null if no origin calibrated) */
  geospatial: GeospatialCoordinate | null;
  /** Whether the geospatial coordinate is stale (origin changed since computation) */
  stale: boolean;
}

// =============================================================================
// BRIDGE CONFIGURATION
// =============================================================================

export interface GeospatialAnchorBridgeConfig {
  /** Staleness threshold: recompute geospatial coords if origin changed (ms) */
  stalenessThresholdMs?: number;
  /** Default horizontal accuracy when converting from local coords (meters) */
  defaultHorizontalAccuracy?: number;
  /** Default positioning source for converted coordinates */
  defaultSource?: GeospatialSource;
}

// =============================================================================
// BRIDGE EVENTS
// =============================================================================

export interface GeospatialBridgeEventMap {
  'origin:calibrated': { origin: GeospatialOrigin };
  'origin:lost': { reason: string };
  'anchor:geolocated': { anchorId: string; geospatial: GeospatialCoordinate };
}

type EventHandler = (event: any) => void;

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export class GeospatialAnchorBridge {
  private origin: GeospatialOrigin | null = null;
  private anchors: Map<string, GeospatialAnchor> = new Map();
  private config: Required<GeospatialAnchorBridgeConfig>;
  private listeners: Map<string, Set<EventHandler>> = new Map();

  constructor(config?: GeospatialAnchorBridgeConfig) {
    this.config = {
      stalenessThresholdMs: config?.stalenessThresholdMs ?? 60000,
      defaultHorizontalAccuracy: config?.defaultHorizontalAccuracy ?? 5.0,
      defaultSource: config?.defaultSource ?? 'manual',
    };
  }

  // ---------------------------------------------------------------------------
  // ORIGIN MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Set the geospatial origin, anchoring local coordinates to the real world.
   */
  calibrateOrigin(coordinate: GeospatialCoordinate, headingOffsetDeg: number = 0): void {
    this.origin = {
      coordinate,
      headingOffsetDeg,
      calibratedAt: Date.now(),
      quality: this.estimateQuality(coordinate),
    };

    // Mark all existing anchors as stale
    for (const anchor of this.anchors.values()) {
      anchor.stale = true;
    }

    this.emit('origin:calibrated', { origin: this.origin });
    logger.info(`[GeoBridge] Origin calibrated: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
  }

  /**
   * Clear the geospatial origin.
   */
  clearOrigin(reason: string = 'manual'): void {
    this.origin = null;
    for (const anchor of this.anchors.values()) {
      anchor.geospatial = null;
      anchor.stale = true;
    }
    this.emit('origin:lost', { reason });
  }

  /**
   * Get the current geospatial origin (null if not calibrated).
   */
  getOrigin(): GeospatialOrigin | null {
    return this.origin;
  }

  /**
   * Check if a geospatial origin is calibrated.
   */
  isCalibrated(): boolean {
    return this.origin !== null;
  }

  // ---------------------------------------------------------------------------
  // COORDINATE CONVERSION
  // ---------------------------------------------------------------------------

  /**
   * Convert a local Vec3 position to WGS84 geospatial coordinates.
   * Returns null if no origin is calibrated.
   */
  localToGeospatial(localPos: Vec3): GeospatialCoordinate | null {
    if (!this.origin) return null;

    const originLat = this.origin.coordinate.latitude * DEG_TO_RAD;
    const originLon = this.origin.coordinate.longitude * DEG_TO_RAD;
    const headingRad = this.origin.headingOffsetDeg * DEG_TO_RAD;

    // Rotate local coords by heading offset (local +X → rotated East)
    const eastM = localPos.x * Math.cos(headingRad) - localPos.z * Math.sin(headingRad);
    const northM = localPos.x * Math.sin(headingRad) + localPos.z * Math.cos(headingRad);

    // Tangent plane approximation (meters → degrees)
    const dLat = northM / EARTH_RADIUS_M;
    const dLon = eastM / (EARTH_RADIUS_M * Math.cos(originLat));

    const lat = (originLat + dLat) * RAD_TO_DEG;
    const lon = (originLon + dLon) * RAD_TO_DEG;
    const alt = this.origin.coordinate.altitude !== null
      ? this.origin.coordinate.altitude + localPos.y
      : null;

    return {
      latitude: lat,
      longitude: lon,
      altitude: alt,
      horizontalAccuracy: this.config.defaultHorizontalAccuracy + (this.origin.coordinate.horizontalAccuracy ?? 0),
      verticalAccuracy: this.origin.coordinate.verticalAccuracy,
      heading: null,
      source: this.config.defaultSource,
      capturedAt: Date.now(),
    };
  }

  /**
   * Convert a WGS84 geospatial coordinate to local Vec3 position.
   * Returns null if no origin is calibrated.
   */
  geospatialToLocal(coord: GeospatialCoordinate): Vec3 | null {
    if (!this.origin) return null;

    const originLat = this.origin.coordinate.latitude * DEG_TO_RAD;
    const originLon = this.origin.coordinate.longitude * DEG_TO_RAD;
    const headingRad = this.origin.headingOffsetDeg * DEG_TO_RAD;

    const targetLat = coord.latitude * DEG_TO_RAD;
    const targetLon = coord.longitude * DEG_TO_RAD;

    // Degrees → meters (tangent plane)
    const northM = (targetLat - originLat) * EARTH_RADIUS_M;
    const eastM = (targetLon - originLon) * EARTH_RADIUS_M * Math.cos(originLat);

    // Inverse heading rotation
    const x = eastM * Math.cos(-headingRad) - northM * Math.sin(-headingRad);
    const z = eastM * Math.sin(-headingRad) + northM * Math.cos(-headingRad);
    const y = (coord.altitude !== null && this.origin.coordinate.altitude !== null)
      ? coord.altitude - this.origin.coordinate.altitude
      : 0;

    return { x, y, z };
  }

  /**
   * Compute the distance in meters between two geospatial coordinates
   * using the Haversine formula.
   */
  static haversineDistance(a: GeospatialCoordinate, b: GeospatialCoordinate): number {
    const lat1 = a.latitude * DEG_TO_RAD;
    const lat2 = b.latitude * DEG_TO_RAD;
    const dLat = (b.latitude - a.latitude) * DEG_TO_RAD;
    const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;

    const sinHalfDLat = Math.sin(dLat / 2);
    const sinHalfDLon = Math.sin(dLon / 2);
    const h = sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
  }

  // ---------------------------------------------------------------------------
  // ANCHOR MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Register a local anchor and compute its geospatial coordinates.
   */
  registerAnchor(anchorId: string, localPosition: Vec3): GeospatialAnchor {
    const geospatial = this.localToGeospatial(localPosition);
    const anchor: GeospatialAnchor = {
      anchorId,
      localPosition,
      geospatial,
      stale: false,
    };
    this.anchors.set(anchorId, anchor);

    if (geospatial) {
      this.emit('anchor:geolocated', { anchorId, geospatial });
    }
    return anchor;
  }

  /**
   * Update an anchor's local position and recompute geospatial coordinates.
   */
  updateAnchorPosition(anchorId: string, localPosition: Vec3): GeospatialAnchor | null {
    const anchor = this.anchors.get(anchorId);
    if (!anchor) return null;

    anchor.localPosition = localPosition;
    anchor.geospatial = this.localToGeospatial(localPosition);
    anchor.stale = false;

    if (anchor.geospatial) {
      this.emit('anchor:geolocated', { anchorId, geospatial: anchor.geospatial });
    }
    return anchor;
  }

  /**
   * Import an anchor from a remote device using geospatial coordinates.
   * Converts to local space if origin is calibrated.
   */
  importRemoteAnchor(anchorId: string, geospatial: GeospatialCoordinate): GeospatialAnchor {
    const localPosition = this.geospatialToLocal(geospatial) ?? { x: 0, y: 0, z: 0 };
    const anchor: GeospatialAnchor = {
      anchorId,
      localPosition,
      geospatial,
      stale: !this.isCalibrated(),
    };
    this.anchors.set(anchorId, anchor);
    return anchor;
  }

  /**
   * Get an anchor by ID.
   */
  getAnchor(anchorId: string): GeospatialAnchor | undefined {
    return this.anchors.get(anchorId);
  }

  /**
   * Get all registered anchors.
   */
  getAllAnchors(): GeospatialAnchor[] {
    return Array.from(this.anchors.values());
  }

  /**
   * Remove an anchor.
   */
  removeAnchor(anchorId: string): boolean {
    return this.anchors.delete(anchorId);
  }

  /**
   * Recompute geospatial coordinates for all stale anchors.
   */
  refreshStaleAnchors(): number {
    let refreshed = 0;
    for (const anchor of this.anchors.values()) {
      if (anchor.stale && this.origin) {
        anchor.geospatial = this.localToGeospatial(anchor.localPosition);
        anchor.stale = false;
        refreshed++;
      }
    }
    return refreshed;
  }

  /**
   * Get the number of registered anchors.
   */
  get anchorCount(): number {
    return this.anchors.size;
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // VPS (VISUAL POSITIONING SYSTEM) CALIBRATION
  // ---------------------------------------------------------------------------

  /**
   * VPS calibration result from a visual positioning service.
   * VPS matches camera images against a pre-mapped 3D point cloud to determine
   * precise position (typically <1m accuracy vs GPS's 3-15m).
   */
  calibrateFromVPS(
    coordinate: GeospatialCoordinate,
    headingOffsetDeg: number,
    confidence: number,
    provider: string = 'unknown',
  ): { quality: number; improved: boolean } {
    const previousOrigin = this.origin;
    const previousQuality = previousOrigin?.quality ?? 0;

    // Scale accuracy by confidence (higher confidence = better accuracy)
    const vpsCoordinate: GeospatialCoordinate = {
      ...coordinate,
      source: 'vps',
      horizontalAccuracy: Math.max(0.1, coordinate.horizontalAccuracy * (1 - confidence * 0.8)),
    };

    this.calibrateOrigin(vpsCoordinate, headingOffsetDeg);

    const newQuality = this.origin!.quality;
    const improved = newQuality > previousQuality;

    this.emit('vps:calibrated', {
      provider,
      confidence,
      quality: newQuality,
      improved,
      previousQuality,
    });

    logger.info(`[GeoBridge] VPS calibration from ${provider}: quality ${previousQuality.toFixed(2)} → ${newQuality.toFixed(2)} (confidence: ${(confidence * 100).toFixed(1)}%)`);

    return { quality: newQuality, improved };
  }

  /**
   * Attempt progressive refinement: only accept a new calibration if it
   * improves upon the current origin quality.
   * Returns true if the calibration was accepted.
   */
  refineOrigin(coordinate: GeospatialCoordinate, headingOffsetDeg: number = 0): boolean {
    const candidateQuality = this.estimateQuality(coordinate);
    const currentQuality = this.origin?.quality ?? 0;

    if (candidateQuality > currentQuality) {
      this.calibrateOrigin(coordinate, headingOffsetDeg);
      logger.info(`[GeoBridge] Origin refined: ${currentQuality.toFixed(2)} → ${candidateQuality.toFixed(2)}`);
      return true;
    }

    logger.debug(`[GeoBridge] Refinement rejected: candidate ${candidateQuality.toFixed(2)} <= current ${currentQuality.toFixed(2)}`);
    return false;
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private estimateQuality(coord: GeospatialCoordinate): number {
    // Quality based on positioning source and accuracy
    const sourceQuality: Record<GeospatialSource, number> = {
      'fiducial-marker': 0.99,
      'vps': 0.95,
      'ble-beacon': 0.80,
      'wifi-fingerprint': 0.75,
      'gps': 0.70,
      'dead-reckoning': 0.40,
      'manual': 0.50,
      'unknown': 0.20,
    };

    const base = sourceQuality[coord.source] ?? 0.20;
    // Penalize poor accuracy
    const accuracyPenalty = Math.min(coord.horizontalAccuracy / 100, 0.5);
    return Math.max(0, base - accuracyPenalty);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createGeospatialAnchorBridge(
  config?: GeospatialAnchorBridgeConfig,
): GeospatialAnchorBridge {
  return new GeospatialAnchorBridge(config);
}
