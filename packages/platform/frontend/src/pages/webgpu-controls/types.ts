/**
 * WebGPU Compute Shader Controls Types
 * Comprehensive parameter and metrics types for GPU compute demos
 */

/** Fluid Simulation Parameters */
export interface FluidSimulationParams {
  viscosity: number;          // 0.0 - 1.0
  pressure: number;           // 0.0 - 2.0
  velocityDamping: number;    // 0.9 - 1.0
  gridSize: number;           // 32 - 512
  timestep: number;           // 0.001 - 0.1
  diffusion: number;          // 0.0 - 1.0
  curlStrength: number;       // 0.0 - 1.0
  splatRadius: number;        // 0.001 - 0.1
}

/** Particle System Parameters */
export interface ParticleSystemParams {
  count: number;              // 1000 - 1000000
  size: number;               // 0.1 - 10.0
  lifetime: number;           // 0.5 - 10.0 seconds
  spawnRate: number;          // 10 - 10000 per second
  gravity: [number, number, number];
  wind: [number, number, number];
  turbulence: number;         // 0.0 - 1.0
  attraction: number;         // -1.0 - 1.0
  colorStart: string;         // Hex color
  colorEnd: string;           // Hex color
  sizeDecay: number;          // 0.0 - 1.0
}

/** Cloth Physics Parameters */
export interface ClothPhysicsParams {
  stiffness: number;          // 0.1 - 1.0
  damping: number;            // 0.0 - 1.0
  mass: number;               // 0.1 - 10.0
  windStrength: number;       // 0.0 - 10.0
  windDirection: [number, number, number];
  gridResolution: number;     // 10 - 100
  iterations: number;         // 1 - 20 (solver iterations)
  gravity: number;            // 0.0 - 20.0
  tearThreshold: number;      // 0.0 - 10.0
}

/** Performance Metrics */
export interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  computeTimeMs: number;
  renderTimeMs: number;
  memoryUsageMB: number;
  gpuMemoryUsageMB: number;
  particleCount: number;
  triangleCount: number;
  drawCalls: number;
  shaderCompileTimeMs: number;
}

/** Shader Configuration */
export interface ShaderConfig {
  name: string;
  code: string;
  entryPoint: string;
  workgroupSize: [number, number, number];
  bindGroupLayout: string;    // JSON string of layout
  lastModified: number;       // Timestamp
}

/** Simulation State */
export type SimulationState = 'stopped' | 'running' | 'paused' | 'compiling';

/** WebGPU Compute Controls State */
export interface WebGPUControlsState {
  fluidParams: FluidSimulationParams;
  particleParams: ParticleSystemParams;
  clothParams: ClothPhysicsParams;
  metrics: PerformanceMetrics;
  activeSimulation: 'fluid' | 'particles' | 'cloth' | null;
  simulationState: SimulationState;
  availableShaders: ShaderConfig[];
  activeShader: string | null;
  hotReloadEnabled: boolean;
  benchmarkResults: BenchmarkResult[];
}

/** Benchmark Result */
export interface BenchmarkResult {
  id: string;
  timestamp: number;
  simulationType: 'fluid' | 'particles' | 'cloth';
  params: FluidSimulationParams | ParticleSystemParams | ClothPhysicsParams;
  metrics: PerformanceMetrics;
  duration: number;           // Benchmark duration in seconds
  notes: string;
}

/** Preset Configuration */
export interface SimulationPreset {
  name: string;
  description: string;
  simulationType: 'fluid' | 'particles' | 'cloth';
  params: FluidSimulationParams | ParticleSystemParams | ClothPhysicsParams;
}
