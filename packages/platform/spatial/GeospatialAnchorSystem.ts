/**
 * Geospatial Anchor System
 *
 * Universal cross-ecosystem spatial continuity using WGS84 coordinates.
 * Provides persistent AR anchors tied to real-world GPS locations with
 * multi-user sharing capabilities.
 *
 * Architecture:
 * - WGS84 (lat/lon/alt) as universal reference frame
 * - Local ENU (East-North-Up) for rendering and physics
 * - IndexedDB persistence with spatial indexing
 * - ARCore Geospatial API + ARKit Location Anchors integration
 * - Multi-user anchor sharing protocol
 */

import { CoordinateTransform, identityPose, composePoses } from '../../ar/anchors/src/CoordinateTransform';
import type { Pose, Vector3, Quaternion } from '../../ar/anchors/src/types';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * WGS84 Geographic Coordinates
 * The universal reference frame for all geospatial anchors
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
 * Geospatial Anchor - AR content tied to real-world location
 */
export interface GeospatialAnchor {
  /** Unique identifier */
  id: string;
  /** WGS84 coordinates */
  coordinates: WGS84Coordinate;
  /** Orientation (quaternion) */
  rotation: Quaternion;
  /** Anchor metadata */
  metadata: {
    /** User-defined label */
    label?: string;
    /** Creator user ID */
    createdBy: string;
    /** Creation timestamp */
    createdAt: number;
    /** Last updated timestamp */
    updatedAt: number;
    /** AR platform that created this anchor */
    platform: 'arcore' | 'arkit' | 'webxr' | 'hololens';
    /** Horizontal accuracy estimate (meters) */
    horizontalAccuracy?: number;
    /** Vertical accuracy estimate (meters) */
    verticalAccuracy?: number;
  };
  /** Shared with users */
  sharedWith: string[];
  /** Attached content reference */
  contentId?: string;
}

/**
 * Spatial Query Parameters
 */
export interface SpatialQuery {
  /** Center point (WGS84) */
  center: WGS84Coordinate;
  /** Search radius in meters */
  radiusMeters: number;
  /** Maximum results */
  limit?: number;
  /** Filter by creator */
  createdBy?: string;
  /** Filter by shared access */
  accessibleBy?: string;
}

/**
 * AR Platform Capabilities
 */
export interface PlatformCapabilities {
  /** Platform type */
  platform: 'arcore' | 'arkit' | 'webxr' | 'hololens' | 'unknown';
  /** Supports geospatial anchoring */
  supportsGeospatial: boolean;
  /** Supports VPS (Visual Positioning Service) */
  supportsVPS: boolean;
  /** Estimated horizontal accuracy (meters) */
  horizontalAccuracy?: number;
  /** Estimated vertical accuracy (meters) */
  verticalAccuracy?: number;
}

// =============================================================================
// COORDINATE CONVERSION UTILITIES
// =============================================================================

/**
 * Coordinate conversion between WGS84 and local ENU
 */
export class GeospatialCoordinateConverter {
  private origin: WGS84Coordinate | null = null;
  private readonly EARTH_RADIUS = 6371000; // meters

  /**
   * Set the local origin for ENU coordinate system
   */
  setOrigin(origin: WGS84Coordinate): void {
    this.origin = origin;
  }

  /**
   * Get current origin
   */
  getOrigin(): WGS84Coordinate | null {
    return this.origin ? { ...this.origin } : null;
  }

  /**
   * Convert WGS84 coordinates to local ENU (East-North-Up)
   *
   * Returns position in meters relative to origin.
   * Uses flat-earth approximation for local areas (<10km radius).
   *
   * @param coords WGS84 coordinates to convert
   * @returns ENU position in meters (x=East, y=Up, z=-North)
   */
  wgs84ToENU(coords: WGS84Coordinate): Vector3 {
    if (!this.origin) {
      throw new Error('Origin not set. Call setOrigin() first.');
    }

    const toRad = (deg: number) => deg * Math.PI / 180;

    const lat = toRad(coords.latitude);
    const lon = toRad(coords.longitude);
    const refLat = toRad(this.origin.latitude);
    const refLon = toRad(this.origin.longitude);

    const dLat = lat - refLat;
    const dLon = lon - refLon;

    // Local tangent plane approximation
    const cosRefLat = Math.cos(refLat);

    const east = this.EARTH_RADIUS * dLon * cosRefLat;
    const north = this.EARTH_RADIUS * dLat;
    const up = coords.altitude - this.origin.altitude;

    // HoloLand convention: Y-up, Z=-North
    // Use || 0 to normalize -0 to +0 (JS Object.is(-0, 0) is false)
    return { x: east || 0, y: up || 0, z: -north || 0 };
  }

  /**
   * Convert local ENU coordinates back to WGS84
   *
   * @param enuPosition Local position in meters (x=East, y=Up, z=-North)
   * @returns WGS84 coordinates
   */
  enuToWGS84(enuPosition: Vector3): WGS84Coordinate {
    if (!this.origin) {
      throw new Error('Origin not set. Call setOrigin() first.');
    }

    const toDeg = (rad: number) => rad * 180 / Math.PI;
    const toRad = (deg: number) => deg * Math.PI / 180;

    const refLat = toRad(this.origin.latitude);
    const cosRefLat = Math.cos(refLat);

    // Extract ENU components (HoloLand convention)
    const east = enuPosition.x;
    const up = enuPosition.y;
    const north = -enuPosition.z;

    // Convert to angular offsets
    const dLon = east / (this.EARTH_RADIUS * cosRefLat);
    const dLat = north / this.EARTH_RADIUS;

    return {
      latitude: this.origin.latitude + toDeg(dLat),
      longitude: this.origin.longitude + toDeg(dLon),
      altitude: this.origin.altitude + up,
    };
  }

  /**
   * Calculate Haversine distance between two WGS84 points
   *
   * @returns Distance in meters
   */
  haversineDistance(a: WGS84Coordinate, b: WGS84Coordinate): number {
    const toRad = (deg: number) => deg * Math.PI / 180;

    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);

    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.asin(Math.sqrt(h));

    return this.EARTH_RADIUS * c;
  }

  /**
   * Calculate bearing from point A to point B
   *
   * @returns Bearing in degrees (0-360, 0=North, 90=East)
   */
  calculateBearing(from: WGS84Coordinate, to: WGS84Coordinate): number {
    const toRad = (deg: number) => deg * Math.PI / 180;
    const toDeg = (rad: number) => rad * 180 / Math.PI;

    const lat1 = toRad(from.latitude);
    const lat2 = toRad(to.latitude);
    const dLon = toRad(to.longitude - from.longitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = toDeg(Math.atan2(y, x));

    // Normalize to 0-360
    return (bearing + 360) % 360;
  }
}

// =============================================================================
// INDEXED DB PERSISTENCE
// =============================================================================

/**
 * Persistent storage for geospatial anchors with spatial indexing
 */
export class GeospatialAnchorStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'hololand-geospatial-anchors';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'anchors';

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });

          // Spatial indexes for efficient querying
          store.createIndex('latitude', 'coordinates.latitude', { unique: false });
          store.createIndex('longitude', 'coordinates.longitude', { unique: false });
          store.createIndex('createdBy', 'metadata.createdBy', { unique: false });
          store.createIndex('createdAt', 'metadata.createdAt', { unique: false });

          // Compound index for geospatial queries
          store.createIndex('latLon', ['coordinates.latitude', 'coordinates.longitude'], { unique: false });
        }
      };
    });
  }

  /**
   * Store anchor
   */
  async store(anchor: GeospatialAnchor): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(anchor);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store anchor'));
    });
  }

  /**
   * Retrieve anchor by ID
   */
  async get(id: string): Promise<GeospatialAnchor | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get anchor'));
    });
  }

  /**
   * Delete anchor
   */
  async delete(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete anchor'));
    });
  }

  /**
   * Query anchors within radius
   *
   * NOTE: This is a simplified implementation.
   * For production, use spatial indexes like R-Tree or quadtrees.
   */
  async queryRadius(query: SpatialQuery): Promise<GeospatialAnchor[]> {
    if (!this.db) throw new Error('Database not initialized');

    const allAnchors = await this.getAll();
    const converter = new GeospatialCoordinateConverter();

    // Filter by distance
    const results = allAnchors.filter(anchor => {
      const distance = converter.haversineDistance(query.center, anchor.coordinates);
      if (distance > query.radiusMeters) return false;

      // Filter by creator
      if (query.createdBy && anchor.metadata.createdBy !== query.createdBy) {
        return false;
      }

      // Filter by access
      if (query.accessibleBy) {
        if (anchor.metadata.createdBy !== query.accessibleBy &&
            !anchor.sharedWith.includes(query.accessibleBy)) {
          return false;
        }
      }

      return true;
    });

    // Sort by distance and apply limit
    results.sort((a, b) => {
      const distA = converter.haversineDistance(query.center, a.coordinates);
      const distB = converter.haversineDistance(query.center, b.coordinates);
      return distA - distB;
    });

    return query.limit ? results.slice(0, query.limit) : results;
  }

  /**
   * Get all anchors
   */
  async getAll(): Promise<GeospatialAnchor[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get all anchors'));
    });
  }

  /**
   * Clear all anchors
   */
  async clear(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear anchors'));
    });
  }
}

// =============================================================================
// AR PLATFORM INTEGRATION
// =============================================================================

/**
 * AR Platform Integration Layer
 * Abstracts ARCore Geospatial API and ARKit Location Anchors
 */
export class ARPlatformIntegration {
  private capabilities: PlatformCapabilities | null = null;

  /**
   * Detect AR platform capabilities
   */
  async detectCapabilities(): Promise<PlatformCapabilities> {
    // Check for ARCore (Android)
    if (typeof navigator !== 'undefined' && (navigator as any).xr) {
      const xr = (navigator as any).xr;

      // Check for ARCore Geospatial API
      if (xr.isSessionSupported && await xr.isSessionSupported('immersive-ar')) {
        this.capabilities = {
          platform: 'arcore',
          supportsGeospatial: true,
          supportsVPS: true,
          horizontalAccuracy: 5, // ARCore Geospatial typical accuracy
          verticalAccuracy: 3,
        };
        return this.capabilities;
      }
    }

    // Check for ARKit (iOS)
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.arkit) {
      this.capabilities = {
        platform: 'arkit',
        supportsGeospatial: true,
        supportsVPS: false,
        horizontalAccuracy: 10, // ARKit location anchor accuracy
        verticalAccuracy: 5,
      };
      return this.capabilities;
    }

    // Check for WebXR
    if (typeof navigator !== 'undefined' && (navigator as any).xr) {
      this.capabilities = {
        platform: 'webxr',
        supportsGeospatial: false,
        supportsVPS: false,
      };
      return this.capabilities;
    }

    // Fallback - no AR support
    this.capabilities = {
      platform: 'unknown',
      supportsGeospatial: false,
      supportsVPS: false,
    };
    return this.capabilities;
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): PlatformCapabilities | null {
    return this.capabilities;
  }

  /**
   * Create platform-specific geospatial anchor
   *
   * This is a stub - actual implementation requires native AR APIs
   */
  async createNativeAnchor(coords: WGS84Coordinate, rotation: Quaternion): Promise<string> {
    if (!this.capabilities?.supportsGeospatial) {
      throw new Error('Platform does not support geospatial anchoring');
    }

    // ARCore Geospatial API
    if (this.capabilities.platform === 'arcore') {
      // Stub: In real implementation, call ARCore Geospatial API
      // const anchorId = await arcoreGeospatialAPI.createAnchor(coords, rotation);
      return `arcore_${Date.now()}`;
    }

    // ARKit Location Anchors
    if (this.capabilities.platform === 'arkit') {
      // Stub: In real implementation, call ARKit via native bridge
      // const anchorId = await arkitNativeBridge.createLocationAnchor(coords, rotation);
      return `arkit_${Date.now()}`;
    }

    throw new Error(`Platform ${this.capabilities.platform} not implemented`);
  }

  /**
   * Resolve native anchor to local pose
   *
   * This is a stub - actual implementation requires native AR APIs
   */
  async resolveNativeAnchor(nativeId: string): Promise<Pose | null> {
    if (!this.capabilities?.supportsGeospatial) {
      return null;
    }

    // Stub: In real implementation, query AR session for anchor pose
    // const pose = await arSession.getAnchorPose(nativeId);
    return identityPose();
  }
}

// =============================================================================
// MULTI-USER ANCHOR SHARING PROTOCOL
// =============================================================================

/**
 * Multi-user anchor sharing via geospatial coordinates
 */
export class GeospatialSharingProtocol {
  private serverUrl: string;

  constructor(serverUrl: string = 'https://central.hololand.io/api/geospatial') {
    this.serverUrl = serverUrl;
  }

  /**
   * Publish anchor to server for sharing
   */
  async publishAnchor(anchor: GeospatialAnchor, authToken: string): Promise<void> {
    const response = await fetch(`${this.serverUrl}/anchors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(anchor),
    });

    if (!response.ok) {
      throw new Error(`Failed to publish anchor: ${response.statusText}`);
    }
  }

  /**
   * Fetch anchors from server within radius
   */
  async fetchAnchors(query: SpatialQuery, authToken: string): Promise<GeospatialAnchor[]> {
    const params = new URLSearchParams({
      lat: query.center.latitude.toString(),
      lon: query.center.longitude.toString(),
      radius: query.radiusMeters.toString(),
      ...(query.limit && { limit: query.limit.toString() }),
      ...(query.createdBy && { createdBy: query.createdBy }),
    });

    const response = await fetch(`${this.serverUrl}/anchors?${params}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch anchors: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update anchor sharing permissions
   */
  async shareWith(anchorId: string, userIds: string[], authToken: string): Promise<void> {
    const response = await fetch(`${this.serverUrl}/anchors/${anchorId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ sharedWith: userIds }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update sharing: ${response.statusText}`);
    }
  }

  /**
   * Delete anchor from server
   */
  async deleteAnchor(anchorId: string, authToken: string): Promise<void> {
    const response = await fetch(`${this.serverUrl}/anchors/${anchorId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete anchor: ${response.statusText}`);
    }
  }
}

// =============================================================================
// MAIN GEOSPATIAL ANCHOR SYSTEM
// =============================================================================

/**
 * Geospatial Anchor System
 *
 * Unified system for creating, managing, and sharing AR anchors
 * tied to real-world GPS coordinates.
 */
export class GeospatialAnchorSystem {
  private converter: GeospatialCoordinateConverter;
  private storage: GeospatialAnchorStorage;
  private platform: ARPlatformIntegration;
  private sharing: GeospatialSharingProtocol;
  private initialized = false;

  constructor(serverUrl?: string) {
    this.converter = new GeospatialCoordinateConverter();
    this.storage = new GeospatialAnchorStorage();
    this.platform = new ARPlatformIntegration();
    this.sharing = new GeospatialSharingProtocol(serverUrl);
  }

  /**
   * Initialize system
   */
  async init(origin?: WGS84Coordinate): Promise<PlatformCapabilities> {
    // Initialize storage
    await this.storage.init();

    // Detect AR capabilities
    const capabilities = await this.platform.detectCapabilities();

    // Set coordinate origin if provided
    if (origin) {
      this.converter.setOrigin(origin);
    }

    this.initialized = true;
    return capabilities;
  }

  /**
   * Create new geospatial anchor
   */
  async createAnchor(
    coordinates: WGS84Coordinate,
    rotation: Quaternion,
    metadata: { label?: string; createdBy: string; contentId?: string }
  ): Promise<GeospatialAnchor> {
    if (!this.initialized) throw new Error('System not initialized');

    const { contentId, ...anchorMetadata } = metadata;
    const anchor: GeospatialAnchor = {
      id: `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      coordinates,
      rotation,
      metadata: {
        ...anchorMetadata,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: this.platform.getCapabilities()?.platform || 'unknown',
        horizontalAccuracy: this.platform.getCapabilities()?.horizontalAccuracy,
        verticalAccuracy: this.platform.getCapabilities()?.verticalAccuracy,
      },
      sharedWith: [],
      ...(contentId !== undefined ? { contentId } : {}),
    };

    // Store locally
    await this.storage.store(anchor);

    return anchor;
  }

  /**
   * Get anchor by ID
   */
  async getAnchor(id: string): Promise<GeospatialAnchor | null> {
    return this.storage.get(id);
  }

  /**
   * Query nearby anchors
   */
  async queryNearby(query: SpatialQuery): Promise<GeospatialAnchor[]> {
    return this.storage.queryRadius(query);
  }

  /**
   * Convert anchor to local ENU pose
   */
  anchorToLocalPose(anchor: GeospatialAnchor): Pose {
    const position = this.converter.wgs84ToENU(anchor.coordinates);
    return {
      position,
      rotation: anchor.rotation,
    };
  }

  /**
   * Publish anchor for multi-user sharing
   */
  async publishAnchor(anchorId: string, authToken: string): Promise<void> {
    const anchor = await this.storage.get(anchorId);
    if (!anchor) throw new Error('Anchor not found');

    await this.sharing.publishAnchor(anchor, authToken);
  }

  /**
   * Fetch shared anchors from server
   */
  async fetchSharedAnchors(query: SpatialQuery, authToken: string): Promise<GeospatialAnchor[]> {
    const anchors = await this.sharing.fetchAnchors(query, authToken);

    // Store locally for offline access
    for (const anchor of anchors) {
      await this.storage.store(anchor);
    }

    return anchors;
  }

  /**
   * Share anchor with users
   */
  async shareAnchor(anchorId: string, userIds: string[], authToken: string): Promise<void> {
    const anchor = await this.storage.get(anchorId);
    if (!anchor) throw new Error('Anchor not found');

    // Update local copy
    anchor.sharedWith = [...new Set([...anchor.sharedWith, ...userIds])];
    anchor.metadata.updatedAt = Date.now();
    await this.storage.store(anchor);

    // Update server
    await this.sharing.shareWith(anchorId, anchor.sharedWith, authToken);
  }

  /**
   * Delete anchor
   */
  async deleteAnchor(anchorId: string, authToken?: string): Promise<void> {
    // Delete locally
    await this.storage.delete(anchorId);

    // Delete from server if authenticated
    if (authToken) {
      try {
        await this.sharing.deleteAnchor(anchorId, authToken);
      } catch (error) {
        console.warn('Failed to delete anchor from server:', error);
      }
    }
  }

  /**
   * Get coordinate converter
   */
  getConverter(): GeospatialCoordinateConverter {
    return this.converter;
  }

  /**
   * Get platform capabilities
   */
  getCapabilities(): PlatformCapabilities | null {
    return this.platform.getCapabilities();
  }

  /**
   * Clear all local anchors
   */
  async clearLocalAnchors(): Promise<void> {
    await this.storage.clear();
  }
}
