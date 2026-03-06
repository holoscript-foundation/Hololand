/**
 * SpatialRelationshipExtractor
 *
 * Extracts high-level spatial relationships from the merged global scene graph.
 * Converts the graph structure (nodes + edges) into the SpatialRelationship[]
 * format consumed by the existing HoloLand SpatialReasoningEngine and
 * CachedSpatialState.
 *
 * This bridges the MA3DSG distributed scene graph with HoloLand's rendering
 * pipeline, producing relationships compatible with the Tier 2 (90Hz) renderer.
 *
 * CAPABILITIES:
 * - Edge-based relationship extraction from graph structure
 * - Multi-hop relationship inference (transitive relationships)
 * - Semantic grouping detection (objects with shared parents/patterns)
 * - Confidence-weighted relationship ranking
 * - Conversion to SpatialRelationship[] for CachedSpatialState
 *
 * @module SpatialRelationshipExtractor
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  SpatialRelationship,
  SpatialRelationType,
  SpatialRegion,
} from './SpatialInferenceTypes';
import type {
  GlobalSceneGraph,
  SceneGraphNode,
  SceneGraphEdge,
  DistributedSpatialRelationType,
} from './DistributedSceneGraphTypes';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for the SpatialRelationshipExtractor.
 */
export interface SpatialRelationshipExtractorConfig {
  /** Minimum confidence for extracted relationships (default: 0.2) */
  minConfidence: number;
  /** Maximum relationships to extract per pass (default: 1000) */
  maxRelationships: number;
  /** Whether to infer transitive relationships (default: true) */
  enableTransitive: boolean;
  /** Maximum hop count for transitive inference (default: 2) */
  maxTransitiveHops: number;
  /** Whether to detect semantic groups (default: true) */
  enableSemanticGrouping: boolean;
  /** Minimum group size for semantic grouping (default: 3) */
  minGroupSize: number;
  /** Whether to generate spatial regions from groups (default: true) */
  enableRegionGeneration: boolean;
}

const DEFAULT_CONFIG: SpatialRelationshipExtractorConfig = {
  minConfidence: 0.2,
  maxRelationships: 1000,
  enableTransitive: true,
  maxTransitiveHops: 2,
  enableSemanticGrouping: true,
  minGroupSize: 3,
  enableRegionGeneration: true,
};

// =============================================================================
// EXTRACTION RESULT
// =============================================================================

/**
 * Result of a relationship extraction pass.
 */
export interface ExtractionResult {
  /** Extracted spatial relationships (compatible with CachedSpatialState) */
  relationships: SpatialRelationship[];
  /** Detected spatial regions from semantic grouping */
  regions: SpatialRegion[];
  /** Number of direct edge relationships extracted */
  directCount: number;
  /** Number of transitive relationships inferred */
  transitiveCount: number;
  /** Number of semantic groups detected */
  groupCount: number;
  /** Duration of extraction in ms */
  durationMs: number;
}

// =============================================================================
// SPATIAL RELATIONSHIP EXTRACTOR
// =============================================================================

export class SpatialRelationshipExtractor {
  private readonly config: SpatialRelationshipExtractorConfig;

  constructor(config?: Partial<SpatialRelationshipExtractorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('[SpatialRelationshipExtractor] Initialized', { config: this.config });
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Extract spatial relationships from the global scene graph.
   *
   * Pipeline:
   * 1. Convert graph edges to SpatialRelationship[]
   * 2. Infer transitive relationships (optional)
   * 3. Detect semantic groups (optional)
   * 4. Generate spatial regions from groups (optional)
   * 5. Filter by confidence and limit
   *
   * @param globalGraph - The merged global scene graph
   * @returns ExtractionResult with relationships and regions
   */
  extract(globalGraph: GlobalSceneGraph): ExtractionResult {
    const startTime = Date.now();

    // Phase 1: Direct edge relationships
    const directRelationships = this.extractDirectRelationships(globalGraph);

    // Phase 2: Transitive relationships
    let transitiveRelationships: SpatialRelationship[] = [];
    if (this.config.enableTransitive) {
      transitiveRelationships = this.inferTransitiveRelationships(
        globalGraph,
        directRelationships,
      );
    }

    // Phase 3: Semantic grouping
    let groups: Array<{ label: string; nodeIds: string[] }> = [];
    if (this.config.enableSemanticGrouping) {
      groups = this.detectSemanticGroups(globalGraph);
    }

    // Phase 4: Region generation
    let regions: SpatialRegion[] = [];
    if (this.config.enableRegionGeneration && groups.length > 0) {
      regions = this.generateRegions(globalGraph, groups);
    }

    // Combine and filter relationships
    const allRelationships = [...directRelationships, ...transitiveRelationships];

    // Filter by confidence
    const filtered = allRelationships.filter(
      r => r.confidence >= this.config.minConfidence,
    );

    // Sort by confidence (descending) and limit
    filtered.sort((a, b) => b.confidence - a.confidence);
    const limited = filtered.slice(0, this.config.maxRelationships);

    const durationMs = Date.now() - startTime;

    logger.debug('[SpatialRelationshipExtractor] Extraction complete', {
      direct: directRelationships.length,
      transitive: transitiveRelationships.length,
      groups: groups.length,
      regions: regions.length,
      output: limited.length,
      durationMs,
    });

    return {
      relationships: limited,
      regions,
      directCount: directRelationships.length,
      transitiveCount: transitiveRelationships.length,
      groupCount: groups.length,
      durationMs,
    };
  }

  // ===========================================================================
  // DIRECT RELATIONSHIP EXTRACTION
  // ===========================================================================

  /**
   * Convert graph edges into SpatialRelationship objects.
   * Maps DistributedSpatialRelationType -> SpatialRelationType.
   */
  private extractDirectRelationships(
    globalGraph: GlobalSceneGraph,
  ): SpatialRelationship[] {
    const relationships: SpatialRelationship[] = [];

    for (const edge of globalGraph.edges.values()) {
      const sourceNode = globalGraph.nodes.get(edge.sourceNodeId);
      const targetNode = globalGraph.nodes.get(edge.targetNodeId);
      if (!sourceNode || !targetNode) continue;

      const mappedType = this.mapRelationType(edge.relationshipType);
      if (!mappedType) continue;

      const distance = this.centroidDistance(
        sourceNode.segment.centroid,
        targetNode.segment.centroid,
      );

      const direction = this.computeDirection(
        sourceNode.segment.centroid,
        targetNode.segment.centroid,
      );

      relationships.push({
        sourceId: edge.sourceNodeId,
        targetId: edge.targetNodeId,
        type: mappedType,
        confidence: edge.confidence,
        distance,
        direction,
      });
    }

    return relationships;
  }

  /**
   * Map distributed spatial relationship types to the existing
   * HoloLand SpatialRelationType used by the renderer.
   */
  private mapRelationType(
    distType: DistributedSpatialRelationType,
  ): SpatialRelationType | null {
    const mapping: Record<DistributedSpatialRelationType, SpatialRelationType | null> = {
      'adjacent': 'adjacent',
      'near': 'near',
      'far': 'far',
      'above': 'above',
      'below': 'below',
      'contains': 'contains',
      'contained_by': 'contained_by',
      'supporting': 'below',     // A supports B -> A is below B
      'supported_by': 'above',   // A supported by B -> A is above B
      'beside': 'near',          // Horizontal proximity
      'facing': 'near',          // Orientation-based, map to near
      'coplanar': 'aligned',     // Same plane -> aligned
      'stacked': 'above',        // Vertical stacking
      'grouped': 'clustered',    // Semantic grouping
    };

    return mapping[distType] ?? null;
  }

  // ===========================================================================
  // TRANSITIVE RELATIONSHIP INFERENCE
  // ===========================================================================

  /**
   * Infer transitive relationships from the graph structure.
   *
   * Example: If A contains B and B contains C, then A contains C.
   * Example: If A is above B and B is above C, then A is above C (with lower confidence).
   *
   * Limited to maxTransitiveHops depth to prevent explosion.
   */
  private inferTransitiveRelationships(
    globalGraph: GlobalSceneGraph,
    directRelationships: SpatialRelationship[],
  ): SpatialRelationship[] {
    const transitive: SpatialRelationship[] = [];

    // Build adjacency map for efficient lookup
    const outgoing = new Map<string, SpatialRelationship[]>();
    for (const rel of directRelationships) {
      if (!outgoing.has(rel.sourceId)) {
        outgoing.set(rel.sourceId, []);
      }
      outgoing.get(rel.sourceId)!.push(rel);
    }

    // For each relationship, attempt to extend through next hop
    const existingPairs = new Set(
      directRelationships.map(r => `${r.sourceId}:${r.targetId}`),
    );

    for (const rel of directRelationships) {
      const nextHops = outgoing.get(rel.targetId);
      if (!nextHops) continue;

      for (const next of nextHops) {
        // Skip self-loops
        if (next.targetId === rel.sourceId) continue;

        // Skip if direct relationship already exists
        const pairKey = `${rel.sourceId}:${next.targetId}`;
        if (existingPairs.has(pairKey)) continue;

        // Check if transitive relationship is valid
        const transitiveType = this.getTransitiveType(rel.type, next.type);
        if (!transitiveType) continue;

        const sourceNode = globalGraph.nodes.get(rel.sourceId);
        const targetNode = globalGraph.nodes.get(next.targetId);
        if (!sourceNode || !targetNode) continue;

        const distance = this.centroidDistance(
          sourceNode.segment.centroid,
          targetNode.segment.centroid,
        );

        const direction = this.computeDirection(
          sourceNode.segment.centroid,
          targetNode.segment.centroid,
        );

        // Transitive confidence decays
        const confidence = rel.confidence * next.confidence * 0.7;

        if (confidence >= this.config.minConfidence) {
          transitive.push({
            sourceId: rel.sourceId,
            targetId: next.targetId,
            type: transitiveType,
            confidence,
            distance,
            direction,
          });

          existingPairs.add(pairKey);
        }
      }
    }

    return transitive;
  }

  /**
   * Determine if a transitive relationship is valid given two
   * relationship types in sequence (A->B type1, B->C type2).
   */
  private getTransitiveType(
    type1: SpatialRelationType,
    type2: SpatialRelationType,
  ): SpatialRelationType | null {
    // Transitivity rules
    if (type1 === 'contains' && type2 === 'contains') return 'contains';
    if (type1 === 'contained_by' && type2 === 'contained_by') return 'contained_by';
    if (type1 === 'above' && type2 === 'above') return 'above';
    if (type1 === 'below' && type2 === 'below') return 'below';
    if (type1 === 'near' && type2 === 'near') return 'near';

    // Cross-type transitivity
    if (type1 === 'contains' && type2 === 'above') return 'above';
    if (type1 === 'contains' && type2 === 'below') return 'below';

    return null;
  }

  // ===========================================================================
  // SEMANTIC GROUPING
  // ===========================================================================

  /**
   * Detect semantic groups: clusters of nodes with the same label.
   *
   * Groups are formed when N or more nodes share a label and are
   * within the graph's neighbor distance of each other.
   */
  private detectSemanticGroups(
    globalGraph: GlobalSceneGraph,
  ): Array<{ label: string; nodeIds: string[] }> {
    // Group nodes by label
    const labelGroups = new Map<string, string[]>();

    for (const node of globalGraph.nodes.values()) {
      const label = node.segment.label;
      if (!labelGroups.has(label)) {
        labelGroups.set(label, []);
      }
      labelGroups.get(label)!.push(node.id);
    }

    // Filter to groups meeting minimum size
    const groups: Array<{ label: string; nodeIds: string[] }> = [];

    for (const [label, nodeIds] of labelGroups) {
      if (nodeIds.length >= this.config.minGroupSize) {
        // Further split by spatial connectivity
        const connected = this.splitByConnectivity(globalGraph, nodeIds);
        for (const cluster of connected) {
          if (cluster.length >= this.config.minGroupSize) {
            groups.push({ label, nodeIds: cluster });
          }
        }
      }
    }

    return groups;
  }

  /**
   * Split a set of node IDs into connected components
   * (nodes that are neighbors of each other).
   */
  private splitByConnectivity(
    globalGraph: GlobalSceneGraph,
    nodeIds: string[],
  ): string[][] {
    const nodeSet = new Set(nodeIds);
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const nodeId of nodeIds) {
      if (visited.has(nodeId)) continue;

      // BFS to find connected component
      const component: string[] = [];
      const queue: string[] = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);

        const node = globalGraph.nodes.get(current);
        if (!node) continue;

        for (const neighborId of node.neighborIds) {
          if (nodeSet.has(neighborId) && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  // ===========================================================================
  // REGION GENERATION
  // ===========================================================================

  /**
   * Generate SpatialRegion objects from semantic groups.
   * These regions are compatible with the existing CachedSpatialState.
   */
  private generateRegions(
    globalGraph: GlobalSceneGraph,
    groups: Array<{ label: string; nodeIds: string[] }>,
  ): SpatialRegion[] {
    const regions: SpatialRegion[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      // Compute bounding box of group
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      for (const nodeId of group.nodeIds) {
        const node = globalGraph.nodes.get(nodeId);
        if (!node) continue;

        const seg = node.segment;
        minX = Math.min(minX, seg.boundsMin.x);
        minY = Math.min(minY, seg.boundsMin.y);
        minZ = Math.min(minZ, seg.boundsMin.z);
        maxX = Math.max(maxX, seg.boundsMax.x);
        maxY = Math.max(maxY, seg.boundsMax.y);
        maxZ = Math.max(maxZ, seg.boundsMax.z);
      }

      const center: Vec3 = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2,
      };

      const extents: Vec3 = {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      };

      const volume = extents.x * extents.y * extents.z;
      const density = volume > 0 ? group.nodeIds.length / volume : 0;

      regions.push({
        id: `dsg-region-${i}`,
        label: `${group.label} group (${group.nodeIds.length} objects)`,
        center,
        extents,
        objectIds: group.nodeIds,
        type: 'cluster',
        confidence: Math.min(group.nodeIds.length / 10, 1.0),
        metadata: {
          semanticLabel: group.label,
          objectCount: group.nodeIds.length,
          density,
          source: 'distributed-scene-graph',
        },
      });
    }

    return regions;
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
   * Compute normalized direction vector from source to target.
   */
  private computeDirection(source: Vec3, target: Vec3): Vec3 {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dz = target.z - source.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (length < 0.0001) {
      return { x: 0, y: 0, z: 0 };
    }

    return {
      x: dx / length,
      y: dy / length,
      z: dz / length,
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a SpatialRelationshipExtractor.
 */
export function createSpatialRelationshipExtractor(
  config?: Partial<SpatialRelationshipExtractorConfig>,
): SpatialRelationshipExtractor {
  return new SpatialRelationshipExtractor(config);
}
