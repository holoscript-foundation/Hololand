/**
 * CulturalZoneManager
 *
 * Axelrod-style cultural zone management for HoloLand VR worlds.
 *
 * Manages cultural zones with graduated interaction bandwidth at boundaries,
 * automatic bridge agent deployment, zone permeability metrics, and critical
 * mass override detection. Integrates with SharedSpatialAnchors for zone
 * geometry and BehavioralTrustScoring for trust-based zone access.
 *
 * ARCHITECTURE:
 * The manager runs a management cycle off the render loop (default 2Hz)
 * that performs:
 *   1. Zone containment updates (which agents are in which zones)
 *   2. Boundary recalculation (cultural similarity, permeability, bandwidth)
 *   3. Bridge agent lifecycle management (deploy, monitor, recall)
 *   4. Critical mass detection and policy response
 *   5. Permeability metrics aggregation
 *
 * The render-loop safe API provides O(1) queries:
 *   - `getAgentZone(agentId)`: Which zone is this agent in?
 *   - `getZoneBandwidth(fromZone, toZone)`: What bandwidth is allowed?
 *   - `isAgentAllowedInZone(agentId, zoneId)`: Can this agent enter?
 *
 * AXELROD BOUNDARY MODEL:
 * Cultural similarity between zones determines boundary permeability.
 * The similarity is computed as the weighted Axelrod overlap coefficient
 * of the two zones' cultural vectors. Similarity ranges map to graduated
 * interaction bandwidth levels (full/high/moderate/limited/minimal/blocked).
 *
 * Bridge agents are automatically deployed at boundaries where cultural
 * similarity falls below a configurable threshold. They mediate cross-zone
 * interactions and can facilitate cultural convergence.
 *
 * Critical mass override detection monitors the ratio of "foreign" agents
 * (agents whose home zone differs from their current zone) and triggers
 * policy responses when the ratio exceeds a threshold for a sustained
 * duration.
 *
 * PERFORMANCE:
 * - Management cycle: Off render loop, 2Hz (500ms interval)
 * - Zone containment: O(1) per agent via spatial hash (render-loop safe read)
 * - Cultural similarity: O(f) per boundary where f = feature count (~8-10)
 * - Permeability lookup: O(1) from precomputed boundary table
 * - Critical mass: O(z^2) where z = zone count (off render loop)
 * - Total cycle budget: <5ms for 50 zones, 200 agents, 100 boundaries
 *
 * DATA FLOW:
 * ```
 *   Agent position updates (from AgentStateBuffer)
 *        |
 *        v
 *   managementCycle() [every 500ms at 2Hz]      <-- OFF render loop
 *        |
 *        ├── updateZoneContainment()             <-- O(agents) AABB checks
 *        ├── recalculateBoundaries()             <-- O(boundaries * features)
 *        ├── manageBridgeAgents()                <-- O(boundaries)
 *        ├── detectCriticalMass()                <-- O(zones^2)
 *        └── aggregatePermeabilityMetrics()      <-- O(boundaries)
 *        |
 *        v
 *   getAgentZone(agentId)                        <-- ON render loop, O(1)
 *   getZoneBandwidth(from, to)                   <-- ON render loop, O(1)
 * ```
 *
 * @module CulturalZoneManager
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type { AnchorId } from './SharedSpatialAnchorTypes';
import type { BehavioralTrustScoring } from './BehavioralTrustScoring';
import type { SharedSpatialAnchorManager } from './SharedSpatialAnchorManager';
import {
  type ZoneId,
  type ZoneType,
  type ZoneStatus,
  type ZoneGeometry,
  type ZoneNorms,
  type CulturalVector,
  type CulturalFeature,
  type CulturalFeatureId,
  type CulturalZone,
  type CulturalZoneWorldState,
  type ZoneBoundary,
  type BridgeAgentConfig,
  type BridgeAgentStatus,
  type CriticalMassState,
  type CriticalMassPolicyResponse,
  type ZonePermeabilityMetrics,
  type InteractionBandwidthLevel,
  type CulturalZoneManagerConfig,
  type CulturalZoneManagerMetrics,
  type CulturalZoneEventType,
  type CulturalZoneEventMap,
  type CulturalZoneEventHandler,
  createEmptyCulturalZoneWorldState,
  createDefaultCulturalVector,
  createDefaultZoneNorms,
  createDefaultZoneGeometry,
  computeCulturalSimilarity,
  similarityToBandwidth,
  bandwidthToMultiplier,
  makeBoundaryKey,
} from './CulturalZoneTypes';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG = {
  managementHz: 2,
  spatialHashCellSize: 10.0,
  bandwidthThresholds: {
    full: 0.9,
    high: 0.75,
    moderate: 0.5,
    limited: 0.25,
    minimal: 0.0,
  },
  bridgeAgentDeploymentThreshold: 0.4,
  bridgeAgentRecallThreshold: 0.7,
  criticalMassRatio: 0.4,
  criticalMassDurationMs: 30000,
  defaultCriticalMassPolicy: 'notify' as CriticalMassPolicyResponse,
  metricsWindowMs: 60000,
  maxPermeabilityHistory: 60,
  tensionThresholdForBridgeRecommendation: 0.6,
} as const;

// =============================================================================
// SPATIAL HASH
// =============================================================================

/**
 * Lightweight spatial hash for O(1) zone containment queries.
 *
 * The world is divided into cells of a fixed size. Each cell stores
 * a list of zone IDs whose AABB intersects that cell. Agent containment
 * checks only need to test zones in the agent's cell.
 */
class SpatialHash {
  private readonly cellSize: number;
  private readonly cells: Map<string, Set<ZoneId>> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private cellKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  private worldToCell(pos: Vec3): { cx: number; cy: number; cz: number } {
    return {
      cx: Math.floor(pos.x / this.cellSize),
      cy: Math.floor(pos.y / this.cellSize),
      cz: Math.floor(pos.z / this.cellSize),
    };
  }

  /**
   * Insert a zone's AABB into the spatial hash.
   */
  insertZone(zoneId: ZoneId, center: Vec3, halfExtents: Vec3): void {
    const min = {
      x: center.x - halfExtents.x,
      y: center.y - halfExtents.y,
      z: center.z - halfExtents.z,
    };
    const max = {
      x: center.x + halfExtents.x,
      y: center.y + halfExtents.y,
      z: center.z + halfExtents.z,
    };

    const minCell = this.worldToCell(min);
    const maxCell = this.worldToCell(max);

    for (let cx = minCell.cx; cx <= maxCell.cx; cx++) {
      for (let cy = minCell.cy; cy <= maxCell.cy; cy++) {
        for (let cz = minCell.cz; cz <= maxCell.cz; cz++) {
          const key = this.cellKey(cx, cy, cz);
          let cell = this.cells.get(key);
          if (!cell) {
            cell = new Set();
            this.cells.set(key, cell);
          }
          cell.add(zoneId);
        }
      }
    }
  }

  /**
   * Remove a zone from the spatial hash.
   */
  removeZone(zoneId: ZoneId): void {
    for (const cell of this.cells.values()) {
      cell.delete(zoneId);
    }
  }

  /**
   * Get candidate zone IDs for a given position.
   * Returns zones whose AABB cells include the given point.
   */
  getCandidateZones(position: Vec3): Set<ZoneId> {
    const { cx, cy, cz } = this.worldToCell(position);
    const key = this.cellKey(cx, cy, cz);
    return this.cells.get(key) ?? new Set();
  }

  /**
   * Clear the spatial hash.
   */
  clear(): void {
    this.cells.clear();
  }
}

// =============================================================================
// CULTURAL ZONE MANAGER
// =============================================================================

/**
 * Cultural Zone Manager for HoloLand VR worlds.
 *
 * Manages the lifecycle of cultural zones, boundary permeability,
 * bridge agent deployment, and critical mass detection. Integrates
 * with SharedSpatialAnchors and BehavioralTrustScoring.
 *
 * Usage:
 * ```typescript
 * const zoneManager = new CulturalZoneManager({
 *   localAgentId: 'world-server',
 *   worldId: 'world-1',
 *   managementHz: 2,
 *   onZoneEvent: (type, event) => console.log(type, event),
 *   onBridgeAgentDeployRequest: (zoneA, zoneB, pos) => {
 *     // Deploy a bridge agent and return its ID
 *     return `bridge-${Date.now()}`;
 *   },
 * });
 *
 * zoneManager.start();
 *
 * // Create zones
 * const zoneA = zoneManager.createZone('zone:world-1:lobby', 'Lobby', {
 *   type: 'social',
 *   center: { x: 0, y: 0, z: 0 },
 *   halfExtents: { x: 20, y: 5, z: 20 },
 * });
 *
 * // Register agent positions for containment tracking
 * zoneManager.updateAgentPosition('agent-1', { x: 5, y: 0, z: 3 });
 *
 * // Render loop: O(1) queries
 * const zone = zoneManager.getAgentZone('agent-1');
 * const bandwidth = zoneManager.getZoneBandwidth('zone-a', 'zone-b');
 * ```
 */
export class CulturalZoneManager {
  private readonly config: {
    localAgentId: string;
    worldId: string;
    managementHz: number;
    spatialHashCellSize: number;
    defaultFeatures: CulturalFeature[];
    defaultNorms: ZoneNorms;
    bandwidthThresholds: {
      full: number;
      high: number;
      moderate: number;
      limited: number;
      minimal: number;
    };
    bridgeAgentDeploymentThreshold: number;
    bridgeAgentRecallThreshold: number;
    criticalMassRatio: number;
    criticalMassDurationMs: number;
    defaultCriticalMassPolicy: CriticalMassPolicyResponse;
    metricsWindowMs: number;
    maxPermeabilityHistory: number;
    tensionThresholdForBridgeRecommendation: number;
    onZoneEvent: <T extends CulturalZoneEventType>(
      eventType: T,
      event: CulturalZoneEventMap[T],
    ) => void;
    onBridgeAgentDeployRequest: (
      zoneAId: ZoneId,
      zoneBId: ZoneId,
      position: Vec3,
    ) => string | null;
    onBridgeAgentRecallRequest: (agentId: string) => void;
    onCriticalMassPolicy: (state: CriticalMassState) => void;
  };

  /** World state for cultural zones */
  private state: CulturalZoneWorldState;

  /** Spatial hash for O(1) zone containment */
  private readonly spatialHash: SpatialHash;

  /** Agent position cache: agentId -> last known position */
  private readonly agentPositions: Map<string, Vec3> = new Map();

  /** Agent zone membership: agentId -> zoneId (render-loop safe reads) */
  private readonly agentZoneMap: Map<string, ZoneId> = new Map();

  /** Agent home zone: agentId -> zoneId they are primarily associated with */
  private readonly agentHomeZone: Map<string, ZoneId> = new Map();

  /** Event listeners */
  private readonly eventListeners: Map<CulturalZoneEventType, Set<CulturalZoneEventHandler<CulturalZoneEventType>>> = new Map();

  /** Management loop */
  private managementIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  /** Integration references (optional, set via setters) */
  private trustScoring: BehavioralTrustScoring | null = null;
  private anchorManager: SharedSpatialAnchorManager | null = null;

  /** Metrics */
  private totalZoneEntries: number = 0;
  private totalZoneExits: number = 0;
  private totalEntryDenials: number = 0;
  private totalBridgeDeployments: number = 0;
  private totalBridgeRecalls: number = 0;
  private totalCriticalMassTriggers: number = 0;
  private cycleDurations: number[] = [];
  private readonly MAX_CYCLE_HISTORY = 60;

  constructor(config: CulturalZoneManagerConfig) {
    const defaultVector = createDefaultCulturalVector();
    this.config = {
      localAgentId: config.localAgentId,
      worldId: config.worldId,
      managementHz: config.managementHz ?? DEFAULT_CONFIG.managementHz,
      spatialHashCellSize: config.spatialHashCellSize ?? DEFAULT_CONFIG.spatialHashCellSize,
      defaultFeatures: config.defaultFeatures ?? Object.values(defaultVector.features),
      defaultNorms: { ...createDefaultZoneNorms(), ...(config.defaultNorms ?? {}) },
      bandwidthThresholds: {
        ...DEFAULT_CONFIG.bandwidthThresholds,
        ...(config.bandwidthThresholds ?? {}),
      },
      bridgeAgentDeploymentThreshold: config.bridgeAgentDeploymentThreshold ?? DEFAULT_CONFIG.bridgeAgentDeploymentThreshold,
      bridgeAgentRecallThreshold: config.bridgeAgentRecallThreshold ?? DEFAULT_CONFIG.bridgeAgentRecallThreshold,
      criticalMassRatio: config.criticalMassRatio ?? DEFAULT_CONFIG.criticalMassRatio,
      criticalMassDurationMs: config.criticalMassDurationMs ?? DEFAULT_CONFIG.criticalMassDurationMs,
      defaultCriticalMassPolicy: config.defaultCriticalMassPolicy ?? DEFAULT_CONFIG.defaultCriticalMassPolicy,
      metricsWindowMs: config.metricsWindowMs ?? DEFAULT_CONFIG.metricsWindowMs,
      maxPermeabilityHistory: config.maxPermeabilityHistory ?? DEFAULT_CONFIG.maxPermeabilityHistory,
      tensionThresholdForBridgeRecommendation: config.tensionThresholdForBridgeRecommendation ?? DEFAULT_CONFIG.tensionThresholdForBridgeRecommendation,
      onZoneEvent: config.onZoneEvent ?? (() => {}),
      onBridgeAgentDeployRequest: config.onBridgeAgentDeployRequest ?? (() => null),
      onBridgeAgentRecallRequest: config.onBridgeAgentRecallRequest ?? (() => {}),
      onCriticalMassPolicy: config.onCriticalMassPolicy ?? (() => {}),
    };

    this.state = createEmptyCulturalZoneWorldState(this.config.spatialHashCellSize);
    this.spatialHash = new SpatialHash(this.config.spatialHashCellSize);

    logger.info('[CulturalZoneManager] Initialized', {
      worldId: config.worldId,
      managementHz: this.config.managementHz,
      bridgeThreshold: this.config.bridgeAgentDeploymentThreshold,
      criticalMassRatio: this.config.criticalMassRatio,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the management cycle.
   *
   * Runs at the configured Hz (default 2Hz), performing zone containment
   * updates, boundary recalculation, bridge agent management, and
   * critical mass detection.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[CulturalZoneManager] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.config.managementHz));
    this.managementIntervalId = setInterval(() => this.managementCycle(), intervalMs);
    this.isRunning = true;

    logger.info('[CulturalZoneManager] Started', {
      hz: this.config.managementHz,
      intervalMs,
    });
  }

  /**
   * Stop the management cycle.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[CulturalZoneManager] Already stopped');
      return;
    }

    if (this.managementIntervalId !== null) {
      clearInterval(this.managementIntervalId);
      this.managementIntervalId = null;
    }
    this.isRunning = false;

    logger.info('[CulturalZoneManager] Stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.state = createEmptyCulturalZoneWorldState(this.config.spatialHashCellSize);
    this.spatialHash.clear();
    this.agentPositions.clear();
    this.agentZoneMap.clear();
    this.agentHomeZone.clear();
    this.eventListeners.clear();
    this.trustScoring = null;
    this.anchorManager = null;

    logger.info('[CulturalZoneManager] Disposed');
  }

  // ===========================================================================
  // INTEGRATION SETTERS
  // ===========================================================================

  /**
   * Set the BehavioralTrustScoring reference for trust-based zone access.
   */
  setTrustScoring(scoring: BehavioralTrustScoring): void {
    this.trustScoring = scoring;
  }

  /**
   * Set the SharedSpatialAnchorManager reference for zone anchor management.
   */
  setAnchorManager(manager: SharedSpatialAnchorManager): void {
    this.anchorManager = manager;
  }

  // ===========================================================================
  // ZONE CRUD
  // ===========================================================================

  /**
   * Create a new cultural zone.
   *
   * @param id - Unique zone identifier
   * @param name - Human-readable zone name
   * @param options - Zone configuration options
   * @returns The created zone
   */
  createZone(
    id: ZoneId,
    name: string,
    options?: {
      type?: ZoneType;
      description?: string;
      center?: Vec3;
      halfExtents?: Vec3;
      culturalVector?: Partial<CulturalVector>;
      norms?: Partial<ZoneNorms>;
      ownerId?: string;
      adminIds?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
      regionAnchorId?: AnchorId;
    },
  ): CulturalZone {
    if (this.state.zones[id]) {
      throw new Error(`Zone already exists: ${id}`);
    }

    const center = options?.center ?? { x: 0, y: 0, z: 0 };
    const halfExtents = options?.halfExtents ?? { x: 10, y: 5, z: 10 };
    const defaultVector = createDefaultCulturalVector();

    // Merge cultural vector features if provided
    const culturalVector: CulturalVector = {
      features: { ...defaultVector.features },
      version: 1,
      lastModified: Date.now(),
    };
    if (options?.culturalVector?.features) {
      for (const [fid, feature] of Object.entries(options.culturalVector.features)) {
        culturalVector.features[fid] = feature;
      }
    }

    const zone: CulturalZone = {
      id,
      name,
      type: options?.type ?? 'workspace',
      status: 'active',
      description: options?.description ?? '',
      culturalVector,
      geometry: createDefaultZoneGeometry(center, halfExtents),
      regionAnchorId: options?.regionAnchorId ?? `anchor:${id}`,
      norms: { ...this.config.defaultNorms, ...(options?.norms ?? {}) },
      occupants: [],
      occupantCount: 0,
      ownerId: options?.ownerId ?? this.config.localAgentId,
      adminIds: options?.adminIds ?? [],
      tags: options?.tags ?? [],
      metadata: options?.metadata ?? {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };

    this.state.zones[id] = zone;
    this.spatialHash.insertZone(id, center, halfExtents);

    // Create boundaries with all existing zones
    for (const existingZoneId of Object.keys(this.state.zones)) {
      if (existingZoneId !== id) {
        this.createBoundary(id, existingZoneId);
      }
    }

    this.emitEvent('zone:created', { zone });

    logger.info('[CulturalZoneManager] Zone created', {
      id,
      name,
      type: zone.type,
      center: `${center.x},${center.y},${center.z}`,
    });

    return zone;
  }

  /**
   * Get a zone by ID.
   */
  getZone(id: ZoneId): CulturalZone | undefined {
    return this.state.zones[id];
  }

  /**
   * Get all zones.
   */
  getAllZones(): ReadonlyMap<ZoneId, CulturalZone> {
    return new Map(Object.entries(this.state.zones));
  }

  /**
   * Update a zone's cultural feature.
   *
   * @param zoneId - Zone to update
   * @param featureId - Feature to modify
   * @param newValue - New feature value
   */
  updateZoneCulture(zoneId: ZoneId, featureId: CulturalFeatureId, newValue: string): void {
    const zone = this.state.zones[zoneId];
    if (!zone) {
      logger.warn('[CulturalZoneManager] Zone not found for culture update', { zoneId });
      return;
    }

    const feature = zone.culturalVector.features[featureId];
    if (!feature) {
      logger.warn('[CulturalZoneManager] Feature not found', { zoneId, featureId });
      return;
    }

    if (!feature.possibleValues.includes(newValue)) {
      logger.warn('[CulturalZoneManager] Invalid feature value', {
        zoneId, featureId, newValue, possibleValues: feature.possibleValues,
      });
      return;
    }

    const oldValue = feature.value;
    feature.value = newValue;
    zone.culturalVector.version++;
    zone.culturalVector.lastModified = Date.now();
    zone.updatedAt = Date.now();
    zone.version++;

    this.emitEvent('zone:culture-changed', {
      zoneId,
      featureId,
      oldValue,
      newValue,
    });

    // Recalculate boundaries involving this zone
    this.recalculateBoundariesForZone(zoneId);

    logger.info('[CulturalZoneManager] Zone culture updated', {
      zoneId,
      featureId,
      oldValue,
      newValue,
    });
  }

  /**
   * Update a zone's behavioral norms.
   */
  updateZoneNorms(zoneId: ZoneId, norms: Partial<ZoneNorms>): void {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    Object.assign(zone.norms, norms);
    zone.updatedAt = Date.now();
    zone.version++;
  }

  /**
   * Dissolve a zone, relocating any occupants.
   */
  dissolveZone(zoneId: ZoneId, reason: string = 'manual'): void {
    const zone = this.state.zones[zoneId];
    if (!zone) return;

    zone.status = 'dissolving';

    // Remove occupants
    for (const agentId of zone.occupants) {
      this.agentZoneMap.delete(agentId);
      this.emitEvent('zone:agent-exited', {
        zoneId,
        agentId,
        timestamp: Date.now(),
      });
      this.totalZoneExits++;
    }
    zone.occupants = [];
    zone.occupantCount = 0;

    // Remove boundaries
    const keysToRemove: string[] = [];
    for (const key of Object.keys(this.state.boundaries)) {
      if (key.includes(zoneId)) {
        // Recall any bridge agents at this boundary
        const boundary = this.state.boundaries[key];
        if (boundary.bridgeAgentId) {
          this.recallBridgeAgent(boundary.bridgeAgentId, 'zone_dissolved');
        }
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      delete this.state.boundaries[key];
      delete this.state.permeabilityMetrics[key];
    }

    // Remove from spatial hash
    this.spatialHash.removeZone(zoneId);

    // Remove zone
    delete this.state.zones[zoneId];

    this.emitEvent('zone:dissolved', { zoneId, reason });

    logger.info('[CulturalZoneManager] Zone dissolved', { zoneId, reason });
  }

  // ===========================================================================
  // AGENT MANAGEMENT
  // ===========================================================================

  /**
   * Update an agent's position for zone containment tracking.
   *
   * This is the primary input to the zone system. Call this whenever
   * an agent's position changes (from AgentStateBuffer or direct updates).
   *
   * @param agentId - Agent whose position changed
   * @param position - New world-space position
   */
  updateAgentPosition(agentId: string, position: Vec3): void {
    this.agentPositions.set(agentId, { ...position });
  }

  /**
   * Set an agent's home zone (the zone they are primarily associated with).
   * Used for critical mass detection.
   */
  setAgentHomeZone(agentId: string, zoneId: ZoneId): void {
    this.agentHomeZone.set(agentId, zoneId);
  }

  /**
   * Remove an agent from tracking.
   */
  removeAgent(agentId: string): void {
    const currentZone = this.agentZoneMap.get(agentId);
    if (currentZone) {
      const zone = this.state.zones[currentZone];
      if (zone) {
        const idx = zone.occupants.indexOf(agentId);
        if (idx !== -1) {
          zone.occupants.splice(idx, 1);
          zone.occupantCount = zone.occupants.length;
        }
      }
      this.emitEvent('zone:agent-exited', {
        zoneId: currentZone,
        agentId,
        timestamp: Date.now(),
      });
      this.totalZoneExits++;
    }

    this.agentPositions.delete(agentId);
    this.agentZoneMap.delete(agentId);
    this.agentHomeZone.delete(agentId);
  }

  // ===========================================================================
  // RENDER-LOOP SAFE QUERIES (O(1))
  // ===========================================================================

  /**
   * Get the zone an agent is currently in.
   *
   * Render-loop safe: O(1) map lookup.
   *
   * @param agentId - Agent to query
   * @returns Zone ID or undefined if not in any zone
   */
  getAgentZone(agentId: string): ZoneId | undefined {
    return this.agentZoneMap.get(agentId);
  }

  /**
   * Get the interaction bandwidth between two zones.
   *
   * Render-loop safe: O(1) lookup from precomputed boundary table.
   *
   * @param fromZoneId - Source zone
   * @param toZoneId - Destination zone
   * @returns Bandwidth level, or 'full' if zones are the same
   */
  getZoneBandwidth(fromZoneId: ZoneId, toZoneId: ZoneId): InteractionBandwidthLevel {
    if (fromZoneId === toZoneId) return 'full';

    const key = makeBoundaryKey(fromZoneId, toZoneId);
    const boundary = this.state.boundaries[key];
    if (!boundary) return 'blocked';

    // Determine direction
    if (boundary.zoneAId === fromZoneId) {
      return boundary.bandwidthAtoB;
    } else {
      return boundary.bandwidthBtoA;
    }
  }

  /**
   * Get the bandwidth multiplier for interactions between two agents.
   *
   * Render-loop safe.
   *
   * @param agentAId - First agent
   * @param agentBId - Second agent
   * @returns Multiplier (0.0 - 1.0) for interaction throttling
   */
  getInteractionMultiplier(agentAId: string, agentBId: string): number {
    const zoneA = this.agentZoneMap.get(agentAId);
    const zoneB = this.agentZoneMap.get(agentBId);

    if (!zoneA || !zoneB) return 1.0; // No zone tracking = full bandwidth
    if (zoneA === zoneB) return 1.0;  // Same zone = full bandwidth

    const bandwidth = this.getZoneBandwidth(zoneA, zoneB);
    return bandwidthToMultiplier(bandwidth);
  }

  /**
   * Check if an agent is allowed to enter a zone based on trust score.
   *
   * Render-loop safe if trust scoring getAgentScore is render-loop safe.
   *
   * @param agentId - Agent to check
   * @param zoneId - Zone to enter
   * @returns true if allowed
   */
  isAgentAllowedInZone(agentId: string, zoneId: ZoneId): boolean {
    const zone = this.state.zones[zoneId];
    if (!zone) return false;
    if (zone.status !== 'active') return false;

    // Check occupancy limit
    if (zone.occupantCount >= zone.norms.maxOccupancy) return false;

    // Check trust score
    if (this.trustScoring) {
      const trustScore = this.trustScoring.getAgentScore(agentId);
      if (trustScore >= 0 && trustScore < zone.norms.minTrustScore) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get cultural similarity between two zones.
   *
   * Render-loop safe: O(1) from precomputed boundary.
   */
  getZoneSimilarity(zoneAId: ZoneId, zoneBId: ZoneId): number {
    if (zoneAId === zoneBId) return 1.0;

    const key = makeBoundaryKey(zoneAId, zoneBId);
    const boundary = this.state.boundaries[key];
    return boundary?.culturalSimilarity ?? 0;
  }

  /**
   * Get permeability between two zones in a given direction.
   *
   * Render-loop safe.
   */
  getPermeability(fromZoneId: ZoneId, toZoneId: ZoneId): number {
    if (fromZoneId === toZoneId) return 1.0;

    const key = makeBoundaryKey(fromZoneId, toZoneId);
    const boundary = this.state.boundaries[key];
    if (!boundary) return 0;

    if (boundary.zoneAId === fromZoneId) {
      return boundary.permeabilityAtoB;
    } else {
      return boundary.permeabilityBtoA;
    }
  }

  /**
   * Get a zone boundary state.
   */
  getBoundary(zoneAId: ZoneId, zoneBId: ZoneId): ZoneBoundary | undefined {
    const key = makeBoundaryKey(zoneAId, zoneBId);
    return this.state.boundaries[key];
  }

  /**
   * Get all boundaries.
   */
  getAllBoundaries(): Readonly<Record<string, ZoneBoundary>> {
    return this.state.boundaries;
  }

  /**
   * Get bridge agents.
   */
  getBridgeAgents(): Readonly<Record<string, BridgeAgentConfig>> {
    return this.state.bridgeAgents;
  }

  /**
   * Get critical mass states.
   */
  getCriticalMassStates(): ReadonlyArray<CriticalMassState> {
    return this.state.criticalMassStates;
  }

  /**
   * Get permeability metrics for a boundary.
   */
  getPermeabilityMetrics(zoneAId: ZoneId, zoneBId: ZoneId): ZonePermeabilityMetrics | undefined {
    const key = makeBoundaryKey(zoneAId, zoneBId);
    return this.state.permeabilityMetrics[key];
  }

  /**
   * Get the full world state (for serialization/debugging).
   */
  getWorldState(): Readonly<CulturalZoneWorldState> {
    return this.state;
  }

  /**
   * Check if the management loop is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Register an event listener.
   */
  on<T extends CulturalZoneEventType>(
    eventType: T,
    handler: CulturalZoneEventHandler<T>,
  ): void {
    let listeners = this.eventListeners.get(eventType);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(eventType, listeners);
    }
    listeners.add(handler as CulturalZoneEventHandler<CulturalZoneEventType>);
  }

  /**
   * Unregister an event listener.
   */
  off<T extends CulturalZoneEventType>(
    eventType: T,
    handler: CulturalZoneEventHandler<T>,
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(handler as CulturalZoneEventHandler<CulturalZoneEventType>);
    }
  }

  /**
   * Emit an event to all registered listeners and the config callback.
   */
  private emitEvent<T extends CulturalZoneEventType>(
    eventType: T,
    event: CulturalZoneEventMap[T],
  ): void {
    // Notify config callback
    this.config.onZoneEvent(eventType, event);

    // Notify registered listeners
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      for (const handler of listeners) {
        try {
          handler(event);
        } catch (e) {
          logger.error('[CulturalZoneManager] Event handler error', {
            eventType,
            error: String(e),
          });
        }
      }
    }
  }

  // ===========================================================================
  // MANAGEMENT CYCLE (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Execute a single management cycle.
   *
   * This is the core loop that maintains zone state, boundaries,
   * bridge agents, and critical mass detection.
   *
   * Budget: Off render loop, typically <5ms for moderate worlds.
   */
  private managementCycle(): void {
    const startTime = this.now();

    // 1. Update zone containment for all tracked agents
    this.updateZoneContainment();

    // 2. Recalculate all boundary states
    this.recalculateAllBoundaries();

    // 3. Manage bridge agent lifecycle
    this.manageBridgeAgents();

    // 4. Detect critical mass overrides
    this.detectCriticalMass();

    // 5. Aggregate permeability metrics
    this.aggregatePermeabilityMetrics();

    // Update state metadata
    this.state.sequence++;
    this.state.lastSyncTimestamp = Date.now();

    // Track cycle duration
    const duration = this.now() - startTime;
    this.cycleDurations.push(duration);
    if (this.cycleDurations.length > this.MAX_CYCLE_HISTORY) {
      this.cycleDurations.shift();
    }
  }

  // ===========================================================================
  // ZONE CONTAINMENT (Step 1)
  // ===========================================================================

  /**
   * Update zone containment for all tracked agents.
   *
   * For each agent, determine which zone they are in by checking
   * candidate zones from the spatial hash.
   */
  private updateZoneContainment(): void {
    for (const [agentId, position] of this.agentPositions) {
      const candidateZones = this.spatialHash.getCandidateZones(position);
      let newZoneId: ZoneId | undefined;

      for (const zoneId of candidateZones) {
        const zone = this.state.zones[zoneId];
        if (zone && zone.status === 'active' && this.isPointInZone(position, zone)) {
          newZoneId = zoneId;
          break; // Take the first matching zone (zones should not overlap)
        }
      }

      const currentZoneId = this.agentZoneMap.get(agentId);

      if (newZoneId !== currentZoneId) {
        // Agent changed zones
        if (currentZoneId) {
          // Exit old zone
          const oldZone = this.state.zones[currentZoneId];
          if (oldZone) {
            const idx = oldZone.occupants.indexOf(agentId);
            if (idx !== -1) {
              oldZone.occupants.splice(idx, 1);
              oldZone.occupantCount = oldZone.occupants.length;
            }
          }
          this.emitEvent('zone:agent-exited', {
            zoneId: currentZoneId,
            agentId,
            timestamp: Date.now(),
          });
          this.totalZoneExits++;

          // Record crossing in metrics
          if (newZoneId) {
            this.recordBoundaryCrossing(currentZoneId, newZoneId, agentId);
          }
        }

        if (newZoneId) {
          // Check if agent is allowed to enter
          if (!this.isAgentAllowedInZone(agentId, newZoneId)) {
            const trustScore = this.trustScoring?.getAgentScore(agentId) ?? -1;
            this.emitEvent('zone:entry-denied', {
              zoneId: newZoneId,
              agentId,
              reason: trustScore >= 0 ? 'trust_score_too_low' : 'zone_full',
              trustScore,
            });
            this.totalEntryDenials++;
            this.agentZoneMap.delete(agentId);
            continue;
          }

          // Enter new zone
          const newZone = this.state.zones[newZoneId];
          if (newZone) {
            newZone.occupants.push(agentId);
            newZone.occupantCount = newZone.occupants.length;
          }
          this.agentZoneMap.set(agentId, newZoneId);
          this.emitEvent('zone:agent-entered', {
            zoneId: newZoneId,
            agentId,
            timestamp: Date.now(),
          });
          this.totalZoneEntries++;
        } else {
          // Agent is not in any zone
          this.agentZoneMap.delete(agentId);
        }
      }
    }
  }

  /**
   * Test if a point is inside a zone's AABB.
   */
  private isPointInZone(point: Vec3, zone: CulturalZone): boolean {
    const { center, halfExtents } = zone.geometry;
    return (
      Math.abs(point.x - center.x) <= halfExtents.x &&
      Math.abs(point.y - center.y) <= halfExtents.y &&
      Math.abs(point.z - center.z) <= halfExtents.z
    );
  }

  /**
   * Record a boundary crossing in permeability metrics.
   */
  private recordBoundaryCrossing(fromZoneId: ZoneId, toZoneId: ZoneId, agentId: string): void {
    const key = makeBoundaryKey(fromZoneId, toZoneId);
    const metrics = this.state.permeabilityMetrics[key];
    if (!metrics) return;

    const boundary = this.state.boundaries[key];
    if (!boundary) return;

    if (boundary.zoneAId === fromZoneId) {
      metrics.crossingsAtoB++;
    } else {
      metrics.crossingsBtoA++;
    }

    metrics.crossInteractions++;

    // Check trust score for success/failure tracking
    if (this.trustScoring) {
      const score = this.trustScoring.getAgentScore(agentId);
      if (score >= 0) {
        if (score >= 0.5) {
          metrics.successfulInteractions++;
        } else {
          metrics.failedInteractions++;
        }

        // Update average trust scores
        if (boundary.zoneAId === fromZoneId) {
          metrics.avgTrustScoreAtoB = this.ewma(metrics.avgTrustScoreAtoB, score, 0.3);
        } else {
          metrics.avgTrustScoreBtoA = this.ewma(metrics.avgTrustScoreBtoA, score, 0.3);
        }
      }
    }

    // Update interaction success rate
    const total = metrics.successfulInteractions + metrics.failedInteractions;
    metrics.interactionSuccessRate = total > 0
      ? metrics.successfulInteractions / total
      : 1.0;
  }

  // ===========================================================================
  // BOUNDARY MANAGEMENT (Step 2)
  // ===========================================================================

  /**
   * Create a boundary between two zones.
   */
  private createBoundary(zoneAId: ZoneId, zoneBId: ZoneId): void {
    const key = makeBoundaryKey(zoneAId, zoneBId);
    if (this.state.boundaries[key]) return;

    const zoneA = this.state.zones[zoneAId];
    const zoneB = this.state.zones[zoneBId];
    if (!zoneA || !zoneB) return;

    const similarity = computeCulturalSimilarity(
      zoneA.culturalVector,
      zoneB.culturalVector,
    );

    const bandwidthAtoB = similarityToBandwidth(similarity, this.config.bandwidthThresholds);
    const bandwidthBtoA = similarityToBandwidth(similarity, this.config.bandwidthThresholds);

    // Compute boundary anchor position (midpoint of zone centers)
    const midpoint: Vec3 = {
      x: (zoneA.geometry.center.x + zoneB.geometry.center.x) / 2,
      y: (zoneA.geometry.center.y + zoneB.geometry.center.y) / 2,
      z: (zoneA.geometry.center.z + zoneB.geometry.center.z) / 2,
    };

    const boundary: ZoneBoundary = {
      zoneAId: key.split('|')[0],
      zoneBId: key.split('|')[1],
      permeabilityAtoB: similarity,
      permeabilityBtoA: similarity,
      culturalSimilarity: similarity,
      bandwidthAtoB,
      bandwidthBtoA,
      boundaryAnchorId: null,
      hasBridgeAgent: false,
      bridgeAgentId: null,
      tensionScore: 1.0 - similarity,
      crossInteractionCount: 0,
      lastRecalculated: Date.now(),
    };

    this.state.boundaries[key] = boundary;

    // Initialize permeability metrics
    this.state.permeabilityMetrics[key] = this.createPermeabilityMetrics(
      boundary.zoneAId,
      boundary.zoneBId,
      similarity,
    );

    logger.debug('[CulturalZoneManager] Boundary created', {
      zoneA: zoneAId,
      zoneB: zoneBId,
      similarity: similarity.toFixed(3),
      bandwidth: bandwidthAtoB,
    });
  }

  /**
   * Recalculate all boundary states.
   */
  private recalculateAllBoundaries(): void {
    for (const key of Object.keys(this.state.boundaries)) {
      const boundary = this.state.boundaries[key];
      const zoneA = this.state.zones[boundary.zoneAId];
      const zoneB = this.state.zones[boundary.zoneBId];

      if (!zoneA || !zoneB) {
        delete this.state.boundaries[key];
        continue;
      }

      this.recalculateBoundary(boundary, zoneA, zoneB);
    }
  }

  /**
   * Recalculate boundaries for a specific zone.
   */
  private recalculateBoundariesForZone(zoneId: ZoneId): void {
    for (const key of Object.keys(this.state.boundaries)) {
      const boundary = this.state.boundaries[key];
      if (boundary.zoneAId === zoneId || boundary.zoneBId === zoneId) {
        const zoneA = this.state.zones[boundary.zoneAId];
        const zoneB = this.state.zones[boundary.zoneBId];
        if (zoneA && zoneB) {
          this.recalculateBoundary(boundary, zoneA, zoneB);
        }
      }
    }
  }

  /**
   * Recalculate a single boundary's state.
   */
  private recalculateBoundary(
    boundary: ZoneBoundary,
    zoneA: CulturalZone,
    zoneB: CulturalZone,
  ): void {
    const similarity = computeCulturalSimilarity(
      zoneA.culturalVector,
      zoneB.culturalVector,
    );

    const oldPermeability = boundary.permeabilityAtoB;
    const oldBandwidthAtoB = boundary.bandwidthAtoB;
    const oldBandwidthBtoA = boundary.bandwidthBtoA;

    boundary.culturalSimilarity = similarity;
    boundary.permeabilityAtoB = similarity;
    boundary.permeabilityBtoA = similarity;
    boundary.tensionScore = 1.0 - similarity;

    const newBandwidthAtoB = similarityToBandwidth(similarity, this.config.bandwidthThresholds);
    const newBandwidthBtoA = similarityToBandwidth(similarity, this.config.bandwidthThresholds);

    boundary.bandwidthAtoB = newBandwidthAtoB;
    boundary.bandwidthBtoA = newBandwidthBtoA;
    boundary.lastRecalculated = Date.now();

    // Emit events for significant changes
    if (Math.abs(boundary.permeabilityAtoB - oldPermeability) > 0.05) {
      this.emitEvent('zone:permeability-changed', {
        zoneAId: boundary.zoneAId,
        zoneBId: boundary.zoneBId,
        oldPermeability,
        newPermeability: boundary.permeabilityAtoB,
      });
    }

    if (newBandwidthAtoB !== oldBandwidthAtoB) {
      this.emitEvent('zone:bandwidth-changed', {
        zoneAId: boundary.zoneAId,
        zoneBId: boundary.zoneBId,
        oldBandwidth: oldBandwidthAtoB,
        newBandwidth: newBandwidthAtoB,
        direction: 'AtoB',
      });
    }

    if (newBandwidthBtoA !== oldBandwidthBtoA) {
      this.emitEvent('zone:bandwidth-changed', {
        zoneAId: boundary.zoneAId,
        zoneBId: boundary.zoneBId,
        oldBandwidth: oldBandwidthBtoA,
        newBandwidth: newBandwidthBtoA,
        direction: 'BtoA',
      });
    }
  }

  // ===========================================================================
  // BRIDGE AGENT MANAGEMENT (Step 3)
  // ===========================================================================

  /**
   * Manage bridge agent lifecycle across all boundaries.
   *
   * - Deploy bridge agents at boundaries with low cultural similarity
   * - Recall bridge agents when similarity rises above threshold
   * - Monitor active bridge agent load
   */
  private manageBridgeAgents(): void {
    for (const key of Object.keys(this.state.boundaries)) {
      const boundary = this.state.boundaries[key];

      if (boundary.hasBridgeAgent) {
        // Check if bridge agent should be recalled
        if (boundary.culturalSimilarity >= this.config.bridgeAgentRecallThreshold) {
          if (boundary.bridgeAgentId) {
            this.recallBridgeAgent(boundary.bridgeAgentId, 'similarity_increased');
            boundary.hasBridgeAgent = false;
            boundary.bridgeAgentId = null;
          }
        } else {
          // Update bridge agent metrics
          if (boundary.bridgeAgentId) {
            const bridgeAgent = this.state.bridgeAgents[boundary.bridgeAgentId];
            if (bridgeAgent) {
              bridgeAgent.activeMediations = boundary.crossInteractionCount;
              if (bridgeAgent.activeMediations > bridgeAgent.maxConcurrentMediations) {
                bridgeAgent.status = 'overloaded';
              } else if (bridgeAgent.activeMediations === 0) {
                bridgeAgent.status = 'idle';
              } else {
                bridgeAgent.status = 'active';
              }
            }
          }
        }
      } else {
        // Check if bridge agent should be deployed
        if (boundary.culturalSimilarity < this.config.bridgeAgentDeploymentThreshold) {
          this.deployBridgeAgent(boundary);
        }
      }
    }
  }

  /**
   * Deploy a bridge agent at a boundary.
   */
  private deployBridgeAgent(boundary: ZoneBoundary): void {
    const zoneA = this.state.zones[boundary.zoneAId];
    const zoneB = this.state.zones[boundary.zoneBId];
    if (!zoneA || !zoneB) return;

    // Calculate position at boundary midpoint
    const position: Vec3 = {
      x: (zoneA.geometry.center.x + zoneB.geometry.center.x) / 2,
      y: (zoneA.geometry.center.y + zoneB.geometry.center.y) / 2,
      z: (zoneA.geometry.center.z + zoneB.geometry.center.z) / 2,
    };

    // Request bridge agent deployment via callback
    const agentId = this.config.onBridgeAgentDeployRequest(
      boundary.zoneAId,
      boundary.zoneBId,
      position,
    );

    if (!agentId) {
      logger.warn('[CulturalZoneManager] Bridge agent deployment request denied', {
        zoneA: boundary.zoneAId,
        zoneB: boundary.zoneBId,
      });
      return;
    }

    // Create a cultural vector that overlaps with both zones
    const bridgeVector = this.createBridgeCulturalVector(
      zoneA.culturalVector,
      zoneB.culturalVector,
    );

    const anchorId: AnchorId = `bridge:${boundary.zoneAId}|${boundary.zoneBId}`;

    const bridgeConfig: BridgeAgentConfig = {
      agentId,
      boundaryZoneAId: boundary.zoneAId,
      boundaryZoneBId: boundary.zoneBId,
      status: 'deploying',
      position,
      anchorId,
      culturalVector: bridgeVector,
      maxConcurrentMediations: 10,
      activeMediations: 0,
      deployedAt: Date.now(),
      totalMediations: 0,
      satisfactionScore: 1.0,
      autoDeployed: true,
    };

    this.state.bridgeAgents[agentId] = bridgeConfig;
    boundary.hasBridgeAgent = true;
    boundary.bridgeAgentId = agentId;

    // Transition to active after "deployment"
    bridgeConfig.status = 'active';

    this.totalBridgeDeployments++;

    this.emitEvent('zone:bridge-deployed', {
      agentId,
      zoneAId: boundary.zoneAId,
      zoneBId: boundary.zoneBId,
      position,
    });

    logger.info('[CulturalZoneManager] Bridge agent deployed', {
      agentId,
      zoneA: boundary.zoneAId,
      zoneB: boundary.zoneBId,
      similarity: boundary.culturalSimilarity.toFixed(3),
    });
  }

  /**
   * Recall a bridge agent from a boundary.
   */
  private recallBridgeAgent(agentId: string, reason: string): void {
    const config = this.state.bridgeAgents[agentId];
    if (!config) return;

    config.status = 'recalled';

    // Notify external systems
    this.config.onBridgeAgentRecallRequest(agentId);

    this.emitEvent('zone:bridge-recalled', {
      agentId,
      zoneAId: config.boundaryZoneAId,
      zoneBId: config.boundaryZoneBId,
      reason,
    });

    // Remove from bridge agents
    delete this.state.bridgeAgents[agentId];

    this.totalBridgeRecalls++;

    logger.info('[CulturalZoneManager] Bridge agent recalled', {
      agentId,
      reason,
    });
  }

  /**
   * Create a cultural vector for a bridge agent that partially overlaps
   * with both adjacent zones. The bridge agent should share some features
   * with each zone to facilitate mediation.
   */
  private createBridgeCulturalVector(
    vectorA: CulturalVector,
    vectorB: CulturalVector,
  ): CulturalVector {
    const bridgeFeatures: Record<CulturalFeatureId, CulturalFeature> = {};

    const allFeatureIds = new Set([
      ...Object.keys(vectorA.features),
      ...Object.keys(vectorB.features),
    ]);

    let i = 0;
    for (const featureId of allFeatureIds) {
      const featureA = vectorA.features[featureId];
      const featureB = vectorB.features[featureId];

      if (featureA && featureB) {
        // Alternate between zone A and zone B values
        // This ensures the bridge agent has partial overlap with both
        bridgeFeatures[featureId] = {
          ...featureA,
          value: i % 2 === 0 ? featureA.value : featureB.value,
        };
      } else {
        bridgeFeatures[featureId] = { ...(featureA ?? featureB!) };
      }
      i++;
    }

    return {
      features: bridgeFeatures,
      version: 1,
      lastModified: Date.now(),
    };
  }

  // ===========================================================================
  // CRITICAL MASS DETECTION (Step 4)
  // ===========================================================================

  /**
   * Detect critical mass overrides in all zones.
   *
   * For each zone, check if agents from any single source zone
   * exceed the critical mass ratio. If so, trigger the appropriate
   * policy response.
   */
  private detectCriticalMass(): void {
    const now = Date.now();
    const newCriticalMassStates: CriticalMassState[] = [];

    for (const [targetZoneId, targetZone] of Object.entries(this.state.zones)) {
      if (targetZone.status !== 'active' || targetZone.occupantCount === 0) continue;

      // Count agents by home zone
      const homeZoneCounts: Record<ZoneId, number> = {};
      for (const agentId of targetZone.occupants) {
        const homeZone = this.agentHomeZone.get(agentId);
        if (homeZone && homeZone !== targetZoneId) {
          homeZoneCounts[homeZone] = (homeZoneCounts[homeZone] ?? 0) + 1;
        }
      }

      // Check each source zone against critical mass threshold
      for (const [sourceZoneId, foreignCount] of Object.entries(homeZoneCounts)) {
        const foreignRatio = foreignCount / targetZone.occupantCount;

        if (foreignRatio >= this.config.criticalMassRatio) {
          // Find existing state for this source-target pair
          const existingState = this.state.criticalMassStates.find(
            s => s.targetZoneId === targetZoneId && s.sourceZoneId === sourceZoneId,
          );

          const exceededSince = existingState?.exceededSince ?? now;
          const exceededDurationMs = now - exceededSince;

          const state: CriticalMassState = {
            targetZoneId,
            sourceZoneId,
            foreignAgentCount: foreignCount,
            totalAgentCount: targetZone.occupantCount,
            foreignRatio,
            thresholdExceeded: true,
            thresholdRatio: this.config.criticalMassRatio,
            exceededSince,
            exceededDurationMs,
            policyResponse: null,
          };

          // Check if duration threshold is exceeded
          if (exceededDurationMs >= this.config.criticalMassDurationMs) {
            state.policyResponse = this.config.defaultCriticalMassPolicy;

            // Only trigger event and callback if this is a new trigger
            if (!existingState?.policyResponse) {
              this.totalCriticalMassTriggers++;
              this.emitEvent('zone:critical-mass', { state });
              this.config.onCriticalMassPolicy(state);

              logger.warn('[CulturalZoneManager] Critical mass override detected', {
                targetZone: targetZoneId,
                sourceZone: sourceZoneId,
                foreignRatio: foreignRatio.toFixed(3),
                policy: state.policyResponse,
              });
            }
          }

          newCriticalMassStates.push(state);
        }
      }
    }

    // Check for resolved critical mass states
    for (const oldState of this.state.criticalMassStates) {
      const stillActive = newCriticalMassStates.find(
        s => s.targetZoneId === oldState.targetZoneId && s.sourceZoneId === oldState.sourceZoneId,
      );

      if (!stillActive) {
        this.emitEvent('zone:critical-mass-resolved', {
          targetZoneId: oldState.targetZoneId,
          sourceZoneId: oldState.sourceZoneId,
        });

        logger.info('[CulturalZoneManager] Critical mass resolved', {
          targetZone: oldState.targetZoneId,
          sourceZone: oldState.sourceZoneId,
        });
      }
    }

    this.state.criticalMassStates = newCriticalMassStates;
  }

  // ===========================================================================
  // PERMEABILITY METRICS (Step 5)
  // ===========================================================================

  /**
   * Aggregate permeability metrics for all boundaries.
   */
  private aggregatePermeabilityMetrics(): void {
    const now = Date.now();

    for (const key of Object.keys(this.state.permeabilityMetrics)) {
      const metrics = this.state.permeabilityMetrics[key];
      const boundary = this.state.boundaries[key];
      if (!boundary) {
        delete this.state.permeabilityMetrics[key];
        continue;
      }

      // Update from boundary state
      metrics.currentPermeability = (boundary.permeabilityAtoB + boundary.permeabilityBtoA) / 2;
      metrics.culturalSimilarity = boundary.culturalSimilarity;
      metrics.tensionScore = boundary.tensionScore;

      // Check if measurement window has elapsed
      if (now - metrics.windowStartTimestamp >= metrics.windowDurationMs) {
        // Record permeability history
        metrics.permeabilityHistory.push({
          value: metrics.currentPermeability,
          timestamp: now,
        });
        if (metrics.permeabilityHistory.length > this.config.maxPermeabilityHistory) {
          metrics.permeabilityHistory.shift();
        }

        // Reset window
        metrics.crossingsAtoB = 0;
        metrics.crossingsBtoA = 0;
        metrics.crossInteractions = 0;
        metrics.successfulInteractions = 0;
        metrics.failedInteractions = 0;
        metrics.windowStartTimestamp = now;
      }

      // Determine bridge agent recommendation
      metrics.bridgeAgentRecommended =
        metrics.tensionScore >= this.config.tensionThresholdForBridgeRecommendation ||
        metrics.interactionSuccessRate < 0.5;
    }
  }

  /**
   * Create initial permeability metrics for a boundary.
   */
  private createPermeabilityMetrics(
    zoneAId: ZoneId,
    zoneBId: ZoneId,
    similarity: number,
  ): ZonePermeabilityMetrics {
    return {
      zoneAId,
      zoneBId,
      currentPermeability: similarity,
      permeabilityHistory: [],
      crossingsAtoB: 0,
      crossingsBtoA: 0,
      crossInteractions: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      interactionSuccessRate: 1.0,
      avgTrustScoreAtoB: 1.0,
      avgTrustScoreBtoA: 1.0,
      culturalSimilarity: similarity,
      tensionScore: 1.0 - similarity,
      bridgeAgentRecommended: similarity < this.config.bridgeAgentDeploymentThreshold,
      windowDurationMs: this.config.metricsWindowMs,
      windowStartTimestamp: Date.now(),
    };
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive zone management metrics.
   */
  getMetrics(): CulturalZoneManagerMetrics {
    let averageCycleDuration = 0;
    if (this.cycleDurations.length > 0) {
      averageCycleDuration =
        this.cycleDurations.reduce((a, b) => a + b, 0) / this.cycleDurations.length;
    }

    // Compute averages across boundaries
    let totalSimilarity = 0;
    let totalPermeability = 0;
    let boundaryCount = 0;
    for (const boundary of Object.values(this.state.boundaries)) {
      totalSimilarity += boundary.culturalSimilarity;
      totalPermeability += (boundary.permeabilityAtoB + boundary.permeabilityBtoA) / 2;
      boundaryCount++;
    }

    let activeBridgeAgents = 0;
    for (const agent of Object.values(this.state.bridgeAgents)) {
      if (agent.status === 'active' || agent.status === 'idle') {
        activeBridgeAgents++;
      }
    }

    const activeZones = Object.values(this.state.zones)
      .filter(z => z.status === 'active').length;

    return {
      isRunning: this.isRunning,
      managementHz: this.config.managementHz,
      totalZones: Object.keys(this.state.zones).length,
      activeZones,
      totalBoundaries: boundaryCount,
      activeBridgeAgents,
      totalTrackedAgents: this.agentPositions.size,
      averageCulturalSimilarity: boundaryCount > 0 ? totalSimilarity / boundaryCount : 0,
      averagePermeability: boundaryCount > 0 ? totalPermeability / boundaryCount : 0,
      activeCriticalMassCount: this.state.criticalMassStates.filter(s => s.thresholdExceeded).length,
      totalZoneEntries: this.totalZoneEntries,
      totalZoneExits: this.totalZoneExits,
      totalEntryDenials: this.totalEntryDenials,
      totalBridgeDeployments: this.totalBridgeDeployments,
      totalBridgeRecalls: this.totalBridgeRecalls,
      totalCriticalMassTriggers: this.totalCriticalMassTriggers,
      averageCycleDurationMs: Math.round(averageCycleDuration * 1000) / 1000,
    };
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
 * Create a CulturalZoneManager with the given configuration.
 */
export function createCulturalZoneManager(
  config: CulturalZoneManagerConfig,
): CulturalZoneManager {
  return new CulturalZoneManager(config);
}
