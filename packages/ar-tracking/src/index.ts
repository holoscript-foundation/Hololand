/**
 * @hololand/ar-tracking
 * 
 * Multi-user AR tracking with person identification and data association.
 * 
 * ## Features
 * - Multi-target tracking with Kalman filter state estimation
 * - Hungarian algorithm for optimal detection-track association
 * - ReID appearance embeddings for robust person matching
 * - Server-side fusion of detections from multiple headsets
 * - HoloScript bindings for declarative tracking in VR/AR apps
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    AR TRACKING SYSTEM                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
 * │  │  Headset 1   │    │  Headset 2   │    │  Headset 3   │  │
 * │  │  (Quest 3)   │    │ (Vision Pro) │    │   (Phone)    │  │
 * │  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
 * │         │                   │                   │          │
 * │         │  Detections       │  Detections       │          │
 * │         │  + Embeddings     │  + Embeddings     │          │
 * │         ▼                   ▼                   ▼          │
 * │  ┌─────────────────────────────────────────────────────┐   │
 * │  │              AR TRACKING SERVER                      │   │
 * │  │  ┌─────────────────────────────────────────────┐    │   │
 * │  │  │         Multi-Target Tracker (MTT)          │    │   │
 * │  │  │  ┌─────────────┐    ┌──────────────────┐   │    │   │
 * │  │  │  │   Kalman    │    │    Hungarian     │   │    │   │
 * │  │  │  │   Filter    │◄──►│    Algorithm     │   │    │   │
 * │  │  │  │ (per track) │    │ (data assoc.)   │   │    │   │
 * │  │  │  └─────────────┘    └──────────────────┘   │    │   │
 * │  │  └─────────────────────────────────────────────┘    │   │
 * │  │                         │                            │   │
 * │  │                         ▼                            │   │
 * │  │              Global Person IDs                       │   │
 * │  │              User/Character Bindings                 │   │
 * │  └─────────────────────────┬───────────────────────────┘   │
 * │                            │                                │
 * │         ┌──────────────────┼──────────────────┐            │
 * │         ▼                  ▼                  ▼            │
 * │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
 * │  │  Headset 1   │   │  Headset 2   │   │  Headset 3   │   │
 * │  │  Renders     │   │  Renders     │   │  Renders     │   │
 * │  │  Characters  │   │  Characters  │   │  Characters  │   │
 * │  └──────────────┘   └──────────────┘   └──────────────┘   │
 * └─────────────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Usage
 * 
 * ### Server-side (Node.js / uaa2-service)
 * ```typescript
 * import { ARTrackingService } from '@hololand/ar-tracking/server';
 * 
 * const tracking = new ARTrackingService({
 *   maxTrackedPersons: 10,
 *   broadcastRate: 30,
 * });
 * 
 * // Handle WebSocket connections
 * wss.on('connection', (ws) => {
 *   ws.on('message', (data) => {
 *     const msg = JSON.parse(data);
 *     const response = tracking.handleMessage(msg);
 *     if (response) ws.send(JSON.stringify(response));
 *   });
 * });
 * 
 * // Start broadcast loop
 * tracking.startBroadcastLoop(33); // 30 Hz
 * ```
 * 
 * ### Client-side (Headset/Phone)
 * ```typescript
 * import { ARTrackingClient } from '@hololand/ar-tracking/client';
 * 
 * const client = new ARTrackingClient({
 *   serverUrl: 'wss://tracking.hololand.io',
 *   headsetId: 'quest3_001',
 *   userId: 'user_123',
 *   deviceType: 'quest3',
 *   hasDepthSensor: true,
 * });
 * 
 * client.connect();
 * 
 * // When anchor detected
 * client.alignToAnchor('shop-qr', 'qr', transformMatrix);
 * 
 * // Each frame: send detections
 * client.sendDetections(detectedPersons, frameNumber);
 * ```
 * 
 * ### HoloScript (Declarative)
 * ```holoscript
 * world "coffee-shop-ar" {
 *   tracking {
 *     mode: "multi-user"
 *     anchor: qr("shop-anchor-001")
 *     
 *     on personDetected(person) {
 *       spawn avatar at person.position
 *     }
 *     
 *     on personIdentified(person, userId) {
 *       bind character(userId) to person
 *     }
 *     
 *     on personLost(person) {
 *       despawn character(person.characterId)
 *     }
 *   }
 * }
 * ```
 * 
 * @packageDocumentation
 */

// Re-export types
export * from './types';

// Re-export server components
export { 
  ARTrackingService,
  MultiTargetTracker,
  KalmanFilter3D,
  hungarianAssignment,
} from './server';

// Re-export client components
export { ARTrackingClient } from './client';

// Re-export HoloScript bindings
export {
  trackingFunctions,
  parseTrackingBlock,
  executeHandler,
  createPersonProxy,
  type TrackingBlock,
  type TrackingContext,
  type TrackedPersonProxy,
} from './holoscript';
