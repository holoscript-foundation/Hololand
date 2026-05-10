export interface PBDConfig {
  iterations?: number;
  damping?: number;
  gravity?: [number, number, number];
  timeStep?: number;
}

export interface Particle {
  position: [number, number, number];
  previousPosition: [number, number, number];
  inverseMass: number;
}

export interface DistanceConstraint {
  particleA: number;
  particleB: number;
  restLength: number;
  stiffness?: number;
}

export class PositionBasedDynamicsSolver {
  private particles: Particle[] = [];
  private constraints: DistanceConstraint[] = [];
  private readonly config: Required<PBDConfig>;

  constructor(config: PBDConfig = {}) {
    this.config = {
      iterations: 4,
      damping: 0.98,
      gravity: [0, -9.81, 0],
      timeStep: 1 / 60,
      ...config,
    };
  }

  setParticles(particles: Particle[]): void {
    this.particles = particles.map((particle) => ({
      position: [...particle.position],
      previousPosition: [...particle.previousPosition],
      inverseMass: particle.inverseMass,
    }));
  }

  setConstraints(constraints: DistanceConstraint[]): void {
    this.constraints = constraints.map((constraint) => ({ ...constraint }));
  }

  getParticles(): readonly Particle[] {
    return this.particles;
  }

  getConstraints(): readonly DistanceConstraint[] {
    return this.constraints;
  }

  step(): void {
    throw new Error(
      'PositionBasedDynamicsSolver.step requires the full PBD integration pipeline, which is not bundled in this compatibility facade.'
    );
  }

  getConfig(): Readonly<Required<PBDConfig>> {
    return this.config;
  }
}
