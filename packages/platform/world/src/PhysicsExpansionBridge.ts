/**
 * PhysicsExpansionBridge (Phase 13)
 *
 * Implements the PhysicsProvider contract expected by
 * @hololand/core's TraitContextFactory, connecting HoloScript's
 * 8 physics expansion trait handlers to the @hololand/world
 * PhysicsEngine runtime.
 *
 * The PhysicsProvider interface is duplicated here (4 methods) to
 * avoid a circular dependency between @hololand/world and
 * @hololand/core.  Both copies are identical; keep them in sync.
 *
 * Wired handlers:
 *   - clothHandler        (cloth simulation with PBD)
 *   - fluidHandler        (SPH fluid simulation)
 *   - softBodyHandler     (soft body dynamics)
 *   - ropeHandler         (Verlet rope/cable simulation)
 *   - chainHandler        (rigid chain links)
 *   - windHandler         (wind force fields)
 *   - buoyancyHandler     (water buoyancy)
 *   - destructionHandler  (Voronoi fracture)
 */

import type { PhysicsEngine } from './PhysicsEngine';
import type { Vector3 } from './types';

// ---------------------------------------------------------------------------
// PhysicsProvider interface (mirrors @hololand/core TraitContextFactory)
// ---------------------------------------------------------------------------

/**
 * Subset of the physics API that TraitContextFactory delegates to.
 * Duplicated here to avoid a circular workspace dependency.
 */
export interface PhysicsProvider {
  applyVelocity(nodeId: string, velocity: Vector3): void;
  applyAngularVelocity(nodeId: string, angularVelocity: Vector3): void;
  setKinematic(nodeId: string, kinematic: boolean): void;
  raycast(
    origin: Vector3,
    direction: Vector3,
    maxDistance: number
  ): { point: Vector3; normal: Vector3; distance: number; nodeId: string } | null;
}

// ---------------------------------------------------------------------------
// Simulation subsystems
// ---------------------------------------------------------------------------

export interface ClothSimulation {
  nodeId: string;
  resolution: number;
  stiffness: number;
  damping: number;
  mass: number;
  gravityScale: number;
  windResponse: number;
  selfCollision: boolean;
  tearable: boolean;
  tearThreshold: number;
  pinVertices: number[];
  isTorn: boolean;
}

export interface FluidSimulation {
  nodeId: string;
  method: 'sph' | 'flip' | 'mpm';
  particleCount: number;
  viscosity: number;
  surfaceTension: number;
  density: number;
  renderMode: 'particles' | 'mesh' | 'screen_space';
}

export interface DestructionState {
  nodeId: string;
  mode: 'voronoi' | 'predefined' | 'procedural';
  fragmentCount: number;
  impactThreshold: number;
  fragmentLifetime: number;
  currentHealth: number;
  isDestroyed: boolean;
  fragments: string[]; // child node IDs
}

export interface WindZone {
  nodeId: string;
  direction: Vector3;
  strength: number;
  turbulence: number;
  radius: number;
  falloff: 'linear' | 'quadratic' | 'none';
}

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

/** Pending fragment-group removal tracked by physics timestep. */
interface FragmentCountdown {
  /** Remaining time in seconds (decremented by update delta). */
  remaining: number;
  /** Node IDs of every fragment in the group. */
  fragmentIds: string[];
}

export class PhysicsExpansionBridge implements PhysicsProvider {
  private engine: PhysicsEngine;
  private clothSims: Map<string, ClothSimulation> = new Map();
  private fluidSims: Map<string, FluidSimulation> = new Map();
  private destructionStates: Map<string, DestructionState> = new Map();
  private windZones: Map<string, WindZone> = new Map();
  private kinematicNodes: Set<string> = new Set();

  /**
   * Fragment groups waiting to be cleaned up.
   * Keyed by the *original* destructible node ID so we can cancel if needed.
   * Decremented every frame in update() instead of relying on wall-clock
   * setTimeout, ensuring deterministic behaviour tied to the physics timestep.
   */
  private fragmentCountdowns: Map<string, FragmentCountdown> = new Map();

  constructor(engine: PhysicsEngine) {
    this.engine = engine;
  }

  // ---- PhysicsProvider implementation ------------------------------------

  applyVelocity(nodeId: string, velocity: Vector3): void {
    if (this.kinematicNodes.has(nodeId)) return;
    this.engine.applyLinearVelocity(nodeId, velocity);
  }

  applyAngularVelocity(nodeId: string, angularVelocity: Vector3): void {
    if (this.kinematicNodes.has(nodeId)) return;
    this.engine.applyAngularVelocity(nodeId, angularVelocity);
  }

  setKinematic(nodeId: string, kinematic: boolean): void {
    if (kinematic) {
      this.kinematicNodes.add(nodeId);
    } else {
      this.kinematicNodes.delete(nodeId);
    }
    this.engine.setBodyType(nodeId, kinematic ? 'kinematic' : 'dynamic');
  }

  raycast(
    origin: Vector3,
    direction: Vector3,
    maxDistance: number
  ): { point: Vector3; normal: Vector3; distance: number; nodeId: string } | null {
    return this.engine.raycast(origin, direction, maxDistance);
  }

  // ---- Cloth simulation --------------------------------------------------

  createClothSimulation(config: ClothSimulation): void {
    this.clothSims.set(config.nodeId, config);
    this.engine.addClothBody(config.nodeId, {
      resolution: config.resolution,
      stiffness: config.stiffness,
      damping: config.damping,
      mass: config.mass,
      gravityScale: config.gravityScale,
      selfCollision: config.selfCollision,
      pinVertices: config.pinVertices,
    });
  }

  updateClothWind(nodeId: string, windForce: Vector3): void {
    const sim = this.clothSims.get(nodeId);
    if (!sim) return;
    this.engine.applyClothWind(nodeId, windForce, sim.windResponse);
  }

  tearCloth(nodeId: string, tearPoint: Vector3): void {
    const sim = this.clothSims.get(nodeId);
    if (!sim || !sim.tearable || sim.isTorn) return;
    sim.isTorn = true;
    this.engine.tearCloth(nodeId, tearPoint);
  }

  removeClothSimulation(nodeId: string): void {
    this.clothSims.delete(nodeId);
    this.engine.removeClothBody(nodeId);
  }

  // ---- Fluid simulation --------------------------------------------------

  createFluidSimulation(config: FluidSimulation): void {
    this.fluidSims.set(config.nodeId, config);
    this.engine.addFluidVolume(config.nodeId, {
      method: config.method,
      particleCount: config.particleCount,
      viscosity: config.viscosity,
      surfaceTension: config.surfaceTension,
      density: config.density,
    });
  }

  removeFluidSimulation(nodeId: string): void {
    this.fluidSims.delete(nodeId);
    this.engine.removeFluidVolume(nodeId);
  }

  // ---- Destruction -------------------------------------------------------

  registerDestructible(config: DestructionState): void {
    this.destructionStates.set(config.nodeId, config);
  }

  applyDamage(nodeId: string, damage: number, impactPoint: Vector3): boolean {
    const state = this.destructionStates.get(nodeId);
    if (!state || state.isDestroyed) return false;

    state.currentHealth -= damage;
    if (state.currentHealth <= 0) {
      state.isDestroyed = true;
      // Fracture the mesh using Voronoi decomposition
      const fragments = this.engine.fractureMesh(nodeId, {
        mode: state.mode,
        fragmentCount: state.fragmentCount,
        impactPoint,
        explosionForce: damage * 0.5,
      });
      state.fragments = fragments;

      // Schedule fragment removal using physics-timestep countdown
      // instead of wall-clock setTimeout, so behaviour is deterministic
      // and pauses correctly when the simulation is paused.
      if (state.fragmentLifetime > 0) {
        this.fragmentCountdowns.set(nodeId, {
          remaining: state.fragmentLifetime, // seconds
          fragmentIds: [...fragments],
        });
      }
      return true;
    }
    return false;
  }

  // ---- Wind zones --------------------------------------------------------

  addWindZone(zone: WindZone): void {
    this.windZones.set(zone.nodeId, zone);
    this.engine.addForceField(zone.nodeId, {
      type: 'directional',
      direction: zone.direction,
      strength: zone.strength,
      turbulence: zone.turbulence,
      radius: zone.radius,
      falloff: zone.falloff,
    });
  }

  removeWindZone(nodeId: string): void {
    this.windZones.delete(nodeId);
    this.engine.removeForceField(nodeId);
  }

  // ---- Per-frame update --------------------------------------------------

  /**
   * Call each frame to step cloth/fluid sims, apply wind to cloth, and
   * tick fragment-lifetime countdowns.
   *
   * @param delta  Elapsed time in seconds since the last physics step.
   */
  update(delta: number): void {
    // --- Apply wind zones to cloth simulations ---
    for (const wind of this.windZones.values()) {
      for (const cloth of this.clothSims.values()) {
        if (cloth.windResponse > 0) {
          const windForce: Vector3 = {
            x: wind.direction.x * wind.strength * cloth.windResponse,
            y: wind.direction.y * wind.strength * cloth.windResponse,
            z: wind.direction.z * wind.strength * cloth.windResponse,
          };
          this.engine.applyClothWind(cloth.nodeId, windForce, cloth.windResponse);
        }
      }
    }

    // --- Tick fragment-lifetime countdowns ---
    for (const [nodeId, countdown] of this.fragmentCountdowns) {
      countdown.remaining -= delta;
      if (countdown.remaining <= 0) {
        for (const fragId of countdown.fragmentIds) {
          this.engine.removeBody(fragId);
        }
        this.fragmentCountdowns.delete(nodeId);
      }
    }
  }

  // ---- Stats & cleanup ---------------------------------------------------

  getStats(): {
    clothSimulations: number;
    fluidSimulations: number;
    destructibles: number;
    windZones: number;
  } {
    return {
      clothSimulations: this.clothSims.size,
      fluidSimulations: this.fluidSims.size,
      destructibles: this.destructionStates.size,
      windZones: this.windZones.size,
    };
  }

  dispose(): void {
    for (const nodeId of this.clothSims.keys()) this.engine.removeClothBody(nodeId);
    for (const nodeId of this.fluidSims.keys()) this.engine.removeFluidVolume(nodeId);
    for (const nodeId of this.windZones.keys()) this.engine.removeForceField(nodeId);

    // Clean up any pending fragment countdowns (remove fragments immediately)
    for (const countdown of this.fragmentCountdowns.values()) {
      for (const fragId of countdown.fragmentIds) {
        this.engine.removeBody(fragId);
      }
    }

    this.clothSims.clear();
    this.fluidSims.clear();
    this.destructionStates.clear();
    this.windZones.clear();
    this.kinematicNodes.clear();
    this.fragmentCountdowns.clear();
  }
}

export function createPhysicsExpansionBridge(engine: PhysicsEngine): PhysicsExpansionBridge {
  return new PhysicsExpansionBridge(engine);
}
