import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassificationIngestion, DEFAULT_INGESTION_CONFIG } from '../ClassificationIngestion';
import type {
  ClassificationResult,
  ClassifiedSegment,
  SpatialEntity,
  SpatialStateEvents,
  SemanticClass,
} from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createSegment(overrides: Partial<ClassifiedSegment> = {}): ClassifiedSegment {
  return {
    segmentId: 'seg_0',
    semanticClass: 4 as SemanticClass, // TABLE
    boundingBox: {
      center: { x: 1, y: 1, z: 1 },
      size: { x: 1, y: 0.5, z: 1 },
    },
    centroid: { x: 1, y: 1, z: 1 },
    pointCount: 100,
    averageConfidence: 0.8,
    pointIndices: Array.from({ length: 100 }, (_, i) => i),
    ...overrides,
  };
}

function createClassificationResult(
  segments: ClassifiedSegment[],
  overrides: Partial<ClassificationResult> = {}
): ClassificationResult {
  return {
    frameId: 1,
    timestamp: Date.now(),
    pointClassifications: [],
    segments,
    akidaLatencyMs: 5,
    totalLatencyMs: 10,
    source: 'akida',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('ClassificationIngestion', () => {
  let ingestion: ClassificationIngestion;
  let events: SpatialStateEvents;

  beforeEach(() => {
    events = {
      onEntityAdded: vi.fn(),
      onEntityUpdated: vi.fn(),
      onEntityRemoved: vi.fn(),
      onStateReset: vi.fn(),
    };
    ingestion = new ClassificationIngestion(undefined, events);
  });

  describe('constructor', () => {
    it('initializes with default config', () => {
      const ing = new ClassificationIngestion();
      expect(ing.entityCount).toBe(0);
    });

    it('accepts custom config', () => {
      const ing = new ClassificationIngestion({ minConfidence: 0.9, maxEntities: 10 });
      expect(ing.entityCount).toBe(0);
    });
  });

  describe('ingest', () => {
    it('creates entity from a high-confidence segment', () => {
      const segment = createSegment();
      const result = createClassificationResult([segment]);

      ingestion.ingest(result);

      expect(ingestion.entityCount).toBe(1);
      expect(events.onEntityAdded).toHaveBeenCalledTimes(1);
    });

    it('does not create entity from low-confidence segment', () => {
      const segment = createSegment({ averageConfidence: 0.1 });
      const result = createClassificationResult([segment]);

      ingestion.ingest(result);

      expect(ingestion.entityCount).toBe(0);
      expect(events.onEntityAdded).not.toHaveBeenCalled();
    });

    it('updates existing entity when segment is within merge distance', () => {
      // First ingestion: creates entity
      const seg1 = createSegment({ centroid: { x: 1, y: 1, z: 1 } });
      ingestion.ingest(createClassificationResult([seg1]));
      expect(ingestion.entityCount).toBe(1);

      // Second ingestion: close centroid, same class -> update
      const seg2 = createSegment({ centroid: { x: 1.1, y: 1.1, z: 1.1 } });
      ingestion.ingest(createClassificationResult([seg2]));

      expect(ingestion.entityCount).toBe(1);
      expect(events.onEntityUpdated).toHaveBeenCalled();
    });

    it('creates new entity when segment is outside merge distance', () => {
      const seg1 = createSegment({ centroid: { x: 0, y: 0, z: 0 } });
      ingestion.ingest(createClassificationResult([seg1]));

      const seg2 = createSegment({ centroid: { x: 100, y: 100, z: 100 } });
      ingestion.ingest(createClassificationResult([seg2]));

      expect(ingestion.entityCount).toBe(2);
      expect(events.onEntityAdded).toHaveBeenCalledTimes(2);
    });

    it('creates new entity when segment has different semantic class', () => {
      const seg1 = createSegment({
        semanticClass: 4 as SemanticClass, // TABLE
        centroid: { x: 1, y: 1, z: 1 },
      });
      ingestion.ingest(createClassificationResult([seg1]));

      const seg2 = createSegment({
        semanticClass: 5 as SemanticClass, // CHAIR
        centroid: { x: 1, y: 1, z: 1 },
      });
      ingestion.ingest(createClassificationResult([seg2]));

      expect(ingestion.entityCount).toBe(2);
    });

    it('respects maxEntities limit', () => {
      const ing = new ClassificationIngestion({ maxEntities: 2 }, events);

      for (let i = 0; i < 5; i++) {
        const seg = createSegment({ centroid: { x: i * 100, y: 0, z: 0 } });
        ing.ingest(createClassificationResult([seg]));
      }

      expect(ing.entityCount).toBe(2);
    });

    it('handles multiple segments in one result', () => {
      const seg1 = createSegment({
        segmentId: 'seg_0',
        centroid: { x: 0, y: 0, z: 0 },
        semanticClass: 1 as SemanticClass, // FLOOR
      });
      const seg2 = createSegment({
        segmentId: 'seg_1',
        centroid: { x: 5, y: 5, z: 5 },
        semanticClass: 2 as SemanticClass, // WALL
      });

      ingestion.ingest(createClassificationResult([seg1, seg2]));
      expect(ingestion.entityCount).toBe(2);
    });
  });

  describe('entity smoothing', () => {
    it('smooths position over successive updates', () => {
      const alpha = DEFAULT_INGESTION_CONFIG.positionSmoothingAlpha;

      // First position at origin
      const seg1 = createSegment({ centroid: { x: 0, y: 0, z: 0 } });
      ingestion.ingest(createClassificationResult([seg1]));

      const entity1 = ingestion.getEntities()[0];
      expect(entity1.position.x).toBe(0);

      // Second position - within merge distance (0.3m away, threshold is 0.5m)
      const seg2 = createSegment({ centroid: { x: 0.3, y: 0, z: 0 } });
      ingestion.ingest(createClassificationResult([seg2]));

      const entity2 = ingestion.getEntities()[0];
      const expected = 0 * (1 - alpha) + 0.3 * alpha;
      expect(entity2.position.x).toBeCloseTo(expected, 4);
    });

    it('smooths confidence over successive updates', () => {
      const confAlpha = DEFAULT_INGESTION_CONFIG.confidenceSmoothingAlpha;

      const seg1 = createSegment({ averageConfidence: 0.8 });
      ingestion.ingest(createClassificationResult([seg1]));

      const seg2 = createSegment({ averageConfidence: 0.5 });
      ingestion.ingest(createClassificationResult([seg2]));

      const entity = ingestion.getEntities()[0];
      const expected = 0.8 * (1 - confAlpha) + 0.5 * confAlpha;
      expect(entity.confidence).toBeCloseTo(expected, 4);
    });

    it('increments observation count', () => {
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg]));
      expect(ingestion.getEntities()[0].observationCount).toBe(1);

      ingestion.ingest(createClassificationResult([seg]));
      expect(ingestion.getEntities()[0].observationCount).toBe(2);
    });
  });

  describe('entity pruning', () => {
    it('marks entity invisible after visibility timeout', () => {
      const now = 1000000;
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg], { timestamp: now }));

      // Ingest a result much later (beyond visibility timeout) with no matching segment
      const laterResult = createClassificationResult([], {
        timestamp: now + DEFAULT_INGESTION_CONFIG.visibilityTimeoutMs + 100,
      });
      ingestion.ingest(laterResult);

      const entity = ingestion.getEntities()[0];
      expect(entity.isVisible).toBe(false);
    });

    it('removes entity after removal timeout', () => {
      const now = 1000000;
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg], { timestamp: now }));
      expect(ingestion.entityCount).toBe(1);

      // Ingest much later
      const laterResult = createClassificationResult([], {
        timestamp: now + DEFAULT_INGESTION_CONFIG.removalTimeoutMs + 100,
      });
      ingestion.ingest(laterResult);

      expect(ingestion.entityCount).toBe(0);
      expect(events.onEntityRemoved).toHaveBeenCalledTimes(1);
    });
  });

  describe('query methods', () => {
    it('getEntitiesByClass filters correctly', () => {
      const floor = createSegment({
        semanticClass: 1 as SemanticClass,
        centroid: { x: 0, y: 0, z: 0 },
      });
      const wall = createSegment({
        semanticClass: 2 as SemanticClass,
        centroid: { x: 5, y: 5, z: 5 },
      });

      ingestion.ingest(createClassificationResult([floor, wall]));

      expect(ingestion.getEntitiesByClass(1 as SemanticClass)).toHaveLength(1);
      expect(ingestion.getEntitiesByClass(2 as SemanticClass)).toHaveLength(1);
      expect(ingestion.getEntitiesByClass(3 as SemanticClass)).toHaveLength(0);
    });

    it('getVisibleEntities returns only visible entities', () => {
      const now = 1000000;
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg], { timestamp: now }));

      // All visible initially
      expect(ingestion.getVisibleEntities()).toHaveLength(1);

      // Age it out
      ingestion.ingest(createClassificationResult([], {
        timestamp: now + DEFAULT_INGESTION_CONFIG.visibilityTimeoutMs + 100,
      }));

      expect(ingestion.getVisibleEntities()).toHaveLength(0);
      expect(ingestion.getEntities()).toHaveLength(1); // Still tracked, just invisible
    });

    it('getEntity returns entity by ID', () => {
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg]));

      const entities = ingestion.getEntities();
      const entity = ingestion.getEntity(entities[0].entityId);
      expect(entity).toBeDefined();
      expect(entity?.entityId).toBe(entities[0].entityId);
    });

    it('getEntity returns undefined for nonexistent ID', () => {
      expect(ingestion.getEntity('nonexistent')).toBeUndefined();
    });

    it('getEntityCountsByClass returns correct counts', () => {
      const floor = createSegment({
        semanticClass: 1 as SemanticClass,
        centroid: { x: 0, y: 0, z: 0 },
      });
      const wall1 = createSegment({
        semanticClass: 2 as SemanticClass,
        centroid: { x: 5, y: 5, z: 5 },
      });
      const wall2 = createSegment({
        semanticClass: 2 as SemanticClass,
        centroid: { x: 50, y: 50, z: 50 },
      });

      ingestion.ingest(createClassificationResult([floor, wall1, wall2]));

      const counts = ingestion.getEntityCountsByClass();
      expect(counts[1 as SemanticClass]).toBe(1);
      expect(counts[2 as SemanticClass]).toBe(2);
    });
  });

  describe('reset', () => {
    it('clears all entities', () => {
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg]));
      expect(ingestion.entityCount).toBe(1);

      ingestion.reset();
      expect(ingestion.entityCount).toBe(0);
      expect(events.onStateReset).toHaveBeenCalled();
    });
  });

  describe('source tracking', () => {
    it('tracks akida source', () => {
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg], { source: 'akida' }));
      expect(ingestion.getEntities()[0].source).toBe('akida');
    });

    it('tracks cpu source', () => {
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg], { source: 'cpu' }));
      expect(ingestion.getEntities()[0].source).toBe('cpu');
    });

    it('tracks webgpu source', () => {
      const seg = createSegment();
      ingestion.ingest(createClassificationResult([seg], { source: 'webgpu' }));
      expect(ingestion.getEntities()[0].source).toBe('webgpu');
    });
  });
});
