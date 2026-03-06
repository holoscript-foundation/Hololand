/**
 * @hololand/protocol EmbodiedProtocol
 *
 * VR-embodied uAA2++ protocol execution. Agents experience INTAKE, COMPRESS,
 * ROUTE, REFLECT, EXECUTE, EVOLVE, VERIFY, and COMPOUND as spatial VR
 * environments with haptic feedback, environmental lighting, and room transitions.
 *
 * Each protocol cycle is a physical journey through 8 rooms, with data
 * represented as spatial objects that agents manipulate.
 */

import { SpatialPhaseManager, ProtocolPhase, type SpatialEnvironment } from './SpatialPhase';
import { HapticFeedbackManager, type HapticPattern } from './HapticFeedback';

export interface ProtocolAgent {
  id: string;
  name: string;
  currentPhase: ProtocolPhase | null;
  cycleCount: number;
  phaseData: Map<ProtocolPhase, unknown>;
  startedAt: number | null;
}

export interface CycleResult {
  agentId: string;
  cycleNumber: number;
  phases: PhaseResult[];
  totalDurationMs: number;
  success: boolean;
  compoundedKnowledge: unknown;
}

export interface PhaseResult {
  phase: ProtocolPhase;
  durationMs: number;
  success: boolean;
  data: unknown;
  hapticTriggered: boolean;
}

export class EmbodiedProtocol {
  private phaseManager: SpatialPhaseManager;
  private hapticManager: HapticFeedbackManager;
  private agents: Map<string, ProtocolAgent> = new Map();
  private cycleResults: CycleResult[] = [];
  private phaseHandlers: Map<ProtocolPhase, (agentId: string, input: unknown) => unknown> = new Map();

  constructor(
    phaseManager?: SpatialPhaseManager,
    hapticManager?: HapticFeedbackManager,
  ) {
    this.phaseManager = phaseManager ?? new SpatialPhaseManager();
    this.hapticManager = hapticManager ?? new HapticFeedbackManager();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.phaseHandlers.set(ProtocolPhase.INTAKE, (_agentId, input) => {
      return { absorbed: true, rawData: input, timestamp: Date.now() };
    });
    this.phaseHandlers.set(ProtocolPhase.COMPRESS, (_agentId, input) => {
      const data = input as Record<string, unknown>;
      const keys = Object.keys(data);
      return { compressed: true, keyCount: keys.length, summary: keys.slice(0, 5) };
    });
    this.phaseHandlers.set(ProtocolPhase.ROUTE, (_agentId, input) => {
      return { routed: true, destination: 'reflect', payload: input };
    });
    this.phaseHandlers.set(ProtocolPhase.REFLECT, (_agentId, input) => {
      return { reflected: true, insights: ['pattern-detected', 'anomaly-flagged'], source: input };
    });
    this.phaseHandlers.set(ProtocolPhase.EXECUTE, (_agentId, input) => {
      return { executed: true, actions: ['apply-insight', 'update-model'], input };
    });
    this.phaseHandlers.set(ProtocolPhase.EVOLVE, (_agentId, input) => {
      return { evolved: true, adaptations: ['weight-adjusted', 'threshold-tuned'], from: input };
    });
    this.phaseHandlers.set(ProtocolPhase.VERIFY, (_agentId, input) => {
      return { verified: true, confidence: 0.92, data: input };
    });
    this.phaseHandlers.set(ProtocolPhase.COMPOUND, (_agentId, input) => {
      return { compounded: true, knowledgeGrowth: 1.15, accumulated: input };
    });
  }

  registerPhaseHandler(phase: ProtocolPhase, handler: (agentId: string, input: unknown) => unknown): void {
    this.phaseHandlers.set(phase, handler);
  }

  registerAgent(id: string, name: string): ProtocolAgent {
    const agent: ProtocolAgent = {
      id,
      name,
      currentPhase: null,
      cycleCount: 0,
      phaseData: new Map(),
      startedAt: null,
    };
    this.agents.set(id, agent);
    return agent;
  }

  getAgent(id: string): ProtocolAgent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): ProtocolAgent[] {
    return [...this.agents.values()];
  }

  removeAgent(id: string): boolean {
    const agent = this.agents.get(id);
    if (agent) {
      this.hapticManager.stopAll(id);
      this.phaseManager.exitPhase(id);
    }
    return this.agents.delete(id);
  }

  /** Advance an agent to the next phase in the protocol cycle */
  advancePhase(agentId: string, phaseInput: unknown): PhaseResult {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { phase: ProtocolPhase.INTAKE, durationMs: 0, success: false, data: { error: 'Agent not found' }, hapticTriggered: false };
    }

    const cycle = this.phaseManager.getStandardCycle();
    let nextPhase: ProtocolPhase;

    if (agent.currentPhase === null) {
      nextPhase = ProtocolPhase.INTAKE;
      agent.startedAt = Date.now();
    } else {
      const currentIdx = cycle.indexOf(agent.currentPhase);
      if (currentIdx === cycle.length - 1) {
        // Cycle complete, wrap to INTAKE
        nextPhase = ProtocolPhase.INTAKE;
      } else {
        nextPhase = cycle[currentIdx + 1];
      }
    }

    // Validate transition
    if (!this.phaseManager.isValidTransition(agent.currentPhase, nextPhase)) {
      return {
        phase: nextPhase,
        durationMs: 0,
        success: false,
        data: { error: `Invalid transition from ${agent.currentPhase} to ${nextPhase}` },
        hapticTriggered: false,
      };
    }

    // Exit current phase
    if (agent.currentPhase !== null) {
      this.phaseManager.exitPhase(agentId);
      this.hapticManager.stopAll(agentId);
    }

    // Enter new phase
    const enterResult = this.phaseManager.enterPhase(agentId, nextPhase);
    if (!enterResult.success) {
      return {
        phase: nextPhase,
        durationMs: 0,
        success: false,
        data: { error: enterResult.error },
        hapticTriggered: false,
      };
    }

    // Trigger haptic feedback
    let hapticTriggered = false;
    const env = enterResult.environment!;
    const hapticResult = this.hapticManager.trigger(env.hapticProfile, agentId, nextPhase);
    hapticTriggered = hapticResult.success;

    // Execute phase handler
    const phaseStart = Date.now();
    const handler = this.phaseHandlers.get(nextPhase);
    const data = handler ? handler(agentId, phaseInput) : phaseInput;
    const durationMs = Date.now() - phaseStart;

    // Update agent state
    agent.currentPhase = nextPhase;
    agent.phaseData.set(nextPhase, data);

    // If completing COMPOUND, increment cycle count
    if (nextPhase === ProtocolPhase.COMPOUND) {
      agent.cycleCount++;
    }

    return { phase: nextPhase, durationMs, success: true, data, hapticTriggered };
  }

  /** Execute a full 8-phase protocol cycle for an agent */
  async executeCycle(agentId: string, initialInput: unknown): Promise<CycleResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        agentId,
        cycleNumber: 0,
        phases: [],
        totalDurationMs: 0,
        success: false,
        compoundedKnowledge: null,
      };
    }

    // Reset to start of cycle
    agent.currentPhase = null;
    agent.phaseData.clear();
    this.phaseManager.exitPhase(agentId);
    this.hapticManager.stopAll(agentId);

    const cycleStart = Date.now();
    const phases: PhaseResult[] = [];
    let currentData: unknown = initialInput;

    const cycle = this.phaseManager.getStandardCycle();

    for (const _phase of cycle) {
      const result = this.advancePhase(agentId, currentData);
      phases.push(result);

      if (!result.success) {
        const cycleResult: CycleResult = {
          agentId,
          cycleNumber: agent.cycleCount,
          phases,
          totalDurationMs: Date.now() - cycleStart,
          success: false,
          compoundedKnowledge: null,
        };
        this.cycleResults.push(cycleResult);
        return cycleResult;
      }

      currentData = result.data;
    }

    const cycleResult: CycleResult = {
      agentId,
      cycleNumber: agent.cycleCount,
      phases,
      totalDurationMs: Date.now() - cycleStart,
      success: true,
      compoundedKnowledge: currentData,
    };
    this.cycleResults.push(cycleResult);

    return cycleResult;
  }

  /** Get spatial environment info for current agent phase */
  getAgentEnvironment(agentId: string): SpatialEnvironment | null {
    const phase = this.phaseManager.getAgentPhase(agentId);
    if (!phase) return null;
    return this.phaseManager.getEnvironment(phase) ?? null;
  }

  /** Get active haptic patterns for an agent */
  getAgentHaptics(agentId: string): HapticPattern[] {
    return this.hapticManager.getActivePatterns(agentId);
  }

  /** Get blended haptic amplitude for an agent */
  getAgentHapticAmplitude(agentId: string): number {
    return this.hapticManager.getBlendedAmplitude(agentId);
  }

  getCycleResults(): CycleResult[] {
    return [...this.cycleResults];
  }

  getPhaseManager(): SpatialPhaseManager {
    return this.phaseManager;
  }

  getHapticManager(): HapticFeedbackManager {
    return this.hapticManager;
  }
}
