/**
 * GeospatialAnchorProvider
 *
 * Wraps the browser Geolocation API and provides accuracy-tiered positioning
 * for cross-reality agent continuity. Supports one-shot position acquisition,
 * continuous watching, manual position override (indoor/testing), Haversine
 * distance calculation, and accuracy tier classification.
 *
 * POSITIONING SOURCES (by accuracy):
 *   arkit-arcore : <0.1m (AR framework, cm-level)
 *   uwb          : <0.5m (Ultra-Wideband, short range)
 *   wifi-rtt     : 1-3m  (WiFi RTT, indoor)
 *   gps          : 1-5m  (GNSS, outdoor)
 *   manual       : varies (user-specified or configured)
 *
 * ACCURACY TIERS:
 *   high   : < 2m
 *   medium : < 10m
 *   low    : < 50m
 *   coarse : >= 50m
 *
 * EVENT SYSTEM:
 *   'position-updated' : fired on each new position (watch or manual)
 *   'error'            : fired on geolocation errors
 *
 * INTEGRATION:
 *   Used by CrossRealitySessionManager to populate SpatialContextSummary.geospatial
 *   during device handoffs. The GeospatialCoordinate type from
 *   CrossRealityContinuityTypes is the canonical geospatial representation.
 *
 * @module GeospatialAnchorProvider
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A geospatial position with metadata about its source and accuracy.
 */
export interface GeospatialPosition {
  /** Latitude in decimal degrees (WGS84) */
  latitude: number;
  /** Longitude in decimal degrees (WGS84) */
  longitude: number;
  /** Altitude in meters above WGS84 ellipsoid (null if unknown) */
  altitude: number | null;
  /** Horizontal accuracy in meters (95% confidence) */
  accuracy: number;
  /** Positioning source used */
  source: 'gps' | 'wifi-rtt' | 'uwb' | 'arkit-arcore' | 'manual';
  /** Timestamp when this position was captured (ms since epoch) */
  timestamp: number;
}

/**
 * Configuration for the GeospatialAnchorProvider.
 */
export interface GeospatialAnchorProviderConfig {
  /** Whether to request high accuracy from the Geolocation API (default: true) */
  enableHighAccuracy?: boolean;
  /** Maximum acceptable age of a cached position in ms (default: 30000) */
  maxAgeMs?: number;
  /** Timeout for a single position request in ms (default: 10000) */
  timeoutMs?: number;
  /** Whether to fall back to manual position when geolocation is unavailable (default: false) */
  fallbackToManual?: boolean;
}

/**
 * Accuracy tier name.
 */
export type AccuracyTier = 'high' | 'medium' | 'low' | 'coarse';

/**
 * Events emitted by the provider.
 */
export type GeospatialEvent = 'position-updated' | 'error';

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: Required<GeospatialAnchorProviderConfig> = {
  enableHighAccuracy: true,
  maxAgeMs: 30000,
  timeoutMs: 10000,
  fallbackToManual: false,
};

/** Earth's mean radius in meters (WGS84 approximation) */
const EARTH_RADIUS_M = 6_371_000;

// =============================================================================
// GEOSPATIAL ANCHOR PROVIDER
// =============================================================================

export class GeospatialAnchorProvider {
  private config: Required<GeospatialAnchorProviderConfig>;
  private lastPosition: GeospatialPosition | null = null;
  private watchId: number | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config?: GeospatialAnchorProviderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // ONE-SHOT POSITION
  // ---------------------------------------------------------------------------

  /**
   * Get the current geospatial position (one-shot).
   *
   * Attempts the browser Geolocation API first. If geolocation is unavailable
   * and fallbackToManual is enabled (and a manual position has been set),
   * returns the manual position. Otherwise throws.
   */
  async getCurrentPosition(): Promise<GeospatialPosition> {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        return await this.requestBrowserPosition();
      } catch (err) {
        logger.warn('[GeospatialAnchorProvider] Browser geolocation failed', {
          error: err instanceof Error ? err.message : String(err),
        });

        if (this.config.fallbackToManual && this.lastPosition?.source === 'manual') {
          logger.info('[GeospatialAnchorProvider] Falling back to manual position');
          return this.lastPosition;
        }

        throw err;
      }
    }

    // No browser geolocation available
    if (this.config.fallbackToManual && this.lastPosition?.source === 'manual') {
      logger.info('[GeospatialAnchorProvider] Geolocation unavailable, using manual position');
      return this.lastPosition;
    }

    throw new Error('Geolocation is not available and no manual fallback is set');
  }

  // ---------------------------------------------------------------------------
  // CONTINUOUS WATCHING
  // ---------------------------------------------------------------------------

  /**
   * Start continuous position watching.
   *
   * Emits 'position-updated' on each new position and 'error' on failures.
   * The optional intervalMs parameter is accepted for API compatibility but
   * the actual update frequency is controlled by the browser's Geolocation API.
   */
  startWatching(_intervalMs?: number): void {
    if (this.watchId !== null) {
      logger.warn('[GeospatialAnchorProvider] Already watching, ignoring startWatching()');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      logger.warn('[GeospatialAnchorProvider] Geolocation not available, cannot watch');
      this.emit('error', new Error('Geolocation not available'));
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const geoPos = this.browserPositionToGeo(position);
        this.lastPosition = geoPos;
        this.emit('position-updated', geoPos);
        logger.debug('[GeospatialAnchorProvider] Watch position update', {
          lat: geoPos.latitude,
          lon: geoPos.longitude,
          accuracy: geoPos.accuracy,
        });
      },
      (error) => {
        logger.error('[GeospatialAnchorProvider] Watch position error', {
          code: error.code,
          message: error.message,
        });
        this.emit('error', new Error(error.message));
      },
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        maximumAge: this.config.maxAgeMs,
        timeout: this.config.timeoutMs,
      },
    );

    logger.info('[GeospatialAnchorProvider] Started watching position');
  }

  /**
   * Stop continuous position watching.
   */
  stopWatching(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      logger.info('[GeospatialAnchorProvider] Stopped watching position');
    }
  }

  // ---------------------------------------------------------------------------
  // MANUAL POSITION
  // ---------------------------------------------------------------------------

  /**
   * Set a manual position (for testing or indoor use where GPS is unavailable).
   *
   * The manual position is stored as lastPosition and emits 'position-updated'.
   * If fallbackToManual is enabled, getCurrentPosition() will return this
   * position when the browser geolocation fails.
   */
  setManualPosition(lat: number, lon: number, alt?: number): void {
    const position: GeospatialPosition = {
      latitude: lat,
      longitude: lon,
      altitude: alt ?? null,
      accuracy: 0,
      source: 'manual',
      timestamp: Date.now(),
    };
    this.lastPosition = position;
    this.emit('position-updated', position);
    logger.info('[GeospatialAnchorProvider] Manual position set', { lat, lon, alt });
  }

  // ---------------------------------------------------------------------------
  // HAVERSINE DISTANCE
  // ---------------------------------------------------------------------------

  /**
   * Calculate the great-circle distance between two positions in meters
   * using the Haversine formula.
   *
   * Reference: https://en.wikipedia.org/wiki/Haversine_formula
   *
   * @param a First position
   * @param b Second position
   * @returns Distance in meters
   */
  static distanceMeters(a: GeospatialPosition, b: GeospatialPosition): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);

    const sinHalfDLat = Math.sin(dLat / 2);
    const sinHalfDLon = Math.sin(dLon / 2);

    const h =
      sinHalfDLat * sinHalfDLat +
      Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return EARTH_RADIUS_M * c;
  }

  // ---------------------------------------------------------------------------
  // ACCURACY TIER
  // ---------------------------------------------------------------------------

  /**
   * Get the accuracy tier name based on the last known position's accuracy.
   *
   * Tiers:
   *   high   : accuracy < 2m
   *   medium : accuracy < 10m
   *   low    : accuracy < 50m
   *   coarse : accuracy >= 50m
   *
   * If no position has been acquired yet, returns 'coarse'.
   */
  getAccuracyTier(): AccuracyTier {
    if (!this.lastPosition) return 'coarse';
    return GeospatialAnchorProvider.classifyAccuracy(this.lastPosition.accuracy);
  }

  /**
   * Classify an accuracy value into a tier.
   */
  static classifyAccuracy(accuracy: number): AccuracyTier {
    if (accuracy < 2) return 'high';
    if (accuracy < 10) return 'medium';
    if (accuracy < 50) return 'low';
    return 'coarse';
  }

  // ---------------------------------------------------------------------------
  // EVENT EMITTER
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to an event.
   */
  on(event: GeospatialEvent, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event.
   */
  off(event: string, handler: Function): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  /**
   * Stop watching and remove all event listeners.
   */
  dispose(): void {
    this.stopWatching();
    this.listeners.clear();
    this.lastPosition = null;
    logger.info('[GeospatialAnchorProvider] Disposed');
  }

  // ---------------------------------------------------------------------------
  // ACCESSORS
  // ---------------------------------------------------------------------------

  /**
   * Get the last known position (null if no position acquired yet).
   */
  getLastPosition(): GeospatialPosition | null {
    return this.lastPosition;
  }

  /**
   * Whether the provider is currently watching position.
   */
  isWatching(): boolean {
    return this.watchId !== null;
  }

  /**
   * Get metrics for the geospatial provider.
   */
  getMetrics() {
    return {
      lastPosition: this.lastPosition,
      accuracyTier: this.getAccuracyTier(),
      isWatching: this.isWatching(),
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  /**
   * Request position from the browser Geolocation API.
   */
  private requestBrowserPosition(): Promise<GeospatialPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPos = this.browserPositionToGeo(position);
          this.lastPosition = geoPos;
          logger.debug('[GeospatialAnchorProvider] GPS position acquired', {
            lat: geoPos.latitude,
            lon: geoPos.longitude,
            accuracy: geoPos.accuracy,
          });
          resolve(geoPos);
        },
        (error) => {
          reject(new Error(error.message));
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          maximumAge: this.config.maxAgeMs,
          timeout: this.config.timeoutMs,
        },
      );
    });
  }

  /**
   * Convert a browser GeolocationPosition to our GeospatialPosition type.
   */
  private browserPositionToGeo(position: GeolocationPosition): GeospatialPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? null,
      accuracy: position.coords.accuracy,
      source: 'gps',
      timestamp: position.timestamp,
    };
  }

  /**
   * Emit an event to all registered handlers.
   */
  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          logger.error('[GeospatialAnchorProvider] Event handler error', {
            event,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createGeospatialAnchorProvider(
  config?: GeospatialAnchorProviderConfig,
): GeospatialAnchorProvider {
  return new GeospatialAnchorProvider(config);
}
