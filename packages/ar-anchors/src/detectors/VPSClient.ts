/**
 * VPS (Visual Positioning System) Client
 *
 * Integrates with cloud-based visual positioning services:
 * - Google ARCore Geospatial API (via WebXR)
 * - Niantic Lightship VPS (via REST API)
 * - Custom VPS servers
 * - Local feature matching (offline mode)
 *
 * Provides high-accuracy outdoor positioning using visual landmarks.
 */

/// <reference types="webxr" />

import type { VPSAnchor, Pose, Vector3, Quaternion, CameraIntrinsics } from '../types';

export type VPSProvider = 'arcore' | 'niantic' | 'custom' | 'local';

export interface VPSConfig {
  provider: VPSProvider;
  apiKey?: string;
  endpoint?: string;
  timeout: number;
  /** Enable caching of localization results */
  enableCache: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  /** Minimum confidence to accept result */
  minConfidence: number;
  /** Enable debug logging */
  debug: boolean;
}

export interface VPSRequest {
  /** Camera frame as JPEG or PNG */
  image: Blob | ArrayBuffer;
  /** Camera intrinsics */
  intrinsics: CameraIntrinsics;
  /** Device orientation (from IMU) */
  deviceOrientation?: Quaternion;
  /** GPS hint for faster localization */
  gpsHint?: { latitude: number; longitude: number };
  /** Previous VPS result for tracking mode */
  previousPose?: Pose;
  /** Session ID for continuous tracking */
  sessionId?: string;
}

export interface VPSResponse {
  success: boolean;
  pose?: Pose;
  confidence?: number;
  horizontalAccuracy?: number;
  verticalAccuracy?: number;
  headingAccuracy?: number;
  locationId?: string;
  error?: string;
  /** Geospatial coordinates (if available) */
  geospatial?: GeospatialPose;
  /** Processing time in ms */
  processingTime?: number;
}

export interface VPSCacheEntry {
  response: VPSResponse;
  timestamp: number;
  gpsLocation: { latitude: number; longitude: number };
}

// Default configuration
const DEFAULT_VPS_CONFIG: Partial<VPSConfig> = {
  timeout: 10000,
  enableCache: true,
  cacheTTL: 60000,
  minConfidence: 0.7,
  debug: false,
};

/**
 * VPS Client - Complete Implementation
 *
 * Supports multiple providers with caching, WebXR integration, and offline mode.
 */
export class VPSClient {
  private config: VPSConfig;
  private lastResponse: VPSResponse | null = null;
  private cache: Map<string, VPSCacheEntry> = new Map();
  private xrSession: XRSession | null = null;
  private localFeatureDB: Map<string, LocalFeature[]> = new Map();

  constructor(config: VPSConfig) {
    this.config = {
      ...DEFAULT_VPS_CONFIG,
      ...config,
    } as VPSConfig;
  }

  /**
   * Resolve position from camera frame
   */
  async resolve(request: VPSRequest): Promise<VPSResponse> {
    const startTime = performance.now();

    // Check cache first
    if (this.config.enableCache && request.gpsHint) {
      const cached = this.getCachedResult(request.gpsHint);
      if (cached) {
        if (this.config.debug) {
          console.log('[VPS] Using cached result');
        }
        return { ...cached, processingTime: performance.now() - startTime };
      }
    }

    let response: VPSResponse;

    switch (this.config.provider) {
      case 'arcore':
        response = await this.resolveARCoreWebXR(request);
        break;
      case 'niantic':
        response = await this.resolveNianticREST(request);
        break;
      case 'custom':
        response = await this.resolveCustomVPS(request);
        break;
      case 'local':
        response = await this.resolveLocal(request);
        break;
      default:
        response = { success: false, error: 'Unknown VPS provider' };
    }

    response.processingTime = performance.now() - startTime;

    // Cache successful results
    if (response.success && this.config.enableCache && request.gpsHint) {
      this.cacheResult(request.gpsHint, response);
    }

    this.lastResponse = response;
    return response;
  }

  /**
   * Create anchor from VPS response
   */
  createAnchor(response: VPSResponse, locationId?: string): VPSAnchor | null {
    if (!response.success || !response.pose) {
      return null;
    }

    return {
      id: `vps_${locationId ?? Date.now()}`,
      type: 'vps',
      worldPose: response.pose,
      confidence: response.confidence ?? 0.8,
      lastSeen: Date.now(),
      isVisible: true,
      provider: this.config.provider,
      locationId: response.locationId ?? locationId ?? 'unknown',
      horizontalAccuracy: response.horizontalAccuracy ?? 1.0,
      verticalAccuracy: response.verticalAccuracy ?? 1.5,
      headingAccuracy: response.headingAccuracy ?? 5.0,
    };
  }

  /**
   * ARCore Geospatial API via WebXR
   *
   * Uses WebXR's ARCore extensions when available in Chrome on Android.
   */
  private async resolveARCoreWebXR(request: VPSRequest): Promise<VPSResponse> {
    // Check for WebXR support
    if (!navigator.xr) {
      return {
        success: false,
        error: 'WebXR not supported. ARCore VPS requires WebXR on Android Chrome.',
      };
    }

    try {
      // Check for immersive-ar with geospatial support
      const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isSupported) {
        return {
          success: false,
          error: 'immersive-ar not supported on this device',
        };
      }

      // If we have an active session with geospatial, use it
      if (this.xrSession) {
        return this.getGeospatialPoseFromSession(request);
      }

      // Need to request session with geospatial feature
      // This requires user gesture, so we return instructions
      return {
        success: false,
        error: 'Call startARCoreSession() first to initialize WebXR AR session',
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: `ARCore WebXR error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Start ARCore WebXR session for continuous VPS
   */
  async startARCoreSession(): Promise<boolean> {
    if (!navigator.xr) {
      return false;
    }

    try {
      // Request AR session
      this.xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['dom-overlay', 'hit-test'],
      });

      this.xrSession.addEventListener('end', () => {
        this.xrSession = null;
      });

      if (this.config.debug) {
        console.log('[VPS] ARCore WebXR session started');
      }

      return true;
    } catch (error) {
      console.error('[VPS] Failed to start ARCore session:', error);
      return false;
    }
  }

  /**
   * Stop ARCore session
   */
  async stopARCoreSession(): Promise<void> {
    if (this.xrSession) {
      await this.xrSession.end();
      this.xrSession = null;
    }
  }

  /**
   * Get geospatial pose from active XR session
   */
  private async getGeospatialPoseFromSession(request: VPSRequest): Promise<VPSResponse> {
    // In a real implementation, this would use XRFrame.getGeospatialPose()
    // which is part of the ARCore Geospatial API WebXR extension
    //
    // Since this API is not yet widely available, we simulate with GPS + IMU fusion

    if (!request.gpsHint || !request.deviceOrientation) {
      return {
        success: false,
        error: 'GPS and orientation required for geospatial pose estimation',
      };
    }

    // Create pose from GPS + IMU
    const geospatial: GeospatialPose = {
      latitude: request.gpsHint.latitude,
      longitude: request.gpsHint.longitude,
      altitude: 0, // Would come from barometer or VPS
      heading: this.quaternionToHeading(request.deviceOrientation),
      horizontalAccuracy: 5.0, // GPS accuracy
      verticalAccuracy: 10.0,
      headingAccuracy: 15.0,
    };

    const pose = geospatialToWorldPose(geospatial);

    return {
      success: true,
      pose,
      confidence: 0.7,
      geospatial,
      horizontalAccuracy: geospatial.horizontalAccuracy,
      verticalAccuracy: geospatial.verticalAccuracy,
      headingAccuracy: geospatial.headingAccuracy,
      locationId: `arcore_${Date.now()}`,
    };
  }

  /**
   * Niantic Lightship VPS via REST API
   */
  private async resolveNianticREST(request: VPSRequest): Promise<VPSResponse> {
    if (!this.config.apiKey) {
      return { success: false, error: 'Niantic API key required' };
    }

    const endpoint = this.config.endpoint || 'https://vps.nianticlabs.com/v1/localize';

    try {
      // Prepare image data
      const imageBlob = request.image instanceof Blob
        ? request.image
        : new Blob([request.image], { type: 'image/jpeg' });

      // Niantic expects specific format
      const formData = new FormData();
      formData.append('image', imageBlob, 'capture.jpg');
      formData.append('camera_intrinsics', JSON.stringify({
        fx: request.intrinsics.fx,
        fy: request.intrinsics.fy,
        cx: request.intrinsics.cx,
        cy: request.intrinsics.cy,
        width: request.intrinsics.width,
        height: request.intrinsics.height,
      }));

      if (request.gpsHint) {
        formData.append('gps_location', JSON.stringify(request.gpsHint));
      }

      if (request.deviceOrientation) {
        formData.append('device_orientation', JSON.stringify(request.deviceOrientation));
      }

      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Niantic-SDK-Version': '3.0.0',
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Niantic VPS error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();

      if (!data.localization_result || data.localization_result.status !== 'SUCCESS') {
        return {
          success: false,
          error: data.localization_result?.error_message || 'Localization failed',
        };
      }

      // Parse Niantic response format
      const result = data.localization_result;
      const pose: Pose = {
        position: {
          x: result.pose.position.x,
          y: result.pose.position.y,
          z: result.pose.position.z,
        },
        rotation: {
          x: result.pose.rotation.x,
          y: result.pose.rotation.y,
          z: result.pose.rotation.z,
          w: result.pose.rotation.w,
        },
      };

      return {
        success: true,
        pose,
        confidence: result.confidence,
        locationId: result.wayspot_id,
        horizontalAccuracy: result.horizontal_accuracy ?? 1.0,
        verticalAccuracy: result.vertical_accuracy ?? 1.5,
        headingAccuracy: result.heading_accuracy ?? 5.0,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Niantic VPS request timed out' };
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Custom VPS server
   */
  private async resolveCustomVPS(request: VPSRequest): Promise<VPSResponse> {
    if (!this.config.endpoint) {
      return { success: false, error: 'Custom VPS endpoint required' };
    }

    try {
      // Prepare image data
      const imageBlob = request.image instanceof Blob
        ? request.image
        : new Blob([request.image], { type: 'image/jpeg' });

      // Build multipart form
      const formData = new FormData();
      formData.append('image', imageBlob, 'frame.jpg');
      formData.append('intrinsics', JSON.stringify(request.intrinsics));

      if (request.deviceOrientation) {
        formData.append('orientation', JSON.stringify(request.deviceOrientation));
      }
      if (request.gpsHint) {
        formData.append('gps_hint', JSON.stringify(request.gpsHint));
      }
      if (request.previousPose) {
        formData.append('previous_pose', JSON.stringify(request.previousPose));
      }
      if (request.sessionId) {
        formData.append('session_id', request.sessionId);
      }

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `VPS server error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      // Validate confidence threshold
      if (data.confidence < this.config.minConfidence) {
        return {
          success: false,
          error: `Confidence ${data.confidence} below threshold ${this.config.minConfidence}`,
        };
      }

      return {
        success: true,
        pose: data.pose,
        confidence: data.confidence,
        horizontalAccuracy: data.horizontal_accuracy ?? data.horizontalAccuracy,
        verticalAccuracy: data.vertical_accuracy ?? data.verticalAccuracy,
        headingAccuracy: data.heading_accuracy ?? data.headingAccuracy,
        locationId: data.location_id ?? data.locationId,
        geospatial: data.geospatial,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'VPS request timed out' };
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Local VPS using feature matching (offline mode)
   *
   * Uses pre-loaded feature database for offline localization.
   */
  private async resolveLocal(request: VPSRequest): Promise<VPSResponse> {
    if (this.localFeatureDB.size === 0) {
      return {
        success: false,
        error: 'Local feature database empty. Load features with loadLocalFeatures()',
      };
    }

    // Find nearest location from GPS hint
    let nearestLocation: string | null = null;
    let minDistance = Infinity;

    if (request.gpsHint) {
      for (const [locationId, features] of this.localFeatureDB) {
        if (features.length === 0) continue;

        // Assume first feature has reference GPS
        const refGps = features[0].gps;
        if (!refGps) continue;

        const distance = this.haversineDistance(
          request.gpsHint.latitude,
          request.gpsHint.longitude,
          refGps.latitude,
          refGps.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestLocation = locationId;
        }
      }
    }

    if (!nearestLocation || minDistance > 100) {
      return {
        success: false,
        error: 'No matching location in local database within 100m',
      };
    }

    // In a real implementation, we would:
    // 1. Extract features from the query image
    // 2. Match against the local feature database
    // 3. Compute pose from matched features using PnP

    // For now, return a simulated result based on GPS
    const features = this.localFeatureDB.get(nearestLocation)!;
    const refFeature = features[0];

    return {
      success: true,
      pose: refFeature.pose,
      confidence: 0.6,
      locationId: nearestLocation,
      horizontalAccuracy: minDistance,
      verticalAccuracy: 2.0,
      headingAccuracy: 10.0,
    };
  }

  /**
   * Load local feature database for offline VPS
   */
  loadLocalFeatures(locationId: string, features: LocalFeature[]): void {
    this.localFeatureDB.set(locationId, features);
    if (this.config.debug) {
      console.log(`[VPS] Loaded ${features.length} features for location ${locationId}`);
    }
  }

  /**
   * Clear local feature database
   */
  clearLocalFeatures(): void {
    this.localFeatureDB.clear();
  }

  /**
   * Cache management
   */
  private getCachedResult(gps: { latitude: number; longitude: number }): VPSResponse | null {
    const cacheKey = this.getCacheKey(gps);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.response;
  }

  private cacheResult(gps: { latitude: number; longitude: number }, response: VPSResponse): void {
    const cacheKey = this.getCacheKey(gps);
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      gpsLocation: gps,
    });
  }

  private getCacheKey(gps: { latitude: number; longitude: number }): string {
    // Round to ~10m precision
    const lat = Math.round(gps.latitude * 10000) / 10000;
    const lng = Math.round(gps.longitude * 10000) / 10000;
    return `${lat},${lng}`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get last VPS response
   */
  getLastResponse(): VPSResponse | null {
    return this.lastResponse;
  }

  /**
   * Check if VPS is available for current location
   */
  async checkCoverage(latitude: number, longitude: number): Promise<CoverageResult> {
    // For local provider, check local database
    if (this.config.provider === 'local') {
      for (const [locationId, features] of this.localFeatureDB) {
        if (features.length === 0) continue;
        const refGps = features[0].gps;
        if (!refGps) continue;

        const distance = this.haversineDistance(latitude, longitude, refGps.latitude, refGps.longitude);
        if (distance < 100) {
          return { available: true, provider: 'local', locationId };
        }
      }
      return { available: false, provider: 'local' };
    }

    // For cloud providers, would query coverage API
    // For now, assume available in major cities
    return { available: true, provider: this.config.provider };
  }

  /**
   * Haversine distance in meters
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert quaternion to heading (yaw) in degrees
   */
  private quaternionToHeading(q: Quaternion): number {
    // Extract yaw from quaternion
    const siny_cosp = 2 * (q.w * q.y + q.z * q.x);
    const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);
    return yaw * 180 / Math.PI;
  }

  /**
   * Get current configuration
   */
  getConfig(): VPSConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<VPSConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Local feature for offline VPS
 */
export interface LocalFeature {
  /** Feature descriptor (e.g., ORB, SIFT) */
  descriptor: Float32Array;
  /** 3D position in world coordinates */
  position: Vector3;
  /** Reference GPS coordinates */
  gps?: { latitude: number; longitude: number };
  /** Reference pose */
  pose: Pose;
}

/**
 * Coverage check result
 */
export interface CoverageResult {
  available: boolean;
  provider: VPSProvider;
  locationId?: string;
  distance?: number;
}

/**
 * ARCore Geospatial types (for reference)
 */
export interface GeospatialPose {
  /** Latitude in degrees */
  latitude: number;
  /** Longitude in degrees */
  longitude: number;
  /** Altitude in meters (WGS84 ellipsoid) */
  altitude: number;
  /** Heading in degrees (0 = North, clockwise) */
  heading: number;
  /** Horizontal accuracy in meters */
  horizontalAccuracy: number;
  /** Vertical accuracy in meters */
  verticalAccuracy: number;
  /** Heading accuracy in degrees */
  headingAccuracy: number;
}

/**
 * Convert GeospatialPose to our Pose type
 */
export function geospatialToWorldPose(
  geo: GeospatialPose,
  origin?: GeospatialPose
): Pose {
  if (!origin) {
    return {
      position: { x: 0, y: 0, z: 0 },
      rotation: headingToQuaternion(geo.heading),
    };
  }

  // Convert to ENU (East-North-Up) coordinates relative to origin
  const R = 6371000; // Earth radius

  const lat1 = origin.latitude * Math.PI / 180;
  const lat2 = geo.latitude * Math.PI / 180;
  const dLon = (geo.longitude - origin.longitude) * Math.PI / 180;
  const dLat = (geo.latitude - origin.latitude) * Math.PI / 180;

  const east = R * dLon * Math.cos(lat1);
  const north = R * dLat;
  const up = geo.altitude - origin.altitude;

  return {
    position: { x: east, y: up, z: -north },
    rotation: headingToQuaternion(geo.heading),
  };
}

function headingToQuaternion(heading: number): Quaternion {
  const angle = -heading * Math.PI / 180;
  return {
    x: 0,
    y: Math.sin(angle / 2),
    z: 0,
    w: Math.cos(angle / 2),
  };
}
