/**
 * Brittney Orchestration Module
 *
 * HoloScript+ based orchestration for AI model routing.
 * Emits events for agent observation in 3D environments.
 */

export {
  OrchestrationRuntime,
  createOrchestrationRuntime,
  type OrchestrationState,
  type OrchestrationEvent,
  type ProviderConfig,
} from './OrchestrationRuntime.js';

// Re-export the HoloScript definition path for compilation
export const ROUTING_GRAPH_PATH = './brittney-routing.hs';
