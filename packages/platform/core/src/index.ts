/**
 * @hololand/core
 *
 * Hololand platform core - extends @holoscript/core with platform features.
 *
 * The HoloScript parser and runtime come from the open-source @holoscript/core package (MIT).
 * This package adds Hololand-specific features under the Elastic License 2.0.
 */

// =============================================================================
// Re-exports from @holoscript/core v3.43.0 (MIT licensed)
// =============================================================================

// Parsers
export {
  HoloScriptParser,
  HoloScript2DParser,
  HoloScriptPlusParser,
  createParser,
  parseHoloScriptPlus,
  HoloCompositionParser,
  parseHolo,
  parseHoloStrict,
} from '@holoscript/core';

// Validator & Code Parser
export { HoloScriptValidator, type ValidationError } from '@holoscript/core';
export { HoloScriptCodeParser } from '@holoscript/core';

// Runtime
export { HoloScriptRuntime, HoloScriptPlusRuntimeImpl, createRuntime } from '@holoscript/core';

// Debugger
export {
  HoloScriptDebugger,
  createDebugger,
  type Breakpoint,
  type StackFrame,
  type DebugState,
  type DebugEvent,
  type StepMode,
} from '@holoscript/core';

// Logger
export {
  setHoloScriptLogger,
  enableConsoleLogging,
  resetLogger,
  NoOpLogger,
  ConsoleLogger,
  type HoloScriptLogger,
} from '@holoscript/core';

// Environment & Capabilities
export {
  createHoloScriptEnvironment,
  isHoloScriptSupported,
  HOLOSCRIPT_VERSION,
  HOLOSCRIPT_DEMO_SCRIPTS,
  HOLOSCRIPT_SUPPORTED_PLATFORMS,
  HOLOSCRIPT_VOICE_COMMANDS,
  HOLOSCRIPT_GESTURES,
} from '@holoscript/core';

// VR Traits
export { VRTraitRegistry, vrTraitRegistry } from '@holoscript/core';

// Core Types
export type {
  // Spatial
  SpatialPosition,
  Position2D,
  Size2D,

  // Hologram
  HologramProperties,

  // Input
  VoiceCommand,
  GestureData,

  // AST Nodes
  ASTNode,
  OrbNode,
  MethodNode,
  ParameterNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  TransformationNode,

  // 2D UI
  UIElementType,
  UI2DNode,
  UIStyle,

  // Runtime
  RuntimeContext,
  ExecutionResult,
  ParticleSystem,
} from '@holoscript/core';

// Composition Types
export type {
  HoloComposition,
  HoloEnvironment,
  HoloState,
  HoloTemplate,
  HoloObjectDecl,
  HoloSpatialGroup,
  HoloLogic,
  HoloAction,
  HoloImport,
  HoloParseResult,
  HoloParseError,
} from '@holoscript/core';

// Compilers
export {
  R3FCompiler,
  UnityCompiler,
  GodotCompiler,
  VisionOSCompiler,
  VRChatCompiler,
  UnrealCompiler,
} from '@holoscript/core';

// R3F Types (used by renderers in @hololand/react-three and @holoscript/r3f-renderer)
export type { R3FNode, HSPlusAST } from '@holoscript/core';

// Material System
export { MATERIAL_PRESETS } from '@holoscript/core';
export type { MaterialDefinition, HoloMaterialType } from '@holoscript/core';

// Shader System
export { ShaderTrait, SHADER_PRESETS, createShaderTrait } from '@holoscript/core';

// State Management
export { ReactiveState, createState, reactive, effect, computed, bind } from '@holoscript/core';

// =============================================================================
// Hololand Platform (Elastic License 2.0)
// =============================================================================

// Hololand version (platform version, separate from HoloScript language version)
export const HOLOLAND_VERSION = '1.0.0-alpha.1';

// HoloScript-to-World Bridge (connects HoloScript runtime to Hololand world)
export {
  HoloScriptBridge,
  createBridge,
  type BridgeConfig,
  type BridgeState,
} from './HoloScriptBridge';

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

// Physics Safety Envelope — immutable platform-level physics bounds
export {
  PHYSICS_SAFETY_ENVELOPE,
  clampSymmetric,
  clampRange,
  vectorMagnitude,
  clampVectorMagnitude,
  enforceLinearVelocity,
  enforceAngularVelocity,
  enforceForce,
  enforceImpulse,
  enforceGravityScale,
  enforceMass,
  enforcePosition,
  validateEnvelope,
  type PhysicsSafetyBounds,
  type ClampEvent,
} from './PhysicsSafetyEnvelope';

export {
  PhysicsSafetyEnforcer,
  createPhysicsSafetyEnforcer,
  wrapWithSafetyEnvelope,
  type ClampEventHandler,
  type PhysicsSafetyEnforcerConfig,
  type SafetyEnforcerStats,
} from './PhysicsSafetyEnforcer';

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

// Cross-Validation Protocol — 3-validator consensus for multi-agent world creation
export {
  // Engine
  CrossValidationEngine,
  createCrossValidationEngine,
  createCustomCrossValidationEngine,
  createStateDelta,
  // Validators
  PhysicsValidator,
  createPhysicsValidator,
  MaterialsValidator,
  createMaterialsValidator,
  SchemaValidator,
  createSchemaValidator,
} from './validation';

export type {
  // Core Types
  ValidatorId,
  ValidationVerdict,
  StateDeltaCategory,
  StateDelta,
  StateDeltaPayload,
  PhysicsDeltaPayload,
  MaterialDeltaPayload,
  TraitDeltaPayload,
  TransformDeltaPayload,
  WorldDeltaPayload,
  CompositeDeltaPayload,
  ValidationResult,
  ValidationViolation,
  ConsensusResult,
  Validator,
  CrossValidationConfig,
  CrossValidationStats,
} from './validation';
