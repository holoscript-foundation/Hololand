# Geospatial AR Bridge - Setup Guide

**Native ARKit and ARCore bridges for persistent AR content at GPS locations.**

This guide covers setup, configuration, and deployment for iOS, Android, and web platforms.

---

## Table of Contents

1. [Overview](#overview)
2. [iOS Setup (ARKit)](#ios-setup-arkit)
3. [Android Setup (ARCore)](#android-setup-arcore)
4. [Web Setup (WebXR)](#web-setup-webxr)
5. [Demo App](#demo-app)
6. [Platform Permissions](#platform-permissions)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Features

- **iOS**: ARKit Location Anchors (~5-10m accuracy)
- **Android**: ARCore Geospatial API + VPS (~1-5m accuracy)
- **Web**: Browser Geolocation fallback (~3-15m accuracy)

### Architecture

```
JavaScript/TypeScript
       ↓
GeospatialBridge (Capacitor Plugin)
       ↓
┌──────┴──────┬──────────┬──────────┐
↓             ↓          ↓          ↓
ARKit       ARCore    WebXR     Manual
(iOS)      (Android)  (Browser) (Fallback)
```

### Coordinate System

- **Universal**: WGS84 (latitude, longitude, altitude)
- **Local**: ENU (East-North-Up) for rendering
- **Conversion**: Tangent plane approximation (<10km radius)

---

## iOS Setup (ARKit)

### Requirements

- **iOS**: 14.0+ (ARGeoTrackingConfiguration)
- **Device**: iPhone XS or newer (A12 Bionic+)
- **Permissions**: Location (When In Use), Camera
- **Hardware**: GPS + magnetometer + ARKit support

### 1. Install Dependencies

The Swift bridge is included in the mobile package. No additional dependencies needed.

### 2. Configure Info.plist

Add required permission descriptions to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>HoloLand needs your location to anchor AR content to real-world GPS coordinates.</string>

<key>NSCameraUsageDescription</key>
<string>HoloLand uses the camera for AR experiences.</string>

<key>UIRequiredDeviceCapabilities</key>
<array>
    <string>arkit</string>
    <string>gps</string>
    <string>magnetometer</string>
</array>
```

### 3. Build iOS Project

```bash
cd packages/platform/mobile
npm run build

# Sync with Capacitor
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 4. Xcode Configuration

1. **Target iOS 14.0+**: Project Settings → Deployment Target → 14.0
2. **Enable ARKit**: Capabilities → ARKit (should auto-enable)
3. **Code Signing**: Select your development team
4. **Run on Device**: ARKit requires a physical device (not simulator)

### 5. Test ARKit Capabilities

```typescript
import GeospatialBridge from '@hololand/mobile/native/GeospatialBridge';

const caps = await GeospatialBridge.getCapabilities();
console.log('ARKit supported:', caps.supported);
console.log('Platform:', caps.platform); // Should be 'arkit'
```

---

## Android Setup (ARCore)

### Requirements

- **Android**: 7.0+ (API 24+)
- **ARCore**: 1.30+ (Geospatial API)
- **Device**: ARCore-supported device ([list](https://developers.google.com/ar/devices))
- **Permissions**: Fine location, camera, internet (for VPS)

### 1. Install ARCore Dependency

Add ARCore SDK to `android/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    implementation 'com.google.ar:core:1.41.0'
}
```

### 2. Configure AndroidManifest.xml

Add permissions and ARCore metadata to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- ARCore requirement -->
    <uses-feature android:name="android.hardware.camera.ar" android:required="true" />
    <uses-feature android:glEsVersion="0x00030000" android:required="true" />

    <application>
        <!-- ARCore metadata -->
        <meta-data
            android:name="com.google.ar.core"
            android:value="required" />

        <!-- ... rest of application -->
    </application>
</manifest>
```

### 3. Enable Geospatial API in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **ARCore API**
4. Create API key (restrict to ARCore API)
5. Add API key to `android/local.properties`:

```properties
arcore.api.key=YOUR_API_KEY_HERE
```

6. Reference in `AndroidManifest.xml`:

```xml
<application>
    <meta-data
        android:name="com.google.android.geo.API_KEY"
        android:value="${arcore.api.key}" />
</application>
```

### 4. Build Android Project

```bash
cd packages/platform/mobile
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 5. Android Studio Configuration

1. **Min SDK**: 24 (Android 7.0)
2. **Target SDK**: 34 (latest)
3. **Enable VPS**: Internet permission + API key configured
4. **Run on Device**: ARCore requires a physical device

### 6. Test ARCore Capabilities

```typescript
const caps = await GeospatialBridge.getCapabilities();
console.log('ARCore supported:', caps.supported);
console.log('VPS available:', caps.vpsAvailable);
console.log('Platform:', caps.platform); // Should be 'arcore'
```

---

## Web Setup (WebXR)

### Requirements

- **Browser**: Chrome 79+, Safari 13+, Edge 79+
- **Protocol**: HTTPS (required for geolocation)
- **Permissions**: Geolocation

### 1. Build Web Assets

```bash
cd packages/platform/mobile
npm run build
```

The web implementation (`GeospatialBridgeWeb.ts`) is automatically loaded for browser environments.

### 2. HTTPS Configuration

Geolocation API requires HTTPS. Options:

**Development (localhost):**
```bash
# Vite with HTTPS
vite --https

# Or use ngrok for public URL
ngrok http 5173
```

**Production:**
- Deploy to HTTPS-enabled hosting (Vercel, Netlify, etc.)
- Ensure SSL certificate is valid

### 3. Test Web Capabilities

```typescript
const caps = await GeospatialBridge.getCapabilities();
console.log('Web geolocation:', caps.supported);
console.log('Platform:', caps.platform); // 'webxr' or 'none'
console.log('VPS:', caps.vpsAvailable); // Always false for web
```

---

## Demo App

### Run Demo Locally

```bash
cd packages/platform/mobile/examples/geospatial-demo

# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
# iOS: Safari on iPhone
# Android: Chrome on Android device
# Desktop: Chrome/Edge for WebXR fallback
```

### Demo Features

1. **Platform Detection**: Shows ARKit/ARCore/WebXR capabilities
2. **Position Tracking**: Real-time GPS coordinates
3. **Create Anchors**: Tap to create anchor at current location
4. **Nearby Query**: Find anchors within 1km radius
5. **Distance Display**: Shows distance to each anchor

### Demo URLs

- **Local**: `https://localhost:5173`
- **Mobile**: Use ngrok or deploy to get HTTPS URL
- **Production**: `https://demo.hololand.io/geospatial`

---

## Platform Permissions

### iOS Permissions

#### Location Permission

```swift
// Request in code
await GeospatialBridge.requestLocationPermission()

// User sees:
// "HoloLand needs your location to anchor AR content..."
// [Allow While Using App] [Don't Allow]
```

**Permission States:**
- `authorized`: Full access
- `denied`: User declined
- `notDetermined`: Not yet requested
- `restricted`: Device restriction (parental controls)

#### Camera Permission

Automatically requested when starting AR session.

**Troubleshooting:**
- If denied: Settings → HoloLand → Location/Camera → Enable

---

### Android Permissions

#### Runtime Permissions (Android 6.0+)

```kotlin
// Request in code
await GeospatialBridge.requestLocationPermission()

// User sees:
// "Allow HoloLand to access this device's location?"
// [While using the app] [Only this time] [Don't allow]
```

**Permission States:**
- `GRANTED`: Full access
- `DENIED`: User declined
- `DENIED_NEVER_ASK`: User selected "Don't ask again"

#### Background Location (if needed)

For background AR tracking, add:

```xml
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

**Troubleshooting:**
- If denied: Settings → Apps → HoloLand → Permissions → Location → Allow

---

### Web Permissions

#### Geolocation Permission

```javascript
// Request via Geolocation API
navigator.geolocation.getCurrentPosition(...)

// User sees:
// "HoloLand wants to know your location"
// [Block] [Allow]
```

**Permission States (Permissions API):**
```javascript
const result = await navigator.permissions.query({ name: 'geolocation' });
// result.state: 'granted' | 'denied' | 'prompt'
```

**Troubleshooting:**
- Chrome: Address bar → Lock icon → Site settings → Location → Allow
- Safari: Settings → Safari → Location → Ask / Allow
- Firefox: Address bar → Lock → Permissions → Location

---

## Testing

### Test Locations (GPS Coordinates)

Use these for testing (famous landmarks):

```typescript
const testLocations = {
  eiffelTower: { latitude: 48.8584, longitude: 2.2945, altitude: 100 },
  statueOfLiberty: { latitude: 40.6892, longitude: -74.0445, altitude: 93 },
  sydneyOperaHouse: { latitude: -33.8568, longitude: 151.2153, altitude: 5 },
  goldenGateBridge: { latitude: 37.8199, longitude: -122.4783, altitude: 67 },
  bigBen: { latitude: 51.5007, longitude: -0.1246, altitude: 96 },
};
```

### Testing Strategy

#### 1. Capability Testing

```typescript
// Check platform support
const caps = await GeospatialBridge.getCapabilities();
assert(caps.supported === true);
assert(caps.platform !== 'none');
```

#### 2. Permission Testing

```typescript
// Request permissions
const { granted } = await GeospatialBridge.requestLocationPermission();
assert(granted === true);
```

#### 3. Anchor Creation

```typescript
// Create test anchor
const anchor = await GeospatialBridge.createGeospatialAnchor({
  coordinate: testLocations.eiffelTower,
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  label: 'Test Anchor',
});

assert(anchor.anchorId !== null);
assert(anchor.platform === 'arkit' || anchor.platform === 'arcore');
```

#### 4. Accuracy Testing

```typescript
// Check tracking accuracy
const caps = await GeospatialBridge.getCapabilities();
if (caps.platform === 'arcore') {
  // ARCore with VPS should be <5m
  assert(caps.horizontalAccuracy < 5.0);
} else if (caps.platform === 'arkit') {
  // ARKit should be <10m
  assert(caps.horizontalAccuracy < 10.0);
}
```

### GPS Spoofing (Testing Only)

#### iOS Simulator

Xcode → Debug → Simulate Location → Choose location

#### Android Emulator

Settings → Developer Options → Select mock location app

**Warning**: Never spoof in production. Violates app store policies.

---

## Troubleshooting

### iOS Issues

#### "ARGeoTrackingConfiguration not supported"

**Cause**: Device too old or ARKit not available

**Fix**:
- Requires iPhone XS+ (A12 Bionic or newer)
- iOS 14.0+
- Run on physical device, not simulator

#### "Location permission denied"

**Fix**:
- Settings → HoloLand → Location → "While Using the App"
- Check `Info.plist` has `NSLocationWhenInUseUsageDescription`

#### Poor GPS accuracy

**Fix**:
- Move to open area (away from buildings)
- Enable WiFi (assists GPS)
- Wait 30-60 seconds for GPS lock

---

### Android Issues

#### "ARCore not installed"

**Fix**:
- Install from Play Store: [ARCore](https://play.google.com/store/apps/details?id=com.google.ar.core)
- Check device compatibility: [AR Devices](https://developers.google.com/ar/devices)

#### "Geospatial mode failed"

**Cause**: VPS unavailable or API key missing

**Fix**:
- Ensure internet connection (VPS requires cloud)
- Add Google Cloud API key to `AndroidManifest.xml`
- Enable ARCore API in Google Cloud Console

#### "Earth tracking PAUSED"

**Cause**: Insufficient visual features

**Fix**:
- Move camera around to scan environment
- Point at textured surfaces (not blank walls)
- Ensure good lighting

---

### Web Issues

#### "Geolocation not supported"

**Cause**: Browser too old or non-HTTPS

**Fix**:
- Use Chrome 79+, Safari 13+, or Edge 79+
- Ensure HTTPS protocol (`https://` not `http://`)
- Localhost works without HTTPS

#### "User denied geolocation"

**Fix**:
- Browser settings → Site settings → Location → Allow
- Clear browser cache and retry
- Check for VPN/firewall blocking geolocation

#### Poor accuracy (>50m)

**Cause**: Browser geolocation limitations

**Fix**:
- Web geolocation is GPS-only (no VPS)
- Expected accuracy: 3-15m outdoors, 50-100m indoors
- For better accuracy, use native ARKit/ARCore

---

## API Reference

### TypeScript

```typescript
import GeospatialBridge from '@hololand/mobile/native/GeospatialBridge';

// Initialize
const caps = await GeospatialBridge.initialize();

// Start session
await GeospatialBridge.startARSession();

// Create anchor
const anchor = await GeospatialBridge.createGeospatialAnchor({
  coordinate: { latitude: 37.7749, longitude: -122.4194, altitude: 10 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  label: 'My Anchor',
});

// Resolve anchor
const resolved = await GeospatialBridge.resolveGeospatialAnchor({
  anchorId: anchor.anchorId,
});

// Remove anchor
await GeospatialBridge.removeGeospatialAnchor({
  anchorId: anchor.anchorId,
});

// Stop session
await GeospatialBridge.stopARSession();
```

### Platform-Specific

**iOS (Swift):**
```swift
// ARKit Location Anchor
let geoAnchor = ARGeoAnchor(
    coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lon),
    altitude: altitude
)
arSession.add(anchor: geoAnchor)
```

**Android (Kotlin):**
```kotlin
// ARCore Geospatial Anchor
val anchor = earth.createAnchor(
    latitude, longitude, altitude,
    qx, qy, qz, qw
)
```

---

## Performance Tips

### Battery Optimization

- **Stop session when not in use**: `stopARSession()` when app backgrounds
- **Reduce polling frequency**: Don't query capabilities every frame
- **Limit anchor count**: Maximum 20-50 active anchors

### Accuracy Optimization

**iOS:**
- Wait for `trackingState == .normal`
- Use in open areas with clear sky view
- Enable WiFi for assisted GPS

**Android:**
- Wait for `earthState == .ENABLED`
- VPS requires internet connection
- Point camera at distinct features for VPS lock

**Web:**
- Request `enableHighAccuracy: true`
- Set `maximumAge: 0` for fresh position
- Outdoor works best (GPS-only)

---

## Next Steps

- **Integrate with HoloLand Platform**: Use with `GeospatialAnchorSystem.ts`
- **Backend Sync**: Implement multi-user anchor sharing
- **VPS Optimization**: Configure VPS coverage areas (ARCore only)
- **Testing**: Deploy demo app and test on physical devices

---

## Resources

- [ARKit Documentation](https://developer.apple.com/documentation/arkit/)
- [ARCore Geospatial API](https://developers.google.com/ar/develop/geospatial)
- [WebXR Device API](https://www.w3.org/TR/webxr/)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

## License

Elastic License v2.0 (ELv2)
