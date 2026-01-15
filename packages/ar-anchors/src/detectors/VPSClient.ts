/**
 * VPS (Visual Positioning System) Client
 * 
 * Integrates with cloud-based visual positioning services:
 * - Google ARCore Geospatial API
 * - Niantic Lightship VPS
 * - Custom VPS servers
 */

import type { VPSAnchor, Pose, Vector3, Quaternion, CameraIntrinsics } from '../types';

export type VPSProvider = 'arcore' | 'niantic' | 'custom';

export interface VPSConfig {
  provider: VPSProvider;
  apiKey?: string;
  endpoint?: string;
  timeout: number;
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
}

/**
 * VPS Client
 * 
 * Provides high-accuracy outdoor positioning using visual landmarks.
 */
export class VPSClient {
  private config: VPSConfig;
  private lastResponse: VPSResponse | null = null;

  constructor(config: VPSConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 10000,
    };
  }

  /**
   * Resolve position from camera frame
   */
  async resolve(request: VPSRequest): Promise<VPSResponse> {
    switch (this.config.provider) {
      case 'arcore':
        return this.resolveARCore(request);
      case 'niantic':
        return this.resolveNiantic(request);
      case 'custom':
        return this.resolveCustom(request);
      default:
        return { success: false, error: 'Unknown VPS provider' };
    }
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
   * ARCore Geospatial API
   * 
   * Note: In production, this would use the actual ARCore SDK
   * which runs on-device and communicates with Google's servers.
   */
  private async resolveARCore(request: VPSRequest): Promise<VPSResponse> {
    // ARCore Geospatial requires the ARCore SDK
    // This is a placeholder for the API contract
    
    // In reality, you'd use:
    // - @react-native-arcore-geospatial for React Native
    // - Native ARCore SDK for native apps
    // - WebXR with ARCore extensions for web
    
    console.warn('ARCore VPS requires native SDK integration');
    
    return {
      success: false,
      error: 'ARCore VPS requires native SDK. Use ARCore SDK directly.',
    };
  }

  /**
   * Niantic Lightship VPS
   * 
   * Niantic provides VPS for many public locations worldwide.
   */
  private async resolveNiantic(request: VPSRequest): Promise<VPSResponse> {
    if (!this.config.apiKey) {
      return { success: false, error: 'Niantic API key required' };
    }

    // Niantic VPS also requires their SDK for best results
    // This is a placeholder showing the expected API contract
    
    console.warn('Niantic VPS requires Lightship SDK integration');
    
    return {
      success: false,
      error: 'Niantic VPS requires Lightship SDK. Use ARDK directly.',
    };
  }

  /**
   * Custom VPS server
   * 
   * For self-hosted VPS using custom landmark database.
   */
  private async resolveCustom(request: VPSRequest): Promise<VPSResponse> {
    if (!this.config.endpoint) {
      return { success: false, error: 'Custom VPS endpoint required' };
    }

    try {
      // Prepare image data
      const imageBlob = request.image instanceof Blob 
        ? request.image 
        : new Blob([request.image], { type: 'image/jpeg' });

      // Build form data
      const formData = new FormData();
      formData.append('image', imageBlob);
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

      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { 
          success: false, 
          error: `VPS server error: ${response.status} ${response.statusText}` 
        };
      }

      const data = await response.json();
      
      this.lastResponse = {
        success: true,
        pose: data.pose,
        confidence: data.confidence,
        horizontalAccuracy: data.horizontal_accuracy,
        verticalAccuracy: data.vertical_accuracy,
        headingAccuracy: data.heading_accuracy,
        locationId: data.location_id,
      };

      return this.lastResponse;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'VPS request timed out' };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Get last VPS response
   */
  getLastResponse(): VPSResponse | null {
    return this.lastResponse;
  }

  /**
   * Check if VPS is available for current location
   * (Would check against coverage database)
   */
  async checkCoverage(latitude: number, longitude: number): Promise<boolean> {
    // In production, this would query a coverage database
    // to check if VPS is available at this location
    
    // For now, assume VPS is available in major cities
    return true;
  }
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
