# Geospatial AR Bridge - Integration with HoloLand Platform

**Complete guide for integrating native ARKit/ARCore geospatial bridges with the HoloLand ecosystem.**

---

## Overview

The GeospatialBridge connects HoloLand's TypeScript platform to native AR frameworks:

- **iOS**: ARKit Location Anchors (GPS + ARKit tracking)
- **Android**: ARCore Geospatial API + VPS (GPS + visual positioning)
- **Web**: Browser Geolocation API (GPS fallback)

This enables **persistent AR content anchored to real-world GPS coordinates** that works across devices and platforms.

---

## Architecture Integration

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│              HoloLand Platform (TypeScript)                  │
│  - GeospatialAnchorSystem (existing)                        │
│  - GeospatialAnchorBridge (existing)                        │
│  - GeospatialAnchorProvider (existing)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Integrates with
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           GeospatialBridge (NEW - This Integration)          │
│  TypeScript:  packages/platform/mobile/src/native/          │
│               GeospatialBridge.ts                            │
│  iOS:         packages/platform/mobile/ios/Plugin/          │
│               GeospatialBridge.swift                         │
│  Android:     packages/platform/mobile/android/.../         │
│               GeospatialBridge.kt                            │
│  Web:         packages/platform/mobile/src/native/web/      │
│               GeospatialBridgeWeb.ts                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Calls native APIs
                        ▼
┌──────────────┬────────────────┬────────────────────────────┐
│    ARKit     │    ARCore      │      Geolocation API        │
│  Location    │  Geospatial    │     (Web Fallback)         │
│  Anchors     │   API + VPS    │                            │
└──────────────┴────────────────┴────────────────────────────┘
```

### Integration Points

#### 1. GeospatialAnchorSystem (Existing)

**Location**: `packages/platform/spatial/GeospatialAnchorSystem.ts`

**Purpose**: High-level anchor management with IndexedDB persistence

**Integration**:
```typescript
import GeospatialBridge from '@hololand/mobile/native/GeospatialBridge';
import { GeospatialAnchorSystem } from '@hololand/platform/spatial';

class IntegratedGeospatialSystem {
  private system: GeospatialAnchorSystem;

  async createAnchor(coords, rotation, metadata) {
    // 1. Create in platform system (IndexedDB)
    const anchor = await this.system.createAnchor(coords, rotation, metadata);

    // 2. Create native AR anchor (ARKit/ARCore)
    const nativeAnchor = await GeospatialBridge.createGeospatialAnchor({
      coordinate: coords,
      rotation,
      label: metadata.label,
    });

    // 3. Store mapping (platform anchor ID → native anchor ID)
    await this.storeNativeMapping(anchor.id, nativeAnchor.anchorId);

    return anchor;
  }
}
```

#### 2. GeospatialAnchorBridge (Existing)

**Location**: `packages/platform/renderer/src/GeospatialAnchorBridge.ts`

**Purpose**: Coordinate conversion between WGS84 and local ENU

**Integration**:
```typescript
import { GeospatialAnchorBridge } from '@hololand/platform/renderer';
import GeospatialBridge from '@hololand/mobile/native/GeospatialBridge';

// Use existing converter for coordinate math
const bridge = new GeospatialAnchorBridge();

// Get current position from native bridge
const caps = await GeospatialBridge.getCapabilities();
// Set as origin for coordinate system
bridge.calibrateOrigin(currentGPSCoordinate, headingDeg);

// Convert anchor to local pose for rendering
const localPose = bridge.localToGeospatial(anchorPosition);
```

#### 3. GeospatialAnchorProvider (Existing)

**Location**: `packages/platform/renderer/src/GeospatialAnchorProvider.ts`

**Purpose**: GPS position tracking and accuracy classification

**Integration**:
```typescript
import { GeospatialAnchorProvider } from '@hololand/platform/renderer';
import GeospatialBridge from '@hololand/mobile/native/GeospatialBridge';

// Use provider for position watching
const provider = new GeospatialAnchorProvider();
await provider.startWatching();

provider.on('position-updated', async (position) => {
  // Update native AR session with new position
  const caps = await GeospatialBridge.getCapabilities();

  // Check accuracy tier
  const tier = provider.getAccuracyTier(); // 'high' | 'medium' | 'low' | 'coarse'

  // Adjust anchor creation based on accuracy
  if (tier === 'high' || tier === 'medium') {
    // Create precise anchors
    await createHighPrecisionAnchor(position);
  }
});
```

---

## Complete Integration Example

### Unified Geospatial Anchor Service

```typescript
/**
 * UnifiedGeospatialService
 *
 * Integrates all geospatial components:
 * - GeospatialAnchorSystem (IndexedDB persistence)
 * - GeospatialAnchorBridge (coordinate conversion)
 * - GeospatialAnchorProvider (GPS tracking)
 * - GeospatialBridge (native AR anchors)
 */

import { GeospatialAnchorSystem } from '@hololand/platform/spatial';
import { GeospatialAnchorBridge } from '@hololand/platform/renderer';
import { GeospatialAnchorProvider } from '@hololand/platform/renderer';
import GeospatialBridge, { initializeGeospatialAR } from '@hololand/mobile/native/GeospatialBridge';

export class UnifiedGeospatialService {
  private platformSystem: GeospatialAnchorSystem;
  private coordinateBridge: GeospatialAnchorBridge;
  private positionProvider: GeospatialAnchorProvider;
  private nativeMappings: Map<string, string>; // platform ID → native ID

  constructor() {
    this.platformSystem = new GeospatialAnchorSystem();
    this.coordinateBridge = new GeospatialAnchorBridge();
    this.positionProvider = new GeospatialAnchorProvider();
    this.nativeMappings = new Map();
  }

  /**
   * Initialize the complete geospatial stack
   */
  async initialize() {
    // 1. Initialize native AR session
    const capabilities = await initializeGeospatialAR();
    if (!capabilities) {
      throw new Error('Failed to initialize native AR');
    }

    // 2. Initialize platform system
    await this.platformSystem.init();

    // 3. Start position tracking
    await this.positionProvider.getCurrentPosition();

    // 4. Set coordinate origin
    const position = this.positionProvider.getLastPosition()!;
    this.coordinateBridge.calibrateOrigin(
      {
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude ?? 0,
        horizontalAccuracy: position.accuracy,
        verticalAccuracy: null,
        heading: null,
        source: position.source,
        capturedAt: position.timestamp,
      },
      0 // heading offset (get from compass if available)
    );

    // 5. Start position watching
    this.positionProvider.startWatching();

    return capabilities;
  }

  /**
   * Create anchor with both platform and native persistence
   */
  async createAnchor(
    coords: { latitude: number; longitude: number; altitude: number },
    metadata: { label?: string; createdBy: string; contentId?: string }
  ) {
    // 1. Create in platform system (IndexedDB)
    const platformAnchor = await this.platformSystem.createAnchor(
      coords,
      { x: 0, y: 0, z: 0, w: 1 }, // identity rotation
      metadata
    );

    // 2. Create native AR anchor
    try {
      const nativeAnchor = await GeospatialBridge.createGeospatialAnchor({
        coordinate: coords,
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        label: metadata.label,
      });

      // Store mapping
      this.nativeMappings.set(platformAnchor.id, nativeAnchor.anchorId);

    } catch (error) {
      console.warn('Native anchor creation failed (fallback to platform only):', error);
    }

    return platformAnchor;
  }

  /**
   * Query nearby anchors (uses platform system)
   */
  async queryNearby(radiusMeters: number, limit?: number) {
    const position = this.positionProvider.getLastPosition();
    if (!position) {
      throw new Error('Current position not available');
    }

    return this.platformSystem.queryNearby({
      center: {
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude ?? 0,
      },
      radiusMeters,
      limit,
    });
  }

  /**
   * Get local pose for rendering (uses coordinate bridge)
   */
  getLocalPose(anchorId: string) {
    // Get anchor from platform system
    const anchor = this.platformSystem.getAnchor(anchorId);
    if (!anchor) return null;

    // Convert to local ENU coordinates for rendering
    return this.coordinateBridge.localToGeospatial({
      x: anchor.coordinates.longitude,
      y: anchor.coordinates.altitude,
      z: anchor.coordinates.latitude,
    });
  }

  /**
   * Resolve native anchor (get current AR tracking pose)
   */
  async resolveNativeAnchor(platformAnchorId: string) {
    const nativeId = this.nativeMappings.get(platformAnchorId);
    if (!nativeId) {
      throw new Error('No native anchor for platform anchor');
    }

    return GeospatialBridge.resolveGeospatialAnchor({ anchorId: nativeId });
  }

  /**
   * Get capabilities (VPS, accuracy, platform)
   */
  async getCapabilities() {
    const nativeCaps = await GeospatialBridge.getCapabilities();
    const accuracyTier = this.positionProvider.getAccuracyTier();

    return {
      ...nativeCaps,
      accuracyTier,
      currentPosition: this.positionProvider.getLastPosition(),
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.positionProvider.dispose();
    await GeospatialBridge.stopARSession();
    this.nativeMappings.clear();
  }
}
```

### Usage in HoloLand App

```typescript
import { UnifiedGeospatialService } from './UnifiedGeospatialService';

// Initialize
const geo = new UnifiedGeospatialService();
await geo.initialize();

// Create anchor at current location
const anchor = await geo.createAnchor(
  { latitude: 37.7749, longitude: -122.4194, altitude: 10 },
  { label: 'Golden Gate Bridge', createdBy: 'user-123', contentId: '🌉' }
);

// Query nearby
const nearby = await geo.queryNearby(1000); // 1km radius

// Get capabilities
const caps = await geo.getCapabilities();
console.log('Platform:', caps.platform);
console.log('VPS:', caps.vpsAvailable);
console.log('Accuracy:', caps.horizontalAccuracy, 'm');
console.log('Tier:', caps.accuracyTier);
```

---

## Platform-Specific Integration

### iOS (ARKit)

**Native Implementation**: `packages/platform/mobile/ios/Plugin/GeospatialBridge.swift`

**Integration Steps**:

1. **Update Info.plist**: Add location and camera permissions
2. **Initialize AR session**: Call `GeospatialBridge.startARSession()`
3. **Create anchors**: Use `createGeospatialAnchor()` with GPS coords
4. **Track anchors**: ARKit automatically tracks in AR session
5. **Query pose**: Use `resolveGeospatialAnchor()` for current transform

**Code Example**:
```swift
// In Swift (native side)
let geoAnchor = ARGeoAnchor(
  coordinate: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
  altitude: 10.0
)
arSession.add(anchor: geoAnchor)
```

### Android (ARCore)

**Native Implementation**: `packages/platform/mobile/android/.../GeospatialBridge.kt`

**Integration Steps**:

1. **Update AndroidManifest.xml**: Add permissions and ARCore metadata
2. **Add API key**: Configure Google Cloud API key for VPS
3. **Initialize session**: Enable Geospatial Mode
4. **Wait for Earth tracking**: Check `earth.trackingState == TRACKING`
5. **Create anchors**: Use `earth.createAnchor()` with GPS coords

**Code Example**:
```kotlin
// In Kotlin (native side)
val earth = session.earth
val anchor = earth.createAnchor(
  37.7749, // latitude
  -122.4194, // longitude
  10.0, // altitude
  0f, 0f, 0f, 1f // rotation quaternion
)
```

### Web (Fallback)

**Implementation**: `packages/platform/mobile/src/native/web/GeospatialBridgeWeb.ts`

**Integration Steps**:

1. **Check geolocation support**: `'geolocation' in navigator`
2. **Request permission**: Via Geolocation API
3. **Watch position**: Use `watchPosition()` for updates
4. **Store anchors locally**: No native AR anchor support
5. **Manual tracking**: App must handle anchor visibility

**Limitations**:
- No native AR anchor persistence
- GPS-only (no VPS or AR tracking)
- Lower accuracy (3-15m typical)

---

## Migration Guide

### Migrating from Standalone GeospatialAnchorSystem

If you're already using `GeospatialAnchorSystem.ts`, here's how to add native bridge support:

**Before (Platform only)**:
```typescript
import { GeospatialAnchorSystem } from '@hololand/platform/spatial';

const system = new GeospatialAnchorSystem();
await system.init();

const anchor = await system.createAnchor(coords, rotation, metadata);
```

**After (Platform + Native)**:
```typescript
import { UnifiedGeospatialService } from './UnifiedGeospatialService';

const service = new UnifiedGeospatialService();
await service.initialize(); // Initializes both platform and native

const anchor = await service.createAnchor(coords, metadata);
// Now persisted in BOTH IndexedDB (platform) and ARKit/ARCore (native)
```

**Benefits**:
- ✅ Native AR tracking (smoother rendering)
- ✅ VPS support (Android only, <1m accuracy)
- ✅ Backward compatible (still works on web)
- ✅ Automatic fallback (if native fails, uses platform only)

---

## Testing Integration

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { UnifiedGeospatialService } from './UnifiedGeospatialService';

describe('UnifiedGeospatialService', () => {
  let service: UnifiedGeospatialService;

  beforeEach(() => {
    service = new UnifiedGeospatialService();
  });

  it('should initialize all components', async () => {
    const caps = await service.initialize();

    expect(caps.supported).toBe(true);
    expect(caps.platform).toMatch(/arkit|arcore|webxr/);
  });

  it('should create anchors with native backing', async () => {
    await service.initialize();

    const anchor = await service.createAnchor(
      { latitude: 37.7749, longitude: -122.4194, altitude: 10 },
      { label: 'Test', createdBy: 'test-user' }
    );

    expect(anchor.id).toBeDefined();
    expect(anchor.metadata.platform).toMatch(/arkit|arcore|webxr/);
  });

  it('should query nearby anchors', async () => {
    await service.initialize();

    // Create test anchor
    await service.createAnchor(
      { latitude: 37.7749, longitude: -122.4194, altitude: 10 },
      { label: 'Nearby', createdBy: 'test' }
    );

    // Query within 1km
    const nearby = await service.queryNearby(1000);

    expect(nearby.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests (Device)

```typescript
// Run on iOS/Android device with AR support

describe('Native AR Integration', () => {
  it('should create ARKit/ARCore anchor', async () => {
    const service = new UnifiedGeospatialService();
    const caps = await service.initialize();

    // Skip if not on native platform
    if (caps.platform === 'webxr') {
      console.log('Skipping native test on web');
      return;
    }

    const anchor = await service.createAnchor(
      { latitude: 37.7749, longitude: -122.4194, altitude: 10 },
      { label: 'AR Anchor', createdBy: 'test' }
    );

    // Verify native anchor was created
    const nativeAnchor = await service.resolveNativeAnchor(anchor.id);
    expect(nativeAnchor).toBeDefined();
    expect(nativeAnchor.platform).toBe(caps.platform);
  });

  it('should track VPS on Android', async () => {
    const service = new UnifiedGeospatialService();
    const caps = await service.initialize();

    if (caps.platform !== 'arcore') {
      console.log('Skipping VPS test (not Android)');
      return;
    }

    // Wait for VPS to activate (requires camera movement)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const updatedCaps = await service.getCapabilities();
    expect(updatedCaps.vpsAvailable).toBe(true);
    expect(updatedCaps.horizontalAccuracy).toBeLessThan(5); // <5m with VPS
  });
});
```

---

## Performance Considerations

### Anchor Limits

- **iOS (ARKit)**: ~100 active geo anchors per session
- **Android (ARCore)**: ~50 active anchors per session
- **Web**: No limit (stored in IndexedDB only)

**Recommendation**: Query only nearby anchors, remove distant anchors from AR session.

### Battery Impact

AR sessions consume significant battery. Best practices:

```typescript
// Pause AR when app backgrounds
document.addEventListener('visibilitychange', async () => {
  if (document.hidden) {
    await GeospatialBridge.stopARSession();
  } else {
    await GeospatialBridge.startARSession();
  }
});
```

### Network Usage

- **VPS (Android)**: Requires internet for cloud-based localization
- **Platform sync**: Implement backend API for multi-user anchor sharing
- **Optimization**: Cache VPS data, batch anchor uploads

---

## Security Best Practices

### API Key Protection (Android)

**Never commit API keys to Git**:

```gradle
// android/local.properties (gitignored)
arcore.api.key=YOUR_SECRET_KEY_HERE
```

**Reference in manifest**:
```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="${arcore.api.key}" />
```

### Location Privacy

- Request "When In Use" permission (not "Always")
- Explain why location is needed (in permission prompt)
- Allow users to opt out of sharing anchors
- Implement anchor privacy controls (public/private/shared)

---

## Future Enhancements

### Planned Features

1. **Cloud Anchor Sync** - Multi-user anchor sharing via backend API
2. **Offline Support** - Cache VPS data for offline AR
3. **Mesh Anchors** - Anchor to scanned 3D meshes (ARKit meshing)
4. **Semantic Anchors** - Anchor to detected objects (planes, faces, images)
5. **Cross-Platform Cloud Anchors** - Share anchors between iOS and Android

### ARKit/ARCore Roadmap

- **ARKit**: VPS support rumored for future iOS releases
- **ARCore**: Expanding VPS coverage to more cities globally
- **WebXR**: Geospatial API under development (still experimental)

---

## Related Files

**Created in this integration**:
- `packages/platform/mobile/src/native/GeospatialBridge.ts` - TypeScript API
- `packages/platform/mobile/src/native/web/GeospatialBridgeWeb.ts` - Web implementation
- `packages/platform/mobile/ios/Plugin/GeospatialBridge.swift` - iOS implementation
- `packages/platform/mobile/ios/Plugin/GeospatialBridge.m` - iOS plugin definition
- `packages/platform/mobile/android/.../GeospatialBridge.kt` - Android implementation
- `packages/platform/mobile/examples/geospatial-demo/` - Demo app
- `packages/platform/mobile/GEOSPATIAL_SETUP.md` - Setup guide

**Existing HoloLand files**:
- `packages/platform/spatial/GeospatialAnchorSystem.ts` - Platform anchor system
- `packages/platform/renderer/src/GeospatialAnchorBridge.ts` - Coordinate conversion
- `packages/platform/renderer/src/GeospatialAnchorProvider.ts` - GPS tracking
- `packages/platform/demos/geospatial-anchoring/` - Original demo

---

## License

Elastic License v2.0 (ELv2)
