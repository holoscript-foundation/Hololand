/**
 * @hololand/ar-detection
 * 
 * Pose detection for AR applications.
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                          Architecture                               │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
 * │  │ BlazePose   │  │ MediaPipe   │  │ Depth Sensors               │ │
 * │  │ (TF.js)     │  │ (Vision)    │  │ (LiDAR, ToF, Stereo)        │ │
 * │  └─────┬───────┘  └─────┬───────┘  └───────────┬─────────────────┘ │
 * │        │                │                      │                   │
 * │        ▼                ▼                      ▼                   │
 * │  ┌────────────────────────────────────────────────────────────┐    │
 * │  │                  Unified Detection                          │    │
 * │  │  - 2D skeleton (33 keypoints)                               │    │
 * │  │  - 3D skeleton (with depth)                                 │    │
 * │  │  - Person crops (for ReID)                                  │    │
 * │  │  - Segmentation masks                                       │    │
 * │  └────────────────────────────────────────────────────────────┘    │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 * 
 * ```typescript
 * import { BlazePoseDetector } from '@hololand/ar-detection/blazepose';
 * import { DepthProcessor } from '@hololand/ar-detection/depth';
 * 
 * const detector = new BlazePoseDetector({ maxPoses: 4 });
 * await detector.initialize();
 * 
 * // Detect from video
 * const result = await detector.detect(video);
 * 
 * // With depth fusion
 * const depthProcessor = new DepthProcessor();
 * const depthFrame = depthProcessor.processFrame(rawDepth);
 * const result3D = await detector.detect(video, depthFrame);
 * ```
 */

// Types
export * from './types';

// BlazePose
export { BlazePoseDetector, type BlazePoseConfig } from './blazepose/BlazePoseDetector';

// MediaPipe
export { MediaPipeDetector, type MediaPipeConfig } from './mediapipe/MediaPipeDetector';

// Depth
export { DepthProcessor, type DepthProcessorConfig } from './depth/DepthProcessor';
