/**
 * @hololand/core
 *
 * Hololand platform core - extends @holoscript/core with platform features.
 *
 * The HoloScript parser and runtime come from the open-source @holoscript/core package (MIT).
 * This package adds Hololand-specific features under the Elastic License 2.0.
 */

// Re-export from @holoscript/core (MIT licensed)
// NOTE: HoloScript v3.42.0 game engine has different export structure than when
// HoloLand was originally built. Many exports have been renamed or removed.
// Full migration to v3.42.0 API required.

// Minimal working exports (confirmed to exist in v3.42.0)
export {
  HoloScriptRuntime,
  HoloScriptDebugger,
  createHoloScriptEnvironment,
  isHoloScriptSupported,
  HOLOSCRIPT_VERSION,
  HOLOSCRIPT_DEMO_SCRIPTS,
  createRuntime,
  createParser,
} from '@holoscript/core';

// DISABLED: These exports don't exist or have different names in v3.42.0
// Uncomment and fix after migrating to new HoloScript game engine API
/*
export {
  HoloScriptParser,           // ❌ Use HoloScriptPlusParser instead?
  HoloScript2DParser,          // ❌ Use HoloScriptPlusParser instead?
  HoloScriptCodeParser,        // ❌ Use HoloScriptPlusParser instead?
  HoloScriptValidator,         // ❌ Check new validation API
  setHoloScriptLogger,         // ❌ Check logger API
  resetLogger,                 // ❌ Check logger API
  enableConsoleLogging,        // ❌ Check logger API
  NoOpLogger,                  // ❌ Check logger API
  ConsoleLogger,               // ❌ Check logger API
  HOLOSCRIPT_SUPPORTED_PLATFORMS,  // ❌ May be renamed
  HOLOSCRIPT_VOICE_COMMANDS,       // ❌ May be renamed
  HOLOSCRIPT_GESTURES,             // ❌ May be renamed

  // Types - may not be exported at top level anymore
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
  type GateNode,              // ❌ Doesn't exist, use ASTNode?
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
  type HoloScriptLogger,      // ❌ Renamed to HoloScriptDebugger
  type ValidationError,
} from '@holoscript/core';
*/

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
// DISABLED: Missing directory - HoloScript v3.42.0 migration needed
// export * from './holoscript';

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
