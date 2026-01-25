/**
 * @hololand/inference Integrations
 *
 * Safe public interfaces for external system integration
 */

// Fleet visualization (safe public interface)
export {
  // Types
  type Vector3,
  type SpatialEntity,
  type SpatialZone,
  type SpatialConnection,
  type FleetVisualizationData,
  type FleetDataAdapter,
  // Functions
  generateFleetVisualizationHoloScript,
  // Classes
  DemoFleetAdapter,
  FleetVisualizationBridge,
  getFleetVisualizationBridge,
} from './spatial-fleet-bridge.js';
