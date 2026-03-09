/**
 * GeospatialBridge Web Implementation
 *
 * WebXR / browser fallback for geospatial AR using the Geolocation API.
 * Provides basic GPS positioning but lacks native AR anchor persistence.
 *
 * LIMITATIONS:
 * - No VPS (Visual Positioning Service)
 * - No native AR anchor persistence
 * - Lower accuracy than ARKit/ARCore (typically 3-15m)
 * - Manual calibration required for heading
 *
 * @module GeospatialBridgeWeb
 */

import type {
  GeospatialBridgePlugin,
  GeospatialCapabilities,
  CreateGeospatialAnchorOptions,
  ResolveGeospatialAnchorOptions,
  NativeGeospatialAnchor,
  WGS84Coordinate,
  Quaternion,
  ARSessionState,
  VPSAvailability,
} from '../GeospatialBridge';

// =============================================================================
// WEB IMPLEMENTATION
// =============================================================================

export class GeospatialBridgeWeb implements GeospatialBridgePlugin {
  private initialized = false;
  private sessionActive = false;
  private locationPermissionGranted = false;
  private currentPosition: GeolocationPosition | null = null;
  private watchId: number | null = null;
  private anchors: Map<string, NativeGeospatialAnchor> = new Map();
  private anchorIdCounter = 0;

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  async initialize(): Promise<GeospatialCapabilities> {
    this.initialized = true;

    // Check WebXR availability
    const xrSupported = 'xr' in navigator && typeof (navigator as any).xr !== 'undefined';

    // Check geolocation availability
    const geolocationSupported = 'geolocation' in navigator;

    return {
      supported: geolocationSupported,
      vpsAvailable: false, // WebXR doesn't have VPS
      vpsAvailability: 'unavailable-device-incompatible',
      horizontalAccuracy: null, // Will be available after location is acquired
      verticalAccuracy: null,
      sessionState: geolocationSupported ? 'not-tracking' : 'not-available',
      platform: xrSupported ? 'webxr' : 'none',
    };
  }

  // ---------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // ---------------------------------------------------------------------------

  async startARSession(): Promise<{ success: boolean }> {
    if (!this.initialized) {
      throw new Error('GeospatialBridge not initialized. Call initialize() first.');
    }

    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation API not available');
    }

    // Check permission
    const permissionCheck = await this.checkLocationPermission();
    if (!permissionCheck.granted) {
      throw new Error('Location permission not granted');
    }

    // Start watching position
    try {
      await this.startWatchingPosition();
      this.sessionActive = true;
      return { success: true };
    } catch (error) {
      console.error('[GeospatialBridgeWeb] Failed to start AR session:', error);
      return { success: false };
    }
  }

  async stopARSession(): Promise<{ success: boolean }> {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.sessionActive = false;
    this.currentPosition = null;
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // ANCHOR MANAGEMENT
  // ---------------------------------------------------------------------------

  async createGeospatialAnchor(
    options: CreateGeospatialAnchorOptions,
  ): Promise<NativeGeospatialAnchor> {
    if (!this.sessionActive) {
      throw new Error('AR session not active. Call startARSession() first.');
    }

    const anchorId = `webxr_${++this.anchorIdCounter}_${Date.now()}`;
    const rotation = options.rotation ?? { x: 0, y: 0, z: 0, w: 1 };

    const anchor: NativeGeospatialAnchor = {
      anchorId,
      coordinate: options.coordinate,
      rotation,
      horizontalAccuracy: this.currentPosition?.coords.accuracy ?? 10.0,
      verticalAccuracy: this.currentPosition?.coords.altitudeAccuracy ?? null,
      platform: 'webxr',
      timestamp: Date.now(),
    };

    this.anchors.set(anchorId, anchor);

    console.log('[GeospatialBridgeWeb] Created anchor:', {
      id: anchorId,
      lat: options.coordinate.latitude.toFixed(6),
      lon: options.coordinate.longitude.toFixed(6),
      label: options.label,
    });

    return anchor;
  }

  async resolveGeospatialAnchor(
    options: ResolveGeospatialAnchorOptions,
  ): Promise<NativeGeospatialAnchor> {
    const anchor = this.anchors.get(options.anchorId);
    if (!anchor) {
      throw new Error(`Anchor not found: ${options.anchorId}`);
    }

    // WebXR doesn't have native tracking - just return the stored anchor
    // In a real AR session, this would return the tracked pose
    return anchor;
  }

  async removeGeospatialAnchor(options: { anchorId: string }): Promise<{ success: boolean }> {
    const deleted = this.anchors.delete(options.anchorId);
    return { success: deleted };
  }

  // ---------------------------------------------------------------------------
  // CAPABILITIES
  // ---------------------------------------------------------------------------

  async getCapabilities(): Promise<GeospatialCapabilities> {
    const geolocationSupported = 'geolocation' in navigator;
    const xrSupported = 'xr' in navigator && typeof (navigator as any).xr !== 'undefined';

    let sessionState: ARSessionState = 'not-available';
    if (geolocationSupported) {
      if (this.sessionActive && this.currentPosition) {
        sessionState = 'normal';
      } else if (this.sessionActive) {
        sessionState = 'not-tracking';
      } else {
        sessionState = 'not-tracking';
      }
    }

    return {
      supported: geolocationSupported,
      vpsAvailable: false,
      vpsAvailability: 'unavailable-device-incompatible',
      horizontalAccuracy: this.currentPosition?.coords.accuracy ?? null,
      verticalAccuracy: this.currentPosition?.coords.altitudeAccuracy ?? null,
      sessionState,
      platform: xrSupported ? 'webxr' : 'none',
    };
  }

  // ---------------------------------------------------------------------------
  // PERMISSIONS
  // ---------------------------------------------------------------------------

  async requestLocationPermission(): Promise<{ granted: boolean }> {
    if (!('geolocation' in navigator)) {
      return { granted: false };
    }

    try {
      // Request permission by attempting to get position
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      this.locationPermissionGranted = true;
      return { granted: true };
    } catch (error) {
      console.error('[GeospatialBridgeWeb] Location permission denied:', error);
      return { granted: false };
    }
  }

  async checkLocationPermission(): Promise<{ granted: boolean }> {
    if (!('permissions' in navigator)) {
      // Fallback: assume granted if geolocation exists
      return { granted: 'geolocation' in navigator };
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      const granted = result.state === 'granted';
      this.locationPermissionGranted = granted;
      return { granted };
    } catch (error) {
      // Permission API not available, fallback
      return { granted: this.locationPermissionGranted };
    }
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private startWatchingPosition(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = position;
          console.log('[GeospatialBridgeWeb] Initial position:', {
            lat: position.coords.latitude.toFixed(6),
            lon: position.coords.longitude.toFixed(6),
            accuracy: position.coords.accuracy.toFixed(1),
          });

          // Start watching
          this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
              this.currentPosition = pos;
            },
            (error) => {
              console.error('[GeospatialBridgeWeb] Watch position error:', error);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 5000,
              timeout: 10000,
            },
          );

          resolve();
        },
        (error) => {
          reject(new Error(`Failed to get position: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  }
}
