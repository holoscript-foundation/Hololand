# Geospatial Anchoring Demo

**Live demonstration of persistent AR content anchored to real-world GPS locations.**

## What This Demo Shows

1. **Universal Spatial Reference** - WGS84 coordinates as the shared reference frame
2. **Coordinate Conversion** - Converting between GPS and local ENU (East-North-Up)
3. **Persistent Anchors** - AR content that persists across sessions via IndexedDB
4. **Multi-User Sharing** - Anchors visible to all users at the same GPS location
5. **Platform Detection** - ARCore, ARKit, and WebXR capability detection

## Running the Demo

### Option 1: Development Server

```bash
cd packages/platform/demos/geospatial-anchoring
npm install -g vite  # If not installed
vite
```

Navigate to `http://localhost:5173` on your mobile device.

### Option 2: Static Hosting

Build and serve the demo:

```bash
vite build
# Serve the dist/ folder with any static server
```

### Option 3: Mobile AR Testing

For full AR capabilities, test on:

- **Android** (ARCore): Chrome or Edge browser
- **iOS** (ARKit): Safari browser
- **HoloLens**: Edge browser

## Demo Features

### 1. Create Anchor

Tap **"Create Anchor Here"** to place a virtual statue at your current GPS location.

- Anchor is stored in IndexedDB
- Persists across browser sessions
- Can be shared with other users

### 2. Find Nearby

Tap **"Find Nearby"** to discover anchors within 1km radius.

- Shows distance to each anchor
- Sorted by proximity
- Updates in real-time as you move

### 3. View AR Content

When within 100m of an anchor:

- Virtual content appears in AR view
- Shows content emoji and distance
- Floats in 3D space at anchor location

## Architecture

### WGS84 Coordinate System

All anchors use **WGS84** (World Geodetic System 1984) as the universal reference:

```typescript
interface WGS84Coordinate {
  latitude: number;   // -90 to 90 degrees
  longitude: number;  // -180 to 180 degrees
  altitude: number;   // meters above ellipsoid
}
```

### Local ENU Conversion

For rendering and physics, coordinates are converted to **ENU** (East-North-Up):

```
X = East (meters)
Y = Up (meters)
Z = -North (meters)  // Note: negative for HoloLand convention
```

**Conversion formula:**

```typescript
const R = 6371000; // Earth radius
const dLat = lat - refLat;
const dLon = lon - refLon;

const east = R * dLon * cos(refLat);
const north = R * dLat;
const up = altitude - refAltitude;
```

### IndexedDB Storage

Anchors are stored locally with spatial indexing:

**Schema:**
```typescript
{
  id: string;
  coordinates: WGS84Coordinate;
  rotation: Quaternion;
  metadata: {
    label: string;
    createdBy: string;
    createdAt: number;
    platform: 'arcore' | 'arkit' | 'webxr';
  };
  sharedWith: string[];
}
```

**Indexes:**
- `latitude` - for lat/lon range queries
- `longitude` - for lat/lon range queries
- `latLon` - compound index for spatial queries
- `createdBy` - filter by creator
- `createdAt` - sort by time

### Spatial Query

Find anchors within radius:

```typescript
const anchors = await system.queryNearby({
  center: { lat, lon, alt },
  radiusMeters: 1000,
  limit: 20,
  accessibleBy: 'user-id'
});
```

Uses **Haversine formula** for distance calculation:

```typescript
distance = 2 * R * asin(sqrt(
  sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2)
))
```

### AR Platform Integration

**ARCore Geospatial API** (Android):
- GPS + VPS fusion for <5m accuracy
- Cloud-based anchor persistence
- Outdoor and indoor VPS coverage

**ARKit Location Anchors** (iOS):
- GPS-based anchoring (~10m accuracy)
- No VPS (yet) as of iOS 17
- Works best outdoors

**WebXR** (Browser):
- Basic geolocation only
- No native AR anchor support
- Fallback to manual alignment

## Multi-User Sharing Protocol

### Server API

**Create/Update Anchor:**
```http
POST /api/geospatial/anchors
Authorization: Bearer {token}

{
  "id": "geo_123",
  "coordinates": { "latitude": 37.7749, "longitude": -122.4194, "altitude": 10 },
  "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
  "metadata": { "label": "Golden Gate", "createdBy": "user-1" },
  "sharedWith": ["user-2", "user-3"]
}
```

**Query Nearby:**
```http
GET /api/geospatial/anchors?lat=37.7749&lon=-122.4194&radius=1000&limit=20
Authorization: Bearer {token}

Response: Array<GeospatialAnchor>
```

**Share Anchor:**
```http
POST /api/geospatial/anchors/{id}/share
Authorization: Bearer {token}

{
  "sharedWith": ["user-4", "user-5"]
}
```

### Synchronization

1. **Local-First** - Anchors created offline stored in IndexedDB
2. **Background Sync** - Push to server when connection available
3. **Conflict Resolution** - Last-write-wins by `updatedAt` timestamp
4. **Real-Time Updates** - WebSocket notifications for shared anchor changes

## Example Use Cases

### 1. Virtual Statue at Landmark

```typescript
const anchor = await system.createAnchor(
  { latitude: 48.8584, longitude: 2.2945, altitude: 100 }, // Eiffel Tower
  { x: 0, y: 0, z: 0, w: 1 },
  { label: 'Virtual Eiffel Tower', createdBy: 'user-1', contentId: '🗼' }
);
```

### 2. Treasure Hunt

```typescript
// Hide treasures at GPS locations
const treasures = [
  { lat: 37.7749, lon: -122.4194, contentId: '💎' },
  { lat: 37.7750, lon: -122.4195, contentId: '🏆' },
  { lat: 37.7751, lon: -122.4196, contentId: '👑' },
];

for (const treasure of treasures) {
  await system.createAnchor(treasure, rotation, {
    label: 'Hidden Treasure',
    createdBy: 'game-master',
    contentId: treasure.contentId,
  });
}
```

### 3. Historical AR Tour

```typescript
// Place historical markers at significant locations
const landmarks = [
  { lat: 51.5014, lon: -0.1419, label: 'Buckingham Palace', contentId: '👑' },
  { lat: 51.5007, lon: -0.1246, label: 'Big Ben', contentId: '🕰️' },
  { lat: 51.5081, lon: -0.0759, label: 'Tower of London', contentId: '🏰' },
];
```

## Testing Tips

### GPS Accuracy

- **Urban canyons** - Poor GPS, use VPS if available (ARCore)
- **Open sky** - Best GPS accuracy (5-10m)
- **Indoor** - GPS unavailable, need VPS or manual anchors

### Mobile Testing

1. Enable location permissions in browser
2. Use HTTPS (required for geolocation API)
3. Test on physical device, not emulator (GPS required)

### Debugging

Check browser console for:
- Platform capabilities detection
- GPS accuracy values
- Anchor creation/query logs
- IndexedDB operations

## Limitations & Future Work

### Current Limitations

1. **Flat Earth Approximation** - Accurate only for <10km radius
2. **No R-Tree Index** - Spatial queries use brute-force filtering
3. **Stub AR Integration** - Native ARCore/ARKit APIs not implemented
4. **No Real-Time Sync** - Server integration is placeholder

### Future Enhancements

1. **Geodetic Precision** - Full WGS84 ellipsoid calculations for global accuracy
2. **Spatial Indexing** - R-Tree or quadtree for efficient large-scale queries
3. **Native AR Bridges** - Flutter/React Native bridges to ARCore/ARKit
4. **VPS Integration** - Niantic Lightship or Google ARCore Cloud Anchors
5. **Mesh Anchors** - Anchor to scanned 3D meshes (ARKit meshing)
6. **SLAM Fusion** - Combine GPS + visual SLAM for indoor/outdoor transitions

## Related Documentation

- [GeospatialAnchorSystem.ts](../../spatial/GeospatialAnchorSystem.ts) - Core implementation
- [CoordinateTransform.ts](../../../ar/anchors/src/CoordinateTransform.ts) - Math utilities
- [GEOSPATIAL_ANCHORING.md](../../../docs/GEOSPATIAL_ANCHORING.md) - Full architecture

## License

MIT
