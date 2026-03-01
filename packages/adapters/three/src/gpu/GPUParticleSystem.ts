/**
 * GPU Particle System with WebGPU Compute Shaders via TSL
 *
 * High-performance particle simulation running entirely on the GPU.
 * Uses Three.js Shading Language (TSL) for portability between
 * WebGPU (WGSL) and WebGL2 (GLSL) backends.
 *
 * Target: 120,000 particles at 90fps in VR.
 *
 * Architecture:
 *   - Storage buffers hold per-particle state (position, velocity, life, etc.)
 *   - Initialization compute shader seeds particles once
 *   - Update compute shader runs every frame to integrate physics
 *   - Force fields and colliders are uploaded as uniform arrays
 *   - Rendering uses SpriteNodeMaterial with TSL fragment shaders
 *
 * @module GPUParticleSystem
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// TSL imports (three/tsl is the canonical entry point from r170+)
// ---------------------------------------------------------------------------
import {
  Fn,
  float,
  vec2,
  vec3,
  vec4,
  instanceIndex,
  instancedArray,
  uniform,
  storage,
  If,
  Loop,
  Break,
  sin,
  cos,
  sqrt,
  abs,
  max,
  min,
  mix,
  smoothstep,
  length,
  normalize,
  dot,
  cross,
  floor,
  fract,
  clamp,
  uv,
} from 'three/tsl';

// ---------------------------------------------------------------------------
// Types & Configuration
// ---------------------------------------------------------------------------

/** Emission shape for spawning particles */
export type EmissionShape =
  | 'point'
  | 'sphere'
  | 'hemisphere'
  | 'box'
  | 'cone'
  | 'ring'
  | 'disc';

/** Blending mode for particle rendering */
export type ParticleBlendMode = 'additive' | 'normal' | 'multiply';

/** Particle sort mode */
export type ParticleSortMode = 'none' | 'back-to-front';

/**
 * Force field descriptor uploaded to GPU as a uniform struct array.
 * Each force field occupies 16 floats (4x vec4) for alignment.
 */
export interface ForceFieldDescriptor {
  /** Force field type: 0=gravity, 1=wind, 2=vortex, 3=attractor, 4=repulsor, 5=turbulence, 6=drag */
  type: number;
  /** World-space position of the force field */
  position: THREE.Vector3;
  /** Direction (for directional forces like wind, gravity) */
  direction: THREE.Vector3;
  /** Primary strength parameter */
  strength: number;
  /** Radius of influence (0 = infinite) */
  radius: number;
  /** Falloff exponent (1 = linear, 2 = quadratic) */
  falloff: number;
  /** Additional parameter (e.g., vortex axis tightness) */
  param0: number;
}

/**
 * Collision plane descriptor uploaded to GPU.
 * Each plane is a vec4 (normal.xyz, distance).
 */
export interface CollisionPlaneDescriptor {
  /** Plane normal (unit vector) */
  normal: THREE.Vector3;
  /** Signed distance from origin */
  distance: number;
  /** Coefficient of restitution (bounciness) 0..1 */
  restitution: number;
  /** Friction coefficient 0..1 */
  friction: number;
}

/**
 * Collision sphere descriptor.
 */
export interface CollisionSphereDescriptor {
  /** Center of the sphere collider */
  center: THREE.Vector3;
  /** Radius of the sphere */
  radius: number;
  /** Coefficient of restitution */
  restitution: number;
  /** Friction coefficient */
  friction: number;
}

/**
 * Full configuration for a GPU particle system instance.
 */
export interface GPUParticleSystemConfig {
  /** Maximum number of particles (default: 120000) */
  maxParticles?: number;
  /** Emission shape (default: 'point') */
  emissionShape?: EmissionShape;
  /** Emission radius or half-extents */
  emissionSize?: number | [number, number, number];
  /** Emission rate (particles per second, 0 = burst) */
  emissionRate?: number;
  /** Particle lifetime range [min, max] seconds */
  lifetime?: [number, number];
  /** Initial speed range [min, max] */
  speed?: [number, number];
  /** Spread angle in radians (for cone/hemisphere) */
  spread?: number;
  /** Gravity vector (default: [0, -9.81, 0]) */
  gravity?: [number, number, number];
  /** Global drag coefficient (default: 0.01) */
  drag?: number;
  /** Start color */
  startColor?: THREE.Color;
  /** End color (interpolated over lifetime) */
  endColor?: THREE.Color;
  /** Start size */
  startSize?: number;
  /** End size */
  endSize?: number;
  /** Start opacity */
  startOpacity?: number;
  /** End opacity */
  endOpacity?: number;
  /** Blending mode (default: 'additive') */
  blendMode?: ParticleBlendMode;
  /** Sort mode (default: 'none') */
  sortMode?: ParticleSortMode;
  /** Whether particles loop (respawn when dead) */
  looping?: boolean;
  /** World space (true) or local space (false) simulation */
  worldSpace?: boolean;
  /** Maximum number of force fields (default: 16) */
  maxForceFields?: number;
  /** Maximum number of collision planes (default: 8) */
  maxCollisionPlanes?: number;
  /** Maximum number of collision spheres (default: 8) */
  maxCollisionSpheres?: number;
  /** Sprite texture (optional) */
  texture?: THREE.Texture;
  /** VR mode: enables foveated particle density and fixed-foveation LOD */
  vrMode?: boolean;
  /** Target framerate for adaptive quality (default: 90 for VR, 60 otherwise) */
  targetFPS?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Force field type constants matching GPU enum */
export const FORCE_TYPE = {
  GRAVITY: 0,
  WIND: 1,
  VORTEX: 2,
  ATTRACTOR: 3,
  REPULSOR: 4,
  TURBULENCE: 5,
  DRAG: 6,
} as const;

/** Default configuration values */
const DEFAULTS: Required<GPUParticleSystemConfig> = {
  maxParticles: 120_000,
  emissionShape: 'point',
  emissionSize: 1.0,
  emissionRate: 10_000,
  lifetime: [1.0, 3.0],
  speed: [1.0, 5.0],
  spread: Math.PI / 6,
  gravity: [0, -9.81, 0],
  drag: 0.01,
  startColor: new THREE.Color(0x00ffff),
  endColor: new THREE.Color(0xff00ff),
  startSize: 0.1,
  endSize: 0.02,
  startOpacity: 1.0,
  endOpacity: 0.0,
  blendMode: 'additive',
  sortMode: 'none',
  looping: true,
  worldSpace: true,
  maxForceFields: 16,
  maxCollisionPlanes: 8,
  maxCollisionSpheres: 8,
  texture: null as unknown as THREE.Texture,
  vrMode: false,
  targetFPS: 90,
};

// ---------------------------------------------------------------------------
// TSL Helper Functions
// ---------------------------------------------------------------------------

/**
 * GPU-side pseudo-random hash (PCG-inspired).
 * Deterministic given a float seed.
 */
const gpuHash = Fn(([seed]: [any]) => {
  const s = seed.toFloat().add(0.1031);
  const p = fract(s.mul(0.1031));
  const pp = p.add(p.mul(p.add(33.33)));
  return fract(pp.mul(pp.add(pp)));
});

/**
 * GPU-side hash returning vec3 (3 independent random channels).
 */
const gpuHash3 = Fn(([seed]: [any]) => {
  return vec3(
    gpuHash(seed),
    gpuHash(seed.add(127.1)),
    gpuHash(seed.add(269.5)),
  );
});

/**
 * Simplex-like noise for turbulence (3D).
 * Lightweight GPU approximation.
 */
const gpuNoise3 = Fn(([p]: [any]) => {
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)));

  const n000 = gpuHash(i.x.add(i.y.mul(157.0)).add(i.z.mul(113.0)));
  const n100 = gpuHash(i.x.add(1.0).add(i.y.mul(157.0)).add(i.z.mul(113.0)));
  const n010 = gpuHash(i.x.add(i.y.add(1.0).mul(157.0)).add(i.z.mul(113.0)));
  const n110 = gpuHash(i.x.add(1.0).add(i.y.add(1.0).mul(157.0)).add(i.z.mul(113.0)));
  const n001 = gpuHash(i.x.add(i.y.mul(157.0)).add(i.z.add(1.0).mul(113.0)));
  const n101 = gpuHash(i.x.add(1.0).add(i.y.mul(157.0)).add(i.z.add(1.0).mul(113.0)));
  const n011 = gpuHash(i.x.add(i.y.add(1.0).mul(157.0)).add(i.z.add(1.0).mul(113.0)));
  const n111 = gpuHash(i.x.add(1.0).add(i.y.add(1.0).mul(157.0)).add(i.z.add(1.0).mul(113.0)));

  const x0 = mix(n000, n100, u.x);
  const x1 = mix(n010, n110, u.x);
  const x2 = mix(n001, n101, u.x);
  const x3 = mix(n011, n111, u.x);
  const y0 = mix(x0, x1, u.y);
  const y1 = mix(x2, x3, u.y);
  return mix(y0, y1, u.z).sub(0.5).mul(2.0);
});

// ---------------------------------------------------------------------------
// GPU Particle System Class
// ---------------------------------------------------------------------------

export class GPUParticleSystem extends THREE.Object3D {
  // Configuration (merged with defaults)
  private config: Required<GPUParticleSystemConfig>;

  // Storage buffers (GPU-resident)
  private positionBuffer: any; // instancedArray
  private velocityBuffer: any;
  private lifeBuffer: any; // vec2: (age, maxLifetime)
  private colorBuffer: any; // vec4: current RGBA
  private sizeBuffer: any; // float: current size

  // Uniforms
  private deltaTimeUniform: any;
  private timeUniform: any;
  private emitterPositionUniform: any;
  private emitterDirectionUniform: any;
  private gravityUniform: any;
  private dragUniform: any;
  private lifetimeRangeUniform: any;
  private speedRangeUniform: any;
  private spreadUniform: any;
  private startColorUniform: any;
  private endColorUniform: any;
  private startSizeUniform: any;
  private endSizeUniform: any;
  private startOpacityUniform: any;
  private endOpacityUniform: any;
  private emissionShapeUniform: any;
  private emissionSizeUniform: any;
  private loopingUniform: any;
  private emissionRateUniform: any;
  private frameCounterUniform: any;
  private activeParticleCountUniform: any;

  // Force fields (packed into storage buffer)
  private forceFieldBuffer: any;
  private forceFieldCountUniform: any;

  // Collision planes (packed into storage buffer)
  private collisionPlaneBuffer: any;
  private collisionPlaneCountUniform: any;

  // Collision spheres
  private collisionSphereBuffer: any;
  private collisionSphereCountUniform: any;

  // Compute nodes
  private computeInit: any;
  private computeUpdate: any;

  // Rendering
  private particleMesh: THREE.Mesh | null = null;
  private particleMaterial: any = null; // SpriteNodeMaterial

  // State
  private initialized = false;
  private frameCounter = 0;
  private totalTime = 0;
  private activeForceFields: ForceFieldDescriptor[] = [];
  private activeCollisionPlanes: CollisionPlaneDescriptor[] = [];
  private activeCollisionSpheres: CollisionSphereDescriptor[] = [];

  // Performance monitoring
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private adaptiveQuality = 1.0; // 0..1 quality multiplier

  constructor(config: GPUParticleSystemConfig = {}) {
    super();
    this.name = 'GPUParticleSystem';

    // Merge config with defaults
    this.config = { ...DEFAULTS, ...config };
    if (config.startColor) this.config.startColor = config.startColor.clone();
    if (config.endColor) this.config.endColor = config.endColor.clone();

    // Create storage buffers
    this.createStorageBuffers();

    // Create uniforms
    this.createUniforms();

    // Build compute shaders
    this.buildInitComputeShader();
    this.buildUpdateComputeShader();

    // Build render material and mesh
    this.buildRenderPipeline();
  }

  // =========================================================================
  // STORAGE BUFFER CREATION
  // =========================================================================

  private createStorageBuffers(): void {
    const count = this.config.maxParticles;

    // Per-particle state
    this.positionBuffer = instancedArray(count, 'vec3');
    this.velocityBuffer = instancedArray(count, 'vec3');
    this.lifeBuffer = instancedArray(count, 'vec2'); // (age, maxLifetime)
    this.colorBuffer = instancedArray(count, 'vec4');
    this.sizeBuffer = instancedArray(count, 'float');

    // Force fields: each is 4x vec4 = 16 floats
    // Pack as: [type, posX, posY, posZ] [dirX, dirY, dirZ, strength] [radius, falloff, param0, 0]
    this.forceFieldBuffer = instancedArray(this.config.maxForceFields * 3, 'vec4');

    // Collision planes: each is 2x vec4
    // Pack as: [normalX, normalY, normalZ, distance] [restitution, friction, 0, 0]
    this.collisionPlaneBuffer = instancedArray(this.config.maxCollisionPlanes * 2, 'vec4');

    // Collision spheres: each is 2x vec4
    // Pack as: [centerX, centerY, centerZ, radius] [restitution, friction, 0, 0]
    this.collisionSphereBuffer = instancedArray(this.config.maxCollisionSpheres * 2, 'vec4');
  }

  // =========================================================================
  // UNIFORM CREATION
  // =========================================================================

  private createUniforms(): void {
    this.deltaTimeUniform = uniform(0.016);
    this.timeUniform = uniform(0.0);
    this.emitterPositionUniform = uniform(new THREE.Vector3(0, 0, 0));
    this.emitterDirectionUniform = uniform(new THREE.Vector3(0, 1, 0));
    this.gravityUniform = uniform(new THREE.Vector3(...this.config.gravity));
    this.dragUniform = uniform(this.config.drag);
    this.lifetimeRangeUniform = uniform(new THREE.Vector2(this.config.lifetime[0], this.config.lifetime[1]));
    this.speedRangeUniform = uniform(new THREE.Vector2(this.config.speed[0], this.config.speed[1]));
    this.spreadUniform = uniform(this.config.spread);
    this.startColorUniform = uniform(this.config.startColor);
    this.endColorUniform = uniform(this.config.endColor);
    this.startSizeUniform = uniform(this.config.startSize);
    this.endSizeUniform = uniform(this.config.endSize);
    this.startOpacityUniform = uniform(this.config.startOpacity);
    this.endOpacityUniform = uniform(this.config.endOpacity);
    this.emissionShapeUniform = uniform(this.getEmissionShapeIndex());
    this.emissionSizeUniform = uniform(
      typeof this.config.emissionSize === 'number'
        ? new THREE.Vector3(this.config.emissionSize, this.config.emissionSize, this.config.emissionSize)
        : new THREE.Vector3(...this.config.emissionSize),
    );
    this.loopingUniform = uniform(this.config.looping ? 1.0 : 0.0);
    this.emissionRateUniform = uniform(this.config.emissionRate);
    this.frameCounterUniform = uniform(0.0);
    this.activeParticleCountUniform = uniform(float(this.config.maxParticles));

    this.forceFieldCountUniform = uniform(0.0);
    this.collisionPlaneCountUniform = uniform(0.0);
    this.collisionSphereCountUniform = uniform(0.0);
  }

  private getEmissionShapeIndex(): number {
    const map: Record<EmissionShape, number> = {
      point: 0,
      sphere: 1,
      hemisphere: 2,
      box: 3,
      cone: 4,
      ring: 5,
      disc: 6,
    };
    return map[this.config.emissionShape] ?? 0;
  }

  // =========================================================================
  // INITIALIZATION COMPUTE SHADER
  // =========================================================================

  private buildInitComputeShader(): void {
    const {
      positionBuffer,
      velocityBuffer,
      lifeBuffer,
      colorBuffer,
      sizeBuffer,
      emitterPositionUniform,
      lifetimeRangeUniform,
      speedRangeUniform,
      emitterDirectionUniform,
      spreadUniform,
      startColorUniform,
      startSizeUniform,
      startOpacityUniform,
      emissionShapeUniform,
      emissionSizeUniform,
    } = this;

    this.computeInit = Fn(() => {
      const idx = instanceIndex;
      const seed = idx.toFloat().add(42.0);
      const rnd = gpuHash3(seed);

      // Spawn position based on emission shape
      const spawnPos = this.buildSpawnPosition(seed, emitterPositionUniform, emissionShapeUniform, emissionSizeUniform);
      positionBuffer.element(idx).assign(spawnPos);

      // Spawn velocity based on emission direction + spread
      const spawnVel = this.buildSpawnVelocity(seed, emitterDirectionUniform, speedRangeUniform, spreadUniform);
      velocityBuffer.element(idx).assign(spawnVel);

      // Life: age=0, maxLifetime = random in range
      const maxLife = mix(lifetimeRangeUniform.x, lifetimeRangeUniform.y, gpuHash(seed.add(500.0)));
      // Stagger initial ages so particles don't all spawn at once
      const staggeredAge = gpuHash(seed.add(600.0)).mul(maxLife);
      lifeBuffer.element(idx).assign(vec2(staggeredAge, maxLife));

      // Color
      colorBuffer.element(idx).assign(vec4(startColorUniform, startOpacityUniform));

      // Size
      sizeBuffer.element(idx).assign(startSizeUniform);
    })().compute(this.config.maxParticles);
  }

  // =========================================================================
  // SPAWN HELPERS (TSL function builders)
  // =========================================================================

  private buildSpawnPosition(
    seed: any,
    emitterPos: any,
    shapeType: any,
    emissionSize: any,
  ): any {
    // Generate random offsets
    const r1 = gpuHash(seed.add(100.0));
    const r2 = gpuHash(seed.add(200.0));
    const r3 = gpuHash(seed.add(300.0));

    // Spherical coordinates for sphere/hemisphere
    const theta = r1.mul(Math.PI * 2);
    const phi = r2.mul(Math.PI);
    const radius = r3.pow(1.0 / 3.0).mul(emissionSize.x);

    const sinPhi = sin(phi);
    const cosPhi = cos(phi);
    const sinTheta = sin(theta);
    const cosTheta = cos(theta);

    // Sphere position
    const spherePos = vec3(
      sinPhi.mul(cosTheta).mul(radius),
      cosPhi.mul(radius),
      sinPhi.mul(sinTheta).mul(radius),
    );

    // Box position
    const boxPos = vec3(
      r1.sub(0.5).mul(2.0).mul(emissionSize.x),
      r2.sub(0.5).mul(2.0).mul(emissionSize.y),
      r3.sub(0.5).mul(2.0).mul(emissionSize.z),
    );

    // Ring position
    const ringPos = vec3(
      cosTheta.mul(emissionSize.x),
      float(0.0),
      sinTheta.mul(emissionSize.x),
    );

    // Disc position
    const discRadius = sqrt(r2).mul(emissionSize.x);
    const discPos = vec3(
      cosTheta.mul(discRadius),
      float(0.0),
      sinTheta.mul(discRadius),
    );

    // Select based on shape type (0=point, 1=sphere, 2=hemisphere, 3=box, 4=cone, 5=ring, 6=disc)
    // Use stepped mixing to select the right shape
    const pos = vec3(0, 0, 0).toVar();
    // Default: point
    pos.assign(vec3(0, 0, 0));

    If(shapeType.greaterThan(0.5), () => {
      pos.assign(spherePos); // sphere
    });
    If(shapeType.greaterThan(1.5), () => {
      // hemisphere: clamp y >= 0
      pos.assign(vec3(spherePos.x, abs(spherePos.y), spherePos.z));
    });
    If(shapeType.greaterThan(2.5), () => {
      pos.assign(boxPos);
    });
    If(shapeType.greaterThan(3.5), () => {
      // cone: mix of point at apex to disc at base
      const t = r3;
      const coneRadius = t.mul(emissionSize.x);
      pos.assign(vec3(cosTheta.mul(coneRadius), t.mul(emissionSize.y), sinTheta.mul(coneRadius)));
    });
    If(shapeType.greaterThan(4.5), () => {
      pos.assign(ringPos);
    });
    If(shapeType.greaterThan(5.5), () => {
      pos.assign(discPos);
    });

    return pos.add(emitterPos);
  }

  private buildSpawnVelocity(
    seed: any,
    direction: any,
    speedRange: any,
    spread: any,
  ): any {
    const r1 = gpuHash(seed.add(700.0));
    const r2 = gpuHash(seed.add(800.0));
    const r3 = gpuHash(seed.add(900.0));

    // Random speed in range
    const speed = mix(speedRange.x, speedRange.y, r1);

    // Random direction within cone around emitter direction
    const theta = r2.mul(Math.PI * 2);
    const cosSpread = cos(spread.mul(r3));
    const sinSpread = sin(spread.mul(r3));

    // Build tangent frame from direction
    const up = vec3(0, 1, 0);
    const dir = normalize(direction);
    const right = normalize(cross(up, dir));
    const forward = normalize(cross(dir, right));

    // Spread around main direction
    const vel = dir
      .mul(cosSpread)
      .add(right.mul(sinSpread.mul(cos(theta))))
      .add(forward.mul(sinSpread.mul(sin(theta))));

    return normalize(vel).mul(speed);
  }

  // =========================================================================
  // UPDATE COMPUTE SHADER
  // =========================================================================

  private buildUpdateComputeShader(): void {
    const {
      positionBuffer,
      velocityBuffer,
      lifeBuffer,
      colorBuffer,
      sizeBuffer,
      deltaTimeUniform,
      timeUniform,
      gravityUniform,
      dragUniform,
      startColorUniform,
      endColorUniform,
      startSizeUniform,
      endSizeUniform,
      startOpacityUniform,
      endOpacityUniform,
      loopingUniform,
      emitterPositionUniform,
      emitterDirectionUniform,
      lifetimeRangeUniform,
      speedRangeUniform,
      spreadUniform,
      emissionShapeUniform,
      emissionSizeUniform,
      forceFieldBuffer,
      forceFieldCountUniform,
      collisionPlaneBuffer,
      collisionPlaneCountUniform,
      collisionSphereBuffer,
      collisionSphereCountUniform,
    } = this;

    const maxFF = this.config.maxForceFields;
    const maxCP = this.config.maxCollisionPlanes;
    const maxCS = this.config.maxCollisionSpheres;

    this.computeUpdate = Fn(() => {
      const idx = instanceIndex;
      const dt = deltaTimeUniform;
      const t = timeUniform;

      // Read current state
      const pos = positionBuffer.element(idx).toVar();
      const vel = velocityBuffer.element(idx).toVar();
      const life = lifeBuffer.element(idx).toVar();

      const age = life.x;
      const maxLife = life.y;
      const lifeRatio = clamp(age.div(maxLife), 0.0, 1.0);

      // ---- PARTICLE RESPAWN ----
      If(age.greaterThanEqual(maxLife), () => {
        If(loopingUniform.greaterThan(0.5), () => {
          // Respawn
          const seed = idx.toFloat().add(t.mul(1000.0));
          const newPos = this.buildSpawnPosition(seed, emitterPositionUniform, emissionShapeUniform, emissionSizeUniform);
          const newVel = this.buildSpawnVelocity(seed, emitterDirectionUniform, speedRangeUniform, spreadUniform);
          const newMaxLife = mix(lifetimeRangeUniform.x, lifetimeRangeUniform.y, gpuHash(seed.add(500.0)));

          pos.assign(newPos);
          vel.assign(newVel);
          life.assign(vec2(0.0, newMaxLife));

          positionBuffer.element(idx).assign(pos);
          velocityBuffer.element(idx).assign(vel);
          lifeBuffer.element(idx).assign(life);
          colorBuffer.element(idx).assign(vec4(startColorUniform, startOpacityUniform));
          sizeBuffer.element(idx).assign(startSizeUniform);
        }).Else(() => {
          // Dead particle: zero out size and make invisible
          sizeBuffer.element(idx).assign(0.0);
          colorBuffer.element(idx).assign(vec4(0, 0, 0, 0));
        });
      }).Else(() => {
        // ---- FORCE ACCUMULATION ----
        const totalForce = vec3(0, 0, 0).toVar();

        // Global gravity
        totalForce.addAssign(gravityUniform);

        // Force fields
        const ffCount = forceFieldCountUniform.toInt();
        Loop({ start: 0, end: maxFF, type: 'int', condition: '<' }, ({ i }: { i: any }) => {
          If(i.greaterThanEqual(ffCount), () => { Break(); });

          const base = i.mul(3);
          const ff0 = forceFieldBuffer.element(base);     // [type, posX, posY, posZ]
          const ff1 = forceFieldBuffer.element(base.add(1)); // [dirX, dirY, dirZ, strength]
          const ff2 = forceFieldBuffer.element(base.add(2)); // [radius, falloff, param0, 0]

          const ffType = ff0.x.toInt();
          const ffPos = vec3(ff0.y, ff0.z, ff0.w);
          const ffDir = vec3(ff1.x, ff1.y, ff1.z);
          const ffStrength = ff1.w;
          const ffRadius = ff2.x;
          const ffFalloff = ff2.y;
          const ffParam0 = ff2.z;

          const toField = ffPos.sub(pos);
          const dist = length(toField);
          const dir = normalize(toField);

          // Attenuation based on radius and falloff
          const atten = float(1.0).toVar();
          If(ffRadius.greaterThan(0.001), () => {
            const normalizedDist = clamp(dist.div(ffRadius), 0.0, 1.0);
            atten.assign(float(1.0).sub(normalizedDist).pow(ffFalloff));
          });

          const force = vec3(0, 0, 0).toVar();

          // Type 0: Directional gravity
          If(ffType.equal(0), () => {
            force.assign(ffDir.mul(ffStrength));
          });

          // Type 1: Wind
          If(ffType.equal(1), () => {
            // Wind with turbulence
            const turbulence = gpuNoise3(pos.mul(ffParam0).add(t.mul(0.5)));
            force.assign(ffDir.mul(ffStrength).add(vec3(turbulence, turbulence, turbulence).mul(ffStrength.mul(0.3))));
          });

          // Type 2: Vortex
          If(ffType.equal(2), () => {
            // Tangential force around axis
            const toAxis = pos.sub(ffPos);
            const tangent = normalize(cross(ffDir, toAxis));
            force.assign(tangent.mul(ffStrength).mul(atten));
          });

          // Type 3: Attractor (pull toward point)
          If(ffType.equal(3), () => {
            force.assign(dir.mul(ffStrength).mul(atten));
          });

          // Type 4: Repulsor (push away from point)
          If(ffType.equal(4), () => {
            force.assign(dir.negate().mul(ffStrength).mul(atten));
          });

          // Type 5: Turbulence field
          If(ffType.equal(5), () => {
            const scale = ffParam0.add(0.1);
            const nx = gpuNoise3(pos.mul(scale).add(t.mul(0.3)));
            const ny = gpuNoise3(pos.mul(scale).add(vec3(100, 0, 0)).add(t.mul(0.3)));
            const nz = gpuNoise3(pos.mul(scale).add(vec3(0, 100, 0)).add(t.mul(0.3)));
            force.assign(vec3(nx, ny, nz).mul(ffStrength).mul(atten));
          });

          // Type 6: Drag zone
          If(ffType.equal(6), () => {
            force.assign(vel.negate().mul(ffStrength).mul(atten));
          });

          totalForce.addAssign(force);
        });

        // ---- DRAG ----
        const dragForce = vel.mul(dragUniform.negate());
        totalForce.addAssign(dragForce);

        // ---- VELOCITY INTEGRATION (semi-implicit Euler) ----
        vel.addAssign(totalForce.mul(dt));

        // ---- POSITION INTEGRATION ----
        pos.addAssign(vel.mul(dt));

        // ---- COLLISION DETECTION: PLANES ----
        const cpCount = collisionPlaneCountUniform.toInt();
        Loop({ start: 0, end: maxCP, type: 'int', condition: '<' }, ({ i }: { i: any }) => {
          If(i.greaterThanEqual(cpCount), () => { Break(); });

          const base = i.mul(2);
          const cp0 = collisionPlaneBuffer.element(base);
          const cp1 = collisionPlaneBuffer.element(base.add(1));

          const planeNormal = vec3(cp0.x, cp0.y, cp0.z);
          const planeDist = cp0.w;
          const restitution = cp1.x;
          const friction = cp1.y;

          // Signed distance from particle to plane
          const signedDist = dot(pos, planeNormal).sub(planeDist);

          If(signedDist.lessThan(0.0), () => {
            // Push particle out
            pos.addAssign(planeNormal.mul(signedDist.negate()));

            // Reflect velocity
            const velNormal = dot(vel, planeNormal);
            If(velNormal.lessThan(0.0), () => {
              const velN = planeNormal.mul(velNormal);
              const velT = vel.sub(velN);
              vel.assign(velT.mul(float(1.0).sub(friction)).sub(velN.mul(restitution)));
            });
          });
        });

        // ---- COLLISION DETECTION: SPHERES ----
        const csCount = collisionSphereCountUniform.toInt();
        Loop({ start: 0, end: maxCS, type: 'int', condition: '<' }, ({ i }: { i: any }) => {
          If(i.greaterThanEqual(csCount), () => { Break(); });

          const base = i.mul(2);
          const cs0 = collisionSphereBuffer.element(base);
          const cs1 = collisionSphereBuffer.element(base.add(1));

          const center = vec3(cs0.x, cs0.y, cs0.z);
          const sphereRadius = cs0.w;
          const restitution = cs1.x;
          const friction = cs1.y;

          const toCenter = pos.sub(center);
          const dist = length(toCenter);

          If(dist.lessThan(sphereRadius), () => {
            // Push particle out of sphere
            const normal = normalize(toCenter);
            pos.assign(center.add(normal.mul(sphereRadius)));

            // Reflect velocity
            const velNormal = dot(vel, normal);
            If(velNormal.lessThan(0.0), () => {
              const velN = normal.mul(velNormal);
              const velT = vel.sub(velN);
              vel.assign(velT.mul(float(1.0).sub(friction)).sub(velN.mul(restitution)));
            });
          });
        });

        // ---- AGE INTEGRATION ----
        life.x.addAssign(dt);

        // ---- COLOR/SIZE/OPACITY INTERPOLATION ----
        const newLifeRatio = clamp(life.x.div(life.y), 0.0, 1.0);
        const r = mix(startColorUniform.x, endColorUniform.x, newLifeRatio);
        const g = mix(startColorUniform.y, endColorUniform.y, newLifeRatio);
        const b = mix(startColorUniform.z, endColorUniform.z, newLifeRatio);
        const a = mix(startOpacityUniform, endOpacityUniform, newLifeRatio);
        colorBuffer.element(idx).assign(vec4(r, g, b, a));

        const newSize = mix(startSizeUniform, endSizeUniform, newLifeRatio);
        sizeBuffer.element(idx).assign(newSize);

        // ---- WRITE BACK ----
        positionBuffer.element(idx).assign(pos);
        velocityBuffer.element(idx).assign(vel);
        lifeBuffer.element(idx).assign(life);
      });
    })().compute(this.config.maxParticles);
  }

  // =========================================================================
  // RENDER PIPELINE (TSL Material)
  // =========================================================================

  private buildRenderPipeline(): void {
    const { positionBuffer, colorBuffer, sizeBuffer } = this;

    // Convert storage buffers to vertex attributes for the render pass
    const particlePos = positionBuffer.toAttribute();
    const particleColor = colorBuffer.toAttribute();
    const particleSize = sizeBuffer.toAttribute();

    // Create SpriteNodeMaterial for billboarded particles
    // SpriteNodeMaterial auto-billboards toward camera
    const material = new (THREE as any).SpriteNodeMaterial();

    // Position node reads from compute output
    material.positionNode = particlePos;

    // Procedural circle shape with soft edge
    const dist = uv().sub(0.5).length().mul(2.0);
    const circle = smoothstep(1.0, 0.7, dist);

    // Color from particle state
    material.colorNode = vec3(particleColor.x, particleColor.y, particleColor.z);

    // Opacity: particle alpha * circle shape
    material.opacityNode = particleColor.w.mul(circle);

    // Scale from particle state
    material.scaleNode = particleSize;

    // Apply texture if provided
    if (this.config.texture) {
      // Multiply circle alpha with texture sample
      const texSample = (THREE as any).texture(this.config.texture, uv());
      material.opacityNode = particleColor.w.mul(texSample.a).mul(circle);
      material.colorNode = vec3(particleColor.x, particleColor.y, particleColor.z).mul(texSample.rgb);
    }

    // Blending
    switch (this.config.blendMode) {
      case 'additive':
        material.blending = THREE.AdditiveBlending;
        break;
      case 'multiply':
        material.blending = THREE.MultiplyBlending;
        break;
      case 'normal':
      default:
        material.blending = THREE.NormalBlending;
        break;
    }

    material.transparent = true;
    material.depthWrite = false;
    material.depthTest = true;

    this.particleMaterial = material;

    // Create the sprite geometry and instanced mesh
    const geometry = new (THREE as any).SpriteGeometry();
    this.particleMesh = new THREE.Mesh(geometry, material);
    (this.particleMesh as any).count = this.config.maxParticles;
    this.particleMesh.frustumCulled = false; // Particles move freely
    this.add(this.particleMesh);
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Initialize the particle system on the GPU.
   * Must be called once with the renderer before the first frame.
   */
  async initialize(renderer: THREE.WebGLRenderer | any): Promise<void> {
    if (this.initialized) return;
    await renderer.computeAsync(this.computeInit);
    this.initialized = true;
  }

  /**
   * Update particle simulation. Call once per frame.
   * @param renderer - WebGPURenderer or WebGLRenderer with compute support
   * @param deltaTime - Frame delta in seconds
   */
  async update(renderer: THREE.WebGLRenderer | any, deltaTime: number): Promise<void> {
    if (!this.initialized) {
      await this.initialize(renderer);
    }

    // Clamp delta to avoid explosion on tab-resume
    const dt = Math.min(deltaTime, 0.05);

    this.totalTime += dt;
    this.frameCounter++;

    // Update uniforms
    this.deltaTimeUniform.value = dt;
    this.timeUniform.value = this.totalTime;
    this.frameCounterUniform.value = this.frameCounter;

    // Sync emitter world position
    this.getWorldPosition(this.emitterPositionUniform.value);
    const worldDir = new THREE.Vector3(0, 1, 0);
    this.getWorldDirection(worldDir);
    this.emitterDirectionUniform.value.copy(worldDir);

    // Upload force fields
    this.syncForceFields();

    // Upload collision descriptors
    this.syncCollisionPlanes();
    this.syncCollisionSpheres();

    // Adaptive quality for VR
    if (this.config.vrMode) {
      this.updateAdaptiveQuality(dt);
    }

    // Dispatch compute
    await renderer.computeAsync(this.computeUpdate);

    // Performance tracking
    this.trackFrameTime(dt);
  }

  // =========================================================================
  // FORCE FIELD MANAGEMENT
  // =========================================================================

  /**
   * Add a force field.
   * @returns index of the added force field
   */
  addForceField(descriptor: ForceFieldDescriptor): number {
    if (this.activeForceFields.length >= this.config.maxForceFields) {
      console.warn(`[GPUParticleSystem] Max force fields (${this.config.maxForceFields}) reached`);
      return -1;
    }
    this.activeForceFields.push({ ...descriptor, position: descriptor.position.clone(), direction: descriptor.direction.clone() });
    return this.activeForceFields.length - 1;
  }

  /**
   * Update an existing force field.
   */
  updateForceField(index: number, descriptor: Partial<ForceFieldDescriptor>): void {
    if (index < 0 || index >= this.activeForceFields.length) return;
    const ff = this.activeForceFields[index];
    if (descriptor.type !== undefined) ff.type = descriptor.type;
    if (descriptor.position) ff.position.copy(descriptor.position);
    if (descriptor.direction) ff.direction.copy(descriptor.direction);
    if (descriptor.strength !== undefined) ff.strength = descriptor.strength;
    if (descriptor.radius !== undefined) ff.radius = descriptor.radius;
    if (descriptor.falloff !== undefined) ff.falloff = descriptor.falloff;
    if (descriptor.param0 !== undefined) ff.param0 = descriptor.param0;
  }

  /**
   * Remove a force field by index.
   */
  removeForceField(index: number): void {
    if (index >= 0 && index < this.activeForceFields.length) {
      this.activeForceFields.splice(index, 1);
    }
  }

  /**
   * Clear all force fields.
   */
  clearForceFields(): void {
    this.activeForceFields.length = 0;
  }

  private syncForceFields(): void {
    this.forceFieldCountUniform.value = this.activeForceFields.length;

    // Upload to storage buffer (CPU -> GPU via attribute array)
    const attr = this.forceFieldBuffer.value;
    if (!attr || !attr.array) return;

    const data = attr.array as Float32Array;
    for (let i = 0; i < this.activeForceFields.length; i++) {
      const ff = this.activeForceFields[i];
      const base = i * 3 * 4; // 3 vec4s, 4 floats each
      // vec4 0: [type, posX, posY, posZ]
      data[base + 0] = ff.type;
      data[base + 1] = ff.position.x;
      data[base + 2] = ff.position.y;
      data[base + 3] = ff.position.z;
      // vec4 1: [dirX, dirY, dirZ, strength]
      data[base + 4] = ff.direction.x;
      data[base + 5] = ff.direction.y;
      data[base + 6] = ff.direction.z;
      data[base + 7] = ff.strength;
      // vec4 2: [radius, falloff, param0, 0]
      data[base + 8] = ff.radius;
      data[base + 9] = ff.falloff;
      data[base + 10] = ff.param0;
      data[base + 11] = 0;
    }

    attr.needsUpdate = true;
  }

  // =========================================================================
  // COLLISION MANAGEMENT
  // =========================================================================

  /**
   * Add a collision plane.
   */
  addCollisionPlane(descriptor: CollisionPlaneDescriptor): number {
    if (this.activeCollisionPlanes.length >= this.config.maxCollisionPlanes) {
      console.warn(`[GPUParticleSystem] Max collision planes (${this.config.maxCollisionPlanes}) reached`);
      return -1;
    }
    this.activeCollisionPlanes.push({
      ...descriptor,
      normal: descriptor.normal.clone(),
    });
    return this.activeCollisionPlanes.length - 1;
  }

  /**
   * Add a ground plane at y=0.
   */
  addGroundPlane(restitution = 0.3, friction = 0.5): number {
    return this.addCollisionPlane({
      normal: new THREE.Vector3(0, 1, 0),
      distance: 0,
      restitution,
      friction,
    });
  }

  /**
   * Add a collision sphere.
   */
  addCollisionSphere(descriptor: CollisionSphereDescriptor): number {
    if (this.activeCollisionSpheres.length >= this.config.maxCollisionSpheres) {
      console.warn(`[GPUParticleSystem] Max collision spheres (${this.config.maxCollisionSpheres}) reached`);
      return -1;
    }
    this.activeCollisionSpheres.push({
      ...descriptor,
      center: descriptor.center.clone(),
    });
    return this.activeCollisionSpheres.length - 1;
  }

  /**
   * Update a collision sphere.
   */
  updateCollisionSphere(index: number, descriptor: Partial<CollisionSphereDescriptor>): void {
    if (index < 0 || index >= this.activeCollisionSpheres.length) return;
    const cs = this.activeCollisionSpheres[index];
    if (descriptor.center) cs.center.copy(descriptor.center);
    if (descriptor.radius !== undefined) cs.radius = descriptor.radius;
    if (descriptor.restitution !== undefined) cs.restitution = descriptor.restitution;
    if (descriptor.friction !== undefined) cs.friction = descriptor.friction;
  }

  /**
   * Clear all colliders.
   */
  clearColliders(): void {
    this.activeCollisionPlanes.length = 0;
    this.activeCollisionSpheres.length = 0;
  }

  private syncCollisionPlanes(): void {
    this.collisionPlaneCountUniform.value = this.activeCollisionPlanes.length;

    const attr = this.collisionPlaneBuffer.value;
    if (!attr || !attr.array) return;

    const data = attr.array as Float32Array;
    for (let i = 0; i < this.activeCollisionPlanes.length; i++) {
      const cp = this.activeCollisionPlanes[i];
      const base = i * 2 * 4;
      data[base + 0] = cp.normal.x;
      data[base + 1] = cp.normal.y;
      data[base + 2] = cp.normal.z;
      data[base + 3] = cp.distance;
      data[base + 4] = cp.restitution;
      data[base + 5] = cp.friction;
      data[base + 6] = 0;
      data[base + 7] = 0;
    }

    attr.needsUpdate = true;
  }

  private syncCollisionSpheres(): void {
    this.collisionSphereCountUniform.value = this.activeCollisionSpheres.length;

    const attr = this.collisionSphereBuffer.value;
    if (!attr || !attr.array) return;

    const data = attr.array as Float32Array;
    for (let i = 0; i < this.activeCollisionSpheres.length; i++) {
      const cs = this.activeCollisionSpheres[i];
      const base = i * 2 * 4;
      data[base + 0] = cs.center.x;
      data[base + 1] = cs.center.y;
      data[base + 2] = cs.center.z;
      data[base + 3] = cs.radius;
      data[base + 4] = cs.restitution;
      data[base + 5] = cs.friction;
      data[base + 6] = 0;
      data[base + 7] = 0;
    }

    attr.needsUpdate = true;
  }

  // =========================================================================
  // RUNTIME CONFIGURATION
  // =========================================================================

  /** Set gravity vector */
  setGravity(x: number, y: number, z: number): void {
    this.gravityUniform.value.set(x, y, z);
  }

  /** Set global drag coefficient */
  setDrag(drag: number): void {
    this.dragUniform.value = drag;
  }

  /** Set emission rate (particles per second) */
  setEmissionRate(rate: number): void {
    this.emissionRateUniform.value = rate;
  }

  /** Set particle color range */
  setColors(start: THREE.Color, end: THREE.Color): void {
    this.startColorUniform.value.copy(start);
    this.endColorUniform.value.copy(end);
  }

  /** Set particle size range */
  setSizes(start: number, end: number): void {
    this.startSizeUniform.value = start;
    this.endSizeUniform.value = end;
  }

  /** Set particle opacity range */
  setOpacity(start: number, end: number): void {
    this.startOpacityUniform.value = start;
    this.endOpacityUniform.value = end;
  }

  /** Set looping behavior */
  setLooping(looping: boolean): void {
    this.loopingUniform.value = looping ? 1.0 : 0.0;
  }

  // =========================================================================
  // VR ADAPTIVE QUALITY
  // =========================================================================

  private updateAdaptiveQuality(dt: number): void {
    const targetFrameTime = 1.0 / this.config.targetFPS;
    const currentFrameTime = dt;

    if (currentFrameTime > targetFrameTime * 1.2) {
      // Performance degradation: reduce quality
      this.adaptiveQuality = Math.max(0.25, this.adaptiveQuality - 0.05);
    } else if (currentFrameTime < targetFrameTime * 0.8) {
      // Headroom: increase quality
      this.adaptiveQuality = Math.min(1.0, this.adaptiveQuality + 0.02);
    }

    // Adjust active particle count
    const activeCount = Math.floor(this.config.maxParticles * this.adaptiveQuality);
    this.activeParticleCountUniform.value = activeCount;
    if (this.particleMesh) {
      (this.particleMesh as any).count = activeCount;
    }
  }

  // =========================================================================
  // PERFORMANCE MONITORING
  // =========================================================================

  private trackFrameTime(dt: number): void {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 120) {
      this.frameTimes.shift();
    }
  }

  /**
   * Get performance metrics.
   */
  getPerformanceMetrics(): {
    avgFrameTime: number;
    avgFPS: number;
    minFPS: number;
    maxFPS: number;
    adaptiveQuality: number;
    activeParticles: number;
    totalParticles: number;
    forceFieldCount: number;
    colliderCount: number;
  } {
    const times = this.frameTimes;
    if (times.length === 0) {
      return {
        avgFrameTime: 0,
        avgFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        adaptiveQuality: this.adaptiveQuality,
        activeParticles: this.config.maxParticles,
        totalParticles: this.config.maxParticles,
        forceFieldCount: this.activeForceFields.length,
        colliderCount: this.activeCollisionPlanes.length + this.activeCollisionSpheres.length,
      };
    }

    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      avgFrameTime: avg * 1000,
      avgFPS: 1.0 / avg,
      minFPS: 1.0 / maxTime,
      maxFPS: 1.0 / minTime,
      adaptiveQuality: this.adaptiveQuality,
      activeParticles: Math.floor(this.config.maxParticles * this.adaptiveQuality),
      totalParticles: this.config.maxParticles,
      forceFieldCount: this.activeForceFields.length,
      colliderCount: this.activeCollisionPlanes.length + this.activeCollisionSpheres.length,
    };
  }

  /**
   * Generate a human-readable performance report.
   */
  generateReport(): string {
    const m = this.getPerformanceMetrics();
    return [
      `=== GPU Particle System Report ===`,
      `Particles: ${m.activeParticles}/${m.totalParticles} (quality: ${(m.adaptiveQuality * 100).toFixed(0)}%)`,
      `FPS: ${m.avgFPS.toFixed(1)} avg | ${m.minFPS.toFixed(1)} min | ${m.maxFPS.toFixed(1)} max`,
      `Frame Time: ${m.avgFrameTime.toFixed(2)}ms`,
      `Force Fields: ${m.forceFieldCount}`,
      `Colliders: ${m.colliderCount}`,
      `VR Mode: ${this.config.vrMode ? 'ON' : 'OFF'}`,
      `Backend: TSL (WebGPU/WebGL2 portable)`,
    ].join('\n');
  }

  // =========================================================================
  // DISPOSAL
  // =========================================================================

  /**
   * Dispose of all GPU resources.
   */
  dispose(): void {
    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      if (this.particleMaterial) {
        this.particleMaterial.dispose();
      }
      this.remove(this.particleMesh);
      this.particleMesh = null;
    }

    // Storage buffers are managed by Three.js garbage collection
    this.activeForceFields.length = 0;
    this.activeCollisionPlanes.length = 0;
    this.activeCollisionSpheres.length = 0;
    this.frameTimes.length = 0;
    this.initialized = false;
  }
}

// ---------------------------------------------------------------------------
// Factory Functions
// ---------------------------------------------------------------------------

/**
 * Create a GPU particle system with default settings.
 */
export function createGPUParticleSystem(config?: GPUParticleSystemConfig): GPUParticleSystem {
  return new GPUParticleSystem(config);
}

/**
 * Create a fire effect particle system.
 */
export function createFireEffect(options?: {
  position?: THREE.Vector3;
  maxParticles?: number;
  intensity?: number;
}): GPUParticleSystem {
  const intensity = options?.intensity ?? 1.0;
  const system = new GPUParticleSystem({
    maxParticles: options?.maxParticles ?? 30_000,
    emissionShape: 'disc',
    emissionSize: 0.5 * intensity,
    emissionRate: 5_000 * intensity,
    lifetime: [0.3, 1.5],
    speed: [2.0, 5.0],
    spread: Math.PI / 8,
    gravity: [0, 2.0, 0], // Upward buoyancy
    drag: 0.05,
    startColor: new THREE.Color(0xffaa00),
    endColor: new THREE.Color(0xff2200),
    startSize: 0.15 * intensity,
    endSize: 0.02,
    startOpacity: 1.0,
    endOpacity: 0.0,
    blendMode: 'additive',
  });

  if (options?.position) {
    system.position.copy(options.position);
  }

  return system;
}

/**
 * Create a snow effect particle system.
 */
export function createSnowEffect(options?: {
  area?: number;
  maxParticles?: number;
  density?: number;
}): GPUParticleSystem {
  const area = options?.area ?? 50;
  const system = new GPUParticleSystem({
    maxParticles: options?.maxParticles ?? 50_000,
    emissionShape: 'box',
    emissionSize: [area, 1, area],
    emissionRate: 2_000 * (options?.density ?? 1.0),
    lifetime: [5.0, 10.0],
    speed: [0.1, 0.5],
    spread: Math.PI / 4,
    gravity: [0, -1.5, 0],
    drag: 0.1,
    startColor: new THREE.Color(0xffffff),
    endColor: new THREE.Color(0xccccff),
    startSize: 0.05,
    endSize: 0.03,
    startOpacity: 0.8,
    endOpacity: 0.2,
    blendMode: 'normal',
  });

  system.position.set(0, area / 2, 0);

  // Add gentle wind turbulence
  system.addForceField({
    type: FORCE_TYPE.TURBULENCE,
    position: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(1, 0, 0),
    strength: 0.5,
    radius: 0,
    falloff: 1,
    param0: 0.1,
  });

  return system;
}

/**
 * Create a magic sparkle effect.
 */
export function createSparkleEffect(options?: {
  position?: THREE.Vector3;
  maxParticles?: number;
  color?: THREE.Color;
}): GPUParticleSystem {
  const system = new GPUParticleSystem({
    maxParticles: options?.maxParticles ?? 10_000,
    emissionShape: 'sphere',
    emissionSize: 0.3,
    emissionRate: 3_000,
    lifetime: [0.5, 2.0],
    speed: [0.5, 3.0],
    spread: Math.PI,
    gravity: [0, -0.5, 0],
    drag: 0.02,
    startColor: options?.color ?? new THREE.Color(0x00ffff),
    endColor: new THREE.Color(0xffffff),
    startSize: 0.08,
    endSize: 0.01,
    startOpacity: 1.0,
    endOpacity: 0.0,
    blendMode: 'additive',
  });

  if (options?.position) {
    system.position.copy(options.position);
  }

  return system;
}

/**
 * Create a VR-optimized particle fountain.
 * Targets 90fps with adaptive quality.
 */
export function createVRParticleFountain(options?: {
  position?: THREE.Vector3;
  maxParticles?: number;
}): GPUParticleSystem {
  const system = new GPUParticleSystem({
    maxParticles: options?.maxParticles ?? 120_000,
    emissionShape: 'cone',
    emissionSize: 0.2,
    emissionRate: 20_000,
    lifetime: [1.0, 4.0],
    speed: [5.0, 15.0],
    spread: Math.PI / 6,
    gravity: [0, -9.81, 0],
    drag: 0.01,
    startColor: new THREE.Color(0x00aaff),
    endColor: new THREE.Color(0x0044ff),
    startSize: 0.06,
    endSize: 0.02,
    startOpacity: 0.9,
    endOpacity: 0.0,
    blendMode: 'additive',
    vrMode: true,
    targetFPS: 90,
  });

  // Ground collision
  system.addGroundPlane(0.4, 0.3);

  if (options?.position) {
    system.position.copy(options.position);
  }

  return system;
}
