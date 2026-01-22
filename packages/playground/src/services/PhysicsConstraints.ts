/**
 * Physics Constraints System - Tier 3
 * Joints, springs, and advanced physics constraints
 */

export interface ConstraintConfig {
  breakForce?: number;
  breakTorque?: number;
  collisionEnabled?: boolean;
  enablePreProcessing?: boolean;
}

export interface JointConfig extends ConstraintConfig {
  limitMin?: number;
  limitMax?: number;
  useHardLimit?: boolean;
  freeAxis?: [boolean, boolean, boolean];
}

export interface SpringConfig extends ConstraintConfig {
  restLength: number;
  stiffness: number;
  damping: number;
  maxForce?: number;
}

export interface DistanceConstraintConfig extends ConstraintConfig {
  minDistance: number;
  maxDistance: number;
}

/**
 * Constraint Base Class
 */
export abstract class PhysicsConstraintBase {
  public id: string;
  public bodyA: string;
  public bodyB?: string;
  public anchorA: [number, number, number];
  public anchorB?: [number, number, number];
  public isEnabled: boolean = true;
  protected config: ConstraintConfig;

  constructor(
    id: string,
    bodyA: string,
    anchorA: [number, number, number] = [0, 0, 0],
    bodyB?: string,
    anchorB?: [number, number, number],
    config?: ConstraintConfig
  ) {
    this.id = id;
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.anchorA = anchorA;
    this.anchorB = anchorB;
    this.config = config || {};
  }

  abstract getType(): string;
  abstract serialize(): Record<string, any>;
  abstract validate(): boolean;
}

/**
 * Hinge Joint - Rotates around single axis
 */
export class HingeJoint extends PhysicsConstraintBase {
  public axis: [number, number, number];
  public config: JointConfig;

  constructor(
    id: string,
    bodyA: string,
    bodyB: string,
    axis: [number, number, number] = [0, 1, 0],
    config?: JointConfig
  ) {
    super(id, bodyA, [0, 0, 0], bodyB, [0, 0, 0], config);
    this.axis = this.normalizeAxis(axis);
    this.config = { limitMin: -Math.PI, limitMax: Math.PI, ...config };
  }

  private normalizeAxis(axis: [number, number, number]): [number, number, number] {
    const length = Math.sqrt(axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2);
    if (length === 0) return [0, 1, 0];
    return [axis[0] / length, axis[1] / length, axis[2] / length];
  }

  setLimits(min: number, max: number): void {
    this.config.limitMin = min;
    this.config.limitMax = max;
  }

  getType(): string {
    return 'hinge';
  }

  serialize(): Record<string, any> {
    return {
      id: this.id,
      type: 'hinge',
      bodyA: this.bodyA,
      bodyB: this.bodyB,
      axis: this.axis,
      config: this.config,
    };
  }

  validate(): boolean {
    return Boolean(this.bodyA && this.bodyB);
  }
}

/**
 * Ball Socket Joint - Free rotation, distance constraint
 */
export class BallSocketJoint extends PhysicsConstraintBase {
  public config: DistanceConstraintConfig;

  constructor(
    id: string,
    bodyA: string,
    bodyB: string,
    anchorA: [number, number, number] = [0, 0, 0],
    anchorB: [number, number, number] = [0, 0, 0],
    config?: DistanceConstraintConfig
  ) {
    super(id, bodyA, anchorA, bodyB, anchorB, config);
    this.config = {
      minDistance: 0,
      maxDistance: 0,
      ...config,
    };
  }

  getType(): string {
    return 'ball-socket';
  }

  serialize(): Record<string, any> {
    return {
      id: this.id,
      type: 'ball-socket',
      bodyA: this.bodyA,
      bodyB: this.bodyB,
      anchorA: this.anchorA,
      anchorB: this.anchorB,
      config: this.config,
    };
  }

  validate(): boolean {
    return Boolean(this.bodyA && this.bodyB);
  }
}

/**
 * Spring Constraint - Oscillating force between bodies
 */
export class SpringConstraint extends PhysicsConstraintBase {
  public config: SpringConfig;
  private currentLength: number = 0;
  private lastForce: number = 0;

  constructor(
    id: string,
    bodyA: string,
    bodyB: string,
    restLength: number = 1,
    stiffness: number = 100,
    damping: number = 0.1,
    config?: SpringConfig
  ) {
    super(id, bodyA, [0, 0, 0], bodyB, [0, 0, 0], config);
    this.config = {
      restLength,
      stiffness,
      damping,
      maxForce: 10000,
      ...config,
    };
  }

  /**
   * Calculate spring force using Hooke's law: F = -k * (x - x0) - c * v
   * Where:
   *  k = spring constant (stiffness)
   *  x = current length
   *  x0 = rest length
   *  c = damping coefficient
   *  v = relative velocity
   */
  calculateForce(currentLength: number, relativeVelocity: number): number {
    const displacement = currentLength - this.config.restLength;
    const springForce = -this.config.stiffness * displacement;
    const dampingForce = -this.config.damping * relativeVelocity;
    const totalForce = springForce + dampingForce;

    // Clamp to max force
    const maxForce = this.config.maxForce || 10000;
    this.lastForce = Math.max(-maxForce, Math.min(maxForce, totalForce));
    this.currentLength = currentLength;

    return this.lastForce;
  }

  getStiffness(): number {
    return this.config.stiffness;
  }

  setStiffness(stiffness: number): void {
    this.config.stiffness = Math.max(0, stiffness);
  }

  getDamping(): number {
    return this.config.damping;
  }

  setDamping(damping: number): void {
    this.config.damping = Math.max(0, damping);
  }

  getRestLength(): number {
    return this.config.restLength;
  }

  setRestLength(length: number): void {
    this.config.restLength = Math.max(0, length);
  }

  getLastForce(): number {
    return this.lastForce;
  }

  getType(): string {
    return 'spring';
  }

  serialize(): Record<string, any> {
    return {
      id: this.id,
      type: 'spring',
      bodyA: this.bodyA,
      bodyB: this.bodyB,
      config: this.config,
      currentLength: this.currentLength,
      lastForce: this.lastForce,
    };
  }

  validate(): boolean {
    return (
      Boolean(this.bodyA && this.bodyB) &&
      this.config.stiffness > 0 &&
      this.config.restLength >= 0
    );
  }
}

/**
 * Distance Constraint - Maintains fixed distance between bodies
 */
export class DistanceConstraint extends PhysicsConstraintBase {
  public config: DistanceConstraintConfig;

  constructor(
    id: string,
    bodyA: string,
    bodyB: string,
    distance: number = 1,
    config?: DistanceConstraintConfig
  ) {
    super(id, bodyA, [0, 0, 0], bodyB, [0, 0, 0], config);
    this.config = {
      minDistance: distance * 0.9,
      maxDistance: distance * 1.1,
      ...config,
    };
  }

  getType(): string {
    return 'distance';
  }

  serialize(): Record<string, any> {
    return {
      id: this.id,
      type: 'distance',
      bodyA: this.bodyA,
      bodyB: this.bodyB,
      config: this.config,
    };
  }

  validate(): boolean {
    return (
      Boolean(this.bodyA && this.bodyB) &&
      this.config.minDistance >= 0 &&
      this.config.maxDistance >= this.config.minDistance
    );
  }
}

/**
 * Physics Constraint Solver
 */
export class ConstraintSolver {
  private constraints: Map<string, PhysicsConstraintBase> = new Map();
  private solverIterations: number = 4;

  addConstraint(constraint: PhysicsConstraintBase): void {
    this.constraints.set(constraint.id, constraint);
  }

  removeConstraint(id: string): void {
    this.constraints.delete(id);
  }

  getConstraint(id: string): PhysicsConstraintBase | undefined {
    return this.constraints.get(id);
  }

  getAllConstraints(): PhysicsConstraintBase[] {
    return Array.from(this.constraints.values());
  }

  setSolverIterations(iterations: number): void {
    this.solverIterations = Math.max(1, iterations);
  }

  /**
   * Solve all active constraints
   * Called once per physics step
   */
  solve(
    bodies: Map<string, any>,
    deltaTime: number
  ): void {
    for (let i = 0; i < this.solverIterations; i++) {
      for (const constraint of this.constraints.values()) {
        if (!constraint.isEnabled) continue;

        try {
          this.solveConstraint(constraint, bodies, deltaTime);
        } catch (error) {
          console.error(`Failed to solve constraint ${constraint.id}:`, error);
        }
      }
    }
  }

  private solveConstraint(
    constraint: PhysicsConstraintBase,
    bodies: Map<string, any>,
    deltaTime: number
  ): void {
    const bodyA = bodies.get(constraint.bodyA);
    if (!bodyA) return;

    const bodyB = constraint.bodyB ? bodies.get(constraint.bodyB) : undefined;

    switch (constraint.getType()) {
      case 'hinge':
        this.solveHinge(constraint as HingeJoint, bodyA, bodyB, deltaTime);
        break;
      case 'ball-socket':
        this.solveBallSocket(constraint as BallSocketJoint, bodyA, bodyB, deltaTime);
        break;
      case 'spring':
        this.solveSpring(constraint as SpringConstraint, bodyA, bodyB, deltaTime);
        break;
      case 'distance':
        this.solveDistance(constraint as DistanceConstraint, bodyA, bodyB, deltaTime);
        break;
    }
  }

  private solveHinge(
    joint: HingeJoint,
    bodyA: any,
    bodyB: any | undefined,
    _deltaTime: number
  ): void {
    if (!bodyB) return;

    // Align rotations around the hinge axis
    const _dot = this.dotProduct(bodyA.rotation, joint.axis);
    const cross = this.crossProduct(bodyA.rotation, joint.axis);

    const correctiveImpulse = 0.1;
    bodyA.angularVelocity = this.subtract(
      bodyA.angularVelocity,
      this.scale(cross, correctiveImpulse)
    );
    bodyB.angularVelocity = this.add(
      bodyB.angularVelocity,
      this.scale(cross, correctiveImpulse)
    );
  }

  private solveBallSocket(
    joint: BallSocketJoint,
    bodyA: any,
    bodyB: any | undefined,
    _deltaTime: number
  ): void {
    if (!bodyB) return;

    // Calculate anchor positions in world space
    const anchorAWorld = this.add(bodyA.position, joint.anchorA);
    const anchorBWorld = bodyB ? this.add(bodyB.position, joint.anchorB!) : anchorAWorld;

    // Calculate separation
    const delta = this.subtract(anchorBWorld, anchorAWorld);
    const distance = this.magnitude(delta);
    const direction = this.normalize(delta);

    // Apply corrective impulse
    const correctiveImpulse = 0.1 * distance;
    bodyA.velocity = this.subtract(bodyA.velocity, this.scale(direction, correctiveImpulse));
    if (bodyB) {
      bodyB.velocity = this.add(bodyB.velocity, this.scale(direction, correctiveImpulse));
    }
  }

  private solveSpring(
    spring: SpringConstraint,
    bodyA: any,
    bodyB: any | undefined,
    deltaTime: number
  ): void {
    if (!bodyB) return;

    const delta = this.subtract(bodyB.position, bodyA.position);
    const currentLength = this.magnitude(delta);
    const direction = this.normalize(delta);

    const relativeVelocity = this.magnitude(
      this.subtract(bodyB.velocity, bodyA.velocity)
    );

    const force = spring.calculateForce(currentLength, relativeVelocity);
    const impulse = this.scale(direction, force * deltaTime);

    bodyA.velocity = this.add(bodyA.velocity, impulse);
    bodyB.velocity = this.subtract(bodyB.velocity, impulse);
  }

  private solveDistance(
    constraint: DistanceConstraint,
    bodyA: any,
    bodyB: any | undefined,
    _deltaTime: number
  ): void {
    if (!bodyB) return;

    const delta = this.subtract(bodyB.position, bodyA.position);
    const distance = this.magnitude(delta);
    const direction = this.normalize(delta);

    const config = constraint.config;
    let correction = 0;

    if (distance > config.maxDistance) {
      correction = distance - config.maxDistance;
    } else if (distance < config.minDistance) {
      correction = config.minDistance - distance;
    }

    if (Math.abs(correction) > 0.001) {
      const impulse = this.scale(direction, correction * 0.5);
      bodyA.position = this.subtract(bodyA.position, impulse);
      bodyB.position = this.add(bodyB.position, impulse);
    }
  }

  // Vector utilities
  private add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  private subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  private scale(v: [number, number, number], s: number): [number, number, number] {
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  private magnitude(v: [number, number, number]): number {
    return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  }

  private normalize(v: [number, number, number]): [number, number, number] {
    const mag = this.magnitude(v);
    if (mag === 0) return [0, 0, 0];
    return [v[0] / mag, v[1] / mag, v[2] / mag];
  }

  private dotProduct(a: [number, number, number], b: [number, number, number]): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private crossProduct(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }
}
