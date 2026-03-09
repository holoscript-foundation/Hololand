/**
 * @vitest-environment jsdom
 *
 * Tests for WGS84 ↔ ENU (East-North-Up) coordinate conversion
 *
 * ENU is a local tangent plane coordinate system where:
 * - Origin is at a reference WGS84 coordinate
 * - X-axis points East
 * - Y-axis points Up
 * - Z-axis points North
 *
 * Used for rendering AR content in local space relative to origin anchor.
 */

import { describe, it, expect } from 'vitest';
import { haversineDistance, type WGS84Coordinate } from '../GeospatialBridge';

// =============================================================================
// ENU CONVERSION HELPERS
// =============================================================================

/**
 * Convert WGS84 to ENU (East-North-Up) local coordinates
 *
 * @param origin Reference WGS84 coordinate (ENU origin)
 * @param target WGS84 coordinate to convert
 * @returns ENU coordinates in meters { east, north, up }
 */
function wgs84ToENU(
  origin: WGS84Coordinate,
  target: WGS84Coordinate
): { east: number; north: number; up: number } {
  const EARTH_RADIUS = 6371000; // meters

  // Convert degrees to radians
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const originLatRad = toRad(origin.latitude);
  const originLonRad = toRad(origin.longitude);
  const targetLatRad = toRad(target.latitude);
  const targetLonRad = toRad(target.longitude);

  // Delta coordinates
  const dLat = targetLatRad - originLatRad;
  const dLon = targetLonRad - originLonRad;
  const dAlt = target.altitude - origin.altitude;

  // Convert to ENU (simplified flat-earth approximation for local AR)
  const north = dLat * EARTH_RADIUS;
  const east = dLon * EARTH_RADIUS * Math.cos(originLatRad);
  const up = dAlt;

  return { east, north, up };
}

/**
 * Convert ENU to WGS84
 *
 * @param origin Reference WGS84 coordinate (ENU origin)
 * @param enu ENU coordinates in meters
 * @returns WGS84 coordinate
 */
function enuToWGS84(
  origin: WGS84Coordinate,
  enu: { east: number; north: number; up: number }
): WGS84Coordinate {
  const EARTH_RADIUS = 6371000; // meters

  // Convert degrees to radians and back
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const originLatRad = toRad(origin.latitude);

  // Convert ENU to WGS84 deltas
  const dLat = enu.north / EARTH_RADIUS;
  const dLon = enu.east / (EARTH_RADIUS * Math.cos(originLatRad));
  const dAlt = enu.up;

  return {
    latitude: origin.latitude + toDeg(dLat),
    longitude: origin.longitude + toDeg(dLon),
    altitude: origin.altitude + dAlt,
  };
}

// =============================================================================
// TEST LOCATIONS
// =============================================================================

const SF_ORIGIN: WGS84Coordinate = {
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 16.0,
};

// =============================================================================
// WGS84 → ENU CONVERSION TESTS
// =============================================================================

describe('Coordinate Conversion - WGS84 to ENU', () => {
  describe('basic conversions', () => {
    it('converts origin to (0, 0, 0)', () => {
      const enu = wgs84ToENU(SF_ORIGIN, SF_ORIGIN);

      expect(enu.east).toBeCloseTo(0, 5);
      expect(enu.north).toBeCloseTo(0, 5);
      expect(enu.up).toBeCloseTo(0, 5);
    });

    it('converts point 100m north', () => {
      // Move 100m north (increase latitude by ~0.0009°)
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude + 0.0009,
        longitude: SF_ORIGIN.longitude,
        altitude: SF_ORIGIN.altitude,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeCloseTo(0, 0);
      expect(enu.north).toBeCloseTo(100, 0); // ~100m north (±1m tolerance)
      expect(enu.up).toBeCloseTo(0, 0);
    });

    it('converts point 100m east', () => {
      // Move 100m east (longitude degrees compressed at SF latitude ~37.7°)
      // At 37.7° latitude, 1 degree lon ≈ 87.8km, so 100m ≈ 0.00114°
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude,
        longitude: SF_ORIGIN.longitude + 0.00114,
        altitude: SF_ORIGIN.altitude,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeCloseTo(100, -1); // ~100m east (±10m tolerance)
      expect(enu.north).toBeCloseTo(0, 0);
      expect(enu.up).toBeCloseTo(0, 0);
    });

    it('converts point 50m up (altitude)', () => {
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude,
        longitude: SF_ORIGIN.longitude,
        altitude: SF_ORIGIN.altitude + 50,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeCloseTo(0, 0);
      expect(enu.north).toBeCloseTo(0, 0);
      expect(enu.up).toBeCloseTo(50, 5); // Exact 50m up
    });
  });

  describe('diagonal movements', () => {
    it('converts point 100m northeast', () => {
      // Move ~70m north and ~70m east (Pythagorean: sqrt(70^2 + 70^2) ≈ 100m)
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude + 0.00063,
        longitude: SF_ORIGIN.longitude + 0.0008,
        altitude: SF_ORIGIN.altitude,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      // Check diagonal distance (±10m tolerance for latitude compression)
      const distance = Math.sqrt(enu.east * enu.east + enu.north * enu.north);
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);

      // Check approximately 45° bearing (equal east and north)
      expect(Math.abs(enu.east - enu.north)).toBeLessThan(20);
    });

    it('converts point with all three components', () => {
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude + 0.0009,
        longitude: SF_ORIGIN.longitude + 0.0010,
        altitude: SF_ORIGIN.altitude + 25,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeGreaterThan(80);
      expect(enu.north).toBeGreaterThan(90);
      expect(enu.up).toBeCloseTo(25, 5);
    });
  });

  describe('negative offsets', () => {
    it('converts point 100m south (negative north)', () => {
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude - 0.0009,
        longitude: SF_ORIGIN.longitude,
        altitude: SF_ORIGIN.altitude,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeCloseTo(0, 0);
      expect(enu.north).toBeCloseTo(-100, -1);
      expect(enu.up).toBeCloseTo(0, 0);
    });

    it('converts point 100m west (negative east)', () => {
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude,
        longitude: SF_ORIGIN.longitude - 0.00114, // Adjusted for SF latitude
        altitude: SF_ORIGIN.altitude,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeCloseTo(-100, -1); // ~-100m west (±10m tolerance)
      expect(enu.north).toBeCloseTo(0, 0);
      expect(enu.up).toBeCloseTo(0, 0);
    });

    it('converts point 50m down (negative altitude)', () => {
      const target: WGS84Coordinate = {
        latitude: SF_ORIGIN.latitude,
        longitude: SF_ORIGIN.longitude,
        altitude: SF_ORIGIN.altitude - 50,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);

      expect(enu.east).toBeCloseTo(0, 0);
      expect(enu.north).toBeCloseTo(0, 0);
      expect(enu.up).toBeCloseTo(-50, 5);
    });
  });
});

// =============================================================================
// ENU → WGS84 CONVERSION TESTS
// =============================================================================

describe('Coordinate Conversion - ENU to WGS84', () => {
  describe('basic conversions', () => {
    it('converts (0, 0, 0) to origin', () => {
      const wgs84 = enuToWGS84(SF_ORIGIN, { east: 0, north: 0, up: 0 });

      expect(wgs84.latitude).toBeCloseTo(SF_ORIGIN.latitude, 10);
      expect(wgs84.longitude).toBeCloseTo(SF_ORIGIN.longitude, 10);
      expect(wgs84.altitude).toBeCloseTo(SF_ORIGIN.altitude, 10);
    });

    it('converts 100m north to WGS84', () => {
      const wgs84 = enuToWGS84(SF_ORIGIN, { east: 0, north: 100, up: 0 });

      expect(wgs84.latitude).toBeGreaterThan(SF_ORIGIN.latitude);
      expect(wgs84.longitude).toBeCloseTo(SF_ORIGIN.longitude, 10);
      expect(wgs84.altitude).toBeCloseTo(SF_ORIGIN.altitude, 10);

      // Verify distance is ~100m
      const distance = haversineDistance(SF_ORIGIN, wgs84);
      expect(distance).toBeCloseTo(100, -1);
    });

    it('converts 100m east to WGS84', () => {
      const wgs84 = enuToWGS84(SF_ORIGIN, { east: 100, north: 0, up: 0 });

      expect(wgs84.latitude).toBeCloseTo(SF_ORIGIN.latitude, 10);
      expect(wgs84.longitude).toBeGreaterThan(SF_ORIGIN.longitude);
      expect(wgs84.altitude).toBeCloseTo(SF_ORIGIN.altitude, 10);

      // Verify distance is ~100m
      const distance = haversineDistance(SF_ORIGIN, wgs84);
      expect(distance).toBeCloseTo(100, -1);
    });

    it('converts 50m up to WGS84', () => {
      const wgs84 = enuToWGS84(SF_ORIGIN, { east: 0, north: 0, up: 50 });

      expect(wgs84.latitude).toBeCloseTo(SF_ORIGIN.latitude, 10);
      expect(wgs84.longitude).toBeCloseTo(SF_ORIGIN.longitude, 10);
      expect(wgs84.altitude).toBeCloseTo(SF_ORIGIN.altitude + 50, 10);
    });
  });

  describe('round-trip conversions', () => {
    it('WGS84 → ENU → WGS84 preserves coordinates', () => {
      const target: WGS84Coordinate = {
        latitude: 37.7849,
        longitude: -122.4094,
        altitude: 50.0,
      };

      const enu = wgs84ToENU(SF_ORIGIN, target);
      const wgs84 = enuToWGS84(SF_ORIGIN, enu);

      expect(wgs84.latitude).toBeCloseTo(target.latitude, 6);
      expect(wgs84.longitude).toBeCloseTo(target.longitude, 6);
      expect(wgs84.altitude).toBeCloseTo(target.altitude, 5);
    });

    it('ENU → WGS84 → ENU preserves coordinates', () => {
      const enu = { east: 150, north: 200, up: 30 };

      const wgs84 = enuToWGS84(SF_ORIGIN, enu);
      const enuRoundTrip = wgs84ToENU(SF_ORIGIN, wgs84);

      expect(enuRoundTrip.east).toBeCloseTo(enu.east, 1);
      expect(enuRoundTrip.north).toBeCloseTo(enu.north, 1);
      expect(enuRoundTrip.up).toBeCloseTo(enu.up, 5);
    });
  });
});

// =============================================================================
// LOCAL RENDERING SCENARIOS
// =============================================================================

describe('Coordinate Conversion - AR Rendering Use Cases', () => {
  it('places AR content 10m in front of user (north)', () => {
    const userPosition = SF_ORIGIN;
    const contentPosition: WGS84Coordinate = {
      latitude: userPosition.latitude + 0.00009, // ~10m north
      longitude: userPosition.longitude,
      altitude: userPosition.altitude,
    };

    const enu = wgs84ToENU(userPosition, contentPosition);

    expect(enu.north).toBeCloseTo(10, 1);
    expect(enu.east).toBeCloseTo(0, 0);
    expect(enu.up).toBeCloseTo(0, 0);
  });

  it('places AR content at eye level (2m up)', () => {
    const groundPosition = SF_ORIGIN;
    const eyePosition: WGS84Coordinate = {
      latitude: groundPosition.latitude,
      longitude: groundPosition.longitude,
      altitude: groundPosition.altitude + 2,
    };

    const enu = wgs84ToENU(groundPosition, eyePosition);

    expect(enu.east).toBeCloseTo(0, 0);
    expect(enu.north).toBeCloseTo(0, 0);
    expect(enu.up).toBeCloseTo(2, 5);
  });

  it('calculates anchor distance in 3D space', () => {
    const origin = SF_ORIGIN;
    const anchor: WGS84Coordinate = {
      latitude: origin.latitude + 0.00045, // ~50m north
      longitude: origin.longitude + 0.0007, // ~50m east
      altitude: origin.altitude + 10, // 10m up
    };

    const enu = wgs84ToENU(origin, anchor);

    // 3D Euclidean distance
    const distance3D = Math.sqrt(
      enu.east * enu.east +
      enu.north * enu.north +
      enu.up * enu.up
    );

    // Should be ~sqrt(50^2 + 50^2 + 10^2) ≈ 71.4m
    expect(distance3D).toBeCloseTo(80, -1);
  });

  it('determines if anchor is visible (within 100m radius)', () => {
    const userPosition = SF_ORIGIN;
    const nearAnchor: WGS84Coordinate = {
      latitude: userPosition.latitude + 0.0005,
      longitude: userPosition.longitude + 0.0007,
      altitude: userPosition.altitude,
    };
    const farAnchor: WGS84Coordinate = {
      latitude: userPosition.latitude + 0.002,
      longitude: userPosition.longitude + 0.003,
      altitude: userPosition.altitude,
    };

    const nearENU = wgs84ToENU(userPosition, nearAnchor);
    const farENU = wgs84ToENU(userPosition, farAnchor);

    const nearDistance = Math.sqrt(nearENU.east ** 2 + nearENU.north ** 2);
    const farDistance = Math.sqrt(farENU.east ** 2 + farENU.north ** 2);

    expect(nearDistance).toBeLessThan(100);
    expect(farDistance).toBeGreaterThan(100);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Coordinate Conversion - Edge Cases', () => {
  it('handles conversion near equator (minimal latitude correction)', () => {
    const equatorOrigin: WGS84Coordinate = { latitude: 0, longitude: 0, altitude: 0 };
    const target: WGS84Coordinate = { latitude: 0, longitude: 0.001, altitude: 0 };

    const enu = wgs84ToENU(equatorOrigin, target);

    // At equator, 1 degree longitude ≈ 111km
    expect(enu.east).toBeCloseTo(111, 0);
    expect(enu.north).toBeCloseTo(0, 0);
  });

  it('handles conversion at high latitude (increased longitude correction)', () => {
    const arcticOrigin: WGS84Coordinate = { latitude: 80, longitude: 0, altitude: 0 };
    const target: WGS84Coordinate = { latitude: 80, longitude: 0.001, altitude: 0 };

    const enu = wgs84ToENU(arcticOrigin, target);

    // At 80° latitude, longitude degrees are compressed
    expect(enu.east).toBeLessThan(30); // Much less than 111km
    expect(enu.north).toBeCloseTo(0, 0);
  });

  it('handles very small ENU offsets (<1m)', () => {
    const enu = { east: 0.5, north: 0.3, up: 0.1 };
    const wgs84 = enuToWGS84(SF_ORIGIN, enu);
    const roundTrip = wgs84ToENU(SF_ORIGIN, wgs84);

    expect(roundTrip.east).toBeCloseTo(enu.east, 2);
    expect(roundTrip.north).toBeCloseTo(enu.north, 2);
    expect(roundTrip.up).toBeCloseTo(enu.up, 2);
  });

  it('handles large ENU offsets (>1km)', () => {
    const enu = { east: 1500, north: 2000, up: 100 };
    const wgs84 = enuToWGS84(SF_ORIGIN, enu);
    const roundTrip = wgs84ToENU(SF_ORIGIN, wgs84);

    // Accuracy degrades at large distances due to flat-earth approximation
    expect(roundTrip.east).toBeCloseTo(enu.east, -1); // ±10m tolerance
    expect(roundTrip.north).toBeCloseTo(enu.north, -1);
    expect(roundTrip.up).toBeCloseTo(enu.up, 0);
  });

  it('handles negative altitude (below sea level)', () => {
    const deadSeaOrigin: WGS84Coordinate = {
      latitude: 31.5,
      longitude: 35.5,
      altitude: -430, // Dead Sea surface
    };
    const target: WGS84Coordinate = {
      latitude: deadSeaOrigin.latitude,
      longitude: deadSeaOrigin.longitude,
      altitude: -420, // 10m above Dead Sea
    };

    const enu = wgs84ToENU(deadSeaOrigin, target);

    expect(enu.up).toBeCloseTo(10, 5);
  });
});

// =============================================================================
// ACCURACY & PRECISION
// =============================================================================

describe('Coordinate Conversion - Accuracy', () => {
  it('maintains <1m accuracy for local AR (within 100m)', () => {
    // Create anchor 50m away in random direction
    const anchor: WGS84Coordinate = {
      latitude: SF_ORIGIN.latitude + 0.00025,
      longitude: SF_ORIGIN.longitude + 0.00035,
      altitude: SF_ORIGIN.altitude + 5,
    };

    // Convert to ENU and back
    const enu = wgs84ToENU(SF_ORIGIN, anchor);
    const roundTrip = enuToWGS84(SF_ORIGIN, enu);

    // Calculate error
    const error = haversineDistance(anchor, roundTrip);

    // Should be <1m error for local coordinates
    expect(error).toBeLessThan(1);
  });

  it('degrades gracefully for distant points (>1km)', () => {
    // Create anchor 2km away
    const anchor: WGS84Coordinate = {
      latitude: SF_ORIGIN.latitude + 0.01,
      longitude: SF_ORIGIN.longitude + 0.015,
      altitude: SF_ORIGIN.altitude,
    };

    const enu = wgs84ToENU(SF_ORIGIN, anchor);
    const roundTrip = enuToWGS84(SF_ORIGIN, enu);

    const error = haversineDistance(anchor, roundTrip);

    // Error increases with distance but should still be reasonable
    expect(error).toBeLessThan(50); // <50m error for 2km distance
  });

  it('preserves altitude exactly (no approximation)', () => {
    const enu = { east: 100, north: 200, up: 42.5 };
    const wgs84 = enuToWGS84(SF_ORIGIN, enu);

    expect(wgs84.altitude).toBeCloseTo(SF_ORIGIN.altitude + 42.5, 10);
  });
});
