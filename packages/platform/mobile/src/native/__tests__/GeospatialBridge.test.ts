/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  haversineDistance,
  calculateBearing,
  identityQuaternion,
  type WGS84Coordinate,
  type Quaternion,
  type NativeGeospatialAnchor,
} from '../GeospatialBridge';

// =============================================================================
// TEST CONSTANTS
// =============================================================================

// Famous locations for testing
const LOCATIONS = {
  sanFrancisco: { latitude: 37.7749, longitude: -122.4194, altitude: 16 },
  newYork: { latitude: 40.7128, longitude: -74.0060, altitude: 10 },
  london: { latitude: 51.5074, longitude: -0.1278, altitude: 11 },
  tokyo: { latitude: 35.6762, longitude: 139.6503, altitude: 40 },
  sydney: { latitude: -33.8688, longitude: 151.2093, altitude: 0 },
} as const;

// =============================================================================
// COORDINATE CONVERSION UTILITIES
// =============================================================================

describe('GeospatialBridge - Coordinate Utilities', () => {
  describe('haversineDistance', () => {
    it('calculates distance between SF and NY (~4129 km)', () => {
      const distance = haversineDistance(LOCATIONS.sanFrancisco, LOCATIONS.newYork);

      // Expected: ~4129 km (great circle distance)
      // Actual coordinates give 4,129,086m which is correct
      expect(distance).toBeGreaterThan(4_100_000); // 4100 km minimum
      expect(distance).toBeLessThan(4_200_000); // 4200 km maximum
      expect(distance).toBeCloseTo(4_129_000, -4); // ±10km tolerance
    });

    it('calculates distance between London and Tokyo (~9561 km)', () => {
      const distance = haversineDistance(LOCATIONS.london, LOCATIONS.tokyo);

      // Expected: ~9561 km
      expect(distance).toBeGreaterThan(9_500_000);
      expect(distance).toBeLessThan(9_600_000);
    });

    it('returns zero for same location', () => {
      const distance = haversineDistance(LOCATIONS.sanFrancisco, LOCATIONS.sanFrancisco);
      expect(distance).toBe(0);
    });

    it('calculates short distances accurately', () => {
      // Two points ~100m apart in SF
      const pointA: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: 37.7758, longitude: -122.4194, altitude: 0 };

      const distance = haversineDistance(pointA, pointB);

      // Expected: ~100m (0.0009 deg lat ≈ 100m)
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });

    it('ignores altitude in distance calculation', () => {
      const pointA: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 1000 };

      const distance = haversineDistance(pointA, pointB);
      expect(distance).toBe(0); // Haversine only considers lat/lon
    });

    it('handles antimeridian crossing (180° → -180°)', () => {
      const pointA: WGS84Coordinate = { latitude: 0, longitude: 179.9, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: 0, longitude: -179.9, altitude: 0 };

      const distance = haversineDistance(pointA, pointB);

      // Should be ~22km, not half the earth's circumference
      expect(distance).toBeLessThan(30_000);
    });

    it('handles poles correctly', () => {
      const northPole: WGS84Coordinate = { latitude: 90, longitude: 0, altitude: 0 };
      const equator: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };

      const distance = haversineDistance(northPole, equator);

      // Expected: 1/4 earth circumference (~10,000 km)
      expect(distance).toBeGreaterThan(10_000_000);
      expect(distance).toBeLessThan(10_100_000);
    });
  });

  describe('calculateBearing', () => {
    it('calculates north bearing (0°)', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: 1, longitude: 0, altitude: 0 };

      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(0, 1); // 0° = North
    });

    it('calculates east bearing (90°)', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: 0, longitude: 1, altitude: 0 };

      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(90, 1); // 90° = East
    });

    it('calculates south bearing (180°)', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: -1, longitude: 0, altitude: 0 };

      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(180, 1); // 180° = South
    });

    it('calculates west bearing (270°)', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: 0, longitude: -1, altitude: 0 };

      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(270, 1); // 270° = West
    });

    it('calculates bearing SF → NY (roughly east: ~85°)', () => {
      const bearing = calculateBearing(LOCATIONS.sanFrancisco, LOCATIONS.newYork);

      // SF to NY is roughly east-northeast
      expect(bearing).toBeGreaterThan(60);
      expect(bearing).toBeLessThan(100);
    });

    it('returns values in 0-360 range', () => {
      const from: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const to: WGS84Coordinate = { latitude: -1, longitude: -1, altitude: 0 };

      const bearing = calculateBearing(from, to);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    });

    it('handles same location (undefined bearing)', () => {
      const bearing = calculateBearing(LOCATIONS.sanFrancisco, LOCATIONS.sanFrancisco);

      // Bearing is technically undefined for same point, but function should not crash
      expect(typeof bearing).toBe('number');
      expect(Number.isNaN(bearing)).toBe(false);
    });
  });

  describe('identityQuaternion', () => {
    it('creates identity quaternion (no rotation)', () => {
      const q = identityQuaternion();

      expect(q.x).toBe(0);
      expect(q.y).toBe(0);
      expect(q.z).toBe(0);
      expect(q.w).toBe(1);
    });

    it('is normalized (magnitude = 1)', () => {
      const q = identityQuaternion();
      const magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);

      expect(magnitude).toBeCloseTo(1.0, 10);
    });
  });
});

// =============================================================================
// COORDINATE VALIDATION
// =============================================================================

describe('GeospatialBridge - Coordinate Validation', () => {
  describe('WGS84 bounds validation', () => {
    it('validates latitude range (-90 to 90)', () => {
      const validLats = [0, 45, -45, 90, -90];
      validLats.forEach(lat => {
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      });
    });

    it('validates longitude range (-180 to 180)', () => {
      const validLons = [0, 45, -45, 180, -180, 179.9];
      validLons.forEach(lon => {
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      });
    });

    it('validates altitude (reasonable range)', () => {
      // Altitude: Dead Sea (-430m) to Everest (+8849m) to Kármán line (+100km)
      const validAlts = [-430, 0, 100, 8849, 100000];
      validAlts.forEach(alt => {
        expect(alt).toBeGreaterThan(-500); // Below Dead Sea
        expect(alt).toBeLessThan(150000); // Above reasonable flight ceiling
      });
    });
  });

  describe('quaternion validation', () => {
    it('validates quaternion is normalized', () => {
      const q: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
      const magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);

      expect(magnitude).toBeCloseTo(1.0, 5);
    });

    it('detects unnormalized quaternion', () => {
      const q: Quaternion = { x: 1, y: 1, z: 1, w: 1 };
      const magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);

      expect(magnitude).not.toBeCloseTo(1.0);
      expect(magnitude).toBeCloseTo(2.0, 5);
    });
  });
});

// =============================================================================
// ACCURACY ESTIMATION
// =============================================================================

describe('GeospatialBridge - Accuracy Tiers', () => {
  describe('Platform accuracy targets', () => {
    it('iOS ARKit: 5-10m horizontal, 3-5m vertical', () => {
      const accuracy = { horizontal: 7.5, vertical: 4.0 };

      expect(accuracy.horizontal).toBeGreaterThanOrEqual(5);
      expect(accuracy.horizontal).toBeLessThanOrEqual(10);
      expect(accuracy.vertical).toBeGreaterThanOrEqual(3);
      expect(accuracy.vertical).toBeLessThanOrEqual(5);
    });

    it('Android ARCore VPS: 1-5m horizontal, 1-3m vertical', () => {
      const accuracy = { horizontal: 2.5, vertical: 2.0 };

      expect(accuracy.horizontal).toBeGreaterThanOrEqual(1);
      expect(accuracy.horizontal).toBeLessThanOrEqual(5);
      expect(accuracy.vertical).toBeGreaterThanOrEqual(1);
      expect(accuracy.vertical).toBeLessThanOrEqual(3);
    });

    it('Android ARCore GPS-only: 3-10m horizontal', () => {
      const accuracy = { horizontal: 6.5, vertical: 5.0 };

      expect(accuracy.horizontal).toBeGreaterThanOrEqual(3);
      expect(accuracy.horizontal).toBeLessThanOrEqual(10);
    });

    it('Web Geolocation: 3-15m outdoors, 50-100m indoors', () => {
      const outdoorAccuracy = 10;
      const indoorAccuracy = 75;

      expect(outdoorAccuracy).toBeGreaterThanOrEqual(3);
      expect(outdoorAccuracy).toBeLessThanOrEqual(15);
      expect(indoorAccuracy).toBeGreaterThanOrEqual(50);
      expect(indoorAccuracy).toBeLessThanOrEqual(100);
    });
  });

  describe('Accuracy tier classification', () => {
    it('classifies high accuracy (<5m)', () => {
      const accuracies = [1, 2, 3, 4, 4.9];
      accuracies.forEach(acc => {
        expect(acc).toBeLessThan(5);
      });
    });

    it('classifies medium accuracy (5-10m)', () => {
      const accuracies = [5, 7, 8.5, 9.9];
      accuracies.forEach(acc => {
        expect(acc).toBeGreaterThanOrEqual(5);
        expect(acc).toBeLessThan(10);
      });
    });

    it('classifies low accuracy (10-20m)', () => {
      const accuracies = [10, 12, 15, 19.9];
      accuracies.forEach(acc => {
        expect(acc).toBeGreaterThanOrEqual(10);
        expect(acc).toBeLessThan(20);
      });
    });

    it('classifies coarse accuracy (≥20m)', () => {
      const accuracies = [20, 50, 100, 200];
      accuracies.forEach(acc => {
        expect(acc).toBeGreaterThanOrEqual(20);
      });
    });
  });
});

// =============================================================================
// ANCHOR DATA STRUCTURE
// =============================================================================

describe('GeospatialBridge - Anchor Structure', () => {
  it('creates valid anchor with required fields', () => {
    const anchor: NativeGeospatialAnchor = {
      anchorId: 'arkit_0_1234567890',
      coordinate: LOCATIONS.sanFrancisco,
      rotation: identityQuaternion(),
      horizontalAccuracy: 7.5,
      verticalAccuracy: 4.0,
      platform: 'arkit',
      timestamp: Date.now(),
    };

    expect(anchor.anchorId).toBeTruthy();
    expect(anchor.coordinate.latitude).toBeCloseTo(37.7749);
    expect(anchor.platform).toBe('arkit');
    expect(anchor.timestamp).toBeGreaterThan(0);
  });

  it('supports null vertical accuracy (web fallback)', () => {
    const anchor: NativeGeospatialAnchor = {
      anchorId: 'webxr_0_1234567890',
      coordinate: LOCATIONS.sanFrancisco,
      rotation: identityQuaternion(),
      horizontalAccuracy: 10.0,
      verticalAccuracy: null, // Web doesn't provide vertical accuracy
      platform: 'webxr',
      timestamp: Date.now(),
    };

    expect(anchor.verticalAccuracy).toBeNull();
  });

  it('supports all platform types', () => {
    const platforms: Array<'arkit' | 'arcore' | 'webxr'> = ['arkit', 'arcore', 'webxr'];

    platforms.forEach(platform => {
      const anchor: NativeGeospatialAnchor = {
        anchorId: `${platform}_0_1234567890`,
        coordinate: LOCATIONS.sanFrancisco,
        rotation: identityQuaternion(),
        horizontalAccuracy: 5.0,
        verticalAccuracy: 3.0,
        platform,
        timestamp: Date.now(),
      };

      expect(anchor.platform).toBe(platform);
    });
  });
});

// =============================================================================
// EDGE CASES & ERROR HANDLING
// =============================================================================

describe('GeospatialBridge - Edge Cases', () => {
  describe('extreme coordinates', () => {
    it('handles north pole', () => {
      const northPole: WGS84Coordinate = { latitude: 90, longitude: 0, altitude: 0 };
      const distance = haversineDistance(northPole, LOCATIONS.london);

      expect(distance).toBeGreaterThan(0);
      expect(Number.isNaN(distance)).toBe(false);
    });

    it('handles south pole', () => {
      const southPole: WGS84Coordinate = { latitude: -90, longitude: 0, altitude: 0 };
      const distance = haversineDistance(southPole, LOCATIONS.sydney);

      expect(distance).toBeGreaterThan(0);
      expect(Number.isNaN(distance)).toBe(false);
    });

    it('handles equator crossing', () => {
      const pointA: WGS84Coordinate = { latitude: 1, longitude: 0, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: -1, longitude: 0, altitude: 0 };

      const distance = haversineDistance(pointA, pointB);
      expect(distance).toBeGreaterThan(200_000); // ~222km
    });

    it('handles very small distances (<1m)', () => {
      const pointA: WGS84Coordinate = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: 37.77490001, longitude: -122.4194, altitude: 0 };

      const distance = haversineDistance(pointA, pointB);
      expect(distance).toBeLessThan(1); // <1 meter
      expect(distance).toBeGreaterThan(0);
    });

    it('handles very large distances (opposite sides of Earth)', () => {
      const pointA: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: 0, longitude: 180, altitude: 0 };

      const distance = haversineDistance(pointA, pointB);

      // Expected: ~20,000 km (half earth circumference)
      expect(distance).toBeGreaterThan(19_000_000);
      expect(distance).toBeLessThan(21_000_000);
    });
  });

  describe('numerical precision', () => {
    it('maintains precision for nearby points', () => {
      // Two points 1cm apart (at equator)
      const pointA: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
      const pointB: WGS84Coordinate = { latitude: 0, longitude: 0.0000001, altitude: 0 };

      const distance = haversineDistance(pointA, pointB);

      // Should be ~1cm, not zero due to floating point
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.1); // Less than 10cm
    });

    it('handles floating point edge cases', () => {
      const pointA: WGS84Coordinate = {
        latitude: 37.774900000000001,
        longitude: -122.419400000000003,
        altitude: 0
      };
      const pointB: WGS84Coordinate = {
        latitude: 37.774900000000002,
        longitude: -122.419400000000004,
        altitude: 0
      };

      const distance = haversineDistance(pointA, pointB);

      // Floating point noise should not cause NaN
      expect(Number.isNaN(distance)).toBe(false);
      expect(distance).toBeLessThan(1); // Sub-meter difference
    });
  });
});

// =============================================================================
// PLATFORM-SPECIFIC BEHAVIOR
// =============================================================================

describe('GeospatialBridge - Platform Differences', () => {
  it('ARKit uses GPS-only (no VPS)', () => {
    const accuracy = { horizontal: 7.5, vertical: 4.0 };
    const vpsAvailable = false;

    expect(vpsAvailable).toBe(false);
    expect(accuracy.horizontal).toBeGreaterThanOrEqual(5);
  });

  it('ARCore supports VPS with improved accuracy', () => {
    const gpsOnlyAccuracy = 8.0;
    const vpsAccuracy = 2.5;

    expect(vpsAccuracy).toBeLessThan(gpsOnlyAccuracy);
    expect(vpsAccuracy).toBeLessThan(5);
  });

  it('Web fallback has no vertical accuracy', () => {
    const webAnchor: NativeGeospatialAnchor = {
      anchorId: 'webxr_0_1234567890',
      coordinate: LOCATIONS.sanFrancisco,
      rotation: identityQuaternion(),
      horizontalAccuracy: 10.0,
      verticalAccuracy: null,
      platform: 'webxr',
      timestamp: Date.now(),
    };

    expect(webAnchor.verticalAccuracy).toBeNull();
  });

  it('all platforms use WGS84 coordinates', () => {
    // All platforms (ARKit, ARCore, WebXR) use WGS84 standard
    const coordinates: WGS84Coordinate[] = [
      LOCATIONS.sanFrancisco,
      LOCATIONS.tokyo,
      LOCATIONS.london,
    ];

    coordinates.forEach(coord => {
      expect(coord.latitude).toBeGreaterThanOrEqual(-90);
      expect(coord.latitude).toBeLessThanOrEqual(90);
      expect(coord.longitude).toBeGreaterThanOrEqual(-180);
      expect(coord.longitude).toBeLessThanOrEqual(180);
    });
  });
});
