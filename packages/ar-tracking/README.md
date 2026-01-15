# @hololand/ar-tracking

Multi-user AR tracking with person identification and data association for shared AR experiences.

## Overview

This package provides the infrastructure for tracking multiple people across multiple AR headsets in a shared physical space (like a coffee shop). It ensures that everyone sees the same virtual characters attached to the same real people.

### The Problem

When 3 people in a coffee shop each wear AR headsets:
- Each headset detects 3 people
- How do all headsets agree on **who is who**?
- How do we maintain **stable IDs** as people move and occlude each other?

### The Solution

**Multi-Target Tracking (MTT) with DeepSORT-like data association:**

1. **Kalman Filter** - Predicts where each person will be next frame
2. **Hungarian Algorithm** - Optimally matches detections to existing tracks
3. **ReID Embeddings** - Appearance features for robust matching across occlusions
4. **Server Fusion** - Central server maintains globally consistent IDs

## Installation

```bash
pnpm add @hololand/ar-tracking
```

## Quick Start

### Server (runs in uaa2-service or dedicated microservice)

```typescript
import { ARTrackingService } from '@hololand/ar-tracking/server';
import { WebSocketServer } from 'ws';

const tracking = new ARTrackingService({
  maxTrackedPersons: 10,
  appearanceWeight: 0.4,  // Weight for ReID matching
  positionWeight: 0.6,    // Weight for position matching
});

const wss = new WebSocketServer({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const response = tracking.handleMessage(msg);
    if (response) {
      ws.send(JSON.stringify(response));
    }
  });
  
  ws.on('close', () => {
    // Handle disconnection
  });
});

// Broadcast tracking updates at 30 Hz
tracking.startBroadcastLoop(33);
tracking.events.onBroadcast = (broadcast) => {
  const data = JSON.stringify(broadcast);
  wss.clients.forEach(client => client.send(data));
};
```

### Client (runs on each headset/phone)

```typescript
import { ARTrackingClient } from '@hololand/ar-tracking/client';

const client = new ARTrackingClient({
  serverUrl: 'wss://your-server.com:8080',
  headsetId: 'quest3_abc123',
  userId: 'user_456',
  deviceType: 'quest3',
  hasDepthSensor: true,
}, {
  onTrackingUpdate: (broadcast) => {
    // Update character positions
    for (const person of broadcast.trackedPersons) {
      const characterId = broadcast.characterBindings[person.globalId];
      if (characterId) {
        renderCharacter(characterId, person.position);
      }
    }
  },
});

// Connect to server
client.connect();

// When QR anchor detected, align coordinate systems
client.alignToAnchor('shop-qr-001', 'qr', {
  position: anchorPosition,
  rotation: anchorRotation,
  scale: 1.0,
});

// Each frame: run person detection and send to server
function onFrame(detections) {
  client.sendDetections(detections, frameNumber++);
}
```

### HoloScript (declarative usage)

```holoscript
world "coffee-shop-ar" {
  // Define tracking configuration
  tracking {
    mode: "multi-user"
    anchor: qr("shop-anchor-001")
    
    // When a new person is detected
    on personDetected(person) {
      // Spawn a default avatar at their position
      spawn avatar at person.position
    }
    
    // When person is identified (matched to a user)
    on personIdentified(person, userId) {
      // Bind their custom character to this person
      bind character(userId) to person
    }
    
    // When person is no longer tracked
    on personLost(person) {
      // Remove their character
      despawn character(person.characterId)
    }
    
    // When person moves significantly
    on personMoved(person) {
      // Trigger effects or interactions
      if person.isNear(interactionZone) {
        trigger "zone_entered" with { personId: person.id }
      }
    }
  }
  
  // Define characters for each user
  characters {
    "user_alice": avatar("alice_custom") {
      style: "anime"
      accessories: ["hat", "glasses"]
    }
    
    "user_bob": avatar("bob_robot") {
      style: "robot"
      color: "#ff6600"
    }
    
    default: avatar("default_human") {
      style: "simple"
    }
  }
}
```

## API Reference

### Server API

#### `ARTrackingService`

Main server-side tracking service.

```typescript
const service = new ARTrackingService(config?: Partial<TrackingConfig>);

// Handle client messages
service.handleMessage(message: ClientMessage): ServerMessage | null;

// Process pending detections (call at regular interval)
service.tick(dt?: number): TrackingBroadcast;

// Start automatic broadcast loop
service.startBroadcastLoop(intervalMs?: number): void;

// Bind user to tracked person
service.bindUserToPerson(globalId: string, userId: string, characterId?: string): PersonIdentified | null;

// Get current state
service.getTrackedPersons(): TrackedPerson[];
service.getConnectedHeadsets(): ConnectedHeadset[];
service.getStats(): object;
```

#### `MultiTargetTracker`

Core tracking algorithm.

```typescript
const tracker = new MultiTargetTracker(config?: Partial<TrackingConfig>);

// Update with new detections
tracker.update(detections: PersonDetection[], dt?: number): TrackedPerson[];

// Bind user to track
tracker.bindUser(globalId: string, userId: string, characterId?: string): boolean;
```

### Client API

#### `ARTrackingClient`

Client-side tracking interface.

```typescript
const client = new ARTrackingClient(config: ARTrackingClientConfig, events?: ARTrackingClientEvents);

// Connection management
client.connect(): void;
client.disconnect(): void;

// Anchor alignment
client.alignToAnchor(anchorId: string, anchorType: string, transform: object): void;

// Send detections
client.sendDetections(detections: PersonDetection[], frameNumber: number): void;

// Get state
client.getTrackedPersons(): TrackedPerson[];
client.getCharacterId(globalId: string): string | undefined;
```

### Configuration

```typescript
interface TrackingConfig {
  maxTrackedPersons: number;      // Default: 20
  processNoise: number;           // Kalman filter process noise (0.1)
  measurementNoise: number;       // Kalman filter measurement noise (0.3)
  maxAssociationDistance: number; // Max distance for track matching (2.0m)
  appearanceWeight: number;       // ReID embedding weight (0.4)
  positionWeight: number;         // Position distance weight (0.6)
  confirmationFrames: number;     // Frames to confirm new track (3)
  maxTimeSinceUpdate: number;     // Frames before deleting track (30)
  minDetectionConfidence: number; // Min detection confidence (0.5)
  enableFaceRecognition: boolean; // Use face embeddings (false)
  broadcastRate: number;          // Broadcast Hz (30)
}
```

## Protocol Messages

### Client → Server

```typescript
// Register headset
{ type: 'register', headsetId, userId, deviceType, hasDepthSensor, initialPose }

// Send detections
{ type: 'detections', headsetId, headsetPose, detections, timestamp, frameNumber }

// Confirm anchor alignment
{ type: 'anchor_aligned', headsetId, anchorId, anchorType, localToWorldTransform }
```

### Server → Client

```typescript
// Tracking update (broadcast)
{ type: 'tracking_update', trackedPersons, userBindings, characterBindings, timestamp, frameNumber }

// Person detected
{ type: 'person_detected', globalId, position, isNewPerson }

// Person lost
{ type: 'person_lost', globalId, lastPosition, reason }

// Person identified
{ type: 'person_identified', globalId, userId, characterId, confidence }
```

## Algorithm Details

### Kalman Filter

State vector: `[x, y, z, vx, vy, vz]` (position + velocity)

- **Predict**: Project state forward using constant velocity model
- **Update**: Correct state with new measurement (position)
- **Mahalanobis distance**: Used for gating in data association

### Hungarian Algorithm

Solves optimal assignment between tracks and detections:

1. Build cost matrix: `cost[i][j] = w_pos * pos_dist + w_app * app_dist`
2. Apply Hungarian algorithm for optimal matching
3. Gate impossible matches (cost > threshold)
4. Handle unmatched tracks (mark occluded/deleted)
5. Create new tracks from unmatched detections

### ReID Appearance Matching

- Extract 128-512 dim feature vector from each person crop
- Use cosine distance for comparison
- Maintain running average of embeddings per track
- Robust to short occlusions (appearance stays consistent)

## Privacy Considerations

- **Face recognition disabled by default** - set `enableFaceRecognition: true` only with consent
- **Body ReID** is the safer default for identity persistence
- **Embeddings stay on server** - raw video never transmitted
- **User bindings are explicit** - app controls who sees what

## License

MIT
