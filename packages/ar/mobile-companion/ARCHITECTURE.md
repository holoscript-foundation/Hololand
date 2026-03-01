# HoloLand Mobile AR Companion - Architecture

**Package**: `@hololand/ar-mobile-companion`
**Version**: 0.1.0
**Status**: Architecture Design
**Last Updated**: 2026-02-28

---

## Overview

The Mobile AR Companion extends HoloLand's VR/AR platform to mobile devices via a Flutter application with native ARKit (iOS) and ARCore (Android) integration. It provides three core capabilities:

1. **Spatial Mesh Scanning Pipeline** -- Real-time environment mesh capture, processing, optimization, and cloud sync
2. **IoT Entity Binding** -- Metadata schema for binding physical IoT devices to spatial anchors in AR space
3. **HoloScript AR Bridge** -- Bidirectional communication between Flutter AR and the existing `@hololand/ar-*` package ecosystem

---

## System Architecture

```
+------------------------------------------------------------------+
|                    Flutter Application Layer                       |
|                                                                    |
|  +------------------+  +------------------+  +-----------------+  |
|  |   AR View Widget |  | Mesh Scan Widget |  |  IoT Dashboard  |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                      |                     |           |
|  +--------v---------+  +--------v---------+  +--------v--------+  |
|  | ARSessionManager |  | MeshScanManager  |  | IoTBindingMgr   |  |
|  +--------+---------+  +--------+---------+  +--------+--------+  |
|           |                      |                     |           |
+-----------|----------------------|---------------------|----------+
            |                      |                     |
   +--------v----------------------v---------------------v--------+
   |              Platform Channel Bridge (MethodChannel)          |
   |                                                               |
   |  io.hololand.ar/session   io.hololand.ar/mesh                |
   |  io.hololand.ar/anchors   io.hololand.ar/iot                 |
   +--------+----------------------+-----------------------+------+
            |                      |                       |
   +--------v--------+   +--------v--------+   +---------v-------+
   |   iOS (Swift)   |   |   Android (Kt)  |   |  Shared Logic   |
   |                 |   |                  |   |  (TypeScript)   |
   |  ARKit 7        |   |  ARCore 8       |   |                 |
   |  LiDAR Mesh     |   |  Depth API      |   |  @hololand/ar-  |
   |  Scene Geometry  |   |  Raw Depth      |   |  anchors        |
   |  World Tracking  |   |  Geospatial API |   |  detection      |
   |  Plane Detection |   |  Cloud Anchors  |   |  tracking       |
   +---------+-------+   +---------+-------+   |  foundation     |
             |                     |            +--------+--------+
             |                     |                     |
   +---------v---------------------v---------------------v--------+
   |                  HoloLand Backend (REST/WS)                   |
   |                                                               |
   |  POST /api/mesh/upload    WS /ws/ar-session                  |
   |  GET  /api/mesh/:id       POST /api/iot/bind                 |
   |  POST /api/anchors/cloud  GET  /api/iot/entities              |
   +--------------------------------------------------------------+
```

---

## 1. Flutter + Native ARKit/ARCore Architecture

### 1.1 Platform Channel Design

The architecture uses Flutter Platform Channels for native AR communication. Four dedicated channels isolate concerns:

```
Channel: io.hololand.ar/session
  Purpose: AR session lifecycle, configuration, tracking state
  Direction: Bidirectional
  Methods:
    Flutter -> Native:
      - initSession(config: ARSessionConfig) -> SessionHandle
      - pauseSession() -> void
      - resumeSession() -> void
      - destroySession() -> void
      - setTrackingMode(mode: TrackingMode) -> void
    Native -> Flutter (EventChannel):
      - onTrackingStateChanged(state: TrackingState)
      - onFrameUpdate(frame: ARFrameData)
      - onSessionError(error: ARError)

Channel: io.hololand.ar/mesh
  Purpose: Spatial mesh scanning, processing, export
  Direction: Bidirectional
  Methods:
    Flutter -> Native:
      - startMeshScanning(config: MeshScanConfig) -> void
      - stopMeshScanning() -> MeshScanResult
      - getMeshData(format: ExportFormat) -> MeshBuffer
      - setMeshResolution(level: MeshResolution) -> void
      - clearMeshData() -> void
    Native -> Flutter (EventChannel):
      - onMeshUpdated(update: MeshUpdateEvent)
      - onMeshClassification(classification: MeshClassification)
      - onScanProgress(progress: ScanProgressEvent)

Channel: io.hololand.ar/anchors
  Purpose: Spatial anchor management, cloud persistence
  Direction: Bidirectional
  Methods:
    Flutter -> Native:
      - createAnchor(pose: ARAnchorPose) -> AnchorId
      - removeAnchor(id: AnchorId) -> void
      - resolveCloudAnchor(cloudId: string) -> ARAnchorPose
      - hostCloudAnchor(localId: AnchorId) -> CloudAnchorId
      - getAnchors() -> List<ARAnchor>
    Native -> Flutter (EventChannel):
      - onAnchorUpdated(anchor: ARAnchor)
      - onAnchorLost(anchorId: AnchorId)
      - onPlaneDetected(plane: ARPlane)

Channel: io.hololand.ar/iot
  Purpose: IoT device discovery, binding to spatial entities
  Direction: Flutter -> Native primarily
  Methods:
    Flutter -> Native:
      - scanForDevices(protocols: List<IoTProtocol>) -> void
      - bindDeviceToAnchor(binding: IoTEntityBinding) -> BindingId
      - unbindDevice(bindingId: BindingId) -> void
      - getDeviceState(deviceId: string) -> IoTDeviceState
      - sendDeviceCommand(deviceId: string, command: IoTCommand) -> void
    Native -> Flutter (EventChannel):
      - onDeviceDiscovered(device: IoTDevice)
      - onDeviceStateChanged(deviceId: string, state: IoTDeviceState)
      - onBindingStatusChanged(bindingId: string, status: BindingStatus)
```

### 1.2 Native Implementation Strategy

**iOS (Swift + ARKit 7)**:
- ARWorldTrackingConfiguration with scene reconstruction
- LiDAR mesh extraction via ARMeshAnchor
- Scene geometry classification (floor, wall, ceiling, table, seat, door, window)
- Persistent world maps for relocalization
- Visual Positioning System (VPS) via ARGeoAnchor

**Android (Kotlin + ARCore 8)**:
- Session with DepthMode.AUTOMATIC
- Raw depth API for mesh reconstruction
- AI-driven occlusion for realistic rendering
- Cloud Anchors for cross-device persistence
- Geospatial API for outdoor AR

### 1.3 Cross-Platform Abstraction

Both platforms expose identical Dart APIs through the channel bridge:

```dart
abstract class NativeARBridge {
  Future<ARSession> createSession(ARSessionConfig config);
  Stream<ARFrame> get frameStream;
  Stream<MeshUpdate> get meshUpdateStream;
  Future<SpatialAnchor> createAnchor(Pose6DoF pose);
  Future<List<SpatialAnchor>> getAnchors();
  Future<MeshData> exportMesh(MeshExportFormat format);
}
```

The `ARSessionConfig` provides platform-adaptive defaults:

| Config Parameter       | iOS Default          | Android Default      |
|------------------------|----------------------|----------------------|
| trackingMode           | worldTracking        | augmentedImages      |
| meshEnabled            | true (LiDAR)         | true (Depth API)     |
| meshResolution         | high (LiDAR native)  | medium (depth est.)  |
| planeDetection         | horizontal+vertical  | horizontal+vertical  |
| environmentTexturing   | automatic            | automatic            |
| sceneReconstruction    | meshWithClassification | n/a (custom)       |
| depthMode              | lidar                | automatic            |
| cloudAnchors           | false                | false                |
| geospatialMode         | disabled             | disabled             |

---

## 2. Spatial Mesh Scanning Pipeline

### 2.1 Pipeline Overview

```
Stage 1: CAPTURE          Stage 2: PROCESS         Stage 3: OPTIMIZE
+-------------------+     +-------------------+    +-------------------+
| Native AR Frame   |     | Vertex Welding    |    | Mesh Decimation   |
| Depth Map         | --> | Normal Estimation | -> | LOD Generation    |
| LiDAR Point Cloud |     | Hole Filling      |    | Texture Atlas     |
| Plane Detection   |     | Classification    |    | UV Unwrapping     |
+-------------------+     +-------------------+    +-------------------+
                                                            |
                                                            v
Stage 6: RENDER           Stage 5: PERSIST         Stage 4: SYNC
+-------------------+     +-------------------+    +-------------------+
| LOD Selection     |     | Local Cache (SQF) |    | Delta Compression |
| Frustum Culling   | <-- | Cloud Storage     | <- | Chunk Upload      |
| AR Overlay        |     | Version Control   |    | Conflict Resolve  |
| Shadow Mapping    |     | Access Control    |    | Multi-Device Merge|
+-------------------+     +-------------------+    +-------------------+
```

### 2.2 Stage 1: Capture

Raw spatial data is captured from native AR frameworks:

**iOS (LiDAR)**:
- `ARMeshAnchor` provides triangulated mesh geometry
- Vertex positions, normals, face indices, classification per-face
- Resolution: ~2cm vertex spacing (LiDAR native)
- Update rate: 30Hz geometry updates
- Scene classification: floor, wall, ceiling, table, seat, door, window

**Android (Depth API)**:
- `Frame.acquireRawDepthImage()` provides 16-bit depth maps
- Resolution: typically 160x120 or 240x180 depth pixels
- Must reconstruct mesh from depth using TSDF (Truncated Signed Distance Function)
- Update rate: 30Hz depth frames, mesh at 10Hz
- Plane detection provides classification hints

**Capture Output Format** (unified across platforms):

```typescript
interface MeshCaptureFrame {
  frameId: number;
  timestamp: number;
  cameraPose: Pose6DoF;
  vertices: Float32Array;    // [x,y,z, x,y,z, ...] in world coordinates
  normals: Float32Array;     // [nx,ny,nz, ...] per-vertex
  indices: Uint32Array;      // triangle indices
  colors?: Uint8Array;       // [r,g,b,a, ...] per-vertex (from camera)
  classifications?: Uint8Array; // per-face classification enum
  confidence?: Float32Array; // per-vertex confidence [0-1]
  boundingBox: AABB;
}
```

### 2.3 Stage 2: Process

Processing runs on-device using a compute pipeline:

1. **Vertex Welding**: Merge vertices within epsilon distance (default 0.5cm)
   - Spatial hashing for O(n) performance
   - Preserves classification boundaries

2. **Normal Estimation**: Recompute normals for consistent winding
   - Area-weighted vertex normals from face normals
   - Flip detection using camera ray direction

3. **Hole Filling**: Close gaps in mesh where data is missing
   - Boundary edge detection
   - Advancing front method for small holes (<10cm diameter)
   - Planar infill for large surfaces (floor/wall extensions)

4. **Classification Propagation**: Extend per-face labels
   - iOS: Native ARKit classification (7 categories)
   - Android: ML-based classification from depth + RGB
   - Flood-fill from high-confidence classified faces
   - Boundary smoothing between classifications

### 2.4 Stage 3: Optimize

Optimization produces multiple LOD levels for efficient rendering:

| LOD Level | Target Density | Use Case              | Max Triangles |
|-----------|---------------|-----------------------|---------------|
| LOD 0     | Full          | Close inspection      | Unlimited     |
| LOD 1     | 50%           | Near-field (< 3m)     | 100K          |
| LOD 2     | 25%           | Mid-field (3-10m)     | 25K           |
| LOD 3     | 10%           | Far-field (> 10m)     | 5K            |
| LOD 4     | 2%            | Thumbnail/minimap     | 1K            |

**Decimation Algorithm**: Quadric Error Metrics (QEM)
- Preserves classification boundaries as constraints
- Edge collapse operations sorted by error metric
- Stops at target triangle count per LOD

**Texture Atlas Generation**:
- Project camera RGB onto mesh faces
- Multi-view blending weighted by view angle and distance
- Atlas packing with 1px gutter to prevent bleed
- Mipmap generation for each LOD level

### 2.5 Stage 4: Sync

Mesh synchronization uses a chunked delta approach:

**Spatial Chunking**:
- World divided into 1m^3 chunks (configurable)
- Each chunk tracked independently with version counter
- Only modified chunks are uploaded

**Delta Compression**:
```typescript
interface MeshChunkDelta {
  chunkId: string;             // spatial hash of chunk position
  version: number;             // monotonically increasing
  previousVersion: number;     // for conflict detection
  addedVertices: Float32Array;
  removedVertexIndices: Uint32Array;
  modifiedVertices: { index: number; position: Float32Array }[];
  addedFaces: Uint32Array;
  removedFaceIndices: Uint32Array;
  classificationUpdates: { faceIndex: number; classification: number }[];
  compressedSize: number;
}
```

**Multi-Device Merge Strategy**:
- Server maintains canonical mesh per world
- Each device submits deltas with source pose
- Conflict resolution: higher-confidence data wins
- Merge uses spatial overlap detection to align contributions
- Version vector per chunk prevents lost updates

### 2.6 Stage 5: Persist

**Local Storage** (on-device):
- SQLite for mesh metadata and chunk index
- Binary files for vertex/index data (SQF - Spatial Query Format)
- LRU cache with configurable size limit (default 500MB)
- Automatic eviction of stale chunks

**Cloud Storage** (HoloLand backend):
- REST API for chunk upload/download
- S3-compatible object storage for mesh data
- PostgreSQL for mesh metadata, versions, access control
- CDN edge caching for frequently accessed meshes

### 2.7 Stage 6: Render

AR overlay rendering pipeline:

1. Camera frame as background texture
2. LOD selection based on device position
3. Frustum culling per chunk
4. Mesh rendering with classification-based materials
5. Shadow casting from virtual lights onto real mesh
6. Occlusion: real mesh occludes virtual objects
7. Physics: virtual objects collide with real mesh

---

## 3. IoT Entity Binding Metadata Schema

### 3.1 Design Principles

The IoT Entity Binding schema connects physical IoT devices to spatial locations in AR space. Key design principles:

1. **Protocol-Agnostic**: Support BLE, WiFi, Zigbee, Z-Wave, Thread, Matter
2. **Schema-Extensible**: JSON-LD compatible with custom capability extensions
3. **Spatially-Anchored**: Every binding references a spatial anchor
4. **Temporally-Versioned**: All bindings carry timestamps and version history
5. **Privacy-Aware**: Device access scoped to world/room/user permissions
6. **HoloScript-Native**: Bindings expressible as HoloScript trait declarations

### 3.2 Core Schema

The schema is defined in TypeScript (source of truth) and projected to Dart, JSON Schema, and HoloScript.

See `src/iot/types.ts` for the complete TypeScript definition.

### 3.3 Entity Binding Lifecycle

```
DISCOVERY -> PAIRING -> BINDING -> ACTIVE -> UPDATING -> UNBOUND
    |           |          |         |           |
    v           v          v         v           v
 Scan for   Establish  Assign to  Real-time   Schema
 devices    connection  spatial   state sync  migration
 via BLE/   and auth   anchor +   via MQTT    or device
 WiFi/etc.  handshake  metadata   or WebSocket removal
```

### 3.4 Spatial Relationship Model

Each IoT entity is bound to the spatial world through a chain of references:

```
HoloLand World
  └── Room / Zone
       └── Spatial Anchor (QR / AprilTag / Cloud Anchor)
            └── IoT Entity Binding
                 ├── Device Reference (MAC/UUID)
                 ├── Spatial Offset (relative to anchor)
                 ├── Capability Schema
                 ├── State Channel (MQTT topic / WS path)
                 └── Interaction Zones (proximity triggers)
```

### 3.5 Capability System

IoT capabilities follow the W3C Web of Things (WoT) Thing Description pattern:

| Capability Type | Description | Example |
|-----------------|-------------|---------|
| `property`      | Readable/writable state | Temperature, brightness |
| `action`        | Invocable operation | Toggle, set color |
| `event`         | Observable notification | Motion detected, door opened |

Each capability includes:
- Data type schema (number, boolean, string, object, array)
- Unit of measurement (SI units)
- Valid range / enum values
- Update frequency
- Access permissions (read, write, admin)

### 3.6 Interaction Zones

Interaction zones define proximity-based triggers around IoT entities:

```typescript
interface InteractionZone {
  shape: 'sphere' | 'cylinder' | 'box';
  dimensions: { radius?: number; width?: number; height?: number; depth?: number };
  offset: Vector3;  // relative to entity position
  triggerOnEnter: boolean;
  triggerOnExit: boolean;
  triggerOnGaze: boolean;
  gazeAngleThreshold: number;  // degrees
  dwellTime: number;           // ms before trigger fires
  cooldown: number;            // ms between triggers
  actions: InteractionAction[];
}
```

### 3.7 HoloScript Integration

IoT bindings are expressible in HoloScript:

```holoscript
entity SmartLight {
  @iot_device(protocol: "matter", device_id: "light-001")
  @spatial_anchor(anchor_id: "qr_OFFICE_DESK", offset: [0, 0.3, 0])
  @iot_capability(type: "property", name: "brightness", dataType: "number", range: [0, 100])
  @iot_capability(type: "action", name: "toggle")
  @interaction_zone(shape: "sphere", radius: 2.0, trigger: "gaze", dwell: 1000)

  on gaze_enter {
    show_ui("light_controls")
  }

  on brightness_changed(value) {
    set_material_emission(value / 100)
  }
}
```

---

## 4. Integration with Existing @hololand/ar-* Packages

### 4.1 Package Dependency Map

```
@hololand/ar-mobile-companion
  ├── @hololand/ar-anchors      (anchor types, coordinate transforms)
  ├── @hololand/ar-detection    (depth processing, pose detection)
  ├── @hololand/ar-tracking     (multi-target tracking, person detection)
  ├── @hololand/ar-foundation   (AR runtime, HoloScript bridge)
  └── @hololand/ar-hooks        (reactive state bindings)
```

### 4.2 Type Alignment

The mobile companion reuses spatial primitive types from existing packages:

- `Vector3`, `Quaternion`, `Pose` from `@hololand/ar-anchors`
- `DepthFrame`, `CameraIntrinsics` from `@hololand/ar-detection`
- `TrackedPerson`, `Pose` from `@hololand/ar-tracking`
- `ARAnchorNode`, `ARRuntimeConfig` from `@hololand/ar-foundation`

New types are defined in `src/` and exported from the package index.

### 4.3 Data Flow

```
Mobile Device                          HoloLand Backend
+------------------+                   +------------------+
| Flutter App      |                   | REST API         |
|  - Camera Feed   |  WebSocket/REST   |  - Mesh Store    |
|  - Depth Data    | <===============> |  - Anchor Cloud  |
|  - Mesh Scan     |                   |  - IoT Registry  |
|  - IoT Discovery |                   |  - World State   |
+--------+---------+                   +--------+---------+
         |                                      |
         v                                      v
  @hololand/ar-*                        @hololand/ar-tracking
  (local processing)                    (server-side fusion)
```

---

## 5. Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| AR Frame Rate | 60 FPS | Native rendering, camera passthrough |
| Mesh Processing | < 16ms per frame | Must not block render thread |
| Mesh Upload Latency | < 500ms per chunk | Delta compression reduces payload |
| IoT Binding Latency | < 100ms | Device state round-trip |
| Memory (mesh cache) | < 200MB | LOD system reduces active memory |
| App Launch to AR | < 3s | Deferred mesh loading |
| Cloud Anchor Resolve | < 2s | Cached anchors < 500ms |
| Battery Impact | < 15% per hour | Adaptive frame rate during scan |

---

## 6. Security Considerations

- All mesh data encrypted at rest (AES-256) and in transit (TLS 1.3)
- IoT device bindings require authenticated HoloLand session
- Spatial scan data subject to user consent and data retention policies
- IoT commands validated against capability schema before execution
- Cloud anchors scoped to world access permissions
- No raw camera frames leave device unless user explicitly exports

---

## File Structure

```
packages/ar/mobile-companion/
  ARCHITECTURE.md              # This document
  package.json                 # NPM package definition
  tsconfig.json               # TypeScript configuration
  src/
    index.ts                   # Package entry point
    types.ts                   # Core type definitions
    mesh/
      types.ts                 # Mesh pipeline types
      MeshPipeline.ts          # Pipeline orchestrator
      MeshChunkManager.ts      # Spatial chunking and delta sync
    iot/
      types.ts                 # IoT entity binding schema
      IoTBindingManager.ts     # Binding lifecycle manager
      capabilities.ts          # Capability registry
    platform/
      ARSessionConfig.ts       # Cross-platform AR configuration
      PlatformBridge.ts        # Platform channel abstractions
    bridge/
      FlutterBridge.ts         # Flutter<->TypeScript bridge protocol
  flutter/
    lib/
      src/
        ar/
          ar_session.dart      # AR session management
          ar_frame.dart        # Frame data types
          native_bridge.dart   # Platform channel bridge
        mesh/
          mesh_scanner.dart    # Mesh scanning controller
          mesh_types.dart      # Dart mesh types
        iot/
          iot_binding.dart     # IoT binding types
          iot_manager.dart     # IoT discovery and binding
    ios/
      Classes/
        ARSessionPlugin.swift  # ARKit integration
        MeshScanPlugin.swift   # LiDAR mesh capture
    android/
      src/main/kotlin/io/hololand/ar/
        ARSessionPlugin.kt    # ARCore integration
        MeshScanPlugin.kt     # Depth-based mesh capture
```
