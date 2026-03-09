/**
 * CulturalZoneTypes
 *
 * Type definitions for the Cultural Zone system -- Axelrod-style boundary
 * management for VR worlds with graduated interaction bandwidth between
 * zones, automatic bridge agent deployment, zone permeability metrics,
 * and critical mass override detection.
 *
 * THEORETICAL FOUNDATION:
 * Based on Robert Axelrod's model of cultural dissemination (1997), where
 * agents occupy positions on a grid, each with a cultural vector of features.
 * Interaction probability between neighbors is proportional to their cultural
 * similarity (number of shared features). Over time, this produces emergent
 * cultural regions with sharp boundaries between dissimilar groups and
 * homogeneous interiors.
 *
 * ADAPTATION FOR VR WORLDS:
 * In HoloLand, cultural zones are spatial regions within a VR world where
 * agents share behavioral norms, interaction protocols, communication
 * styles, and trust levels. The "cultural vector" is composed of:
 *   - Language/communication protocol preferences
 *   - Trust level requirements (minimum trust for entry)
 *   - Interaction bandwidth limits (message rate, gesture frequency)
 *   - Spatial norms (personal space radius, movement speed limits)
 *   - Functional role preferences (builder, analyst, moderator, etc.)
 *
 * BOUNDARY MODEL:
 * Zone boundaries are not hard walls but graduated membranes. The
 * "permeability" of a boundary between two zones is inversely proportional
 * to their cultural distance (1 - similarity). High permeability means
 * agents can cross freely and interact at full bandwidth. Low permeability
 * means restricted crossing and throttled interaction bandwidth.
 *
 * BRIDGE AGENTS:
 * When two adjacent zones have low cultural similarity (high boundary
 * tension), the system can automatically deploy "bridge agents" --
 * specialized agents that mediate cross-zone interactions, translate
 * norms, and facilitate cultural exchange. Bridge agents are placed at
 * boundary anchors using the SharedSpatialAnchor system.
 *
 * CRITICAL MASS OVERRIDE:
 * When the number of agents from Zone A currently present in Zone B
 * exceeds a critical mass threshold, the system detects a "cultural
 * invasion" and can trigger policy responses: temporary permeability
 * increase, bridge agent reinforcement, or zone norm renegotiation.
 *
 * INTEGRATION POINTS:
 * - SharedSpatialAnchors: Zone boundaries are defined using semantic
 *   anchors with 'extent' fields. Bridge agents are placed at boundary
 *   anchors.
 * - BehavioralTrustScoring: Zone entry requirements are enforced via
 *   trust scores. Trust dimension weights can vary per zone (e.g., a
 *   "quiet zone" might weight interaction_appropriateness higher).
 * - GossipTrustMesh: Zone configuration changes propagate across the
 *   mesh using the gossip protocol.
 *
 * PERFORMANCE:
 * - Zone containment check: O(1) via spatial hash (render-loop safe)
 * - Cultural similarity: O(f) where f = feature vector length (~10)
 * - Permeability lookup: O(1) from precomputed boundary table
 * - Bridge agent placement: O(b) where b = boundary count (off render loop)
 * - Critical mass check: O(z) where z = zone count (off render loop)
 *
 * @module CulturalZoneTypes
 */

import type { Vec3, Quat } from './AgentStateBuffer';
import type { AnchorId } from './SharedSpatialAnchorTypes';
import type { TrustDimension } from './BehavioralTrustScoring';

// =============================================================================
// CULTURAL VECTOR
// =============================================================================

/**
 * A cultural feature that characterizes a zone or agent's behavioral norms.
 *
 * Features are discrete traits drawn from a fixed set of possible values.
 * Cultural similarity between two entities is the fraction of features
 * with matching values (Axelrod overlap coefficient).
 */
export type CulturalFeatureId = string;

/**
 * A single cultural feature with its possible values and current assignment.
 */
export interface CulturalFeature {
  /** Unique feature identifier (e.g., 'communication_style', 'trust_protocol') */
  id: CulturalFeatureId;
  /** Human-readable label */
  label: string;
  /** Description of what this feature represents */
  description: string;
  /** Set of possible values for this feature */
  possibleValues: string[];
  /** Currently assigned value */
  value: string;
  /** Weight of this feature in similarity calculations (default: 1.0) */
  weight: number;
}

/**
 * A complete cultural vector -- the set of all cultural features for a
 * zone or agent. This is the core data structure for Axelrod-style
 * cultural comparison.
 *
 * In the original Axelrod model, this is a fixed-length vector of integers.
 * Here we use named features with weighted string values for richer
 * expressiveness while maintaining the same similarity computation.
 */
export interface CulturalVector {
  /** Map of featureId -> CulturalFeature */
  features: Record<CulturalFeatureId, CulturalFeature>;
  /** Version counter for tracking cultural evolution over time */
  version: number;
  /** Timestamp of last feature modification */
  lastModified: number;
}

// =============================================================================
// ZONE IDENTITY
// =============================================================================

/**
 * Unique identifier for a cultural zone.
 * Format: `zone:{world-id}:{zone-name}`
 */
export type ZoneId = string;

/**
 * Zone classification by primary function.
 */
export type ZoneType =
  | 'workspace'       // Collaborative work environment
  | 'social'          // Casual interaction and social gathering
  | 'restricted'      // Limited access, high-trust requirements
  | 'transit'         // Movement corridors between zones
  | 'presentation'    // One-to-many broadcast zones
  | 'meditation'      // Low-interaction, focused zones
  | 'marketplace'     // Trading and economic activity
  | 'custom';         // User-defined zone type

/**
 * Zone lifecycle state.
 */
export type ZoneStatus =
  | 'active'          // Zone is operational and accepting agents
  | 'forming'         // Zone is being configured, not yet active
  | 'suspended'       // Temporarily disabled (e.g., scheduled downtime)
  | 'dissolving'      // Zone is being removed, agents are being relocated
  | 'archived';       // Historical zone, no longer active

// =============================================================================
// ZONE GEOMETRY
// =============================================================================

/**
 * The spatial geometry of a zone within the VR world.
 *
 * Zones are defined as axis-aligned bounding boxes (AABBs) for O(1)
 * containment checks, with optional convex hull for precise boundaries.
 * The AABB is used for fast spatial hashing; the convex hull (if provided)
 * is used for accurate boundary detection.
 */
export interface ZoneGeometry {
  /** Center position of the zone in world space */
  center: Vec3;
  /** Half-extents of the AABB (for O(1) containment check) */
  halfExtents: Vec3;
  /** Orientation of the zone (for rotated AABBs) */
  rotation: Quat;
  /** Optional convex hull vertices for precise boundary (off render loop) */
  convexHull: Vec3[] | null;
  /** Floor area in square world units */
  floorArea: number;
  /** Volume in cubic world units */
  volume: number;
}

// =============================================================================
// ZONE NORMS
// =============================================================================

/**
 * Behavioral norms enforced within a zone.
 *
 * These norms integrate with BehavioralTrustScoring by overriding
 * the default dimension weights and thresholds when agents are inside
 * the zone.
 */
export interface ZoneNorms {
  /** Minimum composite trust score required to enter the zone (0-1) */
  minTrustScore: number;
  /** Maximum agent capacity for this zone */
  maxOccupancy: number;
  /** Per-dimension trust weight overrides for agents inside this zone */
  trustDimensionWeights: Partial<Record<TrustDimension, number>>;
  /** Maximum chat messages per minute within this zone */
  maxChatPerMinute: number;
  /** Maximum gestures per minute within this zone */
  maxGesturesPerMinute: number;
  /** Personal space radius override (world units) */
  personalSpaceRadius: number;
  /** Maximum movement speed within this zone (world units/sec) */
  maxMovementSpeed: number;
  /** Whether voice communication is permitted */
  voiceAllowed: boolean;
  /** Whether agents can modify spatial anchors within this zone */
  anchorModificationAllowed: boolean;
  /** Custom norm key-value pairs */
  customNorms: Record<string, unknown>;
}

// =============================================================================
// ZONE BOUNDARY
// =============================================================================

/**
 * Interaction bandwidth levels for graduated boundary crossings.
 *
 * When an agent crosses from one zone to another, the interaction
 * bandwidth is throttled based on the cultural distance between zones.
 * This creates a gradient effect at boundaries rather than hard walls.
 */
export type InteractionBandwidthLevel =
  | 'full'            // 100% bandwidth (same zone or identical cultures)
  | 'high'            // 75% bandwidth (similarity > 0.75)
  | 'moderate'        // 50% bandwidth (0.5 < similarity <= 0.75)
  | 'limited'         // 25% bandwidth (0.25 < similarity <= 0.5)
  | 'minimal'         // 10% bandwidth (0 < similarity <= 0.25)
  | 'blocked';        // 0% bandwidth (similarity = 0, zone locked)

/**
 * A boundary between two cultural zones.
 *
 * Boundaries are bidirectional but may have asymmetric permeability
 * (e.g., easier to enter a social zone from a workspace than vice versa).
 */
export interface ZoneBoundary {
  /** Zone on side A of the boundary */
  zoneAId: ZoneId;
  /** Zone on side B of the boundary */
  zoneBId: ZoneId;
  /** Permeability from A to B (0.0 = impermeable, 1.0 = fully open) */
  permeabilityAtoB: number;
  /** Permeability from B to A */
  permeabilityBtoA: number;
  /** Cultural similarity between zones (Axelrod overlap coefficient, 0-1) */
  culturalSimilarity: number;
  /** Interaction bandwidth level from A to B */
  bandwidthAtoB: InteractionBandwidthLevel;
  /** Interaction bandwidth level from B to A */
  bandwidthBtoA: InteractionBandwidthLevel;
  /** Spatial anchor marking this boundary */
  boundaryAnchorId: AnchorId | null;
  /** Whether a bridge agent is deployed at this boundary */
  hasBridgeAgent: boolean;
  /** Bridge agent ID if deployed */
  bridgeAgentId: string | null;
  /** Boundary tension score (0 = peaceful, 1 = high friction) */
  tensionScore: number;
  /** Number of cross-boundary interactions in the last measurement window */
  crossInteractionCount: number;
  /** Timestamp of last permeability recalculation */
  lastRecalculated: number;
}

// =============================================================================
// BRIDGE AGENT
// =============================================================================

/**
 * Bridge agent deployment status.
 */
export type BridgeAgentStatus =
  | 'deploying'       // Agent is being instantiated and positioned
  | 'active'          // Agent is mediating at the boundary
  | 'idle'            // No cross-boundary traffic, agent is in standby
  | 'overloaded'      // Too many cross-boundary interactions to handle
  | 'recalled'        // Agent is being removed from the boundary
  | 'failed';         // Deployment or operation failed

/**
 * Configuration for an automatically deployed bridge agent.
 *
 * Bridge agents mediate cross-zone interactions at boundaries with
 * high cultural distance. They are placed at boundary anchors using
 * the SharedSpatialAnchor system.
 */
export interface BridgeAgentConfig {
  /** Unique bridge agent identifier */
  agentId: string;
  /** The boundary this agent mediates */
  boundaryZoneAId: ZoneId;
  boundaryZoneBId: ZoneId;
  /** Current deployment status */
  status: BridgeAgentStatus;
  /** Position at the boundary (from boundary anchor) */
  position: Vec3;
  /** Spatial anchor used for placement */
  anchorId: AnchorId;
  /** Cultural vector of the bridge agent (should overlap with both zones) */
  culturalVector: CulturalVector;
  /** Maximum concurrent mediations this agent can handle */
  maxConcurrentMediations: number;
  /** Current active mediations */
  activeMediations: number;
  /** Timestamp of deployment */
  deployedAt: number;
  /** Total interactions mediated */
  totalMediations: number;
  /** Average mediation satisfaction score (0-1) */
  satisfactionScore: number;
  /** Whether this bridge agent was auto-deployed or manually placed */
  autoDeployed: boolean;
}

// =============================================================================
// CRITICAL MASS
// =============================================================================

/**
 * Critical mass override detection state.
 *
 * When agents from one zone accumulate in another zone beyond the
 * critical mass threshold, the system detects a potential "cultural
 * shift" or "invasion" and triggers policy responses.
 */
export interface CriticalMassState {
  /** The zone being "invaded" */
  targetZoneId: ZoneId;
  /** The source zone whose agents are accumulating */
  sourceZoneId: ZoneId;
  /** Number of source-zone agents currently in the target zone */
  foreignAgentCount: number;
  /** Total agents currently in the target zone */
  totalAgentCount: number;
  /** Ratio of foreign agents (foreignAgentCount / totalAgentCount) */
  foreignRatio: number;
  /** Whether critical mass threshold has been exceeded */
  thresholdExceeded: boolean;
  /** The configured threshold ratio (e.g., 0.4 = 40% foreign agents) */
  thresholdRatio: number;
  /** Timestamp when threshold was first exceeded (0 if not exceeded) */
  exceededSince: number;
  /** Duration in ms that threshold has been exceeded */
  exceededDurationMs: number;
  /** Policy response that has been triggered */
  policyResponse: CriticalMassPolicyResponse | null;
}

/**
 * Policy responses when critical mass override is detected.
 */
export type CriticalMassPolicyResponse =
  | 'notify'                // Alert zone administrators
  | 'increase_permeability' // Temporarily increase boundary permeability
  | 'deploy_bridge_agents'  // Reinforce boundary with additional bridge agents
  | 'renegotiate_norms'     // Trigger norm renegotiation between zones
  | 'restrict_entry'        // Temporarily restrict further entry from source zone
  | 'merge_zones';          // Dissolve boundary and merge zones

// =============================================================================
// ZONE PERMEABILITY METRICS
// =============================================================================

/**
 * Comprehensive permeability metrics for a zone boundary.
 *
 * These metrics track the flow of agents and interactions across
 * zone boundaries over time, enabling data-driven permeability
 * adjustments and bridge agent deployment decisions.
 */
export interface ZonePermeabilityMetrics {
  /** Boundary this metric pertains to */
  zoneAId: ZoneId;
  zoneBId: ZoneId;
  /** Current permeability (0-1) */
  currentPermeability: number;
  /** Permeability trend over the last N measurement windows */
  permeabilityHistory: Array<{ value: number; timestamp: number }>;
  /** Agent crossings A->B in the current measurement window */
  crossingsAtoB: number;
  /** Agent crossings B->A in the current measurement window */
  crossingsBtoA: number;
  /** Total cross-boundary interactions in the current window */
  crossInteractions: number;
  /** Successful cross-boundary interactions (no trust violations) */
  successfulInteractions: number;
  /** Failed cross-boundary interactions (trust violations) */
  failedInteractions: number;
  /** Interaction success rate (0-1) */
  interactionSuccessRate: number;
  /** Average trust score of agents crossing A->B */
  avgTrustScoreAtoB: number;
  /** Average trust score of agents crossing B->A */
  avgTrustScoreBtoA: number;
  /** Cultural similarity at this boundary */
  culturalSimilarity: number;
  /** Boundary tension score (0 = peaceful, 1 = high friction) */
  tensionScore: number;
  /** Whether bridge agent is needed based on metrics */
  bridgeAgentRecommended: boolean;
  /** Measurement window duration in ms */
  windowDurationMs: number;
  /** Timestamp of current window start */
  windowStartTimestamp: number;
}

// =============================================================================
// CULTURAL ZONE
// =============================================================================

/**
 * Complete state of a cultural zone within a VR world.
 *
 * This is the primary data structure for zone management. Each zone
 * contains its cultural vector, spatial geometry, behavioral norms,
 * and occupancy information.
 */
export interface CulturalZone {
  // --- Identity ---
  /** Unique zone identifier */
  id: ZoneId;
  /** Human-readable zone name */
  name: string;
  /** Zone type classification */
  type: ZoneType;
  /** Current lifecycle status */
  status: ZoneStatus;
  /** Optional description */
  description: string;

  // --- Cultural State ---
  /** The zone's cultural vector (defines its identity) */
  culturalVector: CulturalVector;

  // --- Spatial ---
  /** Zone geometry in world space */
  geometry: ZoneGeometry;
  /** Spatial anchor that defines this zone's region */
  regionAnchorId: AnchorId;

  // --- Norms ---
  /** Behavioral norms enforced within this zone */
  norms: ZoneNorms;

  // --- Occupancy ---
  /** Agent IDs currently inside this zone */
  occupants: string[];
  /** Current occupant count */
  occupantCount: number;
  /** Agent ID of the zone's creator/owner */
  ownerId: string;
  /** Agent IDs with administrative privileges */
  adminIds: string[];

  // --- Metadata ---
  /** Tags for querying and filtering zones */
  tags: string[];
  /** Custom key-value metadata */
  metadata: Record<string, unknown>;
  /** Zone creation timestamp */
  createdAt: number;
  /** Last modification timestamp */
  updatedAt: number;
  /** Version counter */
  version: number;
}

// =============================================================================
// ZONE WORLD STATE
// =============================================================================

/**
 * The aggregate state of all cultural zones in a VR world.
 *
 * This state is double-buffered alongside the anchor world state
 * to provide render-loop safe zone containment queries.
 */
export interface CulturalZoneWorldState {
  /** Map of zoneId -> zone state */
  zones: Record<ZoneId, CulturalZone>;
  /** Map of boundary key -> boundary state */
  boundaries: Record<string, ZoneBoundary>;
  /** Map of agent ID -> bridge agent config */
  bridgeAgents: Record<string, BridgeAgentConfig>;
  /** Critical mass states (only populated when thresholds are exceeded) */
  criticalMassStates: CriticalMassState[];
  /** Permeability metrics for all boundaries */
  permeabilityMetrics: Record<string, ZonePermeabilityMetrics>;
  /** Spatial hash for O(1) zone containment queries */
  spatialHashCellSize: number;
  /** Sequence number (incremented on each sync) */
  sequence: number;
  /** Timestamp of last sync */
  lastSyncTimestamp: number;
}

// =============================================================================
// ZONE EVENTS
// =============================================================================

/**
 * Events emitted by the CulturalZoneManager.
 */
export interface CulturalZoneEventMap {
  /** Agent entered a zone */
  'zone:agent-entered': { zoneId: ZoneId; agentId: string; timestamp: number };
  /** Agent exited a zone */
  'zone:agent-exited': { zoneId: ZoneId; agentId: string; timestamp: number };
  /** Agent denied entry to a zone (trust score too low) */
  'zone:entry-denied': { zoneId: ZoneId; agentId: string; reason: string; trustScore: number };
  /** Zone boundary permeability changed */
  'zone:permeability-changed': {
    zoneAId: ZoneId;
    zoneBId: ZoneId;
    oldPermeability: number;
    newPermeability: number;
  };
  /** Bridge agent deployed at a boundary */
  'zone:bridge-deployed': {
    agentId: string;
    zoneAId: ZoneId;
    zoneBId: ZoneId;
    position: Vec3;
  };
  /** Bridge agent recalled from a boundary */
  'zone:bridge-recalled': {
    agentId: string;
    zoneAId: ZoneId;
    zoneBId: ZoneId;
    reason: string;
  };
  /** Critical mass threshold exceeded */
  'zone:critical-mass': {
    state: CriticalMassState;
  };
  /** Critical mass resolved (ratio dropped below threshold) */
  'zone:critical-mass-resolved': {
    targetZoneId: ZoneId;
    sourceZoneId: ZoneId;
  };
  /** Zone cultural vector changed */
  'zone:culture-changed': {
    zoneId: ZoneId;
    featureId: CulturalFeatureId;
    oldValue: string;
    newValue: string;
  };
  /** Interaction bandwidth changed at a boundary */
  'zone:bandwidth-changed': {
    zoneAId: ZoneId;
    zoneBId: ZoneId;
    oldBandwidth: InteractionBandwidthLevel;
    newBandwidth: InteractionBandwidthLevel;
    direction: 'AtoB' | 'BtoA';
  };
  /** Zone created */
  'zone:created': { zone: CulturalZone };
  /** Zone dissolved */
  'zone:dissolved': { zoneId: ZoneId; reason: string };
  /** Error */
  'zone:error': { message: string; zoneId?: ZoneId; code: string };
}

export type CulturalZoneEventType = keyof CulturalZoneEventMap;
export type CulturalZoneEventHandler<T extends CulturalZoneEventType> = (
  event: CulturalZoneEventMap[T],
) => void;

// =============================================================================
// MANAGER CONFIGURATION
// =============================================================================

/**
 * Configuration for the CulturalZoneManager.
 */
export interface CulturalZoneManagerConfig {
  /** Local agent/node ID */
  localAgentId: string;

  /** World ID this zone system belongs to */
  worldId: string;

  /** Zone management cycle frequency in Hz (default: 2, off render loop) */
  managementHz?: number;

  /** Spatial hash cell size for O(1) zone containment (default: 10.0) */
  spatialHashCellSize?: number;

  /** Default cultural features for new zones */
  defaultFeatures?: CulturalFeature[];

  /** Default zone norms */
  defaultNorms?: Partial<ZoneNorms>;

  // --- Boundary Configuration ---

  /**
   * Permeability thresholds for interaction bandwidth levels.
   * These map cultural similarity ranges to bandwidth levels.
   */
  bandwidthThresholds?: {
    full: number;       // Similarity above this = full bandwidth (default: 0.9)
    high: number;       // Similarity above this = high bandwidth (default: 0.75)
    moderate: number;   // Similarity above this = moderate (default: 0.5)
    limited: number;    // Similarity above this = limited (default: 0.25)
    minimal: number;    // Similarity above this = minimal (default: 0.0)
    // Below minimal threshold = blocked
  };

  /**
   * Bridge agent deployment threshold.
   * Bridge agents are automatically deployed at boundaries with
   * cultural similarity below this value (default: 0.4).
   */
  bridgeAgentDeploymentThreshold?: number;

  /**
   * Bridge agent recall threshold.
   * Bridge agents are recalled when similarity rises above this
   * value (default: 0.7).
   */
  bridgeAgentRecallThreshold?: number;

  // --- Critical Mass Configuration ---

  /**
   * Critical mass ratio threshold (default: 0.4).
   * When foreign agents from one zone exceed this ratio of the
   * target zone's total occupants, critical mass override is triggered.
   */
  criticalMassRatio?: number;

  /**
   * Duration in ms that critical mass must persist before policy
   * response is triggered (default: 30000 = 30 seconds).
   */
  criticalMassDurationMs?: number;

  /**
   * Default policy response when critical mass is detected.
   */
  defaultCriticalMassPolicy?: CriticalMassPolicyResponse;

  // --- Permeability Metrics ---

  /**
   * Measurement window duration for permeability metrics (ms, default: 60000 = 1 min).
   */
  metricsWindowMs?: number;

  /**
   * Maximum permeability history entries (default: 60).
   */
  maxPermeabilityHistory?: number;

  /**
   * Tension score threshold for bridge agent recommendation (default: 0.6).
   */
  tensionThresholdForBridgeRecommendation?: number;

  // --- Callbacks ---

  /** Callback when a zone event occurs */
  onZoneEvent?: <T extends CulturalZoneEventType>(
    eventType: T,
    event: CulturalZoneEventMap[T],
  ) => void;

  /** Callback for bridge agent deployment requests */
  onBridgeAgentDeployRequest?: (
    zoneAId: ZoneId,
    zoneBId: ZoneId,
    position: Vec3,
  ) => string | null; // Returns agentId or null if deployment fails

  /** Callback for bridge agent recall requests */
  onBridgeAgentRecallRequest?: (agentId: string) => void;

  /** Callback when critical mass policy should be enforced */
  onCriticalMassPolicy?: (state: CriticalMassState) => void;
}

// =============================================================================
// MANAGER METRICS
// =============================================================================

/**
 * Metrics for the cultural zone management system.
 */
export interface CulturalZoneManagerMetrics {
  /** Whether the management loop is running */
  isRunning: boolean;
  /** Management cycle frequency */
  managementHz: number;
  /** Total zones */
  totalZones: number;
  /** Active zones */
  activeZones: number;
  /** Total boundaries */
  totalBoundaries: number;
  /** Active bridge agents */
  activeBridgeAgents: number;
  /** Total agents tracked across all zones */
  totalTrackedAgents: number;
  /** Average cultural similarity across all boundaries */
  averageCulturalSimilarity: number;
  /** Average permeability across all boundaries */
  averagePermeability: number;
  /** Active critical mass states */
  activeCriticalMassCount: number;
  /** Total zone entries */
  totalZoneEntries: number;
  /** Total zone exits */
  totalZoneExits: number;
  /** Total entry denials */
  totalEntryDenials: number;
  /** Total bridge agent deployments */
  totalBridgeDeployments: number;
  /** Total bridge agent recalls */
  totalBridgeRecalls: number;
  /** Total critical mass triggers */
  totalCriticalMassTriggers: number;
  /** Average management cycle duration in ms */
  averageCycleDurationMs: number;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty CulturalZoneWorldState.
 */
export function createEmptyCulturalZoneWorldState(
  spatialHashCellSize: number = 10.0,
): CulturalZoneWorldState {
  return {
    zones: {},
    boundaries: {},
    bridgeAgents: {},
    criticalMassStates: [],
    permeabilityMetrics: {},
    spatialHashCellSize,
    sequence: 0,
    lastSyncTimestamp: 0,
  };
}

/**
 * Create a boundary key from two zone IDs (order-independent).
 */
export function makeBoundaryKey(zoneAId: ZoneId, zoneBId: ZoneId): string {
  return zoneAId < zoneBId ? `${zoneAId}|${zoneBId}` : `${zoneBId}|${zoneAId}`;
}

/**
 * Parse a boundary key back into zone IDs.
 */
export function parseBoundaryKey(key: string): { zoneAId: ZoneId; zoneBId: ZoneId } {
  const pipeIndex = key.indexOf('|');
  if (pipeIndex === -1) {
    throw new Error(`Invalid boundary key: ${key}`);
  }
  return {
    zoneAId: key.substring(0, pipeIndex),
    zoneBId: key.substring(pipeIndex + 1),
  };
}

/**
 * Create a default cultural vector with standard features.
 */
export function createDefaultCulturalVector(): CulturalVector {
  return {
    features: {
      communication_style: {
        id: 'communication_style',
        label: 'Communication Style',
        description: 'Preferred communication formality level',
        possibleValues: ['formal', 'professional', 'casual', 'silent'],
        value: 'professional',
        weight: 1.0,
      },
      trust_protocol: {
        id: 'trust_protocol',
        label: 'Trust Protocol',
        description: 'How trust is established and maintained',
        possibleValues: ['strict', 'standard', 'relaxed', 'open'],
        value: 'standard',
        weight: 1.5,
      },
      interaction_tempo: {
        id: 'interaction_tempo',
        label: 'Interaction Tempo',
        description: 'Expected pace of interactions',
        possibleValues: ['rapid', 'normal', 'deliberate', 'contemplative'],
        value: 'normal',
        weight: 0.8,
      },
      spatial_density: {
        id: 'spatial_density',
        label: 'Spatial Density',
        description: 'Expected agent proximity norms',
        possibleValues: ['dense', 'comfortable', 'spacious', 'isolated'],
        value: 'comfortable',
        weight: 1.0,
      },
      functional_focus: {
        id: 'functional_focus',
        label: 'Functional Focus',
        description: 'Primary activity type in the zone',
        possibleValues: ['building', 'analysis', 'discussion', 'presentation', 'recreation', 'meditation'],
        value: 'discussion',
        weight: 1.2,
      },
      noise_tolerance: {
        id: 'noise_tolerance',
        label: 'Noise Tolerance',
        description: 'Acceptable level of ambient interaction noise',
        possibleValues: ['silent', 'quiet', 'moderate', 'lively', 'chaotic'],
        value: 'moderate',
        weight: 0.7,
      },
      hierarchy_model: {
        id: 'hierarchy_model',
        label: 'Hierarchy Model',
        description: 'How authority and decision-making are structured',
        possibleValues: ['flat', 'advisory', 'democratic', 'hierarchical', 'autocratic'],
        value: 'flat',
        weight: 1.0,
      },
      content_openness: {
        id: 'content_openness',
        label: 'Content Openness',
        description: 'How open the zone is to external content and ideas',
        possibleValues: ['closed', 'curated', 'moderated', 'open', 'unrestricted'],
        value: 'moderated',
        weight: 0.9,
      },
    },
    version: 1,
    lastModified: Date.now(),
  };
}

/**
 * Create default zone norms.
 */
export function createDefaultZoneNorms(): ZoneNorms {
  return {
    minTrustScore: 0.3,
    maxOccupancy: 50,
    trustDimensionWeights: {},
    maxChatPerMinute: 30,
    maxGesturesPerMinute: 20,
    personalSpaceRadius: 1.0,
    maxMovementSpeed: 10.0,
    voiceAllowed: true,
    anchorModificationAllowed: true,
    customNorms: {},
  };
}

/**
 * Create default zone geometry at a given center position.
 */
export function createDefaultZoneGeometry(
  center: Vec3,
  halfExtents: Vec3 = { x: 10, y: 5, z: 10 },
): ZoneGeometry {
  return {
    center,
    halfExtents,
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    convexHull: null,
    floorArea: halfExtents.x * 2 * halfExtents.z * 2,
    volume: halfExtents.x * 2 * halfExtents.y * 2 * halfExtents.z * 2,
  };
}

/**
 * Compute cultural similarity between two cultural vectors using
 * weighted Axelrod overlap coefficient.
 *
 * The overlap coefficient is the fraction of features with matching
 * values, weighted by feature importance:
 *
 *   similarity = sum(weight_i * match_i) / sum(weight_i)
 *
 * where match_i = 1 if feature values are equal, 0 otherwise.
 *
 * @param a - First cultural vector
 * @param b - Second cultural vector
 * @returns Similarity score between 0 (completely different) and 1 (identical)
 */
export function computeCulturalSimilarity(a: CulturalVector, b: CulturalVector): number {
  let weightedMatches = 0;
  let totalWeight = 0;

  const allFeatureIds = new Set([
    ...Object.keys(a.features),
    ...Object.keys(b.features),
  ]);

  for (const featureId of allFeatureIds) {
    const featureA = a.features[featureId];
    const featureB = b.features[featureId];

    if (featureA && featureB) {
      const weight = (featureA.weight + featureB.weight) / 2;
      totalWeight += weight;
      if (featureA.value === featureB.value) {
        weightedMatches += weight;
      }
    } else {
      // Feature exists only in one vector: count as mismatch
      const weight = (featureA?.weight ?? featureB?.weight ?? 1.0);
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? weightedMatches / totalWeight : 0;
}

/**
 * Determine interaction bandwidth level from cultural similarity.
 */
export function similarityToBandwidth(
  similarity: number,
  thresholds?: {
    full: number;
    high: number;
    moderate: number;
    limited: number;
    minimal: number;
  },
): InteractionBandwidthLevel {
  const t = thresholds ?? {
    full: 0.9,
    high: 0.75,
    moderate: 0.5,
    limited: 0.25,
    minimal: 0.0,
  };

  if (similarity >= t.full) return 'full';
  if (similarity >= t.high) return 'high';
  if (similarity >= t.moderate) return 'moderate';
  if (similarity >= t.limited) return 'limited';
  if (similarity > t.minimal) return 'minimal';
  return 'blocked';
}

/**
 * Convert bandwidth level to a numeric multiplier (0-1).
 */
export function bandwidthToMultiplier(bandwidth: InteractionBandwidthLevel): number {
  switch (bandwidth) {
    case 'full': return 1.0;
    case 'high': return 0.75;
    case 'moderate': return 0.5;
    case 'limited': return 0.25;
    case 'minimal': return 0.1;
    case 'blocked': return 0.0;
  }
}
