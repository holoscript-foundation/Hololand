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

// Logger Interface
export { setHololandAILogger, resetLogger, type HololandAILogger } from './logger';

// Constants
export const HOLOLAND_AI_BRIDGE_VERSION = '1.0.0-alpha.1';

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
  createAIBridge,
  isVoiceSupported,
  HOLOLAND_AI_BRIDGE_VERSION,
  SUPPORTED_NATURAL_LANGUAGE_PATTERNS,
  SUPPORTED_VOICE_COMMANDS,
  TEMPLATE_CATEGORIES,
};
