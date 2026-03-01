/**
 * GPU Particle System Integration with HoloScript World
 *
 * Bridges the GPU particle system with the existing Three.js adapter,
 * VR performance manager, and HoloScript runtime.
 *
 * Provides:
 * - Automatic initialization with WebGPU/WebGL2 renderer detection
 * - Integration with VRPerformanceDegradationManager for adaptive quality
 * - HoloScript element type registration for declarative particle creation
 * - VR controller interaction (hand tracking repulsion)
 *
 * @module GPUParticleSystemIntegration
 */

import * as THREE from 'three';
import {
  GPUParticleSystem,
  GPUParticleSystemConfig,
  ForceFieldDescriptor,
  CollisionPlaneDescriptor,
  CollisionSphereDescriptor,
  FORCE_TYPE,
  createGPUParticleSystem,
  createFireEffect,
  createSnowEffect,
  createSparkleEffect,
  createVRParticleFountain,
} from './GPUParticleSystem';
import {
  createVRHandRepulsor,
  createCampfireForces,
  createPortalForces,
  createExplosionForces,
} from './ForceFieldPresets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Integration configuration.
 */
export interface GPUParticleIntegrationConfig {
  /** Maximum simultaneous particle systems */
  maxSystems?: number;
  /** Enable VR hand interaction */
  vrHandInteraction?: boolean;
  /** Hand repulsion strength */
  handRepulsionStrength?: number;
  /** Hand repulsion radius */
  handRepulsionRadius?: number;
  /** Enable adaptive quality management */
  adaptiveQuality?: boolean;
  /** Target FPS for adaptive quality */
  targetFPS?: number;
}

/**
 * Registered particle system with metadata.
 */
interface RegisteredSystem {
  id: string;
  system: GPUParticleSystem;
  autoUpdate: boolean;
  handInteraction: boolean;
  handRepulsorIndices: number[];
}

// ---------------------------------------------------------------------------
// Integration Manager
// ---------------------------------------------------------------------------

/**
 * Manages GPU particle systems within a HoloScript World.
 *
 * Usage:
 * ```typescript
 * const world = createWorld({ container, xrEnabled: true });
 * const particles = new GPUParticleIntegration(world.getRenderer(), world.getScene());
 *
 * // Create a fire effect
 * const fireId = particles.createEffect('fire', {
 *   position: new THREE.Vector3(0, 0, 0),
 *   intensity: 1.5,
 * });
 *
 * // In render loop
 * particles.update(delta);
 * ```
 */
export class GPUParticleIntegration {
  private renderer: THREE.WebGLRenderer | any;
  private scene: THREE.Scene;
  private config: Required<GPUParticleIntegrationConfig>;
  private systems: Map<string, RegisteredSystem> = new Map();
  private systemIdCounter = 0;
  private vrControllerLeft: THREE.Object3D | null = null;
  private vrControllerRight: THREE.Object3D | null = null;

  constructor(
    renderer: THREE.WebGLRenderer | any,
    scene: THREE.Scene,
    config: GPUParticleIntegrationConfig = {},
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.config = {
      maxSystems: config.maxSystems ?? 32,
      vrHandInteraction: config.vrHandInteraction ?? false,
      handRepulsionStrength: config.handRepulsionStrength ?? 8.0,
      handRepulsionRadius: config.handRepulsionRadius ?? 0.5,
      adaptiveQuality: config.adaptiveQuality ?? true,
      targetFPS: config.targetFPS ?? 90,
    };
  }

  // =========================================================================
  // SYSTEM REGISTRATION
  // =========================================================================

  /**
   * Register a custom GPU particle system.
   */
  registerSystem(
    system: GPUParticleSystem,
    options?: {
      id?: string;
      autoUpdate?: boolean;
      handInteraction?: boolean;
      parent?: THREE.Object3D;
    },
  ): string {
    if (this.systems.size >= this.config.maxSystems) {
      console.warn(`[GPUParticleIntegration] Max systems (${this.config.maxSystems}) reached`);
      return '';
    }

    const id = options?.id ?? `particles_${this.systemIdCounter++}`;
    const parent = options?.parent ?? this.scene;
    parent.add(system);

    const registered: RegisteredSystem = {
      id,
      system,
      autoUpdate: options?.autoUpdate ?? true,
      handInteraction: options?.handInteraction ?? this.config.vrHandInteraction,
      handRepulsorIndices: [],
    };

    // Setup VR hand repulsors if needed
    if (registered.handInteraction) {
      this.setupHandRepulsors(registered);
    }

    this.systems.set(id, registered);
    return id;
  }

  /**
   * Unregister and dispose a particle system.
   */
  unregisterSystem(id: string): void {
    const registered = this.systems.get(id);
    if (!registered) return;

    registered.system.dispose();
    if (registered.system.parent) {
      registered.system.parent.remove(registered.system);
    }

    this.systems.delete(id);
  }

  /**
   * Get a registered system by ID.
   */
  getSystem(id: string): GPUParticleSystem | undefined {
    return this.systems.get(id)?.system;
  }

  // =========================================================================
  // PRESET EFFECTS
  // =========================================================================

  /**
   * Create a preset particle effect.
   */
  createEffect(
    type: 'fire' | 'snow' | 'sparkle' | 'fountain' | 'campfire' | 'portal' | 'explosion' | 'custom',
    options?: {
      position?: THREE.Vector3;
      maxParticles?: number;
      intensity?: number;
      color?: THREE.Color;
      config?: GPUParticleSystemConfig;
      parent?: THREE.Object3D;
      handInteraction?: boolean;
    },
  ): string {
    let system: GPUParticleSystem;

    switch (type) {
      case 'fire':
        system = createFireEffect({
          position: options?.position,
          maxParticles: options?.maxParticles,
          intensity: options?.intensity,
        });
        break;

      case 'snow':
        system = createSnowEffect({
          maxParticles: options?.maxParticles,
          density: options?.intensity,
        });
        break;

      case 'sparkle':
        system = createSparkleEffect({
          position: options?.position,
          maxParticles: options?.maxParticles,
          color: options?.color,
        });
        break;

      case 'fountain':
        system = createVRParticleFountain({
          position: options?.position,
          maxParticles: options?.maxParticles,
        });
        break;

      case 'campfire':
        system = createFireEffect({
          position: options?.position,
          maxParticles: options?.maxParticles ?? 20_000,
          intensity: options?.intensity ?? 0.8,
        });
        // Add campfire force fields
        for (const ff of createCampfireForces(options?.position ?? new THREE.Vector3())) {
          system.addForceField(ff);
        }
        break;

      case 'portal':
        system = createSparkleEffect({
          position: options?.position,
          maxParticles: options?.maxParticles ?? 40_000,
          color: options?.color ?? new THREE.Color(0x8800ff),
        });
        for (const ff of createPortalForces(options?.position ?? new THREE.Vector3())) {
          system.addForceField(ff);
        }
        break;

      case 'explosion':
        system = new GPUParticleSystem({
          maxParticles: options?.maxParticles ?? 50_000,
          emissionShape: 'sphere',
          emissionSize: 0.5,
          emissionRate: 0, // Burst
          lifetime: [0.5, 3.0],
          speed: [10.0, 30.0],
          spread: Math.PI,
          gravity: [0, -5.0, 0],
          drag: 0.03,
          startColor: options?.color ?? new THREE.Color(0xffaa00),
          endColor: new THREE.Color(0x440000),
          startSize: 0.2,
          endSize: 0.05,
          startOpacity: 1.0,
          endOpacity: 0.0,
          blendMode: 'additive',
          looping: false,
        });
        if (options?.position) system.position.copy(options.position);
        for (const ff of createExplosionForces(options?.position ?? new THREE.Vector3())) {
          system.addForceField(ff);
        }
        break;

      case 'custom':
      default:
        system = createGPUParticleSystem(options?.config);
        if (options?.position) system.position.copy(options.position);
        break;
    }

    return this.registerSystem(system, {
      autoUpdate: true,
      handInteraction: options?.handInteraction,
      parent: options?.parent,
    });
  }

  // =========================================================================
  // VR HAND INTERACTION
  // =========================================================================

  /**
   * Set VR controller references for hand interaction.
   */
  setVRControllers(left: THREE.Object3D | null, right: THREE.Object3D | null): void {
    this.vrControllerLeft = left;
    this.vrControllerRight = right;

    // Setup repulsors for all existing systems with hand interaction
    for (const registered of this.systems.values()) {
      if (registered.handInteraction && registered.handRepulsorIndices.length === 0) {
        this.setupHandRepulsors(registered);
      }
    }
  }

  private setupHandRepulsors(registered: RegisteredSystem): void {
    // Add two repulsors: one for each hand
    if (this.vrControllerLeft) {
      const leftPos = new THREE.Vector3();
      this.vrControllerLeft.getWorldPosition(leftPos);
      const idx = registered.system.addForceField(
        createVRHandRepulsor(leftPos, this.config.handRepulsionStrength, this.config.handRepulsionRadius),
      );
      registered.handRepulsorIndices.push(idx);
    }

    if (this.vrControllerRight) {
      const rightPos = new THREE.Vector3();
      this.vrControllerRight.getWorldPosition(rightPos);
      const idx = registered.system.addForceField(
        createVRHandRepulsor(rightPos, this.config.handRepulsionStrength, this.config.handRepulsionRadius),
      );
      registered.handRepulsorIndices.push(idx);
    }
  }

  private updateHandRepulsors(registered: RegisteredSystem): void {
    const indices = registered.handRepulsorIndices;
    let handIdx = 0;

    if (this.vrControllerLeft && indices[handIdx] !== undefined) {
      const pos = new THREE.Vector3();
      this.vrControllerLeft.getWorldPosition(pos);
      registered.system.updateForceField(indices[handIdx], { position: pos });
      handIdx++;
    }

    if (this.vrControllerRight && indices[handIdx] !== undefined) {
      const pos = new THREE.Vector3();
      this.vrControllerRight.getWorldPosition(pos);
      registered.system.updateForceField(indices[handIdx], { position: pos });
      handIdx++;
    }
  }

  // =========================================================================
  // UPDATE LOOP
  // =========================================================================

  /**
   * Update all registered particle systems.
   * Call once per frame from the animation loop.
   */
  async update(deltaTime: number): Promise<void> {
    for (const registered of this.systems.values()) {
      if (!registered.autoUpdate) continue;

      // Update hand repulsors
      if (registered.handInteraction) {
        this.updateHandRepulsors(registered);
      }

      // Update system
      await registered.system.update(this.renderer, deltaTime);
    }
  }

  // =========================================================================
  // HOLOSCRIPT ELEMENT TYPES
  // =========================================================================

  /**
   * Register particle element types with a ThreeRenderer instance.
   * Enables declarative particle creation in .hsplus files:
   *
   * ```hsplus
   * particles#fire {
   *   type: "fire"
   *   position: [0, 0, 0]
   *   intensity: 1.5
   * }
   * ```
   */
  registerHoloScriptTypes(threeRenderer: any): void {
    const originalCreateElement = threeRenderer.createElement.bind(threeRenderer);

    threeRenderer.createElement = (type: string, properties: Record<string, unknown>) => {
      if (type === 'particles' || type === 'particle-system') {
        return this.createParticleElement(properties);
      }
      return originalCreateElement(type, properties);
    };
  }

  private createParticleElement(properties: Record<string, unknown>): THREE.Object3D {
    const effectType = (properties.type as string) || 'custom';
    const position = properties.position
      ? new THREE.Vector3(...(properties.position as [number, number, number]))
      : undefined;
    const color = properties.color
      ? new THREE.Color(properties.color as string)
      : undefined;

    const id = this.createEffect(effectType as any, {
      position,
      maxParticles: properties.maxParticles as number,
      intensity: properties.intensity as number,
      color,
      handInteraction: properties.handInteraction as boolean,
    });

    const system = this.getSystem(id);
    if (system) {
      // Store ID in userData for later reference
      system.userData.particleSystemId = id;
      return system;
    }

    // Fallback: return empty group
    const group = new THREE.Group();
    group.name = 'particles-fallback';
    return group;
  }

  // =========================================================================
  // UTILITY
  // =========================================================================

  /**
   * Get all registered system IDs.
   */
  getSystemIds(): string[] {
    return Array.from(this.systems.keys());
  }

  /**
   * Get aggregate performance metrics across all systems.
   */
  getAggregateMetrics(): {
    totalSystems: number;
    totalParticles: number;
    totalActiveParticles: number;
    totalForceFields: number;
    totalColliders: number;
    systems: Array<{ id: string; metrics: ReturnType<GPUParticleSystem['getPerformanceMetrics']> }>;
  } {
    let totalParticles = 0;
    let totalActive = 0;
    let totalFF = 0;
    let totalColliders = 0;
    const systemMetrics: Array<{ id: string; metrics: ReturnType<GPUParticleSystem['getPerformanceMetrics']> }> = [];

    for (const [id, registered] of this.systems.entries()) {
      const m = registered.system.getPerformanceMetrics();
      totalParticles += m.totalParticles;
      totalActive += m.activeParticles;
      totalFF += m.forceFieldCount;
      totalColliders += m.colliderCount;
      systemMetrics.push({ id, metrics: m });
    }

    return {
      totalSystems: this.systems.size,
      totalParticles,
      totalActiveParticles: totalActive,
      totalForceFields: totalFF,
      totalColliders,
      systems: systemMetrics,
    };
  }

  /**
   * Generate aggregate performance report.
   */
  generateReport(): string {
    const m = this.getAggregateMetrics();
    const lines = [
      `=== GPU Particle Integration Report ===`,
      `Total Systems: ${m.totalSystems}`,
      `Total Particles: ${m.totalActiveParticles}/${m.totalParticles}`,
      `Total Force Fields: ${m.totalForceFields}`,
      `Total Colliders: ${m.totalColliders}`,
      `VR Hand Interaction: ${this.config.vrHandInteraction ? 'ON' : 'OFF'}`,
      `Adaptive Quality: ${this.config.adaptiveQuality ? 'ON' : 'OFF'}`,
      ``,
    ];

    for (const { id, metrics } of m.systems) {
      lines.push(`--- ${id} ---`);
      lines.push(`  Particles: ${metrics.activeParticles}/${metrics.totalParticles}`);
      lines.push(`  FPS: ${metrics.avgFPS.toFixed(1)} avg`);
      lines.push(`  Quality: ${(metrics.adaptiveQuality * 100).toFixed(0)}%`);
    }

    return lines.join('\n');
  }

  // =========================================================================
  // DISPOSAL
  // =========================================================================

  /**
   * Dispose all systems and resources.
   */
  dispose(): void {
    for (const [id] of this.systems) {
      this.unregisterSystem(id);
    }
    this.systems.clear();
    this.vrControllerLeft = null;
    this.vrControllerRight = null;
  }
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

/**
 * Create a GPU particle integration manager.
 */
export function createGPUParticleIntegration(
  renderer: THREE.WebGLRenderer | any,
  scene: THREE.Scene,
  config?: GPUParticleIntegrationConfig,
): GPUParticleIntegration {
  return new GPUParticleIntegration(renderer, scene, config);
}
