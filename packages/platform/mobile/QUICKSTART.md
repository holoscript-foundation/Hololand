# GeospatialBridge Quick Start

**Get started with geospatial AR in 5 minutes.**

---

## What You'll Build

A simple AR app that places a virtual marker at your current GPS location. The marker persists across sessions and appears in AR on iOS (ARKit) and Android (ARCore).

---

## Prerequisites

Choose your platform:

### iOS
- Mac with Xcode 14+
- iPhone XS or newer
- iOS 14.0+

### Android
- Android Studio
- ARCore-compatible device
- Android 7.0+

### Web (Testing)
- Modern browser (Chrome/Safari)
- HTTPS (or localhost)

---

## Step 1: Installation (2 minutes)

### Install HoloLand Mobile Package

```bash
npm install @hololand/mobile
```

### Setup iOS (if targeting iOS)

```bash
cd packages/platform/mobile
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Open `Info.plist`
2. Add location permission:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>We need your location to place AR content at GPS coordinates.</string>
   ```
3. Add camera permission:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>We need camera access for AR experiences.</string>
   ```

### Setup Android (if targeting Android)

```bash
cd packages/platform/mobile
npx cap sync android
npx cap open android
```

In `AndroidManifest.xml`:
1. Add permissions:
   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.INTERNET" />
   ```

2. Add ARCore metadata:
   ```xml
   <application>
       <meta-data android:name="com.google.ar.core" android:value="required" />
   </application>
   ```

3. In `build.gradle`, add ARCore dependency:
   ```gradle
   dependencies {
       implementation 'com.google.ar:core:1.41.0'
   }
   ```

---

## Step 2: Write Code (2 minutes)

### Create Your App

```typescript
import GeospatialBridge, {
  initializeGeospatialAR
} from '@hololand/mobile/native/GeospatialBridge';

async function createARMarker() {
  // 1. Initialize AR session
  const caps = await initializeGeospatialAR();

  if (!caps) {
    alert('Geospatial AR not supported on this device');
    return;
  }

  console.log('Platform:', caps.platform); // 'arkit' | 'arcore' | 'webxr'
  console.log('VPS Available:', caps.vpsAvailable); // true on Android in covered areas
  console.log('Accuracy:', caps.horizontalAccuracy, 'm');

  // 2. Get current GPS position
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });

  // 3. Create AR marker at current location
  const marker = await GeospatialBridge.createGeospatialAnchor({
    coordinate: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? 0,
    },
    rotation: { x: 0, y: 0, z: 0, w: 1 }, // No rotation
    label: 'My First AR Marker',
  });

  console.log('Marker created!', marker.anchorId);
  console.log('Platform:', marker.platform);
  console.log('Accuracy:', marker.horizontalAccuracy, 'm');

  // 4. (Optional) Resolve marker to get current tracking pose
  const resolved = await GeospatialBridge.resolveGeospatialAnchor({
    anchorId: marker.anchorId,
  });

  console.log('Marker tracked:', resolved);

  alert(`AR marker created at your location! (${marker.horizontalAccuracy.toFixed(1)}m accuracy)`);
}

// Run it!
createARMarker();
```

---

## Step 3: Test (1 minute)

### On iOS

1. **Connect iPhone** to Mac
2. **Build in Xcode**: Select your device → Run
3. **Grant Permissions**: Allow location and camera
4. **Go Outside**: GPS works best outdoors
5. **See Result**: AR marker created at your GPS location

**Expected Output**:
```
Platform: arkit
VPS Available: false
Accuracy: 8.2 m
Marker created! arkit_1_1710442234567
```

### On Android

1. **Connect Android device** via USB
2. **Build in Android Studio**: Run → Run 'app'
3. **Grant Permissions**: Allow location, camera, and internet
4. **Go Outside**: Wait for VPS to activate (if available)
5. **See Result**: AR marker with VPS precision

**Expected Output** (with VPS):
```
Platform: arcore
VPS Available: true
Accuracy: 2.1 m
Marker created! arcore_1_1710442234567
```

**Expected Output** (without VPS):
```
Platform: arcore
VPS Available: false
Accuracy: 9.5 m
Marker created! arcore_1_1710442234567
```

### On Web (Browser)

1. **Run dev server**: `npm run dev`
2. **Open in browser**: `https://localhost:5173`
3. **Grant Location Permission**: Allow in browser prompt
4. **See Result**: Virtual marker (no AR tracking)

**Expected Output**:
```
Platform: webxr
VPS Available: false
Accuracy: 12.3 m
Marker created! webxr_1_1710442234567
```

---

## Common Issues

### "Geolocation permission denied"

**Fix**: Go to Settings → App → Permissions → Location → Allow

### "AR session failed to start"

**iOS**: Ensure iPhone XS or newer
**Android**: Install ARCore from Play Store

### "VPS unavailable" (Android)

**Causes**:
- No internet connection
- Location not covered by VPS
- Insufficient visual features (point camera around)

**Fix**: Enable internet, move to open area, scan environment

### Poor GPS accuracy (>20m)

**Fix**:
- Move to open area (away from buildings)
- Enable WiFi (assists GPS)
- Wait 30-60 seconds for GPS lock

---

## Next Steps

### Add 3D Content

Render a 3D model at the marker location:

```typescript
import * as THREE from 'three';

// After creating marker...
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Convert GPS coords to local position (simplified)
const localX = (marker.coordinate.longitude - userLon) * 111320 * Math.cos(userLat * Math.PI / 180);
const localZ = -(marker.coordinate.latitude - userLat) * 110540;
const localY = marker.coordinate.altitude - userAlt;

// Add cube at marker location
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(localX, localY, localZ);
scene.add(cube);
```

### Query Nearby Markers

```typescript
import { haversineDistance } from '@hololand/mobile/native/GeospatialBridge';

// Find markers within 1km
const nearbyMarkers = allMarkers.filter(marker => {
  const distance = haversineDistance(currentPosition, marker.coordinate);
  return distance < 1000; // meters
});

console.log(`Found ${nearbyMarkers.length} markers nearby`);
```

### Integrate with HoloLand Platform

```typescript
import { GeospatialAnchorSystem } from '@hololand/platform/spatial';

// Dual persistence: IndexedDB + native AR
const platformSystem = new GeospatialAnchorSystem();
await platformSystem.init();

const platformAnchor = await platformSystem.createAnchor(
  coords,
  rotation,
  { label: 'My Marker', createdBy: 'user-123' }
);

const nativeAnchor = await GeospatialBridge.createGeospatialAnchor({
  coordinate: coords,
  rotation,
  label: platformAnchor.metadata.label,
});

// Store mapping for later
localStorage.setItem(platformAnchor.id, nativeAnchor.anchorId);
```

---

## Full Examples

### Run Complete Demo

```bash
cd packages/platform/mobile/examples/geospatial-demo
npm install
npm run dev  # Web
npm run ios  # iOS
npm run android  # Android
```

### See Production Integration

Check out `GEOSPATIAL_INTEGRATION.md` for the `UnifiedGeospatialService` that combines:
- GeospatialBridge (this work)
- GeospatialAnchorSystem (IndexedDB)
- GeospatialAnchorBridge (coordinate conversion)
- GeospatialAnchorProvider (GPS tracking)

---

## API Cheat Sheet

```typescript
// Initialize
const caps = await initializeGeospatialAR();

// Create anchor
const anchor = await GeospatialBridge.createGeospatialAnchor({
  coordinate: { latitude, longitude, altitude },
  rotation: { x, y, z, w },
  label: 'My Anchor',
});

// Resolve anchor
const tracked = await GeospatialBridge.resolveGeospatialAnchor({
  anchorId: anchor.anchorId,
});

// Remove anchor
await GeospatialBridge.removeGeospatialAnchor({
  anchorId: anchor.anchorId,
});

// Get capabilities
const caps = await GeospatialBridge.getCapabilities();

// Check VPS
const isVPS = await isVPSAvailable();

// Calculate distance
const meters = haversineDistance(coordA, coordB);

// Stop session
await GeospatialBridge.stopARSession();
```

---

## Documentation

- **Setup Guide**: `GEOSPATIAL_SETUP.md`
- **Integration Guide**: `GEOSPATIAL_INTEGRATION.md`
- **Summary**: `GEOSPATIAL_SUMMARY.md`
- **Demo README**: `examples/geospatial-demo/README.md`

---

## Support

- GitHub Issues: [HoloLand Platform](https://github.com/hololand/hololand/issues)
- ARKit Docs: [Apple Developer](https://developer.apple.com/documentation/arkit/)
- ARCore Docs: [Google Developers](https://developers.google.com/ar/develop/geospatial)

---

**You're ready to build persistent AR experiences!** 🚀
