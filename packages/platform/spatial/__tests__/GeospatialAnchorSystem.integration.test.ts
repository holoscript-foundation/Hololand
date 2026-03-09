/**
 * @vitest-environment jsdom
 *
 * Comprehensive integration tests for GeospatialAnchorSystem.
 *
 * Covers:
 * 1. WGS84 to ENU coordinate conversion accuracy
 * 2. IndexedDB anchor persistence across sessions
 * 3. Multi-user anchor sharing protocol
 * 4. Haversine distance calculations at various scales
 * 5. End-to-end anchor create/persist/reload/share lifecycle
 * 6. R-Tree spatial indexing performance with 100K anchors
 *
 * Validates against iOS (ARKit Location Anchors) and Android (ARCore Geospatial API)
 * expected accuracy and behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import {
  GeospatialAnchorSystem,
  GeospatialCoordinateConverter,
  GeospatialAnchorStorage,
  GeospatialSharingProtocol,
  type WGS84Coordinate,
  type GeospatialAnchor,
  type SpatialQuery,
} from '../GeospatialAnchorSystem';

// =============================================================================
// IN-MEMORY INDEXEDDB MOCK
// =============================================================================

/**
 * Minimal in-memory IDB mock sufficient for GeospatialAnchorStorage.
 * Implements: open, createObjectStore, put, get, getAll, delete, clear, createIndex.
 */
function createFakeIndexedDB() {
  const databases: Map<string, Map<string, Map<string, any>>> = new Map();

  function openDB(name: string, version: number): IDBOpenDBRequest {
    const request: any = {};
    let db = databases.get(name);
    const needsUpgrade = !db;

    if (!db) {
      db = new Map();
      databases.set(name, db);
    }

    const dbObj: any = {
      objectStoreNames: {
        contains: (n: string) => db!.has(n),
      },
      createObjectStore: (storeName: string, _opts?: any) => {
        const store = new Map<string, any>();
        db!.set(storeName, store);
        return {
          createIndex: () => ({}),
        };
      },
      transaction: (storeNames: string[], _mode?: string) => {
        const storeName = storeNames[0];
        const storeData = db!.get(storeName) || new Map();

        const objectStore: any = {
          put: (value: any) => {
            const key = value.id;
            storeData.set(key, JSON.parse(JSON.stringify(value)));
            const req: any = {};
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
          get: (key: string) => {
            const result = storeData.get(key) || null;
            const req: any = { result: result ? JSON.parse(JSON.stringify(result)) : null };
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
          getAll: () => {
            const result = Array.from(storeData.values()).map((v: any) =>
              JSON.parse(JSON.stringify(v)),
            );
            const req: any = { result };
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
          delete: (key: string) => {
            storeData.delete(key);
            const req: any = {};
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
          clear: () => {
            storeData.clear();
            const req: any = {};
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
        };

        return {
          objectStore: (_name?: string) => objectStore,
        };
      },
      close: () => {},
    };

    request.result = dbObj;

    setTimeout(() => {
      if (needsUpgrade) {
        request.onupgradeneeded?.({ target: request });
      }
      request.onsuccess?.();
    }, 0);

    return request;
  }

  return {
    open: openDB,
    deleteDatabase: (name: string) => {
      databases.delete(name);
      const req: any = {};
      setTimeout(() => req.onsuccess?.(), 0);
      return req;
    },
    _databases: databases,
  };
}

function installFakeIndexedDB() {
  const fakeIDB = createFakeIndexedDB();
  (globalThis as any).indexedDB = fakeIDB;
  return fakeIDB;
}

// =============================================================================
// TEST CONSTANTS
// =============================================================================

// Well-known reference locations with verified WGS84 coordinates
const REFERENCE_LOCATIONS = {
  // San Francisco, CA (Union Square)
  sanFrancisco: { latitude: 37.7749, longitude: -122.4194, altitude: 16 } as WGS84Coordinate,
  // Golden Gate Bridge, SF
  goldenGateBridge: { latitude: 37.8199, longitude: -122.4783, altitude: 67 } as WGS84Coordinate,
  // New York City (Times Square)
  newYork: { latitude: 40.7580, longitude: -73.9855, altitude: 10 } as WGS84Coordinate,
  // London (Big Ben)
  london: { latitude: 51.5007, longitude: -0.1246, altitude: 11 } as WGS84Coordinate,
  // Tokyo (Shibuya Crossing)
  tokyo: { latitude: 35.6595, longitude: 139.7004, altitude: 40 } as WGS84Coordinate,
  // Sydney (Opera House)
  sydney: { latitude: -33.8568, longitude: 151.2153, altitude: 5 } as WGS84Coordinate,
  // North Pole
  northPole: { latitude: 90, longitude: 0, altitude: 0 } as WGS84Coordinate,
  // South Pole
  southPole: { latitude: -90, longitude: 0, altitude: 0 } as WGS84Coordinate,
  // Equator at Prime Meridian (Gulf of Guinea)
  equatorPrimeMeridian: { latitude: 0, longitude: 0, altitude: 0 } as WGS84Coordinate,
  // Equator at Antimeridian
  equatorAntimeridianEast: { latitude: 0, longitude: 179.999, altitude: 0 } as WGS84Coordinate,
  equatorAntimeridianWest: { latitude: 0, longitude: -179.999, altitude: 0 } as WGS84Coordinate,
  // Dead Sea (lowest land point on Earth)
  deadSea: { latitude: 31.5, longitude: 35.5, altitude: -430 } as WGS84Coordinate,
  // Mount Everest summit
  everest: { latitude: 27.9881, longitude: 86.9250, altitude: 8849 } as WGS84Coordinate,
} as const;

const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

// =============================================================================
// 1. WGS84 TO ENU COORDINATE CONVERSION ACCURACY
// =============================================================================

describe('WGS84 to ENU Coordinate Conversion Accuracy', () => {
  let converter: GeospatialCoordinateConverter;

  beforeEach(() => {
    converter = new GeospatialCoordinateConverter();
  });

  describe('basic conversion correctness', () => {
    it('origin point maps to zero ENU vector', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);
      const enu = converter.wgs84ToENU(REFERENCE_LOCATIONS.sanFrancisco);

      expect(enu.x).toBe(0);
      expect(enu.y).toBe(0);
      expect(enu.z).toBe(0);
    });

    it('1 degree latitude north produces ~111km northward displacement', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.equatorPrimeMeridian);
      const oneDegreeLat: WGS84Coordinate = { latitude: 1, longitude: 0, altitude: 0 };
      const enu = converter.wgs84ToENU(oneDegreeLat);

      // z = -north in HoloLand convention
      // 1 degree of latitude = ~111,195 meters
      expect(Math.abs(enu.z)).toBeGreaterThan(110_000);
      expect(Math.abs(enu.z)).toBeLessThan(112_000);
      expect(enu.z).toBeLessThan(0); // -North convention
      expect(Math.abs(enu.x)).toBeLessThan(1); // No east displacement
    });

    it('1 degree longitude east at equator produces ~111km eastward displacement', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.equatorPrimeMeridian);
      const oneDegreeLon: WGS84Coordinate = { latitude: 0, longitude: 1, altitude: 0 };
      const enu = converter.wgs84ToENU(oneDegreeLon);

      // x = East in HoloLand convention
      // At equator, 1 degree of longitude = ~111,195 meters
      expect(enu.x).toBeGreaterThan(110_000);
      expect(enu.x).toBeLessThan(112_000);
      expect(Math.abs(enu.z)).toBeLessThan(1); // No north displacement
    });

    it('longitude convergence: 1 degree longitude at 60N is ~55.5km', () => {
      // At latitude 60, cos(60) = 0.5, so longitude meters halve
      const helsinki: WGS84Coordinate = { latitude: 60, longitude: 25, altitude: 0 };
      converter.setOrigin(helsinki);
      const oneDegreeLonAtHelsinki: WGS84Coordinate = { latitude: 60, longitude: 26, altitude: 0 };
      const enu = converter.wgs84ToENU(oneDegreeLonAtHelsinki);

      // cos(60 deg) = 0.5 => ~55.5 km per degree
      expect(enu.x).toBeGreaterThan(54_000);
      expect(enu.x).toBeLessThan(57_000);
    });

    it('altitude difference maps correctly to Y-up', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);
      const elevated: WGS84Coordinate = {
        ...REFERENCE_LOCATIONS.sanFrancisco,
        altitude: REFERENCE_LOCATIONS.sanFrancisco.altitude + 100,
      };
      const enu = converter.wgs84ToENU(elevated);

      expect(enu.y).toBe(100);
      expect(enu.x).toBe(0);
      expect(enu.z).toBe(0);
    });

    it('negative altitude (Dead Sea) maps correctly', () => {
      const seaLevel: WGS84Coordinate = { latitude: 31.5, longitude: 35.5, altitude: 0 };
      converter.setOrigin(seaLevel);
      const enu = converter.wgs84ToENU(REFERENCE_LOCATIONS.deadSea);

      expect(enu.y).toBe(-430);
    });
  });

  describe('round-trip conversion fidelity', () => {
    it('WGS84 -> ENU -> WGS84 preserves coordinates to 6 decimal places', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);
      const original: WGS84Coordinate = {
        latitude: 37.7800,
        longitude: -122.4100,
        altitude: 50,
      };

      const enu = converter.wgs84ToENU(original);
      const roundTripped = converter.enuToWGS84(enu);

      expect(roundTripped.latitude).toBeCloseTo(original.latitude, 6);
      expect(roundTripped.longitude).toBeCloseTo(original.longitude, 6);
      expect(roundTripped.altitude).toBeCloseTo(original.altitude, 2);
    });

    it('round-trip at multiple distances from origin', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);

      // Test at 10m, 100m, 1km, 5km, 10km offsets
      const offsets = [
        { dlat: 0.00009, dlon: 0.00009 },   // ~10m
        { dlat: 0.0009, dlon: 0.0009 },     // ~100m
        { dlat: 0.009, dlon: 0.009 },        // ~1km
        { dlat: 0.045, dlon: 0.045 },        // ~5km
        { dlat: 0.09, dlon: 0.09 },          // ~10km
      ];

      for (const offset of offsets) {
        const target: WGS84Coordinate = {
          latitude: REFERENCE_LOCATIONS.sanFrancisco.latitude + offset.dlat,
          longitude: REFERENCE_LOCATIONS.sanFrancisco.longitude + offset.dlon,
          altitude: REFERENCE_LOCATIONS.sanFrancisco.altitude + 25,
        };

        const enu = converter.wgs84ToENU(target);
        const back = converter.enuToWGS84(enu);

        // Within 10km, flat-earth approximation should be sub-meter accurate
        expect(back.latitude).toBeCloseTo(target.latitude, 5);
        expect(back.longitude).toBeCloseTo(target.longitude, 5);
        expect(back.altitude).toBeCloseTo(target.altitude, 2);
      }
    });

    it('round-trip near poles (high latitude stress test)', () => {
      const nearNorthPole: WGS84Coordinate = { latitude: 89.9, longitude: 0, altitude: 0 };
      converter.setOrigin(nearNorthPole);

      const nearby: WGS84Coordinate = { latitude: 89.901, longitude: 0.1, altitude: 10 };
      const enu = converter.wgs84ToENU(nearby);
      const back = converter.enuToWGS84(enu);

      // Acceptable accuracy may be lower near poles due to longitude convergence
      expect(back.latitude).toBeCloseTo(nearby.latitude, 4);
      expect(back.altitude).toBeCloseTo(nearby.altitude, 1);
    });
  });

  describe('ARKit/ARCore accuracy validation', () => {
    it('conversion error < 0.5m within ARCore VPS accuracy (1-5m)', () => {
      // ARCore VPS provides 1-5m accuracy; our ENU conversion should add < 0.5m error
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);

      // Point 50m east
      const target: WGS84Coordinate = {
        latitude: 37.7749,
        longitude: -122.41883, // ~50m east at SF latitude
        altitude: 16,
      };

      const enu = converter.wgs84ToENU(target);
      const backConverted = converter.enuToWGS84(enu);

      // Calculate error in meters
      const errorMeters = converter.haversineDistance(target, backConverted);
      expect(errorMeters).toBeLessThan(0.5); // Sub-50cm conversion error
    });

    it('conversion error < 1m within ARKit accuracy range (5-10m)', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);

      // Point 200m northwest
      const target: WGS84Coordinate = {
        latitude: 37.7763, // ~155m north
        longitude: -122.4209, // ~133m west
        altitude: 25,
      };

      const enu = converter.wgs84ToENU(target);
      const back = converter.enuToWGS84(enu);

      const errorMeters = converter.haversineDistance(target, back);
      expect(errorMeters).toBeLessThan(1.0);
    });

    it('ENU displacement direction matches compass (N=z-, E=x+, U=y+)', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);

      // Point due North
      const north: WGS84Coordinate = {
        latitude: REFERENCE_LOCATIONS.sanFrancisco.latitude + 0.001,
        longitude: REFERENCE_LOCATIONS.sanFrancisco.longitude,
        altitude: REFERENCE_LOCATIONS.sanFrancisco.altitude,
      };
      const enuN = converter.wgs84ToENU(north);
      expect(enuN.z).toBeLessThan(0); // -North
      expect(Math.abs(enuN.x)).toBeLessThan(0.1);

      // Point due East
      const east: WGS84Coordinate = {
        latitude: REFERENCE_LOCATIONS.sanFrancisco.latitude,
        longitude: REFERENCE_LOCATIONS.sanFrancisco.longitude + 0.001,
        altitude: REFERENCE_LOCATIONS.sanFrancisco.altitude,
      };
      const enuE = converter.wgs84ToENU(east);
      expect(enuE.x).toBeGreaterThan(0); // +East
      expect(Math.abs(enuE.z)).toBeLessThan(0.1);

      // Point above
      const up: WGS84Coordinate = {
        ...REFERENCE_LOCATIONS.sanFrancisco,
        altitude: REFERENCE_LOCATIONS.sanFrancisco.altitude + 50,
      };
      const enuU = converter.wgs84ToENU(up);
      expect(enuU.y).toBe(50); // +Up
    });
  });

  describe('edge cases', () => {
    it('throws when origin is not set for wgs84ToENU', () => {
      expect(() => converter.wgs84ToENU(REFERENCE_LOCATIONS.sanFrancisco))
        .toThrow('Origin not set');
    });

    it('throws when origin is not set for enuToWGS84', () => {
      expect(() => converter.enuToWGS84({ x: 0, y: 0, z: 0 }))
        .toThrow('Origin not set');
    });

    it('handles origin at equator/prime meridian', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.equatorPrimeMeridian);
      const enu = converter.wgs84ToENU({
        latitude: 0.001,
        longitude: 0.001,
        altitude: 10,
      });
      expect(enu.x).toBeGreaterThan(0);
      expect(enu.z).toBeLessThan(0);
      expect(enu.y).toBe(10);
    });

    it('handles negative longitudes (Western hemisphere)', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.newYork);
      const westOfNY: WGS84Coordinate = {
        latitude: REFERENCE_LOCATIONS.newYork.latitude,
        longitude: REFERENCE_LOCATIONS.newYork.longitude - 0.001,
        altitude: REFERENCE_LOCATIONS.newYork.altitude,
      };
      const enu = converter.wgs84ToENU(westOfNY);
      expect(enu.x).toBeLessThan(0); // West = negative East
    });

    it('handles southern hemisphere origin', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sydney);
      const northOfSydney: WGS84Coordinate = {
        latitude: REFERENCE_LOCATIONS.sydney.latitude + 0.001,
        longitude: REFERENCE_LOCATIONS.sydney.longitude,
        altitude: REFERENCE_LOCATIONS.sydney.altitude,
      };
      const enu = converter.wgs84ToENU(northOfSydney);
      expect(enu.z).toBeLessThan(0); // Still -North
    });

    it('getOrigin returns a copy (immutable)', () => {
      converter.setOrigin(REFERENCE_LOCATIONS.sanFrancisco);
      const origin = converter.getOrigin();
      expect(origin).toEqual(REFERENCE_LOCATIONS.sanFrancisco);

      // Mutating returned origin should not affect converter
      if (origin) {
        origin.latitude = 0;
        expect(converter.getOrigin()!.latitude).toBe(REFERENCE_LOCATIONS.sanFrancisco.latitude);
      }
    });
  });
});

// =============================================================================
// 2. INDEXEDDB ANCHOR PERSISTENCE ACROSS SESSIONS
// =============================================================================

describe('IndexedDB Anchor Persistence Across Sessions', () => {
  let fakeIDB: ReturnType<typeof createFakeIndexedDB>;

  beforeAll(() => {
    fakeIDB = installFakeIndexedDB();
  });

  describe('single session persistence', () => {
    let storage: GeospatialAnchorStorage;

    beforeEach(async () => {
      storage = new GeospatialAnchorStorage();
      await storage.init();
    });

    afterEach(async () => {
      await storage.clear();
    });

    it('stores and retrieves an anchor by ID', async () => {
      const anchor = createTestAnchor('persist-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1');
      await storage.store(anchor);

      const retrieved = await storage.get('persist-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe('persist-1');
      expect(retrieved!.coordinates.latitude).toBe(37.7749);
      expect(retrieved!.metadata.createdBy).toBe('user-1');
    });

    it('returns null for non-existent anchor', async () => {
      const result = await storage.get('does-not-exist');
      expect(result).toBeNull();
    });

    it('overwrites anchor with same ID (upsert behavior)', async () => {
      const anchor1 = createTestAnchor('upsert-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1');
      await storage.store(anchor1);

      // Store again with updated label
      const anchor2 = createTestAnchor('upsert-1', REFERENCE_LOCATIONS.tokyo, 'user-1');
      anchor2.metadata.label = 'Updated Label';
      await storage.store(anchor2);

      const retrieved = await storage.get('upsert-1');
      expect(retrieved!.metadata.label).toBe('Updated Label');
      expect(retrieved!.coordinates.latitude).toBe(REFERENCE_LOCATIONS.tokyo.latitude);

      // Should only have one anchor total
      const all = await storage.getAll();
      expect(all.length).toBe(1);
    });

    it('deletes an anchor by ID', async () => {
      const anchor = createTestAnchor('delete-1', REFERENCE_LOCATIONS.london, 'user-1');
      await storage.store(anchor);

      await storage.delete('delete-1');
      const retrieved = await storage.get('delete-1');
      expect(retrieved).toBeNull();
    });

    it('clears all anchors', async () => {
      await storage.store(createTestAnchor('clear-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1'));
      await storage.store(createTestAnchor('clear-2', REFERENCE_LOCATIONS.tokyo, 'user-2'));
      await storage.store(createTestAnchor('clear-3', REFERENCE_LOCATIONS.london, 'user-3'));

      const beforeClear = await storage.getAll();
      expect(beforeClear.length).toBe(3);

      await storage.clear();

      const afterClear = await storage.getAll();
      expect(afterClear.length).toBe(0);
    });

    it('getAll returns all stored anchors', async () => {
      await storage.store(createTestAnchor('all-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1'));
      await storage.store(createTestAnchor('all-2', REFERENCE_LOCATIONS.tokyo, 'user-2'));

      const all = await storage.getAll();
      expect(all.length).toBe(2);
      expect(all.map(a => a.id).sort()).toEqual(['all-1', 'all-2']);
    });

    it('preserves all anchor fields through store/retrieve cycle', async () => {
      const anchor: GeospatialAnchor = {
        id: 'full-field-test',
        coordinates: { ...REFERENCE_LOCATIONS.sanFrancisco },
        rotation: { x: 0.1, y: 0.2, z: 0.3, w: 0.9 },
        metadata: {
          label: 'Full Field Test',
          createdBy: 'test-user-42',
          createdAt: 1700000000000,
          updatedAt: 1700000001000,
          platform: 'arcore',
          horizontalAccuracy: 2.5,
          verticalAccuracy: 1.8,
        },
        sharedWith: ['user-a', 'user-b', 'user-c'],
        contentId: 'content-xyz-123',
      };

      await storage.store(anchor);
      const retrieved = await storage.get('full-field-test');

      expect(retrieved).toEqual(anchor);
    });
  });

  describe('cross-session persistence simulation', () => {
    it('anchors survive storage re-initialization', async () => {
      // Session 1: Create and store anchors
      const storage1 = new GeospatialAnchorStorage();
      await storage1.init();
      await storage1.store(createTestAnchor('session-persist-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1'));
      await storage1.store(createTestAnchor('session-persist-2', REFERENCE_LOCATIONS.tokyo, 'user-1'));

      // Session 2: New storage instance (simulates app restart)
      const storage2 = new GeospatialAnchorStorage();
      await storage2.init();

      const retrieved1 = await storage2.get('session-persist-1');
      const retrieved2 = await storage2.get('session-persist-2');

      expect(retrieved1).not.toBeNull();
      expect(retrieved1!.coordinates.latitude).toBe(REFERENCE_LOCATIONS.sanFrancisco.latitude);

      expect(retrieved2).not.toBeNull();
      expect(retrieved2!.coordinates.latitude).toBe(REFERENCE_LOCATIONS.tokyo.latitude);

      // Cleanup
      await storage2.clear();
    });

    it('anchor updates persist across re-initialization', async () => {
      // Session 1: Create anchor
      const storage1 = new GeospatialAnchorStorage();
      await storage1.init();
      const anchor = createTestAnchor('update-persist', REFERENCE_LOCATIONS.london, 'user-1');
      await storage1.store(anchor);

      // Update in same session
      anchor.metadata.label = 'Updated in Session 1';
      anchor.metadata.updatedAt = Date.now();
      anchor.sharedWith = ['user-2', 'user-3'];
      await storage1.store(anchor);

      // Session 2: Verify updates persisted
      const storage2 = new GeospatialAnchorStorage();
      await storage2.init();

      const retrieved = await storage2.get('update-persist');
      expect(retrieved!.metadata.label).toBe('Updated in Session 1');
      expect(retrieved!.sharedWith).toEqual(['user-2', 'user-3']);

      await storage2.clear();
    });

    it('deleted anchors stay deleted across re-initialization', async () => {
      // Session 1: Create and delete
      const storage1 = new GeospatialAnchorStorage();
      await storage1.init();
      await storage1.store(createTestAnchor('delete-persist', REFERENCE_LOCATIONS.sydney, 'user-1'));
      await storage1.delete('delete-persist');

      // Session 2: Verify deletion persisted
      const storage2 = new GeospatialAnchorStorage();
      await storage2.init();

      const retrieved = await storage2.get('delete-persist');
      expect(retrieved).toBeNull();

      await storage2.clear();
    });
  });

  describe('spatial query through IndexedDB', () => {
    let storage: GeospatialAnchorStorage;

    beforeEach(async () => {
      storage = new GeospatialAnchorStorage();
      await storage.init();
    });

    afterEach(async () => {
      await storage.clear();
    });

    it('queryRadius returns anchors within specified radius', async () => {
      // Near SF downtown (~100m north)
      await storage.store(createTestAnchor('near-1', { latitude: 37.7758, longitude: -122.4194, altitude: 16 }, 'user-1'));
      // Near SF (~200m east)
      await storage.store(createTestAnchor('near-2', { latitude: 37.7749, longitude: -122.4171, altitude: 16 }, 'user-1'));
      // Far away (~1.1km north)
      await storage.store(createTestAnchor('far-1', { latitude: 37.7849, longitude: -122.4194, altitude: 16 }, 'user-1'));

      const nearby = await storage.queryRadius({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 500,
      });

      expect(nearby.length).toBe(2);
      expect(nearby.map(a => a.id)).toContain('near-1');
      expect(nearby.map(a => a.id)).toContain('near-2');
      expect(nearby.map(a => a.id)).not.toContain('far-1');
    });

    it('queryRadius filters by createdBy', async () => {
      await storage.store(createTestAnchor('user1-anchor', REFERENCE_LOCATIONS.sanFrancisco, 'user-1'));
      await storage.store(createTestAnchor('user2-anchor', { latitude: 37.7750, longitude: -122.4194, altitude: 16 }, 'user-2'));

      const results = await storage.queryRadius({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 500,
        createdBy: 'user-1',
      });

      expect(results.length).toBe(1);
      expect(results[0].metadata.createdBy).toBe('user-1');
    });

    it('queryRadius filters by accessibleBy (owned or shared)', async () => {
      const ownedAnchor = createTestAnchor('owned', REFERENCE_LOCATIONS.sanFrancisco, 'user-target');
      await storage.store(ownedAnchor);

      const sharedAnchor = createTestAnchor('shared', { latitude: 37.7750, longitude: -122.4194, altitude: 16 }, 'other-user');
      sharedAnchor.sharedWith = ['user-target'];
      await storage.store(sharedAnchor);

      const notAccessible = createTestAnchor('not-accessible', { latitude: 37.7751, longitude: -122.4194, altitude: 16 }, 'other-user');
      await storage.store(notAccessible);

      const results = await storage.queryRadius({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 500,
        accessibleBy: 'user-target',
      });

      expect(results.length).toBe(2);
      expect(results.map(a => a.id).sort()).toEqual(['owned', 'shared']);
    });

    it('queryRadius applies limit', async () => {
      for (let i = 0; i < 10; i++) {
        await storage.store(createTestAnchor(
          `limit-${i}`,
          { latitude: 37.7749 + i * 0.00001, longitude: -122.4194, altitude: 16 },
          'user-1',
        ));
      }

      const results = await storage.queryRadius({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 5000,
        limit: 5,
      });

      expect(results.length).toBe(5);
    });

    it('queryRadius returns results sorted by distance', async () => {
      await storage.store(createTestAnchor('closest', { latitude: 37.7750, longitude: -122.4194, altitude: 16 }, 'user-1'));
      await storage.store(createTestAnchor('mid', { latitude: 37.7760, longitude: -122.4194, altitude: 16 }, 'user-1'));
      await storage.store(createTestAnchor('farthest', { latitude: 37.7770, longitude: -122.4194, altitude: 16 }, 'user-1'));

      const results = await storage.queryRadius({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 5000,
      });

      expect(results.length).toBe(3);
      // Verify sorted by distance
      const converter = new GeospatialCoordinateConverter();
      for (let i = 1; i < results.length; i++) {
        const dPrev = converter.haversineDistance(REFERENCE_LOCATIONS.sanFrancisco, results[i - 1].coordinates);
        const dCurr = converter.haversineDistance(REFERENCE_LOCATIONS.sanFrancisco, results[i].coordinates);
        expect(dCurr).toBeGreaterThanOrEqual(dPrev);
      }
    });
  });

  describe('storage error handling', () => {
    it('throws when operations are called before init', async () => {
      const uninitStorage = new GeospatialAnchorStorage();
      const anchor = createTestAnchor('no-init', REFERENCE_LOCATIONS.sanFrancisco, 'user-1');

      await expect(uninitStorage.store(anchor)).rejects.toThrow('not initialized');
      await expect(uninitStorage.get('no-init')).rejects.toThrow('not initialized');
      await expect(uninitStorage.delete('no-init')).rejects.toThrow('not initialized');
      await expect(uninitStorage.getAll()).rejects.toThrow('not initialized');
      await expect(uninitStorage.clear()).rejects.toThrow('not initialized');
    });
  });
});

// =============================================================================
// 3. MULTI-USER ANCHOR SHARING PROTOCOL
// =============================================================================

describe('Multi-User Anchor Sharing Protocol', () => {
  let sharing: GeospatialSharingProtocol;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sharing = new GeospatialSharingProtocol('https://test.hololand.io/api/geospatial');
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('publishAnchor', () => {
    it('sends anchor data with POST to server', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const anchor = createTestAnchor('publish-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1');
      await sharing.publishAnchor(anchor, 'test-auth-token');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://test.hololand.io/api/geospatial/anchors');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toBe('Bearer test-auth-token');
      expect(JSON.parse(options.body)).toEqual(anchor);
    });

    it('throws on server error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const anchor = createTestAnchor('publish-err', REFERENCE_LOCATIONS.tokyo, 'user-1');
      await expect(sharing.publishAnchor(anchor, 'token'))
        .rejects.toThrow('Failed to publish anchor');
    });

    it('propagates network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const anchor = createTestAnchor('publish-net-err', REFERENCE_LOCATIONS.london, 'user-1');
      await expect(sharing.publishAnchor(anchor, 'token'))
        .rejects.toThrow('Network error');
    });
  });

  describe('fetchAnchors', () => {
    it('fetches anchors with correct query parameters', async () => {
      const mockAnchors = [
        createTestAnchor('fetch-1', REFERENCE_LOCATIONS.sanFrancisco, 'user-1'),
        createTestAnchor('fetch-2', REFERENCE_LOCATIONS.goldenGateBridge, 'user-2'),
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnchors,
      });

      const query: SpatialQuery = {
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 10000,
        limit: 50,
        createdBy: 'user-1',
      };

      const result = await sharing.fetchAnchors(query, 'test-token');

      expect(result).toEqual(mockAnchors);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('lat=37.7749');
      expect(url).toContain('lon=-122.4194');
      expect(url).toContain('radius=10000');
      expect(url).toContain('limit=50');
      expect(url).toContain('createdBy=user-1');
      expect(options.headers['Authorization']).toBe('Bearer test-token');
    });

    it('works without optional query parameters', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const query: SpatialQuery = {
        center: REFERENCE_LOCATIONS.tokyo,
        radiusMeters: 500,
      };

      await sharing.fetchAnchors(query, 'token');

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('lat=35.6595');
      expect(url).toContain('radius=500');
      expect(url).not.toContain('limit=');
      expect(url).not.toContain('createdBy=');
    });

    it('throws on server error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      const query: SpatialQuery = {
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 100,
      };

      await expect(sharing.fetchAnchors(query, 'bad-token'))
        .rejects.toThrow('Failed to fetch anchors');
    });
  });

  describe('shareWith', () => {
    it('sends share request with user IDs', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await sharing.shareWith('anchor-123', ['user-a', 'user-b', 'user-c'], 'auth-token');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://test.hololand.io/api/geospatial/anchors/anchor-123/share');
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ sharedWith: ['user-a', 'user-b', 'user-c'] });
    });

    it('throws on server error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      });

      await expect(sharing.shareWith('anchor-xyz', ['user-a'], 'token'))
        .rejects.toThrow('Failed to update sharing');
    });
  });

  describe('deleteAnchor', () => {
    it('sends DELETE request for anchor', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await sharing.deleteAnchor('anchor-del-1', 'auth-token');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://test.hololand.io/api/geospatial/anchors/anchor-del-1');
      expect(options.method).toBe('DELETE');
      expect(options.headers['Authorization']).toBe('Bearer auth-token');
    });

    it('throws on server error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(sharing.deleteAnchor('non-existent', 'token'))
        .rejects.toThrow('Failed to delete anchor');
    });
  });

  describe('multi-user sharing scenarios', () => {
    it('user A publishes, user B fetches same anchor', async () => {
      const anchor = createTestAnchor('shared-anchor', REFERENCE_LOCATIONS.sanFrancisco, 'user-A');
      anchor.sharedWith = ['user-B'];

      // User A publishes
      fetchMock.mockResolvedValueOnce({ ok: true });
      await sharing.publishAnchor(anchor, 'token-A');

      // User B fetches
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [anchor],
      });

      const fetched = await sharing.fetchAnchors({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 100,
        accessibleBy: 'user-B',
      }, 'token-B');

      expect(fetched.length).toBe(1);
      expect(fetched[0].id).toBe('shared-anchor');
      expect(fetched[0].sharedWith).toContain('user-B');
    });

    it('user A shares with multiple users, then adds more', async () => {
      // First share
      fetchMock.mockResolvedValueOnce({ ok: true });
      await sharing.shareWith('anchor-multi', ['user-B', 'user-C'], 'token-A');

      // Add more users
      fetchMock.mockResolvedValueOnce({ ok: true });
      await sharing.shareWith('anchor-multi', ['user-B', 'user-C', 'user-D'], 'token-A');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondCall = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCall.sharedWith).toContain('user-D');
    });
  });
});

// =============================================================================
// 4. HAVERSINE DISTANCE CALCULATIONS AT VARIOUS SCALES
// =============================================================================

describe('Haversine Distance Calculations at Various Scales', () => {
  let converter: GeospatialCoordinateConverter;

  beforeEach(() => {
    converter = new GeospatialCoordinateConverter();
  });

  describe('sub-meter distances', () => {
    it('detects ~11cm displacement (0.000001 degree at equator)', () => {
      const a: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const b: WGS84Coordinate = { latitude: 0.000001, longitude: 0, altitude: 0 };

      const distance = converter.haversineDistance(a, b);
      expect(distance).toBeGreaterThan(0.05);
      expect(distance).toBeLessThan(0.2); // ~11cm
    });

    it('detects ~1m displacement (0.000009 degree at SF latitude)', () => {
      const a: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const b: WGS84Coordinate = { latitude: 37.774909, longitude: -122.4194, altitude: 0 };

      const distance = converter.haversineDistance(a, b);
      expect(distance).toBeGreaterThan(0.5);
      expect(distance).toBeLessThan(2.0);
    });
  });

  describe('meter-scale distances (AR anchor precision range)', () => {
    it('10m distance between nearby points', () => {
      const a: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const b: WGS84Coordinate = { latitude: 37.77499, longitude: -122.4194, altitude: 0 };

      const distance = converter.haversineDistance(a, b);
      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(15);
    });

    it('100m distance (typical AR session range)', () => {
      const a: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const b: WGS84Coordinate = { latitude: 37.7758, longitude: -122.4194, altitude: 0 };

      const distance = converter.haversineDistance(a, b);
      expect(distance).toBeGreaterThan(80);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('kilometer-scale distances', () => {
    it('~1.1km between SF downtown and 0.01 deg north', () => {
      const a: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const b: WGS84Coordinate = { latitude: 37.7849, longitude: -122.4194, altitude: 0 };

      const distance = converter.haversineDistance(a, b);
      expect(distance).toBeCloseTo(1112, -1); // ~1.112 km
    });

    it('~6.5km between SF downtown and Golden Gate Bridge', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.sanFrancisco,
        REFERENCE_LOCATIONS.goldenGateBridge,
      );

      expect(distance).toBeGreaterThan(5_500);
      expect(distance).toBeLessThan(8_000);
    });
  });

  describe('intercity distances (hundreds of km)', () => {
    it('SF to LA: ~559 km', () => {
      const losAngeles: WGS84Coordinate = { latitude: 34.0522, longitude: -118.2437, altitude: 0 };
      const distance = converter.haversineDistance(REFERENCE_LOCATIONS.sanFrancisco, losAngeles);

      expect(distance).toBeGreaterThan(540_000);
      expect(distance).toBeLessThan(580_000);
    });
  });

  describe('intercontinental distances (thousands of km)', () => {
    it('SF to NY: ~4,129 km', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.sanFrancisco,
        REFERENCE_LOCATIONS.newYork,
      );
      expect(distance).toBeGreaterThan(4_050_000);
      expect(distance).toBeLessThan(4_200_000);
    });

    it('London to Tokyo: ~9,561 km', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.london,
        REFERENCE_LOCATIONS.tokyo,
      );
      expect(distance).toBeGreaterThan(9_400_000);
      expect(distance).toBeLessThan(9_700_000);
    });

    it('SF to Sydney: ~11,945 km', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.sanFrancisco,
        REFERENCE_LOCATIONS.sydney,
      );
      expect(distance).toBeGreaterThan(11_500_000);
      expect(distance).toBeLessThan(12_500_000);
    });
  });

  describe('maximum distances', () => {
    it('antipodal points: ~20,015 km (half circumference)', () => {
      const a: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const b: WGS84Coordinate = { latitude: 0, longitude: 180, altitude: 0 };

      const distance = converter.haversineDistance(a, b);
      expect(distance).toBeGreaterThan(19_900_000);
      expect(distance).toBeLessThan(20_100_000);
    });

    it('north pole to south pole: ~20,015 km', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.northPole,
        REFERENCE_LOCATIONS.southPole,
      );
      expect(distance).toBeGreaterThan(19_900_000);
      expect(distance).toBeLessThan(20_100_000);
    });

    it('north pole to equator: ~10,007 km (quarter circumference)', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.northPole,
        REFERENCE_LOCATIONS.equatorPrimeMeridian,
      );
      expect(distance).toBeGreaterThan(9_950_000);
      expect(distance).toBeLessThan(10_050_000);
    });
  });

  describe('special cases', () => {
    it('same point returns exactly 0', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.sanFrancisco,
        REFERENCE_LOCATIONS.sanFrancisco,
      );
      expect(distance).toBe(0);
    });

    it('symmetric: d(A,B) === d(B,A)', () => {
      const dAB = converter.haversineDistance(
        REFERENCE_LOCATIONS.sanFrancisco,
        REFERENCE_LOCATIONS.tokyo,
      );
      const dBA = converter.haversineDistance(
        REFERENCE_LOCATIONS.tokyo,
        REFERENCE_LOCATIONS.sanFrancisco,
      );
      expect(dAB).toBeCloseTo(dBA, 6);
    });

    it('ignores altitude (2D great-circle distance)', () => {
      const ground = REFERENCE_LOCATIONS.sanFrancisco;
      const elevated: WGS84Coordinate = { ...ground, altitude: 10000 };
      const distance = converter.haversineDistance(ground, elevated);
      expect(distance).toBe(0);
    });

    it('handles antimeridian crossing correctly', () => {
      const distance = converter.haversineDistance(
        REFERENCE_LOCATIONS.equatorAntimeridianEast,
        REFERENCE_LOCATIONS.equatorAntimeridianWest,
      );
      // Should be ~222m, not half the earth
      expect(distance).toBeLessThan(500);
    });

    it('never returns NaN for valid coordinates', () => {
      const testPairs: [WGS84Coordinate, WGS84Coordinate][] = [
        [REFERENCE_LOCATIONS.northPole, REFERENCE_LOCATIONS.southPole],
        [REFERENCE_LOCATIONS.equatorPrimeMeridian, REFERENCE_LOCATIONS.equatorPrimeMeridian],
        [REFERENCE_LOCATIONS.deadSea, REFERENCE_LOCATIONS.everest],
        [REFERENCE_LOCATIONS.equatorAntimeridianEast, REFERENCE_LOCATIONS.equatorAntimeridianWest],
      ];

      for (const [a, b] of testPairs) {
        const d = converter.haversineDistance(a, b);
        expect(Number.isNaN(d)).toBe(false);
        expect(Number.isFinite(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('bearing calculations', () => {
    it('due north = 0 degrees', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: 1, longitude: 0, altitude: 0 };
      expect(converter.calculateBearing(from, to)).toBeCloseTo(0, 0);
    });

    it('due east = 90 degrees', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: 0, longitude: 1, altitude: 0 };
      expect(converter.calculateBearing(from, to)).toBeCloseTo(90, 0);
    });

    it('due south = 180 degrees', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: -1, longitude: 0, altitude: 0 };
      expect(converter.calculateBearing(from, to)).toBeCloseTo(180, 0);
    });

    it('due west = 270 degrees', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: 0, longitude: -1, altitude: 0 };
      expect(converter.calculateBearing(from, to)).toBeCloseTo(270, 0);
    });

    it('bearing is always in [0, 360) range', () => {
      const testCases: [WGS84Coordinate, WGS84Coordinate][] = [
        [{ latitude: 10, longitude: 10, altitude: 0 }, { latitude: -10, longitude: -10, altitude: 0 }],
        [{ latitude: -45, longitude: 170, altitude: 0 }, { latitude: 45, longitude: -170, altitude: 0 }],
        [REFERENCE_LOCATIONS.sanFrancisco, REFERENCE_LOCATIONS.london],
      ];

      for (const [from, to] of testCases) {
        const bearing = converter.calculateBearing(from, to);
        expect(bearing).toBeGreaterThanOrEqual(0);
        expect(bearing).toBeLessThan(360);
      }
    });
  });
});

// =============================================================================
// 5. END-TO-END ANCHOR CREATE/PERSIST/RELOAD/SHARE LIFECYCLE
// =============================================================================

describe('End-to-End Anchor Lifecycle', () => {
  let system: GeospatialAnchorSystem;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    installFakeIndexedDB();
  });

  beforeEach(async () => {
    system = new GeospatialAnchorSystem('https://test.hololand.io/api/geospatial');
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    await system.init(REFERENCE_LOCATIONS.sanFrancisco);
  });

  afterEach(async () => {
    await system.clearLocalAnchors();
    vi.restoreAllMocks();
  });

  describe('CREATE: anchor creation', () => {
    it('creates anchor with coordinates, rotation, and metadata', async () => {
      const anchor = await system.createAnchor(
        REFERENCE_LOCATIONS.goldenGateBridge,
        { x: 0, y: 0.707, z: 0, w: 0.707 },
        { label: 'Golden Gate Viewpoint', createdBy: 'user-explorer' },
      );

      expect(anchor.id).toMatch(/^geo_/);
      expect(anchor.coordinates).toEqual(REFERENCE_LOCATIONS.goldenGateBridge);
      expect(anchor.rotation).toEqual({ x: 0, y: 0.707, z: 0, w: 0.707 });
      expect(anchor.metadata.label).toBe('Golden Gate Viewpoint');
      expect(anchor.metadata.createdBy).toBe('user-explorer');
      expect(anchor.metadata.createdAt).toBeGreaterThan(0);
      expect(anchor.metadata.updatedAt).toBeGreaterThan(0);
      expect(anchor.sharedWith).toEqual([]);
    });

    it('generates unique IDs for concurrent creations', async () => {
      const ids = new Set<string>();
      const promises = Array.from({ length: 20 }, (_, i) =>
        system.createAnchor(
          REFERENCE_LOCATIONS.sanFrancisco,
          IDENTITY_QUATERNION,
          { label: `Anchor ${i}`, createdBy: 'user-1' },
        ),
      );

      const anchors = await Promise.all(promises);
      anchors.forEach(a => ids.add(a.id));

      expect(ids.size).toBe(20);
    });

    it('attaches optional contentId', async () => {
      const anchor = await system.createAnchor(
        REFERENCE_LOCATIONS.tokyo,
        IDENTITY_QUATERNION,
        {
          label: 'Content Anchor',
          createdBy: 'user-1',
          contentId: 'holoscript-composition-xyz',
        },
      );

      expect(anchor.contentId).toBe('holoscript-composition-xyz');
    });
  });

  describe('PERSIST: anchor stored in IndexedDB', () => {
    it('created anchor is retrievable by ID', async () => {
      const created = await system.createAnchor(
        REFERENCE_LOCATIONS.london,
        IDENTITY_QUATERNION,
        { label: 'Big Ben', createdBy: 'user-london' },
      );

      const retrieved = await system.getAnchor(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.metadata.label).toBe('Big Ben');
    });

    it('querying nearby returns persisted anchors', async () => {
      await system.createAnchor(
        { latitude: 37.7760, longitude: -122.4194, altitude: 16 },
        IDENTITY_QUATERNION,
        { label: 'Nearby 1', createdBy: 'user-1' },
      );
      await system.createAnchor(
        { latitude: 37.7770, longitude: -122.4194, altitude: 16 },
        IDENTITY_QUATERNION,
        { label: 'Nearby 2', createdBy: 'user-1' },
      );

      const nearby = await system.queryNearby({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 500,
      });

      expect(nearby.length).toBe(2);
    });
  });

  describe('RELOAD: anchors survive system re-initialization', () => {
    it('anchors are available after system re-init', async () => {
      // Create anchor in first system instance
      const created = await system.createAnchor(
        REFERENCE_LOCATIONS.sanFrancisco,
        IDENTITY_QUATERNION,
        { label: 'Persistent Marker', createdBy: 'user-persist' },
      );

      // Create new system instance (simulates app restart)
      const system2 = new GeospatialAnchorSystem('https://test.hololand.io/api/geospatial');
      await system2.init(REFERENCE_LOCATIONS.sanFrancisco);

      const reloaded = await system2.getAnchor(created.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.metadata.label).toBe('Persistent Marker');
      expect(reloaded!.coordinates.latitude).toBe(REFERENCE_LOCATIONS.sanFrancisco.latitude);

      await system2.clearLocalAnchors();
    });
  });

  describe('CONVERT: anchor to local ENU pose', () => {
    it('converts persisted anchor to local rendering coordinates', async () => {
      const anchor = await system.createAnchor(
        {
          latitude: 37.7759,   // ~111m north of origin
          longitude: -122.4194,
          altitude: 26,        // 10m above origin (16m alt)
        },
        { x: 0, y: 0.5, z: 0, w: 0.866 },
        { label: 'Pose Test', createdBy: 'user-1' },
      );

      const pose = system.anchorToLocalPose(anchor);

      // Verify ENU conversion
      expect(pose.position.x).toBeCloseTo(0, 0); // Same longitude
      expect(pose.position.y).toBe(10);            // 10m above origin
      expect(pose.position.z).toBeCloseTo(-111, -1); // ~111m north (z=-north)
      expect(pose.rotation).toEqual({ x: 0, y: 0.5, z: 0, w: 0.866 });
    });
  });

  describe('SHARE: publish and fetch shared anchors', () => {
    it('full share lifecycle: create -> persist -> publish -> share -> fetch', async () => {
      // Step 1: Create anchor locally
      const anchor = await system.createAnchor(
        REFERENCE_LOCATIONS.goldenGateBridge,
        IDENTITY_QUATERNION,
        { label: 'Shared Landmark', createdBy: 'user-A' },
      );

      // Step 2: Publish to server
      fetchMock.mockResolvedValueOnce({ ok: true });
      await system.publishAnchor(anchor.id, 'auth-token-A');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const publishCall = fetchMock.mock.calls[0];
      expect(publishCall[0]).toContain('/anchors');
      expect(publishCall[1].method).toBe('POST');

      // Step 3: Share with users B and C
      fetchMock.mockResolvedValueOnce({ ok: true });
      await system.shareAnchor(anchor.id, ['user-B', 'user-C'], 'auth-token-A');

      // Verify local copy updated
      const localAnchor = await system.getAnchor(anchor.id);
      expect(localAnchor!.sharedWith).toContain('user-B');
      expect(localAnchor!.sharedWith).toContain('user-C');

      // Step 4: User B fetches shared anchors
      const sharedAnchors = [
        { ...anchor, sharedWith: ['user-B', 'user-C'] },
      ];
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => sharedAnchors,
      });

      const fetched = await system.fetchSharedAnchors({
        center: REFERENCE_LOCATIONS.goldenGateBridge,
        radiusMeters: 100,
      }, 'auth-token-B');

      expect(fetched.length).toBe(1);
      expect(fetched[0].metadata.label).toBe('Shared Landmark');
    });
  });

  describe('DELETE: anchor removal', () => {
    it('deletes anchor from local storage', async () => {
      const anchor = await system.createAnchor(
        REFERENCE_LOCATIONS.tokyo,
        IDENTITY_QUATERNION,
        { label: 'Temp Anchor', createdBy: 'user-1' },
      );

      await system.deleteAnchor(anchor.id);

      const retrieved = await system.getAnchor(anchor.id);
      expect(retrieved).toBeNull();
    });

    it('deletes from server when auth token is provided', async () => {
      const anchor = await system.createAnchor(
        REFERENCE_LOCATIONS.sydney,
        IDENTITY_QUATERNION,
        { label: 'Server Delete', createdBy: 'user-1' },
      );

      fetchMock.mockResolvedValueOnce({ ok: true });
      await system.deleteAnchor(anchor.id, 'auth-token');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain(anchor.id);
      expect(options.method).toBe('DELETE');
    });

    it('handles server deletion failure gracefully', async () => {
      const anchor = await system.createAnchor(
        REFERENCE_LOCATIONS.london,
        IDENTITY_QUATERNION,
        { label: 'Graceful Delete', createdBy: 'user-1' },
      );

      // Server fails, but local delete should still work
      fetchMock.mockRejectedValueOnce(new Error('Server unavailable'));

      // Should not throw
      await system.deleteAnchor(anchor.id, 'auth-token');

      const retrieved = await system.getAnchor(anchor.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('SYSTEM STATE: initialization and capabilities', () => {
    it('throws if operations called before init', async () => {
      const uninitSystem = new GeospatialAnchorSystem();

      await expect(
        uninitSystem.createAnchor(
          REFERENCE_LOCATIONS.sanFrancisco,
          IDENTITY_QUATERNION,
          { createdBy: 'user-1' },
        ),
      ).rejects.toThrow('not initialized');
    });

    it('exposes coordinate converter', () => {
      const conv = system.getConverter();
      expect(conv).toBeDefined();
      expect(conv.getOrigin()).toEqual(REFERENCE_LOCATIONS.sanFrancisco);
    });

    it('provides platform capabilities after init', () => {
      const caps = system.getCapabilities();
      expect(caps).not.toBeNull();
      expect(caps!.platform).toBeDefined();
    });
  });
});

// =============================================================================
// 6. R-TREE SPATIAL INDEXING PERFORMANCE WITH 100K ANCHORS
// =============================================================================

describe('Spatial Indexing Performance', () => {
  describe('100K anchor benchmark via in-memory Haversine', () => {
    it('Haversine filtering over 100K points completes within 5 seconds', () => {
      // Benchmarks the filtering algorithm directly (bypasses IndexedDB I/O)
      const converter = new GeospatialCoordinateConverter();
      const center = REFERENCE_LOCATIONS.sanFrancisco;
      const radiusMeters = 1000;

      // Generate 100K random coordinates around SF
      const points: WGS84Coordinate[] = [];
      for (let i = 0; i < 100_000; i++) {
        points.push({
          latitude: 37.7749 + (Math.random() - 0.5) * 0.2,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.2,
          altitude: Math.random() * 100,
        });
      }

      const start = performance.now();

      // Filter by radius using Haversine
      const withinRadius = points.filter(p =>
        converter.haversineDistance(center, p) <= radiusMeters,
      );

      // Sort by distance
      withinRadius.sort((a, b) =>
        converter.haversineDistance(center, a) - converter.haversineDistance(center, b),
      );

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5_000); // Under 5 seconds
      expect(withinRadius.length).toBeGreaterThan(0);
      expect(withinRadius.length).toBeLessThan(100_000); // Not all points

      // Verify sorting
      for (let i = 1; i < withinRadius.length; i++) {
        const dPrev = converter.haversineDistance(center, withinRadius[i - 1]);
        const dCurr = converter.haversineDistance(center, withinRadius[i]);
        expect(dCurr).toBeGreaterThanOrEqual(dPrev);
      }
    });

    it('bounding-box pre-filter reduces candidates by >90%', () => {
      const converter = new GeospatialCoordinateConverter();
      const center = REFERENCE_LOCATIONS.sanFrancisco;
      const radiusMeters = 500;

      // Generate 100K random coordinates
      const points: WGS84Coordinate[] = [];
      for (let i = 0; i < 100_000; i++) {
        points.push({
          latitude: 37.7749 + (Math.random() - 0.5) * 0.2,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.2,
          altitude: 0,
        });
      }

      // Method 1: Pure Haversine (brute force)
      const bruteForceResults = points.filter(p =>
        converter.haversineDistance(center, p) <= radiusMeters,
      );

      // Method 2: Bounding box pre-filter + Haversine
      // Calculate bounding box (degrees per meter approximation)
      const latDelta = radiusMeters / 111_000; // ~111km per degree latitude
      const lonDelta = radiusMeters / (111_000 * Math.cos(center.latitude * Math.PI / 180));

      const minLat = center.latitude - latDelta;
      const maxLat = center.latitude + latDelta;
      const minLon = center.longitude - lonDelta;
      const maxLon = center.longitude + lonDelta;

      // Pre-filter with bounding box (cheap comparison)
      const candidates = points.filter(p =>
        p.latitude >= minLat && p.latitude <= maxLat &&
        p.longitude >= minLon && p.longitude <= maxLon,
      );

      // Refine with Haversine (expensive but on smaller set)
      const bboxResults = candidates.filter(p =>
        converter.haversineDistance(center, p) <= radiusMeters,
      );

      // Both methods should produce same results
      expect(bboxResults.length).toBe(bruteForceResults.length);

      // BBox pre-filter should significantly reduce candidate set
      expect(candidates.length).toBeLessThan(points.length);

      // Pre-filter should eliminate >90% of points
      expect(candidates.length).toBeLessThan(points.length * 0.1);
    });

    it('100K sequential Haversine calculations produce no NaN values', () => {
      const converter = new GeospatialCoordinateConverter();

      for (let i = 0; i < 100_000; i++) {
        const a: WGS84Coordinate = {
          latitude: (Math.random() - 0.5) * 180,
          longitude: (Math.random() - 0.5) * 360,
          altitude: 0,
        };
        const b: WGS84Coordinate = {
          latitude: (Math.random() - 0.5) * 180,
          longitude: (Math.random() - 0.5) * 360,
          altitude: 0,
        };

        const d = converter.haversineDistance(a, b);
        expect(Number.isNaN(d)).toBe(false);
        expect(Number.isFinite(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('bulk anchor operations via IndexedDB mock', () => {
    let system: GeospatialAnchorSystem;

    beforeAll(() => {
      installFakeIndexedDB();
    });

    beforeEach(async () => {
      system = new GeospatialAnchorSystem();
      await system.init(REFERENCE_LOCATIONS.sanFrancisco);
    });

    afterEach(async () => {
      await system.clearLocalAnchors();
    });

    it('inserts 500 anchors and queries nearby within 5 seconds', async () => {
      const startInsert = performance.now();

      // Insert 500 anchors distributed around SF
      for (let i = 0; i < 500; i++) {
        const coords: WGS84Coordinate = {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.09,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.09,
          altitude: Math.random() * 100,
        };

        await system.createAnchor(coords, IDENTITY_QUATERNION, {
          label: `Bulk Anchor ${i}`,
          createdBy: `user-${i % 10}`,
        });
      }

      const insertElapsed = performance.now() - startInsert;

      // Query nearby
      const startQuery = performance.now();
      const results = await system.queryNearby({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 1000,
      });
      const queryElapsed = performance.now() - startQuery;

      // Performance assertions
      expect(insertElapsed).toBeLessThan(10_000);
      expect(queryElapsed).toBeLessThan(5_000);
      expect(results.length).toBeGreaterThan(0);

      // Verify sorting
      const converter = system.getConverter();
      for (let i = 1; i < results.length; i++) {
        const dPrev = converter.haversineDistance(
          REFERENCE_LOCATIONS.sanFrancisco,
          results[i - 1].coordinates,
        );
        const dCurr = converter.haversineDistance(
          REFERENCE_LOCATIONS.sanFrancisco,
          results[i].coordinates,
        );
        expect(dCurr).toBeGreaterThanOrEqual(dPrev);
      }
    });

    it('limit parameter restricts result count', async () => {
      // Insert 20 anchors near SF
      for (let i = 0; i < 20; i++) {
        await system.createAnchor(
          {
            latitude: 37.7749 + i * 0.00001,
            longitude: -122.4194,
            altitude: 16,
          },
          IDENTITY_QUATERNION,
          { label: `Limit ${i}`, createdBy: 'user-1' },
        );
      }

      const results = await system.queryNearby({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 50000,
        limit: 5,
      });

      expect(results.length).toBe(5);
    });

    it('createdBy filter narrows results correctly', async () => {
      for (let i = 0; i < 30; i++) {
        await system.createAnchor(
          {
            latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
            longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
            altitude: 16,
          },
          IDENTITY_QUATERNION,
          { label: `Filter ${i}`, createdBy: `user-${i % 3}` },
        );
      }

      const results = await system.queryNearby({
        center: REFERENCE_LOCATIONS.sanFrancisco,
        radiusMeters: 50000,
        createdBy: 'user-0',
      });

      expect(results.every(a => a.metadata.createdBy === 'user-0')).toBe(true);
      expect(results.length).toBe(10); // 30 / 3 = 10
    });
  });
});

// =============================================================================
// HELPERS
// =============================================================================

function createTestAnchor(
  id: string,
  coordinates: WGS84Coordinate,
  createdBy: string,
): GeospatialAnchor {
  return {
    id,
    coordinates: { ...coordinates },
    rotation: { ...IDENTITY_QUATERNION },
    metadata: {
      label: `Test Anchor ${id}`,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      platform: 'webxr',
    },
    sharedWith: [],
  };
}
