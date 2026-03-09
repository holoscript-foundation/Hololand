/**
 * WebGPU Compute Shader Controls
 *
 * Comprehensive UI components for WebGPU compute shader management,
 * including pipeline dispatch, fluid simulation, particle systems,
 * cloth simulation, GPU performance monitoring, and WGSL shader editing.
 *
 * All components integrate with the existing GPUContext from @hololand/renderer.
 *
 * @module webgpu-compute
 */

// =============================================================================
// COMPONENTS
// =============================================================================

export { ComputeShaderPanel } from './ComputeShaderPanel';
export { FluidSimulationControls } from './FluidSimulationControls';
export { ParticleSystemControls } from './ParticleSystemControls';
export { ClothSimulationControls } from './ClothSimulationControls';
export { GPUPerformanceOverlay } from './GPUPerformanceOverlay';
export { ShaderEditorPanel } from './ShaderEditorPanel';

// =============================================================================
// HOOKS
// =============================================================================

export {
  useComputeShaderPanel,
  useFluidSimulation,
  useParticleSystem,
  useClothSimulation,
  useGPUPerformance,
  useShaderEditor,
} from './useWebGPUCompute';

export type {
  UseComputeShaderPanelConfig,
  UseFluidSimulationConfig,
  UseParticleSystemConfig,
  UseClothSimulationConfig,
  UseGPUPerformanceConfig,
  UseShaderEditorConfig,
} from './useWebGPUCompute';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Pipeline & Dispatch
  PipelineStatus,
  WorkgroupSize,
  DispatchSize,
  ComputePipelineState,
  ComputeShaderPanelState,
  ComputeShaderPanelActions,

  // Fluid Simulation
  FluidSolverType,
  BoundaryCondition,
  FluidSimulationParams,
  VelocityFieldDisplay,
  FluidSimulationState,
  FluidSimulationActions,

  // Particle System
  EmitterShape,
  ForceFieldType,
  GradientStop,
  ForceField,
  ParticleSystemParams,
  ParticleSystemState,
  ParticleSystemActions,

  // Cloth Simulation
  ClothIntegrationMethod,
  PinPoint,
  ClothSimulationParams,
  ClothSimulationState,
  ClothSimulationActions,

  // GPU Performance
  GPUPerformanceSample,
  GPUBufferInfo,
  GPUPerformanceOverlayState,
  GPUPerfPanel,
  GPUPerformanceOverlayActions,

  // Shader Editor
  ShaderCompilationStatus,
  ShaderCompilationError,
  WGSLTokenType,
  ShaderEditorState,
  ShaderEditorActions,

  // Component Props
  ComputeShaderPanelProps,
  FluidSimulationControlsProps,
  ParticleSystemControlsProps,
  ClothSimulationControlsProps,
  GPUPerformanceOverlayProps,
  ShaderEditorPanelProps,

  // Theme
  WebGPUComputeTheme,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  DEFAULT_WEBGPU_COMPUTE_THEME,
  MAX_PARTICLE_COUNT,
  DEFAULT_FLUID_PARAMS,
  DEFAULT_PARTICLE_PARAMS,
  DEFAULT_CLOTH_PARAMS,
  WGSL_TEMPLATES,
  WGSL_KEYWORDS,
  WGSL_TYPES,
  WGSL_BUILTINS,
  WGSL_ATTRIBUTES,
  VELOCITY_FIELD_LABELS,
  FORCE_FIELD_LABELS,
  EMITTER_SHAPE_LABELS,
} from './types';
