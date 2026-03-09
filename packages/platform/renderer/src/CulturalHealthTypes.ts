/**
 * CulturalHealthTypes
 *
 * Type definitions for the real-time agent cultural health monitoring system.
 * Tracks population-level cultural dynamics across five dimensions:
 *
 *   1. Norm Adoption Rates    - How quickly agents adopt new behavioral norms
 *   2. Cooperation Indices    - Population-level cooperation vs defection ratios
 *   3. Cultural Drift Vectors - Directional shift in cultural norms over time
 *   4. Boundary Permeability  - How easily norms cross group boundaries
 *   5. Metanorm Emergence     - Emergence of norms-about-norms (enforcement norms)
 *
 * DESIGN PRINCIPLES (matching BehavioralTrustScoring & AgentStateBuffer):
 * - All computation runs OFF the VR render loop at configurable Hz (default 2Hz)
 * - Double-buffered state: back buffer written by monitor, front buffer read by renderer/WS
 * - Render-loop safe reads: all getters are O(1) map lookups, <0.1ms
 * - WebSocket exposure: snapshot state broadcast to connected dashboard clients
 * - EWMA smoothing on all time-series metrics for noise reduction
 * - Factory functions for all public constructors
 *
 * PERFORMANCE CONTRACT:
 * - Monitor cycle budget: <5ms for up to 500 agents (off render loop)
 * - Front buffer read: <0.1ms (on render loop)
 * - WebSocket broadcast: <1ms serialization (off render loop)
 * - Memory: ~2KB per tracked agent, ~50KB base overhead
 *
 * DATA FLOW:
 * ```
 *   AgentCommunicationManager / BehavioralTrustScoring
 *        |
 *        v
 *   CulturalHealthMonitor.ingestEvent()      <-- OFF render loop
 *        |
 *        v
 *   eventQueue.push(event)                   <-- Batched until next monitor cycle
 *        |
 *        v
 *   monitorCycle() [every 500ms at 2Hz]      <-- OFF render loop
 *        |-- Update norm adoption rates
 *        |-- Compute cooperation indices
 *        |-- Calculate cultural drift vectors
 *        |-- Measure boundary permeability
 *        |-- Detect metanorm emergence
 *        |-- Swap double buffer
 *        |-- Notify WebSocket subscribers
 *        |
 *        v
 *   getFrontBuffer()                         <-- ON render loop (<0.1ms)
 *        |
 *        v
 *   Renderer / WebSocket Dashboard
 * ```
 *
 * @module CulturalHealthTypes
 */

// =============================================================================
// CULTURAL EVENT TYPES
// =============================================================================

/**
 * Types of cultural events that feed into the monitoring system.
 */
export type CulturalEventType =
  // Norm-related events
  | 'norm_adopted'           // Agent adopted a new behavioral norm
  | 'norm_violated'          // Agent violated an established norm
  | 'norm_enforced'          // Agent enforced a norm on another agent
  | 'norm_proposed'          // Agent proposed a new norm to others
  | 'norm_abandoned'         // Agent abandoned a previously held norm
  // Cooperation events
  | 'cooperation_offered'    // Agent offered cooperation to another
  | 'cooperation_accepted'   // Agent accepted a cooperation offer
  | 'cooperation_rejected'   // Agent rejected a cooperation offer
  | 'defection_detected'     // Agent defected from a cooperative arrangement
  | 'reciprocity_observed'   // Reciprocal cooperation pattern detected
  // Group/boundary events
  | 'group_joined'           // Agent joined a cultural group
  | 'group_left'             // Agent left a cultural group
  | 'cross_group_interaction' // Agent interacted across group boundaries
  | 'norm_transferred'       // A norm was transferred between groups
  | 'boundary_negotiation'   // Groups negotiated boundary terms
  // Metanorm events
  | 'enforcement_rewarded'   // Agent was rewarded for enforcing a norm
  | 'enforcement_punished'   // Agent was punished for not enforcing
  | 'enforcement_pattern'    // Systematic enforcement pattern detected
  | 'meta_norm_crystallized' // A metanorm has stabilized into convention
  | 'meta_norm_decayed';     // A previously stable metanorm lost adherence

/**
 * A cultural event to be processed by the monitor.
 */
export interface CulturalEvent {
  /** Event type */
  type: CulturalEventType;
  /** Agent that generated this event */
  agentId: string;
  /** When the event occurred (ms since epoch) */
  timestamp: number;
  /** Optional: target agent for inter-agent events */
  targetAgentId?: string;
  /** Optional: norm identifier this event relates to */
  normId?: string;
  /** Optional: group identifier for group-related events */
  groupId?: string;
  /** Optional: source group for cross-group events */
  sourceGroupId?: string;
  /** Optional: target group for cross-group events */
  targetGroupId?: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

// =============================================================================
// NORM TYPES
// =============================================================================

/**
 * Lifecycle state of a norm in the population.
 */
export type NormLifecycleState =
  | 'proposed'     // Recently proposed, not yet widely adopted
  | 'emerging'     // Gaining traction, 10-40% adoption
  | 'establishing' // Becoming standard, 40-70% adoption
  | 'established'  // Widely adopted, 70-90% adoption
  | 'entrenched'   // Near-universal, >90% adoption
  | 'declining'    // Losing adherents
  | 'abandoned';   // No longer followed

/**
 * A behavioral norm tracked by the system.
 */
export interface TrackedNorm {
  /** Unique norm identifier */
  normId: string;
  /** Human-readable norm description */
  description: string;
  /** When the norm was first observed */
  firstObservedTimestamp: number;
  /** Current lifecycle state */
  lifecycleState: NormLifecycleState;
  /** Number of agents currently adhering to this norm */
  adherentCount: number;
  /** Total population size at last measurement */
  populationSize: number;
  /** Adoption rate: adherentCount / populationSize (0-1) */
  adoptionRate: number;
  /** EWMA-smoothed adoption rate */
  smoothedAdoptionRate: number;
  /** Rate of change of adoption (derivative, per second) */
  adoptionVelocity: number;
  /** Number of enforcement events for this norm */
  enforcementCount: number;
  /** Number of violation events for this norm */
  violationCount: number;
  /** Enforcement ratio: enforcementCount / (enforcementCount + violationCount) */
  enforcementRatio: number;
  /** Recent adoption rate samples for sparkline display */
  adoptionTrend: TimeSample[];
  /** Timestamp of last adoption event */
  lastAdoptionTimestamp: number;
  /** Timestamp of last violation event */
  lastViolationTimestamp: number;
}

// =============================================================================
// COOPERATION TYPES
// =============================================================================

/**
 * Cooperation health classification for a population or group.
 */
export type CooperationHealth =
  | 'thriving'     // Strong cooperation, low defection
  | 'stable'       // Balanced cooperation
  | 'strained'     // Rising defection, declining cooperation
  | 'fractured';   // Widespread defection, cooperation breakdown

/**
 * Cooperation index for a population or subgroup.
 */
export interface CooperationIndex {
  /** Total cooperation offers in measurement window */
  cooperationOffers: number;
  /** Total cooperation acceptances */
  cooperationAcceptances: number;
  /** Total defections */
  defections: number;
  /** Cooperation ratio: acceptances / (acceptances + defections) */
  cooperationRatio: number;
  /** EWMA-smoothed cooperation ratio */
  smoothedCooperationRatio: number;
  /** Reciprocity index: fraction of cooperation that is reciprocated (0-1) */
  reciprocityIndex: number;
  /** Health classification derived from ratio and trend */
  health: CooperationHealth;
  /** Recent cooperation ratio samples */
  cooperationTrend: TimeSample[];
  /** Average cooperation response time in ms */
  averageResponseTimeMs: number;
  /** Number of unique cooperating pairs */
  uniqueCooperatingPairs: number;
}

// =============================================================================
// CULTURAL DRIFT TYPES
// =============================================================================

/**
 * A dimensional axis along which cultural drift is measured.
 * Each axis represents a spectrum of cultural values.
 */
export type CulturalDimension =
  | 'individualism_collectivism'   // Individual autonomy vs group cohesion
  | 'risk_tolerance'               // Risk-seeking vs risk-averse behavior
  | 'hierarchy_egalitarianism'     // Hierarchical authority vs flat structure
  | 'competition_cooperation'      // Competitive vs cooperative orientation
  | 'innovation_tradition';        // Novel approaches vs established practices

/**
 * A vector representing the direction and magnitude of cultural drift.
 */
export interface CulturalDriftVector {
  /** The cultural dimension being measured */
  dimension: CulturalDimension;
  /** Current position on the dimension spectrum (-1 to +1) */
  currentPosition: number;
  /** Position at the start of the measurement window */
  previousPosition: number;
  /** Rate of change per second (derivative) */
  driftRate: number;
  /** EWMA-smoothed drift rate */
  smoothedDriftRate: number;
  /** Magnitude of drift (absolute value of driftRate) */
  magnitude: number;
  /** Direction: -1 (toward first pole) or +1 (toward second pole) */
  direction: number;
  /** Stability: 1.0 = no drift, 0.0 = maximum drift */
  stability: number;
  /** Recent position samples */
  positionTrend: TimeSample[];
}

/**
 * Aggregate cultural drift state across all dimensions.
 */
export interface CulturalDriftState {
  /** Per-dimension drift vectors */
  dimensions: Record<CulturalDimension, CulturalDriftVector>;
  /** Overall cultural stability (average stability across dimensions, 0-1) */
  overallStability: number;
  /** Total drift magnitude (Euclidean norm of all drift vectors) */
  totalDriftMagnitude: number;
  /** Dominant drift dimension (highest magnitude) */
  dominantDimension: CulturalDimension;
  /** Whether the culture is in a rapid transition phase */
  isTransitioning: boolean;
  /** Transition threshold: magnitude above which isTransitioning = true */
  transitionThreshold: number;
}

// =============================================================================
// BOUNDARY PERMEABILITY TYPES
// =============================================================================

/**
 * Classification of boundary permeability between groups.
 */
export type PermeabilityLevel =
  | 'open'          // Norms flow freely between groups
  | 'permeable'     // Some norm transfer, with friction
  | 'semi_permeable' // Limited norm transfer, high filtering
  | 'closed';       // No norm transfer between groups

/**
 * Boundary permeability metrics between two cultural groups.
 */
export interface GroupBoundary {
  /** Source group ID */
  sourceGroupId: string;
  /** Target group ID */
  targetGroupId: string;
  /** Number of cross-group interactions in window */
  interactionCount: number;
  /** Number of successful norm transfers */
  normTransferCount: number;
  /** Number of attempted but failed norm transfers */
  failedTransferCount: number;
  /** Transfer success rate: normTransferCount / (normTransferCount + failedTransferCount) */
  transferSuccessRate: number;
  /** EWMA-smoothed transfer success rate */
  smoothedTransferRate: number;
  /** Permeability classification */
  permeability: PermeabilityLevel;
  /** Bidirectional flag: true if norms flow both ways equally */
  isBidirectional: boolean;
  /** Asymmetry ratio: 0 = perfectly symmetric, 1 = completely one-way */
  asymmetryRatio: number;
  /** Recent transfer rate samples */
  transferTrend: TimeSample[];
}

/**
 * Aggregate boundary permeability state across the population.
 */
export interface BoundaryPermeabilityState {
  /** All tracked group boundaries */
  boundaries: GroupBoundary[];
  /** Number of distinct cultural groups detected */
  groupCount: number;
  /** Average permeability across all boundaries (0-1) */
  averagePermeability: number;
  /** Most permeable boundary (highest transfer rate) */
  mostPermeableBoundary: GroupBoundary | null;
  /** Least permeable boundary (lowest transfer rate) */
  leastPermeableBoundary: GroupBoundary | null;
  /** Network connectivity: fraction of possible group pairs that interact */
  networkConnectivity: number;
  /** Overall permeability level */
  overallPermeability: PermeabilityLevel;
}

// =============================================================================
// METANORM TYPES
// =============================================================================

/**
 * Maturity state of a metanorm (norm about enforcing norms).
 */
export type MetanormMaturity =
  | 'nascent'        // Just starting to appear
  | 'developing'     // Growing enforcement patterns
  | 'crystallized'   // Stable, widely recognized enforcement norm
  | 'institutional'  // Deeply embedded, automatic enforcement
  | 'decaying';      // Losing enforcement adherence

/**
 * A detected metanorm: a norm about enforcing other norms.
 */
export interface DetectedMetanorm {
  /** Unique metanorm identifier */
  metanormId: string;
  /** The base norm this metanorm enforces */
  baseNormId: string;
  /** Human-readable description of the enforcement pattern */
  description: string;
  /** When first detected */
  firstDetectedTimestamp: number;
  /** Current maturity state */
  maturity: MetanormMaturity;
  /** Number of agents actively enforcing this metanorm */
  enforcerCount: number;
  /** Total agents who could enforce (aware of the norm) */
  potentialEnforcerCount: number;
  /** Enforcement participation rate: enforcerCount / potentialEnforcerCount */
  participationRate: number;
  /** EWMA-smoothed participation rate */
  smoothedParticipationRate: number;
  /** Number of times enforcement was rewarded */
  rewardCount: number;
  /** Number of times non-enforcement was punished */
  punishmentCount: number;
  /** Reinforcement strength: (rewards + punishments) per unit time */
  reinforcementStrength: number;
  /** Stability score (0-1): how stable the metanorm is over time */
  stabilityScore: number;
  /** Recent participation rate samples */
  participationTrend: TimeSample[];
}

/**
 * Aggregate metanorm emergence state.
 */
export interface MetanormEmergenceState {
  /** All detected metanorms */
  metanorms: DetectedMetanorm[];
  /** Number of active metanorms (crystallized or institutional) */
  activeMetanormCount: number;
  /** Number of nascent/developing metanorms */
  emergingMetanormCount: number;
  /** Number of decaying metanorms */
  decayingMetanormCount: number;
  /** Overall metanorm density: active metanorms per base norm */
  metanormDensity: number;
  /** Average stability across all active metanorms */
  averageStability: number;
  /** Whether the population shows strong metanorm tendencies */
  hasStrongMetanorms: boolean;
}

// =============================================================================
// AGGREGATE STATE (DOUBLE-BUFFERED)
// =============================================================================

/**
 * Complete cultural health state of the agent population.
 * This is the state that gets double-buffered and exposed via WebSocket.
 */
export interface CulturalHealthState {
  // -- Norm Adoption --
  /** All tracked norms and their adoption rates */
  norms: Map<string, TrackedNorm>;
  /** Population-wide average adoption rate across all norms */
  averageAdoptionRate: number;
  /** Number of norms in each lifecycle state */
  normLifecycleCounts: Record<NormLifecycleState, number>;

  // -- Cooperation --
  /** Population-level cooperation index */
  populationCooperation: CooperationIndex;
  /** Per-group cooperation indices */
  groupCooperation: Map<string, CooperationIndex>;

  // -- Cultural Drift --
  /** Cultural drift state across all dimensions */
  culturalDrift: CulturalDriftState;

  // -- Boundary Permeability --
  /** Boundary permeability state */
  boundaryPermeability: BoundaryPermeabilityState;

  // -- Metanorm Emergence --
  /** Metanorm emergence state */
  metanormEmergence: MetanormEmergenceState;

  // -- Global Metrics --
  /** Total agent population size */
  populationSize: number;
  /** Number of distinct cultural groups */
  groupCount: number;
  /** Overall cultural health score (composite, 0-1) */
  overallHealthScore: number;
  /** Sequence number, incremented on each buffer swap */
  sequence: number;
  /** Timestamp of last monitor cycle */
  lastUpdateTimestamp: number;
  /** Whether the monitor is actively running */
  isLive: boolean;
}

// =============================================================================
// TIME SERIES
// =============================================================================

/**
 * A single time-series sample for trend display.
 */
export interface TimeSample {
  /** Epoch milliseconds */
  timestamp: number;
  /** Metric value at this point */
  value: number;
}

// =============================================================================
// WEBSOCKET MESSAGE TYPES
// =============================================================================

/**
 * WebSocket message types for dashboard communication.
 */
export type CulturalHealthMessageType =
  | 'snapshot'             // Full state snapshot
  | 'delta'               // Incremental state update
  | 'norm_update'         // Single norm updated
  | 'cooperation_update'  // Cooperation index updated
  | 'drift_update'        // Cultural drift updated
  | 'boundary_update'     // Boundary permeability updated
  | 'metanorm_update'     // Metanorm emergence updated
  | 'alert'               // Cultural health alert
  | 'subscribe'           // Client subscription request
  | 'unsubscribe'         // Client unsubscription request
  | 'ping'                // Keep-alive ping
  | 'pong';               // Keep-alive pong

/**
 * WebSocket message envelope for cultural health data.
 */
export interface CulturalHealthMessage {
  /** Message type */
  type: CulturalHealthMessageType;
  /** Sequence number for ordering */
  sequence: number;
  /** Timestamp when message was created */
  timestamp: number;
  /** Message payload (type-dependent) */
  payload: unknown;
}

/**
 * Serializable snapshot of CulturalHealthState for WebSocket transmission.
 * Maps are converted to plain objects for JSON serialization.
 */
export interface CulturalHealthSnapshot {
  // -- Norm Adoption --
  norms: Record<string, TrackedNorm>;
  averageAdoptionRate: number;
  normLifecycleCounts: Record<NormLifecycleState, number>;

  // -- Cooperation --
  populationCooperation: CooperationIndex;
  groupCooperation: Record<string, CooperationIndex>;

  // -- Cultural Drift --
  culturalDrift: CulturalDriftState;

  // -- Boundary Permeability --
  boundaryPermeability: BoundaryPermeabilityState;

  // -- Metanorm Emergence --
  metanormEmergence: MetanormEmergenceState;

  // -- Global Metrics --
  populationSize: number;
  groupCount: number;
  overallHealthScore: number;
  sequence: number;
  lastUpdateTimestamp: number;
  isLive: boolean;
}

/**
 * Cultural health alert levels.
 */
export type CulturalAlertSeverity = 'info' | 'warning' | 'critical';

/**
 * A cultural health alert pushed to dashboard clients.
 */
export interface CulturalHealthAlert {
  /** Unique alert ID */
  id: string;
  /** Alert severity */
  severity: CulturalAlertSeverity;
  /** Which subsystem triggered the alert */
  subsystem: 'norm_adoption' | 'cooperation' | 'drift' | 'boundary' | 'metanorm' | 'general';
  /** Human-readable alert message */
  message: string;
  /** Alert timestamp */
  timestamp: number;
  /** Related entity IDs (norm, group, metanorm) */
  relatedIds: string[];
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the CulturalHealthMonitor.
 */
export interface CulturalHealthMonitorConfig {
  /** Monitor cycle frequency in Hz (default: 2) */
  monitorHz?: number;
  /** EWMA smoothing factor for all metrics (0-1, default: 0.2) */
  ewmaAlpha?: number;
  /** Maximum time-series samples retained per metric (default: 120) */
  maxTrendSamples?: number;
  /** Whether to auto-start the monitor loop (default: false) */
  autoStart?: boolean;
  /** Staleness threshold in ms (default: 5000) */
  stalenessThresholdMs?: number;

  // -- Norm Adoption thresholds --
  /** Adoption rate threshold to transition from proposed to emerging (default: 0.10) */
  emergingThreshold?: number;
  /** Adoption rate threshold to transition to establishing (default: 0.40) */
  establishingThreshold?: number;
  /** Adoption rate threshold to transition to established (default: 0.70) */
  establishedThreshold?: number;
  /** Adoption rate threshold to transition to entrenched (default: 0.90) */
  entrenchedThreshold?: number;
  /** Adoption velocity below which a norm is considered declining (default: -0.001) */
  decliningVelocityThreshold?: number;

  // -- Cooperation thresholds --
  /** Cooperation ratio above which health is 'thriving' (default: 0.80) */
  thrivingThreshold?: number;
  /** Cooperation ratio above which health is 'stable' (default: 0.55) */
  stableThreshold?: number;
  /** Cooperation ratio above which health is 'strained' (default: 0.30) */
  strainedThreshold?: number;

  // -- Cultural Drift thresholds --
  /** Drift magnitude threshold for cultural transition (default: 0.05) */
  transitionThreshold?: number;

  // -- Boundary Permeability thresholds --
  /** Transfer success rate above which boundary is 'open' (default: 0.75) */
  openBoundaryThreshold?: number;
  /** Transfer success rate above which boundary is 'permeable' (default: 0.45) */
  permeableBoundaryThreshold?: number;
  /** Transfer success rate above which boundary is 'semi_permeable' (default: 0.15) */
  semiPermeableBoundaryThreshold?: number;

  // -- Metanorm thresholds --
  /** Participation rate above which metanorm is 'crystallized' (default: 0.60) */
  crystallizedThreshold?: number;
  /** Participation rate above which metanorm is 'institutional' (default: 0.85) */
  institutionalThreshold?: number;
  /** Stability score below which metanorm is 'decaying' (default: 0.30) */
  decayingStabilityThreshold?: number;
  /** Whether population has strong metanorms when active count >= this (default: 3) */
  strongMetanormMinCount?: number;

  // -- Callbacks --
  /** Callback when cultural health alert is generated */
  onAlert?: (alert: CulturalHealthAlert) => void;
  /** Callback when overall health score changes significantly (>5%) */
  onHealthChanged?: (oldScore: number, newScore: number) => void;
  /** Callback on each monitor cycle completion (for WebSocket broadcasting) */
  onCycleComplete?: (snapshot: CulturalHealthSnapshot) => void;
}

/**
 * Metrics for the cultural health monitoring system.
 */
export interface CulturalHealthMonitorMetrics {
  /** Whether the monitor is running */
  isRunning: boolean;
  /** Monitor cycle frequency */
  monitorHz: number;
  /** Total events processed */
  totalEventsProcessed: number;
  /** Events pending processing */
  pendingEventCount: number;
  /** Number of tracked norms */
  trackedNormCount: number;
  /** Number of tracked groups */
  trackedGroupCount: number;
  /** Number of detected metanorms */
  detectedMetanormCount: number;
  /** Average monitor cycle duration in ms */
  averageCycleDurationMs: number;
  /** Current population size */
  populationSize: number;
  /** Overall cultural health score */
  overallHealthScore: number;
  /** Total alerts generated */
  totalAlertsGenerated: number;
  /** Total buffer swaps */
  totalSwaps: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

/**
 * Default configuration values.
 */
export const DEFAULT_CULTURAL_HEALTH_CONFIG = {
  monitorHz: 2,
  ewmaAlpha: 0.2,
  maxTrendSamples: 120,
  stalenessThresholdMs: 5000,
  emergingThreshold: 0.10,
  establishingThreshold: 0.40,
  establishedThreshold: 0.70,
  entrenchedThreshold: 0.90,
  decliningVelocityThreshold: -0.001,
  thrivingThreshold: 0.80,
  stableThreshold: 0.55,
  strainedThreshold: 0.30,
  transitionThreshold: 0.05,
  openBoundaryThreshold: 0.75,
  permeableBoundaryThreshold: 0.45,
  semiPermeableBoundaryThreshold: 0.15,
  crystallizedThreshold: 0.60,
  institutionalThreshold: 0.85,
  decayingStabilityThreshold: 0.30,
  strongMetanormMinCount: 3,
} as const;

// =============================================================================
// FACTORY HELPERS
// =============================================================================

/**
 * Create an empty TrackedNorm.
 */
export function createEmptyTrackedNorm(normId: string, description?: string): TrackedNorm {
  return {
    normId,
    description: description ?? normId,
    firstObservedTimestamp: Date.now(),
    lifecycleState: 'proposed',
    adherentCount: 0,
    populationSize: 0,
    adoptionRate: 0,
    smoothedAdoptionRate: 0,
    adoptionVelocity: 0,
    enforcementCount: 0,
    violationCount: 0,
    enforcementRatio: 0,
    adoptionTrend: [],
    lastAdoptionTimestamp: 0,
    lastViolationTimestamp: 0,
  };
}

/**
 * Create an empty CooperationIndex.
 */
export function createEmptyCooperationIndex(): CooperationIndex {
  return {
    cooperationOffers: 0,
    cooperationAcceptances: 0,
    defections: 0,
    cooperationRatio: 1.0,
    smoothedCooperationRatio: 1.0,
    reciprocityIndex: 0,
    health: 'stable',
    cooperationTrend: [],
    averageResponseTimeMs: 0,
    uniqueCooperatingPairs: 0,
  };
}

/**
 * Create an empty CulturalDriftVector for a dimension.
 */
export function createEmptyCulturalDriftVector(dimension: CulturalDimension): CulturalDriftVector {
  return {
    dimension,
    currentPosition: 0,
    previousPosition: 0,
    driftRate: 0,
    smoothedDriftRate: 0,
    magnitude: 0,
    direction: 0,
    stability: 1.0,
    positionTrend: [],
  };
}

/**
 * Create an empty CulturalDriftState with all dimensions at neutral.
 */
export function createEmptyCulturalDriftState(): CulturalDriftState {
  return {
    dimensions: {
      individualism_collectivism: createEmptyCulturalDriftVector('individualism_collectivism'),
      risk_tolerance: createEmptyCulturalDriftVector('risk_tolerance'),
      hierarchy_egalitarianism: createEmptyCulturalDriftVector('hierarchy_egalitarianism'),
      competition_cooperation: createEmptyCulturalDriftVector('competition_cooperation'),
      innovation_tradition: createEmptyCulturalDriftVector('innovation_tradition'),
    },
    overallStability: 1.0,
    totalDriftMagnitude: 0,
    dominantDimension: 'individualism_collectivism',
    isTransitioning: false,
    transitionThreshold: DEFAULT_CULTURAL_HEALTH_CONFIG.transitionThreshold,
  };
}

/**
 * Create an empty BoundaryPermeabilityState.
 */
export function createEmptyBoundaryPermeabilityState(): BoundaryPermeabilityState {
  return {
    boundaries: [],
    groupCount: 0,
    averagePermeability: 0,
    mostPermeableBoundary: null,
    leastPermeableBoundary: null,
    networkConnectivity: 0,
    overallPermeability: 'closed',
  };
}

/**
 * Create an empty MetanormEmergenceState.
 */
export function createEmptyMetanormEmergenceState(): MetanormEmergenceState {
  return {
    metanorms: [],
    activeMetanormCount: 0,
    emergingMetanormCount: 0,
    decayingMetanormCount: 0,
    metanormDensity: 0,
    averageStability: 0,
    hasStrongMetanorms: false,
  };
}

/**
 * Create an empty CulturalHealthState suitable for double-buffer initialization.
 */
export function createEmptyCulturalHealthState(): CulturalHealthState {
  return {
    norms: new Map(),
    averageAdoptionRate: 0,
    normLifecycleCounts: {
      proposed: 0,
      emerging: 0,
      establishing: 0,
      established: 0,
      entrenched: 0,
      declining: 0,
      abandoned: 0,
    },
    populationCooperation: createEmptyCooperationIndex(),
    groupCooperation: new Map(),
    culturalDrift: createEmptyCulturalDriftState(),
    boundaryPermeability: createEmptyBoundaryPermeabilityState(),
    metanormEmergence: createEmptyMetanormEmergenceState(),
    populationSize: 0,
    groupCount: 0,
    overallHealthScore: 1.0,
    sequence: 0,
    lastUpdateTimestamp: 0,
    isLive: false,
  };
}

/**
 * Convert a CulturalHealthState (with Maps) to a CulturalHealthSnapshot (with plain objects)
 * suitable for JSON serialization and WebSocket transmission.
 */
export function stateToSnapshot(state: CulturalHealthState): CulturalHealthSnapshot {
  const normsRecord: Record<string, TrackedNorm> = {};
  for (const [id, norm] of state.norms) {
    normsRecord[id] = norm;
  }

  const groupCoopRecord: Record<string, CooperationIndex> = {};
  for (const [id, coop] of state.groupCooperation) {
    groupCoopRecord[id] = coop;
  }

  return {
    norms: normsRecord,
    averageAdoptionRate: state.averageAdoptionRate,
    normLifecycleCounts: { ...state.normLifecycleCounts },
    populationCooperation: state.populationCooperation,
    groupCooperation: groupCoopRecord,
    culturalDrift: state.culturalDrift,
    boundaryPermeability: state.boundaryPermeability,
    metanormEmergence: state.metanormEmergence,
    populationSize: state.populationSize,
    groupCount: state.groupCount,
    overallHealthScore: state.overallHealthScore,
    sequence: state.sequence,
    lastUpdateTimestamp: state.lastUpdateTimestamp,
    isLive: state.isLive,
  };
}

/**
 * Create a unique alert ID.
 */
export function createCulturalAlertId(): string {
  return `cultural-alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
