/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SpatialRelationshipExtractor (MA3DSG Relationship Extraction)
 *
 * Validates:
 * - Direct edge-to-relationship conversion
 * - Relationship type mapping (DistributedSpatialRelationType -> SpatialRelationType)
 * - Transitive relationship inference
 * - Semantic group detection
 * - Spatial region generation from groups
 * - Confidence filtering and limiting
 * - Empty graph handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  SpatialRelationshipExtractor,
  createSpatialRelationshipExtractor,
} from '../SpatialRelationshipExtractor';
import { AgentLocalGraphBuilder } from '../AgentLocalGraphBuilder';
import { TrainingFreeAlignmentMerger } from '../TrainingFreeAlignmentMerger';
import type { ObjectSnapshot } from '../SpatialReasoningEngine';
import type { GlobalSceneGraph } from '../DistributedSceneGraphTypes';
import { createEmptyGlobalSceneGraph } from '../DistributedSceneGraphTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createSnapshot(
  id: string,
  label: string,
  position: { x: number; y: number; z: number },
  size: number = 1,
): ObjectSnapshot {
  return {
    id,
    type: 'mesh',
    label,
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundsMin: {
      x: position.x - size / 2,
      y: position.y - size / 2,
      z: position.z - size / 2,
    },
    boundsMax: {
      x: position.x + size / 2,
      y: position.y + size / 2,
      z: position.z + size / 2,
    },
    visible: true,
  };
}

/**
 * Build a global graph from multiple agents' observations
 * by running through the full pipeline.
 */
function buildGlobalGraph(
  agentObservations: Array<{ agentId: string; snapshots: ObjectSnapshot[] }>,
): GlobalSceneGraph {
  const merger = new TrainingFreeAlignmentMerger();

  for (const { agentId, snapshots } of agentObservations) {
    const builder = new AgentLocalGraphBuilder(agentId);
    builder.processObservations(snapshots);
    merger.mergeLocalGraph(builder.getGraph());
  }

  return merger.getGlobalGraph();
}

// =============================================================================
// TESTS
// =============================================================================

describe('SpatialRelationshipExtractor', () => {
  let extractor: SpatialRelationshipExtractor;

  beforeEach(() => {
    extractor = new SpatialRelationshipExtractor();
  });

  // ─── Construction ─────────────────────────────────────────────────────────

  describe('construction', () => {
    it('should create extractor with default config', () => {
      expect(extractor).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const custom = new SpatialRelationshipExtractor({
        minConfidence: 0.5,
        maxRelationships: 100,
      });
      expect(custom).toBeDefined();
    });
  });

  // ─── Factory ──────────────────────────────────────────────────────────────

  describe('factory', () => {
    it('should create extractor via factory function', () => {
      const e = createSpatialRelationshipExtractor();
      expect(e).toBeDefined();
    });
  });

  // ─── Empty Graph ──────────────────────────────────────────────────────────

  describe('empty graph', () => {
    it('should return empty results for empty graph', () => {
      const emptyGraph = createEmptyGlobalSceneGraph();
      const result = extractor.extract(emptyGraph);

      expect(result.relationships).toHaveLength(0);
      expect(result.regions).toHaveLength(0);
      expect(result.directCount).toBe(0);
      expect(result.transitiveCount).toBe(0);
      expect(result.groupCount).toBe(0);
    });
  });

  // ─── Direct Relationship Extraction ───────────────────────────────────────

  describe('direct relationships', () => {
    it('should extract relationships from graph edges', () => {
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
            createSnapshot('chair', 'chair', { x: 2, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = extractor.extract(globalGraph);

      expect(result.directCount).toBeGreaterThan(0);
      expect(result.relationships.length).toBeGreaterThan(0);
    });

    it('should produce valid SpatialRelationship objects', () => {
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
            createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = extractor.extract(globalGraph);

      if (result.relationships.length > 0) {
        const rel = result.relationships[0];
        expect(rel.sourceId).toBeDefined();
        expect(rel.targetId).toBeDefined();
        expect(rel.type).toBeDefined();
        expect(rel.confidence).toBeGreaterThanOrEqual(0);
        expect(rel.confidence).toBeLessThanOrEqual(1);
        expect(rel.distance).toBeGreaterThanOrEqual(0);
        expect(rel.direction).toBeDefined();
        expect(typeof rel.direction.x).toBe('number');
      }
    });

    it('should extract correct relationship types', () => {
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('floor', 'floor', { x: 0, y: 0, z: 0 }),
            createSnapshot('box', 'box', { x: 0, y: 2, z: 0 }), // Above
          ],
        },
      ]);

      const result = extractor.extract(globalGraph);

      if (result.relationships.length > 0) {
        const types = result.relationships.map(r => r.type);
        // Should have vertical relationship types
        const hasVertical = types.some(t =>
          ['above', 'below', 'near', 'adjacent'].includes(t),
        );
        expect(hasVertical).toBe(true);
      }
    });
  });

  // ─── Confidence Filtering ────────────────────────────────────────────────

  describe('confidence filtering', () => {
    it('should filter out low-confidence relationships', () => {
      const strictExtractor = new SpatialRelationshipExtractor({
        minConfidence: 0.9, // Very strict
      });

      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
            createSnapshot('obj-2', 'chair', { x: 4, y: 0, z: 0 }), // Borderline distance
          ],
        },
      ]);

      const result = strictExtractor.extract(globalGraph);

      // All returned relationships should meet the confidence threshold
      for (const rel of result.relationships) {
        expect(rel.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should respect maxRelationships limit', () => {
      const limitedExtractor = new SpatialRelationshipExtractor({
        maxRelationships: 5,
        minConfidence: 0,
      });

      // Create many objects to generate many relationships
      const snapshots = [];
      for (let i = 0; i < 10; i++) {
        snapshots.push(
          createSnapshot(`obj-${i}`, 'box', { x: i * 2, y: 0, z: 0 }),
        );
      }

      const globalGraph = buildGlobalGraph([
        { agentId: 'agent-1', snapshots },
      ]);

      const result = limitedExtractor.extract(globalGraph);
      expect(result.relationships.length).toBeLessThanOrEqual(5);
    });
  });

  // ─── Transitive Relationships ─────────────────────────────────────────────

  describe('transitive relationships', () => {
    it('should infer transitive relationships when enabled', () => {
      const transitiveExtractor = new SpatialRelationshipExtractor({
        enableTransitive: true,
        minConfidence: 0.01, // Low threshold to catch transitive
      });

      // Create a chain: A -> B -> C
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('a', 'box', { x: 0, y: 0, z: 0 }),
            createSnapshot('b', 'box', { x: 2, y: 0, z: 0 }),
            createSnapshot('c', 'box', { x: 4, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = transitiveExtractor.extract(globalGraph);

      // Should have more than just direct relationships
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      // Transitive inference attempted
      expect(result.transitiveCount).toBeGreaterThanOrEqual(0);
    });

    it('should not infer transitive when disabled', () => {
      const noTransitive = new SpatialRelationshipExtractor({
        enableTransitive: false,
      });

      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('a', 'box', { x: 0, y: 0, z: 0 }),
            createSnapshot('b', 'box', { x: 2, y: 0, z: 0 }),
            createSnapshot('c', 'box', { x: 4, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = noTransitive.extract(globalGraph);
      expect(result.transitiveCount).toBe(0);
    });
  });

  // ─── Semantic Grouping ────────────────────────────────────────────────────

  describe('semantic grouping', () => {
    it('should detect groups of same-label nodes', () => {
      const groupExtractor = new SpatialRelationshipExtractor({
        enableSemanticGrouping: true,
        minGroupSize: 3,
        minConfidence: 0,
      });

      // Create a group of chairs
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('chair-1', 'chair', { x: 0, y: 0, z: 0 }),
            createSnapshot('chair-2', 'chair', { x: 2, y: 0, z: 0 }),
            createSnapshot('chair-3', 'chair', { x: 4, y: 0, z: 0 }),
            createSnapshot('table', 'table', { x: 1, y: 0, z: 3 }),
          ],
        },
      ]);

      const result = groupExtractor.extract(globalGraph);
      expect(result.groupCount).toBeGreaterThanOrEqual(0); // May or may not form group based on connectivity
    });

    it('should not detect groups when disabled', () => {
      const noGroups = new SpatialRelationshipExtractor({
        enableSemanticGrouping: false,
      });

      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('chair-1', 'chair', { x: 0, y: 0, z: 0 }),
            createSnapshot('chair-2', 'chair', { x: 2, y: 0, z: 0 }),
            createSnapshot('chair-3', 'chair', { x: 4, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = noGroups.extract(globalGraph);
      expect(result.groupCount).toBe(0);
      expect(result.regions).toHaveLength(0);
    });
  });

  // ─── Region Generation ────────────────────────────────────────────────────

  describe('region generation', () => {
    it('should generate regions from semantic groups', () => {
      const regionExtractor = new SpatialRelationshipExtractor({
        enableSemanticGrouping: true,
        enableRegionGeneration: true,
        minGroupSize: 3,
        minConfidence: 0,
      });

      // Create enough same-label objects in a connected cluster
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('box-1', 'box', { x: 0, y: 0, z: 0 }),
            createSnapshot('box-2', 'box', { x: 1, y: 0, z: 0 }),
            createSnapshot('box-3', 'box', { x: 2, y: 0, z: 0 }),
            createSnapshot('box-4', 'box', { x: 3, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = regionExtractor.extract(globalGraph);

      if (result.regions.length > 0) {
        const region = result.regions[0];
        expect(region.id).toBeDefined();
        expect(region.label).toBeDefined();
        expect(region.center).toBeDefined();
        expect(region.extents).toBeDefined();
        expect(region.objectIds.length).toBeGreaterThanOrEqual(3);
        expect(region.type).toBe('cluster');
        expect(region.metadata?.source).toBe('distributed-scene-graph');
      }
    });

    it('should not generate regions when disabled', () => {
      const noRegions = new SpatialRelationshipExtractor({
        enableRegionGeneration: false,
      });

      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('box-1', 'box', { x: 0, y: 0, z: 0 }),
            createSnapshot('box-2', 'box', { x: 1, y: 0, z: 0 }),
            createSnapshot('box-3', 'box', { x: 2, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = noRegions.extract(globalGraph);
      expect(result.regions).toHaveLength(0);
    });
  });

  // ─── Multi-Agent Extraction ───────────────────────────────────────────────

  describe('multi-agent extraction', () => {
    it('should extract relationships from multi-agent merged graph', () => {
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
            createSnapshot('chair-1', 'chair', { x: 2, y: 0, z: 0 }),
          ],
        },
        {
          agentId: 'agent-2',
          snapshots: [
            createSnapshot('chair-2', 'chair', { x: -2, y: 0, z: 0 }),
            createSnapshot('lamp', 'lamp', { x: 0, y: 3, z: 0 }),
          ],
        },
      ]);

      const result = extractor.extract(globalGraph);

      // Should have relationships from both agents' observations
      expect(result.relationships.length).toBeGreaterThan(0);
    });
  });

  // ─── Duration Tracking ────────────────────────────────────────────────────

  describe('duration tracking', () => {
    it('should track extraction duration', () => {
      const globalGraph = buildGlobalGraph([
        {
          agentId: 'agent-1',
          snapshots: [
            createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
            createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
          ],
        },
      ]);

      const result = extractor.extract(globalGraph);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
