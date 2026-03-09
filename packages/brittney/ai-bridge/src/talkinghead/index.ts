/**
 * TalkingHead Integration Module
 *
 * Provides real-time lip-sync for the Brittney avatar using the
 * @met4citizen/talkinghead library. This module bridges TalkingHead's
 * phoneme-based viseme engine with HoloLand's VRM avatar system.
 *
 * Three-Layer Architecture:
 * 1. TalkingHeadAdapter - Low-level wrapper around @met4citizen/talkinghead
 * 2. TalkingHeadLipSyncEngine - Audio-driven viseme pipeline with interpolation
 * 3. TalkingHeadAvatarBridge - High-level bridge to ReactAgentAvatarBridge
 *
 * Quick Start:
 * ```typescript
 * import {
 *   createTalkingHeadAvatarBridge,
 * } from '@hololand/ai-bridge/talkinghead';
 *
 * const bridge = createTalkingHeadAvatarBridge({
 *   ttsConfig: { ttsEndpoint: '/api/tts-proxy' },
 * });
 *
 * await bridge.initialize(containerElement);
 * await bridge.loadBrittneyAvatar();
 * bridge.connectToAgentBridge(agentBridge);
 *
 * // Per render frame:
 * const frame = bridge.getCurrentVisemeFrame();
 * applyBlendShapes(vrmModel, frame.blendShapeWeights);
 * ```
 *
 * @module talkinghead
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  OculusVisemeId,
  OculusVisemeCode,
  TalkingHeadMood,
  TalkingHeadCameraView,
  TalkingHeadLipSyncLang,
  TalkingHeadTTSConfig,
  TalkingHeadAudioData,
  TalkingHeadStreamConfig,
  StreamingMetrics,
  TalkingHeadAvatarSpec,
  TalkingHeadConstructorOptions,
  TalkingHeadEventType,
  TalkingHeadEventMap,
  TalkingHeadSpeakOptions,
  VisemeBlendShapeMapping,
  TalkingHeadIntegrationConfig,
  TalkingHeadAdapterState,
  TalkingHeadAdapterMetrics,
} from './TalkingHeadTypes';

export {
  VISEME_ID_TO_CODE,
  VISEME_CODE_TO_ID,
  VISEME_TO_VRM_BLEND_SHAPES,
  VISEME_TO_SIMPLE_VRM,
  DEFAULT_BRITTNEY_TTS_CONFIG,
  DEFAULT_BRITTNEY_AVATAR_SPEC,
  DEFAULT_INTEGRATION_CONFIG,
} from './TalkingHeadTypes';

// =============================================================================
// ADAPTER (Low-Level TalkingHead Wrapper)
// =============================================================================

export {
  TalkingHeadAdapter,
  createTalkingHeadAdapter,
} from './TalkingHeadAdapter';

// =============================================================================
// LIP-SYNC ENGINE (Audio-Driven Viseme Pipeline)
// =============================================================================

export {
  TalkingHeadLipSyncEngine,
  createTalkingHeadLipSyncEngine,
  DEFAULT_LIP_SYNC_CONFIG,
} from './TalkingHeadLipSyncEngine';

export type {
  VisemeFrame,
  LipSyncEngineConfig,
  LipSyncEngineMetrics,
} from './TalkingHeadLipSyncEngine';

// =============================================================================
// AVATAR BRIDGE (High-Level Agent Integration)
// =============================================================================

export {
  TalkingHeadAvatarBridge,
  createTalkingHeadAvatarBridge,
  DEFAULT_AVATAR_BRIDGE_CONFIG,
} from './TalkingHeadAvatarBridge';

export type {
  TalkingHeadAvatarBridgeConfig,
} from './TalkingHeadAvatarBridge';
