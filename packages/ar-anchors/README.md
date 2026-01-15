# @hololand/ar-anchors

Coordinate system alignment for shared AR experiences.

## Overview

In multi-user AR, all devices need to share a common coordinate system. This package provides anchor detection and coordinate alignment using:

- **QR Codes** - Easy to deploy, works indoors
- **AprilTags** - Higher precision fiducials
- **GPS** - Outdoor positioning
- **VPS** - Visual Positioning Systems (ARCore, Niantic)

## Installation

```bash
npm install @hololand/ar-anchors
```

## Quick Start

```typescript
import { AnchorService } from '@hololand/ar-anchors';

// Create anchor service
const anchorService = new AnchorService({
  minConfidence: 0.7,
  enableFusion: true,
  defaultQRSize: 0.1, // 10cm QR codes
});

// Register known anchor positions (world coordinates)
anchorService.registerKnownAnchor('qr_LOBBY_ENTRANCE', {
  position: { x: 0, y: 1.5, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
});

// Process camera frames
const frame = captureFrame();
const anchors = await anchorService.processQRDetections(frame, cameraPose);

// Check alignment status
if (anchorService.getIsAligned()) {
  // Transform local positions to world coordinates
  const worldPos = anchorService.localToWorld(localPos);
  
  // Send to tracking server
  trackingClient.sendDetection({
    position: worldPos,
    ...
  });
}
```

## Anchor Types

### QR Codes

The simplest option for indoor AR. Print QR codes at known locations.

```typescript
import { QRCodeDetector } from '@hololand/ar-anchors';

const detector = new QRCodeDetector({
  physicalSize: 0.1, // 10cm
  estimatePose: true,
});

const detections = await detector.detect(imageData);
```

QR code content should encode a unique identifier:
- `LOBBY_ENTRANCE`
- `ROOM_101_WALL`
- `ANCHOR_42`

### AprilTags

Higher precision alternative to QR codes. Better for robotics and precision AR.

```typescript
import { AprilTagDetector, APRILTAG_FAMILIES } from '@hololand/ar-anchors';

const detector = new AprilTagDetector({
  family: 'tag36h11', // Most robust family
  physicalSize: 0.1,
});
```

Supported families:
- `tag36h11` - 587 unique tags, best error correction
- `tag25h9` - 35 tags, compact
- `tag16h5` - 30 tags, very compact

### GPS

For outdoor experiences. Lower accuracy but works anywhere.

```typescript
import { GPSAnchorProvider } from '@hololand/ar-anchors';

const gps = new GPSAnchorProvider({
  enableHighAccuracy: true,
});

// Set origin at experience start
gps.setOrigin(await gps.getCurrentPosition());

// Start tracking
gps.startWatching((position) => {
  const anchor = gps.createAnchor(position);
  // GPS coordinates automatically convert to ENU (East-North-Up)
});
```

### VPS (Visual Positioning System)

Cloud-based visual positioning for supported locations.

```typescript
import { VPSClient } from '@hololand/ar-anchors';

// ARCore Geospatial (requires ARCore SDK)
const vps = new VPSClient({
  provider: 'arcore',
});

// Custom VPS server
const vps = new VPSClient({
  provider: 'custom',
  endpoint: 'https://vps.myapp.com/resolve',
  apiKey: 'your-api-key',
});

const response = await vps.resolve({
  image: cameraFrame,
  intrinsics: cameraIntrinsics,
  gpsHint: { latitude: 37.7749, longitude: -122.4194 },
});
```

## Coordinate Transform

The `CoordinateTransform` class handles all coordinate conversions.

```typescript
import { CoordinateTransform, composePoses, invertPose } from '@hololand/ar-anchors';

// Create transform from anchor observation
const transform = CoordinateTransform.fromAnchorPair(
  knownWorldPose,  // Where anchor is in world
  observedLocalPose // Where device sees anchor
);

// Transform points
const worldPoint = transform.localPointToWorld({ x: 1, y: 0, z: 0 });
const localPoint = transform.worldPointToLocal(worldPoint);

// Transform poses
const worldPose = transform.localPoseToWorld(cameraPose);
```

### Pose Operations

```typescript
import {
  composePoses,
  invertPose,
  interpolatePoses,
  rotateVectorByQuaternion,
} from '@hololand/ar-anchors';

// Chain transforms: parent * child
const worldPose = composePoses(anchorPose, relativePose);

// Invert: get child → parent transform
const invPose = invertPose(pose);

// Interpolate for smooth transitions
const blended = interpolatePoses(poseA, poseB, 0.5);
```

## Multi-Anchor Fusion

When multiple anchors are visible, the service can fuse them for better accuracy.

```typescript
const service = new AnchorService({
  enableFusion: true,
  fusionStrategy: 'weighted_average', // or 'newest', 'highest_confidence'
});

// Each detected anchor refines the world alignment
const anchors = await service.processQRDetections(frame, cameraPose);

// Check alignment quality
const quality = service.getAlignmentQuality(); // 0-1
```

## Events

Subscribe to anchor lifecycle events:

```typescript
anchorService.on((event) => {
  switch (event.type) {
    case 'detected':
      console.log(`New anchor: ${event.anchor.id}`);
      break;
    case 'lost':
      console.log(`Lost anchor: ${event.anchor.id}`);
      break;
    case 'aligned':
      console.log('World alignment established!');
      break;
    case 'updated':
      // Anchor pose refined
      break;
  }
});
```

## Integration with @hololand/ar-tracking

```typescript
import { AnchorService } from '@hololand/ar-anchors';
import { ARTrackingClient } from '@hololand/ar-tracking/client';

// Setup
const anchorService = new AnchorService();
const trackingClient = new ARTrackingClient('wss://tracking.myapp.com');

// Register anchors
anchorService.registerKnownAnchor('qr_ORIGIN', {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
});

// In render loop
function onFrame(frame: ARFrame) {
  // Process anchors
  const anchors = anchorService.processQRDetections(frame.imageData, frame.cameraPose);
  
  // Transform and send detections
  if (anchorService.getIsAligned()) {
    for (const detection of frame.bodyDetections) {
      const worldPose = anchorService.localPoseToWorld(detection.pose);
      trackingClient.sendDetection({
        ...detection,
        position: worldPose.position,
      });
    }
  }
}
```

## API Reference

### AnchorService

| Method | Description |
|--------|-------------|
| `registerKnownAnchor(id, worldPose)` | Register anchor with known world position |
| `processQRDetections(imageData, cameraPose)` | Process QR detections |
| `processGPSPosition(position)` | Process GPS update |
| `localToWorld(point)` | Transform local → world |
| `worldToLocal(point)` | Transform world → local |
| `getIsAligned()` | Check if world alignment established |
| `getAlignmentQuality()` | Get alignment quality (0-1) |
| `on(handler)` | Subscribe to events |

### QRCodeDetector

| Method | Description |
|--------|-------------|
| `detect(imageData)` | Detect QR codes in image |
| `detectFromVideo(video)` | Detect from video element |
| `setConfig(config)` | Update configuration |

### CoordinateTransform

| Method | Description |
|--------|-------------|
| `localPointToWorld(point)` | Transform point local → world |
| `worldPointToLocal(point)` | Transform point world → local |
| `localPoseToWorld(pose)` | Transform pose local → world |
| `worldPoseToLocal(pose)` | Transform pose world → local |
| `setFromAnchor(worldPose, localPose)` | Set transform from anchor |
| `refineFromAnchor(worldPose, localPose, weight)` | Refine with new observation |

## Types

```typescript
interface Pose {
  position: Vector3;
  rotation: Quaternion;
}

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

type AnchorType = 'qr' | 'apriltag' | 'vps' | 'gps' | 'image' | 'plane' | 'manual';
```

## License

MIT - see LICENSE file
