/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AgentLocalGraphBuilder (MA3DSG Agent-Local Scene Graph Construction)
 *
 * Validates:
 * - Snapshot to segment conversion (geometric properties)
 * - Node creation and incremental updates
 * - Feature vector computation (12-dimensional spatial-invariant)
 * - Edge construction between neighboring nodes
 * - Relationship type classification from spatial properties
 * - Confidence decay for unseen nodes
 * - Graph bounds tracking
 * - Reset and dispose
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
  AgentLocalGraphBuilder,
  createAgentLocalGraphBuilder,
} from '../AgentLocalGraphBuilder';
import type { ObjectSnapshot } from '../SpatialReasoningEngine';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createSnapshot(
  id: string,
  position: { x: number; y: number; z: number },
  options?: Partial<ObjectSnapshot>,
): ObjectSnapshot {
  const size = 1;
  return {
    id,
    type: 'mesh',
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
    ...options,
  };
}

function createLabeledSnapshot(
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

// =============================================================================
// TESTS
// =============================================================================

describe('AgentLocalGraphBuilder', () => {
  let builder: AgentLocalGraphBuilder;

  beforeEach(() => {
    builder = new AgentLocalGraphBuilder('agent-1');
  });

  // ─── Construction ─────────────────────────────────────────────────────────

  describe('construction', () => {
    it('should create a builder with correct agent ID', () => {
      expect(builder.getAgentId()).toBe('agent-1');
    });

    it('should start with empty graph', () => {
      expect(builder.getNodeCount()).toBe(0);
      expect(builder.getEdgeCount()).toBe(0);
    });

    it('should accept custom configuration', () => {
      const custom = new AgentLocalGraphBuilder('agent-2', {
        neighborDistanceThreshold: 10.0,
        maxEdgesPerNode: 12,
      });
      expect(custom.getAgentId()).toBe('agent-2');
    });
  });

  // ─── Factory ──────────────────────────────────────────────────────────────

  describe('factory', () => {
    it('should create builder via factory function', () => {
      const b = createAgentLocalGraphBuilder('agent-factory');
      expect(b.getAgentId()).toBe('agent-factory');
      expect(b.getNodeCount()).toBe(0);
    });
  });

  // ─── Observation Processing ───────────────────────────────────────────────

  describe('processObservations', () => {
    it('should create nodes from visible snapshots', () => {
      const snapshots = [
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 3, y: 0, z: 0 }),
      ];

      const graph = builder.processObservations(snapshots);

      expect(graph.nodes.size).toBe(2);
      expect(graph.agentId).toBe('agent-1');
    });

    it('should skip invisible snapshots', () => {
      const snapshots = [
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 3, y: 0, z: 0 }, { visible: false }),
      ];

      const graph = builder.processObservations(snapshots);
      expect(graph.nodes.size).toBe(1);
    });

    it('should create edges between nearby nodes', () => {
      const snapshots = [
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 2, y: 0, z: 0 }), // Within default threshold (5.0)
      ];

      const graph = builder.processObservations(snapshots);
      expect(graph.edges.size).toBeGreaterThan(0);
    });

    it('should not create edges between distant nodes', () => {
      const snapshots = [
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 100, y: 0, z: 0 }), // Far beyond threshold
      ];

      const graph = builder.processObservations(snapshots);
      expect(graph.edges.size).toBe(0);
    });

    it('should increment observation count on each call', () => {
      builder.processObservations([createSnapshot('obj-1', { x: 0, y: 0, z: 0 })]);
      builder.processObservations([createSnapshot('obj-1', { x: 0, y: 0, z: 0 })]);
      builder.processObservations([createSnapshot('obj-1', { x: 0, y: 0, z: 0 })]);

      const graph = builder.getGraph();
      expect(graph.observationCount).toBe(3);
    });

    it('should increment sequence number on each call', () => {
      builder.processObservations([createSnapshot('obj-1', { x: 0, y: 0, z: 0 })]);
      builder.processObservations([createSnapshot('obj-1', { x: 0, y: 0, z: 0 })]);

      const graph = builder.getGraph();
      expect(graph.sequence).toBe(2);
    });
  });

  // ─── Segment Properties ───────────────────────────────────────────────────

  describe('segment properties', () => {
    it('should compute correct centroid from position', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 5, y: 10, z: 15 }),
      ]);

      const graph = builder.getGraph();
      const node = graph.nodes.get('agent-1:obj-1')!;

      expect(node.segment.centroid.x).toBe(5);
      expect(node.segment.centroid.y).toBe(10);
      expect(node.segment.centroid.z).toBe(15);
    });

    it('should compute bounding box dimensions', () => {
      const snapshot = createSnapshot('obj-1', { x: 0, y: 0, z: 0 });
      // Default size is 1, so dims should be 1x1x1
      builder.processObservations([snapshot]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      expect(node.segment.boundsDimensions.x).toBeCloseTo(1.0);
      expect(node.segment.boundsDimensions.y).toBeCloseTo(1.0);
      expect(node.segment.boundsDimensions.z).toBeCloseTo(1.0);
    });

    it('should compute volume from dimensions', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      expect(node.segment.volume).toBeCloseTo(1.0); // 1*1*1
    });

    it('should compute standard deviation from bounds', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      const expected = 1.0 / Math.sqrt(12); // uniform distribution sigma
      expect(node.segment.standardDeviation.x).toBeCloseTo(expected);
    });

    it('should use label from snapshot when available', () => {
      builder.processObservations([
        createLabeledSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      expect(node.segment.label).toBe('table');
    });

    it('should fall back to type when no label', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      expect(node.segment.label).toBe('mesh');
    });
  });

  // ─── Feature Vector Computation ───────────────────────────────────────────

  describe('feature vector', () => {
    it('should compute 12-dimensional feature vector', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      expect(node.featureVector).toHaveLength(12);
    });

    it('should produce finite values in feature vector', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 5, y: 3, z: 7 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      for (const val of node.featureVector) {
        expect(isFinite(val)).toBe(true);
      }
    });

    it('should produce different feature vectors for different shapes', () => {
      const snapshot1: ObjectSnapshot = {
        id: 'tall',
        type: 'mesh',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        boundsMin: { x: -0.5, y: -5, z: -0.5 },
        boundsMax: { x: 0.5, y: 5, z: 0.5 },
        visible: true,
      };

      const snapshot2: ObjectSnapshot = {
        id: 'wide',
        type: 'mesh',
        position: { x: 20, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        boundsMin: { x: 15, y: -0.5, z: -5 },
        boundsMax: { x: 25, y: 0.5, z: 5 },
        visible: true,
      };

      builder.processObservations([snapshot1, snapshot2]);

      const graph = builder.getGraph();
      const node1 = graph.nodes.get('agent-1:tall')!;
      const node2 = graph.nodes.get('agent-1:wide')!;

      // Feature vectors should differ (different shapes)
      const differ = node1.featureVector.some(
        (val, i) => Math.abs(val - node2.featureVector[i]) > 0.01,
      );
      expect(differ).toBe(true);
    });
  });

  // ─── Edge Construction ────────────────────────────────────────────────────

  describe('edge construction', () => {
    it('should create edges with feature vectors', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 2, y: 0, z: 0 }),
      ]);

      const graph = builder.getGraph();
      const edges = Array.from(graph.edges.values());
      expect(edges.length).toBeGreaterThan(0);

      const edge = edges[0];
      expect(edge.featureVector.length).toBe(11); // 3+3+3+1+1
      expect(edge.confidence).toBeGreaterThan(0);
    });

    it('should compute relative centroid displacement', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 3, y: 4, z: 0 }),
      ]);

      const edges = Array.from(builder.getGraph().edges.values());
      const edge = edges[0];

      expect(edge.relativeCentroid.x).toBeCloseTo(3);
      expect(edge.relativeCentroid.y).toBeCloseTo(4);
      expect(edge.relativeCentroid.z).toBeCloseTo(0);
    });

    it('should classify vertical relationship as above/below', () => {
      builder.processObservations([
        createSnapshot('floor', { x: 0, y: 0, z: 0 }),
        createSnapshot('ceiling', { x: 0, y: 5, z: 0 }),
      ]);

      const edges = Array.from(builder.getGraph().edges.values());
      expect(edges.length).toBe(1);
      // floor -> ceiling: ceiling is above
      expect(['below', 'supporting']).toContain(edges[0].relationshipType);
    });

    it('should classify nearby horizontal objects as adjacent/beside', () => {
      builder.processObservations([
        createSnapshot('chair-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair-2', { x: 1, y: 0, z: 0 }),
      ]);

      const edges = Array.from(builder.getGraph().edges.values());
      expect(edges.length).toBe(1);
      expect(['adjacent', 'beside']).toContain(edges[0].relationshipType);
    });

    it('should respect maxEdgesPerNode configuration', () => {
      const builder2 = new AgentLocalGraphBuilder('agent-limited', {
        maxEdgesPerNode: 2,
        neighborDistanceThreshold: 100,
      });

      // Create 5 objects close together
      const snapshots = [];
      for (let i = 0; i < 5; i++) {
        snapshots.push(createSnapshot(`obj-${i}`, { x: i * 2, y: 0, z: 0 }));
      }

      builder2.processObservations(snapshots);

      const graph = builder2.getGraph();
      // Each node should have at most 2 neighbors
      for (const node of graph.nodes.values()) {
        expect(node.neighborIds.length).toBeLessThanOrEqual(2);
      }
    });
  });

  // ─── Incremental Updates ──────────────────────────────────────────────────

  describe('incremental updates', () => {
    it('should update existing node on re-observation', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      builder.processObservations([
        createSnapshot('obj-1', { x: 1, y: 0, z: 0 }),
      ]);

      // Should still be one node (updated, not duplicated)
      expect(builder.getNodeCount()).toBe(1);
    });

    it('should increase point count on re-observation', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const node = builder.getGraph().nodes.get('agent-1:obj-1')!;
      expect(node.segment.pointCount).toBe(2);
    });

    it('should increase confidence on re-observation', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const conf1 = builder.getGraph().nodes.get('agent-1:obj-1')!.confidence;

      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const conf2 = builder.getGraph().nodes.get('agent-1:obj-1')!.confidence;
      expect(conf2).toBeGreaterThanOrEqual(conf1);
    });
  });

  // ─── Confidence Decay ─────────────────────────────────────────────────────

  describe('confidence decay', () => {
    it('should decay confidence of nodes not re-observed', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 3, y: 0, z: 0 }),
      ]);

      // Only observe obj-1 on second pass
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      const node2 = builder.getGraph().nodes.get('agent-1:obj-2');
      if (node2) {
        expect(node2.confidence).toBeLessThan(1.0);
      }
    });

    it('should remove nodes below minimum confidence', () => {
      const decayBuilder = new AgentLocalGraphBuilder('agent-decay', {
        confidenceDecayRate: 0.01, // Aggressive decay
        minConfidence: 0.5,
      });

      decayBuilder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 3, y: 0, z: 0 }),
      ]);

      // Only observe obj-1 repeatedly to decay obj-2
      decayBuilder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      // obj-2 should be removed due to aggressive decay
      expect(decayBuilder.getGraph().nodes.has('agent-decay:obj-2')).toBe(false);
    });
  });

  // ─── Graph Bounds ─────────────────────────────────────────────────────────

  describe('graph bounds', () => {
    it('should track spatial bounds of all nodes', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: -5, y: -3, z: -1 }),
        createSnapshot('obj-2', { x: 10, y: 8, z: 6 }),
      ]);

      const graph = builder.getGraph();
      expect(graph.bounds.min.x).toBeLessThan(0);
      expect(graph.bounds.max.x).toBeGreaterThan(5);
    });
  });

  // ─── Reset and Dispose ────────────────────────────────────────────────────

  describe('reset and dispose', () => {
    it('should clear all state on reset', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', { x: 3, y: 0, z: 0 }),
      ]);

      builder.reset();

      expect(builder.getNodeCount()).toBe(0);
      expect(builder.getEdgeCount()).toBe(0);
    });

    it('should clear all state on dispose', () => {
      builder.processObservations([
        createSnapshot('obj-1', { x: 0, y: 0, z: 0 }),
      ]);

      builder.dispose();

      expect(builder.getNodeCount()).toBe(0);
    });
  });
});
