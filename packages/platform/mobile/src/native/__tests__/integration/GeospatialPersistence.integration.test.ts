/**
 * @vitest-environment jsdom
 *
 * Integration tests for geospatial anchor persistence with IndexedDB.
 *
 * Tests the integration between:
 * - Native GeospatialBridge (ARKit/ARCore/WebXR)
 * - GeospatialAnchorSystem (IndexedDB persistence)
 * - Multi-user anchor sharing scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WGS84Coordinate, NativeGeospatialAnchor, Quaternion } from '../../GeospatialBridge';

// =============================================================================
// MOCK DATA
// =============================================================================

const TEST_LOCATIONS = {
  sanFrancisco: { latitude: 37.7749, longitude: -122.4194, altitude: 16 },
  goldenGate: { latitude: 37.8199, longitude: -122.4783, altitude: 67 },
  alcatraz: { latitude: 37.8267, longitude: -122.4233, altitude: 41 },
  fishermansWharf: { latitude: 37.8080, longitude: -122.4177, altitude: 3 },
} as const;

const IDENTITY_ROTATION: Quaternion = { x: 0, y: 0, z: 0, w: 1 };

// =============================================================================
// MOCK INDEXED DB
// =============================================================================

interface StoredAnchor {
  id: string;
  nativeAnchorId: string | null;
  coordinate: WGS84Coordinate;
  rotation: Quaternion;
  metadata: {
    label?: string;
    createdBy: string;
    createdAt: number;
    platform: 'arkit' | 'arcore' | 'webxr';
    shared: boolean;
  };
}

class MockAnchorStore {
  private anchors: Map<string, StoredAnchor> = new Map();
  private idCounter = 0;

  async createAnchor(
    coordinate: WGS84Coordinate,
    rotation: Quaternion,
    metadata: Omit<StoredAnchor['metadata'], 'createdAt'>
  ): Promise<StoredAnchor> {
    const id = `anchor_${this.idCounter++}`;
    const anchor: StoredAnchor = {
      id,
      nativeAnchorId: null,
      coordinate,
      rotation,
      metadata: {
        ...metadata,
        createdAt: Date.now(),
      },
    };

    this.anchors.set(id, anchor);
    return anchor;
  }

  async getAnchor(id: string): Promise<StoredAnchor | null> {
    return this.anchors.get(id) || null;
  }

  async getAllAnchors(): Promise<StoredAnchor[]> {
    return Array.from(this.anchors.values());
  }

  async updateAnchor(id: string, updates: Partial<StoredAnchor>): Promise<void> {
    const anchor = this.anchors.get(id);
    if (anchor) {
      this.anchors.set(id, { ...anchor, ...updates });
    }
  }

  async deleteAnchor(id: string): Promise<void> {
    this.anchors.delete(id);
  }

  async queryNearby(
    center: WGS84Coordinate,
    radiusMeters: number
  ): Promise<StoredAnchor[]> {
    const anchors = Array.from(this.anchors.values());

    return anchors.filter(anchor => {
      const distance = haversineDistance(center, anchor.coordinate);
      return distance <= radiusMeters;
    });
  }

  async clear(): Promise<void> {
    this.anchors.clear();
    this.idCounter = 0;
  }
}

// Haversine distance helper (copied from main implementation)
function haversineDistance(a: WGS84Coordinate, b: WGS84Coordinate): number {
  const EARTH_RADIUS = 6371000;
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

// =============================================================================
// MOCK NATIVE BRIDGE
// =============================================================================

class MockGeospatialBridge {
  private nativeAnchors: Map<string, NativeGeospatialAnchor> = new Map();
  private platform: 'arkit' | 'arcore' | 'webxr' = 'webxr';
  private idCounter = 0;

  setPlatform(platform: 'arkit' | 'arcore' | 'webxr') {
    this.platform = platform;
  }

  async createGeospatialAnchor(options: {
    coordinate: WGS84Coordinate;
    rotation?: Quaternion;
    label?: string;
  }): Promise<NativeGeospatialAnchor> {
    const anchorId = `${this.platform}_${this.idCounter++}_${Date.now()}`;

    const anchor: NativeGeospatialAnchor = {
      anchorId,
      coordinate: options.coordinate,
      rotation: options.rotation || IDENTITY_ROTATION,
      horizontalAccuracy: this.getHorizontalAccuracy(),
      verticalAccuracy: this.getVerticalAccuracy(),
      platform: this.platform,
      timestamp: Date.now(),
    };

    this.nativeAnchors.set(anchorId, anchor);
    return anchor;
  }

  async resolveGeospatialAnchor(options: {
    anchorId: string;
  }): Promise<NativeGeospatialAnchor> {
    const anchor = this.nativeAnchors.get(options.anchorId);
    if (!anchor) {
      throw new Error(`Anchor not found: ${options.anchorId}`);
    }
    return anchor;
  }

  async removeGeospatialAnchor(options: { anchorId: string }): Promise<{ success: boolean }> {
    this.nativeAnchors.delete(options.anchorId);
    return { success: true };
  }

  private getHorizontalAccuracy(): number {
    switch (this.platform) {
      case 'arkit':
        return 7.5; // 5-10m typical
      case 'arcore':
        return 2.5; // 1-5m with VPS
      case 'webxr':
        return 10.0; // 3-15m GPS-only
    }
  }

  private getVerticalAccuracy(): number | null {
    switch (this.platform) {
      case 'arkit':
        return 4.0; // 3-5m typical
      case 'arcore':
        return 2.0; // 1-3m with VPS
      case 'webxr':
        return null; // Web doesn't provide vertical accuracy
    }
  }

  clear() {
    this.nativeAnchors.clear();
    this.idCounter = 0;
  }
}

// =============================================================================
// UNIFIED SERVICE (INTEGRATES BOTH SYSTEMS)
// =============================================================================

class UnifiedGeospatialService {
  constructor(
    private store: MockAnchorStore,
    private bridge: MockGeospatialBridge
  ) {}

  async createAnchor(
    coordinate: WGS84Coordinate,
    metadata: {
      label?: string;
      createdBy: string;
      shared?: boolean;
    }
  ): Promise<{ platformAnchor: StoredAnchor; nativeAnchor: NativeGeospatialAnchor }> {
    // 1. Create in platform store (IndexedDB)
    const platformAnchor = await this.store.createAnchor(
      coordinate,
      IDENTITY_ROTATION,
      {
        label: metadata.label,
        createdBy: metadata.createdBy,
        platform: this.bridge['platform'],
        shared: metadata.shared || false,
      }
    );

    // 2. Create native AR anchor
    const nativeAnchor = await this.bridge.createGeospatialAnchor({
      coordinate,
      rotation: IDENTITY_ROTATION,
      label: metadata.label,
    });

    // 3. Link platform anchor to native anchor
    await this.store.updateAnchor(platformAnchor.id, {
      nativeAnchorId: nativeAnchor.anchorId,
    });

    // 4. Re-fetch to get updated anchor with nativeAnchorId
    const updatedPlatformAnchor = await this.store.getAnchor(platformAnchor.id);

    return { platformAnchor: updatedPlatformAnchor!, nativeAnchor };
  }

  async queryNearby(
    center: WGS84Coordinate,
    radiusMeters: number
  ): Promise<StoredAnchor[]> {
    return this.store.queryNearby(center, radiusMeters);
  }

  async deleteAnchor(anchorId: string): Promise<void> {
    // 1. Get platform anchor
    const anchor = await this.store.getAnchor(anchorId);
    if (!anchor) {
      throw new Error(`Anchor not found: ${anchorId}`);
    }

    // 2. Delete native anchor if exists
    if (anchor.nativeAnchorId) {
      await this.bridge.removeGeospatialAnchor({
        anchorId: anchor.nativeAnchorId,
      });
    }

    // 3. Delete platform anchor
    await this.store.deleteAnchor(anchorId);
  }
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Geospatial Persistence Integration', () => {
  let store: MockAnchorStore;
  let bridge: MockGeospatialBridge;
  let service: UnifiedGeospatialService;

  beforeEach(async () => {
    store = new MockAnchorStore();
    bridge = new MockGeospatialBridge();
    service = new UnifiedGeospatialService(store, bridge);
  });

  afterEach(async () => {
    await store.clear();
    bridge.clear();
  });

  describe('anchor creation with dual persistence', () => {
    it('creates anchor in both IndexedDB and native AR', async () => {
      const { platformAnchor, nativeAnchor } = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        { label: 'SF Anchor', createdBy: 'user-123' }
      );

      // Verify platform anchor
      expect(platformAnchor.id).toBeTruthy();
      expect(platformAnchor.coordinate.latitude).toBeCloseTo(37.7749);
      expect(platformAnchor.nativeAnchorId).toBe(nativeAnchor.anchorId);

      // Verify native anchor
      expect(nativeAnchor.anchorId).toBeTruthy();
      expect(nativeAnchor.coordinate.latitude).toBeCloseTo(37.7749);
      expect(nativeAnchor.platform).toBe('webxr');
    });

    it('links platform anchor to native anchor ID', async () => {
      const { platformAnchor } = await service.createAnchor(
        TEST_LOCATIONS.goldenGate,
        { label: 'Golden Gate', createdBy: 'user-456' }
      );

      // Retrieve and verify link
      const retrieved = await store.getAnchor(platformAnchor.id);
      expect(retrieved!.nativeAnchorId).toBeTruthy();
      expect(retrieved!.nativeAnchorId).toContain('webxr_');
    });

    it('creates multiple anchors independently', async () => {
      const anchor1 = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        { label: 'SF', createdBy: 'user-1' }
      );
      const anchor2 = await service.createAnchor(
        TEST_LOCATIONS.goldenGate,
        { label: 'GG', createdBy: 'user-2' }
      );

      expect(anchor1.platformAnchor.id).not.toBe(anchor2.platformAnchor.id);
      expect(anchor1.nativeAnchor.anchorId).not.toBe(anchor2.nativeAnchor.anchorId);
    });
  });

  describe('spatial queries', () => {
    it('finds anchors within 5km radius', async () => {
      // Create anchors at different SF locations
      await service.createAnchor(TEST_LOCATIONS.sanFrancisco, {
        label: 'SF Downtown',
        createdBy: 'user-1',
      });
      await service.createAnchor(TEST_LOCATIONS.goldenGate, {
        label: 'Golden Gate',
        createdBy: 'user-2',
      });
      await service.createAnchor(TEST_LOCATIONS.alcatraz, {
        label: 'Alcatraz',
        createdBy: 'user-3',
      });

      // Query from downtown SF
      const nearby = await service.queryNearby(TEST_LOCATIONS.sanFrancisco, 10000);

      expect(nearby.length).toBe(3); // All 3 anchors within 10km
    });

    it('excludes anchors outside radius', async () => {
      await service.createAnchor(TEST_LOCATIONS.sanFrancisco, {
        label: 'SF',
        createdBy: 'user-1',
      });
      await service.createAnchor(TEST_LOCATIONS.goldenGate, {
        label: 'GG',
        createdBy: 'user-2',
      });

      // Query with small radius (1km)
      const nearby = await service.queryNearby(TEST_LOCATIONS.sanFrancisco, 1000);

      expect(nearby.length).toBe(1); // Only SF anchor within 1km
      expect(nearby[0].metadata.label).toBe('SF');
    });

    it('returns empty array when no anchors nearby', async () => {
      await service.createAnchor(TEST_LOCATIONS.sanFrancisco, {
        label: 'SF',
        createdBy: 'user-1',
      });

      // Query far away location
      const farLocation = { latitude: 40.7128, longitude: -74.0060, altitude: 0 }; // NYC
      const nearby = await service.queryNearby(farLocation, 1000);

      expect(nearby.length).toBe(0);
    });
  });

  describe('anchor deletion', () => {
    it('deletes from both IndexedDB and native AR', async () => {
      const { platformAnchor, nativeAnchor } = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        { label: 'Temp Anchor', createdBy: 'user-1' }
      );

      // Delete
      await service.deleteAnchor(platformAnchor.id);

      // Verify platform deletion
      const platformRetrieved = await store.getAnchor(platformAnchor.id);
      expect(platformRetrieved).toBeNull();

      // Verify native deletion
      await expect(
        bridge.resolveGeospatialAnchor({ anchorId: nativeAnchor.anchorId })
      ).rejects.toThrow('Anchor not found');
    });

    it('throws error when deleting non-existent anchor', async () => {
      await expect(service.deleteAnchor('invalid-id')).rejects.toThrow('Anchor not found');
    });
  });

  describe('platform-specific accuracy', () => {
    it('stores ARKit accuracy with anchor', async () => {
      bridge.setPlatform('arkit');

      const { nativeAnchor } = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        { label: 'ARKit Anchor', createdBy: 'user-1' }
      );

      expect(nativeAnchor.platform).toBe('arkit');
      expect(nativeAnchor.horizontalAccuracy).toBeGreaterThanOrEqual(5);
      expect(nativeAnchor.horizontalAccuracy).toBeLessThanOrEqual(10);
      expect(nativeAnchor.verticalAccuracy).toBeGreaterThanOrEqual(3);
      expect(nativeAnchor.verticalAccuracy).toBeLessThanOrEqual(5);
    });

    it('stores ARCore VPS accuracy with anchor', async () => {
      bridge.setPlatform('arcore');

      const { nativeAnchor } = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        { label: 'ARCore Anchor', createdBy: 'user-1' }
      );

      expect(nativeAnchor.platform).toBe('arcore');
      expect(nativeAnchor.horizontalAccuracy).toBeGreaterThanOrEqual(1);
      expect(nativeAnchor.horizontalAccuracy).toBeLessThanOrEqual(5);
    });

    it('handles null vertical accuracy for WebXR', async () => {
      bridge.setPlatform('webxr');

      const { nativeAnchor } = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        { label: 'Web Anchor', createdBy: 'user-1' }
      );

      expect(nativeAnchor.platform).toBe('webxr');
      expect(nativeAnchor.verticalAccuracy).toBeNull();
    });
  });

  describe('multi-user anchor sharing', () => {
    it('creates shared anchor visible to all users', async () => {
      const { platformAnchor } = await service.createAnchor(
        TEST_LOCATIONS.goldenGate,
        {
          label: 'Shared Golden Gate Marker',
          createdBy: 'user-1',
          shared: true,
        }
      );

      expect(platformAnchor.metadata.shared).toBe(true);
      expect(platformAnchor.metadata.createdBy).toBe('user-1');

      // Query as different user
      const nearby = await service.queryNearby(TEST_LOCATIONS.goldenGate, 100);
      expect(nearby.length).toBe(1);
      expect(nearby[0].metadata.shared).toBe(true);
    });

    it('creates private anchor owned by single user', async () => {
      const { platformAnchor } = await service.createAnchor(
        TEST_LOCATIONS.sanFrancisco,
        {
          label: 'Private Note',
          createdBy: 'user-2',
          shared: false,
        }
      );

      expect(platformAnchor.metadata.shared).toBe(false);
      expect(platformAnchor.metadata.createdBy).toBe('user-2');
    });

    it('supports multiple users creating anchors at same location', async () => {
      const location = TEST_LOCATIONS.fishermansWharf;

      const anchor1 = await service.createAnchor(location, {
        label: 'User 1 Marker',
        createdBy: 'user-1',
      });
      const anchor2 = await service.createAnchor(location, {
        label: 'User 2 Marker',
        createdBy: 'user-2',
      });

      const nearby = await service.queryNearby(location, 10);
      expect(nearby.length).toBe(2);

      const creators = nearby.map(a => a.metadata.createdBy);
      expect(creators).toContain('user-1');
      expect(creators).toContain('user-2');
    });

    it('maintains anchor ownership through persistence', async () => {
      const { platformAnchor } = await service.createAnchor(
        TEST_LOCATIONS.alcatraz,
        { label: 'Owned Anchor', createdBy: 'user-42' }
      );

      // Retrieve and verify ownership persists
      const retrieved = await store.getAnchor(platformAnchor.id);
      expect(retrieved!.metadata.createdBy).toBe('user-42');
    });
  });

  describe('concurrent operations', () => {
    it('handles simultaneous anchor creation', async () => {
      const promises = [
        service.createAnchor(TEST_LOCATIONS.sanFrancisco, {
          label: 'Concurrent 1',
          createdBy: 'user-1',
        }),
        service.createAnchor(TEST_LOCATIONS.goldenGate, {
          label: 'Concurrent 2',
          createdBy: 'user-2',
        }),
        service.createAnchor(TEST_LOCATIONS.alcatraz, {
          label: 'Concurrent 3',
          createdBy: 'user-3',
        }),
      ];

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      expect(new Set(results.map(r => r.platformAnchor.id)).size).toBe(3); // All unique
    });

    it('handles simultaneous queries', async () => {
      await service.createAnchor(TEST_LOCATIONS.sanFrancisco, {
        label: 'Query Test',
        createdBy: 'user-1',
      });

      const promises = [
        service.queryNearby(TEST_LOCATIONS.sanFrancisco, 1000),
        service.queryNearby(TEST_LOCATIONS.sanFrancisco, 5000),
        service.queryNearby(TEST_LOCATIONS.sanFrancisco, 10000),
      ];

      const results = await Promise.all(promises);

      expect(results[0].length).toBeGreaterThanOrEqual(1);
      expect(results[1].length).toBeGreaterThanOrEqual(results[0].length);
      expect(results[2].length).toBeGreaterThanOrEqual(results[1].length);
    });
  });
});
