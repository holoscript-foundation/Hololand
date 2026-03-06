/**
 * Real-Time Failure Detection Engine
 *
 * Implements the Partnership on AI framework for responsible agent behavior:
 *
 * 1. Pre-Action:   Risk assessment, permission checks, stake/reversibility analysis
 * 2. During:       Real-time anomaly detection, resource monitoring, coherence tracking
 * 3. Post-Action:  Rollback readiness, side-effect validation, state consistency
 * 4. Cross-Step:   Trajectory coherence analysis, goal inference, drift detection
 *
 * Calibrated by stakes (who is affected), reversibility (can we undo it),
 * and agent affordances (what is the agent allowed to do).
 *
 * @module failure-detection/FailureDetector
 */

import type {
  AgentAction,
  ActionType,
  ActionPhase,
  ActionResult,
  SideEffect,
  RiskAssessment,
  RiskCategory,
  RiskFactor,
  RiskRecommendation,
  StakesAssessment,
  ReversibilityAssessment,
  AgentAffordances,
  AnomalyDetectionResult,
  AnomalyType,
  TrajectoryStep,
  TrajectoryAnalysis,
  RollbackCheckpoint,
  RollbackResult,
  FailureDetectionConfig,
  FailureDetectionEventMap,
  FailureEventType,
  FailureEventHandler,
} from './types';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: FailureDetectionConfig = {
  preCheckEnabled: true,
  anomalyDetectionEnabled: true,
  rollbackEnabled: true,
  trajectoryAnalysisEnabled: true,
  riskThresholds: {
    autoAllowBelow: 0.3,
    autoBlockAbove: 0.85,
  },
  anomalySensitivity: 0.6,
  coherenceThreshold: 0.4,
  checkpointTTLMs: 300000, // 5 minutes
  maxCheckpoints: 100,
  trajectoryHistoryLength: 50,
  defaultRateLimit: 60,
};

// =============================================================================
// Action Risk Profiles
// =============================================================================

const ACTION_RISK_PROFILES: Record<ActionType, {
  baseRisk: number;
  defaultStakes: Partial<StakesAssessment>;
  defaultReversibility: Partial<ReversibilityAssessment>;
}> = {
  'world-create': {
    baseRisk: 0.2,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'state', magnitude: 0.3 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'low' },
  },
  'world-modify': {
    baseRisk: 0.4,
    defaultStakes: { scopeOfImpact: 'multiple', impactType: 'state', magnitude: 0.5 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'medium' },
  },
  'world-delete': {
    baseRisk: 0.8,
    defaultStakes: { scopeOfImpact: 'world-wide', impactType: 'state', magnitude: 0.9 },
    defaultReversibility: { fullyReversible: false, partiallyReversible: true, reversalCost: 'high' },
  },
  'object-spawn': {
    baseRisk: 0.1,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'state', magnitude: 0.1 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'none' },
  },
  'object-modify': {
    baseRisk: 0.2,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'state', magnitude: 0.2 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'low' },
  },
  'object-delete': {
    baseRisk: 0.4,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'state', magnitude: 0.4 },
    defaultReversibility: { fullyReversible: false, reversalCost: 'medium' },
  },
  'agent-communicate': {
    baseRisk: 0.15,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'data', magnitude: 0.1 },
    defaultReversibility: { fullyReversible: false, partiallyReversible: false, reversalCost: 'none' },
  },
  'agent-coordinate': {
    baseRisk: 0.3,
    defaultStakes: { scopeOfImpact: 'multiple', impactType: 'state', magnitude: 0.3 },
    defaultReversibility: { fullyReversible: false, partiallyReversible: true, reversalCost: 'medium' },
  },
  'data-read': {
    baseRisk: 0.05,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'data', magnitude: 0.05 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'none' },
  },
  'data-write': {
    baseRisk: 0.4,
    defaultStakes: { scopeOfImpact: 'multiple', impactType: 'data', magnitude: 0.5 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'low' },
  },
  'data-delete': {
    baseRisk: 0.7,
    defaultStakes: { scopeOfImpact: 'multiple', impactType: 'data', magnitude: 0.8 },
    defaultReversibility: { fullyReversible: false, reversalCost: 'high' },
  },
  'tool-execute': {
    baseRisk: 0.5,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'state', magnitude: 0.4 },
    defaultReversibility: { fullyReversible: false, partiallyReversible: true, reversalCost: 'medium' },
  },
  'code-execute': {
    baseRisk: 0.6,
    defaultStakes: { scopeOfImpact: 'multiple', impactType: 'state', magnitude: 0.6 },
    defaultReversibility: { fullyReversible: false, reversalCost: 'high' },
  },
  'network-request': {
    baseRisk: 0.5,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'data', magnitude: 0.3 },
    defaultReversibility: { fullyReversible: false, reversalCost: 'none' },
  },
  'memory-access': {
    baseRisk: 0.3,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'data', magnitude: 0.3 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'low' },
  },
  'user-interaction': {
    baseRisk: 0.4,
    defaultStakes: { scopeOfImpact: 'single', impactType: 'reputation', humansAffected: true, magnitude: 0.5 },
    defaultReversibility: { fullyReversible: false, reversalCost: 'high' },
  },
  'system-config': {
    baseRisk: 0.8,
    defaultStakes: { scopeOfImpact: 'world-wide', impactType: 'state', magnitude: 0.9 },
    defaultReversibility: { fullyReversible: true, reversalCost: 'medium' },
  },
};

// =============================================================================
// Failure Detector
// =============================================================================

export class FailureDetector {
  private config: FailureDetectionConfig;
  private affordances: Map<string, AgentAffordances> = new Map();
  private checkpoints: Map<string, RollbackCheckpoint> = new Map();
  private trajectories: Map<string, TrajectoryStep[]> = new Map();
  private actionHistory: Map<string, AgentAction[]> = new Map();
  private eventHandlers = new Map<string, Array<(...args: any[]) => void>>();

  /** Rate limiting state */
  private actionCounts: Map<string, { count: number; windowStart: number }> = new Map();

  /** Baseline behavior profiles for anomaly detection */
  private baselines: Map<string, AgentBaseline> = new Map();

  constructor(config?: Partial<FailureDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // Agent Affordances
  // ===========================================================================

  /**
   * Register agent affordances (what the agent is allowed to do).
   */
  setAffordances(affordances: AgentAffordances): void {
    this.affordances.set(affordances.agentId, affordances);
  }

  getAffordances(agentId: string): AgentAffordances | undefined {
    return this.affordances.get(agentId);
  }

  // ===========================================================================
  // Phase 1: Pre-Action Permission Check
  // ===========================================================================

  /**
   * Pre-action check: assess risk, check permissions, evaluate stakes.
   * Returns a risk assessment with recommendation.
   */
  preCheck(action: AgentAction): RiskAssessment {
    const startTime = performance.now();

    if (!this.config.preCheckEnabled) {
      return this.createAssessment(action.id, 0, 'low', 'allow', [], startTime);
    }

    this.emit('pre-check:start', { action });

    const factors: RiskFactor[] = [];

    // Factor 1: Base action risk
    const profile = ACTION_RISK_PROFILES[action.type];
    const baseRisk = profile?.baseRisk ?? 0.5;
    factors.push({
      name: 'base-action-risk',
      score: baseRisk,
      weight: 0.25,
      explanation: `Action type "${action.type}" has base risk ${baseRisk.toFixed(2)}`,
    });

    // Factor 2: Stakes assessment
    const stakes = this.assessStakes(action);
    const stakesScore = stakes.magnitude * (stakes.humansAffected ? 1.5 : 1.0);
    factors.push({
      name: 'stakes',
      score: Math.min(1.0, stakesScore),
      weight: 0.25,
      explanation: `Impact: ${stakes.scopeOfImpact}, type: ${stakes.impactType}, magnitude: ${stakes.magnitude.toFixed(2)}`,
    });

    // Factor 3: Reversibility
    const reversibility = this.assessReversibility(action);
    const irreversibilityScore = reversibility.fullyReversible ? 0 :
      reversibility.partiallyReversible ? 0.5 : 1.0;
    factors.push({
      name: 'irreversibility',
      score: irreversibilityScore,
      weight: 0.2,
      explanation: reversibility.fullyReversible ? 'Action is fully reversible' :
        reversibility.partiallyReversible ? 'Action is partially reversible' :
        'Action is irreversible',
    });

    // Factor 4: Agent affordance compliance
    const affordanceScore = this.checkAffordanceCompliance(action);
    factors.push({
      name: 'affordance-compliance',
      score: 1.0 - affordanceScore, // Higher score = more risk
      weight: 0.15,
      explanation: affordanceScore >= 1.0 ? 'Action within agent affordances' :
        `Affordance violation: compliance ${(affordanceScore * 100).toFixed(0)}%`,
    });

    // Factor 5: Rate limit check
    const rateLimitScore = this.checkRateLimit(action.agentId);
    factors.push({
      name: 'rate-limit',
      score: rateLimitScore,
      weight: 0.15,
      explanation: rateLimitScore > 0.5 ? `Agent approaching rate limit` : 'Within rate limits',
    });

    // Compute composite risk score
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const riskScore = factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight;

    // Categorize risk
    const category = this.categorizeRisk(riskScore);

    // Determine recommendation
    const recommendation = this.determineRecommendation(riskScore, category, action);

    const assessment = this.createAssessment(
      action.id,
      riskScore,
      category,
      recommendation,
      factors,
      startTime,
    );

    if (recommendation === 'block' || recommendation === 'block-and-alert') {
      action.phase = 'blocked';
      this.emit('pre-check:fail', {
        action,
        risk: assessment,
        reason: `Risk ${riskScore.toFixed(2)} exceeds threshold`,
      });
    } else {
      this.emit('pre-check:pass', { action, risk: assessment });
    }

    return assessment;
  }

  // ===========================================================================
  // Phase 2: During-Execution Anomaly Detection
  // ===========================================================================

  /**
   * Monitor an action during execution for anomalies.
   */
  monitorExecution(action: AgentAction): AnomalyDetectionResult {
    if (!this.config.anomalyDetectionEnabled) {
      return {
        anomalyDetected: false,
        anomalyScore: 0,
        explanation: 'Anomaly detection disabled',
        recommendation: 'continue',
        method: 'none',
      };
    }

    this.emit('execution:start', { action });

    // Record action in history
    if (!this.actionHistory.has(action.agentId)) {
      this.actionHistory.set(action.agentId, []);
    }
    const history = this.actionHistory.get(action.agentId)!;
    history.push(action);
    if (history.length > this.config.trajectoryHistoryLength) {
      history.shift();
    }

    // Run anomaly detectors
    const detectors: Array<{
      method: string;
      detect: () => { score: number; type?: AnomalyType; explanation: string };
    }> = [
      {
        method: 'rate-analysis',
        detect: () => this.detectRateAnomaly(action.agentId),
      },
      {
        method: 'sequence-analysis',
        detect: () => this.detectSequenceAnomaly(action.agentId, action),
      },
      {
        method: 'target-analysis',
        detect: () => this.detectTargetAnomaly(action.agentId, action),
      },
      {
        method: 'scope-analysis',
        detect: () => this.detectScopeAnomaly(action),
      },
    ];

    let maxScore = 0;
    let maxType: AnomalyType | undefined;
    let maxExplanation = '';
    let maxMethod = 'none';

    for (const detector of detectors) {
      const result = detector.detect();
      if (result.score > maxScore) {
        maxScore = result.score;
        maxType = result.type;
        maxExplanation = result.explanation;
        maxMethod = detector.method;
      }
    }

    const anomalyDetected = maxScore >= this.config.anomalySensitivity;
    const recommendation = anomalyDetected
      ? maxScore >= 0.9 ? 'terminate' as const
        : maxScore >= 0.7 ? 'suspend' as const
        : maxScore >= 0.5 ? 'throttle' as const
        : 'monitor' as const
      : 'continue' as const;

    const result: AnomalyDetectionResult = {
      anomalyDetected,
      anomalyScore: maxScore,
      anomalyType: anomalyDetected ? maxType : undefined,
      explanation: maxExplanation,
      recommendation,
      method: maxMethod,
    };

    if (anomalyDetected) {
      this.emit('execution:anomaly', { action, anomaly: result });

      if (recommendation === 'throttle') {
        this.emit('agent:throttled', {
          agentId: action.agentId,
          reason: maxExplanation,
          durationMs: 30000,
        });
      } else if (recommendation === 'suspend' || recommendation === 'terminate') {
        this.emit('agent:suspended', {
          agentId: action.agentId,
          reason: maxExplanation,
        });
      }
    }

    return result;
  }

  // ===========================================================================
  // Anomaly Detection Methods
  // ===========================================================================

  private detectRateAnomaly(
    agentId: string,
  ): { score: number; type?: AnomalyType; explanation: string } {
    const history = this.actionHistory.get(agentId) ?? [];
    if (history.length < 5) return { score: 0, explanation: 'Insufficient history' };

    // Count actions in last 60 seconds
    const oneMinAgo = Date.now() - 60000;
    const recentActions = history.filter((a) => a.timestamp > oneMinAgo);
    const affordances = this.affordances.get(agentId);
    const rateLimit = affordances?.rateLimit ?? this.config.defaultRateLimit;

    const ratio = recentActions.length / rateLimit;

    if (ratio > 1.0) {
      return {
        score: Math.min(1.0, ratio - 0.5),
        type: 'rate-anomaly',
        explanation: `Agent executing ${recentActions.length} actions/min (limit: ${rateLimit})`,
      };
    }

    // Check for burst patterns
    if (recentActions.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < recentActions.length; i++) {
        intervals.push(recentActions[i].timestamp - recentActions[i - 1].timestamp);
      }
      const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;
      if (avgInterval < 100) { // Less than 100ms between actions
        return {
          score: 0.7,
          type: 'rate-anomaly',
          explanation: `Burst detected: avg ${avgInterval.toFixed(0)}ms between actions`,
        };
      }
    }

    return { score: 0, explanation: 'Normal rate' };
  }

  private detectSequenceAnomaly(
    agentId: string,
    currentAction: AgentAction,
  ): { score: number; type?: AnomalyType; explanation: string } {
    const history = this.actionHistory.get(agentId) ?? [];
    if (history.length < 3) return { score: 0, explanation: 'Insufficient sequence data' };

    // Check for unusual action type transitions
    const recent = history.slice(-5);
    const typeSequence = recent.map((a) => a.type);

    // Detect rapid oscillation between action types
    let oscillations = 0;
    for (let i = 2; i < typeSequence.length; i++) {
      if (typeSequence[i] === typeSequence[i - 2] && typeSequence[i] !== typeSequence[i - 1]) {
        oscillations++;
      }
    }
    if (oscillations >= 2) {
      return {
        score: 0.6,
        type: 'sequence-anomaly',
        explanation: `Oscillating action pattern detected: ${typeSequence.join(' -> ')}`,
      };
    }

    // Detect escalation pattern (progressively more dangerous actions)
    const riskProgression = recent.map(
      (a) => ACTION_RISK_PROFILES[a.type]?.baseRisk ?? 0.5,
    );
    let isEscalating = true;
    for (let i = 1; i < riskProgression.length; i++) {
      if (riskProgression[i] <= riskProgression[i - 1]) {
        isEscalating = false;
        break;
      }
    }
    if (isEscalating && riskProgression.length >= 3) {
      return {
        score: 0.7,
        type: 'sequence-anomaly',
        explanation: `Risk escalation pattern: ${riskProgression.map((r) => r.toFixed(2)).join(' -> ')}`,
      };
    }

    return { score: 0, explanation: 'Normal sequence' };
  }

  private detectTargetAnomaly(
    agentId: string,
    currentAction: AgentAction,
  ): { score: number; type?: AnomalyType; explanation: string } {
    const history = this.actionHistory.get(agentId) ?? [];

    // Build baseline of typical targets
    const targetCounts = new Map<string, number>();
    for (const action of history) {
      const key = `${action.target.type}:${action.target.id}`;
      targetCounts.set(key, (targetCounts.get(key) ?? 0) + 1);
    }

    const currentKey = `${currentAction.target.type}:${currentAction.target.id}`;
    const timesTargeted = targetCounts.get(currentKey) ?? 0;

    // Never-before-seen target with high-risk action
    if (timesTargeted === 0) {
      const profile = ACTION_RISK_PROFILES[currentAction.type];
      if (profile && profile.baseRisk > 0.5) {
        return {
          score: 0.5,
          type: 'target-anomaly',
          explanation: `High-risk action on never-seen target: ${currentKey}`,
        };
      }
    }

    // Targeting many different resources rapidly
    const recentTargets = new Set(
      history.slice(-10).map((a) => `${a.target.type}:${a.target.id}`),
    );
    if (recentTargets.size > 8) {
      return {
        score: 0.6,
        type: 'target-anomaly',
        explanation: `Targeting ${recentTargets.size} different resources in last 10 actions`,
      };
    }

    return { score: 0, explanation: 'Normal target pattern' };
  }

  private detectScopeAnomaly(
    action: AgentAction,
  ): { score: number; type?: AnomalyType; explanation: string } {
    const profile = ACTION_RISK_PROFILES[action.type];
    if (!profile) return { score: 0, explanation: 'Unknown action type' };

    const stakes = profile.defaultStakes;
    if (stakes.scopeOfImpact === 'world-wide' || stakes.scopeOfImpact === 'cross-world') {
      return {
        score: 0.5,
        type: 'scope-anomaly',
        explanation: `Action has ${stakes.scopeOfImpact} scope`,
      };
    }

    return { score: 0, explanation: 'Normal scope' };
  }

  // ===========================================================================
  // Phase 3: Post-Action Rollback Readiness
  // ===========================================================================

  /**
   * Create a rollback checkpoint before executing an action.
   */
  createCheckpoint(
    actionId: string,
    stateSnapshot: Map<string, unknown>,
  ): RollbackCheckpoint {
    // Prune old checkpoints
    this.pruneCheckpoints();

    const checkpoint: RollbackCheckpoint = {
      id: `checkpoint-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      actionId,
      snapshot: new Map(stateSnapshot),
      timestamp: Date.now(),
      consumed: false,
      ttlMs: this.config.checkpointTTLMs,
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    return checkpoint;
  }

  /**
   * Rollback to a checkpoint.
   */
  rollback(checkpointId: string): RollbackResult {
    const startTime = performance.now();
    const checkpoint = this.checkpoints.get(checkpointId);

    if (!checkpoint) {
      return {
        success: false,
        checkpointId,
        actionId: '',
        restoredKeys: [],
        failedKeys: [],
        durationMs: performance.now() - startTime,
      };
    }

    if (checkpoint.consumed) {
      return {
        success: false,
        checkpointId,
        actionId: checkpoint.actionId,
        restoredKeys: [],
        failedKeys: ['Checkpoint already consumed'],
        durationMs: performance.now() - startTime,
      };
    }

    this.emit('rollback:initiated', {
      actionId: checkpoint.actionId,
      checkpointId,
    });

    // Mark as consumed
    checkpoint.consumed = true;

    const restoredKeys = Array.from(checkpoint.snapshot.keys());
    const result: RollbackResult = {
      success: true,
      checkpointId,
      actionId: checkpoint.actionId,
      restoredKeys,
      failedKeys: [],
      durationMs: performance.now() - startTime,
    };

    this.emit('rollback:complete', { result });
    return result;
  }

  /**
   * Get the checkpoint snapshot (for applying rollback externally).
   */
  getCheckpointSnapshot(
    checkpointId: string,
  ): Map<string, unknown> | null {
    const checkpoint = this.checkpoints.get(checkpointId);
    return checkpoint?.snapshot ?? null;
  }

  /**
   * Post-action check: validate the result and side effects.
   */
  postCheck(
    action: AgentAction,
    result: ActionResult,
  ): boolean {
    // Validate side effects
    for (const effect of result.sideEffects) {
      // Check for unexpected irreversible changes
      if (!effect.reversible && action.type.includes('read')) {
        this.emit('post-check:fail', {
          action,
          reason: `Read action produced irreversible side effect on ${effect.target.type}:${effect.target.id}`,
        });
        return false;
      }
    }

    // Check for error results that indicate system issues
    if (!result.success && result.error) {
      const criticalErrors = [
        'permission denied',
        'integrity violation',
        'state corruption',
        'timeout',
      ];
      for (const err of criticalErrors) {
        if (result.error.toLowerCase().includes(err)) {
          this.emit('post-check:fail', {
            action,
            reason: `Critical error: ${result.error}`,
          });
          return false;
        }
      }
    }

    this.emit('post-check:pass', { action });
    return true;
  }

  // ===========================================================================
  // Phase 4: Cross-Step Trajectory Coherence
  // ===========================================================================

  /**
   * Record a trajectory step and analyze coherence.
   */
  recordTrajectoryStep(
    action: AgentAction,
    risk: RiskAssessment,
    stateBefore: Map<string, unknown>,
    stateAfter: Map<string, unknown>,
  ): TrajectoryAnalysis {
    if (!this.trajectories.has(action.agentId)) {
      this.trajectories.set(action.agentId, []);
    }
    const trajectory = this.trajectories.get(action.agentId)!;

    // Compute coherence with previous step
    const coherenceScore = trajectory.length > 0
      ? this.computeCoherence(trajectory[trajectory.length - 1], action)
      : 1.0;

    const step: TrajectoryStep = {
      action,
      risk,
      stateBefore: new Map(stateBefore),
      stateAfter: new Map(stateAfter),
      coherenceScore,
    };

    trajectory.push(step);

    // Trim trajectory
    if (trajectory.length > this.config.trajectoryHistoryLength) {
      trajectory.shift();
    }

    // Analyze full trajectory
    const analysis = this.analyzeTrajectory(action.agentId);

    this.emit('trajectory:analyzed', { analysis });

    // Flag incoherence points
    if (coherenceScore < this.config.coherenceThreshold) {
      this.emit('trajectory:incoherence', {
        agentId: action.agentId,
        stepIndex: trajectory.length - 1,
        drop: 1.0 - coherenceScore,
      });
    }

    return analysis;
  }

  /**
   * Analyze the full trajectory for an agent.
   */
  analyzeTrajectory(agentId: string): TrajectoryAnalysis {
    const steps = this.trajectories.get(agentId) ?? [];

    if (steps.length === 0) {
      return {
        agentId,
        steps: [],
        overallCoherence: 1.0,
        goalDirected: false,
        incoherencePoints: [],
        cumulativeRisk: 0,
        timestamp: Date.now(),
      };
    }

    // Overall coherence: average of all step coherences
    const overallCoherence = steps.reduce((s, st) => s + st.coherenceScore, 0) / steps.length;

    // Find incoherence points
    const incoherencePoints: TrajectoryAnalysis['incoherencePoints'] = [];
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].coherenceScore < this.config.coherenceThreshold) {
        incoherencePoints.push({
          stepIndex: i,
          drop: 1.0 - steps[i].coherenceScore,
          reason: `Coherence dropped to ${steps[i].coherenceScore.toFixed(2)} at step ${i}`,
        });
      }
    }

    // Goal inference: check if actions are converging on a target
    const targetFrequency = new Map<string, number>();
    for (const step of steps) {
      const key = `${step.action.target.type}:${step.action.target.id}`;
      targetFrequency.set(key, (targetFrequency.get(key) ?? 0) + 1);
    }

    let goalDirected = false;
    let inferredGoal: string | undefined;
    const maxFreq = Math.max(...targetFrequency.values(), 0);
    if (maxFreq >= steps.length * 0.4) {
      goalDirected = true;
      for (const [target, freq] of targetFrequency) {
        if (freq === maxFreq) {
          inferredGoal = target;
          break;
        }
      }
    }

    // Cumulative risk
    const cumulativeRisk = steps.reduce((s, st) => s + st.risk.riskScore, 0) / steps.length;

    return {
      agentId,
      steps,
      overallCoherence,
      goalDirected,
      inferredGoal,
      incoherencePoints,
      cumulativeRisk,
      timestamp: Date.now(),
    };
  }

  /**
   * Compute coherence between two consecutive actions.
   */
  private computeCoherence(
    previous: TrajectoryStep,
    current: AgentAction,
  ): number {
    let score = 0.5; // Base coherence

    // Same target type: coherent
    if (previous.action.target.type === current.target.type) {
      score += 0.2;
    }

    // Same target ID: very coherent
    if (previous.action.target.id === current.target.id) {
      score += 0.15;
    }

    // Related action types (e.g., create then modify)
    if (this.areRelatedActionTypes(previous.action.type, current.type)) {
      score += 0.15;
    }

    // Part of same workflow (parent action)
    if (
      current.parentActionId &&
      current.parentActionId === previous.action.parentActionId
    ) {
      score += 0.2;
    }

    // Rapid context switching penalty
    if (previous.action.target.type !== current.target.type) {
      score -= 0.1;
    }

    // Risk escalation penalty
    const prevRisk = previous.risk.riskScore;
    const currProfile = ACTION_RISK_PROFILES[current.type];
    if (currProfile && currProfile.baseRisk - prevRisk > 0.3) {
      score -= 0.15;
    }

    return Math.max(0, Math.min(1.0, score));
  }

  private areRelatedActionTypes(a: ActionType, b: ActionType): boolean {
    const families: ActionType[][] = [
      ['world-create', 'world-modify', 'world-delete'],
      ['object-spawn', 'object-modify', 'object-delete'],
      ['data-read', 'data-write', 'data-delete'],
      ['agent-communicate', 'agent-coordinate'],
    ];
    for (const family of families) {
      if (family.includes(a) && family.includes(b)) return true;
    }
    return false;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private assessStakes(action: AgentAction): StakesAssessment {
    const profile = ACTION_RISK_PROFILES[action.type];
    return {
      scopeOfImpact: (profile?.defaultStakes.scopeOfImpact as StakesAssessment['scopeOfImpact']) ?? 'single',
      impactType: (profile?.defaultStakes.impactType as StakesAssessment['impactType']) ?? 'state',
      humansAffected: profile?.defaultStakes.humansAffected ?? false,
      magnitude: profile?.defaultStakes.magnitude ?? 0.5,
    };
  }

  private assessReversibility(action: AgentAction): ReversibilityAssessment {
    const profile = ACTION_RISK_PROFILES[action.type];
    return {
      fullyReversible: profile?.defaultReversibility.fullyReversible ?? false,
      partiallyReversible: profile?.defaultReversibility.partiallyReversible ?? false,
      reversalWindowMs: -1,
      reversalCost: (profile?.defaultReversibility.reversalCost as ReversibilityAssessment['reversalCost']) ?? 'medium',
      snapshotAvailable: this.config.rollbackEnabled,
    };
  }

  private checkAffordanceCompliance(action: AgentAction): number {
    const affordances = this.affordances.get(action.agentId);
    if (!affordances) return 0.5; // No affordances registered = moderate compliance

    let score = 0;

    // Check if action type is allowed
    if (affordances.allowedActions.includes(action.type)) {
      score += 0.5;
    }

    // Check rate limit
    const rateStatus = this.checkRateLimit(action.agentId);
    if (rateStatus < 0.5) {
      score += 0.3;
    }

    // Check concurrent actions
    const concurrent = this.actionHistory.get(action.agentId)?.filter(
      (a) => a.phase === 'executing',
    ).length ?? 0;
    if (concurrent < affordances.maxConcurrent) {
      score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private checkRateLimit(agentId: string): number {
    const now = Date.now();
    const state = this.actionCounts.get(agentId);

    if (!state || now - state.windowStart > 60000) {
      this.actionCounts.set(agentId, { count: 1, windowStart: now });
      return 0;
    }

    state.count++;
    const affordances = this.affordances.get(agentId);
    const limit = affordances?.rateLimit ?? this.config.defaultRateLimit;
    return state.count / limit;
  }

  private categorizeRisk(score: number): RiskCategory {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    if (score < 0.85) return 'high';
    return 'critical';
  }

  private determineRecommendation(
    score: number,
    category: RiskCategory,
    action: AgentAction,
  ): RiskRecommendation {
    if (score < this.config.riskThresholds.autoAllowBelow) {
      return 'allow';
    }
    if (score >= this.config.riskThresholds.autoBlockAbove) {
      return 'block-and-alert';
    }

    // Check agent affordances for autonomous risk level
    const affordances = this.affordances.get(action.agentId);
    if (affordances) {
      const categoryOrder: RiskCategory[] = ['low', 'medium', 'high', 'critical'];
      const maxIdx = categoryOrder.indexOf(affordances.maxAutonomousRisk);
      const currentIdx = categoryOrder.indexOf(category);
      if (currentIdx > maxIdx) {
        return 'require-approval';
      }
    }

    if (category === 'medium') return 'allow-with-logging';
    if (category === 'high') return 'require-approval';
    return 'block';
  }

  private createAssessment(
    actionId: string,
    riskScore: number,
    category: RiskCategory,
    recommendation: RiskRecommendation,
    factors: RiskFactor[],
    startTime: number,
  ): RiskAssessment {
    return {
      actionId,
      riskScore,
      category,
      factors,
      recommendation,
      timestamp: Date.now(),
      latencyMs: performance.now() - startTime,
    };
  }

  private pruneCheckpoints(): void {
    const now = Date.now();
    for (const [id, checkpoint] of this.checkpoints) {
      if (now - checkpoint.timestamp > checkpoint.ttlMs || checkpoint.consumed) {
        this.checkpoints.delete(id);
      }
    }
    // Enforce max checkpoints
    if (this.checkpoints.size > this.config.maxCheckpoints) {
      const sorted = Array.from(this.checkpoints.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = sorted.slice(
        0,
        sorted.length - this.config.maxCheckpoints,
      );
      for (const [id] of toRemove) {
        this.checkpoints.delete(id);
      }
    }
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<K extends FailureEventType>(
    event: K,
    handler: FailureEventHandler<K>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  private emit<K extends FailureEventType>(
    event: K,
    data: FailureDetectionEventMap[K],
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as FailureEventHandler<K>)(data);
      }
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  dispose(): void {
    this.affordances.clear();
    this.checkpoints.clear();
    this.trajectories.clear();
    this.actionHistory.clear();
    this.actionCounts.clear();
    this.baselines.clear();
    this.eventHandlers.clear();
  }
}

// =============================================================================
// Internal Types
// =============================================================================

interface AgentBaseline {
  agentId: string;
  avgActionsPerMinute: number;
  commonActionTypes: Map<ActionType, number>;
  commonTargets: Map<string, number>;
  avgRiskScore: number;
  samplesCollected: number;
}
