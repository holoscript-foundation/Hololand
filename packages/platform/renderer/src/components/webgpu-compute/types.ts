/**
 * WebGPU Compute Shader Controls - Type Definitions
 *
 * Comprehensive type system for WebGPU compute shader visualization
 * and control components. Covers pipeline management, fluid simulation,
 * particle systems, cloth simulation, GPU performance monitoring,
 * and WGSL shader editing.
 *
 * @module webgpu-compute/types
 */

// =============================================================================
// PIPELINE & DISPATCH
// =============================================================================

/**
 * Status of a compute pipeline
 */
export type PipelineStatus = 'idle' | 'compiling' | 'ready' | 'dispatching' | 'error';

/**
 * Workgroup size configuration (x, y, z)
 */
export interface WorkgroupSize {
  x: number;
  y: number;
  z: number;
}

/**
 * Workgroup dispatch dimensions
 */
export interface DispatchSize {
  x: number;
  y: number;
  z: number;
}

/**
 * A registered compute pipeline's state
 */
export interface ComputePipelineState {
  /** Pipeline name / identifier */
  name: string;
  /** Current status */
  status: PipelineStatus;
  /** WGSL shader source */
  shaderSource: string;
  /** Workgroup size defined in the shader */
  workgroupSize: WorkgroupSize;
  /** Dispatch dimensions */
  dispatchSize: DispatchSize;
  /** Total invocations (workgroup * dispatch) */
  totalInvocations: number;
  /** Last dispatch time (ms) */
  lastDispatchTimeMs: number;
  /** Error message, if status is 'error' */
  errorMessage: string | null;
  /** Number of bind groups */
  bindGroupCount: number;
  /** Buffer sizes in bytes */
  bufferSizes: number[];
  /** Creation timestamp */
  createdAt: number;
  /** Last dispatch timestamp */
  lastDispatchedAt: number | null;
}

/**
 * Compute shader panel state
 */
export interface ComputeShaderPanelState {
  /** All registered pipelines */
  pipelines: ComputePipelineState[];
  /** Currently selected pipeline name */
  selectedPipeline: string | null;
  /** Whether auto-dispatch is enabled */
  autoDispatch: boolean;
  /** Auto-dispatch interval (ms) */
  autoDispatchIntervalMs: number;
  /** Global pipeline status summary */
  statusSummary: Record<PipelineStatus, number>;
}

/**
 * Compute shader panel actions
 */
export interface ComputeShaderPanelActions {
  /** Select a pipeline */
  selectPipeline: (name: string) => void;
  /** Dispatch a specific pipeline */
  dispatchPipeline: (name: string) => void;
  /** Dispatch all ready pipelines */
  dispatchAll: () => void;
  /** Update workgroup size for a pipeline */
  setWorkgroupSize: (name: string, size: WorkgroupSize) => void;
  /** Update dispatch size for a pipeline */
  setDispatchSize: (name: string, size: DispatchSize) => void;
  /** Toggle auto-dispatch */
  toggleAutoDispatch: () => void;
  /** Set auto-dispatch interval */
  setAutoDispatchInterval: (ms: number) => void;
  /** Reset a pipeline */
  resetPipeline: (name: string) => void;
}

// =============================================================================
// FLUID SIMULATION
// =============================================================================

/**
 * Fluid simulation solver type
 */
export type FluidSolverType = 'euler' | 'navier-stokes' | 'lattice-boltzmann' | 'sph';

/**
 * Boundary condition type
 */
export type BoundaryCondition = 'no-slip' | 'free-slip' | 'periodic' | 'open';

/**
 * Fluid simulation parameters
 */
export interface FluidSimulationParams {
  /** Fluid viscosity coefficient */
  viscosity: number;
  /** Simulation timestep (seconds) */
  timestep: number;
  /** Grid resolution (NxN or NxNxN) */
  gridResolution: number;
  /** Grid dimensionality */
  dimensions: 2 | 3;
  /** Density of the fluid */
  density: number;
  /** External force (gravity) */
  gravity: [number, number, number];
  /** Diffusion rate */
  diffusion: number;
  /** Pressure solver iterations */
  pressureIterations: number;
  /** Solver type */
  solverType: FluidSolverType;
  /** Boundary condition */
  boundaryCondition: BoundaryCondition;
  /** Vorticity confinement strength */
  vorticityConfinement: number;
}

/**
 * Velocity field visualization mode
 */
export type VelocityFieldDisplay =
  | 'arrows'
  | 'streamlines'
  | 'lic'
  | 'color-magnitude'
  | 'vorticity'
  | 'pressure'
  | 'density'
  | 'none';

/**
 * Fluid simulation state
 */
export interface FluidSimulationState {
  /** Simulation parameters */
  params: FluidSimulationParams;
  /** Whether simulation is running */
  running: boolean;
  /** Current simulation step */
  step: number;
  /** Elapsed simulation time */
  elapsedTime: number;
  /** Velocity field display mode */
  velocityFieldDisplay: VelocityFieldDisplay;
  /** Maximum velocity in the field */
  maxVelocity: number;
  /** Average pressure */
  avgPressure: number;
  /** Total kinetic energy */
  kineticEnergy: number;
  /** Steps per second (performance metric) */
  stepsPerSecond: number;
  /** GPU buffer usage (bytes) */
  gpuBufferUsage: number;
}

/**
 * Fluid simulation actions
 */
export interface FluidSimulationActions {
  /** Start/resume the simulation */
  start: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Step forward one frame */
  stepForward: () => void;
  /** Update simulation parameters */
  setParams: (params: Partial<FluidSimulationParams>) => void;
  /** Set velocity field display mode */
  setVelocityFieldDisplay: (mode: VelocityFieldDisplay) => void;
  /** Add impulse force at a point */
  addImpulse: (x: number, y: number, force: number) => void;
  /** Add dye/density source */
  addDensitySource: (x: number, y: number, amount: number) => void;
}

// =============================================================================
// PARTICLE SYSTEM
// =============================================================================

/**
 * Emitter shape type
 */
export type EmitterShape = 'point' | 'sphere' | 'box' | 'cone' | 'disk' | 'line';

/**
 * Force field type
 */
export type ForceFieldType = 'gravity' | 'wind' | 'vortex' | 'attractor' | 'repulsor' | 'turbulence' | 'curl-noise';

/**
 * A color gradient stop
 */
export interface GradientStop {
  /** Position along the gradient (0-1) */
  position: number;
  /** RGBA color */
  color: [number, number, number, number];
}

/**
 * Force field definition
 */
export interface ForceField {
  /** Force field type */
  type: ForceFieldType;
  /** Position in world space */
  position: [number, number, number];
  /** Strength of the force */
  strength: number;
  /** Radius of influence */
  radius: number;
  /** Whether the field is active */
  enabled: boolean;
  /** Additional parameters (direction for wind, axis for vortex, etc.) */
  direction?: [number, number, number];
  /** Falloff exponent */
  falloff: number;
}

/**
 * Particle system parameters
 */
export interface ParticleSystemParams {
  /** Maximum particle count (up to 1,000,000) */
  maxParticles: number;
  /** Current active particle count */
  activeParticles: number;
  /** Emission rate (particles per second) */
  emissionRate: number;
  /** Particle lifetime range (seconds) */
  lifetimeRange: [number, number];
  /** Initial speed range */
  speedRange: [number, number];
  /** Particle size range */
  sizeRange: [number, number];
  /** Emitter position */
  emitterPosition: [number, number, number];
  /** Emitter shape */
  emitterShape: EmitterShape;
  /** Emitter radius (for sphere/cone/disk shapes) */
  emitterRadius: number;
  /** Active force fields */
  forceFields: ForceField[];
  /** Color gradient over particle lifetime */
  colorGradient: GradientStop[];
  /** Size over lifetime curve (normalized 0-1) */
  sizeOverLifetime: [number, number][];
  /** Whether to use billboarding */
  billboard: boolean;
  /** Sort by distance to camera */
  depthSort: boolean;
}

/**
 * Particle system state
 */
export interface ParticleSystemState {
  /** System parameters */
  params: ParticleSystemParams;
  /** Whether the system is emitting */
  emitting: boolean;
  /** Total particles spawned */
  totalSpawned: number;
  /** GPU compute dispatch time (ms) */
  computeTimeMs: number;
  /** GPU buffer memory usage (bytes) */
  gpuMemoryUsage: number;
  /** FPS impact */
  fpsImpact: number;
}

/**
 * Particle system actions
 */
export interface ParticleSystemActions {
  /** Start emitting */
  startEmitting: () => void;
  /** Stop emitting (existing particles continue) */
  stopEmitting: () => void;
  /** Kill all particles */
  killAll: () => void;
  /** Burst emit N particles */
  burst: (count: number) => void;
  /** Update parameters */
  setParams: (params: Partial<ParticleSystemParams>) => void;
  /** Set emitter position */
  setEmitterPosition: (pos: [number, number, number]) => void;
  /** Add a force field */
  addForceField: (field: ForceField) => void;
  /** Remove a force field by index */
  removeForceField: (index: number) => void;
  /** Update a force field */
  updateForceField: (index: number, field: Partial<ForceField>) => void;
  /** Set color gradient */
  setColorGradient: (stops: GradientStop[]) => void;
  /** Add a gradient stop */
  addGradientStop: (stop: GradientStop) => void;
  /** Remove a gradient stop by index */
  removeGradientStop: (index: number) => void;
}

// =============================================================================
// CLOTH SIMULATION
// =============================================================================

/**
 * Cloth integration method
 */
export type ClothIntegrationMethod = 'verlet' | 'pbd' | 'xpbd';

/**
 * Pin point definition (fixed vertex)
 */
export interface PinPoint {
  /** Vertex index in the cloth mesh */
  vertexIndex: number;
  /** World position of the pin */
  position: [number, number, number];
  /** Whether the pin is currently active */
  enabled: boolean;
  /** Label for the pin */
  label: string;
}

/**
 * Cloth simulation parameters
 */
export interface ClothSimulationParams {
  /** Number of constraint solver iterations */
  constraintIterations: number;
  /** Wind force vector */
  windForce: [number, number, number];
  /** Gravity vector */
  gravity: [number, number, number];
  /** Cloth mass per vertex */
  mass: number;
  /** Structural stiffness (0-1) */
  structuralStiffness: number;
  /** Shear stiffness (0-1) */
  shearStiffness: number;
  /** Bend stiffness (0-1) */
  bendStiffness: number;
  /** Damping coefficient */
  damping: number;
  /** Timestep for integration */
  timestep: number;
  /** Cloth grid width (vertices) */
  gridWidth: number;
  /** Cloth grid height (vertices) */
  gridHeight: number;
  /** Total vertex count */
  vertexCount: number;
  /** Total constraint count */
  constraintCount: number;
  /** Integration method */
  integrationMethod: ClothIntegrationMethod;
  /** Self-collision detection */
  selfCollision: boolean;
  /** Ground plane collision height */
  groundPlane: number | null;
  /** Pin points (fixed vertices) */
  pinPoints: PinPoint[];
  /** Wind turbulence frequency */
  windTurbulence: number;
  /** Wind turbulence amplitude */
  windTurbulenceAmplitude: number;
}

/**
 * Cloth simulation state
 */
export interface ClothSimulationState {
  /** Simulation parameters */
  params: ClothSimulationParams;
  /** Whether the simulation is running */
  running: boolean;
  /** Current simulation step */
  step: number;
  /** Compute time per frame (ms) */
  computeTimeMs: number;
  /** Constraint solve time (ms) */
  constraintSolveMs: number;
  /** Max constraint error (convergence metric) */
  maxConstraintError: number;
  /** GPU buffer usage (bytes) */
  gpuBufferUsage: number;
}

/**
 * Cloth simulation actions
 */
export interface ClothSimulationActions {
  /** Start/resume simulation */
  start: () => void;
  /** Pause simulation */
  pause: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Step forward one frame */
  stepForward: () => void;
  /** Update parameters */
  setParams: (params: Partial<ClothSimulationParams>) => void;
  /** Add a pin point */
  addPin: (pin: PinPoint) => void;
  /** Remove a pin point */
  removePin: (index: number) => void;
  /** Toggle a pin point */
  togglePin: (index: number) => void;
  /** Release all pins */
  releaseAllPins: () => void;
  /** Set wind force */
  setWindForce: (force: [number, number, number]) => void;
  /** Set gravity */
  setGravity: (gravity: [number, number, number]) => void;
}

// =============================================================================
// GPU PERFORMANCE
// =============================================================================

/**
 * GPU performance sample
 */
export interface GPUPerformanceSample {
  /** Timestamp (ms) */
  timestamp: number;
  /** Compute dispatch time (ms) */
  dispatchTimeMs: number;
  /** Memory bandwidth utilization (0-1) */
  memoryBandwidth: number;
  /** Compute occupancy (0-1) */
  occupancy: number;
  /** Total buffer memory (bytes) */
  totalBufferMemory: number;
  /** Active pipelines */
  activePipelines: number;
  /** Dispatches per frame */
  dispatchesPerFrame: number;
}

/**
 * GPU buffer info
 */
export interface GPUBufferInfo {
  /** Buffer label/name */
  label: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Usage flags description */
  usage: string;
  /** Whether buffer is mapped */
  mapped: boolean;
}

/**
 * GPU performance overlay state
 */
export interface GPUPerformanceOverlayState {
  /** Performance history samples */
  samples: GPUPerformanceSample[];
  /** Current sample */
  current: GPUPerformanceSample;
  /** Average dispatch time over window */
  avgDispatchTimeMs: number;
  /** Peak dispatch time over window */
  peakDispatchTimeMs: number;
  /** Memory bandwidth average */
  avgMemoryBandwidth: number;
  /** Occupancy average */
  avgOccupancy: number;
  /** Total GPU buffer memory */
  totalBufferMemory: number;
  /** Buffer details */
  buffers: GPUBufferInfo[];
  /** GPU adapter info */
  adapterInfo: {
    vendor: string;
    architecture: string;
    description: string;
    maxComputeWorkgroupSizeX: number;
    maxComputeWorkgroupSizeY: number;
    maxComputeWorkgroupSizeZ: number;
    maxComputeInvocationsPerWorkgroup: number;
    maxComputeWorkgroupsPerDimension: number;
    maxStorageBufferBindingSize: number;
  } | null;
  /** Whether overlay is visible */
  visible: boolean;
  /** Active display panel */
  activePanel: GPUPerfPanel;
}

/**
 * GPU performance panel
 */
export type GPUPerfPanel = 'dispatch' | 'memory' | 'occupancy' | 'buffers' | 'adapter';

/**
 * GPU performance overlay actions
 */
export interface GPUPerformanceOverlayActions {
  /** Toggle visibility */
  toggleVisibility: () => void;
  /** Set active panel */
  setActivePanel: (panel: GPUPerfPanel) => void;
  /** Clear performance history */
  clearHistory: () => void;
  /** Force a performance snapshot */
  takeSnapshot: () => void;
}

// =============================================================================
// SHADER EDITOR
// =============================================================================

/**
 * Shader compilation status
 */
export type ShaderCompilationStatus = 'idle' | 'compiling' | 'success' | 'error';

/**
 * Shader compilation error
 */
export interface ShaderCompilationError {
  /** Error message */
  message: string;
  /** Line number (if available) */
  lineNumber: number | null;
  /** Column number (if available) */
  columnNumber: number | null;
  /** Error severity */
  severity: 'error' | 'warning' | 'info';
}

/**
 * WGSL syntax token type for highlighting
 */
export type WGSLTokenType =
  | 'keyword'
  | 'type'
  | 'builtin'
  | 'function'
  | 'number'
  | 'string'
  | 'comment'
  | 'operator'
  | 'attribute'
  | 'variable'
  | 'constant';

/**
 * Shader editor state
 */
export interface ShaderEditorState {
  /** Current shader source code */
  source: string;
  /** Compilation status */
  compilationStatus: ShaderCompilationStatus;
  /** Compilation errors/warnings */
  errors: ShaderCompilationError[];
  /** Whether source has unsaved changes */
  dirty: boolean;
  /** Last successful compilation timestamp */
  lastCompiledAt: number | null;
  /** Compilation time (ms) */
  compilationTimeMs: number;
  /** Active shader pipeline name */
  activePipeline: string | null;
  /** Editor line count */
  lineCount: number;
  /** Cursor position */
  cursorPosition: { line: number; column: number };
  /** Whether line numbers are shown */
  showLineNumbers: boolean;
  /** Font size */
  fontSize: number;
}

/**
 * Shader editor actions
 */
export interface ShaderEditorActions {
  /** Set the shader source */
  setSource: (source: string) => void;
  /** Compile the current shader */
  compile: () => void;
  /** Compile and dispatch */
  compileAndDispatch: () => void;
  /** Load a shader template */
  loadTemplate: (name: string) => void;
  /** Set the target pipeline */
  setActivePipeline: (name: string) => void;
  /** Set cursor position */
  setCursorPosition: (line: number, column: number) => void;
  /** Toggle line numbers */
  toggleLineNumbers: () => void;
  /** Set font size */
  setFontSize: (size: number) => void;
  /** Format/prettify the source */
  formatSource: () => void;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * ComputeShaderPanel props
 */
export interface ComputeShaderPanelProps {
  /** External pipeline states */
  pipelines?: ComputePipelineState[];
  /** Whether auto-dispatch is active */
  autoDispatch?: boolean;
  /** Auto-dispatch interval */
  autoDispatchIntervalMs?: number;
  /** Dispatch callback */
  onDispatch?: (pipelineName: string) => void;
  /** Workgroup size change callback */
  onWorkgroupSizeChange?: (pipelineName: string, size: WorkgroupSize) => void;
  /** Dispatch size change callback */
  onDispatchSizeChange?: (pipelineName: string, size: DispatchSize) => void;
  /** Custom CSS class */
  className?: string;
  /** Whether panel is visible */
  visible?: boolean;
}

/**
 * FluidSimulationControls props
 */
export interface FluidSimulationControlsProps {
  /** External simulation state */
  simulationState?: Partial<FluidSimulationState>;
  /** Parameter change callback */
  onParamsChange?: (params: Partial<FluidSimulationParams>) => void;
  /** Start callback */
  onStart?: () => void;
  /** Pause callback */
  onPause?: () => void;
  /** Reset callback */
  onReset?: () => void;
  /** Velocity field display change callback */
  onVelocityFieldDisplayChange?: (mode: VelocityFieldDisplay) => void;
  /** Custom CSS class */
  className?: string;
  /** Whether controls are visible */
  visible?: boolean;
}

/**
 * ParticleSystemControls props
 */
export interface ParticleSystemControlsProps {
  /** External system state */
  systemState?: Partial<ParticleSystemState>;
  /** Parameter change callback */
  onParamsChange?: (params: Partial<ParticleSystemParams>) => void;
  /** Emit toggle callback */
  onEmitToggle?: (emitting: boolean) => void;
  /** Burst callback */
  onBurst?: (count: number) => void;
  /** Force field change callback */
  onForceFieldChange?: (fields: ForceField[]) => void;
  /** Gradient change callback */
  onGradientChange?: (stops: GradientStop[]) => void;
  /** Custom CSS class */
  className?: string;
  /** Whether controls are visible */
  visible?: boolean;
}

/**
 * ClothSimulationControls props
 */
export interface ClothSimulationControlsProps {
  /** External simulation state */
  simulationState?: Partial<ClothSimulationState>;
  /** Parameter change callback */
  onParamsChange?: (params: Partial<ClothSimulationParams>) => void;
  /** Start callback */
  onStart?: () => void;
  /** Pause callback */
  onPause?: () => void;
  /** Reset callback */
  onReset?: () => void;
  /** Pin change callback */
  onPinChange?: (pins: PinPoint[]) => void;
  /** Custom CSS class */
  className?: string;
  /** Whether controls are visible */
  visible?: boolean;
}

/**
 * GPUPerformanceOverlay props
 */
export interface GPUPerformanceOverlayProps {
  /** External performance state */
  performanceState?: Partial<GPUPerformanceOverlayState>;
  /** Sample update interval (ms) */
  sampleIntervalMs?: number;
  /** Max history length */
  maxHistory?: number;
  /** Custom CSS class */
  className?: string;
  /** Whether overlay is visible */
  visible?: boolean;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * ShaderEditorPanel props
 */
export interface ShaderEditorPanelProps {
  /** Initial shader source */
  initialSource?: string;
  /** Target pipeline name */
  pipelineName?: string;
  /** Compile callback */
  onCompile?: (source: string) => ShaderCompilationError[];
  /** Compile and dispatch callback */
  onCompileAndDispatch?: (source: string) => void;
  /** Source change callback */
  onSourceChange?: (source: string) => void;
  /** Custom CSS class */
  className?: string;
  /** Whether editor is visible */
  visible?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * WebGPU compute controls theme
 */
export interface WebGPUComputeTheme {
  /** Background color */
  bg: string;
  /** Panel background */
  panelBg: string;
  /** Input/slider background */
  inputBg: string;
  /** Text color */
  text: string;
  /** Secondary text color */
  textSecondary: string;
  /** Accent color (buttons, sliders) */
  accent: string;
  /** Success color */
  success: string;
  /** Warning color */
  warning: string;
  /** Error color */
  error: string;
  /** Info color */
  info: string;
  /** Border color */
  border: string;
  /** Grid/separator color */
  grid: string;
  /** Compute shader specific accent */
  compute: string;
  /** Font family */
  fontFamily: string;
  /** Monospace font family (for code) */
  monoFontFamily: string;
  /** Base font size */
  fontSize: number;
}

/**
 * Default dark theme for WebGPU compute controls
 */
export const DEFAULT_WEBGPU_COMPUTE_THEME: WebGPUComputeTheme = {
  bg: '#0a0a1a',
  panelBg: '#101024',
  inputBg: '#181838',
  text: '#e0e0f0',
  textSecondary: '#8888aa',
  accent: '#7c3aed',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  border: '#2a2a4e',
  grid: '#1a1a3e',
  compute: '#a855f7',
  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  monoFontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontSize: 12,
};

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum particle count supported
 */
export const MAX_PARTICLE_COUNT = 1_000_000;

/**
 * Default fluid simulation parameters
 */
export const DEFAULT_FLUID_PARAMS: FluidSimulationParams = {
  viscosity: 0.001,
  timestep: 0.016,
  gridResolution: 128,
  dimensions: 2,
  density: 1.0,
  gravity: [0, -9.81, 0],
  diffusion: 0.0001,
  pressureIterations: 20,
  solverType: 'navier-stokes',
  boundaryCondition: 'no-slip',
  vorticityConfinement: 0.3,
};

/**
 * Default particle system parameters
 */
export const DEFAULT_PARTICLE_PARAMS: ParticleSystemParams = {
  maxParticles: 10_000,
  activeParticles: 0,
  emissionRate: 1000,
  lifetimeRange: [1.0, 3.0],
  speedRange: [0.5, 2.0],
  sizeRange: [0.01, 0.05],
  emitterPosition: [0, 0, 0],
  emitterShape: 'point',
  emitterRadius: 0.5,
  forceFields: [
    {
      type: 'gravity',
      position: [0, 0, 0],
      strength: 9.81,
      radius: Infinity,
      enabled: true,
      direction: [0, -1, 0],
      falloff: 0,
    },
  ],
  colorGradient: [
    { position: 0, color: [1, 0.8, 0.2, 1] },
    { position: 0.5, color: [1, 0.3, 0.1, 0.8] },
    { position: 1, color: [0.2, 0.05, 0.05, 0] },
  ],
  sizeOverLifetime: [
    [0, 0.5],
    [0.3, 1.0],
    [0.7, 0.8],
    [1.0, 0],
  ],
  billboard: true,
  depthSort: true,
};

/**
 * Default cloth simulation parameters
 */
export const DEFAULT_CLOTH_PARAMS: ClothSimulationParams = {
  constraintIterations: 10,
  windForce: [0.5, 0, 0.2],
  gravity: [0, -9.81, 0],
  mass: 1.0,
  structuralStiffness: 0.9,
  shearStiffness: 0.7,
  bendStiffness: 0.3,
  damping: 0.99,
  timestep: 0.016,
  gridWidth: 32,
  gridHeight: 32,
  vertexCount: 1024,
  constraintCount: 3968,
  integrationMethod: 'pbd',
  selfCollision: false,
  groundPlane: -2.0,
  pinPoints: [
    { vertexIndex: 0, position: [-1, 1, 0], enabled: true, label: 'Top-Left' },
    { vertexIndex: 31, position: [1, 1, 0], enabled: true, label: 'Top-Right' },
  ],
  windTurbulence: 2.0,
  windTurbulenceAmplitude: 0.3,
};

/**
 * WGSL shader templates
 */
export const WGSL_TEMPLATES: Record<string, string> = {
  'basic-compute': `@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= arrayLength(&data)) {
    return;
  }
  data[index] = data[index] * 2.0;
}`,

  'particle-update': `struct Particle {
  position: vec3f,
  velocity: vec3f,
  lifetime: f32,
  age: f32,
}

struct SimParams {
  deltaTime: f32,
  gravity: vec3f,
  emitterPos: vec3f,
  maxParticles: u32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= params.maxParticles) {
    return;
  }

  var p = particles[index];
  p.age += params.deltaTime;

  if (p.age >= p.lifetime) {
    // Reset particle
    p.position = params.emitterPos;
    p.age = 0.0;
  } else {
    // Integrate
    p.velocity += params.gravity * params.deltaTime;
    p.position += p.velocity * params.deltaTime;
  }

  particles[index] = p;
}`,

  'fluid-advect': `struct FluidCell {
  velocity: vec2f,
  density: f32,
  pressure: f32,
}

struct FluidParams {
  gridSize: u32,
  dt: f32,
  viscosity: f32,
  diffusion: f32,
}

@group(0) @binding(0) var<storage, read_write> grid: array<FluidCell>;
@group(0) @binding(1) var<uniform> params: FluidParams;

fn idx(x: u32, y: u32) -> u32 {
  return y * params.gridSize + x;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let x = id.x;
  let y = id.y;
  let N = params.gridSize;

  if (x == 0u || x >= N - 1u || y == 0u || y >= N - 1u) {
    return;
  }

  // Semi-Lagrangian advection
  let cell = grid[idx(x, y)];
  let pos = vec2f(f32(x), f32(y)) - cell.velocity * params.dt;
  let px = clamp(pos.x, 0.5, f32(N) - 1.5);
  let py = clamp(pos.y, 0.5, f32(N) - 1.5);

  let i0 = u32(floor(px));
  let j0 = u32(floor(py));
  let s = px - f32(i0);
  let t = py - f32(j0);

  // Bilinear interpolation
  let d00 = grid[idx(i0, j0)].density;
  let d10 = grid[idx(i0 + 1u, j0)].density;
  let d01 = grid[idx(i0, j0 + 1u)].density;
  let d11 = grid[idx(i0 + 1u, j0 + 1u)].density;

  var newCell = cell;
  newCell.density = mix(mix(d00, d10, s), mix(d01, d11, s), t);
  grid[idx(x, y)] = newCell;
}`,

  'cloth-constraints': `struct Vertex {
  position: vec3f,
  prevPosition: vec3f,
  velocity: vec3f,
  mass: f32,
  pinned: u32,
}

struct Constraint {
  indexA: u32,
  indexB: u32,
  restLength: f32,
  stiffness: f32,
}

@group(0) @binding(0) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(1) var<storage, read> constraints: array<Constraint>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let ci = id.x;
  if (ci >= arrayLength(&constraints)) {
    return;
  }

  let c = constraints[ci];
  let a = vertices[c.indexA];
  let b = vertices[c.indexB];

  let delta = b.position - a.position;
  let dist = length(delta);
  if (dist < 0.0001) { return; }

  let diff = (dist - c.restLength) / dist;
  let correction = delta * 0.5 * diff * c.stiffness;

  if (a.pinned == 0u) {
    vertices[c.indexA].position += correction;
  }
  if (b.pinned == 0u) {
    vertices[c.indexB].position -= correction;
  }
}`,
};

/**
 * WGSL keywords for syntax highlighting
 */
export const WGSL_KEYWORDS = new Set([
  'fn', 'var', 'let', 'const', 'struct', 'if', 'else', 'for', 'while',
  'loop', 'break', 'continue', 'return', 'discard', 'switch', 'case',
  'default', 'fallthrough', 'true', 'false', 'alias', 'enable',
  'override', 'diagnostic',
]);

/**
 * WGSL type keywords for syntax highlighting
 */
export const WGSL_TYPES = new Set([
  'bool', 'i32', 'u32', 'f32', 'f16',
  'vec2i', 'vec3i', 'vec4i',
  'vec2u', 'vec3u', 'vec4u',
  'vec2f', 'vec3f', 'vec4f',
  'vec2h', 'vec3h', 'vec4h',
  'mat2x2f', 'mat2x3f', 'mat2x4f',
  'mat3x2f', 'mat3x3f', 'mat3x4f',
  'mat4x2f', 'mat4x3f', 'mat4x4f',
  'array', 'ptr', 'sampler', 'texture_2d', 'texture_3d',
  'texture_storage_2d', 'texture_depth_2d',
]);

/**
 * WGSL builtin functions for syntax highlighting
 */
export const WGSL_BUILTINS = new Set([
  'abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'clamp', 'cos',
  'cross', 'degrees', 'distance', 'dot', 'exp', 'exp2', 'floor',
  'fma', 'fract', 'inverseSqrt', 'length', 'log', 'log2', 'max',
  'min', 'mix', 'normalize', 'pow', 'radians', 'round', 'sign',
  'sin', 'smoothstep', 'sqrt', 'step', 'tan', 'trunc',
  'arrayLength', 'atomicAdd', 'atomicSub', 'atomicMax', 'atomicMin',
  'atomicAnd', 'atomicOr', 'atomicXor', 'atomicExchange',
  'atomicCompareExchangeWeak', 'atomicLoad', 'atomicStore',
  'textureSample', 'textureLoad', 'textureStore', 'textureDimensions',
  'select', 'all', 'any', 'countOneBits', 'reverseBits',
  'storageBarrier', 'workgroupBarrier',
]);

/**
 * WGSL attribute keywords
 */
export const WGSL_ATTRIBUTES = new Set([
  'compute', 'vertex', 'fragment',
  'workgroup_size', 'group', 'binding',
  'builtin', 'location', 'interpolate',
  'invariant', 'align', 'size', 'id',
]);

/**
 * Velocity field display labels
 */
export const VELOCITY_FIELD_LABELS: Record<VelocityFieldDisplay, string> = {
  arrows: 'Arrows',
  streamlines: 'Streamlines',
  lic: 'Line Integral Convolution',
  'color-magnitude': 'Color (Magnitude)',
  vorticity: 'Vorticity',
  pressure: 'Pressure',
  density: 'Density',
  none: 'None',
};

/**
 * Force field type labels
 */
export const FORCE_FIELD_LABELS: Record<ForceFieldType, string> = {
  gravity: 'Gravity',
  wind: 'Wind',
  vortex: 'Vortex',
  attractor: 'Attractor',
  repulsor: 'Repulsor',
  turbulence: 'Turbulence',
  'curl-noise': 'Curl Noise',
};

/**
 * Emitter shape labels
 */
export const EMITTER_SHAPE_LABELS: Record<EmitterShape, string> = {
  point: 'Point',
  sphere: 'Sphere',
  box: 'Box',
  cone: 'Cone',
  disk: 'Disk',
  line: 'Line',
};
