/**
 * @hololand/protocol SpatialPhase
 *
 * Maps uAA2++ protocol phases to spatial VR environments.
 * Agents experience each phase as a distinct spatial room with unique
 * geometry, lighting, and haptic properties.
 */

export enum ProtocolPhase {
  INTAKE = 'INTAKE',
  COMPRESS = 'COMPRESS',
  ROUTE = 'ROUTE',
  REFLECT = 'REFLECT',
  EXECUTE = 'EXECUTE',
  EVOLVE = 'EVOLVE',
  VERIFY = 'VERIFY',
  COMPOUND = 'COMPOUND',
}

export interface SpatialEnvironment {
  phase: ProtocolPhase;
  roomId: string;
  geometry: RoomGeometry;
  lighting: LightingPreset;
  hapticProfile: string;
  maxOccupants: number;
  timeoutMs: number;
}

export interface RoomGeometry {
  shape: 'sphere' | 'cube' | 'cylinder' | 'dome' | 'void';
  radiusMeters: number;
  heightMeters: number;
  wallOpacity: number;
}

export interface LightingPreset {
  ambientColor: [number, number, number];
  ambientIntensity: number;
  directionalAngle: number;
  pulseHz: number;
}

const DEFAULT_ENVIRONMENTS: Map<ProtocolPhase, SpatialEnvironment> = new Map([
  [ProtocolPhase.INTAKE, {
    phase: ProtocolPhase.INTAKE,
    roomId: 'intake-nexus',
    geometry: { shape: 'sphere', radiusMeters: 10, heightMeters: 10, wallOpacity: 0.3 },
    lighting: { ambientColor: [0.2, 0.4, 0.8], ambientIntensity: 0.6, directionalAngle: 45, pulseHz: 0.5 },
    hapticProfile: 'gentle-pulse',
    maxOccupants: 20,
    timeoutMs: 30_000,
  }],
  [ProtocolPhase.COMPRESS, {
    phase: ProtocolPhase.COMPRESS,
    roomId: 'compress-chamber',
    geometry: { shape: 'cube', radiusMeters: 5, heightMeters: 5, wallOpacity: 0.8 },
    lighting: { ambientColor: [0.6, 0.3, 0.1], ambientIntensity: 0.8, directionalAngle: 90, pulseHz: 2.0 },
    hapticProfile: 'tight-squeeze',
    maxOccupants: 5,
    timeoutMs: 20_000,
  }],
  [ProtocolPhase.ROUTE, {
    phase: ProtocolPhase.ROUTE,
    roomId: 'route-corridor',
    geometry: { shape: 'cylinder', radiusMeters: 3, heightMeters: 20, wallOpacity: 0.5 },
    lighting: { ambientColor: [0.1, 0.7, 0.3], ambientIntensity: 0.7, directionalAngle: 0, pulseHz: 1.0 },
    hapticProfile: 'directional-flow',
    maxOccupants: 10,
    timeoutMs: 10_000,
  }],
  [ProtocolPhase.REFLECT, {
    phase: ProtocolPhase.REFLECT,
    roomId: 'reflect-pool',
    geometry: { shape: 'dome', radiusMeters: 15, heightMeters: 8, wallOpacity: 0.2 },
    lighting: { ambientColor: [0.5, 0.3, 0.7], ambientIntensity: 0.4, directionalAngle: 180, pulseHz: 0.25 },
    hapticProfile: 'deep-resonance',
    maxOccupants: 3,
    timeoutMs: 60_000,
  }],
  [ProtocolPhase.EXECUTE, {
    phase: ProtocolPhase.EXECUTE,
    roomId: 'execute-forge',
    geometry: { shape: 'cube', radiusMeters: 8, heightMeters: 12, wallOpacity: 0.9 },
    lighting: { ambientColor: [0.9, 0.5, 0.1], ambientIntensity: 1.0, directionalAngle: 270, pulseHz: 4.0 },
    hapticProfile: 'power-surge',
    maxOccupants: 8,
    timeoutMs: 120_000,
  }],
  [ProtocolPhase.EVOLVE, {
    phase: ProtocolPhase.EVOLVE,
    roomId: 'evolve-garden',
    geometry: { shape: 'sphere', radiusMeters: 20, heightMeters: 20, wallOpacity: 0.1 },
    lighting: { ambientColor: [0.3, 0.8, 0.4], ambientIntensity: 0.7, directionalAngle: 60, pulseHz: 0.1 },
    hapticProfile: 'organic-growth',
    maxOccupants: 15,
    timeoutMs: 90_000,
  }],
  [ProtocolPhase.VERIFY, {
    phase: ProtocolPhase.VERIFY,
    roomId: 'verify-tribunal',
    geometry: { shape: 'cylinder', radiusMeters: 6, heightMeters: 10, wallOpacity: 0.95 },
    lighting: { ambientColor: [0.8, 0.8, 0.8], ambientIntensity: 1.0, directionalAngle: 0, pulseHz: 0 },
    hapticProfile: 'precision-scan',
    maxOccupants: 4,
    timeoutMs: 30_000,
  }],
  [ProtocolPhase.COMPOUND, {
    phase: ProtocolPhase.COMPOUND,
    roomId: 'compound-vortex',
    geometry: { shape: 'void', radiusMeters: 50, heightMeters: 50, wallOpacity: 0 },
    lighting: { ambientColor: [0.9, 0.9, 0.2], ambientIntensity: 0.5, directionalAngle: 360, pulseHz: 8.0 },
    hapticProfile: 'exponential-wave',
    maxOccupants: 50,
    timeoutMs: 180_000,
  }],
]);

export class SpatialPhaseManager {
  private environments: Map<ProtocolPhase, SpatialEnvironment>;
  private activePhases: Map<string, { phase: ProtocolPhase; enteredAt: number }> = new Map();
  private transitionLog: Array<{ agentId: string; from: ProtocolPhase | null; to: ProtocolPhase; timestamp: number }> = [];

  constructor(customEnvironments?: Map<ProtocolPhase, SpatialEnvironment>) {
    this.environments = customEnvironments ?? new Map(DEFAULT_ENVIRONMENTS);
  }

  getEnvironment(phase: ProtocolPhase): SpatialEnvironment | undefined {
    return this.environments.get(phase);
  }

  getAllEnvironments(): SpatialEnvironment[] {
    return [...this.environments.values()];
  }

  enterPhase(agentId: string, phase: ProtocolPhase): { success: boolean; environment?: SpatialEnvironment; error?: string } {
    const env = this.environments.get(phase);
    if (!env) {
      return { success: false, error: `Unknown phase: ${phase}` };
    }

    const occupants = this.getOccupants(phase);
    if (occupants.length >= env.maxOccupants) {
      return { success: false, error: `Phase ${phase} is at max capacity (${env.maxOccupants})` };
    }

    const current = this.activePhases.get(agentId);
    const fromPhase = current?.phase ?? null;

    this.activePhases.set(agentId, { phase, enteredAt: Date.now() });
    this.transitionLog.push({ agentId, from: fromPhase, to: phase, timestamp: Date.now() });

    return { success: true, environment: env };
  }

  exitPhase(agentId: string): boolean {
    return this.activePhases.delete(agentId);
  }

  getAgentPhase(agentId: string): ProtocolPhase | null {
    return this.activePhases.get(agentId)?.phase ?? null;
  }

  getOccupants(phase: ProtocolPhase): string[] {
    const result: string[] = [];
    for (const [agentId, entry] of this.activePhases) {
      if (entry.phase === phase) result.push(agentId);
    }
    return result;
  }

  isTimedOut(agentId: string): boolean {
    const entry = this.activePhases.get(agentId);
    if (!entry) return false;
    const env = this.environments.get(entry.phase);
    if (!env) return false;
    return (Date.now() - entry.enteredAt) > env.timeoutMs;
  }

  getTransitionLog(): typeof this.transitionLog {
    return [...this.transitionLog];
  }

  /** Returns ordered phase sequence for a standard uAA2++ cycle */
  getStandardCycle(): ProtocolPhase[] {
    return [
      ProtocolPhase.INTAKE,
      ProtocolPhase.COMPRESS,
      ProtocolPhase.ROUTE,
      ProtocolPhase.REFLECT,
      ProtocolPhase.EXECUTE,
      ProtocolPhase.EVOLVE,
      ProtocolPhase.VERIFY,
      ProtocolPhase.COMPOUND,
    ];
  }

  /** Validates that a transition follows the allowed phase ordering */
  isValidTransition(from: ProtocolPhase | null, to: ProtocolPhase): boolean {
    if (from === null) return to === ProtocolPhase.INTAKE;
    const cycle = this.getStandardCycle();
    const fromIdx = cycle.indexOf(from);
    const toIdx = cycle.indexOf(to);
    // Allow forward by 1, or looping back to INTAKE from COMPOUND
    if (fromIdx === cycle.length - 1 && toIdx === 0) return true;
    return toIdx === fromIdx + 1;
  }
}
