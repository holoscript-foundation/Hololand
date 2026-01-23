# @hololand/ar-detection

Pose detection for AR applications using BlazePose, MediaPipe, and depth sensors.

## Overview

This package provides unified pose detection for multi-user AR:

- **BlazePose** - Google's full-body pose model (33 keypoints)
- **MediaPipe** - MediaPipe Pose Landmarker
- **Depth Fusion** - LiDAR, ToF, stereo depth for accurate 3D

## Installation

```bash
npm install @hololand/ar-detection
```

For BlazePose (optional):
```bash
npm install @tensorflow/tfjs @tensorflow-models/pose-detection
```

## Quick Start

### BlazePose

```typescript
import { BlazePoseDetector } from '@hololand/ar-detection/blazepose';

const detector = new BlazePoseDetector({
  modelType: 'lite', // 'lite' | 'full' | 'heavy'
  maxPoses: 4,
  enable3D: true,
});

await detector.initialize();

// Detect from video
const result = await detector.detect(video);

for (const person of result.persons) {
  console.log('Skeleton:', person.skeleton2D.keypoints);
  console.log('Confidence:', person.skeleton2D.confidence);
}
```

### MediaPipe

```typescript
import { MediaPipeDetector } from '@hololand/ar-detection/mediapipe';

const detector = new MediaPipeDetector({
  numPoses: 4,
  delegate: 'GPU',
});

await detector.initialize();

// Detect from video (use detectForVideo for video streams)
const result = await detector.detectForVideo(video, timestamp);
```

### With Depth

```typescript
import { BlazePoseDetector } from '@hololand/ar-detection/blazepose';
import { DepthProcessor } from '@hololand/ar-detection/depth';

const detector = new BlazePoseDetector({
  enable3D: true,
  cameraIntrinsics: {
    width: 1920,
    height: 1080,
    fx: 1000,
    fy: 1000,
    cx: 960,
    cy: 540,
  },
});

const depthProcessor = new DepthProcessor({
  minDepth: 0.1,
  maxDepth: 10.0,
  enableTemporalFilter: true,
});

// Process depth frame
const depthFrame = depthProcessor.processFrame(rawDepthFrame);

// Detect with depth fusion
const result = await detector.detect(video, depthFrame);

// 3D skeleton now has world-space positions
for (const person of result.persons) {
  if (person.skeleton3D) {
    console.log('Root position:', person.skeleton3D.rootPosition);
  }
}
```

## Keypoints

BlazePose provides 33 keypoints:

| Index | Name | Index | Name |
|-------|------|-------|------|
| 0 | Nose | 17 | Left Pinky |
| 1-6 | Eyes | 18 | Right Pinky |
| 7-8 | Ears | 19 | Left Index |
| 9-10 | Mouth | 20 | Right Index |
| 11-12 | Shoulders | 21-22 | Thumbs |
| 13-14 | Elbows | 23-24 | Hips |
| 15-16 | Wrists | 25-32 | Legs & Feet |

## Detection Result

```typescript
interface DetectionResult {
  persons: PersonDetection[];
  timestamp: number;
  processingTime: number;
  imageSize: { width: number; height: number };
}

interface PersonDetection {
  id: number;
  skeleton2D: Skeleton2D;
  skeleton3D?: Skeleton3D;
  crop?: ImageData;      // For ReID embedding
  mask?: Uint8Array;     // Segmentation mask
}
```

## Depth Processing

### WebXR Depth API

```typescript
import { DepthProcessor } from '@hololand/ar-detection/depth';

// In WebXR frame callback
const depthInfo = frame.getDepthInformation(view);
if (depthInfo) {
  const depthFrame = DepthProcessor.fromWebXRDepth(depthInfo, cameraIntrinsics);
  const processed = depthProcessor.processFrame(depthFrame);
}
```

### LiDAR (iOS)

```typescript
// ARKit depth data
const depthFrame = DepthProcessor.fromLiDAR(
  depthData,    // Float32Array from ARFrame
  width,
  height,
  intrinsics
);
```

### Manual Projection

```typescript
// Project 2D point to 3D
const point3D = depthProcessor.project2Dto3D(x, y, depth, intrinsics);

// Project 3D point to 2D
const { x, y, depth } = depthProcessor.project3Dto2D(point3D, intrinsics);

// Lift entire skeleton
const skeleton3D = depthProcessor.liftSkeleton(skeleton2D, depthFrame, intrinsics);
```

## Integration with @hololand/ar-tracking

```typescript
import { BlazePoseDetector } from '@hololand/ar-detection';
import { AnchorService } from '@hololand/ar-anchors';
import { ARTrackingClient } from '@hololand/ar-tracking/client';

// Setup
const detector = new BlazePoseDetector({ enable3D: true });
const anchorService = new AnchorService();
const trackingClient = new ARTrackingClient('wss://tracking.myapp.com');

await detector.initialize();

// In render loop
async function onFrame(video: HTMLVideoElement, depthFrame?: DepthFrame) {
  // Detect poses
  const result = await detector.detect(video, depthFrame);
  
  // Transform to world coordinates and send
  if (anchorService.getIsAligned()) {
    for (const person of result.persons) {
      if (person.skeleton3D?.rootPosition) {
        const worldPos = anchorService.localToWorld(person.skeleton3D.rootPosition);
        
        trackingClient.sendDetection({
          position: worldPos,
          skeleton: person.skeleton3D,
          boundingBox: person.skeleton2D.boundingBox,
        });
      }
    }
  }
}
```

## Performance Tips

1. **Use lite model** for real-time on mobile
2. **Limit maxPoses** to expected occupancy
3. **Enable WebGL backend** for best performance
4. **Use temporal filtering** for stable depth

```typescript
// Optimized mobile config
const detector = new BlazePoseDetector({
  modelType: 'lite',
  backend: 'webgl',
  maxPoses: 4,
  minConfidence: 0.5,
  enableSegmentation: false, // Disable if not needed
});
```

## API Reference

### BlazePoseDetector

| Method | Description |
|--------|-------------|
| `initialize()` | Load model and initialize |
| `detect(input, depthFrame?)` | Detect poses in image |
| `detectFromVideo(video, depthFrame?)` | Detect from video element |
| `isReady()` | Check if initialized |
| `dispose()` | Release resources |

### MediaPipeDetector

| Method | Description |
|--------|-------------|
| `initialize()` | Load model |
| `detect(image, depthFrame?)` | Detect in image |
| `detectForVideo(video, timestamp, depthFrame?)` | Detect in video |
| `dispose()` | Release resources |

### DepthProcessor

| Method | Description |
|--------|-------------|
| `processFrame(raw)` | Process raw depth |
| `project2Dto3D(x, y, depth, intrinsics)` | Project point |
| `liftSkeleton(skeleton2D, depth, intrinsics)` | Lift skeleton to 3D |
| `visualize(frame)` | Create visualization |

## Types

```typescript
interface Skeleton2D {
  keypoints: Keypoint2D[];
  boundingBox: BoundingBox;
  confidence: number;
  timestamp: number;
}

interface Skeleton3D extends Skeleton2D {
  keypoints: Keypoint3D[];
  rootPosition?: Vector3;
  orientation?: Quaternion;
}

interface DepthFrame {
  data: Float32Array;
  width: number;
  height: number;
  minDepth: number;
  maxDepth: number;
}
```

## License

MIT - see LICENSE file
