# AR Tracking API Contract

This document defines the API contract for the `@hololand/ar-tracking` package.

## Version

- **API Version**: 1.0.0
- **Protocol Version**: 1
- **Last Updated**: 2026-01-14

## Overview

The AR Tracking system uses a client-server architecture where:
- **Clients** (headsets/phones) send person detections to the server
- **Server** fuses detections and maintains globally consistent person IDs
- **Server** broadcasts tracking state to all connected clients

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   CLIENT                    SERVER                  CLIENT      │
│   ──────                    ──────                  ──────      │
│                                                                 │
│   ┌─────────┐               ┌─────────┐            ┌─────────┐  │
│   │ Detect  │──detections──▶│  Fuse   │◀──────────│ Detect  │  │
│   │ Persons │               │ + Track │            │ Persons │  │
│   └─────────┘               └────┬────┘            └─────────┘  │
│                                  │                              │
│   ┌─────────┐               ┌────▼────┐            ┌─────────┐  │
│   │ Render  │◀──broadcast───│Broadcast│───────────▶│ Render  │  │
│   │ Avatars │               │  IDs    │            │ Avatars │  │
│   └─────────┘               └─────────┘            └─────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## WebSocket Protocol

### Connection

```
URL: wss://{host}:{port}/ar-tracking
Protocol: WebSocket
Subprotocol: hololand-ar-tracking-v1
```

### Message Format

All messages are JSON objects with a `type` field.

```typescript
interface Message {
  type: string;
  [key: string]: unknown;
}
```

---

## Client → Server Messages

### 1. `register` - Headset Registration

Sent once when client connects.

```typescript
interface HeadsetRegistration {
  type: 'register';
  headsetId: string;        // Unique device ID
  userId: string;           // User account ID
  deviceType: 'quest3' | 'vision_pro' | 'phone_lidar' | 'phone_no_depth' | 'other';
  hasDepthSensor: boolean;
  initialPose: Pose;        // Headset position at registration
}

interface Pose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  timestamp: number;        // Unix timestamp (ms)
}
```

**Example:**
```json
{
  "type": "register",
  "headsetId": "quest3_abc123",
  "userId": "user_456",
  "deviceType": "quest3",
  "hasDepthSensor": true,
  "initialPose": {
    "position": { "x": 0, "y": 1.6, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
    "timestamp": 1705234567890
  }
}
```

---

### 2. `anchor_aligned` - Anchor Alignment

Sent when client detects and aligns to a shared anchor.

```typescript
interface AnchorAlignment {
  type: 'anchor_aligned';
  headsetId: string;
  anchorId: string;         // Anchor identifier (e.g., QR content)
  anchorType: 'qr' | 'apriltag' | 'vps' | 'manual';
  localToWorldTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: number;
  };
}
```

**Example:**
```json
{
  "type": "anchor_aligned",
  "headsetId": "quest3_abc123",
  "anchorId": "shop-qr-001",
  "anchorType": "qr",
  "localToWorldTransform": {
    "position": { "x": 2.5, "y": 0, "z": -1.2 },
    "rotation": { "x": 0, "y": 0.707, "z": 0, "w": 0.707 },
    "scale": 1.0
  }
}
```

---

### 3. `detections` - Person Detections

Sent each frame (typically 30 Hz).

```typescript
interface DetectionUpdate {
  type: 'detections';
  headsetId: string;
  headsetPose: Pose;
  detections: PersonDetection[];
  timestamp: number;
  frameNumber: number;
}

interface PersonDetection {
  localTrackId: string;     // Local tracker's ID for this person
  boundingBox: {
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
  };
  position: { x: number; y: number; z: number };  // Center of mass
  skeleton?: Skeleton;
  appearanceEmbedding?: number[];  // 128-512 dim ReID vector
  faceEmbedding?: number[];        // Optional face embedding
  confidence: number;              // [0-1]
  timestamp: number;
}

interface Skeleton {
  keypoints2D: Keypoint2D[];
  keypoints3D: Keypoint3D[];
  confidence: number;
}

interface Keypoint2D {
  x: number;
  y: number;
  confidence: number;
  name: KeypointName;
}

interface Keypoint3D {
  x: number;
  y: number;
  z: number;
  confidence: number;
  name: KeypointName;
}

type KeypointName = 
  | 'nose' | 'left_eye' | 'right_eye' | 'left_ear' | 'right_ear'
  | 'left_shoulder' | 'right_shoulder' | 'left_elbow' | 'right_elbow'
  | 'left_wrist' | 'right_wrist' | 'left_hip' | 'right_hip'
  | 'left_knee' | 'right_knee' | 'left_ankle' | 'right_ankle';
```

**Example:**
```json
{
  "type": "detections",
  "headsetId": "quest3_abc123",
  "headsetPose": {
    "position": { "x": 1.2, "y": 1.6, "z": 0.5 },
    "rotation": { "x": 0, "y": 0.1, "z": 0, "w": 0.995 },
    "timestamp": 1705234567890
  },
  "detections": [
    {
      "localTrackId": "local_1",
      "boundingBox": {
        "center": { "x": 2.0, "y": 1.0, "z": -1.5 },
        "size": { "x": 0.5, "y": 1.8, "z": 0.3 }
      },
      "position": { "x": 2.0, "y": 1.0, "z": -1.5 },
      "appearanceEmbedding": [0.12, -0.34, 0.56, ...],
      "confidence": 0.92,
      "timestamp": 1705234567890
    }
  ],
  "timestamp": 1705234567890,
  "frameNumber": 1234
}
```

---

## Server → Client Messages

### 1. `tracking_update` - Tracking State Broadcast

Sent at regular intervals (typically 30 Hz) to all connected clients.

```typescript
interface TrackingBroadcast {
  type: 'tracking_update';
  trackedPersons: TrackedPerson[];
  userBindings: Record<string, string>;       // globalId → userId
  characterBindings: Record<string, string>;  // globalId → characterId
  timestamp: number;
  frameNumber: number;
}

interface TrackedPerson {
  globalId: string;         // Stable ID agreed across all headsets
  userId?: string;          // Bound user (if identified)
  characterId?: string;     // Bound character (if assigned)
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  skeleton?: Skeleton;
  confidence: number;       // Track confidence [0-1]
  state: 'tentative' | 'confirmed' | 'occluded' | 'deleted';
  age: number;              // Frames since first detection
  timeSinceUpdate: number;  // Frames since last detection
}
```

**Example:**
```json
{
  "type": "tracking_update",
  "trackedPersons": [
    {
      "globalId": "person_1",
      "userId": "user_alice",
      "characterId": "char_alice",
      "position": { "x": 2.1, "y": 1.0, "z": -1.4 },
      "velocity": { "x": 0.1, "y": 0, "z": -0.05 },
      "confidence": 0.95,
      "state": "confirmed",
      "age": 150,
      "timeSinceUpdate": 0
    }
  ],
  "userBindings": {
    "person_1": "user_alice",
    "person_2": "user_bob"
  },
  "characterBindings": {
    "person_1": "char_alice",
    "person_2": "char_bob"
  },
  "timestamp": 1705234567890,
  "frameNumber": 5678
}
```

---

### 2. `person_detected` - New Person Event

Sent when a new person is detected and confirmed.

```typescript
interface PersonDetectedEvent {
  type: 'person_detected';
  globalId: string;
  position: { x: number; y: number; z: number };
  isNewPerson: boolean;
}
```

---

### 3. `person_lost` - Person Lost Event

Sent when a tracked person is no longer visible.

```typescript
interface PersonLost {
  type: 'person_lost';
  globalId: string;
  lastPosition: { x: number; y: number; z: number };
  reason: 'left_scene' | 'occluded_timeout' | 'tracking_failure';
}
```

---

### 4. `person_identified` - Person Identified Event

Sent when a tracked person is bound to a user.

```typescript
interface PersonIdentified {
  type: 'person_identified';
  globalId: string;
  userId: string;
  characterId: string;
  confidence: number;
}
```

---

## REST API (Optional)

For non-real-time operations, a REST API is available.

### Base URL

```
https://{host}:{port}/api/ar-tracking/v1
```

### Endpoints

#### `GET /sessions`

List active tracking sessions.

```typescript
Response: {
  sessions: {
    id: string;
    createdAt: string;
    headsetCount: number;
    trackedPersonCount: number;
  }[];
}
```

#### `GET /sessions/{sessionId}/state`

Get current tracking state for a session.

```typescript
Response: TrackingBroadcast
```

#### `POST /sessions/{sessionId}/bind`

Bind a user to a tracked person.

```typescript
Request: {
  globalId: string;
  userId: string;
  characterId?: string;
}

Response: PersonIdentified | { error: string }
```

#### `DELETE /sessions/{sessionId}/bind/{globalId}`

Unbind a user from a tracked person.

```typescript
Response: { success: boolean }
```

---

## Error Handling

### WebSocket Errors

```typescript
interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  details?: unknown;
}
```

| Code | Description |
|------|-------------|
| `NOT_REGISTERED` | Client sent message before registration |
| `NOT_ALIGNED` | Client sent detections before anchor alignment |
| `INVALID_MESSAGE` | Message format invalid |
| `SESSION_FULL` | Max headsets reached for session |
| `RATE_LIMITED` | Too many messages |

---

## Rate Limits

| Operation | Limit |
|-----------|-------|
| Registration | 1 per connection |
| Detections | 60 messages/second |
| Total messages | 100 messages/second |

---

## HoloScript Integration

The tracking system exposes these HoloScript primitives:

### Anchor Functions

```holoscript
qr(id: string) -> AnchorSpec
apriltag(id: string) -> AnchorSpec  
vps(location: string) -> AnchorSpec
gps(lat: number, lng: number) -> AnchorSpec
```

### Character Functions

```holoscript
character(userId: string) -> string  // Returns character ID
```

### Position Functions

```holoscript
offset(personRef, x, y, z) -> PositionRef
above(personRef, height?) -> PositionRef
```

### Events

```holoscript
on personDetected(person) { ... }
on personLost(person) { ... }
on personIdentified(person, userId) { ... }
on personMoved(person) { ... }
on trackingStarted() { ... }
on trackingStopped() { ... }
```

### Person Object Properties

```holoscript
person.id: string
person.position: Vector3
person.velocity: Vector3
person.userId?: string
person.characterId?: string
person.confidence: number
person.isVisible: boolean
person.timeSinceLastSeen: number

// Methods
person.getHeadPosition() -> Vector3
person.getHandPositions() -> { left?: Vector3, right?: Vector3 }
person.distanceTo(position) -> number
person.isFacing(position, threshold?) -> boolean
```

---

## Changelog

### v1.0.0 (2026-01-14)

- Initial API release
- Kalman filter + Hungarian algorithm tracking
- ReID appearance matching
- HoloScript bindings
- WebSocket and REST APIs
