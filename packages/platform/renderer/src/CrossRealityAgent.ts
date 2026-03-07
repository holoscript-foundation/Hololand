/**
 * CrossRealityAgent
 *
 * A concrete agent implementation that extends the uAA2++ BaseAgent protocol
 * to autonomously manage cross-reality handoffs. The 7-phase cycle maps to
 * cross-reality concerns:
 *
 *   INTAKE   → Gather device capabilities, spatial context, user prefs
 *   REFLECT  → Analyze handoff feasibility, select optimal target
 *   EXECUTE  → Perform the handoff (MVC transfer + embodiment switch)
 *   COMPRESS → Trim MVC payload to budget, record PWG learnings
 *   REINTAKE → Re-evaluate post-handoff state on new device
 *   GROW     → Learn from handoff success/failure patterns
 *   EVOLVE   → Adapt timing budgets and embodiment preferences
 *
 * The agent observes the CrossRealitySessionManager and can autonomously
 * initiate handoffs when it detects better devices nearby, or defer to
 * user-initiated handoffs.
 *
 * @module CrossRealityAgent
 */

import { logger } from './logger';
import type {
  FormFactor,
  EmbodimentType,
  MVCPayload,
  FormFactorBudget,
} from './CrossRealityContinuityTypes';
import { FORM_FACTOR_BUDGETS, DEFAULT_EMBODIMENT } from './CrossRealityContinuityTypes';
import type { DeviceCapabilities } from './CrossRealityHandoffProtocol';

// =============================================================================
// AGENT IDENTITY
// =============================================================================

export interface CrossRealityAgentIdentity {
  id: string;
  name: string;
  domain: string;
  version: string;
  capabilities: string[];
}

// =============================================================================
// PROTOCOL PHASES
// =============================================================================

export enum AgentPhase {
  INTAKE = 0,
  REFLECT = 1,
  EXECUTE = 2,
  COMPRESS = 3,
  REINTAKE = 4,
  GROW = 5,
  EVOLVE = 6,
}

export interface AgentPhaseResult {
  phase: AgentPhase;
  status: 'success' | 'failure' | 'skipped';
  data: unknown;
  durationMs: number;
  timestamp: number;
}

export interface AgentCycleResult {
  cycleId: string;
  task: string;
  phases: AgentPhaseResult[];
  status: 'complete' | 'partial' | 'failed';
  totalDurationMs: number;
  startedAt: number;
  completedAt: number;
}

// =============================================================================
// HANDOFF DECISION
// =============================================================================

export interface HandoffDecision {
  /** Whether the agent recommends a handoff */
  shouldHandoff: boolean;
  /** Target device ID (if recommending) */
  targetDeviceId: string | null;
  /** Confidence in this decision (0-1) */
  confidence: number;
  /** Reasoning trace */
  reasoning: string;
  /** Estimated transition latency (ms) */
  estimatedLatencyMs: number;
  /** Capabilities gained/lost */
  gained: string[];
  lost: string[];
}

export interface HandoffLearning {
  /** Pattern ID */
  id: string;
  /** Handoff pair */
  from: FormFactor;
  to: FormFactor;
  /** Was it successful? */
  success: boolean;
  /** Actual latency vs estimated */
  actualLatencyMs: number;
  estimatedLatencyMs: number;
  /** User satisfaction signal (if available) */
  userSatisfaction: 'positive' | 'negative' | 'neutral' | 'unknown';
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// CROSS-REALITY AGENT
// =============================================================================

export interface CrossRealityAgentConfig {
  identity: CrossRealityAgentIdentity;
  /** Current device form factor */
  currentFormFactor: FormFactor;
  /** Auto-handoff when better device detected (default: false) */
  autoHandoff?: boolean;
  /** Minimum confidence to auto-handoff (default: 0.8) */
  autoHandoffThreshold?: number;
  /** Maximum handoffs per minute (rate limiting, default: 3) */
  maxHandoffsPerMinute?: number;
}

export class CrossRealityAgent {
  readonly identity: CrossRealityAgentIdentity;

  private currentFormFactor: FormFactor;
  private autoHandoff: boolean;
  private autoHandoffThreshold: number;
  private maxHandoffsPerMinute: number;
  private learnings: HandoffLearning[] = [];
  private cycleHistory: AgentCycleResult[] = [];
  private handoffTimestamps: number[] = [];
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  // Adaptive timing budgets (evolved over time)
  private adaptiveTimingBudgets: Map<string, number> = new Map();

  constructor(config: CrossRealityAgentConfig) {
    this.identity = config.identity;
    this.currentFormFactor = config.currentFormFactor;
    this.autoHandoff = config.autoHandoff ?? false;
    this.autoHandoffThreshold = config.autoHandoffThreshold ?? 0.8;
    this.maxHandoffsPerMinute = config.maxHandoffsPerMinute ?? 3;

    logger.info('[CrossRealityAgent] Initialized', {
      agentId: this.identity.id,
      formFactor: this.currentFormFactor,
      autoHandoff: this.autoHandoff,
    });
  }

  // ---------------------------------------------------------------------------
  // 7-PHASE CYCLE
  // ---------------------------------------------------------------------------

  /**
   * Run a complete 7-phase handoff evaluation cycle.
   */
  async runCycle(
    task: string,
    context: {
      discoveredDevices: DeviceCapabilities[];
      currentPayload?: MVCPayload;
    },
  ): Promise<AgentCycleResult> {
    const startedAt = Date.now();
    const cycleId = `cycle_${startedAt}_${Math.random().toString(36).slice(2, 8)}`;
    const phases: AgentPhaseResult[] = [];

    const runPhase = async (
      phase: AgentPhase,
      fn: () => Promise<AgentPhaseResult>,
    ): Promise<AgentPhaseResult> => {
      const start = Date.now();
      try {
        const result = await fn();
        result.durationMs = Date.now() - start;
        phases.push(result);
        return result;
      } catch (err) {
        const failResult: AgentPhaseResult = {
          phase,
          status: 'failure',
          data: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
          timestamp: Date.now(),
        };
        phases.push(failResult);
        return failResult;
      }
    };

    // Phase 0: INTAKE — Gather device capabilities and spatial context
    const intakeResult = await runPhase(AgentPhase.INTAKE, () =>
      this.intake(context.discoveredDevices),
    );

    // Phase 1: REFLECT — Analyze handoff feasibility
    const reflectResult = await runPhase(AgentPhase.REFLECT, () =>
      this.reflect(intakeResult.data as DeviceCapabilities[]),
    );

    // Phase 2: EXECUTE — Make handoff decision
    const decision = reflectResult.data as HandoffDecision;
    const executeResult = await runPhase(AgentPhase.EXECUTE, () =>
      this.execute(decision),
    );

    // Phase 3: COMPRESS — Trim learnings
    const compressResult = await runPhase(AgentPhase.COMPRESS, () =>
      this.compress(executeResult.data),
    );

    // Phase 4: REINTAKE — Post-handoff state check
    const reintakeResult = await runPhase(AgentPhase.REINTAKE, () =>
      this.reintake(compressResult.data),
    );

    // Phase 5: GROW — Learn from this cycle
    const growResult = await runPhase(AgentPhase.GROW, () =>
      this.grow(reintakeResult.data),
    );

    // Phase 6: EVOLVE — Adapt timing budgets
    await runPhase(AgentPhase.EVOLVE, () =>
      this.evolve(growResult.data),
    );

    const failed = phases.some(p => p.status === 'failure');
    const result: AgentCycleResult = {
      cycleId,
      task,
      phases,
      status: failed ? 'partial' : 'complete',
      totalDurationMs: Date.now() - startedAt,
      startedAt,
      completedAt: Date.now(),
    };

    this.cycleHistory.push(result);
    this.emit('cycle:complete', result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // PHASE IMPLEMENTATIONS
  // ---------------------------------------------------------------------------

  /**
   * Phase 0: INTAKE — Gather and filter device capabilities.
   */
  private async intake(devices: DeviceCapabilities[]): Promise<AgentPhaseResult> {
    // Filter to available devices with compatible capabilities
    const viable = devices.filter(d => {
      // Must have a form factor budget defined
      return d.formFactor in FORM_FACTOR_BUDGETS;
    });

    return {
      phase: AgentPhase.INTAKE,
      status: 'success',
      data: viable,
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 1: REFLECT — Analyze and score each potential handoff target.
   */
  private async reflect(devices: DeviceCapabilities[]): Promise<AgentPhaseResult> {
    if (devices.length === 0) {
      return {
        phase: AgentPhase.REFLECT,
        status: 'success',
        data: { shouldHandoff: false, targetDeviceId: null, confidence: 1.0, reasoning: 'No devices available', estimatedLatencyMs: 0, gained: [], lost: [] } satisfies HandoffDecision,
        durationMs: 0,
        timestamp: Date.now(),
      };
    }

    // Score each device
    let bestDevice: DeviceCapabilities | null = null;
    let bestScore = 0;
    let bestGained: string[] = [];
    let bestLost: string[] = [];

    const currentBudget = FORM_FACTOR_BUDGETS[this.currentFormFactor];

    for (const device of devices) {
      if (device.formFactor === this.currentFormFactor) continue; // Skip same form factor

      const targetBudget = FORM_FACTOR_BUDGETS[device.formFactor];
      let score = 0;

      // Score based on capability differences
      const gained: string[] = [];
      const lost: string[] = [];

      for (const modality of device.inputModalities) {
        gained.push(modality);
      }

      // Prefer devices with better agent budget (more compute available)
      if (targetBudget.agentBudgetMs > currentBudget.agentBudgetMs) {
        score += 0.3;
        gained.push(`agentBudget:${targetBudget.agentBudgetMs}ms`);
      }

      // Prefer devices with geospatial
      if (device.hasGeospatial) {
        score += 0.2;
        gained.push('geospatial');
      }

      // Penalty for safety-critical transitions
      if (device.formFactor === 'car' || this.currentFormFactor === 'car') {
        score -= 0.5;
        lost.push('safety-critical-transition');
      }

      // Use historical success rate for this pair
      const pairKey = `${this.currentFormFactor}->${device.formFactor}`;
      const historicalSuccess = this.getHistoricalSuccessRate(pairKey);
      score += historicalSuccess * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestDevice = device;
        bestGained = gained;
        bestLost = lost;
      }
    }

    const estimatedLatencyMs = this.getAdaptiveLatency(
      this.currentFormFactor,
      bestDevice?.formFactor ?? this.currentFormFactor,
    );

    const decision: HandoffDecision = {
      shouldHandoff: bestDevice !== null && bestScore > 0.3,
      targetDeviceId: bestDevice?.deviceId ?? null,
      confidence: Math.min(1.0, Math.max(0, bestScore)),
      reasoning: bestDevice
        ? `Best target: ${bestDevice.formFactor} (score: ${bestScore.toFixed(2)})`
        : 'No viable handoff targets',
      estimatedLatencyMs,
      gained: bestGained,
      lost: bestLost,
    };

    return {
      phase: AgentPhase.REFLECT,
      status: 'success',
      data: decision,
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 2: EXECUTE — Apply the handoff decision.
   */
  private async execute(decision: HandoffDecision): Promise<AgentPhaseResult> {
    if (!decision.shouldHandoff) {
      return {
        phase: AgentPhase.EXECUTE,
        status: 'skipped',
        data: { action: 'no-handoff', reason: decision.reasoning },
        durationMs: 0,
        timestamp: Date.now(),
      };
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      return {
        phase: AgentPhase.EXECUTE,
        status: 'skipped',
        data: { action: 'rate-limited', reason: `Exceeds ${this.maxHandoffsPerMinute} handoffs/min` },
        durationMs: 0,
        timestamp: Date.now(),
      };
    }

    // Check auto-handoff threshold
    if (this.autoHandoff && decision.confidence < this.autoHandoffThreshold) {
      return {
        phase: AgentPhase.EXECUTE,
        status: 'skipped',
        data: { action: 'below-threshold', confidence: decision.confidence, threshold: this.autoHandoffThreshold },
        durationMs: 0,
        timestamp: Date.now(),
      };
    }

    this.handoffTimestamps.push(Date.now());

    this.emit('handoff:recommended', {
      targetDeviceId: decision.targetDeviceId,
      confidence: decision.confidence,
      reasoning: decision.reasoning,
      gained: decision.gained,
      lost: decision.lost,
    });

    return {
      phase: AgentPhase.EXECUTE,
      status: 'success',
      data: { action: 'handoff-recommended', decision },
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 3: COMPRESS — Trim data, record compact learnings.
   */
  private async compress(executeData: unknown): Promise<AgentPhaseResult> {
    // Trim cycle history to last 50 entries
    if (this.cycleHistory.length > 50) {
      this.cycleHistory = this.cycleHistory.slice(-50);
    }
    // Trim learnings to last 100
    if (this.learnings.length > 100) {
      this.learnings = this.learnings.slice(-100);
    }

    return {
      phase: AgentPhase.COMPRESS,
      status: 'success',
      data: executeData,
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 4: REINTAKE — Post-handoff state evaluation.
   */
  private async reintake(data: unknown): Promise<AgentPhaseResult> {
    return {
      phase: AgentPhase.REINTAKE,
      status: 'success',
      data: { currentFormFactor: this.currentFormFactor, learningsCount: this.learnings.length },
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 5: GROW — Learn from handoff patterns.
   */
  private async grow(data: unknown): Promise<AgentPhaseResult> {
    // Compute success rate per form factor pair
    const pairStats = new Map<string, { success: number; total: number }>();
    for (const l of this.learnings) {
      const key = `${l.from}->${l.to}`;
      const stats = pairStats.get(key) ?? { success: 0, total: 0 };
      stats.total++;
      if (l.success) stats.success++;
      pairStats.set(key, stats);
    }

    return {
      phase: AgentPhase.GROW,
      status: 'success',
      data: {
        pairStats: Object.fromEntries(pairStats),
        totalLearnings: this.learnings.length,
      },
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 6: EVOLVE — Adapt timing budgets based on learnings.
   */
  private async evolve(growData: unknown): Promise<AgentPhaseResult> {
    // Update adaptive timing budgets based on observed latencies
    for (const learning of this.learnings.slice(-20)) {
      const key = `${learning.from}->${learning.to}`;
      const currentBudget = this.adaptiveTimingBudgets.get(key);
      if (currentBudget) {
        // Exponential moving average
        this.adaptiveTimingBudgets.set(key, currentBudget * 0.7 + learning.actualLatencyMs * 0.3);
      } else {
        this.adaptiveTimingBudgets.set(key, learning.actualLatencyMs);
      }
    }

    return {
      phase: AgentPhase.EVOLVE,
      status: 'success',
      data: {
        adaptiveBudgets: Object.fromEntries(this.adaptiveTimingBudgets),
      },
      durationMs: 0,
      timestamp: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // LEARNING
  // ---------------------------------------------------------------------------

  /**
   * Record the outcome of a handoff for learning.
   */
  recordHandoffOutcome(
    from: FormFactor,
    to: FormFactor,
    success: boolean,
    actualLatencyMs: number,
    estimatedLatencyMs: number,
    userSatisfaction: HandoffLearning['userSatisfaction'] = 'unknown',
  ): void {
    this.learnings.push({
      id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      from,
      to,
      success,
      actualLatencyMs,
      estimatedLatencyMs,
      userSatisfaction,
      timestamp: Date.now(),
    });

    this.emit('learning:recorded', { from, to, success, actualLatencyMs });
  }

  /**
   * Notify the agent that the form factor has changed (after handoff).
   */
  updateFormFactor(formFactor: FormFactor): void {
    this.currentFormFactor = formFactor;
  }

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  getMetrics() {
    const successCount = this.learnings.filter(l => l.success).length;
    const avgLatency = this.learnings.length > 0
      ? this.learnings.reduce((sum, l) => sum + l.actualLatencyMs, 0) / this.learnings.length
      : 0;

    return {
      identity: this.identity,
      currentFormFactor: this.currentFormFactor,
      totalCycles: this.cycleHistory.length,
      totalLearnings: this.learnings.length,
      overallSuccessRate: this.learnings.length > 0 ? successCount / this.learnings.length : 0,
      averageLatencyMs: avgLatency,
      adaptiveBudgets: Object.fromEntries(this.adaptiveTimingBudgets),
      autoHandoff: this.autoHandoff,
    };
  }

  getLearnings(): HandoffLearning[] {
    return [...this.learnings];
  }

  getCycleHistory(): AgentCycleResult[] {
    return [...this.cycleHistory];
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private isRateLimited(): boolean {
    const oneMinuteAgo = Date.now() - 60_000;
    this.handoffTimestamps = this.handoffTimestamps.filter(t => t > oneMinuteAgo);
    return this.handoffTimestamps.length >= this.maxHandoffsPerMinute;
  }

  private getHistoricalSuccessRate(pairKey: string): number {
    const relevant = this.learnings.filter(l => `${l.from}->${l.to}` === pairKey);
    if (relevant.length === 0) return 0.5; // Unknown = neutral
    return relevant.filter(l => l.success).length / relevant.length;
  }

  private getAdaptiveLatency(from: FormFactor, to: FormFactor): number {
    const key = `${from}->${to}`;
    return this.adaptiveTimingBudgets.get(key) ?? 200; // Default 200ms
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createCrossRealityAgent(config: CrossRealityAgentConfig): CrossRealityAgent {
  return new CrossRealityAgent(config);
}
