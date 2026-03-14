/**
 * Geospatial Anchor System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GeospatialAnchorSystem,
  GeospatialCoordinateConverter,
  type WGS84Coordinate,
} from '../GeospatialAnchorSystem';

// =============================================================================
// COORDINATE CONVERTER TESTS
// =============================================================================

describe('GeospatialCoordinateConverter', () => {
  let converter: GeospatialCoordinateConverter;
  const sanFrancisco: WGS84Coordinate = {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 0,
  };

  beforeEach(() => {
    converter = new GeospatialCoordinateConverter();
  });

  describe('WGS84 to ENU conversion', () => {
    it('converts coordinates to local ENU correctly', () => {
      converter.setOrigin(sanFrancisco);

      // Point ~111m north, ~111m east, 10m up
      const point: WGS84Coordinate = {
        latitude: 37.7759, // +0.001 degrees
        longitude: -122.4184, // +0.001 degrees
        altitude: 10,
      };

      const enu = converter.wgs84ToENU(point);

      // +0.001° latitude ≈ 111m north; +0.001° longitude at ~38°N ≈ 88m east (cos(38°) ≈ 0.788)
      expect(enu.x).toBeCloseTo(88, -1); // East (~88m at this latitude)
      expect(enu.y).toBe(10); // Up
      expect(enu.z).toBeCloseTo(-111, -1); // -North (HoloLand convention)
    });

    it('returns zero vector for origin point', () => {
      converter.setOrigin(sanFrancisco);
      const enu = converter.wgs84ToENU(sanFrancisco);

      expect(enu.x).toBe(0);
      expect(enu.y).toBe(0);
      expect(enu.z).toBe(0);
    });

    it('throws error if origin not set', () => {
      expect(() => {
        converter.wgs84ToENU(sanFrancisco);
      }).toThrow('Origin not set');
    });
  });

  describe('ENU to WGS84 conversion', () => {
    it('converts local ENU to WGS84 correctly', () => {
      converter.setOrigin(sanFrancisco);

      const enu = { x: 111, y: 10, z: -111 }; // ~111m east, 10m up, ~111m north
      const coords = converter.enuToWGS84(enu);

      expect(coords.latitude).toBeCloseTo(37.7759, 3);
      expect(coords.longitude).toBeCloseTo(-122.4184, 3);
      expect(coords.altitude).toBe(10);
    });

    it('round-trip conversion preserves coordinates', () => {
      converter.setOrigin(sanFrancisco);

      const original: WGS84Coordinate = {
        latitude: 37.7800,
        longitude: -122.4100,
        altitude: 50,
      };

      const enu = converter.wgs84ToENU(original);
      const restored = converter.enuToWGS84(enu);

      expect(restored.latitude).toBeCloseTo(original.latitude, 6);
      expect(restored.longitude).toBeCloseTo(original.longitude, 6);
      expect(restored.altitude).toBeCloseTo(original.altitude, 1);
    });
  });

  describe('Haversine distance', () => {
    it('calculates distance between close points', () => {
      const point1: WGS84Coordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
      };

      const point2: WGS84Coordinate = {
        latitude: 37.7759, // ~111m north (0.001 degrees ≈ 111m)
        longitude: -122.4194,
        altitude: 0,
      };

      const distance = converter.haversineDistance(point1, point2);
      expect(distance).toBeCloseTo(111, -1); // ~111m
    });

    it('calculates distance between distant cities', () => {
      const losAngeles: WGS84Coordinate = {
        latitude: 34.0522,
        longitude: -118.2437,
        altitude: 0,
      };

      const distance = converter.haversineDistance(sanFrancisco, losAngeles);
      expect(distance).toBeCloseTo(559000, -3); // ~559km
    });

    it('returns zero for same point', () => {
      const distance = converter.haversineDistance(sanFrancisco, sanFrancisco);
      expect(distance).toBe(0);
    });
  });

  describe('Bearing calculation', () => {
    it('calculates bearing to north', () => {
      const north: WGS84Coordinate = {
        latitude: 37.7849, // 100x further north
        longitude: -122.4194,
        altitude: 0,
      };

      const bearing = converter.calculateBearing(sanFrancisco, north);
      expect(bearing).toBeCloseTo(0, 0); // 0° = North
    });

    it('calculates bearing to east', () => {
      const east: WGS84Coordinate = {
        latitude: 37.7749,
        longitude: -122.4094, // 100x further east
        altitude: 0,
      };

      const bearing = converter.calculateBearing(sanFrancisco, east);
      expect(bearing).toBeCloseTo(90, 0); // 90° = East
    });
  });
});

// =============================================================================
// GEOSPATIAL ANCHOR SYSTEM TESTS
// =============================================================================

describe('GeospatialAnchorSystem', () => {
  let system: GeospatialAnchorSystem;

  beforeEach(async () => {
    system = new GeospatialAnchorSystem();

    // Mock IndexedDB for testing
    await mockIndexedDB();

    // Initialize with test origin
    await system.init({
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
    });
  });

  afterEach(async () => {
    await system.clearLocalAnchors();
  });

  describe('Anchor creation', () => {
    it('creates anchor at GPS location', async () => {
      const coords: WGS84Coordinate = {
        latitude: 37.7750,
        longitude: -122.4194,
        altitude: 10,
      };

      const anchor = await system.createAnchor(
        coords,
        { x: 0, y: 0, z: 0, w: 1 },
        {
          label: 'Test Anchor',
          createdBy: 'test-user',
        }
      );

      expect(anchor.id).toBeDefined();
      expect(anchor.coordinates).toEqual(coords);
      expect(anchor.metadata.label).toBe('Test Anchor');
      expect(anchor.metadata.createdBy).toBe('test-user');
    });

    it('generates unique IDs for anchors', async () => {
      const coords: WGS84Coordinate = {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
      };

      const anchor1 = await system.createAnchor(coords, { x: 0, y: 0, z: 0, w: 1 }, {
        createdBy: 'user-1',
      });

      const anchor2 = await system.createAnchor(coords, { x: 0, y: 0, z: 0, w: 1 }, {
        createdBy: 'user-1',
      });

      expect(anchor1.id).not.toBe(anchor2.id);
    });
  });

  describe('Anchor retrieval', () => {
    it('retrieves anchor by ID', async () => {
      const anchor = await system.createAnchor(
        { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Retrieval Test', createdBy: 'test-user' }
      );

      const retrieved = await system.getAnchor(anchor.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(anchor.id);
      expect(retrieved!.metadata.label).toBe('Retrieval Test');
    });

    it('returns null for non-existent anchor', async () => {
      const retrieved = await system.getAnchor('non-existent-id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Spatial queries', () => {
    beforeEach(async () => {
      // Create test anchors at various distances
      const origin = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };

      // ~111m north
      await system.createAnchor(
        { latitude: 37.7759, longitude: -122.4194, altitude: 0 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Close North', createdBy: 'test-user' }
      );

      // ~111m east
      await system.createAnchor(
        { latitude: 37.7749, longitude: -122.4184, altitude: 0 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Close East', createdBy: 'test-user' }
      );

      // ~1.1km north
      await system.createAnchor(
        { latitude: 37.7849, longitude: -122.4194, altitude: 0 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Far North', createdBy: 'test-user' }
      );
    });

    it('finds anchors within radius', async () => {
      const nearby = await system.queryNearby({
        center: { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
        radiusMeters: 500,
      });

      expect(nearby.length).toBe(2); // Only the close ones
      expect(nearby.map(a => a.metadata.label)).toContain('Close North');
      expect(nearby.map(a => a.metadata.label)).toContain('Close East');
      expect(nearby.map(a => a.metadata.label)).not.toContain('Far North');
    });

    it('sorts results by distance', async () => {
      const nearby = await system.queryNearby({
        center: { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
        radiusMeters: 2000,
      });

      // All three should be included and sorted by distance
      expect(nearby.length).toBe(3);

      const distances = nearby.map(anchor =>
        system.getConverter().haversineDistance(
          { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
          anchor.coordinates
        )
      );

      // Check sorted order
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
      }
    });

    it('applies limit to results', async () => {
      const nearby = await system.queryNearby({
        center: { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
        radiusMeters: 2000,
        limit: 2,
      });

      expect(nearby.length).toBe(2);
    });

    it('filters by creator', async () => {
      await system.createAnchor(
        { latitude: 37.7750, longitude: -122.4194, altitude: 0 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Other User Anchor', createdBy: 'other-user' }
      );

      const nearby = await system.queryNearby({
        center: { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
        radiusMeters: 500,
        createdBy: 'test-user',
      });

      expect(nearby.every(a => a.metadata.createdBy === 'test-user')).toBe(true);
    });
  });

  describe('Anchor conversion', () => {
    it('converts anchor to local pose', async () => {
      const anchor = await system.createAnchor(
        { latitude: 37.7759, longitude: -122.4194, altitude: 10 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Pose Test', createdBy: 'test-user' }
      );

      const localPose = system.anchorToLocalPose(anchor);

      // Should be ~111m north, 10m up
      expect(localPose.position.x).toBeCloseTo(0, -1);
      expect(localPose.position.y).toBe(10);
      expect(localPose.position.z).toBeCloseTo(-111, -1);
      expect(localPose.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });
  });

  describe('Anchor deletion', () => {
    it('deletes anchor from local storage', async () => {
      const anchor = await system.createAnchor(
        { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
        { x: 0, y: 0, z: 0, w: 1 },
        { label: 'Delete Test', createdBy: 'test-user' }
      );

      await system.deleteAnchor(anchor.id);

      const retrieved = await system.getAnchor(anchor.id);
      expect(retrieved).toBeNull();
    });
  });
});

// =============================================================================
// MOCK HELPERS
// =============================================================================

async function mockIndexedDB() {
  if (typeof (globalThis as any).indexedDB !== 'undefined') return;

  // Inline in-memory IDB mock — fake-indexeddb package is not a dependency
  const databases = new Map<string, Map<string, Map<string, any>>>();

  function openDB(name: string, _version: number): any {
    const request: any = {};
    let db = databases.get(name);
    const needsUpgrade = !db;
    if (!db) { db = new Map(); databases.set(name, db); }

    const dbObj: any = {
      objectStoreNames: { contains: (n: string) => db!.has(n) },
      createObjectStore: (storeName: string) => {
        const store = new Map<string, any>();
        db!.set(storeName, store);
        return { createIndex: () => ({}) };
      },
      transaction: (storeNames: string[]) => {
        const storeName = storeNames[0];
        const storeData = db!.get(storeName) || new Map();
        const objectStore: any = {
          put: (value: any) => {
            storeData.set(value.id, JSON.parse(JSON.stringify(value)));
            const req: any = {};
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          get: (key: string) => {
            const result = storeData.get(key) || null;
            const req: any = { result: result ? JSON.parse(JSON.stringify(result)) : null };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          getAll: () => {
            const result = Array.from(storeData.values()).map((v: any) => JSON.parse(JSON.stringify(v)));
            const req: any = { result };
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          delete: (key: string) => {
            storeData.delete(key);
            const req: any = {};
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
          clear: () => {
            storeData.clear();
            const req: any = {};
            queueMicrotask(() => req.onsuccess?.());
            return req;
          },
        };
        return { objectStore: () => objectStore };
      },
      close: () => {},
    };

    request.result = dbObj;
    queueMicrotask(() => {
      if (needsUpgrade) request.onupgradeneeded?.({ target: request });
      request.onsuccess?.();
    });
    return request;
  }

  (globalThis as any).indexedDB = { open: openDB };
  (globalThis as any).IDBKeyRange = {
    bound: (lower: any, upper: any) => ({ lower, upper }),
    only: (value: any) => ({ only: value }),
    lowerBound: (lower: any) => ({ lower }),
    upperBound: (upper: any) => ({ upper }),
  };
}
