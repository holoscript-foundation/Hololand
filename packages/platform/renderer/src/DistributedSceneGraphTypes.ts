/**
 * DistributedSceneGraphTypes
 *
 * Shared type definitions for the MA3DSG-inspired distributed scene graph
 * generation system. Implements multi-agent local graph building, training-free
 * alignment merging, and spatial relationship extraction.
 *
 * ARCHITECTURE:
 * Multiple agents independently build local 3D semantic scene graphs from their
 * observations. A training-free alignment algorithm merges these partial graphs
 * into a unified global scene graph without any learnable parameters. Spatial
 * relationships are then extracted from the merged graph.
 *
 * This integrates with HoloLand's existing inference architecture:
 * - Tier 1 (Slow, 1-5Hz): Distributed graph building + alignment merging
 * - Tier 2 (Fast, 90Hz): Renderer reads merged spatial state from front buffer
 *
 * Reference: MA3DSG (arxiv:2602.04152) adapted for real-time VR/AR.
 *
 * @module DistributedSceneGraphTypes
 */

import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// GRAPH NODE TYPES
// =============================================================================

/**
 * A segment in the 3D Global Segmentation Map (3D GSM).
 * Each segment represents a coherent spatial region discovered by an agent.
 *
 * Based on MA3DSG segment representation:
 * - Centroid p_bar_i
 * - Standard deviation sigma_i
 * - Axis-aligned bounding box dimensions b_i
 * - Maximum length l_i
 * - Volume v_i
 */
export interface SceneGraphSegment {
  /** Unique segment identifier (scoped to agent) */
  id: string;
  /** Semantic label for this segment (e.g., 'table', 'chair', 'wall') */
  label: string;
  /** Centroid position in world space */
  centroid: Vec3;
  /** Standard deviation of point positions (spatial spread) */
  standardDeviation: Vec3;
  /** Axis-aligned bounding box minimum */
  boundsMin: Vec3;
  /** Axis-aligned bounding box maximum */
  boundsMax: Vec3;
  /** Bounding box dimensions (width, height, depth) */
  boundsDimensions: Vec3;
  /** Maximum dimension length */
  maxLength: number;
  /** Volume of the bounding box */
  volume: number;
  /** Number of points/observations in this segment */
  pointCount: number;
  /** Whether the segment is currently active (being observed) */
  active: boolean;
  /** Timestamp of last observation update */
  lastUpdated: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A node in the scene graph, wrapping a segment with graph connectivity.
 */
export interface SceneGraphNode {
  /** Unique node ID (globally unique after merging) */
  id: string;
  /** The underlying spatial segment */
  segment: SceneGraphSegment;
  /** Feature vector for node matching (spatial-invariant properties) */
  featureVector: number[];
  /** IDs of neighboring nodes (connected by edges) */
  neighborIds: string[];
  /** Agent ID that originally created this node */
  sourceAgentId: string;
  /** Confidence score for this node (0-1) */
  confidence: number;
  /** Whether this node has been merged from multiple agents */
  merged: boolean;
  /** IDs of source nodes that were merged into this node */
  mergedFromIds: string[];
}

// =============================================================================
// GRAPH EDGE TYPES
// =============================================================================

/**
 * An edge in the scene graph connecting two nodes.
 * Edge features encode relative spatial properties between segments.
 *
 * Based on MA3DSG edge encoding:
 * e_ij = f_s([delta_p, delta_sigma, delta_b, ln(v_i/v_j), ln(l_i/l_j)])
 */
export interface SceneGraphEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** Relative centroid displacement */
  relativeCentroid: Vec3;
  /** Relative standard deviation difference */
  relativeStdDev: Vec3;
  /** Relative bounding box dimension difference */
  relativeBounds: Vec3;
  /** Log volume ratio: ln(v_source / v_target) */
  logVolumeRatio: number;
  /** Log length ratio: ln(l_source / l_target) */
  logLengthRatio: number;
  /** Edge feature vector (computed from spatial properties) */
  featureVector: number[];
  /** Confidence score for this edge (0-1) */
  confidence: number;
  /** Spatial relationship type inferred from edge features */
  relationshipType: DistributedSpatialRelationType;
}

/**
 * Spatial relationship types detected from edge features.
 * Extends the existing SpatialRelationType with distribution-aware types.
 */
export type DistributedSpatialRelationType =
  | 'adjacent'       // Segments share a boundary
  | 'near'           // Segments within proximity threshold
  | 'far'            // Segments beyond proximity threshold
  | 'above'          // Source is above target
  | 'below'          // Source is below target
  | 'contains'       // Source contains target
  | 'contained_by'   // Source is inside target
  | 'supporting'     // Source supports target (below + adjacent)
  | 'supported_by'   // Source is supported by target
  | 'beside'         // On the same horizontal plane, near
  | 'facing'         // Oriented toward each other
  | 'coplanar'       // On the same geometric plane
  | 'stacked'        // Vertically aligned with contact
  | 'grouped';       // Part of the same semantic cluster

// =============================================================================
// LOCAL SCENE GRAPH (PER-AGENT)
// =============================================================================

/**
 * A local scene graph built by a single agent.
 * Contains nodes (segments) and edges (spatial relationships) observed
 * from that agent's perspective.
 */
export interface LocalSceneGraph {
  /** Agent ID that owns this graph */
  agentId: string;
  /** All nodes in this local graph */
  nodes: Map<string, SceneGraphNode>;
  /** All edges in this local graph */
  edges: Map<string, SceneGraphEdge>;
  /** Timestamp of graph creation */
  createdAt: number;
  /** Timestamp of last update */
  lastUpdated: number;
  /** Sequence number for versioning */
  sequence: number;
  /** Spatial bounds of the entire local graph */
  bounds: { min: Vec3; max: Vec3 };
  /** Total number of observations incorporated */
  observationCount: number;
}

// =============================================================================
// GLOBAL SCENE GRAPH (MERGED)
// =============================================================================

/**
 * The unified global scene graph after alignment merging.
 * Contains all nodes and edges from all agents, deduplicated and aligned.
 */
export interface GlobalSceneGraph {
  /** All nodes in the merged graph */
  nodes: Map<string, SceneGraphNode>;
  /** All edges in the merged graph */
  edges: Map<string, SceneGraphEdge>;
  /** Agent IDs that contributed to this graph */
  contributingAgentIds: string[];
  /** Merge history for provenance tracking */
  mergeHistory: MergeEvent[];
  /** Timestamp of last merge */
  lastMerged: number;
  /** Total merge count */
  mergeCount: number;
  /** Spatial bounds of the entire global graph */
  bounds: { min: Vec3; max: Vec3 };
}

/**
 * Record of a single merge operation between two graphs.
 */
export interface MergeEvent {
  /** Timestamp of the merge */
  timestamp: number;
  /** Agent ID whose local graph was merged */
  agentId: string;
  /** Number of nodes matched (existing nodes updated) */
  matchedNodes: number;
  /** Number of new nodes added */
  newNodes: number;
  /** Number of conflicting labels resolved */
  labelConflicts: number;
  /** Number of edges added or updated */
  edgesUpdated: number;
  /** Duration of the merge operation in ms */
  durationMs: number;
}

// =============================================================================
// ALIGNMENT MATCHING TYPES
// =============================================================================

/**
 * A candidate match between a node in the query graph and reference graph.
 * Used during the graph search phase of alignment.
 */
export interface NodeMatch {
  /** Node ID in the query graph */
  queryNodeId: string;
  /** Node ID in the reference graph */
  referenceNodeId: string;
  /** Label match (exact string match) */
  labelMatch: boolean;
  /** Centroid distance between the two nodes */
  centroidDistance: number;
  /** Bounding box IoU (Intersection over Union) */
  bboxIoU: number;
  /** Overall match confidence (0-1) */
  confidence: number;
  /** Match type classification */
  matchType: 'matching' | 'conflict' | 'new';
}

/**
 * A triplet match (node-edge-node) used for expanding graph alignment.
 */
export interface TripletMatch {
  /** Source node match */
  sourceMatch: NodeMatch;
  /** Target node match */
  targetMatch: NodeMatch;
  /** Edge from query graph */
  queryEdge: SceneGraphEdge;
  /** Corresponding edge from reference graph (if exists) */
  referenceEdge?: SceneGraphEdge;
  /** Triplet match confidence */
  confidence: number;
}

// =============================================================================
// ALIGNMENT CONFIGURATION
// =============================================================================

/**
 * Configuration for the training-free alignment algorithm.
 */
export interface AlignmentConfig {
  /** Minimum intersection subgraph size to trigger merge (default: 3) */
  minIntersectionSize: number;
  /** Maximum centroid distance for node matching (default: 2.0) */
  maxCentroidDistance: number;
  /** Minimum bounding box IoU for node matching (default: 0.3) */
  minBboxIoU: number;
  /** Minimum confidence to accept a match (default: 0.5) */
  minMatchConfidence: number;
  /** Maximum number of anchor candidates to try (default: 10) */
  maxAnchorCandidates: number;
  /** Maximum search depth for neighbor expansion (default: 5) */
  maxSearchDepth: number;
  /** Whether to resolve label conflicts (default: true) */
  resolveLabelConflicts: boolean;
}

/**
 * Default alignment configuration.
 */
export const DEFAULT_ALIGNMENT_CONFIG: AlignmentConfig = {
  minIntersectionSize: 3,
  maxCentroidDistance: 2.0,
  minBboxIoU: 0.3,
  minMatchConfidence: 0.5,
  maxAnchorCandidates: 10,
  maxSearchDepth: 5,
  resolveLabelConflicts: true,
};

// =============================================================================
// ORCHESTRATOR CONFIGURATION
// =============================================================================

/**
 * Configuration for the DistributedSceneGraphOrchestrator.
 */
export interface DistributedSceneGraphConfig {
  /** Alignment configuration */
  alignment: AlignmentConfig;
  /** Maximum number of agents supported (default: 8) */
  maxAgents: number;
  /** Neighbor distance threshold for edge creation (default: 5.0) */
  neighborDistanceThreshold: number;
  /** Minimum segment point count to include (default: 10) */
  minSegmentPoints: number;
  /** Feature vector dimension (default: 12) */
  featureVectorDimension: number;
  /** Whether to emit events on graph changes (default: true) */
  emitEvents: boolean;
  /** Maximum edges per node (default: 8) */
  maxEdgesPerNode: number;
}

/**
 * Default orchestrator configuration.
 */
export const DEFAULT_DISTRIBUTED_SCENE_GRAPH_CONFIG: DistributedSceneGraphConfig = {
  alignment: DEFAULT_ALIGNMENT_CONFIG,
  maxAgents: 8,
  neighborDistanceThreshold: 5.0,
  minSegmentPoints: 10,
  featureVectorDimension: 12,
  emitEvents: true,
  maxEdgesPerNode: 8,
};

// =============================================================================
// METRICS
// =============================================================================

/**
 * Metrics for the distributed scene graph system.
 */
export interface DistributedSceneGraphMetrics {
  /** Number of active agents */
  activeAgents: number;
  /** Total nodes in global graph */
  globalNodeCount: number;
  /** Total edges in global graph */
  globalEdgeCount: number;
  /** Per-agent local graph sizes */
  agentGraphSizes: Record<string, { nodes: number; edges: number }>;
  /** Total merges performed */
  totalMerges: number;
  /** Average merge duration in ms */
  averageMergeDurationMs: number;
  /** Total nodes matched during merges */
  totalMatchedNodes: number;
  /** Total new nodes added during merges */
  totalNewNodes: number;
  /** Total label conflicts resolved */
  totalLabelConflicts: number;
  /** Last merge timestamp */
  lastMergeTimestamp: number;
  /** Global graph spatial extent (max dimension) */
  spatialExtent: number;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by the distributed scene graph system.
 */
export type DistributedSceneGraphEventType =
  | 'agent_registered'
  | 'agent_unregistered'
  | 'local_graph_updated'
  | 'merge_started'
  | 'merge_completed'
  | 'node_matched'
  | 'node_added'
  | 'label_conflict'
  | 'edge_updated'
  | 'global_graph_rebuilt';

/**
 * Event payload for distributed scene graph events.
 */
export interface DistributedSceneGraphEvent {
  /** Event type */
  type: DistributedSceneGraphEventType;
  /** Timestamp of the event */
  timestamp: number;
  /** Agent ID involved (if applicable) */
  agentId?: string;
  /** Additional event data */
  data: Record<string, unknown>;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty local scene graph for an agent.
 */
export function createEmptyLocalSceneGraph(agentId: string): LocalSceneGraph {
  return {
    agentId,
    nodes: new Map(),
    edges: new Map(),
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    sequence: 0,
    bounds: {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    },
    observationCount: 0,
  };
}

/**
 * Create an empty global scene graph.
 */
export function createEmptyGlobalSceneGraph(): GlobalSceneGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    contributingAgentIds: [],
    mergeHistory: [],
    lastMerged: 0,
    mergeCount: 0,
    bounds: {
      min: { x: Infinity, y: Infinity, z: Infinity },
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
    },
  };
}
