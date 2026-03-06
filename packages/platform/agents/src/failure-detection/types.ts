/**
 * Real-Time Failure Detection - Type Definitions
 *
 * Implements the Partnership on AI framework for responsible agent behavior:
 *   - Pre-action permission checks
 *   - During-execution anomaly detection
 *   - Post-action rollback readiness
 *   - Cross-step trajectory coherence analysis
 *
 * Calibrated by stakes, reversibility, and agent affordances.
 *
 * @module failure-detection/types
 */

// =============================================================================
// Action Model
// =============================================================================

export interface AgentAction {
  /** Unique action ID */
  id: string;
  /** Agent performing the action */
  agentId: string;
  /** Action type */
  type: ActionType;
  /** Human-readable description */
  description: string;
  /** Target resource or entity */
  target: ActionTarget;
  /** Parameters */
  params: Record<string, unknown>;
  /** Action phase */
  phase: ActionPhase;
  /** Timestamp */
  timestamp: number;
  /** Duration (ms, filled after completion) */
  durationMs?: number;
  /** Parent action (for multi-step workflows) */
  parentActionId?: string;
  /** Result (filled after completion) */
  result?: ActionResult;
}

export type ActionType =
  | 'world-create'
  | 'world-modify'
  | 'world-delete'
  | 'object-spawn'
  | 'object-modify'
  | 'object-delete'
  | 'agent-communicate'
  | 'agent-coordinate'
  | 'data-read'
  | 'data-write'
  | 'data-delete'
  | 'tool-execute'
  | 'code-execute'
  | 'network-request'
  | 'memory-access'
  | 'user-interaction'
  | 'system-config';

export interface ActionTarget {
  type: 'world' | 'object' | 'agent' | 'data' | 'tool' | 'system' | 'user';
  id: string;
  name?: string;
}

export type ActionPhase =
  | 'pending'          // Not yet started
  | 'pre-check'        // Permission check in progress
  | 'executing'        // Action in progress
  | 'post-check'       // Post-action validation
  | 'completed'        // Successfully completed
  | 'failed'           // Failed
  | 'rolled-back'      // Rolled back
  | 'blocked';         // Blocked by permission check

export interface ActionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  sideEffects: SideEffect[];
}

export interface SideEffect {
  type: 'state-change' | 'resource-creation' | 'resource-deletion' | 'communication' | 'metric-change';
  target: ActionTarget;
  before: unknown;
  after: unknown;
  reversible: boolean;
}

// =============================================================================
// Risk Assessment
// =============================================================================

export interface RiskAssessment {
  /** Action being assessed */
  actionId: string;
  /** Overall risk score (0-1) */
  riskScore: number;
  /** Risk category */
  category: RiskCategory;
  /** Individual risk factors */
  factors: RiskFactor[];
  /** Recommended action */
  recommendation: RiskRecommendation;
  /** Assessment timestamp */
  timestamp: number;
  /** Assessment latency (ms) */
  latencyMs: number;
}

export type RiskCategory = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  /** Factor name */
  name: string;
  /** Factor score (0-1) */
  score: number;
  /** Weight in composite score */
  weight: number;
  /** Explanation */
  explanation: string;
}

export type RiskRecommendation =
  | 'allow'             // Proceed without intervention
  | 'allow-with-logging'// Proceed but log for audit
  | 'require-approval'  // Require human/admin approval
  | 'throttle'          // Allow but rate-limit
  | 'block'             // Block the action
  | 'block-and-alert';  // Block and notify security team

// =============================================================================
// Stakes / Reversibility / Affordances (PAI Framework)
// =============================================================================

/**
 * Stakes represent the potential impact of an action.
 * Higher stakes = more scrutiny needed.
 */
export interface StakesAssessment {
  /** How many entities are affected */
  scopeOfImpact: 'single' | 'multiple' | 'world-wide' | 'cross-world';
  /** Type of impact */
  impactType: 'data' | 'state' | 'access' | 'financial' | 'safety' | 'reputation';
  /** Whether the impact affects humans */
  humansAffected: boolean;
  /** Estimated impact magnitude (0-1) */
  magnitude: number;
}

/**
 * Reversibility describes how easily an action can be undone.
 */
export interface ReversibilityAssessment {
  /** Can this action be fully reversed? */
  fullyReversible: boolean;
  /** Can it be partially reversed? */
  partiallyReversible: boolean;
  /** Time window for reversal (ms, -1 = unlimited) */
  reversalWindowMs: number;
  /** Resources needed for reversal */
  reversalCost: 'none' | 'low' | 'medium' | 'high';
  /** State snapshot available for rollback? */
  snapshotAvailable: boolean;
}

/**
 * Agent affordances define what an agent is capable/allowed to do.
 */
export interface AgentAffordances {
  /** Agent ID */
  agentId: string;
  /** Maximum risk level this agent can execute without approval */
  maxAutonomousRisk: RiskCategory;
  /** Action types this agent is allowed to perform */
  allowedActions: ActionType[];
  /** Maximum actions per minute */
  rateLimit: number;
  /** Maximum concurrent actions */
  maxConcurrent: number;
  /** Required approval chain for high-risk actions */
  approvalChain: string[];
  /** Custom constraints */
  constraints: Record<string, unknown>;
}

// =============================================================================
// Anomaly Detection
// =============================================================================

export interface AnomalyDetectionResult {
  /** Whether an anomaly was detected */
  anomalyDetected: boolean;
  /** Anomaly score (0-1, higher = more anomalous) */
  anomalyScore: number;
  /** Type of anomaly */
  anomalyType?: AnomalyType;
  /** Explanation */
  explanation: string;
  /** Recommended action */
  recommendation: AnomalyRecommendation;
  /** Detection method used */
  method: string;
}

export type AnomalyType =
  | 'rate-anomaly'           // Unusual action frequency
  | 'sequence-anomaly'       // Unusual action sequence
  | 'target-anomaly'         // Unusual target selection
  | 'timing-anomaly'         // Unusual timing patterns
  | 'scope-anomaly'          // Unusual scope of actions
  | 'resource-anomaly'       // Unusual resource consumption
  | 'coherence-anomaly'      // Actions don't form coherent plan
  | 'drift-anomaly';         // Agent behavior drifting from baseline

export type AnomalyRecommendation =
  | 'continue'         // No action needed
  | 'monitor'          // Increase monitoring
  | 'throttle'         // Reduce action rate
  | 'suspend'          // Pause agent temporarily
  | 'terminate';       // Stop agent immediately

// =============================================================================
// Trajectory Coherence
// =============================================================================

export interface TrajectoryStep {
  /** Action in this step */
  action: AgentAction;
  /** Risk assessment for this step */
  risk: RiskAssessment;
  /** State before this step */
  stateBefore: Map<string, unknown>;
  /** State after this step */
  stateAfter: Map<string, unknown>;
  /** Coherence with previous step (0-1) */
  coherenceScore: number;
}

export interface TrajectoryAnalysis {
  /** Agent ID */
  agentId: string;
  /** All steps in the trajectory */
  steps: TrajectoryStep[];
  /** Overall trajectory coherence (0-1) */
  overallCoherence: number;
  /** Whether the trajectory appears goal-directed */
  goalDirected: boolean;
  /** Inferred goal (if detectable) */
  inferredGoal?: string;
  /** Points where coherence drops */
  incoherencePoints: Array<{
    stepIndex: number;
    drop: number;
    reason: string;
  }>;
  /** Cumulative risk across trajectory */
  cumulativeRisk: number;
  /** Analysis timestamp */
  timestamp: number;
}

// =============================================================================
// Rollback
// =============================================================================

export interface RollbackCheckpoint {
  /** Checkpoint ID */
  id: string;
  /** Action this checkpoint was created for */
  actionId: string;
  /** State snapshot */
  snapshot: Map<string, unknown>;
  /** Timestamp */
  timestamp: number;
  /** Whether this checkpoint has been consumed (rolled back) */
  consumed: boolean;
  /** TTL for this checkpoint (ms) */
  ttlMs: number;
}

export interface RollbackResult {
  success: boolean;
  checkpointId: string;
  actionId: string;
  restoredKeys: string[];
  failedKeys: string[];
  durationMs: number;
}

// =============================================================================
// Failure Detection Events
// =============================================================================

export interface FailureDetectionEventMap {
  'pre-check:start': { action: AgentAction };
  'pre-check:pass': { action: AgentAction; risk: RiskAssessment };
  'pre-check:fail': { action: AgentAction; risk: RiskAssessment; reason: string };
  'execution:start': { action: AgentAction };
  'execution:complete': { action: AgentAction; result: ActionResult };
  'execution:anomaly': { action: AgentAction; anomaly: AnomalyDetectionResult };
  'post-check:pass': { action: AgentAction };
  'post-check:fail': { action: AgentAction; reason: string };
  'rollback:initiated': { actionId: string; checkpointId: string };
  'rollback:complete': { result: RollbackResult };
  'trajectory:analyzed': { analysis: TrajectoryAnalysis };
  'trajectory:incoherence': { agentId: string; stepIndex: number; drop: number };
  'agent:throttled': { agentId: string; reason: string; durationMs: number };
  'agent:suspended': { agentId: string; reason: string };
  'risk:escalated': { actionId: string; from: RiskCategory; to: RiskCategory };
}

export type FailureEventType = keyof FailureDetectionEventMap;
export type FailureEventHandler<K extends FailureEventType> = (
  event: FailureDetectionEventMap[K],
) => void;

// =============================================================================
// Configuration
// =============================================================================

export interface FailureDetectionConfig {
  /** Enable pre-action permission checks */
  preCheckEnabled: boolean;
  /** Enable during-execution anomaly detection */
  anomalyDetectionEnabled: boolean;
  /** Enable post-action rollback readiness */
  rollbackEnabled: boolean;
  /** Enable cross-step trajectory coherence analysis */
  trajectoryAnalysisEnabled: boolean;
  /** Risk thresholds for automatic decisions */
  riskThresholds: {
    /** Actions below this are auto-allowed */
    autoAllowBelow: number;
    /** Actions above this are auto-blocked */
    autoBlockAbove: number;
    /** Actions in between require review */
  };
  /** Anomaly detection sensitivity (0-1, higher = more sensitive) */
  anomalySensitivity: number;
  /** Trajectory coherence threshold (below = flagged) */
  coherenceThreshold: number;
  /** Maximum checkpoint age (ms) */
  checkpointTTLMs: number;
  /** Maximum checkpoints to retain */
  maxCheckpoints: number;
  /** Trajectory history length (steps) */
  trajectoryHistoryLength: number;
  /** Action rate limit defaults */
  defaultRateLimit: number;
}
