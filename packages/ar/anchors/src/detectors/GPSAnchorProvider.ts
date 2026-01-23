/**
 * GPS Anchor Provider
 * 
 * Provides outdoor positioning using GPS/GNSS.
 * Less accurate than visual anchors but works anywhere with satellite visibility.
 */

import type { GPSAnchor, Pose, Vector3, Quaternion } from '../types';

export interface GPSConfig {
  /** Enable high accuracy mode (more battery, better accuracy) */
  enableHighAccuracy: boolean;
  /** Maximum age of cached position (ms) */
  maximumAge: number;
  /** Timeout for position request (ms) */
  timeout: number;
  /** Minimum accuracy required (meters) */
  minAccuracy: number;
}

const DEFAULT_GPS_CONFIG: GPSConfig = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
  minAccuracy: 20,
};

export interface GPSPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

/**
 * GPS Anchor Provider
 */
export class GPSAnchorProvider {
  private config: GPSConfig;
  private watchId: number | null = null;
  private lastPosition: GPSPosition | null = null;
  private originPosition: GPSPosition | null = null;
  private onPositionChange?: (position: GPSPosition) => void;

  constructor(config?: Partial<GPSConfig>) {
    this.config = { ...DEFAULT_GPS_CONFIG, ...config };
  }

  /**
   * Check if Geolocation is available
   */
  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Get current position (one-shot)
   */
  async getCurrentPosition(): Promise<GPSPosition> {
    if (!this.isAvailable()) {
      throw new Error('Geolocation not available');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition = this.convertPosition(position);
          this.lastPosition = gpsPosition;
          resolve(gpsPosition);
        },
        (error) => {
          reject(new Error(`GPS error: ${error.message}`));
        },
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          maximumAge: this.config.maximumAge,
          timeout: this.config.timeout,
        }
      );
    });
  }

  /**
   * Start watching position
   */
  startWatching(callback: (position: GPSPosition) => void): void {
    if (!this.isAvailable()) {
      throw new Error('Geolocation not available');
    }

    this.onPositionChange = callback;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPosition = this.convertPosition(position);
        this.lastPosition = gpsPosition;
        this.onPositionChange?.(gpsPosition);
      },
      (error) => {
        console.error('GPS watch error:', error.message);
      },
      {
        enableHighAccuracy: this.config.enableHighAccuracy,
        maximumAge: this.config.maximumAge,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Stop watching position
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Set current position as origin (for local coordinate system)
   */
  setOrigin(position?: GPSPosition): void {
    this.originPosition = position ?? this.lastPosition;
  }

  /**
   * Get last known position
   */
  getLastPosition(): GPSPosition | null {
    return this.lastPosition;
  }

  /**
   * Convert GPS position to anchor
   */
  createAnchor(position?: GPSPosition): GPSAnchor | null {
    const pos = position ?? this.lastPosition;
    if (!pos) return null;

    const worldPose = this.gpsToWorldPose(pos);

    return {
      id: `gps_${pos.timestamp}`,
      type: 'gps',
      worldPose,
      confidence: this.calculateConfidence(pos),
      lastSeen: pos.timestamp,
      isVisible: true,
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude ?? 0,
      horizontalAccuracy: pos.accuracy,
      verticalAccuracy: pos.altitudeAccuracy ?? pos.accuracy * 2,
    };
  }

  /**
   * Convert browser Geolocation to our format
   */
  private convertPosition(position: GeolocationPosition): GPSPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };
  }

  /**
   * Convert GPS position to world pose
   * 
   * Uses a local tangent plane approximation (ENU: East-North-Up)
   */
  private gpsToWorldPose(position: GPSPosition): Pose {
    if (!this.originPosition) {
      // No origin set - use identity pose
      return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      };
    }

    // Calculate offset from origin in ENU coordinates
    const offset = this.gpsToENU(position, this.originPosition);

    return {
      position: offset,
      rotation: this.headingToQuaternion(position.heading ?? 0),
    };
  }

  /**
   * Convert GPS coordinates to ENU (East-North-Up) offset from origin
   */
  private gpsToENU(position: GPSPosition, origin: GPSPosition): Vector3 {
    // Earth radius in meters
    const R = 6371000;

    // Convert to radians
    const lat1 = origin.latitude * Math.PI / 180;
    const lat2 = position.latitude * Math.PI / 180;
    const lon1 = origin.longitude * Math.PI / 180;
    const lon2 = position.longitude * Math.PI / 180;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // Approximate ENU coordinates
    const east = R * dLon * Math.cos(lat1);
    const north = R * dLat;
    const up = (position.altitude ?? 0) - (origin.altitude ?? 0);

    // Note: Hololand uses Y-up coordinate system
    return {
      x: east,
      y: up,
      z: -north, // North is negative Z in our convention
    };
  }

  /**
   * Convert heading angle to quaternion (Y-up)
   */
  private headingToQuaternion(heading: number): Quaternion {
    // Heading: 0 = North, 90 = East (clockwise from North)
    // Convert to rotation around Y axis
    const angle = -heading * Math.PI / 180; // Negate for right-hand rule
    
    return {
      x: 0,
      y: Math.sin(angle / 2),
      z: 0,
      w: Math.cos(angle / 2),
    };
  }

  /**
   * Calculate confidence based on accuracy
   */
  private calculateConfidence(position: GPSPosition): number {
    // Higher accuracy = higher confidence
    if (position.accuracy < 5) return 0.95;
    if (position.accuracy < 10) return 0.85;
    if (position.accuracy < 20) return 0.7;
    if (position.accuracy < 50) return 0.5;
    if (position.accuracy < 100) return 0.3;
    return 0.1;
  }

  /**
   * Calculate distance between two GPS positions (Haversine formula)
   */
  static distanceBetween(a: GPSPosition, b: GPSPosition): number {
    const R = 6371000; // Earth radius in meters
    const lat1 = a.latitude * Math.PI / 180;
    const lat2 = b.latitude * Math.PI / 180;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;

    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    
    return 2 * R * Math.asin(Math.sqrt(h));
  }
}
