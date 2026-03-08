/**
 * @hololand/platform/spatial - Geospatial Anchor System
 *
 * Universal cross-ecosystem spatial continuity using WGS84 coordinates.
 *
 * @example
 * ```typescript
 * import { GeospatialAnchorSystem } from '@hololand/platform/spatial';
 *
 * const system = new GeospatialAnchorSystem();
 * await system.init();
 *
 * const anchor = await system.createAnchor(
 *   { latitude: 37.7749, longitude: -122.4194, altitude: 0 },
 *   { x: 0, y: 0, z: 0, w: 1 },
 *   { label: 'Virtual Statue', createdBy: 'user-123' }
 * );
 * ```
 */

// Main exports
export {
  GeospatialAnchorSystem,
  GeospatialCoordinateConverter,
  GeospatialAnchorStorage,
  ARPlatformIntegration,
  GeospatialSharingProtocol,
} from './GeospatialAnchorSystem';

// Type exports
export type {
  WGS84Coordinate,
  GeospatialAnchor,
  SpatialQuery,
  PlatformCapabilities,
} from './GeospatialAnchorSystem';

// Re-export coordinate transform utilities from AR package
export { CoordinateTransform } from '../../ar/anchors/src/CoordinateTransform';

// Re-export types from AR package
export type {
  Vector3,
  Quaternion,
  Pose,
  Transform,
} from '../../ar/anchors/src/types';
