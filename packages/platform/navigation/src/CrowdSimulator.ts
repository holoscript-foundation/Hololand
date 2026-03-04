/**
 * CrowdSimulator - Reynolds steering behaviors for realistic crowd movement
 *
 * Implements the three classic Reynolds flocking rules:
 *   - Separation: steer away from nearby neighbors to avoid collisions
 *   - Alignment:  steer toward the average heading of nearby neighbors
 *   - Cohesion:   steer toward the average position of nearby neighbors
 *
 * Plus a goal-seeking behavior that drives each agent toward its destination.
 *
 * Uses a spatial hash grid for O(1) amortized neighbor lookups, keeping the
 * per-frame cost at O(n) for n agents -- critical for 90fps VR rendering.
 *
 * @module CrowdSimulator
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 3D vector for positions and velocities. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Agent state returned by the simulator. */
export interface Agent {
  /** Unique agent identifier. */
  id: number;
  /** Current world-space position. */
  position: Vec3;
  /** Current velocity vector. */
  velocity: Vec3;
  /** Target position the agent is moving toward. */
  goal: Vec3;
  /** Collision/avoidance radius in meters. */
  radius: number;
  /** Maximum speed in m/s. */
  maxSpeed: number;
  /** Priority for avoidance (higher = more dominant). Default 1. */
  priority: number;
}

/** Configuration for the crowd simulator. */
export interface CrowdConfig {
  /** Maximum number of agents supported. */
  maxAgents: number;
  /** Search radius for neighbor detection (meters). */
  neighborDistance: number;
  /** Default maximum speed for agents (m/s). */
  maxSpeed: number;
  /** Weight for separation steering force. Default 1.5. */
  separationWeight?: number;
  /** Weight for alignment steering force. Default 1.0. */
  alignmentWeight?: number;
  /** Weight for cohesion steering force. Default 1.0. */
  cohesionWeight?: number;
}

// ---------------------------------------------------------------------------
// Internal agent representation
// ---------------------------------------------------------------------------

interface InternalAgent {
  id: number;
  px: number; py: number; pz: number;  // position
  vx: number; vy: number; vz: number;  // velocity
  gx: number; gy: number; gz: number;  // goal
  radius: number;
  maxSpeed: number;
  priority: number;
}

// ---------------------------------------------------------------------------
// Spatial hash grid for fast neighbor lookups
// ---------------------------------------------------------------------------

class SpatialHash {
  private cellSize: number;
  private buckets: Map<number, InternalAgent[]> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.buckets.clear();
  }

  insert(agent: InternalAgent): void {
    const key = this.hash(agent.px, agent.pz);
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    bucket.push(agent);
  }

  query(px: number, pz: number, radius: number): InternalAgent[] {
    const results: InternalAgent[] = [];
    const cs = this.cellSize;
    const minCx = Math.floor((px - radius) / cs);
    const maxCx = Math.floor((px + radius) / cs);
    const minCy = Math.floor((pz - radius) / cs);
    const maxCy = Math.floor((pz + radius) / cs);
    const r2 = radius * radius;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = this.hashInts(cx, cy);
        const bucket = this.buckets.get(key);
        if (!bucket) continue;
        for (const a of bucket) {
          const dx = a.px - px;
          const dz = a.pz - pz;
          if (dx * dx + dz * dz <= r2) {
            results.push(a);
          }
        }
      }
    }
    return results;
  }

  private hash(x: number, z: number): number {
    return this.hashInts(Math.floor(x / this.cellSize), Math.floor(z / this.cellSize));
  }

  private hashInts(cx: number, cy: number): number {
    // Simple spatial hash with large primes to reduce collisions
    return (cx * 73856093) ^ (cy * 19349663);
  }
}

// ---------------------------------------------------------------------------
// CrowdSimulator
// ---------------------------------------------------------------------------

export class CrowdSimulator {
  private readonly maxAgents: number;
  private readonly neighborDistance: number;
  private readonly separationWeight: number;
  private readonly alignmentWeight: number;
  private readonly cohesionWeight: number;

  private agents: Map<number, InternalAgent> = new Map();
  private nextId = 1;
  private spatialHash: SpatialHash;

  constructor(config: CrowdConfig) {
    this.maxAgents = config.maxAgents;
    this.neighborDistance = config.neighborDistance;
    this.separationWeight = config.separationWeight ?? 1.5;
    this.alignmentWeight = config.alignmentWeight ?? 1.0;
    this.cohesionWeight = config.cohesionWeight ?? 1.0;
    this.spatialHash = new SpatialHash(config.neighborDistance);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Add an agent to the simulation.
   * Returns an Agent snapshot including its unique `id`.
   */
  addAgent(config: {
    position: Vec3;
    goal: Vec3;
    radius: number;
    maxSpeed: number;
    priority?: number;
  }): Agent {
    if (this.agents.size >= this.maxAgents) {
      throw new Error(
        `CrowdSimulator: cannot exceed maxAgents (${this.maxAgents})`
      );
    }

    const id = this.nextId++;
    const a: InternalAgent = {
      id,
      px: config.position.x, py: config.position.y, pz: config.position.z,
      vx: 0, vy: 0, vz: 0,
      gx: config.goal.x, gy: config.goal.y, gz: config.goal.z,
      radius: config.radius,
      maxSpeed: config.maxSpeed,
      priority: config.priority ?? 1,
    };
    this.agents.set(id, a);
    return this.toPublic(a);
  }

  /** Remove an agent by id. */
  removeAgent(agentId: number): void {
    this.agents.delete(agentId);
  }

  /** Update an agent's goal position. */
  setAgentGoal(agentId: number, goal: Vec3): void {
    const a = this.agents.get(agentId);
    if (a) {
      a.gx = goal.x;
      a.gy = goal.y;
      a.gz = goal.z;
    }
  }

  /**
   * Step the simulation forward by `deltaTime` seconds.
   *
   * Applies Reynolds steering behaviors (separation, alignment, cohesion)
   * combined with goal-seeking, then integrates velocity to update positions.
   */
  update(deltaTime: number): void {
    if (deltaTime <= 0) return;

    // Rebuild spatial hash
    this.spatialHash.clear();
    for (const a of this.agents.values()) {
      this.spatialHash.insert(a);
    }

    // Compute steering forces for each agent
    const forces = new Map<number, { fx: number; fy: number; fz: number }>();

    for (const agent of this.agents.values()) {
      const neighbors = this.spatialHash.query(
        agent.px, agent.pz, this.neighborDistance
      );

      let sepX = 0, sepY = 0, sepZ = 0;
      let aliX = 0, aliY = 0, aliZ = 0;
      let cohX = 0, cohY = 0, cohZ = 0;
      let neighborCount = 0;

      for (const other of neighbors) {
        if (other.id === agent.id) continue;

        const dx = agent.px - other.px;
        const dy = agent.py - other.py;
        const dz = agent.pz - other.pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 0.0001) continue; // Overlapping -- skip to avoid NaN

        const minDist = agent.radius + other.radius;

        // --- Separation ---
        // Stronger when closer, inversely proportional to distance
        if (dist < this.neighborDistance) {
          const strength = 1.0 - dist / this.neighborDistance;
          const priorityFactor = other.priority / Math.max(agent.priority, 0.01);
          sepX += (dx / dist) * strength * priorityFactor;
          sepY += (dy / dist) * strength * priorityFactor;
          sepZ += (dz / dist) * strength * priorityFactor;

          // Hard collision push -- extra force when overlapping radii
          if (dist < minDist) {
            const overlap = (minDist - dist) / minDist;
            sepX += (dx / dist) * overlap * 3.0;
            sepY += (dy / dist) * overlap * 3.0;
            sepZ += (dz / dist) * overlap * 3.0;
          }
        }

        // --- Alignment --- (match neighbor velocity)
        aliX += other.vx;
        aliY += other.vy;
        aliZ += other.vz;

        // --- Cohesion --- (move toward neighbor center)
        cohX += other.px;
        cohY += other.py;
        cohZ += other.pz;

        neighborCount++;
      }

      // Average alignment and cohesion
      if (neighborCount > 0) {
        aliX /= neighborCount;
        aliY /= neighborCount;
        aliZ /= neighborCount;

        cohX = cohX / neighborCount - agent.px;
        cohY = cohY / neighborCount - agent.py;
        cohZ = cohZ / neighborCount - agent.pz;
      }

      // --- Goal seeking ---
      const goalDx = agent.gx - agent.px;
      const goalDy = agent.gy - agent.py;
      const goalDz = agent.gz - agent.pz;
      const goalDist = Math.sqrt(goalDx * goalDx + goalDy * goalDy + goalDz * goalDz);
      let seekX = 0, seekY = 0, seekZ = 0;
      if (goalDist > 0.01) {
        seekX = (goalDx / goalDist) * agent.maxSpeed;
        seekY = (goalDy / goalDist) * agent.maxSpeed;
        seekZ = (goalDz / goalDist) * agent.maxSpeed;
      }

      // Combine forces
      const fx = seekX
        + sepX * this.separationWeight
        + aliX * this.alignmentWeight
        + cohX * this.cohesionWeight;
      const fy = seekY
        + sepY * this.separationWeight
        + aliY * this.alignmentWeight
        + cohY * this.cohesionWeight;
      const fz = seekZ
        + sepZ * this.separationWeight
        + aliZ * this.alignmentWeight
        + cohZ * this.cohesionWeight;

      forces.set(agent.id, { fx, fy, fz });
    }

    // Integrate
    for (const agent of this.agents.values()) {
      const f = forces.get(agent.id);
      if (!f) continue;

      // Steer: desired velocity is the combined force, clamped to maxSpeed
      let dvx = f.fx;
      let dvy = f.fy;
      let dvz = f.fz;
      const speed = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
      if (speed > agent.maxSpeed) {
        const scale = agent.maxSpeed / speed;
        dvx *= scale;
        dvy *= scale;
        dvz *= scale;
      }

      // Smooth velocity change (simple exponential smoothing)
      const smoothing = Math.min(1.0, deltaTime * 5.0);
      agent.vx += (dvx - agent.vx) * smoothing;
      agent.vy += (dvy - agent.vy) * smoothing;
      agent.vz += (dvz - agent.vz) * smoothing;

      // Clamp final velocity
      const v = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy + agent.vz * agent.vz);
      if (v > agent.maxSpeed) {
        const s = agent.maxSpeed / v;
        agent.vx *= s;
        agent.vy *= s;
        agent.vz *= s;
      }

      // Arrival slowdown: decelerate when close to goal
      const gx = agent.gx - agent.px;
      const gy = agent.gy - agent.py;
      const gz = agent.gz - agent.pz;
      const gDist = Math.sqrt(gx * gx + gy * gy + gz * gz);
      const arrivalRadius = agent.radius * 2;
      if (gDist < arrivalRadius && gDist > 0.001) {
        const factor = gDist / arrivalRadius;
        agent.vx *= factor;
        agent.vy *= factor;
        agent.vz *= factor;
      }

      // Update position
      agent.px += agent.vx * deltaTime;
      agent.py += agent.vy * deltaTime;
      agent.pz += agent.vz * deltaTime;
    }
  }

  /** Get a snapshot of all agents in the simulation. */
  getAgents(): Agent[] {
    const result: Agent[] = [];
    for (const a of this.agents.values()) {
      result.push(this.toPublic(a));
    }
    return result;
  }

  /** Get the current agent count. */
  getAgentCount(): number {
    return this.agents.size;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private toPublic(a: InternalAgent): Agent {
    return {
      id: a.id,
      position: { x: a.px, y: a.py, z: a.pz },
      velocity: { x: a.vx, y: a.vy, z: a.vz },
      goal: { x: a.gx, y: a.gy, z: a.gz },
      radius: a.radius,
      maxSpeed: a.maxSpeed,
      priority: a.priority,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new CrowdSimulator instance.
 *
 * ```ts
 * const crowd = createCrowdSimulator({
 *   maxAgents: 200,
 *   neighborDistance: 5.0,
 *   maxSpeed: 3.5,
 *   separationWeight: 1.5,
 * });
 * ```
 */
export function createCrowdSimulator(config: CrowdConfig): CrowdSimulator {
  return new CrowdSimulator(config);
}
