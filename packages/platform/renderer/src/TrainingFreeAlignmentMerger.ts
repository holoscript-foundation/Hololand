/**
 * TrainingFreeAlignmentMerger
 *
 * Implements the training-free graph alignment algorithm from MA3DSG.
 * Merges agent-local scene graphs into a unified global scene graph
 * WITHOUT any learnable parameters or neural network inference.
 *
 * ALGORITHM:
 * 1. GRAPH SEARCH PHASE:
 *    - Select anchor nodes in the query graph
 *    - Find candidate matches in the reference (global) graph by label
 *    - Recursively expand through neighbors using triplet matching
 *
 * 2. MATCHING & UPDATE PHASE:
 *    - If intersection subgraph >= threshold: merge matched nodes
 *    - If intersection < threshold: add query graph as new subgraph
 *    - Three node update strategies:
 *      a. Matching Node: Same label + spatial overlap -> union bounds
 *      b. Conflicting Label: Spatial overlap + different label -> replace
 *      c. New Node: No spatial overlap -> add as new
 *
 * PERFORMANCE:
 * - O(V_q * V_r) worst case for graph search (V = vertex count)
 * - Typically much faster due to label filtering and early termination
 * - No GPU required, runs entirely on CPU
 * - Suitable for Tier 1 (1-5Hz) inference timing
 *
 * @module TrainingFreeAlignmentMerger
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  SceneGraphNode,
  SceneGraphEdge,
  LocalSceneGraph,
  GlobalSceneGraph,
  NodeMatch,
  TripletMatch,
  MergeEvent,
  AlignmentConfig,
} from './DistributedSceneGraphTypes';
import {
  DEFAULT_ALIGNMENT_CONFIG,
  createEmptyGlobalSceneGraph,
} from './DistributedSceneGraphTypes';

// =============================================================================
// MERGE RESULT
// =============================================================================

/**
 * Result of a merge operation.
 */
export interface MergeResult {
  /** Whether the merge was successful */
  success: boolean;
  /** The merge event record */
  event: MergeEvent;
  /** Node matches found during alignment */
  matches: NodeMatch[];
  /** Error message if merge failed */
  error?: string;
}

// =============================================================================
// TRAINING-FREE ALIGNMENT MERGER
// =============================================================================

export class TrainingFreeAlignmentMerger {
  private readonly config: AlignmentConfig;
  private globalGraph: GlobalSceneGraph;
  private edgeCounter: number = 0;

  constructor(config?: Partial<AlignmentConfig>) {
    this.config = { ...DEFAULT_ALIGNMENT_CONFIG, ...config };
    this.globalGraph = createEmptyGlobalSceneGraph();

    logger.info('[TrainingFreeAlignmentMerger] Initialized', { config: this.config });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Merge a local scene graph into the global graph.
   *
   * This is the main entry point. It performs the full alignment pipeline:
   * 1. Find anchor candidates
   * 2. Graph search for matches
   * 3. Apply merge updates
   *
   * @param localGraph - The agent's local scene graph to merge
   * @returns MergeResult with statistics
   */
  mergeLocalGraph(localGraph: LocalSceneGraph): MergeResult {
    const startTime = Date.now();

    // If global graph is empty, just copy the local graph in
    if (this.globalGraph.nodes.size === 0) {
      return this.initializeFromLocal(localGraph, startTime);
    }

    // Phase 1: Graph Search - find node matches
    const matches = this.graphSearch(localGraph);

    // Phase 2: Determine if intersection is large enough for merge
    const matchingNodes = matches.filter(m => m.matchType === 'matching');
    const shouldMerge = matchingNodes.length >= this.config.minIntersectionSize;

    // Phase 3: Apply merge or add as new subgraph
    let event: MergeEvent;
    if (shouldMerge) {
      event = this.applyMerge(localGraph, matches, startTime);
    } else {
      event = this.addAsNewSubgraph(localGraph, startTime);
    }

    // Update global graph metadata
    if (!this.globalGraph.contributingAgentIds.includes(localGraph.agentId)) {
      this.globalGraph.contributingAgentIds.push(localGraph.agentId);
    }
    this.globalGraph.mergeHistory.push(event);
    this.globalGraph.lastMerged = Date.now();
    this.globalGraph.mergeCount++;

    // Update global bounds
    this.updateGlobalBounds();

    logger.debug('[TrainingFreeAlignmentMerger] Merge complete', {
      agentId: localGraph.agentId,
      matched: event.matchedNodes,
      newNodes: event.newNodes,
      conflicts: event.labelConflicts,
      durationMs: event.durationMs,
    });

    return {
      success: true,
      event,
      matches,
    };
  }

  /**
   * Get the current global scene graph.
   */
  getGlobalGraph(): GlobalSceneGraph {
    return this.globalGraph;
  }

  /**
   * Get the number of nodes in the global graph.
   */
  getNodeCount(): number {
    return this.globalGraph.nodes.size;
  }

  /**
   * Get the number of edges in the global graph.
   */
  getEdgeCount(): number {
    return this.globalGraph.edges.size;
  }

  /**
   * Get merge history.
   */
  getMergeHistory(): MergeEvent[] {
    return this.globalGraph.mergeHistory;
  }

  /**
   * Reset the global graph to empty state.
   */
  reset(): void {
    this.globalGraph = createEmptyGlobalSceneGraph();
    this.edgeCounter = 0;
    logger.info('[TrainingFreeAlignmentMerger] Reset');
  }

  /**
   * Dispose and release resources.
   */
  dispose(): void {
    this.globalGraph.nodes.clear();
    this.globalGraph.edges.clear();
    this.globalGraph.mergeHistory = [];
    logger.info('[TrainingFreeAlignmentMerger] Disposed');
  }

  // ===========================================================================
  // GRAPH SEARCH PHASE
  // ===========================================================================

  /**
   * Perform graph search to find node matches between local and global graphs.
   *
   * Algorithm:
   * 1. Select anchor nodes from the local (query) graph
   * 2. For each anchor, find candidate matches in global (reference) graph
   * 3. Expand matches through neighbor traversal (triplet matching)
   * 4. Return all confirmed matches
   */
  private graphSearch(queryGraph: LocalSceneGraph): NodeMatch[] {
    const allMatches: Map<string, NodeMatch> = new Map();

    // Select anchor candidates from query graph
    const anchors = this.selectAnchors(queryGraph);

    for (const anchor of anchors) {
      // Find candidate matches in reference graph by label
      const candidates = this.findCandidatesByLabel(
        anchor,
        this.globalGraph,
      );

      for (const candidate of candidates) {
        // Check spatial overlap
        const match = this.evaluateNodeMatch(anchor, candidate);

        if (match.confidence >= this.config.minMatchConfidence) {
          // Store best match per query node
          const existing = allMatches.get(match.queryNodeId);
          if (!existing || match.confidence > existing.confidence) {
            allMatches.set(match.queryNodeId, match);
          }

          // Expand through neighbors (triplet matching)
          this.expandThroughNeighbors(
            anchor,
            candidate,
            queryGraph,
            allMatches,
            0,
          );
        }
      }
    }

    return Array.from(allMatches.values());
  }

  /**
   * Select anchor nodes from the query graph.
   * Prefers nodes with more neighbors (higher connectivity = more constraints).
   */
  private selectAnchors(queryGraph: LocalSceneGraph): SceneGraphNode[] {
    const nodes = Array.from(queryGraph.nodes.values());

    // Sort by neighbor count (descending) for better anchor quality
    nodes.sort((a, b) => b.neighborIds.length - a.neighborIds.length);

    return nodes.slice(0, this.config.maxAnchorCandidates);
  }

  /**
   * Find candidate nodes in the reference graph with matching labels.
   */
  private findCandidatesByLabel(
    queryNode: SceneGraphNode,
    referenceGraph: GlobalSceneGraph,
  ): SceneGraphNode[] {
    const candidates: SceneGraphNode[] = [];

    for (const refNode of referenceGraph.nodes.values()) {
      if (refNode.segment.label === queryNode.segment.label) {
        candidates.push(refNode);
      }
    }

    return candidates;
  }

  /**
   * Expand match search through neighbor nodes (triplet matching).
   *
   * For each matched pair (anchor_q, anchor_r), examine their neighbors:
   * - For each neighbor N_q of anchor_q in query graph
   * - For each neighbor N_r of anchor_r in reference graph
   * - If N_q matches N_r, add to matches and recurse
   */
  private expandThroughNeighbors(
    queryNode: SceneGraphNode,
    refNode: SceneGraphNode,
    queryGraph: LocalSceneGraph,
    matches: Map<string, NodeMatch>,
    depth: number,
  ): void {
    if (depth >= this.config.maxSearchDepth) return;

    for (const neighborId of queryNode.neighborIds) {
      // Skip if already matched
      if (matches.has(neighborId)) continue;

      const neighbor = queryGraph.nodes.get(neighborId);
      if (!neighbor) continue;

      // Check neighbor against reference node's neighbors
      for (const refNeighborId of refNode.neighborIds) {
        const refNeighbor = this.globalGraph.nodes.get(refNeighborId);
        if (!refNeighbor) continue;

        const match = this.evaluateNodeMatch(neighbor, refNeighbor);
        if (match.confidence >= this.config.minMatchConfidence) {
          const existing = matches.get(match.queryNodeId);
          if (!existing || match.confidence > existing.confidence) {
            matches.set(match.queryNodeId, match);

            // Recurse deeper
            this.expandThroughNeighbors(
              neighbor,
              refNeighbor,
              queryGraph,
              matches,
              depth + 1,
            );
          }
        }
      }
    }
  }

  // ===========================================================================
  // NODE MATCHING
  // ===========================================================================

  /**
   * Evaluate how well a query node matches a reference node.
   *
   * Matching criteria from MA3DSG:
   * - Centroid distance < threshold_dist
   * - Bounding box IoU > threshold_bbox
   * - Label match (exact string)
   */
  evaluateNodeMatch(
    queryNode: SceneGraphNode,
    refNode: SceneGraphNode,
  ): NodeMatch {
    const centroidDist = this.centroidDistance(
      queryNode.segment.centroid,
      refNode.segment.centroid,
    );

    const iou = this.computeBboxIoU(queryNode.segment, refNode.segment);
    const labelMatch = queryNode.segment.label === refNode.segment.label;

    // Determine match type
    let matchType: NodeMatch['matchType'];
    let confidence: number;

    const withinDistance = centroidDist <= this.config.maxCentroidDistance;
    const sufficientIoU = iou >= this.config.minBboxIoU;

    if (withinDistance && sufficientIoU && labelMatch) {
      // Matching node: same label + spatial overlap
      matchType = 'matching';
      confidence = 0.5 * (1.0 - centroidDist / this.config.maxCentroidDistance)
        + 0.3 * iou
        + 0.2; // label match bonus
    } else if (withinDistance && sufficientIoU && !labelMatch) {
      // Conflicting label: spatial overlap but different label
      matchType = 'conflict';
      confidence = 0.4 * (1.0 - centroidDist / this.config.maxCentroidDistance)
        + 0.3 * iou;
    } else {
      // New node: no spatial overlap
      matchType = 'new';
      confidence = 0;
    }

    return {
      queryNodeId: queryNode.id,
      referenceNodeId: refNode.id,
      labelMatch,
      centroidDistance: centroidDist,
      bboxIoU: iou,
      confidence,
      matchType,
    };
  }

  /**
   * Compute bounding box Intersection over Union (IoU).
   */
  computeBboxIoU(
    a: { boundsMin: Vec3; boundsMax: Vec3 },
    b: { boundsMin: Vec3; boundsMax: Vec3 },
  ): number {
    // Intersection
    const interMinX = Math.max(a.boundsMin.x, b.boundsMin.x);
    const interMinY = Math.max(a.boundsMin.y, b.boundsMin.y);
    const interMinZ = Math.max(a.boundsMin.z, b.boundsMin.z);
    const interMaxX = Math.min(a.boundsMax.x, b.boundsMax.x);
    const interMaxY = Math.min(a.boundsMax.y, b.boundsMax.y);
    const interMaxZ = Math.min(a.boundsMax.z, b.boundsMax.z);

    const interW = Math.max(0, interMaxX - interMinX);
    const interH = Math.max(0, interMaxY - interMinY);
    const interD = Math.max(0, interMaxZ - interMinZ);

    const interVolume = interW * interH * interD;
    if (interVolume === 0) return 0;

    // Union
    const volA = (a.boundsMax.x - a.boundsMin.x)
      * (a.boundsMax.y - a.boundsMin.y)
      * (a.boundsMax.z - a.boundsMin.z);
    const volB = (b.boundsMax.x - b.boundsMin.x)
      * (b.boundsMax.y - b.boundsMin.y)
      * (b.boundsMax.z - b.boundsMin.z);

    const unionVolume = volA + volB - interVolume;
    if (unionVolume <= 0) return 0;

    return interVolume / unionVolume;
  }

  // ===========================================================================
  // MERGE APPLICATION
  // ===========================================================================

  /**
   * Initialize global graph from the first local graph (no merging needed).
   */
  private initializeFromLocal(
    localGraph: LocalSceneGraph,
    startTime: number,
  ): MergeResult {
    // Copy all nodes
    for (const [nodeId, node] of localGraph.nodes) {
      this.globalGraph.nodes.set(nodeId, { ...node });
    }

    // Copy all edges
    for (const [edgeId, edge] of localGraph.edges) {
      this.globalGraph.edges.set(edgeId, { ...edge });
    }

    this.globalGraph.contributingAgentIds.push(localGraph.agentId);
    this.updateGlobalBounds();

    const event: MergeEvent = {
      timestamp: Date.now(),
      agentId: localGraph.agentId,
      matchedNodes: 0,
      newNodes: localGraph.nodes.size,
      labelConflicts: 0,
      edgesUpdated: localGraph.edges.size,
      durationMs: Date.now() - startTime,
    };

    this.globalGraph.mergeHistory.push(event);
    this.globalGraph.lastMerged = Date.now();
    this.globalGraph.mergeCount++;

    return { success: true, event, matches: [] };
  }

  /**
   * Apply merge for matched nodes and add unmatched as new.
   *
   * Three update strategies:
   * 1. Matching Node: union bounds, update edges
   * 2. Conflicting Label: replace label with new semantic info
   * 3. New Node: add with all edges
   */
  private applyMerge(
    localGraph: LocalSceneGraph,
    matches: NodeMatch[],
    startTime: number,
  ): MergeEvent {
    let matchedNodes = 0;
    let newNodes = 0;
    let labelConflicts = 0;
    let edgesUpdated = 0;

    const matchedQueryIds = new Set<string>();
    const nodeIdMapping = new Map<string, string>(); // queryNodeId -> globalNodeId

    // Process matches
    for (const match of matches) {
      matchedQueryIds.add(match.queryNodeId);
      const queryNode = localGraph.nodes.get(match.queryNodeId);
      if (!queryNode) continue;

      const refNode = this.globalGraph.nodes.get(match.referenceNodeId);
      if (!refNode) continue;

      if (match.matchType === 'matching') {
        // Union bounding boxes
        this.unionNodeBounds(refNode, queryNode);
        refNode.confidence = Math.min(refNode.confidence + 0.1, 1.0);
        refNode.merged = true;
        if (!refNode.mergedFromIds.includes(queryNode.id)) {
          refNode.mergedFromIds.push(queryNode.id);
        }
        matchedNodes++;
        nodeIdMapping.set(queryNode.id, refNode.id);
      } else if (match.matchType === 'conflict' && this.config.resolveLabelConflicts) {
        // Replace label with new semantic information
        refNode.segment.label = queryNode.segment.label;
        this.unionNodeBounds(refNode, queryNode);
        refNode.merged = true;
        if (!refNode.mergedFromIds.includes(queryNode.id)) {
          refNode.mergedFromIds.push(queryNode.id);
        }
        labelConflicts++;
        nodeIdMapping.set(queryNode.id, refNode.id);
      }
    }

    // Add unmatched nodes as new
    for (const [nodeId, node] of localGraph.nodes) {
      if (!matchedQueryIds.has(nodeId)) {
        const globalNodeId = `global:${nodeId}`;
        const newNode: SceneGraphNode = {
          ...node,
          id: globalNodeId,
        };
        this.globalGraph.nodes.set(globalNodeId, newNode);
        nodeIdMapping.set(nodeId, globalNodeId);
        newNodes++;
      }
    }

    // Add/update edges from local graph
    for (const [, edge] of localGraph.edges) {
      const sourceGlobalId = nodeIdMapping.get(edge.sourceNodeId);
      const targetGlobalId = nodeIdMapping.get(edge.targetNodeId);

      if (sourceGlobalId && targetGlobalId) {
        const globalEdgeId = `global-edge-${this.edgeCounter++}`;
        const globalEdge: SceneGraphEdge = {
          ...edge,
          id: globalEdgeId,
          sourceNodeId: sourceGlobalId,
          targetNodeId: targetGlobalId,
        };
        this.globalGraph.edges.set(globalEdgeId, globalEdge);

        // Update neighbor lists
        const sourceNode = this.globalGraph.nodes.get(sourceGlobalId);
        const targetNode = this.globalGraph.nodes.get(targetGlobalId);
        if (sourceNode && !sourceNode.neighborIds.includes(targetGlobalId)) {
          sourceNode.neighborIds.push(targetGlobalId);
        }
        if (targetNode && !targetNode.neighborIds.includes(sourceGlobalId)) {
          targetNode.neighborIds.push(sourceGlobalId);
        }

        edgesUpdated++;
      }
    }

    return {
      timestamp: Date.now(),
      agentId: localGraph.agentId,
      matchedNodes,
      newNodes,
      labelConflicts,
      edgesUpdated,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Add an entire local graph as a new subgraph (no overlap with existing).
   */
  private addAsNewSubgraph(
    localGraph: LocalSceneGraph,
    startTime: number,
  ): MergeEvent {
    const nodeIdMapping = new Map<string, string>();

    // Add all nodes with global prefix
    for (const [nodeId, node] of localGraph.nodes) {
      const globalNodeId = `global:${nodeId}`;
      const newNode: SceneGraphNode = {
        ...node,
        id: globalNodeId,
        neighborIds: [], // Will be rebuilt
      };
      this.globalGraph.nodes.set(globalNodeId, newNode);
      nodeIdMapping.set(nodeId, globalNodeId);
    }

    // Add all edges with mapped IDs
    let edgesUpdated = 0;
    for (const [, edge] of localGraph.edges) {
      const sourceGlobalId = nodeIdMapping.get(edge.sourceNodeId);
      const targetGlobalId = nodeIdMapping.get(edge.targetNodeId);

      if (sourceGlobalId && targetGlobalId) {
        const globalEdgeId = `global-edge-${this.edgeCounter++}`;
        const globalEdge: SceneGraphEdge = {
          ...edge,
          id: globalEdgeId,
          sourceNodeId: sourceGlobalId,
          targetNodeId: targetGlobalId,
        };
        this.globalGraph.edges.set(globalEdgeId, globalEdge);

        // Update neighbor lists
        const sourceNode = this.globalGraph.nodes.get(sourceGlobalId);
        const targetNode = this.globalGraph.nodes.get(targetGlobalId);
        if (sourceNode && !sourceNode.neighborIds.includes(targetGlobalId)) {
          sourceNode.neighborIds.push(targetGlobalId);
        }
        if (targetNode && !targetNode.neighborIds.includes(sourceGlobalId)) {
          targetNode.neighborIds.push(sourceGlobalId);
        }

        edgesUpdated++;
      }
    }

    return {
      timestamp: Date.now(),
      agentId: localGraph.agentId,
      matchedNodes: 0,
      newNodes: localGraph.nodes.size,
      labelConflicts: 0,
      edgesUpdated,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Union the bounding boxes of two nodes (expand reference to include query).
   */
  private unionNodeBounds(
    refNode: SceneGraphNode,
    queryNode: SceneGraphNode,
  ): void {
    const refSeg = refNode.segment;
    const qSeg = queryNode.segment;

    refSeg.boundsMin = {
      x: Math.min(refSeg.boundsMin.x, qSeg.boundsMin.x),
      y: Math.min(refSeg.boundsMin.y, qSeg.boundsMin.y),
      z: Math.min(refSeg.boundsMin.z, qSeg.boundsMin.z),
    };
    refSeg.boundsMax = {
      x: Math.max(refSeg.boundsMax.x, qSeg.boundsMax.x),
      y: Math.max(refSeg.boundsMax.y, qSeg.boundsMax.y),
      z: Math.max(refSeg.boundsMax.z, qSeg.boundsMax.z),
    };

    // Update derived properties
    refSeg.boundsDimensions = {
      x: refSeg.boundsMax.x - refSeg.boundsMin.x,
      y: refSeg.boundsMax.y - refSeg.boundsMin.y,
      z: refSeg.boundsMax.z - refSeg.boundsMin.z,
    };
    refSeg.volume = refSeg.boundsDimensions.x * refSeg.boundsDimensions.y * refSeg.boundsDimensions.z;
    refSeg.maxLength = Math.max(
      refSeg.boundsDimensions.x,
      refSeg.boundsDimensions.y,
      refSeg.boundsDimensions.z,
    );

    // Update centroid to midpoint
    refSeg.centroid = {
      x: (refSeg.boundsMin.x + refSeg.boundsMax.x) / 2,
      y: (refSeg.boundsMin.y + refSeg.boundsMax.y) / 2,
      z: (refSeg.boundsMin.z + refSeg.boundsMax.z) / 2,
    };

    refSeg.pointCount += qSeg.pointCount;
    refSeg.lastUpdated = Date.now();
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Euclidean distance between two 3D points.
   */
  private centroidDistance(a: Vec3, b: Vec3): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Update global graph spatial bounds.
   */
  private updateGlobalBounds(): void {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const node of this.globalGraph.nodes.values()) {
      const seg = node.segment;
      minX = Math.min(minX, seg.boundsMin.x);
      minY = Math.min(minY, seg.boundsMin.y);
      minZ = Math.min(minZ, seg.boundsMin.z);
      maxX = Math.max(maxX, seg.boundsMax.x);
      maxY = Math.max(maxY, seg.boundsMax.y);
      maxZ = Math.max(maxZ, seg.boundsMax.z);
    }

    if (this.globalGraph.nodes.size > 0) {
      this.globalGraph.bounds = {
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
 * Create a TrainingFreeAlignmentMerger.
 */
export function createTrainingFreeAlignmentMerger(
  config?: Partial<AlignmentConfig>,
): TrainingFreeAlignmentMerger {
  return new TrainingFreeAlignmentMerger(config);
}
