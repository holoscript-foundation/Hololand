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
  VPS_PROVIDER_CREDENTIALS,
  createEnvVPSCredentialResolver,
  geospatialToWorldPose,
  type VPSClientConfig,
  type VPSConfig, 
  type VPSProvider,
  type VPSRequest,
  type VPSResponse,
  type VPSCredentialDescriptor,
  type VPSCredentialRequest,
  type VPSCredentialResolution,
  type VPSCredentialResolver,
  type VPSCredentialReceipt,
  type VPSDeviceReceipt,
  type VPSResolverReceipt,
  type GeospatialPose 
} from './VPSClient';
