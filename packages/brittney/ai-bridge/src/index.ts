/**
 * @hololand/ai-bridge
 *
 * AI Bridge for Natural Language → HoloScript Translation
 * Enables normies and developers to build in VR using natural language,
 * voice commands, and AI-assisted code generation.
 */

// Core AI Bridge
export { HololandAIBridge } from './HololandAIBridge';
export type { AIBridgeConfig, BuildRequest, FullPipelineResult } from './HololandAIBridge';

// Compiler Bridge (HoloScript integration)
export { CompilerBridge, getCompilerBridge } from './CompilerBridge';
export type { CompilationResult } from './CompilerBridge';

// Natural Language Translator
export { NaturalLanguageTranslator } from './NaturalLanguageTranslator';
export type { TranslationResult, TranslationContext } from './NaturalLanguageTranslator';

// Voice Processor
export { VoiceProcessor } from './VoiceProcessor';
export type { VoiceProcessingResult } from './VoiceProcessor';
export { VoiceVisualizer } from './VoiceVisualizer';
export type { VisualizerOptions } from './VoiceVisualizer';

// Voice → MCP Pipeline (Phase 3: Spatial Brittney)
export { VoiceMCPPipeline } from './VoiceMCPPipeline';
export type { VoiceMCPConfig, VoicePipelineResult, MCPToolCall, MCPToolResult } from './VoiceMCPPipeline';

// Code Explainer
export { CodeExplainer } from './CodeExplainer';
export type { ExplanationResult, LineExplanation } from './CodeExplainer';

// Code Optimizer
export { CodeOptimizer } from './CodeOptimizer';
export type { OptimizationResult, OptimizationSuggestion, CodeMetrics } from './CodeOptimizer';

// Scene Perception (Brittney's "eyes")
export { serializeScene, serializeObjects } from './ScenePerception';
export type {
  ScenePerceptionOptions,
  ScenePerception,
  SerializedObject,
  WorldLike,
} from './ScenePerception';

// React Agent SDK Integration (Phase 4: Embodied VR Brittney Avatar)
export { ReactAgentAvatarBridge } from './react-agent/ReactAgentAvatarBridge';
export { useAvatarAgent } from './react-agent/useAvatarAgent';
export { VRAvatarAgentProvider, useAvatarAgentContext } from './react-agent/VRAvatarAgentProvider';
export type {
  AgentState,
  AvatarEmotion,
  AvatarGesture,
  AvatarToolCall,
  AgentStreamChunk,
  AgentAvatarBridgeConfig,
  UseAvatarAgentReturn,
  AgentMessage,
  VRAvatarAgentProviderProps,
} from './react-agent/types';
export {
  DEFAULT_AGENT_CONFIG,
  DEFAULT_STREAM_CONFIG,
  BRITTNEY_VR_SYSTEM_PROMPT,
} from './react-agent/types';

// TalkingHead Lip-Sync Integration (Phase 5: Audio-Driven Lip-Sync for Brittney)
export {
  TalkingHeadAdapter,
  createTalkingHeadAdapter,
  TalkingHeadLipSyncEngine,
  createTalkingHeadLipSyncEngine,
  TalkingHeadAvatarBridge,
  createTalkingHeadAvatarBridge,
  VISEME_ID_TO_CODE,
  VISEME_CODE_TO_ID,
  VISEME_TO_VRM_BLEND_SHAPES,
  VISEME_TO_SIMPLE_VRM,
  DEFAULT_BRITTNEY_TTS_CONFIG,
  DEFAULT_BRITTNEY_AVATAR_SPEC,
  DEFAULT_INTEGRATION_CONFIG as DEFAULT_TALKINGHEAD_INTEGRATION_CONFIG,
  DEFAULT_LIP_SYNC_CONFIG,
  DEFAULT_AVATAR_BRIDGE_CONFIG,
} from './talkinghead';

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
  TalkingHeadSpeakOptions,
  VisemeBlendShapeMapping,
  TalkingHeadIntegrationConfig,
  TalkingHeadAdapterState,
  TalkingHeadAdapterMetrics,
  VisemeFrame,
  LipSyncEngineConfig,
  LipSyncEngineMetrics,
  TalkingHeadAvatarBridgeConfig,
} from './talkinghead';

// Logger Interface
export { setHololandAILogger, resetLogger, type HololandAILogger } from './logger';

// Constants
export const HOLOLAND_AI_BRIDGE_VERSION = '1.0.0-alpha.2';

export const SUPPORTED_NATURAL_LANGUAGE_PATTERNS = [
  'create a [type] called [name]',
  'build a [structure] with [features]',
  'add a [object] to [location]',
  'connect [object1] to [object2]',
  'visualize [data]',
  'make a function called [name]',
];

export const SUPPORTED_VOICE_COMMANDS = [
  'create',
  'build',
  'add',
  'remove',
  'connect',
  'disconnect',
  'move',
  'rotate',
  'resize',
  'color',
  'visualize',
  'help',
];

// Template categories
export const TEMPLATE_CATEGORIES = {
  commerce: ['coffee-shop', 'retail-store', 'restaurant', 'market'],
  workspace: ['office', 'coworking-space', 'meeting-room', 'studio'],
  entertainment: ['art-gallery', 'museum', 'theater', 'game-room'],
  social: ['lounge', 'cafe', 'park', 'plaza'],
};

// Utility Functions
export function createAIBridge(config?: import('./HololandAIBridge').AIBridgeConfig) {
  const bridge = new (require('./HololandAIBridge').HololandAIBridge)(config);
  return bridge;
}

export function isVoiceSupported(): boolean {
  return (require('./VoiceProcessor').VoiceProcessor as typeof import('./VoiceProcessor').VoiceProcessor).isWebSpeechSupported();
}

// Export everything as default for convenience
import { HololandAIBridge } from './HololandAIBridge';
import { NaturalLanguageTranslator } from './NaturalLanguageTranslator';
import { VoiceProcessor } from './VoiceProcessor';
import { CodeExplainer } from './CodeExplainer';
import { CodeOptimizer } from './CodeOptimizer';

import { VoiceVisualizer } from './VoiceVisualizer';
import { VoiceMCPPipeline } from './VoiceMCPPipeline';
import { serializeScene, serializeObjects } from './ScenePerception';

import { ReactAgentAvatarBridge } from './react-agent/ReactAgentAvatarBridge';
import { useAvatarAgent } from './react-agent/useAvatarAgent';
import { VRAvatarAgentProvider, useAvatarAgentContext } from './react-agent/VRAvatarAgentProvider';

import { TalkingHeadAvatarBridge, createTalkingHeadAvatarBridge } from './talkinghead';

export default {
  HololandAIBridge,
  NaturalLanguageTranslator,
  VoiceProcessor,
  VoiceVisualizer,
  VoiceMCPPipeline,
  CodeExplainer,
  CodeOptimizer,
  serializeScene,
  serializeObjects,
  ReactAgentAvatarBridge,
  useAvatarAgent,
  VRAvatarAgentProvider,
  useAvatarAgentContext,
  TalkingHeadAvatarBridge,
  createTalkingHeadAvatarBridge,
  createAIBridge,
  isVoiceSupported,
  HOLOLAND_AI_BRIDGE_VERSION,
  SUPPORTED_NATURAL_LANGUAGE_PATTERNS,
  SUPPORTED_VOICE_COMMANDS,
  TEMPLATE_CATEGORIES,
};
