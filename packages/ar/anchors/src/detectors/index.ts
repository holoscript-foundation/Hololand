/**
 * @hololand/ar-anchors - Detectors Module
 */

export { QRCodeDetector, type QRDetectorConfig } from './QRCodeDetector';
export { 
  AprilTagDetector, 
  APRILTAG_FAMILIES,
  type AprilTagDetectorConfig,
  type AprilTagFamily 
} from './AprilTagDetector';
export { 
  GPSAnchorProvider, 
  type GPSConfig, 
  type GPSPosition 
} from './GPSAnchorProvider';
export { 
  VPSClient, 
  geospatialToWorldPose,
  type VPSConfig, 
  type VPSProvider,
  type VPSRequest,
  type VPSResponse,
  type GeospatialPose 
} from './VPSClient';
