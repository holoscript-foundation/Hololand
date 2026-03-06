/**
 * AgentLocalGraphBuilder
 *
 * Implements the agent-local 3D semantic scene graph construction from MA3DSG.
 * Each agent independently builds a local graph from its observations (ObjectSnapshots),
 * computing segment features, node feature vectors, and spatial edges.
 *
 * PIPELINE:
 * 1. Receive ObjectSnapshot observations from the scene
 * 2. Convert to SceneGraphSegments with geometric properties
 * 3. Compute node feature vectors (spatial-invariant)
 * 4. Detect neighboring segments and create edges
 * 5. Compute edge feature vectors from relative spatial properties
 *
 * INTEGRATION:
 * - Consumes ObjectSnapshot[] from SpatialReasoningEngine's scene snapshots
 * - Produces LocalSceneGraph consumed by TrainingFreeAlignmentMerger
 * - Runs on Tier 1 (1-5Hz), NOT on the 90Hz render loop
 *
 * @module AgentLocalGraphBuilder
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type { ObjectSnapshot } from './SpatialReasoningEngine';
import type {
  SceneGraphSegment,
  SceneGraphNode,
  SceneGraphEdge,
  LocalSceneGraph,
  DistributedSpatialRelationType,
} from './DistributedSceneGraphTypes';
import { createEmptyLocalSceneGraph } from './DistributedSceneGraphTypes';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the AgentLocalGraphBuilder.
 */
export interface AgentLocalGraphBuilderConfig {
  /** Maximum distance for two segments to be considered neighbors (default: 5.0) */
  neighborDistanceThreshold: number;
  /** Maximum edges per node (default: 8) */
  maxEdgesPerNode: number;
  /** Feature vector dimension (default: 12) */
  featureVectorDimension: number;
  /** Minimum point count for a segment to be valid (default: 1) */
  minPointCount: number;
  /** Whether to update existing segments on re-observation (default: true) */
  incrementalUpdate: boolean;
  /** Decay rate for segment confidence when not observed (0-1, default: 0.95) */
  confidenceDecayRate: number;
  /** Minimum confidence to keep a segment (default: 0.1) */
  minConfidence: number;
}

const DEFAULT_CONFIG: AgentLocalGraphBuilderConfig = {
  neighborDistanceThreshold: 5.0,
  maxEdgesPerNode: 8,
  featureVectorDimension: 12,
  minPointCount: 1,
  incrementalUpdate: true,
  confidenceDecayRate: 0.95,
  minConfidence: 0.1,
};

// =============================================================================
// AGENT LOCAL GRAPH BUILDER
// =============================================================================

export class AgentLocalGraphBuilder {
  private readonly agentId: string;
  private readonly config: AgentLocalGraphBuilderConfig;
  private graph: LocalSceneGraph;
  private edgeCounter: number = 0;

  constructor(agentId: string, config?: Partial<AgentLocalGraphBuilderConfig>) {
    this.agentId = agentId;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.graph = createEmptyLocalSceneGraph(agentId);

    logger.info('[AgentLocalGraphBuilder] Initialized', { agentId, config: this.config });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Process a batch of ObjectSnapshots to update the local scene graph.
   *
   * This is the main entry point called by the inference scheduler.
   * Converts snapshots to segments, builds nodes, and creates edges.
   *
   * @param snapshots - Object snapshots from the current observation
   * @returns The updated local scene graph
   */
  processObservations(snapshots: ObjectSnapshot[]): LocalSceneGraph {
    const startTime = Date.now();

    // Phase 1: Convert snapshots to segments and upsert nodes
    const activeNodeIds = new Set<string>();
    for (const snapshot of snapshots) {
      if (!snapshot.visible) continue;

      const segment = this.snapshotToSegment(snapshot);
      const node = this.upsertNode(segment, snapshot);
      activeNodeIds.add(node.id);
    }

    // Phase 2: Decay confidence of unseen nodes
    if (this.config.incrementalUpdate) {
      this.decayUnseenNodes(activeNodeIds);
    }

    // Phase 3: Rebuild edges between neighboring nodes
    this.rebuildEdges();

    // Phase 4: Update graph bounds
    this.updateGraphBounds();

    // Update metadata
    this.graph.lastUpdated = Date.now();
    this.graph.sequence++;
    this.graph.observationCount++;

    logger.debug('[AgentLocalGraphBuilder] Processed observations', {
      agentId: this.agentId,
      snapshotCount: snapshots.length,
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      durationMs: Date.now() - startTime,
    });

    return this.graph;
  }

  /**
   * Get the current local scene graph (read-only snapshot).
   */
  getGraph(): LocalSceneGraph {
    return this.graph;
  }

  /**
   * Get the agent ID.
   */
  getAgentId(): string {
    return this.agentId;
  }

  /**
   * Get node count.
   */
  getNodeCount(): number {
    return this.graph.nodes.size;
  }

  /**
   * Get edge count.
   */
  getEdgeCount(): number {
    return this.graph.edges.size;
  }

  /**
   * Reset the local graph to empty state.
   */
  reset(): void {
    this.graph = createEmptyLocalSceneGraph(this.agentId);
    this.edgeCounter = 0;
    logger.info('[AgentLocalGraphBuilder] Reset', { agentId: this.agentId });
  }

  /**
   * Dispose and release resources.
   */
  dispose(): void {
    this.graph.nodes.clear();
    this.graph.edges.clear();
    logger.info('[AgentLocalGraphBuilder] Disposed', { agentId: this.agentId });
  }

  // ===========================================================================
  // SEGMENT CONSTRUCTION
  // ===========================================================================

  /**
   * Convert an ObjectSnapshot to a SceneGraphSegment.
   *
   * Computes the geometric properties from the snapshot's bounding box:
   * - Centroid from position
   * - Standard deviation approximated from bounds
   * - Dimensions, volume, and max length from bounds
   */
  private snapshotToSegment(snapshot: ObjectSnapshot): SceneGraphSegment {
    const dims: Vec3 = {
      x: snapshot.boundsMax.x - snapshot.boundsMin.x,
      y: snapshot.boundsMax.y - snapshot.boundsMin.y,
      z: snapshot.boundsMax.z - snapshot.boundsMin.z,
    };

    const volume = Math.max(dims.x * dims.y * dims.z, 0.001);
    const maxLength = Math.max(dims.x, dims.y, dims.z);

    // Approximate standard deviation from bounds (uniform distribution)
    // For uniform dist over [a,b]: sigma = (b-a) / sqrt(12)
    const sqrt12 = Math.sqrt(12);
    const stdDev: Vec3 = {
      x: dims.x / sqrt12,
      y: dims.y / sqrt12,
      z: dims.z / sqrt12,
    };

    return {
      id: snapshot.id,
      label: snapshot.label ?? snapshot.type,
      centroid: { ...snapshot.position },
      standardDeviation: stdDev,
      boundsMin: { ...snapshot.boundsMin },
      boundsMax: { ...snapshot.boundsMax },
      boundsDimensions: dims,
      maxLength,
      volume,
      pointCount: 1,
      active: true,
      lastUpdated: Date.now(),
      metadata: snapshot.metadata,
    };
  }

  // ===========================================================================
  // NODE MANAGEMENT
  // ===========================================================================

  /**
   * Insert or update a node in the local graph from a segment.
   *
   * If the node already exists (incremental update), merge the new
   * observation by updating the centroid and expanding bounds.
   */
  private upsertNode(segment: SceneGraphSegment, snapshot: ObjectSnapshot): SceneGraphNode {
    const nodeId = `${this.agentId}:${segment.id}`;
    const existing = this.graph.nodes.get(nodeId);

    if (existing && this.config.incrementalUpdate) {
      // Update existing node with new observation
      existing.segment = this.mergeSegmentObservation(existing.segment, segment);
      existing.featureVector = this.computeNodeFeatureVector(existing.segment);
      existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
      return existing;
    }

    // Create new node
    const featureVector = this.computeNodeFeatureVector(segment);
    const node: SceneGraphNode = {
      id: nodeId,
      segment,
      featureVector,
      neighborIds: [],
      sourceAgentId: this.agentId,
      confidence: 1.0,
      merged: false,
      mergedFromIds: [],
    };

    this.graph.nodes.set(nodeId, node);
    return node;
  }

  /**
   * Merge a new segment observation into an existing segment.
   * Uses exponential moving average for centroid position.
   */
  private mergeSegmentObservation(
    existing: SceneGraphSegment,
    observed: SceneGraphSegment,
  ): SceneGraphSegment {
    const alpha = 0.3; // Smoothing factor

    return {
      ...existing,
      centroid: {
        x: alpha * observed.centroid.x + (1 - alpha) * existing.centroid.x,
        y: alpha * observed.centroid.y + (1 - alpha) * existing.centroid.y,
        z: alpha * observed.centroid.z + (1 - alpha) * existing.centroid.z,
      },
      boundsMin: {
        x: Math.min(existing.boundsMin.x, observed.boundsMin.x),
        y: Math.min(existing.boundsMin.y, observed.boundsMin.y),
        z: Math.min(existing.boundsMin.z, observed.boundsMin.z),
      },
      boundsMax: {
        x: Math.max(existing.boundsMax.x, observed.boundsMax.x),
        y: Math.max(existing.boundsMax.y, observed.boundsMax.y),
        z: Math.max(existing.boundsMax.z, observed.boundsMax.z),
      },
      standardDeviation: {
        x: alpha * observed.standardDeviation.x + (1 - alpha) * existing.standardDeviation.x,
        y: alpha * observed.standardDeviation.y + (1 - alpha) * existing.standardDeviation.y,
        z: alpha * observed.standardDeviation.z + (1 - alpha) * existing.standardDeviation.z,
      },
      boundsDimensions: observed.boundsDimensions,
      volume: observed.volume,
      maxLength: observed.maxLength,
      pointCount: existing.pointCount + 1,
      active: true,
      lastUpdated: Date.now(),
      label: observed.label,
      metadata: { ...existing.metadata, ...observed.metadata },
    };
  }

  /**
   * Decay confidence of nodes not seen in the current observation.
   * Removes nodes that fall below minimum confidence threshold.
   */
  private decayUnseenNodes(activeNodeIds: Set<string>): void {
    const toRemove: string[] = [];

    for (const [nodeId, node] of this.graph.nodes) {
      if (!activeNodeIds.has(nodeId)) {
        node.confidence *= this.config.confidenceDecayRate;
        node.segment.active = false;

        if (node.confidence < this.config.minConfidence) {
          toRemove.push(nodeId);
        }
      }
    }

    for (const nodeId of toRemove) {
      this.graph.nodes.delete(nodeId);
    }
  }

  // ===========================================================================
  // FEATURE VECTOR COMPUTATION
  // ===========================================================================

  /**
   * Compute a spatial-invariant feature vector for a segment.
   *
   * Based on MA3DSG: v_i = [E(P_i), sigma_i, ln(b_i), ln(v_i), ln(l_i)]
   *
   * Since we don't have a PointNet encoder, we substitute with
   * normalized geometric features that capture shape and scale.
   *
   * Feature vector (12 dimensions):
   * [0-2] Normalized standard deviation (shape signature)
   * [3-5] Log bounding box dimensions (scale-invariant size)
   * [6]   Log volume
   * [7]   Log max length
   * [8]   Aspect ratio (width / height)
   * [9]   Aspect ratio (width / depth)
   * [10]  Compactness (volume / bbox volume)
   * [11]  Elongation (max_dim / min_dim)
   */
  computeNodeFeatureVector(segment: SceneGraphSegment): number[] {
    const dims = segment.boundsDimensions;
    const stdDev = segment.standardDeviation;

    // Normalize std dev (shape signature)
    const stdDevMag = Math.sqrt(
      stdDev.x * stdDev.x + stdDev.y * stdDev.y + stdDev.z * stdDev.z,
    );
    const normStdDev = stdDevMag > 0.0001
      ? { x: stdDev.x / stdDevMag, y: stdDev.y / stdDevMag, z: stdDev.z / stdDevMag }
      : { x: 0.577, y: 0.577, z: 0.577 }; // uniform if zero

    // Log dimensions (scale-invariant)
    const logDims = {
      x: Math.log(Math.max(dims.x, 0.001)),
      y: Math.log(Math.max(dims.y, 0.001)),
      z: Math.log(Math.max(dims.z, 0.001)),
    };

    // Derived features
    const logVolume = Math.log(Math.max(segment.volume, 0.001));
    const logMaxLength = Math.log(Math.max(segment.maxLength, 0.001));
    const aspectWH = dims.y > 0.0001 ? dims.x / dims.y : 1.0;
    const aspectWD = dims.z > 0.0001 ? dims.x / dims.z : 1.0;

    const bboxVolume = dims.x * dims.y * dims.z;
    const compactness = bboxVolume > 0.0001 ? segment.volume / bboxVolume : 1.0;

    const minDim = Math.max(Math.min(dims.x, dims.y, dims.z), 0.001);
    const maxDim = Math.max(dims.x, dims.y, dims.z);
    const elongation = maxDim / minDim;

    return [
      normStdDev.x,
      normStdDev.y,
      normStdDev.z,
      logDims.x,
      logDims.y,
      logDims.z,
      logVolume,
      logMaxLength,
      aspectWH,
      aspectWD,
      compactness,
      elongation,
    ];
  }

  // ===========================================================================
  // EDGE CONSTRUCTION
  // ===========================================================================

  /**
   * Rebuild all edges by finding neighboring nodes within the distance threshold.
   *
   * Uses centroid-to-centroid distance. For each node, finds the K nearest
   * neighbors (bounded by maxEdgesPerNode) and creates edges with feature vectors.
   */
  private rebuildEdges(): void {
    // Clear existing edges
    this.graph.edges.clear();

    // Reset neighbor lists
    for (const node of this.graph.nodes.values()) {
      node.neighborIds = [];
    }

    const nodes = Array.from(this.graph.nodes.values());
    const threshold = this.config.neighborDistanceThreshold;
    const maxEdges = this.config.maxEdgesPerNode;

    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];

      // Collect distances to all other nodes
      const candidates: Array<{ node: SceneGraphNode; distance: number }> = [];

      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j];
        const distance = this.centroidDistance(
          nodeA.segment.centroid,
          nodeB.segment.centroid,
        );

        if (distance <= threshold) {
          candidates.push({ node: nodeB, distance });
        }
      }

      // Sort by distance and take top maxEdges
      candidates.sort((a, b) => a.distance - b.distance);
      const topCandidates = candidates.slice(0, maxEdges);

      for (const { node: nodeB } of topCandidates) {
        // Skip if either node already has max edges
        if (
          nodeA.neighborIds.length >= maxEdges ||
          nodeB.neighborIds.length >= maxEdges
        ) {
          continue;
        }

        const edge = this.createEdge(nodeA, nodeB);
        this.graph.edges.set(edge.id, edge);

        // Update neighbor lists
        if (!nodeA.neighborIds.includes(nodeB.id)) {
          nodeA.neighborIds.push(nodeB.id);
        }
        if (!nodeB.neighborIds.includes(nodeA.id)) {
          nodeB.neighborIds.push(nodeA.id);
        }
      }
    }
  }

  /**
   * Create an edge between two nodes with computed feature vector
   * and inferred relationship type.
   *
   * Edge features from MA3DSG:
   * e_ij = f_s([delta_p, delta_sigma, delta_b, ln(v_i/v_j), ln(l_i/l_j)])
   */
  private createEdge(nodeA: SceneGraphNode, nodeB: SceneGraphNode): SceneGraphEdge {
    const segA = nodeA.segment;
    const segB = nodeB.segment;

    // Relative centroid displacement
    const relativeCentroid: Vec3 = {
      x: segB.centroid.x - segA.centroid.x,
      y: segB.centroid.y - segA.centroid.y,
      z: segB.centroid.z - segA.centroid.z,
    };

    // Relative standard deviation
    const relativeStdDev: Vec3 = {
      x: segB.standardDeviation.x - segA.standardDeviation.x,
      y: segB.standardDeviation.y - segA.standardDeviation.y,
      z: segB.standardDeviation.z - segA.standardDeviation.z,
    };

    // Relative bounding box dimensions
    const relativeBounds: Vec3 = {
      x: segB.boundsDimensions.x - segA.boundsDimensions.x,
      y: segB.boundsDimensions.y - segA.boundsDimensions.y,
      z: segB.boundsDimensions.z - segA.boundsDimensions.z,
    };

    // Volume and length ratios (log space)
    const logVolumeRatio = Math.log(
      Math.max(segA.volume, 0.001) / Math.max(segB.volume, 0.001),
    );
    const logLengthRatio = Math.log(
      Math.max(segA.maxLength, 0.001) / Math.max(segB.maxLength, 0.001),
    );

    // Build edge feature vector
    const featureVector = [
      relativeCentroid.x,
      relativeCentroid.y,
      relativeCentroid.z,
      relativeStdDev.x,
      relativeStdDev.y,
      relativeStdDev.z,
      relativeBounds.x,
      relativeBounds.y,
      relativeBounds.z,
      logVolumeRatio,
      logLengthRatio,
    ];

    // Classify relationship type from spatial properties
    const relationshipType = this.classifyEdgeRelationship(
      relativeCentroid,
      segA,
      segB,
    );

    // Confidence based on proximity and feature consistency
    const distance = this.centroidDistance(segA.centroid, segB.centroid);
    const confidence = Math.max(
      0,
      1.0 - distance / this.config.neighborDistanceThreshold,
    );

    const edgeId = `edge-${this.edgeCounter++}`;

    return {
      id: edgeId,
      sourceNodeId: nodeA.id,
      targetNodeId: nodeB.id,
      relativeCentroid,
      relativeStdDev,
      relativeBounds,
      logVolumeRatio,
      logLengthRatio,
      featureVector,
      confidence,
      relationshipType,
    };
  }

  /**
   * Classify the spatial relationship between two segments
   * based on their relative centroid displacement and geometry.
   */
  private classifyEdgeRelationship(
    relativeCentroid: Vec3,
    segA: SceneGraphSegment,
    segB: SceneGraphSegment,
  ): DistributedSpatialRelationType {
    const distance = Math.sqrt(
      relativeCentroid.x * relativeCentroid.x +
      relativeCentroid.y * relativeCentroid.y +
      relativeCentroid.z * relativeCentroid.z,
    );

    const absX = Math.abs(relativeCentroid.x);
    const absY = Math.abs(relativeCentroid.y);
    const absZ = Math.abs(relativeCentroid.z);

    // Check containment
    if (this.boundsContain(segA, segB)) return 'contains';
    if (this.boundsContain(segB, segA)) return 'contained_by';

    // Vertical relationships dominate
    if (absY > absX && absY > absZ && absY > 0.5) {
      if (relativeCentroid.y > 0) {
        // B is above A
        if (distance < 2.0) return 'supporting'; // A supports B
        return 'below';
      } else {
        if (distance < 2.0) return 'supported_by';
        return 'above';
      }
    }

    // Coplanar check (same Y level)
    if (absY < 0.3) {
      if (distance < 1.5) return 'adjacent';
      if (distance < 3.0) return 'beside';
      return 'near';
    }

    // Stacked check (vertically aligned with small horizontal offset)
    const horizontalDist = Math.sqrt(absX * absX + absZ * absZ);
    if (horizontalDist < 0.5 && absY > 0.5) {
      return 'stacked';
    }

    // Default distance-based
    if (distance < 1.5) return 'adjacent';
    if (distance < this.config.neighborDistanceThreshold) return 'near';
    return 'far';
  }

  /**
   * Check if segment A's bounds fully contain segment B.
   */
  private boundsContain(a: SceneGraphSegment, b: SceneGraphSegment): boolean {
    return (
      b.boundsMin.x >= a.boundsMin.x && b.boundsMax.x <= a.boundsMax.x &&
      b.boundsMin.y >= a.boundsMin.y && b.boundsMax.y <= a.boundsMax.y &&
      b.boundsMin.z >= a.boundsMin.z && b.boundsMax.z <= a.boundsMax.z
    );
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Compute Euclidean distance between two 3D points.
   */
  private centroidDistance(a: Vec3, b: Vec3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Update the spatial bounds of the entire local graph.
   */
  private updateGraphBounds(): void {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const node of this.graph.nodes.values()) {
      const seg = node.segment;
      minX = Math.min(minX, seg.boundsMin.x);
      minY = Math.min(minY, seg.boundsMin.y);
      minZ = Math.min(minZ, seg.boundsMin.z);
      maxX = Math.max(maxX, seg.boundsMax.x);
      maxY = Math.max(maxY, seg.boundsMax.y);
      maxZ = Math.max(maxZ, seg.boundsMax.z);
    }

    if (this.graph.nodes.size > 0) {
      this.graph.bounds = {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
      };
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an AgentLocalGraphBuilder for a given agent.
 */
export function createAgentLocalGraphBuilder(
  agentId: string,
  config?: Partial<AgentLocalGraphBuilderConfig>,
): AgentLocalGraphBuilder {
  return new AgentLocalGraphBuilder(agentId, config);
}
