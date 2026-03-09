/**
 * CulturalTrustHandshake
 *
 * Extends the VR trust handshake protocol with cultural metadata, enabling
 * multi-agent worlds to negotiate cultural norms, compute cross-cultural
 * compatibility, propagate cultural reputation via gossip, and close the
 * loop with interaction quality feedback.
 *
 * FOUR SUBSYSTEMS:
 *
 * 1. Cultural Identity Exchange
 *    During the JOIN phase, agents declare a CulturalIdentityProfile alongside
 *    their AgentManifest. This profile includes language preferences, greeting
 *    style, communication directness, personal space norms, turn-taking style,
 *    timezone, and custom norm key-value pairs.
 *
 * 2. Norm Compatibility Matrix
 *    A pairwise compatibility engine that computes how well two agents' cultural
 *    norms align. The matrix is recomputed off the render loop at a configurable
 *    Hz (default 2Hz). Render-loop reads are O(1) map lookups.
 *
 * 3. Cross-Cultural Reputation Gossip
 *    Extends the epidemic gossip protocol (GossipTrustMesh pattern) to propagate
 *    cultural reputation scores across world nodes. Uses fan-out 3, vector clocks,
 *    and O(log2 n) convergence. The reputation reflects how well an agent adapts
 *    to cross-cultural interactions.
 *
 * 4. Interaction Quality Feedback Loops
 *    Closed-loop system where interaction outcomes (successful collaboration,
 *    communication breakdowns, norm violations, positive adaptations) feed back
 *    into cultural compatibility weights and reputation scores. Uses EWMA for
 *    smooth, noise-resistant updates.
 *
 * DESIGN PRINCIPLES:
 * - Off render loop: ALL cultural computation runs on setInterval loops,
 *   completely decoupled from the 90Hz VR render path.
 * - Render-loop safe reads: Cultural compatibility scores and reputation
 *   are accessible via O(1) map lookups (<0.1ms).
 * - EWMA smoothing: All scores use Exponentially Weighted Moving Average
 *   to smooth transient noise while reacting to sustained patterns.
 * - Event-driven: Accepts CulturalEvents from AgentCommunicationManager
 *   and processes them in batches per scoring cycle.
 * - Configurable: All thresholds, weights, and timing are configurable.
 *
 * DATA FLOW:
 * ```
 *   Agent JOIN Request (with CulturalIdentityProfile)
 *        |
 *        v
 *   CulturalTrustHandshake.registerCulturalIdentity()  <-- OFF render loop
 *        |
 *        v
 *   NormCompatibilityMatrix recomputed (2Hz)            <-- OFF render loop
 *        |
 *        v
 *   Interaction events feed into quality scoring         <-- OFF render loop
 *        |
 *        v
 *   Cultural reputation gossiped to peers (5Hz)         <-- OFF render loop
 *        |
 *        v
 *   getCulturalCompatibility(a, b)                      <-- ON render loop (<0.1ms)
 *   getCulturalReputation(agentId)                      <-- ON render loop (<0.1ms)
 * ```
 *
 * INTEGRATION WITH VRTrustHandshake:
 * ```typescript
 * const cultural = new CulturalTrustHandshake({
 *   onCompatibilityChanged: (agentA, agentB, score) => {
 *     // Adjust interaction permissions based on cultural fit
 *   },
 *   onReputationChanged: (agentId, oldScore, newScore) => {
 *     // Feed into behavioral trust scoring as a modifier
 *   },
 * });
 *
 * // During JOIN phase, register cultural identity
 * cultural.registerCulturalIdentity('agent-1', {
 *   preferredLanguages: ['en', 'ja'],
 *   greetingStyle: 'formal',
 *   communicationDirectness: 0.3,  // indirect
 *   personalSpacePreference: 2.0,  // meters
 *   turnTakingStyle: 'sequential',
 *   timezone: 'Asia/Tokyo',
 *   customNorms: { 'bow_on_greeting': 'true' },
 * });
 *
 * // Render loop: O(1) reads
 * const compat = cultural.getCulturalCompatibility('agent-1', 'agent-2');
 * const reputation = cultural.getCulturalReputation('agent-1');
 * ```
 *
 * @module CulturalTrustHandshake
 */

import { logger } from './logger';

// =============================================================================
// TYPES: CULTURAL IDENTITY
// =============================================================================

/**
 * Communication directness level.
 * 0.0 = highly indirect (implicit, contextual, high-context culture)
 * 1.0 = highly direct (explicit, low-context culture)
 */
export type DirectnessLevel = number;

/**
 * Greeting style preferences.
 */
export type GreetingStyle =
  | 'formal'      // Structured, protocol-driven greetings (bowing, titles)
  | 'casual'      // Relaxed, first-name basis
  | 'silent'      // Minimal greeting, prefer to start work immediately
  | 'elaborate'   // Extended pleasantries, small talk expected
  | 'gestural';   // Physical gestures (wave, nod, handshake avatar)

/**
 * Turn-taking style in conversations.
 */
export type TurnTakingStyle =
  | 'sequential'  // One speaker at a time, wait for pause
  | 'overlapping' // Interruptions and simultaneous speech are normal
  | 'moderated'   // Explicit hand-raising or turn-request protocol
  | 'freeform';   // No structured turn-taking

/**
 * An agent's cultural identity profile, declared during JOIN.
 */
export interface CulturalIdentityProfile {
  /** Preferred languages (BCP 47 tags), ordered by preference */
  preferredLanguages: string[];
  /** Greeting style preference */
  greetingStyle: GreetingStyle;
  /** Communication directness level (0 = indirect, 1 = direct) */
  communicationDirectness: DirectnessLevel;
  /** Personal space preference in world units (meters) */
  personalSpacePreference: number;
  /** Turn-taking style in conversations */
  turnTakingStyle: TurnTakingStyle;
  /** IANA timezone identifier (e.g., 'America/New_York') */
  timezone: string;
  /** Custom cultural norms as key-value pairs */
  customNorms: Record<string, string>;
}

/**
 * Internal state for a registered agent's cultural identity.
 */
export interface CulturalAgentState {
  /** Agent ID */
  agentId: string;
  /** The agent's cultural profile */
  profile: CulturalIdentityProfile;
  /** Cultural reputation score (0-1, starts at 0.5 neutral) */
  reputationScore: number;
  /** Number of cross-cultural interactions participated in */
  interactionCount: number;
  /** Number of positive cultural adaptations observed */
  positiveAdaptations: number;
  /** Number of cultural norm violations observed */
  normViolations: number;
  /** Timestamp of registration */
  registeredAt: number;
  /** Timestamp of last reputation update */
  lastReputationUpdate: number;
}

// =============================================================================
// TYPES: NORM COMPATIBILITY
// =============================================================================

/**
 * The cultural norm dimensions used for compatibility computation.
 */
export type CulturalNormDimension =
  | 'language_overlap'
  | 'greeting_compatibility'
  | 'directness_alignment'
  | 'personal_space_alignment'
  | 'turn_taking_compatibility'
  | 'timezone_proximity';

/**
 * Pairwise cultural compatibility score between two agents.
 */
export interface CulturalCompatibilityScore {
  /** First agent */
  agentA: string;
  /** Second agent */
  agentB: string;
  /** Overall compatibility (0-1, weighted composite) */
  overallScore: number;
  /** Per-dimension scores */
  dimensionScores: Record<CulturalNormDimension, number>;
  /** Timestamp of last computation */
  lastComputedAt: number;
  /** Number of times this pair's score has been recomputed */
  computationCount: number;
}

// =============================================================================
// TYPES: CULTURAL REPUTATION GOSSIP
// =============================================================================

/**
 * A cultural reputation update to be propagated through the gossip mesh.
 */
export interface CulturalReputationUpdate {
  /** Unique update ID */
  updateId: string;
  /** Agent whose cultural reputation changed */
  agentId: string;
  /** New reputation score (0-1) */
  reputationScore: number;
  /** Interaction count at time of update */
  interactionCount: number;
  /** Positive adaptations at time of update */
  positiveAdaptations: number;
  /** Norm violations at time of update */
  normViolations: number;
  /** Node that originated this update */
  originNodeId: string;
  /** Logical timestamp for causal ordering */
  logicalClock: number;
  /** Wall clock timestamp */
  timestamp: number;
  /** TTL: hops remaining */
  ttl: number;
}

/**
 * A gossip message carrying cultural reputation updates.
 */
export interface CulturalGossipMessage {
  /** Sending node ID */
  fromNodeId: string;
  /** Message sequence number */
  sequence: number;
  /** Cultural reputation updates */
  updates: CulturalReputationUpdate[];
  /** Sender's logical clock */
  senderClock: number;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// TYPES: INTERACTION QUALITY FEEDBACK
// =============================================================================

/**
 * Types of interaction quality events.
 */
export type InteractionQualityEventType =
  | 'successful_collaboration'    // Agents completed a shared task
  | 'communication_breakdown'     // Misunderstanding or failed communication
  | 'norm_adaptation'             // Agent positively adapted to peer's norms
  | 'norm_violation'              // Agent violated peer's cultural norms
  | 'greeting_reciprocated'       // Greeting was properly reciprocated
  | 'greeting_ignored'            // Greeting was ignored
  | 'personal_space_respected'    // Agent maintained appropriate distance
  | 'personal_space_violated'     // Agent invaded peer's preferred space
  | 'turn_taking_respected'       // Proper turn-taking observed
  | 'turn_taking_violated';       // Interruption or turn-stealing observed

/**
 * An interaction quality event between two agents.
 */
export interface InteractionQualityEvent {
  /** Event type */
  type: InteractionQualityEventType;
  /** The agent whose behavior is being evaluated */
  subjectAgentId: string;
  /** The other agent involved in the interaction */
  peerAgentId: string;
  /** When the event occurred */
  timestamp: number;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** Pre-computed quality score (0 = negative, 1 = positive). If not set, auto-computed. */
  qualityScore?: number;
}

// =============================================================================
// TYPES: CONFIGURATION
// =============================================================================

/**
 * Weights for cultural norm dimensions in compatibility computation.
 */
export interface CulturalNormWeights {
  language_overlap: number;
  greeting_compatibility: number;
  directness_alignment: number;
  personal_space_alignment: number;
  turn_taking_compatibility: number;
  timezone_proximity: number;
}

/**
 * Configuration for the CulturalTrustHandshake.
 */
export interface CulturalTrustHandshakeConfig {
  /** Node ID for gossip protocol (required for multi-node deployments) */
  nodeId?: string;

  // -- Compatibility Matrix --
  /** Recomputation frequency for compatibility matrix in Hz (default: 2) */
  compatibilityHz?: number;
  /** Dimension weights for compatibility scoring */
  dimensionWeights?: Partial<CulturalNormWeights>;

  // -- Reputation Gossip --
  /** Gossip round interval in ms (default: 200) */
  gossipIntervalMs?: number;
  /** Fan-out: peers to gossip to per round (default: 3) */
  fanOut?: number;
  /** Maximum TTL for reputation updates (default: 20) */
  maxTtl?: number;
  /** Maximum age of a reputation update before discard (ms, default: 60000) */
  updateMaxAgeMs?: number;

  // -- Feedback Loop --
  /** Feedback processing frequency in Hz (default: 5) */
  feedbackHz?: number;
  /** EWMA alpha for reputation score updates (default: 0.2) */
  reputationEwmaAlpha?: number;
  /** EWMA alpha for compatibility adjustments from feedback (default: 0.1) */
  compatibilityFeedbackAlpha?: number;

  // -- Thresholds --
  /** Reputation score below which agents are flagged as culturally problematic (default: 0.3) */
  lowReputationThreshold?: number;
  /** Compatibility score above which agents are flagged as highly compatible (default: 0.8) */
  highCompatibilityThreshold?: number;

  // -- Lifecycle --
  /** Whether to auto-start all loops (default: false) */
  autoStart?: boolean;

  // -- Callbacks --
  /** Called when a pairwise compatibility score changes significantly (>5%) */
  onCompatibilityChanged?: (agentA: string, agentB: string, oldScore: number, newScore: number) => void;
  /** Called when an agent's cultural reputation changes significantly (>5%) */
  onReputationChanged?: (agentId: string, oldScore: number, newScore: number) => void;
  /** Called when an agent's reputation drops below the low threshold */
  onLowReputation?: (agentId: string, score: number) => void;
}

/**
 * Metrics for the CulturalTrustHandshake system.
 */
export interface CulturalTrustHandshakeMetrics {
  /** Whether the system is running */
  isRunning: boolean;
  /** Number of registered cultural identities */
  registeredAgentCount: number;
  /** Number of pairwise compatibility scores computed */
  compatibilityPairCount: number;
  /** Total interaction quality events processed */
  totalFeedbackEvents: number;
  /** Total reputation updates gossiped */
  totalGossipUpdates: number;
  /** Total gossip messages sent */
  totalGossipMessagesSent: number;
  /** Total gossip messages received */
  totalGossipMessagesReceived: number;
  /** Average compatibility score across all pairs */
  averageCompatibilityScore: number;
  /** Average reputation score across all agents */
  averageReputationScore: number;
  /** Compatibility matrix recomputation Hz */
  compatibilityHz: number;
  /** Feedback processing Hz */
  feedbackHz: number;
  /** Average compatibility cycle duration in ms */
  averageCompatibilityCycleDurationMs: number;
  /** Average feedback cycle duration in ms */
  averageFeedbackCycleDurationMs: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CULTURAL_NORM_WEIGHTS: CulturalNormWeights = {
  language_overlap: 0.25,
  greeting_compatibility: 0.10,
  directness_alignment: 0.20,
  personal_space_alignment: 0.15,
  turn_taking_compatibility: 0.15,
  timezone_proximity: 0.15,
};

/** Default configuration values. */
export const DEFAULT_CULTURAL_CONFIG = {
  nodeId: 'local',
  compatibilityHz: 2,
  gossipIntervalMs: 200,
  fanOut: 3,
  maxTtl: 20,
  updateMaxAgeMs: 60_000,
  feedbackHz: 5,
  reputationEwmaAlpha: 0.2,
  compatibilityFeedbackAlpha: 0.1,
  lowReputationThreshold: 0.3,
  highCompatibilityThreshold: 0.8,
} as const;

// =============================================================================
// GREETING COMPATIBILITY MATRIX
// =============================================================================

/**
 * Pre-computed compatibility scores between greeting styles.
 * Symmetric: COMPAT[a][b] === COMPAT[b][a].
 * 1.0 = perfect match, 0.0 = incompatible.
 */
const GREETING_COMPAT: Record<GreetingStyle, Record<GreetingStyle, number>> = {
  formal:    { formal: 1.0, casual: 0.4, silent: 0.5, elaborate: 0.7, gestural: 0.6 },
  casual:    { formal: 0.4, casual: 1.0, silent: 0.6, elaborate: 0.7, gestural: 0.8 },
  silent:    { formal: 0.5, casual: 0.6, silent: 1.0, elaborate: 0.2, gestural: 0.5 },
  elaborate: { formal: 0.7, casual: 0.7, silent: 0.2, elaborate: 1.0, gestural: 0.6 },
  gestural:  { formal: 0.6, casual: 0.8, silent: 0.5, elaborate: 0.6, gestural: 1.0 },
};

/**
 * Pre-computed compatibility scores between turn-taking styles.
 */
const TURN_TAKING_COMPAT: Record<TurnTakingStyle, Record<TurnTakingStyle, number>> = {
  sequential:  { sequential: 1.0, overlapping: 0.3, moderated: 0.8, freeform: 0.5 },
  overlapping: { sequential: 0.3, overlapping: 1.0, moderated: 0.4, freeform: 0.7 },
  moderated:   { sequential: 0.8, overlapping: 0.4, moderated: 1.0, freeform: 0.5 },
  freeform:    { sequential: 0.5, overlapping: 0.7, moderated: 0.5, freeform: 1.0 },
};

// =============================================================================
// PAIR KEY UTILITY
// =============================================================================

/**
 * Create a canonical pair key for two agent IDs (order-independent).
 */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

// =============================================================================
// CULTURAL TRUST HANDSHAKE ENGINE
// =============================================================================

/**
 * Cultural Trust Handshake engine for VR multi-agent worlds.
 *
 * Manages cultural identity exchange, norm compatibility computation,
 * cross-cultural reputation gossip, and interaction quality feedback loops.
 * All computation runs off the 90Hz VR render loop.
 *
 * Usage:
 * ```typescript
 * const cultural = new CulturalTrustHandshake({
 *   compatibilityHz: 2,
 *   feedbackHz: 5,
 *   onReputationChanged: (agentId, oldScore, newScore) => {
 *     console.log(`Agent ${agentId} reputation: ${oldScore} -> ${newScore}`);
 *   },
 * });
 *
 * cultural.start();
 *
 * // Register cultural identities (during JOIN phase)
 * cultural.registerCulturalIdentity('agent-1', {
 *   preferredLanguages: ['en'],
 *   greetingStyle: 'casual',
 *   communicationDirectness: 0.8,
 *   personalSpacePreference: 1.5,
 *   turnTakingStyle: 'freeform',
 *   timezone: 'America/New_York',
 *   customNorms: {},
 * });
 *
 * // Render loop: O(1) reads
 * const compat = cultural.getCulturalCompatibility('agent-1', 'agent-2');
 * const reputation = cultural.getCulturalReputation('agent-1');
 * ```
 */
export class CulturalTrustHandshake {
  private readonly config: {
    nodeId: string;
    compatibilityHz: number;
    dimensionWeights: CulturalNormWeights;
    gossipIntervalMs: number;
    fanOut: number;
    maxTtl: number;
    updateMaxAgeMs: number;
    feedbackHz: number;
    reputationEwmaAlpha: number;
    compatibilityFeedbackAlpha: number;
    lowReputationThreshold: number;
    highCompatibilityThreshold: number;
    onCompatibilityChanged: (agentA: string, agentB: string, oldScore: number, newScore: number) => void;
    onReputationChanged: (agentId: string, oldScore: number, newScore: number) => void;
    onLowReputation: (agentId: string, score: number) => void;
  };

  // ── Cultural Agent State ──────────────────────────────────────────
  /** Per-agent cultural state */
  private readonly agentStates: Map<string, CulturalAgentState> = new Map();

  // ── Norm Compatibility Matrix ──────────────────────────────────────
  /** Pairwise compatibility scores (key = pairKey(a, b)) */
  private readonly compatibilityMatrix: Map<string, CulturalCompatibilityScore> = new Map();
  /** Feedback-adjusted weight modifiers per pair (key = pairKey(a, b)) */
  private readonly feedbackWeightAdjustments: Map<string, Record<CulturalNormDimension, number>> = new Map();

  // ── Reputation Gossip ──────────────────────────────────────────────
  /** Gossip peers (nodeId -> send function) */
  private readonly gossipPeers: Map<string, {
    nodeId: string;
    send: (message: CulturalGossipMessage) => void;
    isAlive: boolean;
    failedSends: number;
  }> = new Map();
  /** Pending reputation updates for next gossip round */
  private pendingGossipUpdates: CulturalReputationUpdate[] = [];
  /** Seen update IDs to prevent re-processing */
  private readonly seenGossipUpdates: Set<string> = new Set();
  private readonly MAX_SEEN_GOSSIP = 10000;
  /** Logical clock for causal ordering */
  private logicalClock: number = 0;
  /** Gossip message sequence */
  private gossipSequence: number = 0;

  // ── Interaction Quality Feedback ───────────────────────────────────
  /** Queued feedback events, processed in batches */
  private feedbackQueue: InteractionQualityEvent[] = [];

  // ── Processing Loops ───────────────────────────────────────────────
  private compatibilityIntervalId: ReturnType<typeof setInterval> | null = null;
  private feedbackIntervalId: ReturnType<typeof setInterval> | null = null;
  private gossipIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  // ── Metrics ────────────────────────────────────────────────────────
  private totalFeedbackEvents: number = 0;
  private totalGossipUpdates: number = 0;
  private totalGossipMessagesSent: number = 0;
  private totalGossipMessagesReceived: number = 0;
  private compatibilityCycleDurations: number[] = [];
  private feedbackCycleDurations: number[] = [];
  private readonly MAX_DURATION_HISTORY = 60;

  constructor(config?: CulturalTrustHandshakeConfig) {
    this.config = {
      nodeId: config?.nodeId ?? DEFAULT_CULTURAL_CONFIG.nodeId,
      compatibilityHz: config?.compatibilityHz ?? DEFAULT_CULTURAL_CONFIG.compatibilityHz,
      dimensionWeights: {
        ...DEFAULT_CULTURAL_NORM_WEIGHTS,
        ...(config?.dimensionWeights ?? {}),
      },
      gossipIntervalMs: config?.gossipIntervalMs ?? DEFAULT_CULTURAL_CONFIG.gossipIntervalMs,
      fanOut: config?.fanOut ?? DEFAULT_CULTURAL_CONFIG.fanOut,
      maxTtl: config?.maxTtl ?? DEFAULT_CULTURAL_CONFIG.maxTtl,
      updateMaxAgeMs: config?.updateMaxAgeMs ?? DEFAULT_CULTURAL_CONFIG.updateMaxAgeMs,
      feedbackHz: config?.feedbackHz ?? DEFAULT_CULTURAL_CONFIG.feedbackHz,
      reputationEwmaAlpha: config?.reputationEwmaAlpha ?? DEFAULT_CULTURAL_CONFIG.reputationEwmaAlpha,
      compatibilityFeedbackAlpha: config?.compatibilityFeedbackAlpha ?? DEFAULT_CULTURAL_CONFIG.compatibilityFeedbackAlpha,
      lowReputationThreshold: config?.lowReputationThreshold ?? DEFAULT_CULTURAL_CONFIG.lowReputationThreshold,
      highCompatibilityThreshold: config?.highCompatibilityThreshold ?? DEFAULT_CULTURAL_CONFIG.highCompatibilityThreshold,
      onCompatibilityChanged: config?.onCompatibilityChanged ?? (() => {}),
      onReputationChanged: config?.onReputationChanged ?? (() => {}),
      onLowReputation: config?.onLowReputation ?? (() => {}),
    };

    if (config?.autoStart) {
      this.start();
    }

    logger.info('[CulturalTrustHandshake] Initialized', {
      nodeId: this.config.nodeId,
      compatibilityHz: this.config.compatibilityHz,
      feedbackHz: this.config.feedbackHz,
      gossipIntervalMs: this.config.gossipIntervalMs,
    });
  }

  // ===========================================================================
  // SUBSYSTEM 1: CULTURAL IDENTITY EXCHANGE
  // ===========================================================================

  /**
   * Register a cultural identity for an agent.
   *
   * Called during the JOIN phase of VRTrustHandshake, after the agent's
   * manifest has been validated and the challenge-response is complete.
   *
   * Triggers compatibility matrix recomputation on the next cycle.
   *
   * @param agentId - Agent to register
   * @param profile - The agent's cultural identity profile
   */
  registerCulturalIdentity(agentId: string, profile: CulturalIdentityProfile): void {
    const state: CulturalAgentState = {
      agentId,
      profile,
      reputationScore: 0.5, // Start neutral
      interactionCount: 0,
      positiveAdaptations: 0,
      normViolations: 0,
      registeredAt: Date.now(),
      lastReputationUpdate: Date.now(),
    };

    this.agentStates.set(agentId, state);

    logger.info('[CulturalTrustHandshake] Cultural identity registered', {
      agentId,
      languages: profile.preferredLanguages,
      greetingStyle: profile.greetingStyle,
      directness: profile.communicationDirectness,
    });
  }

  /**
   * Update an agent's cultural identity profile.
   *
   * Useful when an agent adapts their norms after spending time in a world.
   *
   * @param agentId - Agent to update
   * @param updates - Partial profile updates
   */
  updateCulturalIdentity(agentId: string, updates: Partial<CulturalIdentityProfile>): void {
    const state = this.agentStates.get(agentId);
    if (!state) {
      logger.warn('[CulturalTrustHandshake] Cannot update: agent not registered', { agentId });
      return;
    }

    Object.assign(state.profile, updates);

    logger.debug('[CulturalTrustHandshake] Cultural identity updated', {
      agentId,
      updatedFields: Object.keys(updates),
    });
  }

  /**
   * Unregister an agent's cultural identity.
   *
   * Called when an agent exits the world. Cleans up compatibility pairs.
   *
   * @param agentId - Agent to unregister
   */
  unregisterCulturalIdentity(agentId: string): void {
    this.agentStates.delete(agentId);

    // Clean up compatibility pairs involving this agent
    for (const key of this.compatibilityMatrix.keys()) {
      if (key.includes(agentId)) {
        this.compatibilityMatrix.delete(key);
        this.feedbackWeightAdjustments.delete(key);
      }
    }

    logger.debug('[CulturalTrustHandshake] Cultural identity unregistered', { agentId });
  }

  /**
   * Get an agent's cultural identity profile.
   *
   * Render-loop safe (map lookup).
   *
   * @param agentId - Agent to query
   * @returns The cultural profile, or undefined if not registered
   */
  getCulturalProfile(agentId: string): Readonly<CulturalIdentityProfile> | undefined {
    return this.agentStates.get(agentId)?.profile;
  }

  /**
   * Get all registered agent IDs with cultural profiles.
   */
  getRegisteredAgentIds(): string[] {
    return Array.from(this.agentStates.keys());
  }

  // ===========================================================================
  // SUBSYSTEM 2: NORM COMPATIBILITY MATRIX
  // ===========================================================================

  /**
   * Get the cultural compatibility score between two agents.
   *
   * Render-loop safe. Returns the pre-computed composite score.
   *
   * Budget: <0.1ms (map lookup, ON render loop)
   *
   * @param agentA - First agent
   * @param agentB - Second agent
   * @returns Compatibility score (0-1), or -1 if not computed
   */
  getCulturalCompatibility(agentA: string, agentB: string): number {
    const key = pairKey(agentA, agentB);
    const score = this.compatibilityMatrix.get(key);
    return score?.overallScore ?? -1;
  }

  /**
   * Get the full compatibility breakdown between two agents.
   *
   * Render-loop safe (map lookup).
   *
   * @param agentA - First agent
   * @param agentB - Second agent
   * @returns Full compatibility score, or undefined
   */
  getCulturalCompatibilityDetails(
    agentA: string,
    agentB: string,
  ): Readonly<CulturalCompatibilityScore> | undefined {
    return this.compatibilityMatrix.get(pairKey(agentA, agentB));
  }

  /**
   * Get all compatibility scores as a readonly map.
   */
  getAllCompatibilityScores(): ReadonlyMap<string, CulturalCompatibilityScore> {
    return this.compatibilityMatrix;
  }

  /**
   * Recompute the full compatibility matrix.
   *
   * Called automatically by the compatibility loop, but can be triggered
   * manually for immediate recomputation.
   *
   * Budget: O(n^2) where n = number of agents. Off render loop.
   * For 100 agents: ~5000 pairs, typically <5ms.
   */
  recomputeCompatibilityMatrix(): void {
    const agents = Array.from(this.agentStates.values());
    const now = Date.now();

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];
        const key = pairKey(a.agentId, b.agentId);

        const dimensionScores = this.computeDimensionScores(a.profile, b.profile);

        // Apply feedback weight adjustments if any
        const adjustments = this.feedbackWeightAdjustments.get(key);

        let weightedSum = 0;
        let totalWeight = 0;
        for (const dim of Object.keys(dimensionScores) as CulturalNormDimension[]) {
          const baseWeight = this.config.dimensionWeights[dim];
          const adjustment = adjustments?.[dim] ?? 0;
          const effectiveWeight = Math.max(0, baseWeight + adjustment);
          weightedSum += dimensionScores[dim] * effectiveWeight;
          totalWeight += effectiveWeight;
        }

        const newOverall = totalWeight > 0 ? weightedSum / totalWeight : 0;

        const existing = this.compatibilityMatrix.get(key);
        const oldOverall = existing?.overallScore ?? -1;

        this.compatibilityMatrix.set(key, {
          agentA: a.agentId,
          agentB: b.agentId,
          overallScore: newOverall,
          dimensionScores,
          lastComputedAt: now,
          computationCount: (existing?.computationCount ?? 0) + 1,
        });

        // Fire callback on significant change (>5%)
        if (oldOverall >= 0 && Math.abs(newOverall - oldOverall) > 0.05) {
          this.config.onCompatibilityChanged(a.agentId, b.agentId, oldOverall, newOverall);
        }
      }
    }
  }

  /**
   * Compute per-dimension compatibility scores between two cultural profiles.
   */
  private computeDimensionScores(
    profileA: CulturalIdentityProfile,
    profileB: CulturalIdentityProfile,
  ): Record<CulturalNormDimension, number> {
    return {
      language_overlap: this.computeLanguageOverlap(profileA.preferredLanguages, profileB.preferredLanguages),
      greeting_compatibility: this.computeGreetingCompatibility(profileA.greetingStyle, profileB.greetingStyle),
      directness_alignment: this.computeDirectnessAlignment(profileA.communicationDirectness, profileB.communicationDirectness),
      personal_space_alignment: this.computePersonalSpaceAlignment(profileA.personalSpacePreference, profileB.personalSpacePreference),
      turn_taking_compatibility: this.computeTurnTakingCompatibility(profileA.turnTakingStyle, profileB.turnTakingStyle),
      timezone_proximity: this.computeTimezoneProximity(profileA.timezone, profileB.timezone),
    };
  }

  /**
   * Compute language overlap score.
   * 1.0 if agents share a common preferred language.
   * Partial credit for shared secondary languages.
   */
  private computeLanguageOverlap(langsA: string[], langsB: string[]): number {
    if (langsA.length === 0 || langsB.length === 0) return 0.5; // Unknown, neutral

    const setB = new Set(langsB.map(l => l.toLowerCase().split('-')[0]));
    let bestScore = 0;

    for (let i = 0; i < langsA.length; i++) {
      const langA = langsA[i].toLowerCase().split('-')[0];
      if (setB.has(langA)) {
        // Higher score for earlier (more preferred) languages
        const positionPenalty = i / langsA.length;
        const score = 1.0 - (positionPenalty * 0.3);
        bestScore = Math.max(bestScore, score);
      }
    }

    return bestScore;
  }

  /**
   * Compute greeting style compatibility using the pre-computed matrix.
   */
  private computeGreetingCompatibility(styleA: GreetingStyle, styleB: GreetingStyle): number {
    return GREETING_COMPAT[styleA]?.[styleB] ?? 0.5;
  }

  /**
   * Compute directness alignment.
   * 1.0 if agents have similar directness levels.
   * Linearly decreasing with distance.
   */
  private computeDirectnessAlignment(directnessA: DirectnessLevel, directnessB: DirectnessLevel): number {
    const difference = Math.abs(directnessA - directnessB);
    return Math.max(0, 1.0 - difference);
  }

  /**
   * Compute personal space alignment.
   * 1.0 if agents have similar preferences.
   * Proportional penalty based on relative difference.
   */
  private computePersonalSpaceAlignment(spaceA: number, spaceB: number): number {
    const maxSpace = Math.max(spaceA, spaceB, 0.1);
    const difference = Math.abs(spaceA - spaceB);
    return Math.max(0, 1.0 - (difference / maxSpace));
  }

  /**
   * Compute turn-taking style compatibility using the pre-computed matrix.
   */
  private computeTurnTakingCompatibility(styleA: TurnTakingStyle, styleB: TurnTakingStyle): number {
    return TURN_TAKING_COMPAT[styleA]?.[styleB] ?? 0.5;
  }

  /**
   * Compute timezone proximity.
   * 1.0 if same timezone offset.
   * Linearly decreasing with hour difference, minimum 0.2 at 12h apart.
   */
  private computeTimezoneProximity(tzA: string, tzB: string): number {
    const offsetA = this.getTimezoneOffsetHours(tzA);
    const offsetB = this.getTimezoneOffsetHours(tzB);
    const hourDiff = Math.min(Math.abs(offsetA - offsetB), 24 - Math.abs(offsetA - offsetB));
    // 0 hours = 1.0, 12 hours = 0.2
    return Math.max(0.2, 1.0 - (hourDiff / 15));
  }

  /**
   * Approximate timezone offset in hours from UTC.
   * Uses a simplified lookup for common timezone patterns.
   */
  private getTimezoneOffsetHours(tz: string): number {
    // Common timezone offset approximations
    const offsets: Record<string, number> = {
      'pacific/honolulu': -10, 'america/anchorage': -9,
      'america/los_angeles': -8, 'america/denver': -7,
      'america/chicago': -6, 'america/new_york': -5,
      'america/sao_paulo': -3, 'atlantic/reykjavik': 0,
      'europe/london': 0, 'europe/paris': 1, 'europe/berlin': 1,
      'europe/moscow': 3, 'asia/dubai': 4, 'asia/kolkata': 5.5,
      'asia/dhaka': 6, 'asia/bangkok': 7, 'asia/shanghai': 8,
      'asia/tokyo': 9, 'australia/sydney': 11,
      'pacific/auckland': 13,
    };

    const key = tz.toLowerCase();
    if (key in offsets) return offsets[key];

    // Try partial match
    for (const [tzKey, offset] of Object.entries(offsets)) {
      if (key.includes(tzKey.split('/')[1] ?? '')) return offset;
    }

    return 0; // Unknown timezone, assume UTC
  }

  // ===========================================================================
  // SUBSYSTEM 3: CROSS-CULTURAL REPUTATION GOSSIP
  // ===========================================================================

  /**
   * Get an agent's cultural reputation score.
   *
   * Render-loop safe (map lookup).
   *
   * Budget: <0.1ms (ON render loop)
   *
   * @param agentId - Agent to query
   * @returns Reputation score (0-1), or -1 if not registered
   */
  getCulturalReputation(agentId: string): number {
    const state = this.agentStates.get(agentId);
    return state?.reputationScore ?? -1;
  }

  /**
   * Get full cultural agent state (for debugging/admin).
   *
   * @param agentId - Agent to query
   * @returns Full cultural state, or undefined
   */
  getCulturalAgentState(agentId: string): Readonly<CulturalAgentState> | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Add a gossip peer for cultural reputation propagation.
   *
   * @param nodeId - Peer node ID
   * @param sendFn - Function to send a gossip message to this peer
   */
  addGossipPeer(nodeId: string, sendFn: (message: CulturalGossipMessage) => void): void {
    if (nodeId === this.config.nodeId) return;

    this.gossipPeers.set(nodeId, {
      nodeId,
      send: sendFn,
      isAlive: true,
      failedSends: 0,
    });

    logger.info('[CulturalTrustHandshake] Gossip peer added', {
      nodeId,
      totalPeers: this.gossipPeers.size,
    });
  }

  /**
   * Remove a gossip peer.
   *
   * @param nodeId - Peer to remove
   */
  removeGossipPeer(nodeId: string): void {
    this.gossipPeers.delete(nodeId);
  }

  /**
   * Handle a received cultural gossip message from a peer.
   *
   * @param message - The received gossip message
   */
  onGossipReceived(message: CulturalGossipMessage): void {
    this.totalGossipMessagesReceived++;

    // Update peer liveness
    const peer = this.gossipPeers.get(message.fromNodeId);
    if (peer) {
      peer.isAlive = true;
      peer.failedSends = 0;
    }

    // Merge logical clock
    this.logicalClock = Math.max(this.logicalClock, message.senderClock) + 1;

    // Process reputation updates
    for (const update of message.updates) {
      this.processRemoteReputationUpdate(update);
    }

    logger.debug('[CulturalTrustHandshake] Gossip received', {
      from: message.fromNodeId,
      updateCount: message.updates.length,
    });
  }

  /**
   * Process a single remote reputation update.
   */
  private processRemoteReputationUpdate(update: CulturalReputationUpdate): void {
    // Skip if already seen
    if (this.seenGossipUpdates.has(update.updateId)) return;

    // Skip if TTL expired
    if (update.ttl <= 0) return;

    // Skip if too old
    if (Date.now() - update.timestamp > this.config.updateMaxAgeMs) return;

    // Mark as seen
    this.seenGossipUpdates.add(update.updateId);
    this.evictSeenGossipUpdates();

    // Apply update if it reflects newer information
    const local = this.agentStates.get(update.agentId);
    if (local) {
      // Only apply if remote has more interactions (more informed)
      if (update.interactionCount > local.interactionCount) {
        const oldScore = local.reputationScore;
        // Blend remote score with local using EWMA
        local.reputationScore = this.ewma(
          local.reputationScore,
          update.reputationScore,
          this.config.reputationEwmaAlpha,
        );
        local.lastReputationUpdate = Date.now();

        // Fire callback on significant change
        if (Math.abs(local.reputationScore - oldScore) > 0.05) {
          this.config.onReputationChanged(update.agentId, oldScore, local.reputationScore);
        }

        // Check low reputation threshold
        if (local.reputationScore < this.config.lowReputationThreshold) {
          this.config.onLowReputation(update.agentId, local.reputationScore);
        }
      }
    } else {
      // Agent not registered locally; store as a new entry with profile placeholder
      // This enables the mesh to track reputation for agents not yet in this world
      // We skip full registration since we don't have their cultural profile
    }

    // Re-gossip with decremented TTL
    this.pendingGossipUpdates.push({
      ...update,
      ttl: update.ttl - 1,
    });
  }

  /**
   * Execute a gossip round: send pending reputation updates to random peers.
   */
  private gossipRound(): void {
    if (this.pendingGossipUpdates.length === 0) return;

    const selectedPeers = this.selectRandomPeers(this.config.fanOut);
    if (selectedPeers.length === 0) return;

    this.logicalClock++;

    const message: CulturalGossipMessage = {
      fromNodeId: this.config.nodeId,
      sequence: ++this.gossipSequence,
      updates: [...this.pendingGossipUpdates],
      senderClock: this.logicalClock,
      timestamp: Date.now(),
    };

    for (const peer of selectedPeers) {
      try {
        peer.send(message);
        this.totalGossipMessagesSent++;
      } catch {
        peer.failedSends++;
        if (peer.failedSends >= 5) {
          peer.isAlive = false;
        }
      }
    }

    this.pendingGossipUpdates = [];
  }

  /**
   * Queue a local reputation change for gossip propagation.
   */
  private queueReputationGossip(agentId: string, state: CulturalAgentState): void {
    this.logicalClock++;

    const update: CulturalReputationUpdate = {
      updateId: `${this.config.nodeId}-cult-${Date.now()}-${this.logicalClock}`,
      agentId,
      reputationScore: state.reputationScore,
      interactionCount: state.interactionCount,
      positiveAdaptations: state.positiveAdaptations,
      normViolations: state.normViolations,
      originNodeId: this.config.nodeId,
      logicalClock: this.logicalClock,
      timestamp: Date.now(),
      ttl: this.config.maxTtl,
    };

    this.seenGossipUpdates.add(update.updateId);
    this.pendingGossipUpdates.push(update);
    this.totalGossipUpdates++;
  }

  /**
   * Select random alive gossip peers using Fisher-Yates partial shuffle.
   */
  private selectRandomPeers(
    count: number,
  ): Array<{ nodeId: string; send: (message: CulturalGossipMessage) => void; isAlive: boolean; failedSends: number }> {
    const alive: Array<{ nodeId: string; send: (message: CulturalGossipMessage) => void; isAlive: boolean; failedSends: number }> = [];
    for (const peer of this.gossipPeers.values()) {
      if (peer.isAlive) alive.push(peer);
    }

    if (alive.length <= count) return alive;

    const selected: typeof alive = [];
    const indices = Array.from({ length: alive.length }, (_, i) => i);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
      selected.push(alive[indices[i]]);
    }

    return selected;
  }

  /**
   * Evict oldest entries from seenGossipUpdates to prevent unbounded growth.
   */
  private evictSeenGossipUpdates(): void {
    if (this.seenGossipUpdates.size > this.MAX_SEEN_GOSSIP) {
      const deleteCount = this.seenGossipUpdates.size - this.MAX_SEEN_GOSSIP + 100;
      let i = 0;
      for (const id of this.seenGossipUpdates) {
        if (i >= deleteCount) break;
        this.seenGossipUpdates.delete(id);
        i++;
      }
    }
  }

  // ===========================================================================
  // SUBSYSTEM 4: INTERACTION QUALITY FEEDBACK LOOPS
  // ===========================================================================

  /**
   * Ingest an interaction quality event.
   *
   * Events are queued and processed in batches on the feedback loop
   * (off the render loop). Safe to call from any context.
   *
   * Cost: O(1) (queue push)
   *
   * @param event - The interaction quality event
   */
  ingestFeedbackEvent(event: InteractionQualityEvent): void {
    this.feedbackQueue.push(event);
  }

  /**
   * Ingest multiple interaction quality events.
   *
   * @param events - Array of events to queue
   */
  ingestFeedbackEvents(events: InteractionQualityEvent[]): void {
    for (const event of events) {
      this.feedbackQueue.push(event);
    }
  }

  /**
   * Process all queued feedback events.
   *
   * For each event:
   * 1. Update the subject agent's reputation via EWMA
   * 2. Adjust compatibility weight modifiers for the agent pair
   * 3. Queue reputation changes for gossip propagation
   *
   * Budget: Off render loop, typically <2ms for up to 50 events.
   */
  private processFeedbackCycle(): void {
    const startTime = this.now();
    const events = this.feedbackQueue;
    this.feedbackQueue = [];

    for (const event of events) {
      this.processSingleFeedbackEvent(event);
    }

    this.totalFeedbackEvents += events.length;

    // Track cycle duration
    const duration = this.now() - startTime;
    this.feedbackCycleDurations.push(duration);
    if (this.feedbackCycleDurations.length > this.MAX_DURATION_HISTORY) {
      this.feedbackCycleDurations.shift();
    }
  }

  /**
   * Process a single feedback event.
   */
  private processSingleFeedbackEvent(event: InteractionQualityEvent): void {
    const subjectState = this.agentStates.get(event.subjectAgentId);
    if (!subjectState) return;

    // Compute quality score if not provided
    const qualityScore = event.qualityScore ?? this.computeFeedbackQualityScore(event);

    // 1. Update reputation score via EWMA
    const oldReputation = subjectState.reputationScore;
    subjectState.reputationScore = this.ewma(
      subjectState.reputationScore,
      qualityScore,
      this.config.reputationEwmaAlpha,
    );
    subjectState.interactionCount++;
    subjectState.lastReputationUpdate = Date.now();

    // Track positive/negative outcomes
    if (qualityScore >= 0.6) {
      subjectState.positiveAdaptations++;
    } else if (qualityScore < 0.4) {
      subjectState.normViolations++;
    }

    // Fire reputation callback on significant change
    if (Math.abs(subjectState.reputationScore - oldReputation) > 0.05) {
      this.config.onReputationChanged(event.subjectAgentId, oldReputation, subjectState.reputationScore);
    }

    // Check low reputation threshold
    if (subjectState.reputationScore < this.config.lowReputationThreshold) {
      this.config.onLowReputation(event.subjectAgentId, subjectState.reputationScore);
    }

    // 2. Adjust compatibility weight modifiers for the pair
    this.adjustCompatibilityWeights(event);

    // 3. Queue reputation change for gossip
    this.queueReputationGossip(event.subjectAgentId, subjectState);
  }

  /**
   * Compute the quality score for a feedback event based on its type.
   *
   * Returns 0.0 (negative outcome) to 1.0 (positive outcome).
   */
  private computeFeedbackQualityScore(event: InteractionQualityEvent): number {
    switch (event.type) {
      case 'successful_collaboration':    return 1.0;
      case 'communication_breakdown':     return 0.1;
      case 'norm_adaptation':             return 0.9;
      case 'norm_violation':              return 0.1;
      case 'greeting_reciprocated':       return 0.8;
      case 'greeting_ignored':            return 0.2;
      case 'personal_space_respected':    return 0.8;
      case 'personal_space_violated':     return 0.15;
      case 'turn_taking_respected':       return 0.8;
      case 'turn_taking_violated':        return 0.2;
      default:                            return 0.5;
    }
  }

  /**
   * Adjust compatibility weight modifiers based on a feedback event.
   *
   * When specific cultural dimensions are involved in an interaction outcome,
   * the weight for that dimension is nudged up (positive outcome) or down
   * (negative outcome) for the specific agent pair.
   */
  private adjustCompatibilityWeights(event: InteractionQualityEvent): void {
    const key = pairKey(event.subjectAgentId, event.peerAgentId);
    let adjustments = this.feedbackWeightAdjustments.get(key);

    if (!adjustments) {
      adjustments = {
        language_overlap: 0,
        greeting_compatibility: 0,
        directness_alignment: 0,
        personal_space_alignment: 0,
        turn_taking_compatibility: 0,
        timezone_proximity: 0,
      };
      this.feedbackWeightAdjustments.set(key, adjustments);
    }

    // Map event types to affected dimensions
    const alpha = this.config.compatibilityFeedbackAlpha;
    const isPositive = (event.qualityScore ?? this.computeFeedbackQualityScore(event)) >= 0.5;
    const nudge = isPositive ? alpha * 0.01 : -alpha * 0.01;

    switch (event.type) {
      case 'greeting_reciprocated':
      case 'greeting_ignored':
        adjustments.greeting_compatibility = this.clamp(
          adjustments.greeting_compatibility + nudge,
          -0.1, 0.1,
        );
        break;

      case 'personal_space_respected':
      case 'personal_space_violated':
        adjustments.personal_space_alignment = this.clamp(
          adjustments.personal_space_alignment + nudge,
          -0.1, 0.1,
        );
        break;

      case 'turn_taking_respected':
      case 'turn_taking_violated':
        adjustments.turn_taking_compatibility = this.clamp(
          adjustments.turn_taking_compatibility + nudge,
          -0.1, 0.1,
        );
        break;

      case 'communication_breakdown':
        adjustments.directness_alignment = this.clamp(
          adjustments.directness_alignment + nudge,
          -0.1, 0.1,
        );
        adjustments.language_overlap = this.clamp(
          adjustments.language_overlap + nudge,
          -0.1, 0.1,
        );
        break;

      case 'successful_collaboration':
      case 'norm_adaptation':
        // Positive events boost all dimensions slightly
        for (const dim of Object.keys(adjustments) as CulturalNormDimension[]) {
          adjustments[dim] = this.clamp(adjustments[dim] + alpha * 0.005, -0.1, 0.1);
        }
        break;

      case 'norm_violation':
        // Negative events reduce all dimensions slightly
        for (const dim of Object.keys(adjustments) as CulturalNormDimension[]) {
          adjustments[dim] = this.clamp(adjustments[dim] - alpha * 0.005, -0.1, 0.1);
        }
        break;
    }
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start all processing loops.
   *
   * - Compatibility matrix recomputation at compatibilityHz
   * - Feedback event processing at feedbackHz
   * - Gossip reputation propagation at gossipIntervalMs
   *
   * All loops run off the 90Hz render loop.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[CulturalTrustHandshake] Already running');
      return;
    }

    // Compatibility matrix recomputation loop
    const compatIntervalMs = Math.max(1, Math.round(1000 / this.config.compatibilityHz));
    this.compatibilityIntervalId = setInterval(() => {
      const startTime = this.now();
      this.recomputeCompatibilityMatrix();
      const duration = this.now() - startTime;
      this.compatibilityCycleDurations.push(duration);
      if (this.compatibilityCycleDurations.length > this.MAX_DURATION_HISTORY) {
        this.compatibilityCycleDurations.shift();
      }
    }, compatIntervalMs);

    // Feedback processing loop
    const feedbackIntervalMs = Math.max(1, Math.round(1000 / this.config.feedbackHz));
    this.feedbackIntervalId = setInterval(() => {
      this.processFeedbackCycle();
    }, feedbackIntervalMs);

    // Gossip propagation loop
    this.gossipIntervalId = setInterval(() => {
      this.gossipRound();
    }, this.config.gossipIntervalMs);

    this.isRunning = true;

    logger.info('[CulturalTrustHandshake] Started all loops', {
      compatibilityHz: this.config.compatibilityHz,
      feedbackHz: this.config.feedbackHz,
      gossipIntervalMs: this.config.gossipIntervalMs,
    });
  }

  /**
   * Stop all processing loops. State is preserved.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[CulturalTrustHandshake] Already stopped');
      return;
    }

    if (this.compatibilityIntervalId !== null) {
      clearInterval(this.compatibilityIntervalId);
      this.compatibilityIntervalId = null;
    }

    if (this.feedbackIntervalId !== null) {
      clearInterval(this.feedbackIntervalId);
      this.feedbackIntervalId = null;
    }

    if (this.gossipIntervalId !== null) {
      clearInterval(this.gossipIntervalId);
      this.gossipIntervalId = null;
    }

    this.isRunning = false;
    logger.info('[CulturalTrustHandshake] Stopped all loops');
  }

  /**
   * Dispose all resources. Cannot be restarted after this.
   */
  dispose(): void {
    this.stop();
    this.agentStates.clear();
    this.compatibilityMatrix.clear();
    this.feedbackWeightAdjustments.clear();
    this.gossipPeers.clear();
    this.pendingGossipUpdates = [];
    this.seenGossipUpdates.clear();
    this.feedbackQueue = [];
    logger.info('[CulturalTrustHandshake] Disposed');
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive cultural trust metrics.
   */
  getMetrics(): CulturalTrustHandshakeMetrics {
    // Average compatibility
    let totalCompat = 0;
    let compatCount = 0;
    for (const score of this.compatibilityMatrix.values()) {
      totalCompat += score.overallScore;
      compatCount++;
    }

    // Average reputation
    let totalReputation = 0;
    let reputationCount = 0;
    for (const state of this.agentStates.values()) {
      totalReputation += state.reputationScore;
      reputationCount++;
    }

    // Average cycle durations
    let avgCompatDuration = 0;
    if (this.compatibilityCycleDurations.length > 0) {
      avgCompatDuration = this.compatibilityCycleDurations.reduce((a, b) => a + b, 0)
        / this.compatibilityCycleDurations.length;
    }

    let avgFeedbackDuration = 0;
    if (this.feedbackCycleDurations.length > 0) {
      avgFeedbackDuration = this.feedbackCycleDurations.reduce((a, b) => a + b, 0)
        / this.feedbackCycleDurations.length;
    }

    return {
      isRunning: this.isRunning,
      registeredAgentCount: this.agentStates.size,
      compatibilityPairCount: this.compatibilityMatrix.size,
      totalFeedbackEvents: this.totalFeedbackEvents,
      totalGossipUpdates: this.totalGossipUpdates,
      totalGossipMessagesSent: this.totalGossipMessagesSent,
      totalGossipMessagesReceived: this.totalGossipMessagesReceived,
      averageCompatibilityScore: compatCount > 0 ? totalCompat / compatCount : 0,
      averageReputationScore: reputationCount > 0 ? totalReputation / reputationCount : 0,
      compatibilityHz: this.config.compatibilityHz,
      feedbackHz: this.config.feedbackHz,
      averageCompatibilityCycleDurationMs:
        Math.round(avgCompatDuration * 1000) / 1000,
      averageFeedbackCycleDurationMs:
        Math.round(avgFeedbackDuration * 1000) / 1000,
    };
  }

  /**
   * Check if the system is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // INTERNAL UTILITIES
  // ===========================================================================

  /**
   * Exponentially Weighted Moving Average.
   */
  private ewma(current: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * current;
  }

  /**
   * Clamp a value between min and max.
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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
 * Create a CulturalTrustHandshake instance with the given configuration.
 */
export function createCulturalTrustHandshake(
  config?: CulturalTrustHandshakeConfig,
): CulturalTrustHandshake {
  return new CulturalTrustHandshake(config);
}
