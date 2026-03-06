/**
 * WebXR Agent Embodiment Module
 *
 * Universal cross-ecosystem bridge for agent spatial presence in WebXR-capable
 * browsers. Serves as the fallback when native platform SDKs are unavailable.
 *
 * @module webxr-agent-embodiment
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  WebXRCapabilities,
  AvatarStyle,
  InteractionMode,
  PerformanceTier,
  WebXRAgentEmbodimentConfig,
  WebXRSessionMode,
  WebXRReferenceSpaceType,
  WebXRAgentState,
  TransitionAnimation,
  EmbodimentTransition,
  RenderPrimitiveType,
  RenderPrimitive,
  RenderData,
  WebXRAgentEmbodimentEventMap,
  WebXRAgentEmbodimentEventType,
  WebXRAgentEmbodimentEventHandler,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  DEFAULT_WEBXR_AGENT_CONFIG,
  DEFAULT_WEBXR_CAPABILITIES,
  EMOTION_COLORS,
  PERFORMANCE_TIER_MULTIPLIERS,
} from './types';

// =============================================================================
// CORE CLASS & FACTORY
// =============================================================================

export { WebXRAgentEmbodiment, create } from './WebXRAgentEmbodiment';
