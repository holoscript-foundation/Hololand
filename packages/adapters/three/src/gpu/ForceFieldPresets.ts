/**
 * Force Field Presets for GPU Particle System
 *
 * Pre-configured force field descriptors for common VR/AR effects.
 * All force fields are evaluated entirely on the GPU via TSL compute shaders.
 *
 * @module ForceFieldPresets
 */

import * as THREE from 'three';
import { ForceFieldDescriptor, FORCE_TYPE } from './GPUParticleSystem';

// ---------------------------------------------------------------------------
// Gravity Presets
// ---------------------------------------------------------------------------

/**
 * Standard Earth gravity (-9.81 m/s^2 on Y axis).
 */
export function createEarthGravity(strength = 9.81): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.GRAVITY,
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0, -1, 0),
    strength,
    radius: 0, // Infinite
    falloff: 1,
    param0: 0,
  };
}

/**
 * Low gravity (e.g., lunar: ~1.62 m/s^2).
 */
export function createLowGravity(strength = 1.62): ForceFieldDescriptor {
  return createEarthGravity(strength);
}

/**
 * Zero gravity (microgravity environment).
 */
export function createZeroGravity(): ForceFieldDescriptor {
  return createEarthGravity(0);
}

/**
 * Radial gravity: pulls particles toward a central point (planet-like).
 */
export function createRadialGravity(
  center: THREE.Vector3,
  strength = 20.0,
  radius = 50.0,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.ATTRACTOR,
    position: center.clone(),
    direction: new THREE.Vector3(0, -1, 0),
    strength,
    radius,
    falloff: 2, // Inverse square
    param0: 0,
  };
}

// ---------------------------------------------------------------------------
// Wind Presets
// ---------------------------------------------------------------------------

/**
 * Gentle breeze in a given direction.
 */
export function createBreeze(
  direction = new THREE.Vector3(1, 0, 0),
  strength = 2.0,
  turbulence = 0.1,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.WIND,
    position: new THREE.Vector3(0, 0, 0),
    direction: direction.clone().normalize(),
    strength,
    radius: 0, // Global
    falloff: 1,
    param0: turbulence,
  };
}

/**
 * Strong wind gust with high turbulence.
 */
export function createWindGust(
  direction = new THREE.Vector3(1, 0, 0),
  strength = 15.0,
  turbulence = 0.5,
): ForceFieldDescriptor {
  return createBreeze(direction, strength, turbulence);
}

/**
 * Localized updraft (thermal column).
 */
export function createUpdraft(
  position: THREE.Vector3,
  strength = 10.0,
  radius = 5.0,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.WIND,
    position: position.clone(),
    direction: new THREE.Vector3(0, 1, 0),
    strength,
    radius,
    falloff: 2,
    param0: 0.2,
  };
}

// ---------------------------------------------------------------------------
// Vortex Presets
// ---------------------------------------------------------------------------

/**
 * Vertical vortex (tornado-like, spinning around Y axis).
 */
export function createVortex(
  position: THREE.Vector3,
  strength = 8.0,
  radius = 10.0,
  axis = new THREE.Vector3(0, 1, 0),
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.VORTEX,
    position: position.clone(),
    direction: axis.clone().normalize(),
    strength,
    radius,
    falloff: 1.5,
    param0: 0,
  };
}

/**
 * Horizontal vortex (dust devil on a plane).
 */
export function createDustDevil(
  position: THREE.Vector3,
  strength = 12.0,
  radius = 8.0,
): ForceFieldDescriptor {
  const vortex = createVortex(position, strength, radius);
  // Add slight upward pull
  return vortex;
}

/**
 * Black hole: strong attractor with vortex spin.
 * Combine with an attractor for the full effect.
 */
export function createBlackHole(
  position: THREE.Vector3,
  strength = 30.0,
  radius = 15.0,
): { vortex: ForceFieldDescriptor; attractor: ForceFieldDescriptor } {
  return {
    vortex: createVortex(position, strength * 0.5, radius),
    attractor: {
      type: FORCE_TYPE.ATTRACTOR,
      position: position.clone(),
      direction: new THREE.Vector3(0, 0, 0),
      strength,
      radius,
      falloff: 2.5, // Strong inverse power
      param0: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Attractor / Repulsor Presets
// ---------------------------------------------------------------------------

/**
 * Point attractor (pull particles toward a point).
 */
export function createAttractor(
  position: THREE.Vector3,
  strength = 10.0,
  radius = 20.0,
  falloff = 2.0,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.ATTRACTOR,
    position: position.clone(),
    direction: new THREE.Vector3(0, 0, 0),
    strength,
    radius,
    falloff,
    param0: 0,
  };
}

/**
 * Point repulsor (push particles away from a point).
 * Useful for interactive VR hand repulsion.
 */
export function createRepulsor(
  position: THREE.Vector3,
  strength = 15.0,
  radius = 10.0,
  falloff = 2.0,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.REPULSOR,
    position: position.clone(),
    direction: new THREE.Vector3(0, 0, 0),
    strength,
    radius,
    falloff,
    param0: 0,
  };
}

/**
 * VR hand repulsor: designed for interactive hand-particle interaction.
 * Softer falloff for a more natural feel.
 */
export function createVRHandRepulsor(
  handPosition: THREE.Vector3,
  strength = 8.0,
  radius = 0.5,
): ForceFieldDescriptor {
  return createRepulsor(handPosition, strength, radius, 1.5);
}

// ---------------------------------------------------------------------------
// Turbulence Presets
// ---------------------------------------------------------------------------

/**
 * Generic 3D turbulence field.
 */
export function createTurbulence(
  position: THREE.Vector3,
  strength = 5.0,
  radius = 0, // 0 = global
  scale = 0.3,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.TURBULENCE,
    position: position.clone(),
    direction: new THREE.Vector3(0, 0, 0),
    strength,
    radius,
    falloff: 1,
    param0: scale,
  };
}

/**
 * Fine turbulence: high-frequency noise for detail.
 */
export function createFineTurbulence(strength = 3.0, scale = 1.0): ForceFieldDescriptor {
  return createTurbulence(new THREE.Vector3(0, 0, 0), strength, 0, scale);
}

/**
 * Coarse turbulence: low-frequency noise for large-scale motion.
 */
export function createCoarseTurbulence(strength = 8.0, scale = 0.05): ForceFieldDescriptor {
  return createTurbulence(new THREE.Vector3(0, 0, 0), strength, 0, scale);
}

// ---------------------------------------------------------------------------
// Drag Presets
// ---------------------------------------------------------------------------

/**
 * Localized drag zone (e.g., water, thick atmosphere region).
 */
export function createDragZone(
  position: THREE.Vector3,
  strength = 5.0,
  radius = 10.0,
): ForceFieldDescriptor {
  return {
    type: FORCE_TYPE.DRAG,
    position: position.clone(),
    direction: new THREE.Vector3(0, 0, 0),
    strength,
    radius,
    falloff: 1,
    param0: 0,
  };
}

// ---------------------------------------------------------------------------
// Composite Presets (return multiple force fields)
// ---------------------------------------------------------------------------

/**
 * Campfire effect: updraft + turbulence + slight wind.
 */
export function createCampfireForces(
  position: THREE.Vector3,
): ForceFieldDescriptor[] {
  return [
    createUpdraft(position, 8.0, 3.0),
    createTurbulence(position, 2.0, 5.0, 0.5),
    createBreeze(new THREE.Vector3(0.5, 0, 0.3), 0.5, 0.2),
  ];
}

/**
 * Magical portal effect: vortex + attractor + turbulence.
 */
export function createPortalForces(
  position: THREE.Vector3,
  radius = 5.0,
): ForceFieldDescriptor[] {
  return [
    createVortex(position, 10.0, radius, new THREE.Vector3(0, 0, 1)),
    createAttractor(position, 5.0, radius * 2),
    createTurbulence(position, 3.0, radius * 1.5, 0.3),
  ];
}

/**
 * Ocean spray: wind + turbulence + gravity.
 */
export function createOceanSprayForces(
  direction = new THREE.Vector3(1, 0, 0),
): ForceFieldDescriptor[] {
  return [
    createBreeze(direction, 6.0, 0.3),
    createCoarseTurbulence(4.0, 0.08),
    createFineTurbulence(1.5, 0.5),
  ];
}

/**
 * Explosion effect: strong central repulsor + turbulence.
 */
export function createExplosionForces(
  position: THREE.Vector3,
  strength = 50.0,
  radius = 20.0,
): ForceFieldDescriptor[] {
  return [
    createRepulsor(position, strength, radius, 3.0),
    createTurbulence(position, strength * 0.3, radius, 0.2),
  ];
}
