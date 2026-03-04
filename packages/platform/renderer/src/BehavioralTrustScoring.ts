/**
 * BehavioralTrustScoring
 *
 * Continuous behavioral trust scoring for VR avatars across four dimensions:
 * 1. Spatial Compliance   - Respects world bounds, restricted zones, teleport rules
 * 2. Physics Adherence    - Realistic velocity/acceleration, no clipping, gravity
 * 3. Interaction Appropriateness - Chat rate, gesture frequency, distance, no harassment
 * 4. Temporal Consistency - Heartbeat regularity, update frequency, no speed hacking
 *
 * DESIGN PRINCIPLES:
 * - Off render loop: All scoring computations run on a configurable Hz loop
 *   (default 5Hz), completely decoupled from the 90Hz VR render path.
 * - Render-loop safe reads: Per-agent composite scores are accessible via
 *   `getAgentScore(agentId)` in <0.1ms (map lookup, no computation).
 * - Double-buffered integration: Scoring state integrates with the existing
 *   VRTrustHandshake via `onTrustLevelChanged` callbacks when scores cross
 *   configurable thresholds (degrade, revoke, recover).
 * - Event-driven: Accepts BehavioralEvents from the AgentCommunicationManager
 *   and SpatialReasoningEngine, processing them in batches per scoring cycle.
 * - Exponentially Weighted Moving Average (EWMA): Each dimension score uses
 *   EWMA to smooth out transient noise while reacting to sustained violations.
 * - Configurable thresholds and weights per world.
 *
 * SCORING MODEL:
 * ```
 *   Per-Dimension Score (0-1):
 *     score = EWMA(event_scores, alpha)
 *     where alpha = smoothing factor (default 0.3)
 *
 *   Composite Score (0-1):
 *     composite = sum(dimension_score[i] * weight[i]) / sum(weight[i])
 *
 *   Trust Impact:
 *     composite >= recoverThreshold  -> RECOVER (degraded -> trusted)
 *     composite <  degradeThreshold  -> DEGRADE (trusted -> degraded)
 *     composite <  revokeThreshold   -> REVOKE  (degraded -> revoked)
 * ```
 *
 * DATA FLOW:
 * ```
 *   AgentCommunicationManager.onMessage()
 *        |
 *        v
 *   BehavioralTrustScoring.ingestEvent()     <-- OFF render loop
 *        |
 *        v
 *   eventQueue.push(event)                   <-- Batched until next scoring cycle
 *        |
 *        v
 *   scoringCycle() [every 200ms at 5Hz]      <-- OFF render loop
 *        ├── Process queued events
 *        ├── Update dimension scores (EWMA)
 *        ├── Compute composite scores
 *        ├── Apply decay to inactive agents
 *        ├── Check threshold crossings
 *        └── Fire callbacks for trust transitions
 *        |
 *        v
 *   getAgentScore(agentId)                   <-- ON render loop (<0.1ms)
 *        |
 *        v
 *   Renderer applies visual trust indicators (shield opacity, glow, etc.)
 * ```
 *
 * INTEGRATION WITH VRTrustHandshake:
 * ```typescript
 * const trustHandshake = new VRTrustHandshake({ worldId: 'world-1' });
 * const scoring = new BehavioralTrustScoring({
 *   onTrustAction: (agentId, action, score) => {
 *     if (action === 'degrade') {
 *       // Trigger trust level change in handshake
 *     } else if (action === 'revoke') {
 *       trustHandshake.exitAgent(agentId, 'behavioral_violation');
 *     }
 *   },
 * });
 *
 * // Feed events from agent communication
 * scoring.ingestEvent({
 *   type: 'position_update',
 *   agentId: 'agent-1',
 *   timestamp: Date.now(),
 *   data: { position: { x: 10, y: 0, z: 5 }, velocity: 2.5 },
 * });
 *
 * // Render loop: read composite score
 * const score = scoring.getAgentScore('agent-1'); // <0.1ms
 * ```
 *
 * @module BehavioralTrustScoring
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * The four behavioral trust dimensions.
 */
export type TrustDimension =
  | 'spatial_compliance'
  | 'physics_adherence'
  | 'interaction_appropriateness'
  | 'temporal_consistency';

/**
 * Trust action triggered when composite score crosses a threshold.
 */
export type TrustAction = 'degrade' | 'revoke' | 'recover';

/**
 * Types of behavioral events that feed into scoring.
 */
export type BehavioralEventType =
  // Spatial Compliance events
  | 'position_update'          // Agent reported a new position
  | 'zone_entry'               // Agent entered a restricted zone
  | 'zone_exit'                // Agent exited a restricted zone
  | 'bounds_violation'         // Agent went outside world bounds
  | 'teleport'                 // Agent teleported (legitimate or suspicious)
  // Physics Adherence events
  | 'velocity_report'          // Agent velocity measurement
  | 'collision_detected'       // Agent clipped through geometry
  | 'gravity_violation'        // Agent floating without cause
  | 'acceleration_spike'       // Unrealistic acceleration change
  // Interaction Appropriateness events
  | 'chat_message'             // Agent sent a chat message
  | 'gesture_performed'        // Agent triggered a gesture/emote
  | 'proximity_warning'        // Agent invaded personal space
  | 'interaction_attempt'      // Agent tried to interact with object/agent
  | 'harassment_flag'          // System flagged potential harassment
  // Temporal Consistency events
  | 'heartbeat'                // Regular heartbeat from agent
  | 'state_update'             // Agent state update received
  | 'heartbeat_missed'         // Expected heartbeat not received
  | 'impossible_movement'      // Position delta implies impossible speed
  | 'timestamp_anomaly';       // Timestamp inconsistency detected

/**
 * A behavioral event to be scored.
 */
export interface BehavioralEvent {
  /** Event type */
  type: BehavioralEventType;
  /** Agent this event pertains to */
  agentId: string;
  /** When the event occurred (ms since epoch) */
  timestamp: number;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Pre-computed severity (0 = benign, 1 = severe violation). If not set, auto-computed. */
  severity?: number;
}

/**
 * Per-dimension scoring state for a single agent.
 */
export interface DimensionScore {
  /** Current EWMA score (0 = fully untrusted, 1 = fully trusted) */
  score: number;
  /** Number of events processed for this dimension */
  eventCount: number;
  /** Number of violations detected */
  violationCount: number;
  /** Timestamp of last event processed */
  lastEventTimestamp: number;
  /** Timestamp of last violation */
  lastViolationTimestamp: number;
  /** Running violation rate (violations per minute) */
  violationRate: number;
}

/**
 * Complete behavioral trust state for a single agent.
 */
export interface AgentBehavioralState {
  /** Agent ID */
  agentId: string;
  /** Per-dimension scores */
  dimensions: Record<TrustDimension, DimensionScore>;
  /** Weighted composite score (0-1) */
  compositeScore: number;
  /** Current trust action state */
  currentAction: TrustAction | null;
  /** Timestamp of agent registration */
  registeredAt: number;
  /** Timestamp of last scoring update */
  lastScoringTimestamp: number;
  /** Total events processed for this agent */
  totalEvents: number;
  /** Total violations across all dimensions */
  totalViolations: number;
  /** Position history for temporal consistency checks */
  positionHistory: Array<{ position: Vec3; timestamp: number }>;
  /** Chat timestamps for rate limiting */
  chatTimestamps: number[];
  /** Gesture timestamps for rate limiting */
  gestureTimestamps: number[];
  /** Last known position */
  lastPosition: Vec3 | null;
  /** Last known velocity */
  lastVelocity: number;
}

/**
 * Configuration for the BehavioralTrustScoring system.
 */
export interface BehavioralTrustScoringConfig {
  /** Scoring cycle frequency in Hz (default: 5) */
  scoringHz?: number;
  /** EWMA smoothing factor (0-1, higher = more reactive, default: 0.3) */
  ewmaAlpha?: number;
  /** Dimension weights for composite score computation */
  dimensionWeights?: Partial<Record<TrustDimension, number>>;
  /** Composite score threshold to trigger degradation (default: 0.5) */
  degradeThreshold?: number;
  /** Composite score threshold to trigger revocation (default: 0.2) */
  revokeThreshold?: number;
  /** Composite score threshold to allow recovery (default: 0.8) */
  recoverThreshold?: number;
  /** Trust decay rate per second for inactive agents (default: 0.002) */
  inactivityDecayRate?: number;
  /** Maximum seconds of inactivity before decay starts (default: 30) */
  inactivityGracePeriodSec?: number;
  /** Maximum position history entries per agent (default: 100) */
  maxPositionHistory?: number;
  /** Maximum chat/gesture timestamp entries for rate limiting (default: 50) */
  maxRateLimitHistory?: number;
  /** Whether to auto-start the scoring loop (default: false) */
  autoStart?: boolean;

  // -- Spatial Compliance thresholds --
  /** World bounds (AABB). Positions outside trigger violations. */
  worldBounds?: { min: Vec3; max: Vec3 };
  /** Maximum allowed teleportation distance (default: 50) */
  maxTeleportDistance?: number;

  // -- Physics Adherence thresholds --
  /** Maximum allowed velocity in units/second (default: 20) */
  maxVelocity?: number;
  /** Maximum allowed acceleration in units/second^2 (default: 50) */
  maxAcceleration?: number;

  // -- Interaction Appropriateness thresholds --
  /** Maximum chat messages per minute (default: 30) */
  maxChatPerMinute?: number;
  /** Maximum gestures per minute (default: 20) */
  maxGesturesPerMinute?: number;
  /** Minimum personal space distance in world units (default: 1.0) */
  personalSpaceRadius?: number;

  // -- Temporal Consistency thresholds --
  /** Expected heartbeat interval in ms (default: 5000) */
  expectedHeartbeatMs?: number;
  /** Maximum heartbeat interval before penalty (default: 15000) */
  maxHeartbeatIntervalMs?: number;
  /** Maximum state update gap before penalty (default: 10000) */
  maxStateUpdateGapMs?: number;

  /** Callback when a trust action is triggered by scoring */
  onTrustAction?: (agentId: string, action: TrustAction, compositeScore: number, details: TrustActionDetails) => void;
  /** Callback when an agent's composite score changes significantly */
  onScoreChanged?: (agentId: string, oldScore: number, newScore: number) => void;
}

/**
 * Details provided with a trust action callback.
 */
export interface TrustActionDetails {
  /** The action triggered */
  action: TrustAction;
  /** Composite score at time of action */
  compositeScore: number;
  /** Per-dimension scores at time of action */
  dimensionScores: Record<TrustDimension, number>;
  /** Primary dimension causing the action (lowest score) */
  primaryCause: TrustDimension;
  /** Recent violation summary */
  recentViolations: string[];
  /** Timestamp of action */
  timestamp: number;
}

/**
 * Metrics for the behavioral trust scoring system.
 */
export interface BehavioralTrustScoringMetrics {
  /** Whether the scoring loop is running */
  isRunning: boolean;
  /** Scoring cycle frequency */
  scoringHz: number;
  /** Total agents tracked */
  trackedAgentCount: number;
  /** Total events processed */
  totalEventsProcessed: number;
  /** Total violations detected */
  totalViolationsDetected: number;
  /** Total trust actions triggered */
  totalActionsTriggered: number;
  /** Average composite score across all agents */
  averageCompositeScore: number;
  /** Events pending processing */
  pendingEventCount: number;
  /** Average scoring cycle duration in ms */
  averageCycleDurationMs: number;
  /** Dimension weights in use */
  dimensionWeights: Record<TrustDimension, number>;
  /** Action thresholds */
  thresholds: {
    degrade: number;
    revoke: number;
    recover: number;
  };
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_DIMENSION_WEIGHTS: Record<TrustDimension, number> = {
  spatial_compliance: 0.25,
  physics_adherence: 0.30,
  interaction_appropriateness: 0.25,
  temporal_consistency: 0.20,
};

/**
 * Default scoring configuration.
 */
export const DEFAULT_BEHAVIORAL_SCORING_CONFIG = {
  scoringHz: 5,
  ewmaAlpha: 0.3,
  degradeThreshold: 0.5,
  revokeThreshold: 0.2,
  recoverThreshold: 0.8,
  inactivityDecayRate: 0.002,
  inactivityGracePeriodSec: 30,
  maxPositionHistory: 100,
  maxRateLimitHistory: 50,
  maxTeleportDistance: 50,
  maxVelocity: 20,
  maxAcceleration: 50,
  maxChatPerMinute: 30,
  maxGesturesPerMinute: 20,
  personalSpaceRadius: 1.0,
  expectedHeartbeatMs: 5000,
  maxHeartbeatIntervalMs: 15000,
  maxStateUpdateGapMs: 10000,
} as const;

// =============================================================================
// DIMENSION SCORE FACTORY
// =============================================================================

function createInitialDimensionScore(): DimensionScore {
  return {
    score: 1.0, // Start fully trusted
    eventCount: 0,
    violationCount: 0,
    lastEventTimestamp: 0,
    lastViolationTimestamp: 0,
    violationRate: 0,
  };
}

function createInitialDimensions(): Record<TrustDimension, DimensionScore> {
  return {
    spatial_compliance: createInitialDimensionScore(),
    physics_adherence: createInitialDimensionScore(),
    interaction_appropriateness: createInitialDimensionScore(),
    temporal_consistency: createInitialDimensionScore(),
  };
}

function createInitialAgentBehavioralState(agentId: string): AgentBehavioralState {
  return {
    agentId,
    dimensions: createInitialDimensions(),
    compositeScore: 1.0,
    currentAction: null,
    registeredAt: Date.now(),
    lastScoringTimestamp: Date.now(),
    totalEvents: 0,
    totalViolations: 0,
    positionHistory: [],
    chatTimestamps: [],
    gestureTimestamps: [],
    lastPosition: null,
    lastVelocity: 0,
  };
}

// =============================================================================
// EVENT -> DIMENSION MAPPING
// =============================================================================

const EVENT_DIMENSION_MAP: Record<BehavioralEventType, TrustDimension> = {
  // Spatial Compliance
  position_update: 'spatial_compliance',
  zone_entry: 'spatial_compliance',
  zone_exit: 'spatial_compliance',
  bounds_violation: 'spatial_compliance',
  teleport: 'spatial_compliance',
  // Physics Adherence
  velocity_report: 'physics_adherence',
  collision_detected: 'physics_adherence',
  gravity_violation: 'physics_adherence',
  acceleration_spike: 'physics_adherence',
  // Interaction Appropriateness
  chat_message: 'interaction_appropriateness',
  gesture_performed: 'interaction_appropriateness',
  proximity_warning: 'interaction_appropriateness',
  interaction_attempt: 'interaction_appropriateness',
  harassment_flag: 'interaction_appropriateness',
  // Temporal Consistency
  heartbeat: 'temporal_consistency',
  state_update: 'temporal_consistency',
  heartbeat_missed: 'temporal_consistency',
  impossible_movement: 'temporal_consistency',
  timestamp_anomaly: 'temporal_consistency',
};

// =============================================================================
// BEHAVIORAL TRUST SCORING ENGINE
// =============================================================================

/**
 * Behavioral trust scoring engine for VR avatars.
 *
 * Processes behavioral events across four dimensions and produces
 * composite trust scores for each agent. Runs off the VR render loop.
 *
 * Usage:
 * ```typescript
 * const scoring = new BehavioralTrustScoring({
 *   onTrustAction: (agentId, action, score, details) => {
 *     console.log(`Agent ${agentId}: ${action} (score: ${score})`);
 *   },
 * });
 *
 * scoring.start();
 *
 * // Feed events
 * scoring.ingestEvent({
 *   type: 'position_update',
 *   agentId: 'agent-1',
 *   timestamp: Date.now(),
 *   data: { position: { x: 0, y: 0, z: 0 } },
 * });
 *
 * // Render loop: O(1) score read
 * const score = scoring.getAgentScore('agent-1');
 * ```
 */
export class BehavioralTrustScoring {
  private readonly config: {
    scoringHz: number;
    ewmaAlpha: number;
    dimensionWeights: Record<TrustDimension, number>;
    degradeThreshold: number;
    revokeThreshold: number;
    recoverThreshold: number;
    inactivityDecayRate: number;
    inactivityGracePeriodSec: number;
    maxPositionHistory: number;
    maxRateLimitHistory: number;
    worldBounds: { min: Vec3; max: Vec3 } | null;
    maxTeleportDistance: number;
    maxVelocity: number;
    maxAcceleration: number;
    maxChatPerMinute: number;
    maxGesturesPerMinute: number;
    personalSpaceRadius: number;
    expectedHeartbeatMs: number;
    maxHeartbeatIntervalMs: number;
    maxStateUpdateGapMs: number;
    onTrustAction: (agentId: string, action: TrustAction, compositeScore: number, details: TrustActionDetails) => void;
    onScoreChanged: (agentId: string, oldScore: number, newScore: number) => void;
  };

  /** Per-agent behavioral state */
  private readonly agentStates: Map<string, AgentBehavioralState> = new Map();

  /** Event queue: accumulated events to process in next scoring cycle */
  private eventQueue: BehavioralEvent[] = [];

  /** Scoring loop interval */
  private scoringIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  /** Metrics */
  private totalEventsProcessed: number = 0;
  private totalViolationsDetected: number = 0;
  private totalActionsTriggered: number = 0;
  private cycleDurations: number[] = [];
  private readonly MAX_CYCLE_HISTORY = 60;

  constructor(config?: BehavioralTrustScoringConfig) {
    this.config = {
      scoringHz: config?.scoringHz ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.scoringHz,
      ewmaAlpha: config?.ewmaAlpha ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.ewmaAlpha,
      dimensionWeights: {
        ...DEFAULT_DIMENSION_WEIGHTS,
        ...(config?.dimensionWeights ?? {}),
      },
      degradeThreshold: config?.degradeThreshold ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.degradeThreshold,
      revokeThreshold: config?.revokeThreshold ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.revokeThreshold,
      recoverThreshold: config?.recoverThreshold ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.recoverThreshold,
      inactivityDecayRate: config?.inactivityDecayRate ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.inactivityDecayRate,
      inactivityGracePeriodSec: config?.inactivityGracePeriodSec ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.inactivityGracePeriodSec,
      maxPositionHistory: config?.maxPositionHistory ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxPositionHistory,
      maxRateLimitHistory: config?.maxRateLimitHistory ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxRateLimitHistory,
      worldBounds: config?.worldBounds ?? null,
      maxTeleportDistance: config?.maxTeleportDistance ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxTeleportDistance,
      maxVelocity: config?.maxVelocity ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxVelocity,
      maxAcceleration: config?.maxAcceleration ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxAcceleration,
      maxChatPerMinute: config?.maxChatPerMinute ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxChatPerMinute,
      maxGesturesPerMinute: config?.maxGesturesPerMinute ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxGesturesPerMinute,
      personalSpaceRadius: config?.personalSpaceRadius ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.personalSpaceRadius,
      expectedHeartbeatMs: config?.expectedHeartbeatMs ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.expectedHeartbeatMs,
      maxHeartbeatIntervalMs: config?.maxHeartbeatIntervalMs ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxHeartbeatIntervalMs,
      maxStateUpdateGapMs: config?.maxStateUpdateGapMs ?? DEFAULT_BEHAVIORAL_SCORING_CONFIG.maxStateUpdateGapMs,
      onTrustAction: config?.onTrustAction ?? (() => {}),
      onScoreChanged: config?.onScoreChanged ?? (() => {}),
    };

    if (config?.autoStart) {
      this.start();
    }

    logger.info('[BehavioralTrustScoring] Initialized', {
      scoringHz: this.config.scoringHz,
      ewmaAlpha: this.config.ewmaAlpha,
      degradeThreshold: this.config.degradeThreshold,
      revokeThreshold: this.config.revokeThreshold,
      recoverThreshold: this.config.recoverThreshold,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the scoring loop.
   *
   * Runs at the configured Hz (default 5Hz), processing queued events
   * and updating agent scores each cycle.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[BehavioralTrustScoring] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.config.scoringHz));
    this.scoringIntervalId = setInterval(() => this.scoringCycle(), intervalMs);
    this.isRunning = true;

    logger.info('[BehavioralTrustScoring] Started', {
      hz: this.config.scoringHz,
      intervalMs,
    });
  }

  /**
   * Stop the scoring loop.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[BehavioralTrustScoring] Already stopped');
      return;
    }

    if (this.scoringIntervalId !== null) {
      clearInterval(this.scoringIntervalId);
      this.scoringIntervalId = null;
    }
    this.isRunning = false;

    logger.info('[BehavioralTrustScoring] Stopped');
  }

  /**
   * Dispose all resources and clear all agent state.
   */
  dispose(): void {
    this.stop();
    this.agentStates.clear();
    this.eventQueue = [];
    logger.info('[BehavioralTrustScoring] Disposed');
  }

  // ===========================================================================
  // EVENT INGESTION (Called off render loop)
  // ===========================================================================

  /**
   * Ingest a behavioral event for scoring.
   *
   * Events are queued and processed in the next scoring cycle.
   * This method is safe to call from any thread/timing loop.
   *
   * Cost: O(1) (queue push)
   *
   * @param event - The behavioral event to process
   */
  ingestEvent(event: BehavioralEvent): void {
    this.eventQueue.push(event);

    // Auto-register agent if not tracked
    if (!this.agentStates.has(event.agentId)) {
      this.registerAgent(event.agentId);
    }
  }

  /**
   * Ingest multiple behavioral events at once.
   *
   * @param events - Array of events to queue
   */
  ingestEvents(events: BehavioralEvent[]): void {
    for (const event of events) {
      this.ingestEvent(event);
    }
  }

  // ===========================================================================
  // AGENT MANAGEMENT
  // ===========================================================================

  /**
   * Register an agent for behavioral tracking.
   * Called automatically on first event, or explicitly for pre-registration.
   *
   * @param agentId - Agent to register
   */
  registerAgent(agentId: string): void {
    if (this.agentStates.has(agentId)) return;

    this.agentStates.set(agentId, createInitialAgentBehavioralState(agentId));

    logger.debug('[BehavioralTrustScoring] Agent registered', { agentId });
  }

  /**
   * Unregister an agent and remove all tracking state.
   *
   * @param agentId - Agent to remove
   */
  unregisterAgent(agentId: string): void {
    this.agentStates.delete(agentId);
    logger.debug('[BehavioralTrustScoring] Agent unregistered', { agentId });
  }

  /**
   * Reset an agent's scores to initial (fully trusted) state.
   * Used when an agent successfully re-joins after revocation.
   *
   * @param agentId - Agent to reset
   */
  resetAgentScore(agentId: string): void {
    const state = this.agentStates.get(agentId);
    if (!state) return;

    state.dimensions = createInitialDimensions();
    state.compositeScore = 1.0;
    state.currentAction = null;
    state.totalViolations = 0;
    state.positionHistory = [];
    state.chatTimestamps = [];
    state.gestureTimestamps = [];
    state.lastPosition = null;
    state.lastVelocity = 0;
    state.lastScoringTimestamp = Date.now();

    logger.info('[BehavioralTrustScoring] Agent score reset', { agentId });
  }

  // ===========================================================================
  // RENDER-LOOP SAFE READS
  // ===========================================================================

  /**
   * Get an agent's composite trust score.
   *
   * Render-loop safe. Returns the pre-computed composite score.
   *
   * Budget: <0.1ms (map lookup, ON render loop)
   *
   * @param agentId - Agent to query
   * @returns Composite score (0 = untrusted, 1 = fully trusted), or -1 if not tracked
   */
  getAgentScore(agentId: string): number {
    const state = this.agentStates.get(agentId);
    return state?.compositeScore ?? -1;
  }

  /**
   * Get an agent's per-dimension scores.
   *
   * Render-loop safe.
   *
   * Budget: <0.1ms (map lookup, ON render loop)
   *
   * @param agentId - Agent to query
   * @returns Dimension scores or null if not tracked
   */
  getAgentDimensionScores(agentId: string): Readonly<Record<TrustDimension, number>> | null {
    const state = this.agentStates.get(agentId);
    if (!state) return null;

    return {
      spatial_compliance: state.dimensions.spatial_compliance.score,
      physics_adherence: state.dimensions.physics_adherence.score,
      interaction_appropriateness: state.dimensions.interaction_appropriateness.score,
      temporal_consistency: state.dimensions.temporal_consistency.score,
    };
  }

  /**
   * Get the full behavioral state for an agent (for debugging/admin).
   *
   * NOT render-loop safe (returns mutable reference for efficiency).
   *
   * @param agentId - Agent to query
   * @returns Full behavioral state or undefined
   */
  getAgentBehavioralState(agentId: string): Readonly<AgentBehavioralState> | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Get all tracked agent IDs.
   */
  getTrackedAgentIds(): string[] {
    return Array.from(this.agentStates.keys());
  }

  /**
   * Check if the scoring loop is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // SCORING CYCLE (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Execute a single scoring cycle.
   *
   * Processes all queued events, updates dimension scores via EWMA,
   * computes composite scores, applies decay, and checks thresholds.
   *
   * Budget: Off render loop, typically <2ms for up to 100 agents.
   */
  private scoringCycle(): void {
    const startTime = this.now();
    const now = Date.now();

    // 1. Drain and process event queue
    const events = this.eventQueue;
    this.eventQueue = [];

    for (const event of events) {
      this.processEvent(event);
    }

    // 2. Apply inactivity decay and recompute composite scores
    for (const [agentId, state] of this.agentStates) {
      // Apply decay for inactive dimensions
      this.applyInactivityDecay(state, now);

      // Recompute composite score
      const oldComposite = state.compositeScore;
      state.compositeScore = this.computeCompositeScore(state);
      state.lastScoringTimestamp = now;

      // Check threshold crossings
      this.checkThresholds(agentId, state, oldComposite);
    }

    // 3. Track cycle duration
    const duration = this.now() - startTime;
    this.cycleDurations.push(duration);
    if (this.cycleDurations.length > this.MAX_CYCLE_HISTORY) {
      this.cycleDurations.shift();
    }
  }

  // ===========================================================================
  // EVENT PROCESSING
  // ===========================================================================

  /**
   * Process a single behavioral event and update the appropriate dimension score.
   */
  private processEvent(event: BehavioralEvent): void {
    const state = this.agentStates.get(event.agentId);
    if (!state) return;

    const dimension = EVENT_DIMENSION_MAP[event.type];
    if (!dimension) return;

    // Compute event score (1.0 = good behavior, 0.0 = severe violation)
    const eventScore = event.severity !== undefined
      ? 1.0 - event.severity
      : this.computeEventScore(event, state);

    const isViolation = eventScore < 0.5;

    // Update dimension score via EWMA
    const dimState = state.dimensions[dimension];
    dimState.score = this.ewma(dimState.score, eventScore, this.config.ewmaAlpha);
    dimState.eventCount++;
    dimState.lastEventTimestamp = event.timestamp;

    if (isViolation) {
      dimState.violationCount++;
      dimState.lastViolationTimestamp = event.timestamp;
      state.totalViolations++;
      this.totalViolationsDetected++;
    }

    // Update violation rate (violations in last 60 seconds)
    const oneMinuteAgo = event.timestamp - 60_000;
    // Simple approximation: use running count and event count
    if (dimState.eventCount > 0) {
      dimState.violationRate = dimState.violationCount / Math.max(1, (event.timestamp - state.registeredAt) / 60_000);
    }

    state.totalEvents++;
    this.totalEventsProcessed++;

    // Update auxiliary tracking data
    this.updateAuxiliaryTracking(event, state);
  }

  /**
   * Compute the event score based on event type and agent state.
   *
   * Returns a value from 0 (severe violation) to 1 (perfect behavior).
   */
  private computeEventScore(event: BehavioralEvent, state: AgentBehavioralState): number {
    switch (event.type) {
      // -- Spatial Compliance --
      case 'position_update':
        return this.scorePositionUpdate(event, state);
      case 'bounds_violation':
        return 0.0; // Always a severe violation
      case 'zone_entry':
        return this.scoreZoneEntry(event);
      case 'zone_exit':
        return 1.0; // Leaving a restricted zone is good
      case 'teleport':
        return this.scoreTeleport(event, state);

      // -- Physics Adherence --
      case 'velocity_report':
        return this.scoreVelocity(event);
      case 'collision_detected':
        return 0.2; // Clipping is a significant violation
      case 'gravity_violation':
        return 0.1; // Floating is a severe violation
      case 'acceleration_spike':
        return this.scoreAcceleration(event);

      // -- Interaction Appropriateness --
      case 'chat_message':
        return this.scoreChatRate(state, event.timestamp);
      case 'gesture_performed':
        return this.scoreGestureRate(state, event.timestamp);
      case 'proximity_warning':
        return this.scoreProximity(event);
      case 'interaction_attempt':
        return 1.0; // Neutral event unless flagged
      case 'harassment_flag':
        return 0.0; // Always severe

      // -- Temporal Consistency --
      case 'heartbeat':
        return this.scoreHeartbeat(state, event.timestamp);
      case 'state_update':
        return this.scoreStateUpdate(state, event.timestamp);
      case 'heartbeat_missed':
        return 0.2; // Significant temporal violation
      case 'impossible_movement':
        return 0.0; // Speed hacking is severe
      case 'timestamp_anomaly':
        return 0.1; // Timestamp manipulation is severe

      default:
        return 0.5; // Unknown events are neutral
    }
  }

  // ===========================================================================
  // SPATIAL COMPLIANCE SCORERS
  // ===========================================================================

  /**
   * Score a position update for spatial compliance.
   * Checks: within world bounds, reasonable distance from last position.
   */
  private scorePositionUpdate(event: BehavioralEvent, state: AgentBehavioralState): number {
    const position = event.data['position'] as Vec3 | undefined;
    if (!position) return 0.5;

    let score = 1.0;

    // Check world bounds
    if (this.config.worldBounds) {
      const { min, max } = this.config.worldBounds;
      if (
        position.x < min.x || position.x > max.x ||
        position.y < min.y || position.y > max.y ||
        position.z < min.z || position.z > max.z
      ) {
        score *= 0.1; // Out of bounds penalty
      }
    }

    // Check distance from last known position
    if (state.lastPosition) {
      const distance = this.distance(position, state.lastPosition);
      const timeDeltaSec = (event.timestamp - (state.positionHistory.at(-1)?.timestamp ?? event.timestamp)) / 1000;

      if (timeDeltaSec > 0.01) {
        const impliedVelocity = distance / timeDeltaSec;
        // Penalize if implied velocity exceeds max
        if (impliedVelocity > this.config.maxVelocity * 2) {
          // Likely speed hack or teleport without permission
          score *= Math.max(0, 1.0 - (impliedVelocity - this.config.maxVelocity * 2) / (this.config.maxVelocity * 4));
        }
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score a zone entry event.
   */
  private scoreZoneEntry(event: BehavioralEvent): number {
    const restricted = event.data['restricted'] as boolean | undefined;
    if (restricted) return 0.1; // Entering restricted zone is a severe violation
    return 1.0; // Normal zone entry
  }

  /**
   * Score a teleportation event.
   */
  private scoreTeleport(event: BehavioralEvent, state: AgentBehavioralState): number {
    const distance = event.data['distance'] as number | undefined;
    const authorized = event.data['authorized'] as boolean | undefined;

    if (authorized) return 1.0; // Authorized teleport is fine

    if (distance !== undefined) {
      if (distance > this.config.maxTeleportDistance) {
        return 0.1; // Exceeds max teleport distance
      }
      // Proportional penalty for long teleports
      return Math.max(0.3, 1.0 - distance / this.config.maxTeleportDistance);
    }

    // Check against last position if no distance provided
    if (state.lastPosition) {
      const target = event.data['position'] as Vec3 | undefined;
      if (target) {
        const dist = this.distance(target, state.lastPosition);
        if (dist > this.config.maxTeleportDistance) {
          return 0.1;
        }
        return Math.max(0.3, 1.0 - dist / this.config.maxTeleportDistance);
      }
    }

    return 0.5; // Unknown teleport details, neutral score
  }

  // ===========================================================================
  // PHYSICS ADHERENCE SCORERS
  // ===========================================================================

  /**
   * Score a velocity report.
   */
  private scoreVelocity(event: BehavioralEvent): number {
    const velocity = event.data['velocity'] as number | undefined;
    if (velocity === undefined) return 0.5;

    if (velocity <= this.config.maxVelocity) return 1.0;

    // Proportional penalty for exceeding max velocity
    const excess = velocity - this.config.maxVelocity;
    const penalty = Math.min(1, excess / this.config.maxVelocity);
    return Math.max(0, 1.0 - penalty);
  }

  /**
   * Score an acceleration report.
   */
  private scoreAcceleration(event: BehavioralEvent): number {
    const acceleration = event.data['acceleration'] as number | undefined;
    if (acceleration === undefined) return 0.5;

    if (acceleration <= this.config.maxAcceleration) return 1.0;

    const excess = acceleration - this.config.maxAcceleration;
    const penalty = Math.min(1, excess / this.config.maxAcceleration);
    return Math.max(0, 1.0 - penalty);
  }

  // ===========================================================================
  // INTERACTION APPROPRIATENESS SCORERS
  // ===========================================================================

  /**
   * Score chat rate compliance.
   * Uses sliding window to count messages in the last minute.
   */
  private scoreChatRate(state: AgentBehavioralState, timestamp: number): number {
    const oneMinuteAgo = timestamp - 60_000;
    const recentMessages = state.chatTimestamps.filter(t => t > oneMinuteAgo).length;

    if (recentMessages < this.config.maxChatPerMinute) return 1.0;

    // Proportional penalty for exceeding rate
    const excess = recentMessages - this.config.maxChatPerMinute;
    const penalty = Math.min(1, excess / this.config.maxChatPerMinute);
    return Math.max(0, 1.0 - penalty);
  }

  /**
   * Score gesture rate compliance.
   */
  private scoreGestureRate(state: AgentBehavioralState, timestamp: number): number {
    const oneMinuteAgo = timestamp - 60_000;
    const recentGestures = state.gestureTimestamps.filter(t => t > oneMinuteAgo).length;

    if (recentGestures < this.config.maxGesturesPerMinute) return 1.0;

    const excess = recentGestures - this.config.maxGesturesPerMinute;
    const penalty = Math.min(1, excess / this.config.maxGesturesPerMinute);
    return Math.max(0, 1.0 - penalty);
  }

  /**
   * Score a proximity warning.
   */
  private scoreProximity(event: BehavioralEvent): number {
    const distance = event.data['distance'] as number | undefined;
    if (distance === undefined) return 0.3; // Proximity warning with no distance = moderate violation

    if (distance >= this.config.personalSpaceRadius) return 1.0;

    // Proportional penalty for how close they are
    const invasionRatio = 1.0 - (distance / this.config.personalSpaceRadius);
    return Math.max(0, 1.0 - invasionRatio);
  }

  // ===========================================================================
  // TEMPORAL CONSISTENCY SCORERS
  // ===========================================================================

  /**
   * Score a heartbeat for temporal consistency.
   * Checks if heartbeat arrived within expected interval.
   */
  private scoreHeartbeat(state: AgentBehavioralState, timestamp: number): number {
    const lastHeartbeat = state.dimensions.temporal_consistency.lastEventTimestamp;
    if (lastHeartbeat === 0) return 1.0; // First heartbeat, no baseline

    const interval = timestamp - lastHeartbeat;
    if (interval <= this.config.expectedHeartbeatMs * 1.5) return 1.0; // Within tolerance

    if (interval > this.config.maxHeartbeatIntervalMs) {
      // Significantly overdue
      return 0.2;
    }

    // Proportional penalty between expected and max
    const range = this.config.maxHeartbeatIntervalMs - this.config.expectedHeartbeatMs;
    const excess = interval - this.config.expectedHeartbeatMs;
    return Math.max(0.2, 1.0 - excess / range);
  }

  /**
   * Score a state update for temporal consistency.
   */
  private scoreStateUpdate(state: AgentBehavioralState, timestamp: number): number {
    const lastUpdate = state.dimensions.temporal_consistency.lastEventTimestamp;
    if (lastUpdate === 0) return 1.0;

    const gap = timestamp - lastUpdate;
    if (gap <= this.config.maxStateUpdateGapMs) return 1.0;

    // Penalty for large gaps
    const excess = gap - this.config.maxStateUpdateGapMs;
    const penalty = Math.min(1, excess / this.config.maxStateUpdateGapMs);
    return Math.max(0.1, 1.0 - penalty);
  }

  // ===========================================================================
  // AUXILIARY TRACKING
  // ===========================================================================

  /**
   * Update position history, chat timestamps, etc. from events.
   */
  private updateAuxiliaryTracking(event: BehavioralEvent, state: AgentBehavioralState): void {
    switch (event.type) {
      case 'position_update':
      case 'teleport': {
        const position = event.data['position'] as Vec3 | undefined;
        if (position) {
          state.positionHistory.push({ position, timestamp: event.timestamp });
          if (state.positionHistory.length > this.config.maxPositionHistory) {
            state.positionHistory.shift();
          }
          // Update velocity
          if (state.lastPosition) {
            const timeDelta = (event.timestamp - (state.positionHistory.at(-2)?.timestamp ?? event.timestamp)) / 1000;
            if (timeDelta > 0.001) {
              state.lastVelocity = this.distance(position, state.lastPosition) / timeDelta;
            }
          }
          state.lastPosition = { ...position };
        }
        break;
      }
      case 'chat_message':
        state.chatTimestamps.push(event.timestamp);
        if (state.chatTimestamps.length > this.config.maxRateLimitHistory) {
          state.chatTimestamps.shift();
        }
        break;
      case 'gesture_performed':
        state.gestureTimestamps.push(event.timestamp);
        if (state.gestureTimestamps.length > this.config.maxRateLimitHistory) {
          state.gestureTimestamps.shift();
        }
        break;
    }
  }

  // ===========================================================================
  // SCORE COMPUTATION
  // ===========================================================================

  /**
   * Exponentially Weighted Moving Average.
   *
   * new_score = alpha * new_value + (1 - alpha) * old_score
   *
   * Higher alpha = more reactive to new events (noisier).
   * Lower alpha = smoother, slower to respond.
   */
  private ewma(currentScore: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * currentScore;
  }

  /**
   * Compute the weighted composite score from all dimensions.
   */
  private computeCompositeScore(state: AgentBehavioralState): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const dimension of Object.keys(state.dimensions) as TrustDimension[]) {
      const weight = this.config.dimensionWeights[dimension];
      const score = state.dimensions[dimension].score;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Apply inactivity decay to dimension scores.
   *
   * If an agent has not generated events for a dimension beyond the grace period,
   * the score decays toward a baseline (not zero, to avoid false revocations
   * for naturally quiet agents).
   */
  private applyInactivityDecay(state: AgentBehavioralState, now: number): void {
    const gracePeriodMs = this.config.inactivityGracePeriodSec * 1000;

    for (const dimension of Object.keys(state.dimensions) as TrustDimension[]) {
      const dimState = state.dimensions[dimension];
      const timeSinceLastEvent = now - dimState.lastEventTimestamp;

      if (dimState.lastEventTimestamp > 0 && timeSinceLastEvent > gracePeriodMs) {
        const decaySeconds = (timeSinceLastEvent - gracePeriodMs) / 1000;
        const decayAmount = this.config.inactivityDecayRate * decaySeconds;
        // Decay toward 0.5 (neutral baseline), not toward 0
        const baseline = 0.5;
        if (dimState.score > baseline) {
          dimState.score = Math.max(baseline, dimState.score - decayAmount);
        }
      }
    }
  }

  // ===========================================================================
  // THRESHOLD CHECKING
  // ===========================================================================

  /**
   * Check if an agent's composite score has crossed any threshold
   * and trigger the appropriate trust action.
   */
  private checkThresholds(agentId: string, state: AgentBehavioralState, oldComposite: number): void {
    const newComposite = state.compositeScore;

    // Notify on significant score change (>5%)
    if (Math.abs(newComposite - oldComposite) > 0.05) {
      this.config.onScoreChanged(agentId, oldComposite, newComposite);
    }

    // Determine action based on thresholds
    let action: TrustAction | null = null;

    if (newComposite < this.config.revokeThreshold) {
      if (state.currentAction !== 'revoke') {
        action = 'revoke';
      }
    } else if (newComposite < this.config.degradeThreshold) {
      if (state.currentAction !== 'degrade' && state.currentAction !== 'revoke') {
        action = 'degrade';
      }
    } else if (newComposite >= this.config.recoverThreshold) {
      if (state.currentAction === 'degrade') {
        action = 'recover';
      }
    }

    if (action) {
      state.currentAction = action === 'recover' ? null : action;
      this.totalActionsTriggered++;

      // Find primary cause (lowest dimension score)
      let primaryCause: TrustDimension = 'spatial_compliance';
      let lowestScore = Infinity;
      for (const dim of Object.keys(state.dimensions) as TrustDimension[]) {
        if (state.dimensions[dim].score < lowestScore) {
          lowestScore = state.dimensions[dim].score;
          primaryCause = dim;
        }
      }

      // Build recent violations summary
      const recentViolations: string[] = [];
      for (const dim of Object.keys(state.dimensions) as TrustDimension[]) {
        const d = state.dimensions[dim];
        if (d.violationCount > 0) {
          recentViolations.push(`${dim}: ${d.violationCount} violations (score: ${d.score.toFixed(2)})`);
        }
      }

      const details: TrustActionDetails = {
        action,
        compositeScore: newComposite,
        dimensionScores: {
          spatial_compliance: state.dimensions.spatial_compliance.score,
          physics_adherence: state.dimensions.physics_adherence.score,
          interaction_appropriateness: state.dimensions.interaction_appropriateness.score,
          temporal_consistency: state.dimensions.temporal_consistency.score,
        },
        primaryCause,
        recentViolations,
        timestamp: Date.now(),
      };

      this.config.onTrustAction(agentId, action, newComposite, details);

      logger.info('[BehavioralTrustScoring] Trust action triggered', {
        agentId,
        action,
        compositeScore: newComposite.toFixed(3),
        primaryCause,
      });
    }
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive scoring metrics.
   */
  getMetrics(): BehavioralTrustScoringMetrics {
    let averageCycleDuration = 0;
    if (this.cycleDurations.length > 0) {
      averageCycleDuration = this.cycleDurations.reduce((a, b) => a + b, 0) / this.cycleDurations.length;
    }

    // Compute average composite score
    let totalComposite = 0;
    let agentCount = 0;
    for (const state of this.agentStates.values()) {
      totalComposite += state.compositeScore;
      agentCount++;
    }

    return {
      isRunning: this.isRunning,
      scoringHz: this.config.scoringHz,
      trackedAgentCount: this.agentStates.size,
      totalEventsProcessed: this.totalEventsProcessed,
      totalViolationsDetected: this.totalViolationsDetected,
      totalActionsTriggered: this.totalActionsTriggered,
      averageCompositeScore: agentCount > 0 ? totalComposite / agentCount : 0,
      pendingEventCount: this.eventQueue.length,
      averageCycleDurationMs: Math.round(averageCycleDuration * 1000) / 1000,
      dimensionWeights: { ...this.config.dimensionWeights },
      thresholds: {
        degrade: this.config.degradeThreshold,
        revoke: this.config.revokeThreshold,
        recover: this.config.recoverThreshold,
      },
    };
  }

  // ===========================================================================
  // INTERNAL UTILITIES
  // ===========================================================================

  /**
   * Euclidean distance between two Vec3 points.
   */
  private distance(a: Vec3, b: Vec3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * High-resolution timestamp.
   */
  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a BehavioralTrustScoring instance with the given configuration.
 */
export function createBehavioralTrustScoring(
  config?: BehavioralTrustScoringConfig,
): BehavioralTrustScoring {
  return new BehavioralTrustScoring(config);
}
