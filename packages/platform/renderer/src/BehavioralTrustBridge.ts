/**
 * BehavioralTrustBridge
 *
 * Observes avatar state from AgentCommunicationManager / AgentStateBuffer
 * each tick and generates behavioral events for BehavioralTrustScoring.
 *
 * PROBLEM: BehavioralTrustScoring needs a stream of BehavioralEvents
 * (position_update, velocity_report, chat_message, heartbeat, etc.) to
 * score agent trust. These events must originate from actual avatar state
 * changes in the world, but the scoring engine has no direct connection
 * to the AgentCommunicationManager or AgentStateBuffer.
 *
 * SOLUTION: This bridge runs an observation loop at a configurable rate
 * (default 5Hz), reads the front buffer of the AgentStateBuffer, diffs
 * it against previous observations, and generates the appropriate
 * BehavioralEvents into the BehavioralTrustScoring engine.
 *
 * DESIGN PRINCIPLES:
 * - OFF the render loop: Observation runs on its own setInterval timer,
 *   completely decoupled from the 90Hz VR render path.
 * - Front buffer only: Reads the AgentStateBuffer front buffer (O(1),
 *   zero allocation, render-loop safe).
 * - Zero allocation in hot path: Reuses internal state maps, no per-tick
 *   allocations beyond event objects.
 * - World bounds and zone definitions for spatial compliance.
 * - Impossible movement detection: Compares consecutive position samples
 *   against a configurable max velocity threshold.
 *
 * DATA FLOW:
 * ```
 *   AgentCommunicationManager
 *        |
 *        v
 *   AgentStateBuffer.getFrontBuffer()      <-- Observation reads (OFF render loop)
 *        |
 *        v
 *   BehavioralTrustBridge.observationTick() <-- Configurable Hz (default 5Hz)
 *        ├── Diff positions  -> position_update events
 *        ├── Calc velocity   -> velocity_report events
 *        ├── Detect speed hack -> impossible_movement events
 *        ├── Detect chat     -> chat_message events
 *        ├── Check heartbeat -> heartbeat events
 *        ├── Check bounds    -> bounds_violation events
 *        └── Check zones     -> zone_entry / zone_exit events
 *        |
 *        v
 *   BehavioralTrustScoring.ingestEvent()   <-- Events queued for scoring
 * ```
 *
 * @module BehavioralTrustBridge
 */

import { logger } from './logger';
import type { Vec3, AgentWorldState, AgentAvatarState } from './AgentStateBuffer';
import type { AgentStateBuffer } from './AgentStateBuffer';
import type {
  BehavioralTrustScoring,
  BehavioralEvent,
} from './BehavioralTrustScoring';

// =============================================================================
// TYPES
// =============================================================================

/**
 * An axis-aligned bounding box for world bounds or zone definitions.
 */
export interface BoundingBox {
  /** Minimum corner (x, y, z) */
  min: Vec3;
  /** Maximum corner (x, y, z) */
  max: Vec3;
}

/**
 * A named spatial zone within the world.
 */
export interface ZoneDefinition {
  /** Unique zone identifier */
  id: string;
  /** Human-readable zone name */
  name: string;
  /** Bounding box of the zone */
  bounds: BoundingBox;
  /** Whether the zone is restricted (entering generates violation) */
  restricted: boolean;
}

/**
 * Per-agent snapshot of the last observed state.
 * Used to diff against the current state to detect changes.
 */
interface AgentObservation {
  /** Last observed position */
  position: Vec3;
  /** Timestamp of last position observation */
  positionTimestamp: number;
  /** Last computed velocity (units/second) */
  velocity: number;
  /** Last observed speech text (to detect new chat messages) */
  speechText: string;
  /** Last heartbeat timestamp (lastUpdateTimestamp from avatar state) */
  lastUpdateTimestamp: number;
  /** Set of zone IDs the agent is currently inside */
  insideZones: Set<string>;
}

/**
 * Configuration for the BehavioralTrustBridge.
 */
export interface BehavioralTrustBridgeConfig {
  /** Observation frequency in Hz (default: 5) */
  observationHz?: number;
  /** World bounds AABB. Positions outside trigger bounds_violation events. */
  worldBounds?: BoundingBox;
  /** Zone definitions for spatial compliance tracking */
  zones?: ZoneDefinition[];
  /** Maximum velocity in units/second before triggering impossible_movement (default: 20) */
  maxVelocityThreshold?: number;
  /**
   * Heartbeat staleness threshold in ms.
   * If an agent's lastUpdateTimestamp has not advanced in this period,
   * no heartbeat event is generated (the scoring engine handles missed
   * heartbeats via its own decay). Default: 10000
   */
  heartbeatStalenessMs?: number;
  /** Whether to auto-start the observation loop (default: false) */
  autoStart?: boolean;
}

/**
 * Metrics tracked by the BehavioralTrustBridge.
 */
export interface BehavioralTrustBridgeMetrics {
  /** Whether the observation loop is running */
  isRunning: boolean;
  /** Observation frequency in Hz */
  observationHz: number;
  /** Total observation ticks executed */
  totalTicks: number;
  /** Total events generated and forwarded to scoring */
  totalEventsGenerated: number;
  /** Total impossible movement detections */
  totalImpossibleMovements: number;
  /** Total bounds violations detected */
  totalBoundsViolations: number;
  /** Total zone entries detected */
  totalZoneEntries: number;
  /** Total zone exits detected */
  totalZoneExits: number;
  /** Number of agents currently observed */
  observedAgentCount: number;
  /** Average observation tick duration in ms */
  averageTickDurationMs: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_OBSERVATION_HZ = 5;
const DEFAULT_MAX_VELOCITY_THRESHOLD = 20;
const DEFAULT_HEARTBEAT_STALENESS_MS = 10_000;
const MAX_TICK_DURATION_HISTORY = 60;

// =============================================================================
// BEHAVIORAL TRUST BRIDGE
// =============================================================================

/**
 * Bridge between AgentStateBuffer observations and BehavioralTrustScoring.
 *
 * Reads avatar state at a configurable rate (default 5Hz), detects behavioral
 * changes (position, velocity, chat, heartbeat), and generates BehavioralEvents
 * for the scoring engine.
 *
 * Usage:
 * ```typescript
 * const bridge = new BehavioralTrustBridge(
 *   agentCommunicationManager.getBuffer(),
 *   behavioralTrustScoring,
 *   {
 *     observationHz: 5,
 *     worldBounds: { min: { x: -100, y: -10, z: -100 }, max: { x: 100, y: 100, z: 100 } },
 *     zones: [
 *       { id: 'admin', name: 'Admin Zone', bounds: { min: { x: -5, y: 0, z: -5 }, max: { x: 5, y: 3, z: 5 } }, restricted: true },
 *     ],
 *     maxVelocityThreshold: 20,
 *   },
 * );
 *
 * bridge.start();
 *
 * // ... later
 * bridge.stop();
 * bridge.dispose();
 * ```
 */
export class BehavioralTrustBridge {
  private readonly buffer: AgentStateBuffer<AgentWorldState>;
  private readonly scoring: BehavioralTrustScoring;

  private readonly observationHz: number;
  private readonly worldBounds: BoundingBox | null;
  private readonly zones: ZoneDefinition[];
  private readonly maxVelocityThreshold: number;
  private readonly heartbeatStalenessMs: number;

  /** Per-agent last-observed state for diffing */
  private readonly observations: Map<string, AgentObservation> = new Map();

  /** Observation loop interval */
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  /** Metrics */
  private totalTicks: number = 0;
  private totalEventsGenerated: number = 0;
  private totalImpossibleMovements: number = 0;
  private totalBoundsViolations: number = 0;
  private totalZoneEntries: number = 0;
  private totalZoneExits: number = 0;
  private tickDurations: number[] = [];

  constructor(
    buffer: AgentStateBuffer<AgentWorldState>,
    scoring: BehavioralTrustScoring,
    config?: BehavioralTrustBridgeConfig,
  ) {
    this.buffer = buffer;
    this.scoring = scoring;

    this.observationHz = config?.observationHz ?? DEFAULT_OBSERVATION_HZ;
    this.worldBounds = config?.worldBounds ?? null;
    this.zones = config?.zones ?? [];
    this.maxVelocityThreshold = config?.maxVelocityThreshold ?? DEFAULT_MAX_VELOCITY_THRESHOLD;
    this.heartbeatStalenessMs = config?.heartbeatStalenessMs ?? DEFAULT_HEARTBEAT_STALENESS_MS;

    if (config?.autoStart) {
      this.start();
    }

    logger.info('[BehavioralTrustBridge] Initialized', {
      observationHz: this.observationHz,
      worldBounds: this.worldBounds !== null,
      zoneCount: this.zones.length,
      maxVelocityThreshold: this.maxVelocityThreshold,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the observation loop.
   *
   * Runs at the configured Hz (default 5Hz), reading the AgentStateBuffer
   * front buffer and generating behavioral events.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[BehavioralTrustBridge] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.observationHz));
    this.intervalId = setInterval(() => this.observationTick(), intervalMs);
    this.isRunning = true;

    logger.info('[BehavioralTrustBridge] Started', {
      hz: this.observationHz,
      intervalMs,
    });
  }

  /**
   * Stop the observation loop. Observation state is preserved.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[BehavioralTrustBridge] Already stopped');
      return;
    }

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;

    logger.info('[BehavioralTrustBridge] Stopped');
  }

  /**
   * Dispose all resources and clear observation state.
   */
  dispose(): void {
    this.stop();
    this.observations.clear();
    logger.info('[BehavioralTrustBridge] Disposed');
  }

  // ===========================================================================
  // OBSERVATION TICK (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Execute a single observation tick.
   *
   * Reads the front buffer, diffs against previous observations,
   * and generates behavioral events for all connected agents.
   *
   * Cost: O(n) where n = number of agents, typically < 1ms for 10 agents.
   *
   * Exposed for testing; normally called automatically by the interval.
   */
  observationTick(): void {
    const startTime = this.now();
    const now = Date.now();
    const state = this.buffer.getFrontBuffer();

    const currentAgentIds = new Set<string>();

    // Observe each agent in the front buffer
    for (const [agentId, agentState] of Object.entries(state.agents)) {
      currentAgentIds.add(agentId);
      this.observeAgent(agentId, agentState, now);
    }

    // Clean up observations for disconnected agents
    for (const observedId of this.observations.keys()) {
      if (!currentAgentIds.has(observedId)) {
        this.observations.delete(observedId);
      }
    }

    // Track tick metrics
    this.totalTicks++;
    const duration = this.now() - startTime;
    this.tickDurations.push(duration);
    if (this.tickDurations.length > MAX_TICK_DURATION_HISTORY) {
      this.tickDurations.shift();
    }
  }

  // ===========================================================================
  // AGENT OBSERVATION
  // ===========================================================================

  /**
   * Observe a single agent's state and generate behavioral events.
   */
  private observeAgent(
    agentId: string,
    agentState: AgentAvatarState,
    now: number,
  ): void {
    const prev = this.observations.get(agentId);

    if (!prev) {
      // First observation for this agent -- record baseline, no events
      this.observations.set(agentId, {
        position: { ...agentState.position },
        positionTimestamp: now,
        velocity: 0,
        speechText: agentState.speechText,
        lastUpdateTimestamp: agentState.lastUpdateTimestamp,
        insideZones: this.computeAgentZones(agentState.position),
      });
      return;
    }

    // ── Position Update ──────────────────────────────────────────────
    const posChanged =
      agentState.position.x !== prev.position.x ||
      agentState.position.y !== prev.position.y ||
      agentState.position.z !== prev.position.z;

    if (posChanged) {
      this.emitEvent({
        type: 'position_update',
        agentId,
        timestamp: now,
        data: { position: { ...agentState.position } },
      });

      // ── Velocity Calculation ─────────────────────────────────────
      const timeDeltaSec = (now - prev.positionTimestamp) / 1000;
      if (timeDeltaSec > 0.001) {
        const distance = this.distance(agentState.position, prev.position);
        const velocity = distance / timeDeltaSec;

        this.emitEvent({
          type: 'velocity_report',
          agentId,
          timestamp: now,
          data: { velocity },
        });

        // ── Impossible Movement Detection ────────────────────────
        if (velocity > this.maxVelocityThreshold) {
          this.emitEvent({
            type: 'impossible_movement',
            agentId,
            timestamp: now,
            data: {
              velocity,
              maxAllowed: this.maxVelocityThreshold,
              distance,
              timeDeltaSec,
            },
          });
          this.totalImpossibleMovements++;
        }

        prev.velocity = velocity;
      }

      // ── World Bounds Check ───────────────────────────────────────
      if (this.worldBounds) {
        const p = agentState.position;
        const { min, max } = this.worldBounds;
        if (
          p.x < min.x || p.x > max.x ||
          p.y < min.y || p.y > max.y ||
          p.z < min.z || p.z > max.z
        ) {
          this.emitEvent({
            type: 'bounds_violation',
            agentId,
            timestamp: now,
            data: { position: { ...p }, worldBounds: this.worldBounds },
          });
          this.totalBoundsViolations++;
        }
      }

      // ── Zone Entry / Exit Detection ──────────────────────────────
      if (this.zones.length > 0) {
        const currentZones = this.computeAgentZones(agentState.position);

        // Zone entries: in currentZones but not in prev.insideZones
        for (const zoneId of currentZones) {
          if (!prev.insideZones.has(zoneId)) {
            const zone = this.zones.find(z => z.id === zoneId);
            this.emitEvent({
              type: 'zone_entry',
              agentId,
              timestamp: now,
              data: {
                zoneId,
                zoneName: zone?.name ?? zoneId,
                restricted: zone?.restricted ?? false,
              },
            });
            this.totalZoneEntries++;
          }
        }

        // Zone exits: in prev.insideZones but not in currentZones
        for (const zoneId of prev.insideZones) {
          if (!currentZones.has(zoneId)) {
            const zone = this.zones.find(z => z.id === zoneId);
            this.emitEvent({
              type: 'zone_exit',
              agentId,
              timestamp: now,
              data: {
                zoneId,
                zoneName: zone?.name ?? zoneId,
                restricted: zone?.restricted ?? false,
              },
            });
            this.totalZoneExits++;
          }
        }

        prev.insideZones = currentZones;
      }

      prev.position = { ...agentState.position };
      prev.positionTimestamp = now;
    }

    // ── Chat Message Detection ─────────────────────────────────────
    if (
      agentState.speechText !== prev.speechText &&
      agentState.speechText.length > 0
    ) {
      this.emitEvent({
        type: 'chat_message',
        agentId,
        timestamp: now,
        data: { text: agentState.speechText },
      });
      prev.speechText = agentState.speechText;
    }

    // ── Heartbeat Timing ───────────────────────────────────────────
    if (agentState.lastUpdateTimestamp > prev.lastUpdateTimestamp) {
      // Agent has had a state update since last observation
      const updateGap = agentState.lastUpdateTimestamp - prev.lastUpdateTimestamp;

      if (updateGap <= this.heartbeatStalenessMs) {
        this.emitEvent({
          type: 'heartbeat',
          agentId,
          timestamp: now,
          data: {
            lastUpdateTimestamp: agentState.lastUpdateTimestamp,
            updateGap,
          },
        });
      }

      prev.lastUpdateTimestamp = agentState.lastUpdateTimestamp;
    }
  }

  // ===========================================================================
  // ZONE COMPUTATION
  // ===========================================================================

  /**
   * Compute which zones an agent is currently inside.
   *
   * @param position - The agent's world-space position
   * @returns Set of zone IDs the agent is inside
   */
  private computeAgentZones(position: Vec3): Set<string> {
    const result = new Set<string>();

    for (const zone of this.zones) {
      if (this.isInsideBoundingBox(position, zone.bounds)) {
        result.add(zone.id);
      }
    }

    return result;
  }

  /**
   * Check if a point is inside an axis-aligned bounding box.
   */
  private isInsideBoundingBox(point: Vec3, box: BoundingBox): boolean {
    return (
      point.x >= box.min.x && point.x <= box.max.x &&
      point.y >= box.min.y && point.y <= box.max.y &&
      point.z >= box.min.z && point.z <= box.max.z
    );
  }

  // ===========================================================================
  // EVENT EMISSION
  // ===========================================================================

  /**
   * Emit a behavioral event to the scoring engine.
   */
  private emitEvent(event: BehavioralEvent): void {
    this.scoring.ingestEvent(event);
    this.totalEventsGenerated++;
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  /**
   * Check if the observation loop is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the configured observation frequency in Hz.
   */
  getObservationHz(): number {
    return this.observationHz;
  }

  /**
   * Get the configured world bounds.
   */
  getWorldBounds(): BoundingBox | null {
    return this.worldBounds;
  }

  /**
   * Get the configured zone definitions.
   */
  getZones(): ReadonlyArray<Readonly<ZoneDefinition>> {
    return this.zones;
  }

  /**
   * Get the configured max velocity threshold.
   */
  getMaxVelocityThreshold(): number {
    return this.maxVelocityThreshold;
  }

  /**
   * Get comprehensive bridge metrics.
   */
  getMetrics(): BehavioralTrustBridgeMetrics {
    let averageTickDuration = 0;
    if (this.tickDurations.length > 0) {
      averageTickDuration =
        this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length;
    }

    return {
      isRunning: this.isRunning,
      observationHz: this.observationHz,
      totalTicks: this.totalTicks,
      totalEventsGenerated: this.totalEventsGenerated,
      totalImpossibleMovements: this.totalImpossibleMovements,
      totalBoundsViolations: this.totalBoundsViolations,
      totalZoneEntries: this.totalZoneEntries,
      totalZoneExits: this.totalZoneExits,
      observedAgentCount: this.observations.size,
      averageTickDurationMs: Math.round(averageTickDuration * 1000) / 1000,
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
 * Create a BehavioralTrustBridge instance.
 *
 * @param buffer - The AgentStateBuffer to observe
 * @param scoring - The BehavioralTrustScoring engine to feed events into
 * @param config - Optional configuration
 */
export function createBehavioralTrustBridge(
  buffer: AgentStateBuffer<AgentWorldState>,
  scoring: BehavioralTrustScoring,
  config?: BehavioralTrustBridgeConfig,
): BehavioralTrustBridge {
  return new BehavioralTrustBridge(buffer, scoring, config);
}
