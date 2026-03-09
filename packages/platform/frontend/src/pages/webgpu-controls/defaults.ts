/**
 * Default parameters and presets for WebGPU simulations
 */

import type {
  FluidSimulationParams,
  ParticleSystemParams,
  ClothPhysicsParams,
  PerformanceMetrics,
  SimulationPreset,
} from './types';

/** Default Fluid Simulation Parameters */
export const DEFAULT_FLUID_PARAMS: FluidSimulationParams = {
  viscosity: 0.1,
  pressure: 1.0,
  velocityDamping: 0.98,
  gridSize: 128,
  timestep: 0.016,
  diffusion: 0.0,
  curlStrength: 0.3,
  splatRadius: 0.005,
};

/** Default Particle System Parameters */
export const DEFAULT_PARTICLE_PARAMS: ParticleSystemParams = {
  count: 10000,
  size: 2.0,
  lifetime: 3.0,
  spawnRate: 1000,
  gravity: [0, -9.8, 0],
  wind: [0, 0, 0],
  turbulence: 0.1,
  attraction: 0.0,
  colorStart: '#ffffff',
  colorEnd: '#0088ff',
  sizeDecay: 0.9,
};

/** Default Cloth Physics Parameters */
export const DEFAULT_CLOTH_PARAMS: ClothPhysicsParams = {
  stiffness: 0.8,
  damping: 0.5,
  mass: 1.0,
  windStrength: 2.0,
  windDirection: [1, 0, 0],
  gridResolution: 30,
  iterations: 10,
  gravity: 9.8,
  tearThreshold: 5.0,
};

/** Initial Performance Metrics */
export const INITIAL_METRICS: PerformanceMetrics = {
  fps: 0,
  frameTimeMs: 0,
  computeTimeMs: 0,
  renderTimeMs: 0,
  memoryUsageMB: 0,
  gpuMemoryUsageMB: 0,
  particleCount: 0,
  triangleCount: 0,
  drawCalls: 0,
  shaderCompileTimeMs: 0,
};

/** Fluid Simulation Presets */
export const FLUID_PRESETS: SimulationPreset[] = [
  {
    name: 'Water',
    description: 'Low viscosity, realistic water behavior',
    simulationType: 'fluid',
    params: {
      ...DEFAULT_FLUID_PARAMS,
      viscosity: 0.05,
      pressure: 1.0,
      diffusion: 0.0,
    } as FluidSimulationParams,
  },
  {
    name: 'Honey',
    description: 'High viscosity, slow flowing fluid',
    simulationType: 'fluid',
    params: {
      ...DEFAULT_FLUID_PARAMS,
      viscosity: 0.8,
      pressure: 0.5,
      velocityDamping: 0.95,
    } as FluidSimulationParams,
  },
  {
    name: 'Smoke',
    description: 'Low pressure, high curl strength',
    simulationType: 'fluid',
    params: {
      ...DEFAULT_FLUID_PARAMS,
      viscosity: 0.01,
      pressure: 0.3,
      curlStrength: 0.8,
      diffusion: 0.5,
    } as FluidSimulationParams,
  },
  {
    name: 'Ink',
    description: 'Medium viscosity, strong diffusion',
    simulationType: 'fluid',
    params: {
      ...DEFAULT_FLUID_PARAMS,
      viscosity: 0.3,
      pressure: 0.8,
      diffusion: 0.7,
      curlStrength: 0.1,
    } as FluidSimulationParams,
  },
];

/** Particle System Presets */
export const PARTICLE_PRESETS: SimulationPreset[] = [
  {
    name: 'Fire',
    description: 'Rising particles with orange-red gradient',
    simulationType: 'particles',
    params: {
      ...DEFAULT_PARTICLE_PARAMS,
      count: 50000,
      lifetime: 1.5,
      spawnRate: 5000,
      gravity: [0, 5, 0],
      turbulence: 0.3,
      colorStart: '#ffaa00',
      colorEnd: '#ff3300',
      sizeDecay: 0.95,
    } as ParticleSystemParams,
  },
  {
    name: 'Snow',
    description: 'Gently falling white particles',
    simulationType: 'particles',
    params: {
      ...DEFAULT_PARTICLE_PARAMS,
      count: 20000,
      lifetime: 5.0,
      spawnRate: 2000,
      gravity: [0, -2, 0],
      wind: [1, 0, 0.5],
      turbulence: 0.05,
      colorStart: '#ffffff',
      colorEnd: '#ddddff',
    } as ParticleSystemParams,
  },
  {
    name: 'Sparks',
    description: 'Fast particles with gravity and attraction',
    simulationType: 'particles',
    params: {
      ...DEFAULT_PARTICLE_PARAMS,
      count: 10000,
      lifetime: 0.8,
      spawnRate: 8000,
      gravity: [0, -15, 0],
      turbulence: 0.2,
      attraction: 0.3,
      colorStart: '#ffff88',
      colorEnd: '#ff8800',
      sizeDecay: 0.98,
    } as ParticleSystemParams,
  },
  {
    name: 'Magic',
    description: 'Swirling particles with high turbulence',
    simulationType: 'particles',
    params: {
      ...DEFAULT_PARTICLE_PARAMS,
      count: 30000,
      lifetime: 4.0,
      spawnRate: 3000,
      gravity: [0, 0, 0],
      turbulence: 0.8,
      attraction: -0.2,
      colorStart: '#aa00ff',
      colorEnd: '#00ffff',
    } as ParticleSystemParams,
  },
];

/** Cloth Physics Presets */
export const CLOTH_PRESETS: SimulationPreset[] = [
  {
    name: 'Silk',
    description: 'Light, flowing fabric with low stiffness',
    simulationType: 'cloth',
    params: {
      ...DEFAULT_CLOTH_PARAMS,
      stiffness: 0.3,
      damping: 0.3,
      mass: 0.5,
      windStrength: 3.0,
      gridResolution: 40,
    } as ClothPhysicsParams,
  },
  {
    name: 'Canvas',
    description: 'Heavy, stiff fabric',
    simulationType: 'cloth',
    params: {
      ...DEFAULT_CLOTH_PARAMS,
      stiffness: 0.9,
      damping: 0.8,
      mass: 3.0,
      windStrength: 1.0,
      gridResolution: 25,
    } as ClothPhysicsParams,
  },
  {
    name: 'Flag',
    description: 'Medium weight, optimized for wind',
    simulationType: 'cloth',
    params: {
      ...DEFAULT_CLOTH_PARAMS,
      stiffness: 0.6,
      damping: 0.4,
      mass: 1.5,
      windStrength: 5.0,
      windDirection: [1, 0.2, 0],
      gridResolution: 35,
    } as ClothPhysicsParams,
  },
  {
    name: 'Rubber',
    description: 'High stiffness, elastic behavior',
    simulationType: 'cloth',
    params: {
      ...DEFAULT_CLOTH_PARAMS,
      stiffness: 1.0,
      damping: 0.2,
      mass: 2.0,
      windStrength: 0.5,
      iterations: 15,
      tearThreshold: 8.0,
    } as ClothPhysicsParams,
  },
];
