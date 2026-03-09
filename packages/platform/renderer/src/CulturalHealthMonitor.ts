/**
 * CulturalHealthMonitor
 *
 * Real-time agent cultural health monitoring system that tracks population-level
 * cultural dynamics across five dimensions:
 *
 *   1. Norm Adoption Rates    - How quickly agents adopt new behavioral norms
 *   2. Cooperation Indices    - Population-level cooperation vs defection ratios
 *   3. Cultural Drift Vectors - Directional shift in cultural norms over time
 *   4. Boundary Permeability  - How easily norms cross group boundaries
 *   5. Metanorm Emergence     - Emergence of norms-about-norms (enforcement norms)
 *
 * DESIGN PRINCIPLES (matching BehavioralTrustScoring & AgentStateBuffer):
 * - Double-buffered state: back buffer written by monitor cycle, front buffer
 *   read by renderer/WebSocket (via AgentStateBuffer pattern)
 * - All computation runs OFF the VR render loop at configurable Hz (default 2Hz)
 * - Render-loop safe reads: getFrontBuffer() is O(1), zero allocation
 * - EWMA smoothing on all time-series metrics
 * - Event-driven: accepts CulturalEvents from agent systems
 * - Factory function: createCulturalHealthMonitor() for external construction
 *
 * PERFORMANCE CONTRACT:
 * - Monitor cycle: <5ms for up to 500 agents (OFF render loop, 2Hz default)
 * - Front buffer read: <0.1ms (ON render loop)
 * - WebSocket snapshot serialization: <1ms (OFF render loop)
 *
 * DATA FLOW:
 * ```
 *   Agent Systems (Communication, Trust, Economy)
 *        |
 *        v
 *   CulturalHealthMonitor.ingestEvent()       <-- OFF render loop
 *        |
 *        v
 *   eventQueue.push(event)                    <-- Batched
 *        |
 *        v
 *   monitorCycle() [every 500ms at 2Hz]       <-- OFF render loop
 *        |-- Process queued events
 *        |-- Update norm adoption rates
 *        |-- Compute cooperation indices
 *        |-- Calculate cultural drift vectors
 *        |-- Measure boundary permeability
 *        |-- Detect metanorm emergence
 *        |-- Compute overall health score
 *        |-- Swap double buffer (pointer swap)
 *        |-- Fire onCycleComplete callback
 *        |
 *        v
 *   getFrontBuffer()                          <-- ON render loop (<0.1ms)
 *   getSnapshot()                             <-- For WebSocket broadcast
 * ```
 *
 * USAGE:
 * ```typescript
 * const monitor = createCulturalHealthMonitor({
 *   monitorHz: 2,
 *   onCycleComplete: (snapshot) => {
 *     wsServer.broadcast(snapshot);
 *   },
 *   onAlert: (alert) => {
 *     console.log(`Cultural alert: ${alert.message}`);
 *   },
 * });
 *
 * monitor.start();
 *
 * // Feed events from agent systems
 * monitor.ingestEvent({
 *   type: 'norm_adopted',
 *   agentId: 'agent-1',
 *   normId: 'greeting-protocol',
 *   timestamp: Date.now(),
 *   data: {},
 * });
 *
 * // Render loop: O(1) read
 * const state = monitor.getFrontBuffer();
 * ```
 *
 * @module CulturalHealthMonitor
 */

import { logger } from './logger';
import type {
  CulturalEvent,
  CulturalEventType,
  CulturalHealthState,
  CulturalHealthSnapshot,
  CulturalHealthMonitorConfig,
  CulturalHealthMonitorMetrics,
  CulturalHealthAlert,
  CulturalAlertSeverity,
  TrackedNorm,
  NormLifecycleState,
  CooperationIndex,
  CooperationHealth,
  CulturalDimension,
  CulturalDriftVector,
  CulturalDriftState,
  GroupBoundary,
  BoundaryPermeabilityState,
  PermeabilityLevel,
  DetectedMetanorm,
  MetanormMaturity,
  MetanormEmergenceState,
  TimeSample,
} from './CulturalHealthTypes';

import {
  DEFAULT_CULTURAL_HEALTH_CONFIG,
  createEmptyCulturalHealthState,
  createEmptyTrackedNorm,
  createEmptyCooperationIndex,
  createEmptyCulturalDriftState,
  createEmptyBoundaryPermeabilityState,
  createEmptyMetanormEmergenceState,
  stateToSnapshot,
  createCulturalAlertId,
} from './CulturalHealthTypes';

// =============================================================================
// INTERNAL TRACKING STRUCTURES
// =============================================================================

/**
 * Internal per-agent tracking state (not double-buffered; used only in monitor cycle).
 */
interface AgentCulturalProfile {
  agentId: string;
  /** Groups this agent belongs to */
  groups: Set<string>;
  /** Norms this agent has adopted */
  adoptedNorms: Set<string>;
  /** Timestamp of last event from this agent */
  lastEventTimestamp: number;
  /** Cooperation offers made by this agent */
  cooperationOffered: number;
  /** Cooperation offers accepted by this agent */
  cooperationAccepted: number;
  /** Defections by this agent */
  defections: number;
  /** Agents this agent has cooperated with */
  cooperatedWith: Set<string>;
  /** Per-dimension cultural position votes (aggregated from behavior) */
  dimensionVotes: Record<CulturalDimension, number[]>;
}

/**
 * Internal cooperation pair tracking.
 */
interface CooperationPair {
  agentA: string;
  agentB: string;
  cooperationCount: number;
  defectionCount: number;
  lastInteractionTimestamp: number;
}

// =============================================================================
// RESOLVED CONFIG
// =============================================================================

interface ResolvedConfig {
  monitorHz: number;
  ewmaAlpha: number;
  maxTrendSamples: number;
  stalenessThresholdMs: number;
  emergingThreshold: number;
  establishingThreshold: number;
  establishedThreshold: number;
  entrenchedThreshold: number;
  decliningVelocityThreshold: number;
  thrivingThreshold: number;
  stableThreshold: number;
  strainedThreshold: number;
  transitionThreshold: number;
  openBoundaryThreshold: number;
  permeableBoundaryThreshold: number;
  semiPermeableBoundaryThreshold: number;
  crystallizedThreshold: number;
  institutionalThreshold: number;
  decayingStabilityThreshold: number;
  strongMetanormMinCount: number;
  onAlert: (alert: CulturalHealthAlert) => void;
  onHealthChanged: (oldScore: number, newScore: number) => void;
  onCycleComplete: (snapshot: CulturalHealthSnapshot) => void;
}

// =============================================================================
// CULTURAL HEALTH MONITOR
// =============================================================================

/**
 * Real-time cultural health monitoring engine.
 *
 * Uses double-buffered state for lock-free reads on the render loop.
 * All computation runs off the render loop at configurable Hz.
 */
export class CulturalHealthMonitor {
  private readonly config: ResolvedConfig;

  // -- Double buffer --
  private bufferA: CulturalHealthState;
  private bufferB: CulturalHealthState;
  private frontIsA: boolean = true;

  // -- Internal tracking (not double-buffered) --
  private readonly agentProfiles: Map<string, AgentCulturalProfile> = new Map();
  private readonly cooperationPairs: Map<string, CooperationPair> = new Map();
  private readonly normAdherents: Map<string, Set<string>> = new Map(); // normId -> set of agentIds
  private readonly normEnforcers: Map<string, Set<string>> = new Map(); // normId -> set of enforcer agentIds
  private readonly groupMembers: Map<string, Set<string>> = new Map(); // groupId -> set of agentIds
  private readonly boundaryInteractions: Map<string, { interactions: number; transfers: number; failures: number }> = new Map();

  // -- Event queue --
  private eventQueue: CulturalEvent[] = [];

  // -- Monitor loop --
  private monitorIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  // -- Metrics --
  private totalEventsProcessed: number = 0;
  private totalAlertsGenerated: number = 0;
  private totalSwaps: number = 0;
  private cycleDurations: number[] = [];
  private readonly MAX_CYCLE_HISTORY = 60;

  constructor(config?: CulturalHealthMonitorConfig) {
    this.config = {
      monitorHz: config?.monitorHz ?? DEFAULT_CULTURAL_HEALTH_CONFIG.monitorHz,
      ewmaAlpha: config?.ewmaAlpha ?? DEFAULT_CULTURAL_HEALTH_CONFIG.ewmaAlpha,
      maxTrendSamples: config?.maxTrendSamples ?? DEFAULT_CULTURAL_HEALTH_CONFIG.maxTrendSamples,
      stalenessThresholdMs: config?.stalenessThresholdMs ?? DEFAULT_CULTURAL_HEALTH_CONFIG.stalenessThresholdMs,
      emergingThreshold: config?.emergingThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.emergingThreshold,
      establishingThreshold: config?.establishingThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.establishingThreshold,
      establishedThreshold: config?.establishedThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.establishedThreshold,
      entrenchedThreshold: config?.entrenchedThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.entrenchedThreshold,
      decliningVelocityThreshold: config?.decliningVelocityThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.decliningVelocityThreshold,
      thrivingThreshold: config?.thrivingThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.thrivingThreshold,
      stableThreshold: config?.stableThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.stableThreshold,
      strainedThreshold: config?.strainedThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.strainedThreshold,
      transitionThreshold: config?.transitionThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.transitionThreshold,
      openBoundaryThreshold: config?.openBoundaryThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.openBoundaryThreshold,
      permeableBoundaryThreshold: config?.permeableBoundaryThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.permeableBoundaryThreshold,
      semiPermeableBoundaryThreshold: config?.semiPermeableBoundaryThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.semiPermeableBoundaryThreshold,
      crystallizedThreshold: config?.crystallizedThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.crystallizedThreshold,
      institutionalThreshold: config?.institutionalThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.institutionalThreshold,
      decayingStabilityThreshold: config?.decayingStabilityThreshold ?? DEFAULT_CULTURAL_HEALTH_CONFIG.decayingStabilityThreshold,
      strongMetanormMinCount: config?.strongMetanormMinCount ?? DEFAULT_CULTURAL_HEALTH_CONFIG.strongMetanormMinCount,
      onAlert: config?.onAlert ?? (() => {}),
      onHealthChanged: config?.onHealthChanged ?? (() => {}),
      onCycleComplete: config?.onCycleComplete ?? (() => {}),
    };

    // Initialize double buffers
    this.bufferA = createEmptyCulturalHealthState();
    this.bufferB = createEmptyCulturalHealthState();

    if (config?.autoStart) {
      this.start();
    }

    logger.info('[CulturalHealthMonitor] Initialized', {
      monitorHz: this.config.monitorHz,
      ewmaAlpha: this.config.ewmaAlpha,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the monitor loop.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[CulturalHealthMonitor] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.config.monitorHz));
    this.monitorIntervalId = setInterval(() => this.monitorCycle(), intervalMs);
    this.isRunning = true;

    // Mark state as live
    this.getBackBuffer().isLive = true;

    logger.info('[CulturalHealthMonitor] Started', {
      hz: this.config.monitorHz,
      intervalMs,
    });
  }

  /**
   * Stop the monitor loop.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[CulturalHealthMonitor] Already stopped');
      return;
    }

    if (this.monitorIntervalId !== null) {
      clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
    this.isRunning = false;

    logger.info('[CulturalHealthMonitor] Stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.agentProfiles.clear();
    this.cooperationPairs.clear();
    this.normAdherents.clear();
    this.normEnforcers.clear();
    this.groupMembers.clear();
    this.boundaryInteractions.clear();
    this.eventQueue = [];
    this.bufferA = createEmptyCulturalHealthState();
    this.bufferB = createEmptyCulturalHealthState();

    logger.info('[CulturalHealthMonitor] Disposed');
  }

  // ===========================================================================
  // EVENT INGESTION (OFF render loop)
  // ===========================================================================

  /**
   * Ingest a cultural event for processing.
   * Events are queued and processed in the next monitor cycle.
   *
   * Cost: O(1) (queue push)
   */
  ingestEvent(event: CulturalEvent): void {
    this.eventQueue.push(event);

    // Auto-register agent if not tracked
    if (!this.agentProfiles.has(event.agentId)) {
      this.registerAgent(event.agentId);
    }
    if (event.targetAgentId && !this.agentProfiles.has(event.targetAgentId)) {
      this.registerAgent(event.targetAgentId);
    }
  }

  /**
   * Ingest multiple cultural events at once.
   */
  ingestEvents(events: CulturalEvent[]): void {
    for (const event of events) {
      this.ingestEvent(event);
    }
  }

  // ===========================================================================
  // AGENT / GROUP MANAGEMENT
  // ===========================================================================

  /**
   * Register an agent for cultural tracking.
   */
  registerAgent(agentId: string): void {
    if (this.agentProfiles.has(agentId)) return;

    this.agentProfiles.set(agentId, {
      agentId,
      groups: new Set(),
      adoptedNorms: new Set(),
      lastEventTimestamp: Date.now(),
      cooperationOffered: 0,
      cooperationAccepted: 0,
      defections: 0,
      cooperatedWith: new Set(),
      dimensionVotes: {
        individualism_collectivism: [],
        risk_tolerance: [],
        hierarchy_egalitarianism: [],
        competition_cooperation: [],
        innovation_tradition: [],
      },
    });

    logger.debug('[CulturalHealthMonitor] Agent registered', { agentId });
  }

  /**
   * Unregister an agent.
   */
  unregisterAgent(agentId: string): void {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) return;

    // Remove from all groups
    for (const groupId of profile.groups) {
      this.groupMembers.get(groupId)?.delete(agentId);
    }

    // Remove from all norm adherent sets
    for (const normId of profile.adoptedNorms) {
      this.normAdherents.get(normId)?.delete(agentId);
    }

    this.agentProfiles.delete(agentId);
    logger.debug('[CulturalHealthMonitor] Agent unregistered', { agentId });
  }

  /**
   * Get the number of tracked agents.
   */
  getPopulationSize(): number {
    return this.agentProfiles.size;
  }

  /**
   * Check if the monitor is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // DOUBLE-BUFFER ACCESS
  // ===========================================================================

  /**
   * Get the front buffer (read-only, used by renderer / WebSocket).
   *
   * Render-loop safe. O(1), zero allocation.
   */
  getFrontBuffer(): Readonly<CulturalHealthState> {
    return this.frontIsA ? this.bufferA : this.bufferB;
  }

  /**
   * Get a serializable snapshot of the current state.
   * Converts Maps to plain objects for JSON serialization.
   *
   * NOT render-loop safe (performs serialization).
   * Call from WebSocket broadcast callback, not from render path.
   */
  getSnapshot(): CulturalHealthSnapshot {
    return stateToSnapshot(this.getFrontBuffer());
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive monitor metrics.
   */
  getMetrics(): CulturalHealthMonitorMetrics {
    let averageCycleDuration = 0;
    if (this.cycleDurations.length > 0) {
      averageCycleDuration = this.cycleDurations.reduce((a, b) => a + b, 0) / this.cycleDurations.length;
    }

    const front = this.getFrontBuffer();

    return {
      isRunning: this.isRunning,
      monitorHz: this.config.monitorHz,
      totalEventsProcessed: this.totalEventsProcessed,
      pendingEventCount: this.eventQueue.length,
      trackedNormCount: front.norms.size,
      trackedGroupCount: this.groupMembers.size,
      detectedMetanormCount: front.metanormEmergence.metanorms.length,
      averageCycleDurationMs: Math.round(averageCycleDuration * 1000) / 1000,
      populationSize: this.agentProfiles.size,
      overallHealthScore: front.overallHealthScore,
      totalAlertsGenerated: this.totalAlertsGenerated,
      totalSwaps: this.totalSwaps,
    };
  }

  // ===========================================================================
  // MONITOR CYCLE (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Execute a single monitor cycle.
   * Processes queued events, updates all five subsystems, swaps buffers.
   */
  private monitorCycle(): void {
    const startTime = this.now();
    const now = Date.now();

    // Get the back buffer to write into
    const state = this.getBackBuffer();

    // 1. Drain and process event queue
    const events = this.eventQueue;
    this.eventQueue = [];

    for (const event of events) {
      this.processEvent(event, state);
      this.totalEventsProcessed++;
    }

    // 2. Update population metrics
    state.populationSize = this.agentProfiles.size;
    state.groupCount = this.groupMembers.size;

    // 3. Update norm adoption rates
    this.updateNormAdoption(state, now);

    // 4. Update cooperation indices
    this.updateCooperationIndices(state, now);

    // 5. Update cultural drift vectors
    this.updateCulturalDrift(state, now);

    // 6. Update boundary permeability
    this.updateBoundaryPermeability(state, now);

    // 7. Update metanorm emergence
    this.updateMetanormEmergence(state, now);

    // 8. Compute overall health score
    const oldHealthScore = state.overallHealthScore;
    state.overallHealthScore = this.computeOverallHealthScore(state);

    if (Math.abs(state.overallHealthScore - oldHealthScore) > 0.05) {
      this.config.onHealthChanged(oldHealthScore, state.overallHealthScore);
    }

    // 9. Update metadata
    state.sequence++;
    state.lastUpdateTimestamp = now;
    state.isLive = this.isRunning;

    // 10. Swap buffers
    this.swapBuffers();

    // 11. Track cycle duration
    const duration = this.now() - startTime;
    this.cycleDurations.push(duration);
    if (this.cycleDurations.length > this.MAX_CYCLE_HISTORY) {
      this.cycleDurations.shift();
    }

    // 12. Notify WebSocket subscribers
    this.config.onCycleComplete(this.getSnapshot());
  }

  // ===========================================================================
  // EVENT PROCESSING
  // ===========================================================================

  /**
   * Process a single cultural event and update internal tracking structures.
   */
  private processEvent(event: CulturalEvent, state: CulturalHealthState): void {
    const profile = this.agentProfiles.get(event.agentId);
    if (!profile) return;

    profile.lastEventTimestamp = event.timestamp;

    switch (event.type) {
      // -- Norm events --
      case 'norm_adopted':
        this.handleNormAdopted(event, profile, state);
        break;
      case 'norm_violated':
        this.handleNormViolated(event, profile, state);
        break;
      case 'norm_enforced':
        this.handleNormEnforced(event, profile, state);
        break;
      case 'norm_proposed':
        this.handleNormProposed(event, state);
        break;
      case 'norm_abandoned':
        this.handleNormAbandoned(event, profile, state);
        break;

      // -- Cooperation events --
      case 'cooperation_offered':
        this.handleCooperationOffered(event, profile);
        break;
      case 'cooperation_accepted':
        this.handleCooperationAccepted(event, profile);
        break;
      case 'cooperation_rejected':
        // Track rejection (no score change, just count)
        break;
      case 'defection_detected':
        this.handleDefection(event, profile);
        break;
      case 'reciprocity_observed':
        this.handleReciprocity(event, profile);
        break;

      // -- Group/boundary events --
      case 'group_joined':
        this.handleGroupJoined(event, profile);
        break;
      case 'group_left':
        this.handleGroupLeft(event, profile);
        break;
      case 'cross_group_interaction':
        this.handleCrossGroupInteraction(event);
        break;
      case 'norm_transferred':
        this.handleNormTransferred(event);
        break;
      case 'boundary_negotiation':
        // Track negotiation event
        break;

      // -- Metanorm events --
      case 'enforcement_rewarded':
        this.handleEnforcementRewarded(event, state);
        break;
      case 'enforcement_punished':
        this.handleEnforcementPunished(event, state);
        break;
      case 'enforcement_pattern':
        this.handleEnforcementPattern(event, state);
        break;
      case 'meta_norm_crystallized':
        this.handleMetanormCrystallized(event, state);
        break;
      case 'meta_norm_decayed':
        this.handleMetanormDecayed(event, state);
        break;
    }

    // Extract cultural dimension signals from events
    this.extractDimensionSignals(event, profile);
  }

  // ===========================================================================
  // NORM EVENT HANDLERS
  // ===========================================================================

  private handleNormAdopted(event: CulturalEvent, profile: AgentCulturalProfile, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    // Add to agent's adopted norms
    profile.adoptedNorms.add(normId);

    // Track in normAdherents
    if (!this.normAdherents.has(normId)) {
      this.normAdherents.set(normId, new Set());
    }
    this.normAdherents.get(normId)!.add(event.agentId);

    // Ensure norm exists in state
    if (!state.norms.has(normId)) {
      const description = (event.data['description'] as string) ?? normId;
      state.norms.set(normId, createEmptyTrackedNorm(normId, description));
    }

    const norm = state.norms.get(normId)!;
    norm.lastAdoptionTimestamp = event.timestamp;
  }

  private handleNormViolated(event: CulturalEvent, profile: AgentCulturalProfile, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    if (!state.norms.has(normId)) {
      state.norms.set(normId, createEmptyTrackedNorm(normId));
    }

    const norm = state.norms.get(normId)!;
    norm.violationCount++;
    norm.lastViolationTimestamp = event.timestamp;
  }

  private handleNormEnforced(event: CulturalEvent, profile: AgentCulturalProfile, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    if (!state.norms.has(normId)) {
      state.norms.set(normId, createEmptyTrackedNorm(normId));
    }

    const norm = state.norms.get(normId)!;
    norm.enforcementCount++;

    // Track enforcer
    if (!this.normEnforcers.has(normId)) {
      this.normEnforcers.set(normId, new Set());
    }
    this.normEnforcers.get(normId)!.add(event.agentId);
  }

  private handleNormProposed(event: CulturalEvent, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    if (!state.norms.has(normId)) {
      const description = (event.data['description'] as string) ?? normId;
      state.norms.set(normId, createEmptyTrackedNorm(normId, description));
    }
  }

  private handleNormAbandoned(event: CulturalEvent, profile: AgentCulturalProfile, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    profile.adoptedNorms.delete(normId);
    this.normAdherents.get(normId)?.delete(event.agentId);
  }

  // ===========================================================================
  // COOPERATION EVENT HANDLERS
  // ===========================================================================

  private handleCooperationOffered(event: CulturalEvent, profile: AgentCulturalProfile): void {
    profile.cooperationOffered++;
  }

  private handleCooperationAccepted(event: CulturalEvent, profile: AgentCulturalProfile): void {
    profile.cooperationAccepted++;

    if (event.targetAgentId) {
      profile.cooperatedWith.add(event.targetAgentId);

      // Track cooperation pair
      const pairKey = this.makePairKey(event.agentId, event.targetAgentId);
      if (!this.cooperationPairs.has(pairKey)) {
        this.cooperationPairs.set(pairKey, {
          agentA: event.agentId,
          agentB: event.targetAgentId,
          cooperationCount: 0,
          defectionCount: 0,
          lastInteractionTimestamp: event.timestamp,
        });
      }
      const pair = this.cooperationPairs.get(pairKey)!;
      pair.cooperationCount++;
      pair.lastInteractionTimestamp = event.timestamp;
    }
  }

  private handleDefection(event: CulturalEvent, profile: AgentCulturalProfile): void {
    profile.defections++;

    if (event.targetAgentId) {
      const pairKey = this.makePairKey(event.agentId, event.targetAgentId);
      if (!this.cooperationPairs.has(pairKey)) {
        this.cooperationPairs.set(pairKey, {
          agentA: event.agentId,
          agentB: event.targetAgentId,
          cooperationCount: 0,
          defectionCount: 0,
          lastInteractionTimestamp: event.timestamp,
        });
      }
      const pair = this.cooperationPairs.get(pairKey)!;
      pair.defectionCount++;
      pair.lastInteractionTimestamp = event.timestamp;
    }
  }

  private handleReciprocity(event: CulturalEvent, profile: AgentCulturalProfile): void {
    if (event.targetAgentId) {
      profile.cooperatedWith.add(event.targetAgentId);
    }
  }

  // ===========================================================================
  // GROUP/BOUNDARY EVENT HANDLERS
  // ===========================================================================

  private handleGroupJoined(event: CulturalEvent, profile: AgentCulturalProfile): void {
    const groupId = event.groupId;
    if (!groupId) return;

    profile.groups.add(groupId);

    if (!this.groupMembers.has(groupId)) {
      this.groupMembers.set(groupId, new Set());
    }
    this.groupMembers.get(groupId)!.add(event.agentId);
  }

  private handleGroupLeft(event: CulturalEvent, profile: AgentCulturalProfile): void {
    const groupId = event.groupId;
    if (!groupId) return;

    profile.groups.delete(groupId);
    this.groupMembers.get(groupId)?.delete(event.agentId);

    // Clean up empty groups
    if (this.groupMembers.has(groupId) && this.groupMembers.get(groupId)!.size === 0) {
      this.groupMembers.delete(groupId);
    }
  }

  private handleCrossGroupInteraction(event: CulturalEvent): void {
    const source = event.sourceGroupId;
    const target = event.targetGroupId;
    if (!source || !target) return;

    const boundaryKey = this.makeBoundaryKey(source, target);
    if (!this.boundaryInteractions.has(boundaryKey)) {
      this.boundaryInteractions.set(boundaryKey, { interactions: 0, transfers: 0, failures: 0 });
    }
    this.boundaryInteractions.get(boundaryKey)!.interactions++;
  }

  private handleNormTransferred(event: CulturalEvent): void {
    const source = event.sourceGroupId;
    const target = event.targetGroupId;
    if (!source || !target) return;

    const boundaryKey = this.makeBoundaryKey(source, target);
    if (!this.boundaryInteractions.has(boundaryKey)) {
      this.boundaryInteractions.set(boundaryKey, { interactions: 0, transfers: 0, failures: 0 });
    }

    const success = event.data['success'] !== false;
    const boundary = this.boundaryInteractions.get(boundaryKey)!;
    if (success) {
      boundary.transfers++;
    } else {
      boundary.failures++;
    }
  }

  // ===========================================================================
  // METANORM EVENT HANDLERS
  // ===========================================================================

  private handleEnforcementRewarded(event: CulturalEvent, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    const metanorm = this.findOrCreateMetanorm(normId, state);
    metanorm.rewardCount++;
  }

  private handleEnforcementPunished(event: CulturalEvent, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    const metanorm = this.findOrCreateMetanorm(normId, state);
    metanorm.punishmentCount++;
  }

  private handleEnforcementPattern(event: CulturalEvent, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    const metanorm = this.findOrCreateMetanorm(normId, state);
    // Pattern detection strengthens the metanorm
    if (metanorm.maturity === 'nascent') {
      metanorm.maturity = 'developing';
    }
  }

  private handleMetanormCrystallized(event: CulturalEvent, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    const metanorm = this.findOrCreateMetanorm(normId, state);
    metanorm.maturity = 'crystallized';

    this.emitAlert('info', 'metanorm', `Metanorm crystallized for norm "${normId}"`, [normId]);
  }

  private handleMetanormDecayed(event: CulturalEvent, state: CulturalHealthState): void {
    const normId = event.normId;
    if (!normId) return;

    const metanorm = this.findOrCreateMetanorm(normId, state);
    metanorm.maturity = 'decaying';

    this.emitAlert('warning', 'metanorm', `Metanorm decaying for norm "${normId}"`, [normId]);
  }

  // ===========================================================================
  // DIMENSION SIGNAL EXTRACTION
  // ===========================================================================

  /**
   * Extract cultural dimension signals from events.
   * Maps event types to dimension votes for drift calculation.
   */
  private extractDimensionSignals(event: CulturalEvent, profile: AgentCulturalProfile): void {
    const maxVotes = 50; // Keep last 50 votes per dimension

    // Cooperation events signal on competition_cooperation dimension
    if (event.type === 'cooperation_accepted' || event.type === 'reciprocity_observed') {
      profile.dimensionVotes.competition_cooperation.push(1.0); // cooperation pole
    } else if (event.type === 'defection_detected') {
      profile.dimensionVotes.competition_cooperation.push(-1.0); // competition pole
    }

    // Group events signal on individualism_collectivism
    if (event.type === 'group_joined') {
      profile.dimensionVotes.individualism_collectivism.push(1.0); // collectivism
    } else if (event.type === 'group_left') {
      profile.dimensionVotes.individualism_collectivism.push(-1.0); // individualism
    }

    // Norm events signal on innovation_tradition
    if (event.type === 'norm_proposed') {
      profile.dimensionVotes.innovation_tradition.push(-1.0); // innovation (new norms)
    } else if (event.type === 'norm_enforced') {
      profile.dimensionVotes.innovation_tradition.push(1.0); // tradition (enforce existing)
    }

    // Enforcement events signal on hierarchy_egalitarianism
    if (event.type === 'enforcement_rewarded' || event.type === 'enforcement_punished') {
      profile.dimensionVotes.hierarchy_egalitarianism.push(1.0); // hierarchy (enforcement)
    }

    // Cross-group events signal on risk_tolerance
    if (event.type === 'cross_group_interaction' || event.type === 'norm_transferred') {
      profile.dimensionVotes.risk_tolerance.push(1.0); // risk-tolerant (boundary crossing)
    }

    // Trim vote history
    for (const dim of Object.keys(profile.dimensionVotes) as CulturalDimension[]) {
      if (profile.dimensionVotes[dim].length > maxVotes) {
        profile.dimensionVotes[dim] = profile.dimensionVotes[dim].slice(-maxVotes);
      }
    }
  }

  // ===========================================================================
  // SUBSYSTEM 1: NORM ADOPTION
  // ===========================================================================

  private updateNormAdoption(state: CulturalHealthState, now: number): void {
    const populationSize = this.agentProfiles.size;
    if (populationSize === 0) return;

    // Reset lifecycle counts
    const counts: Record<NormLifecycleState, number> = {
      proposed: 0, emerging: 0, establishing: 0,
      established: 0, entrenched: 0, declining: 0, abandoned: 0,
    };

    let totalAdoptionRate = 0;
    let normCount = 0;

    for (const [normId, norm] of state.norms) {
      const adherentCount = this.normAdherents.get(normId)?.size ?? 0;
      const previousRate = norm.adoptionRate;

      norm.adherentCount = adherentCount;
      norm.populationSize = populationSize;
      norm.adoptionRate = adherentCount / populationSize;

      // EWMA smoothing
      norm.smoothedAdoptionRate = this.ewma(
        norm.smoothedAdoptionRate,
        norm.adoptionRate,
        this.config.ewmaAlpha,
      );

      // Adoption velocity (rate of change)
      const timeDeltaSec = norm.adoptionTrend.length > 0
        ? (now - norm.adoptionTrend[norm.adoptionTrend.length - 1].timestamp) / 1000
        : 1;
      if (timeDeltaSec > 0) {
        norm.adoptionVelocity = (norm.adoptionRate - previousRate) / timeDeltaSec;
      }

      // Enforcement ratio
      const totalEnforcementEvents = norm.enforcementCount + norm.violationCount;
      norm.enforcementRatio = totalEnforcementEvents > 0
        ? norm.enforcementCount / totalEnforcementEvents
        : 0;

      // Update lifecycle state
      norm.lifecycleState = this.computeNormLifecycleState(norm);

      // Add trend sample
      this.addTrendSample(norm.adoptionTrend, now, norm.smoothedAdoptionRate);

      counts[norm.lifecycleState]++;
      totalAdoptionRate += norm.adoptionRate;
      normCount++;
    }

    state.normLifecycleCounts = counts;
    state.averageAdoptionRate = normCount > 0 ? totalAdoptionRate / normCount : 0;
  }

  private computeNormLifecycleState(norm: TrackedNorm): NormLifecycleState {
    const rate = norm.smoothedAdoptionRate;

    // Check for declining state first (velocity-based)
    if (norm.adoptionVelocity < this.config.decliningVelocityThreshold && rate < this.config.establishedThreshold) {
      if (rate < 0.01) return 'abandoned';
      return 'declining';
    }

    if (rate >= this.config.entrenchedThreshold) return 'entrenched';
    if (rate >= this.config.establishedThreshold) return 'established';
    if (rate >= this.config.establishingThreshold) return 'establishing';
    if (rate >= this.config.emergingThreshold) return 'emerging';
    return 'proposed';
  }

  // ===========================================================================
  // SUBSYSTEM 2: COOPERATION INDICES
  // ===========================================================================

  private updateCooperationIndices(state: CulturalHealthState, now: number): void {
    // Population-level cooperation
    let totalAcceptances = 0;
    let totalDefections = 0;
    let totalOffers = 0;
    const cooperatingPairSet = new Set<string>();

    for (const profile of this.agentProfiles.values()) {
      totalAcceptances += profile.cooperationAccepted;
      totalDefections += profile.defections;
      totalOffers += profile.cooperationOffered;
    }

    for (const pair of this.cooperationPairs.values()) {
      if (pair.cooperationCount > 0) {
        cooperatingPairSet.add(this.makePairKey(pair.agentA, pair.agentB));
      }
    }

    const totalInteractions = totalAcceptances + totalDefections;
    const cooperationRatio = totalInteractions > 0 ? totalAcceptances / totalInteractions : 1.0;

    const popCoop = state.populationCooperation;
    popCoop.cooperationOffers = totalOffers;
    popCoop.cooperationAcceptances = totalAcceptances;
    popCoop.defections = totalDefections;
    popCoop.cooperationRatio = cooperationRatio;
    popCoop.smoothedCooperationRatio = this.ewma(
      popCoop.smoothedCooperationRatio,
      cooperationRatio,
      this.config.ewmaAlpha,
    );
    popCoop.uniqueCooperatingPairs = cooperatingPairSet.size;
    popCoop.health = this.classifyCooperationHealth(popCoop.smoothedCooperationRatio);

    // Reciprocity index: fraction of pairs where both agents cooperated
    let reciprocalPairs = 0;
    for (const pair of this.cooperationPairs.values()) {
      if (pair.cooperationCount >= 2) { // At least 2 cooperations suggests reciprocity
        reciprocalPairs++;
      }
    }
    popCoop.reciprocityIndex = this.cooperationPairs.size > 0
      ? reciprocalPairs / this.cooperationPairs.size
      : 0;

    this.addTrendSample(popCoop.cooperationTrend, now, popCoop.smoothedCooperationRatio);

    // Per-group cooperation indices
    for (const [groupId, members] of this.groupMembers) {
      if (!state.groupCooperation.has(groupId)) {
        state.groupCooperation.set(groupId, createEmptyCooperationIndex());
      }

      const groupCoop = state.groupCooperation.get(groupId)!;
      let groupAcceptances = 0;
      let groupDefections = 0;
      let groupOffers = 0;

      for (const memberId of members) {
        const profile = this.agentProfiles.get(memberId);
        if (profile) {
          groupAcceptances += profile.cooperationAccepted;
          groupDefections += profile.defections;
          groupOffers += profile.cooperationOffered;
        }
      }

      const groupTotal = groupAcceptances + groupDefections;
      const groupRatio = groupTotal > 0 ? groupAcceptances / groupTotal : 1.0;

      groupCoop.cooperationOffers = groupOffers;
      groupCoop.cooperationAcceptances = groupAcceptances;
      groupCoop.defections = groupDefections;
      groupCoop.cooperationRatio = groupRatio;
      groupCoop.smoothedCooperationRatio = this.ewma(
        groupCoop.smoothedCooperationRatio,
        groupRatio,
        this.config.ewmaAlpha,
      );
      groupCoop.health = this.classifyCooperationHealth(groupCoop.smoothedCooperationRatio);

      this.addTrendSample(groupCoop.cooperationTrend, now, groupCoop.smoothedCooperationRatio);
    }

    // Check for cooperation alerts
    if (popCoop.health === 'fractured') {
      this.emitAlert('critical', 'cooperation', 'Population cooperation has fractured. Widespread defection detected.', []);
    } else if (popCoop.health === 'strained') {
      this.emitAlert('warning', 'cooperation', 'Population cooperation is strained. Rising defection rates.', []);
    }
  }

  private classifyCooperationHealth(ratio: number): CooperationHealth {
    if (ratio >= this.config.thrivingThreshold) return 'thriving';
    if (ratio >= this.config.stableThreshold) return 'stable';
    if (ratio >= this.config.strainedThreshold) return 'strained';
    return 'fractured';
  }

  // ===========================================================================
  // SUBSYSTEM 3: CULTURAL DRIFT
  // ===========================================================================

  private updateCulturalDrift(state: CulturalHealthState, now: number): void {
    const dimensions = Object.keys(state.culturalDrift.dimensions) as CulturalDimension[];
    let totalStability = 0;
    let totalMagnitudeSq = 0;
    let dominantDimension: CulturalDimension = dimensions[0];
    let maxMagnitude = 0;

    for (const dim of dimensions) {
      const vector = state.culturalDrift.dimensions[dim];

      // Aggregate dimension votes from all agents
      let voteSum = 0;
      let voteCount = 0;
      for (const profile of this.agentProfiles.values()) {
        const votes = profile.dimensionVotes[dim];
        for (const vote of votes) {
          voteSum += vote;
          voteCount++;
        }
      }

      const previousPosition = vector.currentPosition;
      const newPosition = voteCount > 0 ? voteSum / voteCount : 0;

      // EWMA-smooth the position
      vector.previousPosition = previousPosition;
      vector.currentPosition = this.ewma(vector.currentPosition, newPosition, this.config.ewmaAlpha);

      // Calculate drift rate
      const timeDeltaSec = vector.positionTrend.length > 0
        ? (now - vector.positionTrend[vector.positionTrend.length - 1].timestamp) / 1000
        : 1;
      if (timeDeltaSec > 0) {
        vector.driftRate = (vector.currentPosition - previousPosition) / timeDeltaSec;
      }
      vector.smoothedDriftRate = this.ewma(vector.smoothedDriftRate, vector.driftRate, this.config.ewmaAlpha);
      vector.magnitude = Math.abs(vector.smoothedDriftRate);
      vector.direction = vector.smoothedDriftRate > 0 ? 1 : vector.smoothedDriftRate < 0 ? -1 : 0;
      vector.stability = Math.max(0, 1.0 - vector.magnitude * 10); // Scale factor to normalize

      totalStability += vector.stability;
      totalMagnitudeSq += vector.magnitude * vector.magnitude;

      if (vector.magnitude > maxMagnitude) {
        maxMagnitude = vector.magnitude;
        dominantDimension = dim;
      }

      this.addTrendSample(vector.positionTrend, now, vector.currentPosition);
    }

    state.culturalDrift.overallStability = totalStability / dimensions.length;
    state.culturalDrift.totalDriftMagnitude = Math.sqrt(totalMagnitudeSq);
    state.culturalDrift.dominantDimension = dominantDimension;
    state.culturalDrift.isTransitioning = state.culturalDrift.totalDriftMagnitude > this.config.transitionThreshold;

    if (state.culturalDrift.isTransitioning) {
      this.emitAlert('info', 'drift', `Cultural transition detected. Dominant drift: ${dominantDimension}`, []);
    }
  }

  // ===========================================================================
  // SUBSYSTEM 4: BOUNDARY PERMEABILITY
  // ===========================================================================

  private updateBoundaryPermeability(state: CulturalHealthState, now: number): void {
    const boundaries: GroupBoundary[] = [];

    for (const [key, data] of this.boundaryInteractions) {
      const [sourceGroupId, targetGroupId] = key.split('::');

      const totalTransferAttempts = data.transfers + data.failures;
      const transferSuccessRate = totalTransferAttempts > 0 ? data.transfers / totalTransferAttempts : 0;

      // Check for reverse direction
      const reverseKey = `${targetGroupId}::${sourceGroupId}`;
      const reverseData = this.boundaryInteractions.get(reverseKey);
      const reverseTransfers = reverseData ? reverseData.transfers : 0;

      // Asymmetry ratio
      const maxTransfers = Math.max(data.transfers, reverseTransfers);
      const minTransfers = Math.min(data.transfers, reverseTransfers);
      const asymmetryRatio = maxTransfers > 0 ? 1 - (minTransfers / maxTransfers) : 0;

      const boundary: GroupBoundary = {
        sourceGroupId,
        targetGroupId,
        interactionCount: data.interactions,
        normTransferCount: data.transfers,
        failedTransferCount: data.failures,
        transferSuccessRate,
        smoothedTransferRate: transferSuccessRate, // Will be EWMA'd over time
        permeability: this.classifyPermeability(transferSuccessRate),
        isBidirectional: asymmetryRatio < 0.3,
        asymmetryRatio,
        transferTrend: [],
      };

      boundaries.push(boundary);
    }

    // Update boundary state
    const bState = state.boundaryPermeability;
    bState.boundaries = boundaries;
    bState.groupCount = this.groupMembers.size;

    if (boundaries.length > 0) {
      bState.averagePermeability = boundaries.reduce((sum, b) => sum + b.transferSuccessRate, 0) / boundaries.length;

      // Find extremes
      let most: GroupBoundary | null = null;
      let least: GroupBoundary | null = null;
      for (const b of boundaries) {
        if (!most || b.transferSuccessRate > most.transferSuccessRate) most = b;
        if (!least || b.transferSuccessRate < least.transferSuccessRate) least = b;
      }
      bState.mostPermeableBoundary = most;
      bState.leastPermeableBoundary = least;

      // Network connectivity: fraction of possible group pairs that have interactions
      const possiblePairs = bState.groupCount * (bState.groupCount - 1) / 2;
      bState.networkConnectivity = possiblePairs > 0 ? boundaries.length / possiblePairs : 0;

      bState.overallPermeability = this.classifyPermeability(bState.averagePermeability);
    } else {
      bState.averagePermeability = 0;
      bState.mostPermeableBoundary = null;
      bState.leastPermeableBoundary = null;
      bState.networkConnectivity = 0;
      bState.overallPermeability = 'closed';
    }
  }

  private classifyPermeability(rate: number): PermeabilityLevel {
    if (rate >= this.config.openBoundaryThreshold) return 'open';
    if (rate >= this.config.permeableBoundaryThreshold) return 'permeable';
    if (rate >= this.config.semiPermeableBoundaryThreshold) return 'semi_permeable';
    return 'closed';
  }

  // ===========================================================================
  // SUBSYSTEM 5: METANORM EMERGENCE
  // ===========================================================================

  private updateMetanormEmergence(state: CulturalHealthState, now: number): void {
    const metanorms = state.metanormEmergence.metanorms;

    let activeCount = 0;
    let emergingCount = 0;
    let decayingCount = 0;
    let totalStability = 0;
    let stableCount = 0;

    for (const metanorm of metanorms) {
      // Update enforcer count
      const enforcers = this.normEnforcers.get(metanorm.baseNormId);
      metanorm.enforcerCount = enforcers?.size ?? 0;

      // Potential enforcer count = all agents who adopted the base norm
      const adherents = this.normAdherents.get(metanorm.baseNormId);
      metanorm.potentialEnforcerCount = adherents?.size ?? 0;

      // Participation rate
      metanorm.participationRate = metanorm.potentialEnforcerCount > 0
        ? metanorm.enforcerCount / metanorm.potentialEnforcerCount
        : 0;
      metanorm.smoothedParticipationRate = this.ewma(
        metanorm.smoothedParticipationRate,
        metanorm.participationRate,
        this.config.ewmaAlpha,
      );

      // Reinforcement strength (rewards + punishments per minute)
      const totalReinforcement = metanorm.rewardCount + metanorm.punishmentCount;
      const ageMinutes = (now - metanorm.firstDetectedTimestamp) / 60_000;
      metanorm.reinforcementStrength = ageMinutes > 0 ? totalReinforcement / ageMinutes : 0;

      // Stability: based on participation rate consistency
      metanorm.stabilityScore = this.ewma(
        metanorm.stabilityScore,
        metanorm.smoothedParticipationRate,
        this.config.ewmaAlpha * 0.5, // Slower alpha for stability
      );

      // Update maturity based on thresholds
      this.updateMetanormMaturity(metanorm);

      // Count by maturity
      if (metanorm.maturity === 'crystallized' || metanorm.maturity === 'institutional') {
        activeCount++;
        totalStability += metanorm.stabilityScore;
        stableCount++;
      } else if (metanorm.maturity === 'nascent' || metanorm.maturity === 'developing') {
        emergingCount++;
      } else if (metanorm.maturity === 'decaying') {
        decayingCount++;
      }

      this.addTrendSample(metanorm.participationTrend, now, metanorm.smoothedParticipationRate);
    }

    const normCount = state.norms.size;

    state.metanormEmergence.activeMetanormCount = activeCount;
    state.metanormEmergence.emergingMetanormCount = emergingCount;
    state.metanormEmergence.decayingMetanormCount = decayingCount;
    state.metanormEmergence.metanormDensity = normCount > 0 ? activeCount / normCount : 0;
    state.metanormEmergence.averageStability = stableCount > 0 ? totalStability / stableCount : 0;
    state.metanormEmergence.hasStrongMetanorms = activeCount >= this.config.strongMetanormMinCount;
  }

  private updateMetanormMaturity(metanorm: DetectedMetanorm): void {
    const rate = metanorm.smoothedParticipationRate;
    const stability = metanorm.stabilityScore;

    // Decaying takes precedence if stability drops
    if (stability < this.config.decayingStabilityThreshold && metanorm.maturity !== 'nascent') {
      metanorm.maturity = 'decaying';
      return;
    }

    if (rate >= this.config.institutionalThreshold) {
      metanorm.maturity = 'institutional';
    } else if (rate >= this.config.crystallizedThreshold) {
      metanorm.maturity = 'crystallized';
    } else if (metanorm.maturity === 'nascent' && (metanorm.rewardCount + metanorm.punishmentCount) > 0) {
      metanorm.maturity = 'developing';
    }
  }

  // ===========================================================================
  // OVERALL HEALTH SCORE
  // ===========================================================================

  /**
   * Compute the overall cultural health score as a weighted composite.
   *
   * Components:
   *   - Norm ecosystem health (25%): weighted by adoption rate distribution
   *   - Cooperation index (25%): population cooperation ratio
   *   - Cultural stability (20%): inverse of drift magnitude
   *   - Boundary connectivity (15%): network connectivity and permeability
   *   - Metanorm strength (15%): metanorm density and stability
   */
  private computeOverallHealthScore(state: CulturalHealthState): number {
    // 1. Norm ecosystem health: prefer a mix of established norms
    const normHealth = this.computeNormEcosystemHealth(state);

    // 2. Cooperation: use smoothed population cooperation ratio
    const cooperationHealth = state.populationCooperation.smoothedCooperationRatio;

    // 3. Cultural stability: from drift state
    const stabilityHealth = state.culturalDrift.overallStability;

    // 4. Boundary connectivity
    const boundaryHealth = Math.min(1.0, state.boundaryPermeability.averagePermeability + state.boundaryPermeability.networkConnectivity * 0.5);

    // 5. Metanorm strength
    const metanormHealth = state.metanormEmergence.hasStrongMetanorms
      ? Math.min(1.0, state.metanormEmergence.averageStability + state.metanormEmergence.metanormDensity)
      : state.metanormEmergence.metanormDensity * 0.5;

    const weighted =
      normHealth * 0.25 +
      cooperationHealth * 0.25 +
      stabilityHealth * 0.20 +
      boundaryHealth * 0.15 +
      metanormHealth * 0.15;

    return Math.max(0, Math.min(1, weighted));
  }

  private computeNormEcosystemHealth(state: CulturalHealthState): number {
    const counts = state.normLifecycleCounts;
    const total = state.norms.size;
    if (total === 0) return 0.5; // Neutral when no norms exist

    // Score: established and entrenched norms are healthy; abandoned and declining are unhealthy
    const healthyCount = counts.established + counts.entrenched;
    const growingCount = counts.emerging + counts.establishing;
    const unhealthyCount = counts.declining + counts.abandoned;

    const healthScore = (healthyCount * 1.0 + growingCount * 0.7 + counts.proposed * 0.5 - unhealthyCount * 0.3) / total;
    return Math.max(0, Math.min(1, healthScore));
  }

  // ===========================================================================
  // DOUBLE BUFFER INTERNALS
  // ===========================================================================

  private getBackBuffer(): CulturalHealthState {
    return this.frontIsA ? this.bufferB : this.bufferA;
  }

  /**
   * Swap front and back buffers.
   * After swap, deep copy front -> back so the writer starts from latest state.
   */
  private swapBuffers(): void {
    this.frontIsA = !this.frontIsA;

    // Deep copy front -> back for continuity
    const front = this.frontIsA ? this.bufferA : this.bufferB;
    const back = this.frontIsA ? this.bufferB : this.bufferA;
    this.deepCopyState(front, back);

    this.totalSwaps++;
  }

  /**
   * Deep copy CulturalHealthState.
   * Maps require special handling since structuredClone does not perfectly
   * clone Maps in all environments.
   */
  private deepCopyState(source: CulturalHealthState, target: CulturalHealthState): void {
    // Copy scalar fields
    target.averageAdoptionRate = source.averageAdoptionRate;
    target.populationSize = source.populationSize;
    target.groupCount = source.groupCount;
    target.overallHealthScore = source.overallHealthScore;
    target.sequence = source.sequence;
    target.lastUpdateTimestamp = source.lastUpdateTimestamp;
    target.isLive = source.isLive;

    // Deep copy normLifecycleCounts
    target.normLifecycleCounts = { ...source.normLifecycleCounts };

    // Deep copy norms map
    target.norms.clear();
    for (const [id, norm] of source.norms) {
      target.norms.set(id, {
        ...norm,
        adoptionTrend: [...norm.adoptionTrend],
      });
    }

    // Deep copy population cooperation
    target.populationCooperation = {
      ...source.populationCooperation,
      cooperationTrend: [...source.populationCooperation.cooperationTrend],
    };

    // Deep copy group cooperation map
    target.groupCooperation.clear();
    for (const [id, coop] of source.groupCooperation) {
      target.groupCooperation.set(id, {
        ...coop,
        cooperationTrend: [...coop.cooperationTrend],
      });
    }

    // Deep copy cultural drift
    target.culturalDrift = {
      ...source.culturalDrift,
      dimensions: {} as Record<CulturalDimension, CulturalDriftVector>,
    };
    for (const dim of Object.keys(source.culturalDrift.dimensions) as CulturalDimension[]) {
      target.culturalDrift.dimensions[dim] = {
        ...source.culturalDrift.dimensions[dim],
        positionTrend: [...source.culturalDrift.dimensions[dim].positionTrend],
      };
    }

    // Deep copy boundary permeability
    target.boundaryPermeability = {
      ...source.boundaryPermeability,
      boundaries: source.boundaryPermeability.boundaries.map(b => ({
        ...b,
        transferTrend: [...b.transferTrend],
      })),
    };

    // Deep copy metanorm emergence
    target.metanormEmergence = {
      ...source.metanormEmergence,
      metanorms: source.metanormEmergence.metanorms.map(m => ({
        ...m,
        participationTrend: [...m.participationTrend],
      })),
    };
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * EWMA: Exponentially Weighted Moving Average.
   */
  private ewma(current: number, newValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * current;
  }

  /**
   * Add a time-series sample, maintaining max length.
   */
  private addTrendSample(trend: TimeSample[], timestamp: number, value: number): void {
    trend.push({ timestamp, value });
    if (trend.length > this.config.maxTrendSamples) {
      trend.shift();
    }
  }

  /**
   * Create a canonical pair key for two agents (order-independent).
   */
  private makePairKey(a: string, b: string): string {
    return a < b ? `${a}::${b}` : `${b}::${a}`;
  }

  /**
   * Create a boundary key for two groups (order-dependent for directionality).
   */
  private makeBoundaryKey(source: string, target: string): string {
    return `${source}::${target}`;
  }

  /**
   * Find or create a metanorm for a given base norm.
   */
  private findOrCreateMetanorm(baseNormId: string, state: CulturalHealthState): DetectedMetanorm {
    const existing = state.metanormEmergence.metanorms.find(m => m.baseNormId === baseNormId);
    if (existing) return existing;

    const metanorm: DetectedMetanorm = {
      metanormId: `metanorm-${baseNormId}`,
      baseNormId,
      description: `Enforcement norm for "${baseNormId}"`,
      firstDetectedTimestamp: Date.now(),
      maturity: 'nascent',
      enforcerCount: 0,
      potentialEnforcerCount: 0,
      participationRate: 0,
      smoothedParticipationRate: 0,
      rewardCount: 0,
      punishmentCount: 0,
      reinforcementStrength: 0,
      stabilityScore: 0.5,
      participationTrend: [],
    };

    state.metanormEmergence.metanorms.push(metanorm);
    return metanorm;
  }

  /**
   * Emit a cultural health alert.
   */
  private emitAlert(
    severity: CulturalAlertSeverity,
    subsystem: CulturalHealthAlert['subsystem'],
    message: string,
    relatedIds: string[],
  ): void {
    const alert: CulturalHealthAlert = {
      id: createCulturalAlertId(),
      severity,
      subsystem,
      message,
      timestamp: Date.now(),
      relatedIds,
      acknowledged: false,
    };

    this.totalAlertsGenerated++;
    this.config.onAlert(alert);

    logger.info('[CulturalHealthMonitor] Alert emitted', {
      severity,
      subsystem,
      message,
    });
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
 * Create a CulturalHealthMonitor instance with the given configuration.
 *
 * @param config - Monitor configuration
 * @returns Configured CulturalHealthMonitor instance
 *
 * @example
 * ```typescript
 * const monitor = createCulturalHealthMonitor({
 *   monitorHz: 2,
 *   onCycleComplete: (snapshot) => wsServer.broadcast(snapshot),
 * });
 * monitor.start();
 * ```
 */
export function createCulturalHealthMonitor(
  config?: CulturalHealthMonitorConfig,
): CulturalHealthMonitor {
  return new CulturalHealthMonitor(config);
}
