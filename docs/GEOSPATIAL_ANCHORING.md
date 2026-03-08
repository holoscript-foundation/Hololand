# Geospatial Anchoring Architecture

**Universal cross-ecosystem spatial continuity using WGS84 coordinates.**

---

## Executive Summary

HoloLand's **Geospatial Anchor System** provides persistent AR content tied to real-world GPS locations with multi-user sharing capabilities. It solves the fundamental problem of spatial continuity across devices, platforms, and sessions by using **WGS84** (World Geodetic System 1984) as the universal reference frame.

**Key Features:**
- 🌍 WGS84 coordinates as universal spatial anchor
- 🔄 Bidirectional conversion to local ENU (East-North-Up)
- 💾 IndexedDB persistence with spatial indexing
- 📱 ARCore Geospatial API + ARKit Location Anchors integration
- 👥 Multi-user anchor sharing protocol
- 🔍 Efficient radius-based spatial queries

---

## Problem Statement

### Challenge: Cross-Ecosystem Spatial Continuity

**The Fundamental Problem:**

Different AR platforms use incompatible coordinate systems:
- **ARCore** - Camera-origin local coordinates, resets on session restart
- **ARKit** - Device-origin local coordinates, world tracking
- **WebXR** - Session-local coordinates, no persistence
- **HoloLens** - Spatial anchors, Windows Mixed Reality

**Why This Matters:**

1. **No Universal Reference** - A virtual statue placed at (1, 2, 3) in ARCore means nothing to ARKit
2. **No Persistence** - AR sessions restart with new coordinate systems
3. **No Multi-User** - Two devices can't share the same world coordinates
4. **No Cross-Platform** - Android and iOS users can't see the same anchors

### Solution: WGS84 as Universal Anchor

**Insight from Research (W.025-W.035):**

> "Geospatial coordinates = only universal anchor that works across all platforms, ecosystems, and reality layers." - Cross-Reality Agent Continuity Research

**WGS84 provides:**
- ✅ Global reference frame (Earth itself)
- ✅ Platform-independent (GPS works everywhere)
- ✅ Persistent (coordinates don't change)
- ✅ Shareable (everyone uses same lat/lon/alt)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Geospatial Anchor System                   │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      WGS84 Coordinate System (Universal)            │   │
│  │  (latitude, longitude, altitude)                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   Coordinate Converter (WGS84 ↔ ENU)               │   │
│  │  - haversineDistance()                              │   │
│  │  - wgs84ToENU()                                     │   │
│  │  - enuToWGS84()                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↕                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  IndexedDB   │  │  AR Platform │  │ Sharing        │   │
│  │  Persistence │  │  Integration │  │ Protocol       │   │
│  │              │  │              │  │                │   │
│  │  - store()   │  │  - ARCore    │  │  - publish()   │   │
│  │  - query()   │  │  - ARKit     │  │  - fetch()     │   │
│  │  - indexes   │  │  - WebXR     │  │  - shareWith() │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Creates Anchor
        ↓
1. Get GPS Location (lat, lon, alt)
        ↓
2. Create GeospatialAnchor (WGS84 + metadata)
        ↓
3. Store in IndexedDB (local persistence)
        ↓
4. Publish to Server (multi-user sharing)
        ↓
5. Other users fetch nearby anchors
        ↓
6. Convert WGS84 → ENU for rendering
        ↓
7. Display AR content at local position
```

---

## WGS84 Coordinate System

### What is WGS84?

**WGS84** (World Geodetic System 1984) is the standard coordinate system used by GPS satellites and global mapping systems.

**Representation:**

```typescript
interface WGS84Coordinate {
  latitude: number;   // Degrees (-90 to 90)
  longitude: number;  // Degrees (-180 to 180)
  altitude: number;   // Meters above WGS84 ellipsoid
}
```

**Example:**

```typescript
const eiffelTower: WGS84Coordinate = {
  latitude: 48.8584,
  longitude: 2.2945,
  altitude: 100, // Top of tower
};
```

### Why WGS84?

| Requirement | WGS84 | Local AR Coords |
|-------------|-------|-----------------|
| **Global** | ✅ Works worldwide | ❌ Session-local only |
| **Persistent** | ✅ Never changes | ❌ Resets per session |
| **Shareable** | ✅ Same for all users | ❌ Device-specific |
| **Cross-Platform** | ✅ Works on all devices | ❌ Platform-specific |
| **Accuracy** | ±5-10m outdoor | ±1cm indoor |

**Trade-off:** WGS84 has lower accuracy (meters) vs. local AR tracking (centimeters), but gains universality.

---

## Coordinate Conversion (WGS84 ↔ ENU)

### Local ENU Coordinate System

**ENU** (East-North-Up) is a local Cartesian coordinate system centered at a reference point:

```
X = East (meters)
Y = Up (meters)
Z = North (meters)
```

**HoloLand Convention:**

```typescript
// Note: Z is negated for right-handed Y-up convention
{
  x: east,   // Positive = East
  y: up,     // Positive = Up
  z: -north  // Positive = South (negative North)
}
```

### Conversion Algorithms

#### WGS84 → ENU (Flat-Earth Approximation)

**Valid for:** Local areas <10km radius
**Accuracy:** <1% error for distances <5km

```typescript
function wgs84ToENU(coords: WGS84Coordinate, origin: WGS84Coordinate): Vector3 {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => deg * Math.PI / 180;

  const lat = toRad(coords.latitude);
  const lon = toRad(coords.longitude);
  const refLat = toRad(origin.latitude);
  const refLon = toRad(origin.longitude);

  const dLat = lat - refLat;
  const dLon = lon - refLon;

  const cosRefLat = Math.cos(refLat);

  const east = R * dLon * cosRefLat;
  const north = R * dLat;
  const up = coords.altitude - origin.altitude;

  return { x: east, y: up, z: -north }; // HoloLand convention
}
```

**Example:**

```typescript
const origin = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
const point = { latitude: 37.7750, longitude: -122.4193, altitude: 10 };

const enuPosition = wgs84ToENU(point, origin);
// Result: { x: ~11m, y: 10m, z: ~-11m }
```

#### ENU → WGS84 (Inverse)

```typescript
function enuToWGS84(enuPosition: Vector3, origin: WGS84Coordinate): WGS84Coordinate {
  const R = 6371000;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  const toRad = (deg: number) => deg * Math.PI / 180;

  const refLat = toRad(origin.latitude);
  const cosRefLat = Math.cos(refLat);

  const east = enuPosition.x;
  const up = enuPosition.y;
  const north = -enuPosition.z; // HoloLand convention

  const dLon = east / (R * cosRefLat);
  const dLat = north / R;

  return {
    latitude: origin.latitude + toDeg(dLat),
    longitude: origin.longitude + toDeg(dLon),
    altitude: origin.altitude + up,
  };
}
```

### Haversine Distance

**Calculate distance between two WGS84 points:**

```typescript
function haversineDistance(a: WGS84Coordinate, b: WGS84Coordinate): number {
  const R = 6371000; // Earth radius
  const toRad = (deg: number) => deg * Math.PI / 180;

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(h));

  return R * c; // Distance in meters
}
```

**Accuracy:** Exact for sphere, ~0.5% error for Earth's ellipsoid

---

## IndexedDB Persistence

### Schema Design

**Object Store: `anchors`**

```typescript
interface GeospatialAnchor {
  id: string;                    // Primary key: "geo_timestamp_random"
  coordinates: WGS84Coordinate;  // GPS location
  rotation: Quaternion;          // Orientation
  metadata: {
    label?: string;              // User-defined name
    createdBy: string;           // Creator user ID
    createdAt: number;           // Creation timestamp
    updatedAt: number;           // Last update
    platform: 'arcore' | 'arkit' | 'webxr' | 'hololens';
    horizontalAccuracy?: number; // GPS accuracy (meters)
    verticalAccuracy?: number;
  };
  sharedWith: string[];          // User IDs with access
  contentId?: string;            // Reference to AR content
}
```

### Spatial Indexes

**Performance-critical indexes for geospatial queries:**

```typescript
// 1. Latitude index (for lat/lon range queries)
store.createIndex('latitude', 'coordinates.latitude', { unique: false });

// 2. Longitude index
store.createIndex('longitude', 'coordinates.longitude', { unique: false });

// 3. Compound lat/lon index (best for spatial queries)
store.createIndex('latLon',
  ['coordinates.latitude', 'coordinates.longitude'],
  { unique: false }
);

// 4. Creator index (filter by user)
store.createIndex('createdBy', 'metadata.createdBy', { unique: false });

// 5. Timestamp index (sort by time)
store.createIndex('createdAt', 'metadata.createdAt', { unique: false });
```

### Spatial Query Implementation

**Current: Brute-Force Filter**

```typescript
async queryRadius(query: SpatialQuery): Promise<GeospatialAnchor[]> {
  // 1. Fetch all anchors (or use lat/lon index for rough filter)
  const allAnchors = await this.getAll();

  // 2. Filter by Haversine distance
  const results = allAnchors.filter(anchor => {
    const distance = haversineDistance(query.center, anchor.coordinates);
    return distance <= query.radiusMeters;
  });

  // 3. Sort by distance
  results.sort((a, b) => {
    const distA = haversineDistance(query.center, a.coordinates);
    const distB = haversineDistance(query.center, b.coordinates);
    return distA - distB;
  });

  // 4. Apply limit
  return query.limit ? results.slice(0, query.limit) : results;
}
```

**Performance:**
- **Time Complexity:** O(n) - checks every anchor
- **Acceptable For:** <10,000 anchors
- **Optimization Needed:** R-Tree or quadtree for >10,000 anchors

**Future: R-Tree Spatial Index**

```typescript
// Pseudo-code for R-Tree optimization
const rtree = new RTree();

// Insert anchors into R-Tree
for (const anchor of anchors) {
  rtree.insert({
    minX: anchor.coordinates.longitude - epsilon,
    minY: anchor.coordinates.latitude - epsilon,
    maxX: anchor.coordinates.longitude + epsilon,
    maxY: anchor.coordinates.latitude + epsilon,
    data: anchor,
  });
}

// Query with bounding box
const results = rtree.search({
  minX: center.longitude - radiusDegrees,
  minY: center.latitude - radiusDegrees,
  maxX: center.longitude + radiusDegrees,
  maxY: center.latitude + radiusDegrees,
});
```

**Performance:**
- **Time Complexity:** O(log n) - tree traversal
- **Scalable:** Handles millions of anchors

---

## AR Platform Integration

### Platform Capabilities Detection

```typescript
interface PlatformCapabilities {
  platform: 'arcore' | 'arkit' | 'webxr' | 'hololens' | 'unknown';
  supportsGeospatial: boolean;
  supportsVPS: boolean;
  horizontalAccuracy?: number; // meters
  verticalAccuracy?: number;   // meters
}
```

### Platform-Specific APIs

#### ARCore Geospatial API (Android)

**Best-in-class accuracy:** ~5m horizontal, ~3m vertical

```typescript
// ARCore Geospatial API (conceptual - requires native bridge)
async createARCoreAnchor(coords: WGS84Coordinate, rotation: Quaternion) {
  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['hit-test', 'dom-overlay'],
    optionalFeatures: ['geospatial-tracking']
  });

  const geospatialAPI = session.getFeature('geospatial-tracking');

  const anchor = await geospatialAPI.createAnchor({
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude,
    quaternion: [rotation.x, rotation.y, rotation.z, rotation.w],
  });

  return anchor.id;
}
```

**Key Features:**
- GPS + VPS fusion for outdoor accuracy
- Cloud Anchors for persistence
- Google Maps coverage data
- Works in 87 countries (as of 2024)

#### ARKit Location Anchors (iOS)

**Good accuracy:** ~10m horizontal, ~5m vertical

```typescript
// ARKit Location Anchors (conceptual - requires native bridge)
async createARKitAnchor(coords: WGS84Coordinate, rotation: Quaternion) {
  const anchor = await window.webkit.messageHandlers.arkit.postMessage({
    action: 'createLocationAnchor',
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude,
    rotation: rotation,
  });

  return anchor.id;
}
```

**Key Features:**
- GPS-based only (no VPS yet)
- Altitude uses barometer + GPS
- Best for outdoor experiences
- iOS 14+ required

#### WebXR (Browser)

**Fallback only:** GPS only, no AR integration

```typescript
// WebXR - manual alignment required
async createWebXRAnchor(coords: WGS84Coordinate) {
  // Get user GPS position
  const userPosition = await getCurrentPosition();

  // Convert anchor coords to local ENU
  const localPosition = wgs84ToENU(coords, userPosition);

  // Create XR anchor at local position
  const session = await navigator.xr.requestSession('immersive-ar');
  const space = await session.requestReferenceSpace('local');

  const anchorPose = new XRRigidTransform(
    { x: localPosition.x, y: localPosition.y, z: localPosition.z }
  );

  const anchor = await session.createAnchor(anchorPose, space);
  return anchor;
}
```

**Limitations:**
- No native geospatial anchor support
- Manual GPS → local coordinate conversion
- Accuracy depends on GPS only (~10-20m)

### Platform Integration Flow

```
1. Detect Platform
   ↓
2. Check Geospatial Support
   ↓
   ├─ ARCore → Use Geospatial API (best)
   ├─ ARKit → Use Location Anchors (good)
   ├─ WebXR → Manual conversion (fallback)
   └─ Unknown → GPS-only mode
   ↓
3. Create Anchor
   ↓
4. Store WGS84 coords in IndexedDB
   ↓
5. Share via server API
```

---

## Multi-User Sharing Protocol

### Server API Specification

**Base URL:** `https://central.hololand.io/api/geospatial`

#### Create/Update Anchor

```http
POST /anchors
Authorization: Bearer {authToken}
Content-Type: application/json

{
  "id": "geo_1234567890_abc123",
  "coordinates": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude": 10
  },
  "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
  "metadata": {
    "label": "Golden Gate Vista",
    "createdBy": "user-123",
    "createdAt": 1678901234000,
    "updatedAt": 1678901234000,
    "platform": "arcore",
    "horizontalAccuracy": 5,
    "verticalAccuracy": 3
  },
  "sharedWith": ["user-456", "user-789"],
  "contentId": "statue-model-001"
}
```

**Response:** `201 Created`

```json
{
  "id": "geo_1234567890_abc123",
  "status": "published",
  "url": "https://central.hololand.io/anchors/geo_1234567890_abc123"
}
```

#### Query Nearby Anchors

```http
GET /anchors?lat=37.7749&lon=-122.4194&radius=1000&limit=20
Authorization: Bearer {authToken}
```

**Query Parameters:**
- `lat` - Center latitude
- `lon` - Center longitude
- `radius` - Search radius in meters
- `limit` - Maximum results (default: 20)
- `createdBy` - Filter by creator user ID (optional)

**Response:** `200 OK`

```json
[
  {
    "id": "geo_1234567890_abc123",
    "coordinates": { "latitude": 37.7750, "longitude": -122.4193, "altitude": 10 },
    "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
    "metadata": { "label": "Golden Gate Vista", ... },
    "sharedWith": ["user-456"],
    "contentId": "statue-model-001",
    "distance": 15.2
  },
  ...
]
```

#### Share Anchor

```http
POST /anchors/{anchorId}/share
Authorization: Bearer {authToken}
Content-Type: application/json

{
  "sharedWith": ["user-999", "user-888"]
}
```

**Response:** `200 OK`

```json
{
  "id": "geo_1234567890_abc123",
  "sharedWith": ["user-456", "user-789", "user-999", "user-888"]
}
```

#### Delete Anchor

```http
DELETE /anchors/{anchorId}
Authorization: Bearer {authToken}
```

**Response:** `204 No Content`

### Synchronization Strategy

**Local-First Architecture:**

```
┌─────────────────┐
│  Local Device   │
│  (IndexedDB)    │
└────────┬────────┘
         │
         ├─ Create anchor → Store locally (instant)
         │
         ├─ Background sync → Publish to server
         │                    (when connection available)
         │
         ├─ Fetch nearby → Query server
         │                 Store results locally
         │
         └─ Render → Use local data (offline-capable)
```

**Conflict Resolution:**

```typescript
// Last-write-wins based on updatedAt timestamp
function resolveConflict(local: GeospatialAnchor, remote: GeospatialAnchor) {
  if (remote.metadata.updatedAt > local.metadata.updatedAt) {
    return remote; // Remote is newer
  }
  return local; // Local is newer
}
```

**Real-Time Updates:**

```typescript
// WebSocket subscription for shared anchor updates
const ws = new WebSocket('wss://central.hololand.io/ws');

ws.send(JSON.stringify({
  action: 'subscribe',
  anchorIds: ['geo_123', 'geo_456'],
}));

ws.onmessage = (event) => {
  const { action, anchor } = JSON.parse(event.data);

  if (action === 'anchor_updated') {
    // Update local copy
    await storage.store(anchor);
    // Re-render AR content
    renderAnchor(anchor);
  }
};
```

---

## API Reference

### GeospatialAnchorSystem

**Main entry point for geospatial anchoring.**

```typescript
class GeospatialAnchorSystem {
  constructor(serverUrl?: string);

  // Initialize system
  async init(origin?: WGS84Coordinate): Promise<PlatformCapabilities>;

  // Create anchor at GPS location
  async createAnchor(
    coordinates: WGS84Coordinate,
    rotation: Quaternion,
    metadata: { label?: string; createdBy: string; contentId?: string }
  ): Promise<GeospatialAnchor>;

  // Get anchor by ID
  async getAnchor(id: string): Promise<GeospatialAnchor | null>;

  // Query nearby anchors
  async queryNearby(query: SpatialQuery): Promise<GeospatialAnchor[]>;

  // Convert anchor to local rendering coordinates
  anchorToLocalPose(anchor: GeospatialAnchor): Pose;

  // Multi-user sharing
  async publishAnchor(anchorId: string, authToken: string): Promise<void>;
  async fetchSharedAnchors(query: SpatialQuery, authToken: string): Promise<GeospatialAnchor[]>;
  async shareAnchor(anchorId: string, userIds: string[], authToken: string): Promise<void>;

  // Delete anchor
  async deleteAnchor(anchorId: string, authToken?: string): Promise<void>;

  // Utilities
  getConverter(): GeospatialCoordinateConverter;
  getCapabilities(): PlatformCapabilities | null;
  async clearLocalAnchors(): Promise<void>;
}
```

### GeospatialCoordinateConverter

**Coordinate conversion utilities.**

```typescript
class GeospatialCoordinateConverter {
  // Set local origin for ENU coordinate system
  setOrigin(origin: WGS84Coordinate): void;
  getOrigin(): WGS84Coordinate | null;

  // Convert between WGS84 and ENU
  wgs84ToENU(coords: WGS84Coordinate): Vector3;
  enuToWGS84(enuPosition: Vector3): WGS84Coordinate;

  // Distance and bearing calculations
  haversineDistance(a: WGS84Coordinate, b: WGS84Coordinate): number;
  calculateBearing(from: WGS84Coordinate, to: WGS84Coordinate): number;
}
```

### GeospatialAnchorStorage

**IndexedDB persistence layer.**

```typescript
class GeospatialAnchorStorage {
  async init(): Promise<void>;

  // CRUD operations
  async store(anchor: GeospatialAnchor): Promise<void>;
  async get(id: string): Promise<GeospatialAnchor | null>;
  async delete(id: string): Promise<void>;

  // Spatial queries
  async queryRadius(query: SpatialQuery): Promise<GeospatialAnchor[]>;
  async getAll(): Promise<GeospatialAnchor[]>;
  async clear(): Promise<void>;
}
```

---

## Usage Examples

### Basic Anchor Creation

```typescript
import { GeospatialAnchorSystem } from '@hololand/platform/spatial';

// Initialize system
const system = new GeospatialAnchorSystem();
const capabilities = await system.init();

console.log('Platform:', capabilities.platform);
console.log('Geospatial support:', capabilities.supportsGeospatial);

// Create anchor at current GPS location
const currentPosition = await getCurrentGPSPosition();

const anchor = await system.createAnchor(
  currentPosition,
  { x: 0, y: 0, z: 0, w: 1 }, // Identity rotation
  {
    label: 'My First Anchor',
    createdBy: 'user-123',
    contentId: 'virtual-statue-001',
  }
);

console.log('Anchor created:', anchor.id);
```

### Query Nearby Anchors

```typescript
// Find all anchors within 500m
const nearby = await system.queryNearby({
  center: currentPosition,
  radiusMeters: 500,
  limit: 10,
});

console.log(`Found ${nearby.length} anchors nearby`);

for (const anchor of nearby) {
  const distance = system.getConverter().haversineDistance(
    currentPosition,
    anchor.coordinates
  );

  console.log(`${anchor.metadata.label}: ${distance.toFixed(0)}m away`);
}
```

### Render AR Content

```typescript
// Convert anchor to local rendering coordinates
const localPose = system.anchorToLocalPose(anchor);

// Render 3D model at local position
renderModel({
  modelId: anchor.contentId,
  position: localPose.position,
  rotation: localPose.rotation,
});
```

### Multi-User Sharing

```typescript
// Publish anchor for others to see
await system.publishAnchor(anchor.id, authToken);

// Share with specific users
await system.shareAnchor(anchor.id, ['user-456', 'user-789'], authToken);

// Fetch shared anchors from server
const sharedAnchors = await system.fetchSharedAnchors(
  {
    center: currentPosition,
    radiusMeters: 1000,
    accessibleBy: 'user-123', // Only anchors I can access
  },
  authToken
);
```

---

## Performance Considerations

### Spatial Query Optimization

| Anchors | Strategy | Query Time |
|---------|----------|------------|
| <1,000 | Brute-force filter | <10ms |
| 1,000-10,000 | IndexedDB indexes | <50ms |
| 10,000-100,000 | R-Tree | <100ms |
| >100,000 | Server-side spatial DB | <200ms |

**Recommendation:** For >10,000 anchors, implement R-Tree or move spatial queries to server.

### Network Optimization

**Strategies:**
1. **Local-first** - Always use IndexedDB cache first
2. **Background sync** - Fetch updates in background
3. **Incremental sync** - Only fetch anchors modified since last sync
4. **Viewport culling** - Only fetch anchors in visible radius

**Example:**

```typescript
// Incremental sync
const lastSyncTime = localStorage.getItem('lastSyncTime');

const updates = await fetch(`/api/geospatial/anchors/updates?since=${lastSyncTime}`);

for (const anchor of updates) {
  await storage.store(anchor); // Update local cache
}

localStorage.setItem('lastSyncTime', Date.now().toString());
```

### Memory Management

**IndexedDB limits:**
- **Firefox** - 10% of disk space (typically 5-10 GB)
- **Chrome** - ~60% of disk space (typically 50-100 GB)
- **Safari** - ~1 GB

**Best practices:**
1. Limit local anchors to active radius (e.g., 10km)
2. Implement LRU cache eviction for old anchors
3. Compress anchor metadata (e.g., remove redundant fields)

---

## Security Considerations

### Access Control

**Server-side validation:**

```typescript
// Validate anchor ownership before allowing updates
async function updateAnchor(anchorId: string, userId: string, updates: Partial<GeospatialAnchor>) {
  const anchor = await db.anchors.findById(anchorId);

  if (anchor.metadata.createdBy !== userId && !anchor.sharedWith.includes(userId)) {
    throw new ForbiddenError('Not authorized to modify this anchor');
  }

  await db.anchors.update(anchorId, updates);
}
```

### Privacy

**User location protection:**

1. **Fuzzy precision** - Round coordinates to reduce precision (e.g., 5 decimal places = ~1m)
2. **Opt-in sharing** - Anchors default to private
3. **Temporary anchors** - Auto-delete after expiration time

```typescript
// Create temporary anchor that expires after 24 hours
const anchor = await system.createAnchor(coords, rotation, {
  label: 'Temporary Marker',
  createdBy: userId,
  expiresAt: Date.now() + 24 * 60 * 60 * 1000,
});
```

### Content Validation

**Prevent malicious content:**

```typescript
// Server-side content validation
function validateAnchor(anchor: GeospatialAnchor) {
  // 1. Check coordinate bounds
  if (Math.abs(anchor.coordinates.latitude) > 90) {
    throw new Error('Invalid latitude');
  }

  // 2. Rate limit per user
  const recentAnchors = await db.anchors.countSince(
    anchor.metadata.createdBy,
    Date.now() - 60000
  );

  if (recentAnchors > 10) {
    throw new Error('Rate limit exceeded');
  }

  // 3. Validate content reference
  if (anchor.contentId && !await contentExists(anchor.contentId)) {
    throw new Error('Invalid content ID');
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('GeospatialCoordinateConverter', () => {
  it('converts WGS84 to ENU correctly', () => {
    const converter = new GeospatialCoordinateConverter();

    const origin = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
    converter.setOrigin(origin);

    const point = { latitude: 37.7750, longitude: -122.4193, altitude: 10 };
    const enu = converter.wgs84ToENU(point);

    expect(enu.x).toBeCloseTo(11.1, 0.1); // ~11m east
    expect(enu.y).toBe(10); // 10m up
    expect(enu.z).toBeCloseTo(-11.1, 0.1); // ~11m north (negative Z)
  });

  it('calculates Haversine distance correctly', () => {
    const converter = new GeospatialCoordinateConverter();

    const sanFrancisco = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };
    const losAngeles = { latitude: 34.0522, longitude: -118.2437, altitude: 0 };

    const distance = converter.haversineDistance(sanFrancisco, losAngeles);

    expect(distance).toBeCloseTo(559000, 1000); // ~559km
  });
});
```

### Integration Tests

```typescript
describe('GeospatialAnchorSystem', () => {
  it('creates and retrieves anchors', async () => {
    const system = new GeospatialAnchorSystem();
    await system.init();

    const coords = { latitude: 37.7749, longitude: -122.4194, altitude: 10 };
    const anchor = await system.createAnchor(coords, identityQuaternion, {
      label: 'Test Anchor',
      createdBy: 'test-user',
    });

    const retrieved = await system.getAnchor(anchor.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.metadata.label).toBe('Test Anchor');
  });

  it('queries nearby anchors within radius', async () => {
    // Create test anchors at various distances
    const center = { latitude: 37.7749, longitude: -122.4194, altitude: 0 };

    await createAnchorAt({ latitude: 37.7750, longitude: -122.4194, altitude: 0 }); // ~111m north
    await createAnchorAt({ latitude: 37.7749, longitude: -122.4184, altitude: 0 }); // ~111m east
    await createAnchorAt({ latitude: 37.7759, longitude: -122.4194, altitude: 0 }); // ~1.1km north

    const nearby = await system.queryNearby({
      center,
      radiusMeters: 500,
    });

    expect(nearby).toHaveLength(2); // Only first two within 500m
  });
});
```

### AR Platform Tests

```typescript
describe('ARPlatformIntegration', () => {
  it('detects ARCore capabilities', async () => {
    // Mock WebXR with geospatial support
    mockWebXR({ geospatialTracking: true });

    const platform = new ARPlatformIntegration();
    const capabilities = await platform.detectCapabilities();

    expect(capabilities.platform).toBe('arcore');
    expect(capabilities.supportsGeospatial).toBe(true);
    expect(capabilities.horizontalAccuracy).toBeLessThanOrEqual(10);
  });
});
```

---

## Future Enhancements

### 1. Geodetic Precision (Global Accuracy)

**Current:** Flat-earth approximation (accurate <10km)
**Future:** Full WGS84 ellipsoid calculations

```typescript
// ECEF (Earth-Centered Earth-Fixed) coordinates
function wgs84ToECEF(coords: WGS84Coordinate): Vector3 {
  const a = 6378137; // WGS84 semi-major axis
  const e2 = 0.00669437999014; // First eccentricity squared

  const lat = coords.latitude * Math.PI / 180;
  const lon = coords.longitude * Math.PI / 180;
  const h = coords.altitude;

  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);

  return {
    x: (N + h) * Math.cos(lat) * Math.cos(lon),
    y: (N + h) * Math.cos(lat) * Math.sin(lon),
    z: (N * (1 - e2) + h) * Math.sin(lat),
  };
}
```

**Benefit:** Accurate for global-scale experiences (thousands of km)

### 2. R-Tree Spatial Index

**Current:** O(n) brute-force filtering
**Future:** O(log n) tree traversal

**Libraries:**
- `rbush` - 2D R-Tree in JavaScript
- `spatial-index` - Generic spatial index

**Implementation:**

```typescript
import RBush from 'rbush';

class SpatialIndex {
  private tree = new RBush<GeospatialAnchor>();

  insert(anchor: GeospatialAnchor) {
    this.tree.insert({
      minX: anchor.coordinates.longitude,
      minY: anchor.coordinates.latitude,
      maxX: anchor.coordinates.longitude,
      maxY: anchor.coordinates.latitude,
      ...anchor,
    });
  }

  queryRadius(center: WGS84Coordinate, radiusMeters: number) {
    const radiusDegrees = radiusMeters / 111320; // Rough conversion

    return this.tree.search({
      minX: center.longitude - radiusDegrees,
      minY: center.latitude - radiusDegrees,
      maxX: center.longitude + radiusDegrees,
      maxY: center.latitude + radiusDegrees,
    });
  }
}
```

### 3. VPS Integration

**Visual Positioning Service** for indoor/outdoor accuracy

**Providers:**
- **Google ARCore Cloud Anchors** - 87 countries, 5m accuracy
- **Niantic Lightship VPS** - 100,000+ locations, <1m accuracy
- **Immersal** - Custom mapping, <10cm accuracy

**Example:**

```typescript
async function createVPSAnchor(coords: WGS84Coordinate) {
  const vps = await loadVPSProvider('arcore-cloud-anchors');

  // Check VPS coverage at location
  const coverage = await vps.checkCoverage(coords);

  if (coverage.available) {
    // Use VPS for high accuracy
    return await vps.createAnchor(coords);
  } else {
    // Fallback to GPS-only
    return await createGPSAnchor(coords);
  }
}
```

### 4. Mesh Anchors

**Anchor to scanned 3D meshes** (ARKit meshing, ARCore depth API)

```typescript
interface MeshAnchor extends GeospatialAnchor {
  meshId: string;              // Reference to scanned mesh
  surfacePosition: Vector3;    // Position on mesh surface
  surfaceNormal: Vector3;      // Normal vector at anchor point
}

async function createMeshAnchor(
  meshId: string,
  surfacePoint: Vector3,
  gpsPosition: WGS84Coordinate
): Promise<MeshAnchor> {
  // Combine GPS + mesh for hybrid accuracy
  // GPS provides global reference
  // Mesh provides local precision (<1cm)
}
```

### 5. SLAM Fusion

**Combine GPS + visual SLAM** for indoor/outdoor transitions

```typescript
interface HybridAnchor extends GeospatialAnchor {
  slamAnchorId?: string;       // Visual SLAM anchor ID
  gpsAccuracy: number;         // GPS accuracy estimate
  slamAccuracy: number;        // SLAM accuracy estimate
  activeMode: 'gps' | 'slam' | 'hybrid';
}

// Automatic mode switching
function selectAnchorMode(
  gpsAccuracy: number,
  slamAccuracy: number
): 'gps' | 'slam' | 'hybrid' {
  if (gpsAccuracy < 5 && slamAccuracy > 10) return 'gps';
  if (slamAccuracy < 0.1 && gpsAccuracy > 20) return 'slam';
  return 'hybrid'; // Fuse both
}
```

---

## Related Research

From **Cross-Reality Agent Continuity** (W.025-W.035):

- **W.025** - Geospatial coords = only universal anchor
- **W.026** - MVC pattern keeps cross-reality state <10KB
- **W.027** - Authenticated CRDTs required for conflict-free sync
- **W.028** - Spatial anchor interop does not exist (2026)
- **W.029** - Geospatial anchoring works but needs VPS for <1m accuracy

**Key Insight:**

> "No AR platform's spatial anchors interoperate. ARCore anchors can't be read by ARKit. WebXR anchors reset per session. **Geospatial coordinates are the ONLY universal reference that works across all platforms.**"

---

## References

### Standards

- **WGS84** - World Geodetic System 1984 (GPS standard)
- **ENU** - East-North-Up local tangent plane
- **ECEF** - Earth-Centered Earth-Fixed coordinates
- **Haversine** - Great-circle distance formula

### AR Platform Documentation

- [ARCore Geospatial API](https://developers.google.com/ar/develop/geospatial)
- [ARKit Location Anchors](https://developer.apple.com/documentation/arkit/argeoanchor)
- [WebXR Device API](https://www.w3.org/TR/webxr/)

### Libraries

- `rbush` - Fast R-Tree spatial index
- `proj4` - Coordinate transformation library
- `geolib` - Geospatial utility functions

---

## License

MIT

---

**HoloLand Geospatial Anchor System v1.0**
*Universal spatial continuity across all AR platforms*

**Implementation:** `packages/platform/spatial/GeospatialAnchorSystem.ts`
**Demo:** `packages/platform/demos/geospatial-anchoring/`
**Research:** Cross-Reality Agent Continuity (W.025-W.035)
