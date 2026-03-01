/**
 * GPU Compute Module
 *
 * WebGPU compute shader systems for high-performance particle simulation,
 * GPU-side collision detection, and force field evaluation.
 *
 * Uses Three.js Shading Language (TSL) for portability between
 * WebGPU (WGSL) and WebGL2 (GLSL) backends.
 *
 * Target: 120,000 particles at 90fps in VR.
 *
 * @module gpu
 */

// Core GPU Particle System
export {
  GPUParticleSystem,
  createGPUParticleSystem,
  createFireEffect,
  createSnowEffect,
  createSparkleEffect,
  createVRParticleFountain,
  FORCE_TYPE,
} from './GPUParticleSystem';

export type {
  GPUParticleSystemConfig,
  ForceFieldDescriptor,
  CollisionPlaneDescriptor,
  CollisionSphereDescriptor,
  EmissionShape,
  ParticleBlendMode,
  ParticleSortMode,
} from './GPUParticleSystem';

// Force Field Presets
export {
  // Gravity
  createEarthGravity,
  createLowGravity,
  createZeroGravity,
  createRadialGravity,
  // Wind
  createBreeze,
  createWindGust,
  createUpdraft,
  // Vortex
  createVortex,
  createDustDevil,
  createBlackHole,
  // Attractor / Repulsor
  createAttractor,
  createRepulsor,
  createVRHandRepulsor,
  // Turbulence
  createTurbulence,
  createFineTurbulence,
  createCoarseTurbulence,
  // Drag
  createDragZone,
  // Composite
  createCampfireForces,
  createPortalForces,
  createOceanSprayForces,
  createExplosionForces,
} from './ForceFieldPresets';

// Integration with HoloScript World
export {
  GPUParticleIntegration,
  createGPUParticleIntegration,
} from './GPUParticleSystemIntegration';

export type {
  GPUParticleIntegrationConfig,
} from './GPUParticleSystemIntegration';
