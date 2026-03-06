/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  GeospatialAnchorBridge,
  createGeospatialAnchorBridge,
} from '../GeospatialAnchorBridge';

import type { GeospatialCoordinate } from '../CrossRealityContinuityTypes';

// =============================================================================
// HELPERS
// =============================================================================

function sanFranciscoCoord(): GeospatialCoordinate {
  return {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 16.0,
    horizontalAccuracy: 3.0,
    verticalAccuracy: 5.0,
    heading: null,
    source: 'gps',
    capturedAt: Date.now(),
  };
}

function tokyoCoord(): GeospatialCoordinate {
  return {
    latitude: 35.6762,
    longitude: 139.6503,
    altitude: 40.0,
    horizontalAccuracy: 2.0,
    verticalAccuracy: 3.0,
    heading: null,
    source: 'gps',
    capturedAt: Date.now(),
  };
}

// =============================================================================
// BRIDGE LIFECYCLE
// =============================================================================

describe('GeospatialAnchorBridge', () => {
  describe('origin calibration', () => {
    it('starts uncalibrated', () => {
      const bridge = createGeospatialAnchorBridge();
      expect(bridge.isCalibrated()).toBe(false);
      expect(bridge.getOrigin()).toBeNull();
    });

    it('calibrates with a geospatial coordinate', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      expect(bridge.isCalibrated()).toBe(true);
      expect(bridge.getOrigin()!.coordinate.latitude).toBeCloseTo(37.7749);
    });

    it('emits origin:calibrated event', () => {
      const bridge = createGeospatialAnchorBridge();
      const handler = vi.fn();
      bridge.on('origin:calibrated', handler);

      bridge.calibrateOrigin(sanFranciscoCoord());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('clearOrigin resets calibration', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());
      bridge.clearOrigin('test');

      expect(bridge.isCalibrated()).toBe(false);
      expect(bridge.getOrigin()).toBeNull();
    });

    it('emits origin:lost on clear', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const handler = vi.fn();
      bridge.on('origin:lost', handler);
      bridge.clearOrigin('test');

      expect(handler).toHaveBeenCalledWith({ reason: 'test' });
    });
  });

  // ---------------------------------------------------------------------------
  // COORDINATE CONVERSION
  // ---------------------------------------------------------------------------

  describe('coordinate conversion', () => {
    it('origin maps to itself (roundtrip)', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const geo = bridge.localToGeospatial({ x: 0, y: 0, z: 0 });
      expect(geo).not.toBeNull();
      expect(geo!.latitude).toBeCloseTo(37.7749, 4);
      expect(geo!.longitude).toBeCloseTo(-122.4194, 4);
    });

    it('returns null when not calibrated', () => {
      const bridge = createGeospatialAnchorBridge();
      expect(bridge.localToGeospatial({ x: 100, y: 0, z: 0 })).toBeNull();
      expect(bridge.geospatialToLocal(sanFranciscoCoord())).toBeNull();
    });

    it('local 100m east increases longitude', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const geo = bridge.localToGeospatial({ x: 100, y: 0, z: 0 });
      expect(geo!.longitude).toBeGreaterThan(-122.4194);
    });

    it('local 100m up (Y) increases altitude', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const geo = bridge.localToGeospatial({ x: 0, y: 100, z: 0 });
      expect(geo!.altitude).toBeCloseTo(116.0); // 16 + 100
    });

    it('roundtrip conversion is accurate within 1 meter', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const localPos = { x: 50, y: 10, z: -30 };
      const geo = bridge.localToGeospatial(localPos)!;
      const backToLocal = bridge.geospatialToLocal(geo)!;

      expect(backToLocal.x).toBeCloseTo(localPos.x, 0);
      expect(backToLocal.y).toBeCloseTo(localPos.y, 0);
      expect(backToLocal.z).toBeCloseTo(localPos.z, 0);
    });

    it('heading offset rotates coordinate mapping', () => {
      const bridge = createGeospatialAnchorBridge();
      // 90 degree heading: local +X now points North instead of East
      bridge.calibrateOrigin(sanFranciscoCoord(), 90);

      const geo = bridge.localToGeospatial({ x: 100, y: 0, z: 0 });
      // With 90 deg rotation, +X should now move latitude (north), not longitude
      expect(geo!.latitude).toBeGreaterThan(37.7749);
    });
  });

  // ---------------------------------------------------------------------------
  // HAVERSINE DISTANCE
  // ---------------------------------------------------------------------------

  describe('haversineDistance', () => {
    it('distance between same point is 0', () => {
      const coord = sanFranciscoCoord();
      expect(GeospatialAnchorBridge.haversineDistance(coord, coord)).toBe(0);
    });

    it('SF to Tokyo is approximately 8,270 km', () => {
      const distance = GeospatialAnchorBridge.haversineDistance(
        sanFranciscoCoord(),
        tokyoCoord(),
      );
      // Actual: ~8,270 km. Allow 5% tolerance
      expect(distance).toBeGreaterThan(8_000_000);
      expect(distance).toBeLessThan(8_600_000);
    });

    it('short distance is accurate', () => {
      const a: GeospatialCoordinate = {
        latitude: 37.7749, longitude: -122.4194,
        altitude: null, horizontalAccuracy: 1, verticalAccuracy: null,
        heading: null, source: 'gps', capturedAt: Date.now(),
      };
      // ~111m north (1/1000 of a degree latitude)
      const b: GeospatialCoordinate = {
        ...a, latitude: 37.7759,
      };
      const distance = GeospatialAnchorBridge.haversineDistance(a, b);
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });
  });

  // ---------------------------------------------------------------------------
  // ANCHOR MANAGEMENT
  // ---------------------------------------------------------------------------

  describe('anchor management', () => {
    it('registers an anchor with geospatial coords when calibrated', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const anchor = bridge.registerAnchor('anchor-1', { x: 10, y: 0, z: 5 });
      expect(anchor.anchorId).toBe('anchor-1');
      expect(anchor.geospatial).not.toBeNull();
      expect(anchor.stale).toBe(false);
    });

    it('registers an anchor without geospatial when not calibrated', () => {
      const bridge = createGeospatialAnchorBridge();
      const anchor = bridge.registerAnchor('anchor-1', { x: 10, y: 0, z: 5 });
      expect(anchor.geospatial).toBeNull();
    });

    it('emits anchor:geolocated on registration', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const handler = vi.fn();
      bridge.on('anchor:geolocated', handler);

      bridge.registerAnchor('anchor-1', { x: 0, y: 0, z: 0 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('updates anchor position', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());
      bridge.registerAnchor('anchor-1', { x: 0, y: 0, z: 0 });

      const updated = bridge.updateAnchorPosition('anchor-1', { x: 50, y: 0, z: 0 });
      expect(updated).not.toBeNull();
      expect(updated!.localPosition.x).toBe(50);
    });

    it('imports remote anchor from geospatial coordinates', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());

      const remoteCoord: GeospatialCoordinate = {
        ...sanFranciscoCoord(),
        latitude: 37.7759, // ~111m north
      };

      const anchor = bridge.importRemoteAnchor('remote-1', remoteCoord);
      expect(anchor.anchorId).toBe('remote-1');
      expect(anchor.geospatial).not.toBeNull();
      // Local position should be ~111m in some direction
      const dist = Math.sqrt(
        anchor.localPosition.x ** 2 +
        anchor.localPosition.y ** 2 +
        anchor.localPosition.z ** 2,
      );
      expect(dist).toBeGreaterThan(50);
      expect(dist).toBeLessThan(200);
    });

    it('removes anchors', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.registerAnchor('anchor-1', { x: 0, y: 0, z: 0 });
      expect(bridge.anchorCount).toBe(1);

      bridge.removeAnchor('anchor-1');
      expect(bridge.anchorCount).toBe(0);
    });

    it('marks anchors stale when origin changes', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());
      bridge.registerAnchor('anchor-1', { x: 10, y: 0, z: 5 });

      // Recalibrate origin
      bridge.calibrateOrigin({ ...sanFranciscoCoord(), latitude: 37.78 });

      const anchor = bridge.getAnchor('anchor-1');
      expect(anchor!.stale).toBe(true);
    });

    it('refreshStaleAnchors recomputes geospatial coords', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.calibrateOrigin(sanFranciscoCoord());
      bridge.registerAnchor('anchor-1', { x: 10, y: 0, z: 5 });

      // Recalibrate
      bridge.calibrateOrigin({ ...sanFranciscoCoord(), latitude: 37.78 });
      expect(bridge.getAnchor('anchor-1')!.stale).toBe(true);

      const refreshed = bridge.refreshStaleAnchors();
      expect(refreshed).toBe(1);
      expect(bridge.getAnchor('anchor-1')!.stale).toBe(false);
    });

    it('getAllAnchors returns all registered anchors', () => {
      const bridge = createGeospatialAnchorBridge();
      bridge.registerAnchor('a', { x: 0, y: 0, z: 0 });
      bridge.registerAnchor('b', { x: 1, y: 0, z: 0 });
      bridge.registerAnchor('c', { x: 2, y: 0, z: 0 });

      expect(bridge.getAllAnchors()).toHaveLength(3);
    });
  });
});
