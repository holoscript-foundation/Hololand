# Multi-User AR Integration Example

This example demonstrates the complete AR pipeline with all @hololand packages.

## Full Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Multi-User AR Pipeline                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ @hololand/  │    │ @hololand/   │    │ @hololand/  │    │ @hololand/  │  │
│  │ ar-detection│───▶│ ar-embeddings│───▶│ ar-tracking │───▶│ ar-renderer │  │
│  │             │    │              │    │             │    │             │  │
│  │ BlazePose   │    │ OSNet ReID   │    │ Kalman+     │    │ VRM Avatar  │  │
│  │ MediaPipe   │    │ Feature      │    │ Hungarian   │    │ IK Retarget │  │
│  │ Depth       │    │ Vectors      │    │ Fusion      │    │ WebXR       │  │
│  └─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘  │
│         │                                      │                    │        │
│         │          ┌──────────────┐            │                    │        │
│         └─────────▶│ @hololand/   │◀───────────┘                    │        │
│                    │ ar-anchors   │─────────────────────────────────┘        │
│                    │              │                                          │
│                    │ QR, AprilTag │                                          │
│                    │ GPS, VPS     │                                          │
│                    └──────────────┘                                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
# Install all AR packages
pnpm add @hololand/ar-detection @hololand/ar-embeddings @hololand/ar-tracking @hololand/ar-anchors @hololand/ar-renderer

# Peer dependencies
pnpm add three @tensorflow/tfjs onnxruntime-web @pixiv/three-vrm
```

## Full Integration Example

```typescript
import { ARSceneManager, VRMAvatarManager, PoseRetargeter } from '@hololand/ar-renderer';
import { BlazePoseDetector, DepthProcessor } from '@hololand/ar-detection';
import { EmbeddingExtractor, EmbeddingMatcher } from '@hololand/ar-embeddings';
import { ARTrackingClient } from '@hololand/ar-tracking/client';
import { AnchorService, QRCodeDetector, VPSClient } from '@hololand/ar-anchors';

// =============================================================================
// INITIALIZATION
// =============================================================================

async function initializeAR() {
  // 1. Scene & Renderer
  const scene = new ARSceneManager({
    antialias: true,
    alpha: true,
    shadows: true,
  });
  scene.initialize(document.body);

  // 2. Avatar Manager
  const avatars = new VRMAvatarManager(scene.getScene()!);
  await avatars.initialize();

  // 3. Pose Detection
  const detector = new BlazePoseDetector({
    modelType: 'full',
    enableSegmentation: false,
    smoothLandmarks: true,
  });
  await detector.initialize();

  // 4. Depth Processing (if available)
  const depth = new DepthProcessor({ temporalFiltering: true });

  // 5. Person Embeddings
  const extractor = new EmbeddingExtractor({
    model: 'osnet',
    backend: 'onnx',
  });
  await extractor.initialize();

  const matcher = new EmbeddingMatcher({
    metric: 'cosine',
    threshold: 0.6,
  });

  // 6. Anchors
  const anchors = new AnchorService();
  const qrDetector = new QRCodeDetector({ markerSize: 0.15 });
  const vps = new VPSClient({ provider: 'custom' });

  // 7. Tracking Client
  const client = new ARTrackingClient('wss://your-tracking-server.com');
  await client.connect();

  // 8. IK Retargeting
  const retargeter = new PoseRetargeter();

  return { scene, avatars, detector, depth, extractor, matcher, anchors, qrDetector, vps, client, retargeter };
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

async function main() {
  const {
    scene, avatars, detector, depth, extractor, matcher,
    anchors, qrDetector, vps, client, retargeter
  } = await initializeAR();

  // Track person ID to avatar ID mapping
  const personAvatars = new Map<string, string>();

  // Get video element
  const video = document.querySelector('video') as HTMLVideoElement;
  
  // Start camera
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: 1280, height: 720 }
  });
  video.srcObject = stream;
  await video.play();

  // =============================================================================
  // ANCHOR DETECTION (run periodically)
  // =============================================================================
  
  async function scanAnchors() {
    // Try QR code
    const qrAnchor = await qrDetector.detect(video);
    if (qrAnchor) {
      anchors.addAnchor(qrAnchor);
      console.log('QR anchor detected:', qrAnchor.id);
    }

    // Try VPS (less frequently)
    const frame = captureFrame(video);
    const vpsAnchor = await vps.localize(frame.imageData);
    if (vpsAnchor) {
      anchors.addAnchor(vpsAnchor);
      console.log('VPS localized:', vpsAnchor.id);
    }
  }

  // Scan for anchors every 2 seconds
  setInterval(scanAnchors, 2000);

  // =============================================================================
  // DETECTION LOOP
  // =============================================================================

  async function processFrame() {
    // 1. Detect poses
    const result = await detector.detect(video);
    if (!result.persons || result.persons.length === 0) return;

    for (const person of result.persons) {
      // 2. Get depth (if available)
      let skeleton3D = person.skeleton3D;
      if (!skeleton3D && depth.isInitialized()) {
        const depthFrame = depth.getLatestFrame();
        if (depthFrame) {
          skeleton3D = depth.projectTo3D(person.skeleton2D, depthFrame);
        }
      }

      // 3. Extract embedding for ReID
      let embedding = null;
      if (person.crop) {
        embedding = await extractor.extractWithMetadata(
          person.crop,
          person.skeleton2D.boundingBox,
          person.id
        );
      }

      // 4. Transform to world coordinates
      const worldPosition = skeleton3D?.rootPosition 
        ? anchors.transformToWorld(skeleton3D.rootPosition)
        : null;

      // 5. Send to tracking server
      client.sendDetection({
        position: worldPosition ?? { x: 0, y: 0, z: 0 },
        embedding: embedding ? Array.from(embedding.vector) : undefined,
        skeleton: skeleton3D,
      });
    }
  }

  // =============================================================================
  // HANDLE TRACKED PERSONS FROM SERVER
  // =============================================================================

  client.onTrackedPersons(async (persons) => {
    for (const person of persons) {
      // Check if we have avatar for this person
      let avatarId = personAvatars.get(person.id);

      if (!avatarId) {
        // Create new avatar
        avatarId = `avatar_${person.id}`;
        await avatars.loadAvatar(avatarId, {
          vrmUrl: getAvatarUrl(person),
          scale: 1.0,
        });
        personAvatars.set(person.id, avatarId);
        console.log(`Created avatar for person ${person.id}`);
      }

      // Update avatar transform
      avatars.setTransform(avatarId, {
        position: person.position,
        rotation: person.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
      });

      // Apply skeleton pose if available
      if (person.skeleton) {
        const model = avatars.getModel(avatarId);
        if (model) {
          retargeter.retarget(skeletonToKeypoints(person.skeleton), model);
        }
      }

      // Update expression based on recognition
      if (person.userId) {
        // Known user - show happy expression
        avatars.setExpression(avatarId, 'happy', 0.5);
      }
    }

    // Remove avatars for persons no longer tracked
    const trackedIds = new Set(persons.map(p => p.id));
    for (const [personId, avatarId] of personAvatars) {
      if (!trackedIds.has(personId)) {
        avatars.removeAvatar(avatarId);
        personAvatars.delete(personId);
        console.log(`Removed avatar for person ${personId}`);
      }
    }
  });

  // =============================================================================
  // ANIMATION LOOP
  // =============================================================================

  scene.onFrame(async (time, frame) => {
    // Process detection
    await processFrame();
    
    // Update avatars
    avatars.update();
  });

  // Start XR session
  await scene.startARSession();
  scene.start();

  console.log('Multi-user AR started!');
}

// =============================================================================
// HELPERS
// =============================================================================

function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  return {
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    canvas,
  };
}

function getAvatarUrl(person: any): string {
  // Return user's avatar if known, else default
  if (person.userId) {
    return `/avatars/${person.userId}.vrm`;
  }
  return '/avatars/default.vrm';
}

function skeletonToKeypoints(skeleton: any): Map<string, { x: number; y: number; z: number }> {
  const keypoints = new Map();
  for (const keypoint of skeleton.keypoints) {
    if (keypoint.position) {
      keypoints.set(keypoint.name, keypoint.position);
    }
  }
  return keypoints;
}

// Start
main().catch(console.error);
```

## Server Setup

```typescript
// server.ts
import { ARTrackingService } from '@hololand/ar-tracking/server';
import { EmbeddingMatcher } from '@hololand/ar-embeddings';

const matcher = new EmbeddingMatcher();
const service = new ARTrackingService({
  wsPort: 8080,
  embeddingMatcher: matcher,
});

// Add known users to gallery
await loadUserGallery(matcher);

await service.start();
console.log('Tracking server running on ws://localhost:8080');
```

## Package Dependencies

| Package | Peer Dependencies | Optional |
|---------|-------------------|----------|
| ar-detection | @tensorflow/tfjs, @mediapipe/tasks-vision | - |
| ar-embeddings | @tensorflow/tfjs OR onnxruntime-web | Both optional |
| ar-tracking | ws (server only) | - |
| ar-anchors | jsqr | apriltag-js |
| ar-renderer | three | @pixiv/three-vrm |

## Performance Tips

1. **Detection**: Run at 15-30 FPS max, not every frame
2. **Embeddings**: Only extract when person moves significantly
3. **Anchors**: Scan every 2-5 seconds, not continuously
4. **Avatars**: Use LOD for distant avatars
5. **Depth**: Use temporal filtering to smooth noise

## HoloScript Integration

```holoscript
// Define scene with tracked avatars
scene MultiUserAR {
  anchor qr_anchor {
    type: "qr"
    payload: "hololand://room/123"
  }
  
  // Avatar that follows tracked person
  entity tracked_avatar for each person in tracked_persons {
    model: person.avatar_url
    position: person.world_position
    pose: person.skeleton
    
    expression: person.is_known ? "happy" : "neutral"
    
    label {
      text: person.display_name
      offset: [0, 2.2, 0]
    }
  }
}
```

## License

MIT
