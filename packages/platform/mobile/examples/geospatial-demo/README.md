# Geospatial AR Demo

**Cross-platform demonstration of persistent AR content at GPS locations.**

This demo works on iOS (ARKit), Android (ARCore), and web browsers (Geolocation API).

## Features

- ✅ ARKit Location Anchors (iOS 14+, ~5-10m accuracy)
- ✅ ARCore Geospatial API + VPS (Android 7.0+, ~1-5m accuracy)
- ✅ WebXR/Geolocation fallback (Browser, ~3-15m accuracy)
- ✅ Real-time GPS position tracking
- ✅ Create anchors at current location
- ✅ Query nearby anchors within radius
- ✅ Distance calculation (Haversine formula)
- ✅ Platform capability detection
- ✅ VPS availability check (Android)

## Quick Start

### 1. Run on Web (Development)

```bash
npm install
npm run dev
```

Open `https://localhost:5173` in your browser.

**Note**: HTTPS required for geolocation. Use localhost for development.

### 2. Run on iOS

```bash
# Prerequisites: Xcode, iOS 14+ device
npm run ios
```

This will:
1. Build TypeScript
2. Sync with Capacitor
3. Open Xcode project

Then:
- Select your development team
- Connect iPhone
- Run on device (Simulator doesn't support ARKit)

### 3. Run on Android

```bash
# Prerequisites: Android Studio, ARCore-compatible device
npm run android
```

This will:
1. Build TypeScript
2. Sync with Capacitor
3. Open Android Studio project

Then:
- Connect Android device
- Run app (Emulator doesn't support ARCore)

## Platform Setup

See [GEOSPATIAL_SETUP.md](../../GEOSPATIAL_SETUP.md) for detailed platform configuration.

### iOS Requirements

- iOS 14.0+
- iPhone XS or newer (A12 Bionic+)
- Location permission (When In Use)
- Camera permission

### Android Requirements

- Android 7.0+ (API 24+)
- ARCore-supported device
- Fine location permission
- Camera permission
- Internet (for VPS)
- Google Cloud API key (for VPS)

### Web Requirements

- HTTPS (or localhost)
- Modern browser (Chrome 79+, Safari 13+)
- Geolocation permission

## Testing

### Test GPS Locations

```typescript
// Famous landmarks for testing
const locations = {
  eiffelTower: { lat: 48.8584, lon: 2.2945, alt: 100 },
  statueOfLiberty: { lat: 40.6892, lon: -74.0445, alt: 93 },
  sydneyOperaHouse: { lat: -33.8568, lon: 151.2153, alt: 5 },
};
```

### Mobile Testing Workflow

1. **Build and sync**: `npm run ios` or `npm run android`
2. **Deploy to device**: Run from Xcode/Android Studio
3. **Grant permissions**: Allow location and camera
4. **Go outside**: GPS works best in open areas
5. **Create anchor**: Tap "Create Anchor Here"
6. **Walk around**: See distance update in real-time

### Web Testing Workflow

1. **Run dev server**: `npm run dev`
2. **Open in browser**: Chrome or Safari
3. **Allow location**: Grant geolocation permission
4. **Create anchor**: Test with current location
5. **Simulate movement**: Use browser DevTools location spoofing

## How It Works

### 1. Platform Detection

```typescript
const caps = await GeospatialBridge.getCapabilities();
// caps.platform: 'arkit' | 'arcore' | 'webxr' | 'none'
// caps.supported: boolean
// caps.vpsAvailable: boolean (ARCore only)
```

### 2. AR Session

```typescript
// Start AR session
await GeospatialBridge.startARSession();

// Session runs native AR frameworks:
// - iOS: ARSession with ARGeoTrackingConfiguration
// - Android: ARCore Session with GeospatialMode.ENABLED
// - Web: Geolocation watchPosition
```

### 3. Create Anchor

```typescript
const anchor = await GeospatialBridge.createGeospatialAnchor({
  coordinate: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 10,
  },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
  label: 'Golden Gate Bridge',
});

// Returns NativeGeospatialAnchor with platform-specific ID
```

### 4. Query & Distance

```typescript
// Calculate distance
import { haversineDistance } from '@hololand/mobile/native/GeospatialBridge';

const distanceMeters = haversineDistance(
  currentPosition,
  anchor.coordinate
);

// Show distance: "142m" or "1.5km"
```

## Architecture

```
┌─────────────────────────────────────┐
│   Demo App (TypeScript/HTML/CSS)   │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│     GeospatialBridge (Capacitor)    │
│  - createGeospatialAnchor()         │
│  - resolveGeospatialAnchor()        │
│  - getCapabilities()                │
└─────────────────┬───────────────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│  ARKit   │ │  ARCore  │ │  WebXR   │
│  (iOS)   │ │(Android) │ │  (Web)   │
│          │ │          │ │          │
│ Location │ │Geospatial│ │Geoloc.   │
│ Anchors  │ │ API+VPS  │ │ API      │
└──────────┘ └──────────┘ └──────────┘
```

## Accuracy Comparison

| Platform | Technology | Typical Accuracy | VPS Support |
|----------|------------|------------------|-------------|
| iOS      | ARKit Location Anchors | 5-10m | ❌ No |
| Android  | ARCore Geospatial + VPS | 1-5m | ✅ Yes |
| Web      | Browser Geolocation | 3-15m | ❌ No |

**VPS (Visual Positioning Service)**: Cloud-based visual localization that improves accuracy to <1m in covered areas (Android only).

## Known Limitations

### iOS
- No VPS (as of iOS 17)
- Requires iPhone XS+ (A12 Bionic or newer)
- Best accuracy outdoors with clear sky view

### Android
- VPS requires internet connection
- VPS coverage limited to major cities
- Requires ARCore-compatible device

### Web
- No native AR anchor support
- GPS-only (no VPS or AR tracking)
- Poor accuracy indoors (50-100m)
- Requires HTTPS for geolocation API

## Troubleshooting

### "Geolocation permission denied"

**Fix**: Settings → App → Permissions → Location → Allow

### "AR session failed to start"

**iOS**: Ensure iPhone XS+ and iOS 14+
**Android**: Install ARCore from Play Store

### "VPS unavailable" (Android)

**Causes**:
- No internet connection (VPS requires cloud)
- Missing Google Cloud API key
- Location not covered by VPS

**Fix**:
1. Enable internet
2. Add API key to `AndroidManifest.xml`
3. Check VPS coverage: [ARCore VPS Coverage](https://developers.google.com/ar/data/geospatial-coverage)

### Poor GPS accuracy

**Fix**:
- Move to open area (away from tall buildings)
- Enable WiFi (assists GPS)
- Wait 30-60 seconds for GPS lock
- Ensure device has clear sky view

## Code Structure

```
examples/geospatial-demo/
├── index.html          # UI and styles
├── demo.ts             # Main application logic
├── package.json        # Dependencies
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Next Steps

- **Multi-User Sharing**: Implement backend API for anchor synchronization
- **Persistent Storage**: Save anchors to IndexedDB or backend
- **AR Content**: Add 3D models at anchor locations
- **Spatial Query**: Filter anchors by distance/region
- **Cloud Anchors**: Integrate ARCore Cloud Anchors (Android)

## Related Documentation

- [Setup Guide](../../GEOSPATIAL_SETUP.md) - Platform configuration
- [GeospatialBridge.ts](../../src/native/GeospatialBridge.ts) - TypeScript API
- [ARKit Bridge](../../ios/Plugin/GeospatialBridge.swift) - iOS implementation
- [ARCore Bridge](../../android/src/main/java/io/hololand/mobile/GeospatialBridge.kt) - Android implementation

## License

Elastic License v2.0 (ELv2)
