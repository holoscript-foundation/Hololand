/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GeospatialAnchorProvider
 *
 * Validates:
 * 1.  getCurrentPosition returns GPS data
 * 2.  Manual position override works
 * 3.  Distance calculation (Haversine formula - known values)
 * 4.  Accuracy tier classification
 * 5.  Watch mode starts correctly
 * 6.  Watch mode stops correctly
 * 7.  Error handling when geolocation unavailable
 * 8.  Event emission on position update
 * 9.  Dispose cleans up resources
 * 10. Config options are respected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  GeospatialAnchorProvider,
  createGeospatialAnchorProvider,
  type GeospatialPosition,
} from '../GeospatialAnchorProvider';

// =============================================================================
// MOCK GEOLOCATION
// =============================================================================

interface MockGeolocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

interface MockGeolocation {
  getCurrentPosition: ReturnType<typeof vi.fn>;
  watchPosition: ReturnType<typeof vi.fn>;
  clearWatch: ReturnType<typeof vi.fn>;
}

function createMockGeolocation(): MockGeolocation {
  return {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };
}

function mockBrowserPosition(
  lat: number,
  lon: number,
  accuracy: number,
  altitude: number | null = 16.0,
): MockGeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lon,
      altitude,
      accuracy,
      altitudeAccuracy: altitude !== null ? 5.0 : null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('GeospatialAnchorProvider', () => {
  let mockGeolocation: MockGeolocation;

  beforeEach(() => {
    mockGeolocation = createMockGeolocation();
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. getCurrentPosition returns GPS data
  // ---------------------------------------------------------------------------
  it('getCurrentPosition returns GPS data with correct fields', async () => {
    const provider = createGeospatialAnchorProvider();
    const mockPos = mockBrowserPosition(37.7749, -122.4194, 3.5);

    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: (pos: MockGeolocationPosition) => void) => {
        success(mockPos);
      },
    );

    const position = await provider.getCurrentPosition();

    expect(position.latitude).toBe(37.7749);
    expect(position.longitude).toBe(-122.4194);
    expect(position.altitude).toBe(16.0);
    expect(position.accuracy).toBe(3.5);
    expect(position.source).toBe('gps');
    expect(position.timestamp).toBeTypeOf('number');
  });

  // ---------------------------------------------------------------------------
  // 2. Manual position override works
  // ---------------------------------------------------------------------------
  it('setManualPosition overrides and is returned by getLastPosition', () => {
    const provider = createGeospatialAnchorProvider();

    provider.setManualPosition(48.8566, 2.3522, 35);

    const pos = provider.getLastPosition();
    expect(pos).not.toBeNull();
    expect(pos!.latitude).toBe(48.8566);
    expect(pos!.longitude).toBe(2.3522);
    expect(pos!.altitude).toBe(35);
    expect(pos!.source).toBe('manual');
    expect(pos!.accuracy).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 3. Distance calculation (Haversine formula - known values)
  // ---------------------------------------------------------------------------
  it('distanceMeters computes correct Haversine distance for known city pairs', () => {
    // New York City (40.7128, -74.0060) to Los Angeles (34.0522, -118.2437)
    // Known great-circle distance: ~3944 km
    const nyc: GeospatialPosition = {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: null,
      accuracy: 5,
      source: 'gps',
      timestamp: Date.now(),
    };

    const la: GeospatialPosition = {
      latitude: 34.0522,
      longitude: -118.2437,
      altitude: null,
      accuracy: 5,
      source: 'gps',
      timestamp: Date.now(),
    };

    const distance = GeospatialAnchorProvider.distanceMeters(nyc, la);

    // Should be approximately 3944 km (allow 1% tolerance)
    expect(distance).toBeGreaterThan(3_900_000);
    expect(distance).toBeLessThan(3_990_000);

    // Same point -> 0 distance
    const zero = GeospatialAnchorProvider.distanceMeters(nyc, nyc);
    expect(zero).toBe(0);

    // London (51.5074, -0.1278) to Paris (48.8566, 2.3522)
    // Known: ~344 km
    const london: GeospatialPosition = {
      latitude: 51.5074,
      longitude: -0.1278,
      altitude: null,
      accuracy: 5,
      source: 'gps',
      timestamp: Date.now(),
    };

    const paris: GeospatialPosition = {
      latitude: 48.8566,
      longitude: 2.3522,
      altitude: null,
      accuracy: 5,
      source: 'gps',
      timestamp: Date.now(),
    };

    const londonParis = GeospatialAnchorProvider.distanceMeters(london, paris);
    expect(londonParis).toBeGreaterThan(340_000);
    expect(londonParis).toBeLessThan(350_000);
  });

  // ---------------------------------------------------------------------------
  // 4. Accuracy tier classification
  // ---------------------------------------------------------------------------
  it('classifies accuracy tiers correctly', () => {
    // high: < 2m
    expect(GeospatialAnchorProvider.classifyAccuracy(0.5)).toBe('high');
    expect(GeospatialAnchorProvider.classifyAccuracy(1.9)).toBe('high');

    // medium: >= 2m and < 10m
    expect(GeospatialAnchorProvider.classifyAccuracy(2.0)).toBe('medium');
    expect(GeospatialAnchorProvider.classifyAccuracy(9.9)).toBe('medium');

    // low: >= 10m and < 50m
    expect(GeospatialAnchorProvider.classifyAccuracy(10.0)).toBe('low');
    expect(GeospatialAnchorProvider.classifyAccuracy(49.9)).toBe('low');

    // coarse: >= 50m
    expect(GeospatialAnchorProvider.classifyAccuracy(50.0)).toBe('coarse');
    expect(GeospatialAnchorProvider.classifyAccuracy(5000)).toBe('coarse');

    // getAccuracyTier with no position -> coarse
    const provider = createGeospatialAnchorProvider();
    expect(provider.getAccuracyTier()).toBe('coarse');

    // After setting a high-accuracy manual position
    provider.setManualPosition(0, 0);
    // Manual position has accuracy 0, which is < 2 -> 'high'
    expect(provider.getAccuracyTier()).toBe('high');
  });

  // ---------------------------------------------------------------------------
  // 5. Watch mode starts correctly
  // ---------------------------------------------------------------------------
  it('startWatching initiates continuous position updates', () => {
    const provider = createGeospatialAnchorProvider();
    const onUpdate = vi.fn();
    provider.on('position-updated', onUpdate);

    mockGeolocation.watchPosition.mockReturnValue(42);

    provider.startWatching();

    expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1);
    expect(provider.isWatching()).toBe(true);

    // Simulate a position update from the browser
    const watchCallback = mockGeolocation.watchPosition.mock.calls[0][0];
    const mockPos = mockBrowserPosition(51.5074, -0.1278, 5.0);
    watchCallback(mockPos);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 51.5074,
        longitude: -0.1278,
        source: 'gps',
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // 6. Watch mode stops correctly
  // ---------------------------------------------------------------------------
  it('stopWatching clears the watch and updates state', () => {
    const provider = createGeospatialAnchorProvider();
    mockGeolocation.watchPosition.mockReturnValue(42);

    provider.startWatching();
    expect(provider.isWatching()).toBe(true);

    provider.stopWatching();

    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(42);
    expect(provider.isWatching()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 7. Error handling when geolocation unavailable
  // ---------------------------------------------------------------------------
  it('throws when geolocation unavailable and no manual fallback', async () => {
    const originalGeo = global.navigator.geolocation;
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const provider = createGeospatialAnchorProvider();

    await expect(provider.getCurrentPosition()).rejects.toThrow(
      'Geolocation is not available',
    );

    // Restore
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeo,
      writable: true,
      configurable: true,
    });
  });

  it('falls back to manual position when configured and geolocation unavailable', async () => {
    const originalGeo = global.navigator.geolocation;
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const provider = createGeospatialAnchorProvider({ fallbackToManual: true });
    provider.setManualPosition(40.0, -74.0, 10);

    const pos = await provider.getCurrentPosition();
    expect(pos.latitude).toBe(40.0);
    expect(pos.longitude).toBe(-74.0);
    expect(pos.source).toBe('manual');

    // Restore
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeo,
      writable: true,
      configurable: true,
    });
  });

  it('emits error event when watch encounters a geolocation error', () => {
    const provider = createGeospatialAnchorProvider();
    const onError = vi.fn();
    provider.on('error', onError);

    mockGeolocation.watchPosition.mockReturnValue(99);
    provider.startWatching();

    // Simulate an error from the browser
    const errorCallback = mockGeolocation.watchPosition.mock.calls[0][1];
    errorCallback({ code: 1, message: 'Permission denied' });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Permission denied' }),
    );
  });

  // ---------------------------------------------------------------------------
  // 8. Event emission on position update
  // ---------------------------------------------------------------------------
  it('emits position-updated event on setManualPosition', () => {
    const provider = createGeospatialAnchorProvider();
    const handler = vi.fn();

    provider.on('position-updated', handler);
    provider.setManualPosition(35.6762, 139.6503);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 35.6762,
        longitude: 139.6503,
        source: 'manual',
      }),
    );

    // off should remove the listener
    provider.off('position-updated', handler);
    provider.setManualPosition(0, 0);
    expect(handler).toHaveBeenCalledTimes(1); // Not called again
  });

  // ---------------------------------------------------------------------------
  // 9. Dispose cleans up resources
  // ---------------------------------------------------------------------------
  it('dispose stops watching and clears listeners', () => {
    const provider = createGeospatialAnchorProvider();
    const handler = vi.fn();
    provider.on('position-updated', handler);

    mockGeolocation.watchPosition.mockReturnValue(77);
    provider.startWatching();
    provider.setManualPosition(1, 2);

    expect(handler).toHaveBeenCalledTimes(1);

    provider.dispose();

    expect(provider.isWatching()).toBe(false);
    expect(provider.getLastPosition()).toBeNull();
    expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(77);

    // After dispose, events should not fire
    provider.setManualPosition(3, 4);
    // handler should not be called again because listeners were cleared,
    // BUT setManualPosition still sets lastPosition since it doesn't check disposed state.
    // The key test is that the event listener was removed.
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 10. Config options are respected
  // ---------------------------------------------------------------------------
  it('passes config options to the browser Geolocation API', async () => {
    const provider = createGeospatialAnchorProvider({
      enableHighAccuracy: false,
      maxAgeMs: 60000,
      timeoutMs: 5000,
    });

    const mockPos = mockBrowserPosition(0, 0, 10);
    mockGeolocation.getCurrentPosition.mockImplementation(
      (success: (pos: MockGeolocationPosition) => void) => {
        success(mockPos);
      },
    );

    await provider.getCurrentPosition();

    // Verify the options passed to getCurrentPosition
    const options = mockGeolocation.getCurrentPosition.mock.calls[0][2];
    expect(options.enableHighAccuracy).toBe(false);
    expect(options.maximumAge).toBe(60000);
    expect(options.timeout).toBe(5000);
  });
});
