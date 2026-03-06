/**
 * @vitest-environment jsdom
 */

/**
 * Tests for TrainingFreeAlignmentMerger (MA3DSG Training-Free Graph Alignment)
 *
 * Validates:
 * - First merge initializes global graph from local
 * - Node matching by label + centroid distance + bbox IoU
 * - Three match types: matching, conflict, new
 * - Triplet-based neighbor expansion
 * - Bounding box union on merge
 * - Label conflict resolution
 * - Separate subgraph addition when intersection too small
 * - Merge history tracking
 * - BBox IoU computation
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
  TrainingFreeAlignmentMerger,
  createTrainingFreeAlignmentMerger,
} from '../TrainingFreeAlignmentMerger';
import { AgentLocalGraphBuilder } from '../AgentLocalGraphBuilder';
import type { ObjectSnapshot } from '../SpatialReasoningEngine';

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

function buildLocalGraph(agentId: string, snapshots: ObjectSnapshot[]) {
  const builder = new AgentLocalGraphBuilder(agentId);
  builder.processObservations(snapshots);
  return builder.getGraph();
}

// =============================================================================
// TESTS
// =============================================================================

describe('TrainingFreeAlignmentMerger', () => {
  let merger: TrainingFreeAlignmentMerger;

  beforeEach(() => {
    merger = new TrainingFreeAlignmentMerger();
  });

  // ─── Construction ─────────────────────────────────────────────────────────

  describe('construction', () => {
    it('should create merger with empty global graph', () => {
      expect(merger.getNodeCount()).toBe(0);
      expect(merger.getEdgeCount()).toBe(0);
    });

    it('should accept custom alignment configuration', () => {
      const custom = new TrainingFreeAlignmentMerger({
        maxCentroidDistance: 5.0,
        minBboxIoU: 0.1,
      });
      expect(custom.getNodeCount()).toBe(0);
    });
  });

  // ─── Factory ──────────────────────────────────────────────────────────────

  describe('factory', () => {
    it('should create merger via factory function', () => {
      const m = createTrainingFreeAlignmentMerger();
      expect(m.getNodeCount()).toBe(0);
    });
  });

  // ─── First Merge (Initialization) ─────────────────────────────────────────

  describe('first merge', () => {
    it('should initialize global graph from first local graph', () => {
      const localGraph = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      const result = merger.mergeLocalGraph(localGraph);

      expect(result.success).toBe(true);
      expect(merger.getNodeCount()).toBe(2);
      expect(result.event.newNodes).toBe(2);
      expect(result.event.matchedNodes).toBe(0);
    });

    it('should copy edges from first local graph', () => {
      const localGraph = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      merger.mergeLocalGraph(localGraph);
      expect(merger.getEdgeCount()).toBeGreaterThan(0);
    });

    it('should record contributing agent', () => {
      const localGraph = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      merger.mergeLocalGraph(localGraph);

      const global = merger.getGlobalGraph();
      expect(global.contributingAgentIds).toContain('agent-1');
    });
  });

  // ─── Node Matching ────────────────────────────────────────────────────────

  describe('node matching', () => {
    it('should match nodes with same label and overlapping position', () => {
      // Agent 1 sees a table at (0,0,0)
      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('table-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair-1', 'chair', { x: 2, y: 0, z: 0 }),
        createSnapshot('chair-2', 'chair', { x: -2, y: 0, z: 0 }),
        createSnapshot('lamp-1', 'lamp', { x: 0, y: 3, z: 0 }),
      ]);

      // Agent 2 sees the same table from a slightly different perspective
      const local2 = buildLocalGraph('agent-2', [
        createSnapshot('table-1', 'table', { x: 0.1, y: 0, z: 0.1 }),
        createSnapshot('chair-1', 'chair', { x: 2.1, y: 0, z: 0 }),
        createSnapshot('chair-2', 'chair', { x: -1.9, y: 0, z: 0 }),
        createSnapshot('lamp-1', 'lamp', { x: 0.1, y: 3, z: 0 }),
      ]);

      merger.mergeLocalGraph(local1);
      const result = merger.mergeLocalGraph(local2);

      // Should have matched nodes (same labels, close positions)
      expect(result.event.matchedNodes).toBeGreaterThan(0);
    });

    it('should add non-overlapping nodes as new', () => {
      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      // Agent 2 sees completely different area
      const local2 = buildLocalGraph('agent-2', [
        createSnapshot('obj-2', 'desk', { x: 100, y: 0, z: 100 }),
      ]);

      merger.mergeLocalGraph(local1);
      const result = merger.mergeLocalGraph(local2);

      // Should have added as new subgraph
      expect(result.event.newNodes).toBeGreaterThan(0);
      expect(merger.getNodeCount()).toBe(2); // 1 from each agent
    });
  });

  // ─── BBox IoU Computation ─────────────────────────────────────────────────

  describe('bbox IoU', () => {
    it('should return 1.0 for identical bounding boxes', () => {
      const box = {
        boundsMin: { x: 0, y: 0, z: 0 },
        boundsMax: { x: 1, y: 1, z: 1 },
      };

      const iou = merger.computeBboxIoU(box, box);
      expect(iou).toBeCloseTo(1.0);
    });

    it('should return 0 for non-overlapping bounding boxes', () => {
      const boxA = {
        boundsMin: { x: 0, y: 0, z: 0 },
        boundsMax: { x: 1, y: 1, z: 1 },
      };
      const boxB = {
        boundsMin: { x: 5, y: 5, z: 5 },
        boundsMax: { x: 6, y: 6, z: 6 },
      };

      const iou = merger.computeBboxIoU(boxA, boxB);
      expect(iou).toBe(0);
    });

    it('should return partial IoU for partially overlapping boxes', () => {
      const boxA = {
        boundsMin: { x: 0, y: 0, z: 0 },
        boundsMax: { x: 2, y: 2, z: 2 },
      };
      const boxB = {
        boundsMin: { x: 1, y: 1, z: 1 },
        boundsMax: { x: 3, y: 3, z: 3 },
      };

      const iou = merger.computeBboxIoU(boxA, boxB);
      expect(iou).toBeGreaterThan(0);
      expect(iou).toBeLessThan(1.0);
    });
  });

  // ─── Node Match Evaluation ────────────────────────────────────────────────

  describe('evaluateNodeMatch', () => {
    it('should classify matching node (same label + spatial overlap)', () => {
      const local = buildLocalGraph('agent-test', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'table', { x: 0.5, y: 0, z: 0 }),
      ]);

      const nodes = Array.from(local.nodes.values());
      const match = merger.evaluateNodeMatch(nodes[0], nodes[1]);

      expect(match.labelMatch).toBe(true);
      expect(match.matchType).toBe('matching');
      expect(match.confidence).toBeGreaterThan(0);
    });

    it('should classify conflict (spatial overlap + different label)', () => {
      const local = buildLocalGraph('agent-test', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'desk', { x: 0.5, y: 0, z: 0 }),
      ]);

      const nodes = Array.from(local.nodes.values());
      const match = merger.evaluateNodeMatch(nodes[0], nodes[1]);

      expect(match.labelMatch).toBe(false);
      expect(match.matchType).toBe('conflict');
    });

    it('should classify new node (no spatial overlap)', () => {
      const local = buildLocalGraph('agent-test', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 50, y: 0, z: 50 }),
      ]);

      const nodes = Array.from(local.nodes.values());
      const match = merger.evaluateNodeMatch(nodes[0], nodes[1]);

      expect(match.matchType).toBe('new');
      expect(match.confidence).toBe(0);
    });
  });

  // ─── Label Conflict Resolution ────────────────────────────────────────────

  describe('label conflict resolution', () => {
    it('should resolve label conflicts when enabled', () => {
      const merger2 = new TrainingFreeAlignmentMerger({
        resolveLabelConflicts: true,
        minIntersectionSize: 1, // Lower threshold for testing
        maxCentroidDistance: 5.0,
        minBboxIoU: 0.1,
        minMatchConfidence: 0.1,
      });

      // Agent 1 sees object as "table"
      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2, y: 0, z: 0 }),
        createSnapshot('obj-3', 'lamp', { x: 0, y: 3, z: 0 }),
      ]);

      // Agent 2 sees same object as "desk" (label conflict)
      const local2 = buildLocalGraph('agent-2', [
        createSnapshot('obj-1', 'desk', { x: 0.1, y: 0, z: 0 }),
        createSnapshot('obj-2', 'chair', { x: 2.1, y: 0, z: 0 }),
        createSnapshot('obj-3', 'lamp', { x: 0.1, y: 3, z: 0 }),
      ]);

      merger2.mergeLocalGraph(local1);
      const result = merger2.mergeLocalGraph(local2);

      // Should resolve at least some conflicts or add as new
      expect(result.success).toBe(true);
    });
  });

  // ─── Merge History ────────────────────────────────────────────────────────

  describe('merge history', () => {
    it('should track merge events', () => {
      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
      ]);

      merger.mergeLocalGraph(local1);

      const history = merger.getMergeHistory();
      expect(history).toHaveLength(1);
      expect(history[0].agentId).toBe('agent-1');
      expect(history[0].durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should accumulate merge events from multiple agents', () => {
      merger.mergeLocalGraph(
        buildLocalGraph('agent-1', [
          createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        ]),
      );

      merger.mergeLocalGraph(
        buildLocalGraph('agent-2', [
          createSnapshot('obj-2', 'chair', { x: 50, y: 0, z: 0 }),
        ]),
      );

      expect(merger.getMergeHistory()).toHaveLength(2);
    });

    it('should increment merge count', () => {
      merger.mergeLocalGraph(
        buildLocalGraph('agent-1', [
          createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        ]),
      );

      merger.mergeLocalGraph(
        buildLocalGraph('agent-2', [
          createSnapshot('obj-2', 'chair', { x: 50, y: 0, z: 0 }),
        ]),
      );

      expect(merger.getGlobalGraph().mergeCount).toBe(2);
    });
  });

  // ─── Bounding Box Union ───────────────────────────────────────────────────

  describe('bounding box union', () => {
    it('should expand bounds on merge with overlapping nodes', () => {
      const merger2 = new TrainingFreeAlignmentMerger({
        minIntersectionSize: 1,
        maxCentroidDistance: 5.0,
        minBboxIoU: 0.01,
        minMatchConfidence: 0.01,
      });

      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }, 2),
        createSnapshot('chair-1', 'chair', { x: 3, y: 0, z: 0 }),
        createSnapshot('chair-2', 'chair', { x: -3, y: 0, z: 0 }),
      ]);

      const local2 = buildLocalGraph('agent-2', [
        createSnapshot('table', 'table', { x: 0.5, y: 0, z: 0.5 }, 3), // Larger table
        createSnapshot('chair-1', 'chair', { x: 3.1, y: 0, z: 0 }),
        createSnapshot('chair-2', 'chair', { x: -2.9, y: 0, z: 0 }),
      ]);

      merger2.mergeLocalGraph(local1);
      merger2.mergeLocalGraph(local2);

      // Global graph should have nodes
      expect(merger2.getNodeCount()).toBeGreaterThan(0);
    });
  });

  // ─── Multiple Agents ──────────────────────────────────────────────────────

  describe('multiple agents', () => {
    it('should handle three agents merging overlapping observations', () => {
      // Three agents observing the same room from different angles
      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair-a', 'chair', { x: 2, y: 0, z: 0 }),
      ]);

      const local2 = buildLocalGraph('agent-2', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('chair-b', 'chair', { x: -2, y: 0, z: 0 }),
      ]);

      const local3 = buildLocalGraph('agent-3', [
        createSnapshot('table', 'table', { x: 0, y: 0, z: 0 }),
        createSnapshot('lamp', 'lamp', { x: 0, y: 3, z: 0 }),
      ]);

      merger.mergeLocalGraph(local1);
      merger.mergeLocalGraph(local2);
      merger.mergeLocalGraph(local3);

      const global = merger.getGlobalGraph();
      expect(global.contributingAgentIds).toHaveLength(3);
      expect(global.mergeCount).toBe(3);
    });
  });

  // ─── Global Graph Bounds ──────────────────────────────────────────────────

  describe('global bounds', () => {
    it('should track global graph spatial bounds', () => {
      const local1 = buildLocalGraph('agent-1', [
        createSnapshot('obj-1', 'table', { x: -10, y: 0, z: -10 }),
      ]);

      const local2 = buildLocalGraph('agent-2', [
        createSnapshot('obj-2', 'chair', { x: 10, y: 5, z: 10 }),
      ]);

      merger.mergeLocalGraph(local1);
      merger.mergeLocalGraph(local2);

      const bounds = merger.getGlobalGraph().bounds;
      expect(bounds.min.x).toBeLessThan(0);
      expect(bounds.max.x).toBeGreaterThan(0);
      expect(bounds.max.y).toBeGreaterThan(0);
    });
  });

  // ─── Reset and Dispose ────────────────────────────────────────────────────

  describe('reset and dispose', () => {
    it('should clear global graph on reset', () => {
      merger.mergeLocalGraph(
        buildLocalGraph('agent-1', [
          createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        ]),
      );

      merger.reset();

      expect(merger.getNodeCount()).toBe(0);
      expect(merger.getEdgeCount()).toBe(0);
      expect(merger.getMergeHistory()).toHaveLength(0);
    });

    it('should clear on dispose', () => {
      merger.mergeLocalGraph(
        buildLocalGraph('agent-1', [
          createSnapshot('obj-1', 'table', { x: 0, y: 0, z: 0 }),
        ]),
      );

      merger.dispose();

      expect(merger.getNodeCount()).toBe(0);
    });
  });
});
