/**
 * @hololand/ar-hooks
 *
 * React hooks for Hololand AR — pose detection, anchors, geofencing,
 * multi-user sessions, live bridge, and the GhostOrb component.
 *
 * @module ar-hooks
 */

// Pose Detection
export {
  usePoseDetection,
  type PoseDetectionConfig,
  type PoseDetectionState,
  type PersonDetection,
  type DetectionResult,
  type Skeleton2D,
  type Skeleton3D,
  type Keypoint2D,
  type Keypoint3D,
} from './usePoseDetection';

// Anchor Management
export {
  useAnchor,
  type AnchorConfig,
  type AnchorState,
  type Anchor,
  type AnchorType,
  type Pose,
} from './useAnchor';

// Hit Testing
export {
  useHitTest,
  type HitTestResult,
  type HitTestState,
} from './useHitTest';

// GPS Anchoring
export {
  useGeoAnchor,
  type GeoAnchorConfig,
  type GeoAnchorState,
  type GPSPosition,
  type GPSAnchor,
} from './useGeoAnchor';

// Geofencing
export {
  useGeoFence,
  type GeoFence,
  type GeoFenceEvent,
  type GeoFenceConfig,
  type GeoFenceState,
} from './useGeoFence';

// Multi-User AR
export {
  useMultiUserAR,
  type MultiUserARConfig,
  type MultiUserARState,
  type MultiUserAREvent,
  type ARUser,
  type SharedAnchor,
} from './useMultiUserAR';

// Live Bridge (UAA2 spatial feed)
export {
  useLiveBridge,
  type LiveBridgeConfig,
  type LiveBridgeState,
  type AgentState,
  type Mission,
} from './useLiveBridge';

// GhostOrb component (R3F)
export {
  GhostOrb,
  type GhostOrbProps,
} from './GhostOrb';
