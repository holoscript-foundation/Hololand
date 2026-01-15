/**
 * @hololand/ar-anchors
 * 
 * Coordinate system alignment for shared AR experiences.
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                          Architecture                               │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
 * │  │ QR Codes    │  │ AprilTags   │  │ GPS/GNSS    │  │ VPS        │ │
 * │  │ (Indoor)    │  │ (Precise)   │  │ (Outdoor)   │  │ (Anywhere) │ │
 * │  └─────┬───────┘  └─────┬───────┘  └─────┬───────┘  └─────┬──────┘ │
 * │        │                │                │                │        │
 * │        ▼                ▼                ▼                ▼        │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Anchor Service                           │   │
 * │  │  - Anchor lifecycle management                              │   │
 * │  │  - Multi-anchor fusion                                      │   │
 * │  │  - Coordinate alignment                                     │   │
 * │  └───────────────────────┬─────────────────────────────────────┘   │
 * │                          │                                         │
 * │                          ▼                                         │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                 Coordinate Transform                        │   │
 * │  │  - Local ↔ World conversions                                │   │
 * │  │  - Pose composition                                         │   │
 * │  │  - Alignment refinement                                     │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 * 
 * ```typescript
 * import { AnchorService, QRCodeDetector } from '@hololand/ar-anchors';
 * 
 * // Create service
 * const anchorService = new AnchorService({
 *   minConfidence: 0.7,
 *   enableFusion: true,
 *   defaultQRSize: 0.1, // 10cm QR codes
 * });
 * 
 * // Register known anchor world positions
 * anchorService.registerKnownAnchor('qr_LOBBY_1', {
 *   position: { x: 0, y: 1.5, z: 0 },
 *   rotation: { x: 0, y: 0, z: 0, w: 1 },
 * });
 * 
 * // Process camera frames
 * const anchors = await anchorService.processQRDetections(imageData, cameraPose);
 * 
 * // Once aligned, transform between local and world coordinates
 * if (anchorService.getIsAligned()) {
 *   const worldPos = anchorService.localToWorld(localPos);
 * }
 * ```
 */

// Types
export * from './types';

// Detectors
export { QRCodeDetector, type QRDetectorConfig } from './detectors/QRCodeDetector';
export { 
  AprilTagDetector, 
  APRILTAG_FAMILIES,
  type AprilTagDetectorConfig,
  type AprilTagFamily 
} from './detectors/AprilTagDetector';
export { 
  GPSAnchorProvider, 
  type GPSConfig, 
  type GPSPosition 
} from './detectors/GPSAnchorProvider';
export { 
  VPSClient, 
  geospatialToWorldPose,
  type VPSConfig, 
  type VPSProvider,
  type VPSRequest,
  type VPSResponse,
  type GeospatialPose 
} from './detectors/VPSClient';

// Coordinate Transform
export {
  CoordinateTransform,
  // Vector operations
  addVectors,
  subtractVectors,
  scaleVector,
  dotProduct,
  crossProduct,
  vectorLength,
  normalizeVector,
  distanceBetween,
  // Quaternion operations
  multiplyQuaternions,
  conjugateQuaternion,
  normalizeQuaternion,
  quaternionToEuler,
  eulerToQuaternion,
  rotateVectorByQuaternion,
  slerpQuaternion,
  // Pose operations
  identityPose,
  composePoses,
  invertPose,
  interpolatePoses,
} from './CoordinateTransform';

// Anchor Service
export {
  AnchorService,
  type AnchorObservation,
  type AnchorEventType,
  type AnchorEvent,
  type AnchorEventHandler,
} from './AnchorService';
