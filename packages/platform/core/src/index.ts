/**
 * @hololand/core
 *
 * Hololand platform core - extends @holoscript/core with platform features.
 *
 * The HoloScript parser and runtime come from the open-source @holoscript/core package (MIT).
 * This package adds Hololand-specific features under the Elastic License 2.0.
 */

// Re-export everything from @holoscript/core (MIT licensed)
export {
  // Core Engine
  HoloScriptParser,
  HoloScriptRuntime,
  HoloScript2DParser,
  HoloScriptCodeParser,
  HoloScriptValidator,

  // Logger
  setHoloScriptLogger,
  resetLogger,
  enableConsoleLogging,
  NoOpLogger,
  ConsoleLogger,

  // Constants
  HOLOSCRIPT_VERSION,
  HOLOSCRIPT_SUPPORTED_PLATFORMS,
  HOLOSCRIPT_VOICE_COMMANDS,
  HOLOSCRIPT_GESTURES,
  HOLOSCRIPT_DEMO_SCRIPTS,

  // Utility Functions
  createHoloScriptEnvironment,
  isHoloScriptSupported,

  // Types
  type SpatialPosition,
  type Position2D,
  type Size2D,
  type HologramProperties,
  type VoiceCommand,
  type GestureData,
  type ASTNode,
  type OrbNode,
  type MethodNode,
  type ParameterNode,
  type ConnectionNode,
  type GateNode,
  type StreamNode,
  type TransformationNode,
  type UI2DNode,
  type UIElementType,
  type UIStyle,
  type RuntimeContext,
  type ExecutionResult,
  type ParticleSystem,
  type ParseResult,
  type ParseError,
  type HoloScriptLogger,
  type ValidationError,
} from '@holoscript/core';

// Hololand version (platform version, separate from HoloScript language version)
export const HOLOLAND_VERSION = '1.0.0-alpha.1';

// HoloScript-to-World Bridge (connects HoloScript runtime to Hololand world)
export { HoloScriptBridge, createBridge, type BridgeConfig, type BridgeState } from './HoloScriptBridge';

// Trait Context Factory — creates real TraitContext backed by Hololand runtime APIs
export {
  TraitContextFactory,
  createTraitContextFactory,
  type TraitContextFactoryConfig,
  type PhysicsProvider,
  type AudioProvider,
  type HapticsProvider,
  type AccessibilityProvider,
  type VRProvider,
  type NetworkProvider,
  type RendererProvider,
} from './TraitContextFactory';

// Trait Runtime Integration — wires VRTraitRegistry into Hololand's frame loop
export {
  TraitRuntimeIntegration,
  createTraitRuntime,
  type TrackedNode,
  type TraitRuntimeStats,
} from './TraitRuntimeIntegration';

export * from './HoloScriptBridge';
export * from './TraitContextFactory';
export * from './TraitRuntimeIntegration';
export * from './PlatformRuntime';
export * from './holoscript';

// Phase 5: Self-Building World — Hot-reload & Git integration
export {
  HoloScriptHotReloader,
  createHotReloader,
  type HotReloaderConfig,
  type FileChange,
  type PatchResult,
  type HotReloaderStats,
} from './HoloScriptHotReloader';

export {
  VRGitIntegration,
  createVRGitIntegration,
  type GitConfig,
  type CommitInfo,
  type GitOperationResult,
  type RollbackResult,
  type SnapshotResult,
} from './VRGitIntegration';
