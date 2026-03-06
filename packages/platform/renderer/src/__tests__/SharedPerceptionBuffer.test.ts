/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SharedPerceptionBuffer
 *
 * Validates:
 * - Lock-free read protocol with Atomics acquire/release semantics
 * - Sequence-based change detection
 * - Full state deserialization from SharedArrayBuffer
 * - Object ID map management
 * - Cached state return when no new data
 * - Metrics tracking (reads, updates, hit rate)
 * - Reset behavior
 * - Edge cases (empty buffer, invalid indices)
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
  SharedPerceptionBuffer,
  createSharedPerceptionBuffer,
} from '../SharedPerceptionBuffer';

import {
  calculateBufferLayout,
  SAB_HEADER,
  SAB_ENTRY_SIZE,
  SALIENCE_ENCODING,
} from '../SNNPerceptionTypes';

import type { SalienceLevel } from '../SNNPerceptionTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestSAB(maxObjects: number = 256): {
  sab: SharedArrayBuffer;
  int32: Int32Array;
  float32: Float32Array;
} {
  const layout = calculateBufferLayout(maxObjects);
  const sab = new SharedArrayBuffer(layout.totalBytes);
  return {
    sab,
    int32: new Int32Array(sab),
    float32: new Float32Array(sab),
  };
}

/**
 * Simulate a worker writing perception results to the SAB.
 */
function writeToSAB(
  int32: Int32Array,
  float32: Float32Array,
  options: {
    sequence: number;
    entryCount: number;
    anomalyLevel?: number;
    focusX?: number;
    focusY?: number;
    focusZ?: number;
    focusConfidence?: number;
    avgSpikeRate?: number;
    totalSpikes?: number;
    inferenceDurationUs?: number;
    currentHzX100?: number;
    trackedObjects?: number;
    entries?: Array<{
      attention: number;
      spikeRate: number;
      salience: SalienceLevel;
      isAnomalous: boolean;
      objectIndex: number;
    }>;
  },
): void {
  // Write header
  Atomics.store(int32, SAB_HEADER.ENTRY_COUNT, options.entryCount);
  float32[SAB_HEADER.ANOMALY_LEVEL] = options.anomalyLevel ?? 0;
  float32[SAB_HEADER.FOCUS_X] = options.focusX ?? 0;
  float32[SAB_HEADER.FOCUS_Y] = options.focusY ?? 0;
  float32[SAB_HEADER.FOCUS_Z] = options.focusZ ?? 0;
  float32[SAB_HEADER.FOCUS_CONFIDENCE] = options.focusConfidence ?? 0;
  float32[SAB_HEADER.AVG_SPIKE_RATE] = options.avgSpikeRate ?? 0;
  Atomics.store(int32, SAB_HEADER.TOTAL_SPIKES, options.totalSpikes ?? 0);
  Atomics.store(int32, SAB_HEADER.INFERENCE_DURATION_US, options.inferenceDurationUs ?? 0);
  Atomics.store(int32, SAB_HEADER.TIMESTAMP_LOW, 0);
  Atomics.store(int32, SAB_HEADER.TIMESTAMP_HIGH, 0);
  Atomics.store(int32, SAB_HEADER.CURRENT_HZ_X100, options.currentHzX100 ?? 1000);
  Atomics.store(int32, SAB_HEADER.TRACKED_OBJECTS, options.trackedObjects ?? options.entryCount);

  // Write entries
  if (options.entries) {
    const entryOffset = SAB_HEADER.HEADER_SIZE;
    for (let i = 0; i < options.entries.length; i++) {
      const entry = options.entries[i];
      const baseIdx = entryOffset + i * SAB_ENTRY_SIZE;

      float32[baseIdx + 0] = entry.attention;
      float32[baseIdx + 1] = entry.spikeRate;
      const flags = (entry.isAnomalous ? 1 : 0) | (SALIENCE_ENCODING[entry.salience] << 1);
      float32[baseIdx + 2] = flags;
      float32[baseIdx + 3] = entry.objectIndex;
    }
  }

  // RELEASE: Write sequence last
  Atomics.store(int32, SAB_HEADER.SEQUENCE, options.sequence);
}

// =============================================================================
// CREATION TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Creation', () => {
  it('should create via factory function', () => {
    const { buffer, sab } = createSharedPerceptionBuffer(256);
    expect(buffer).toBeInstanceOf(SharedPerceptionBuffer);
    expect(sab).toBeInstanceOf(SharedArrayBuffer);
  });

  it('should create with correct SAB size', () => {
    const { sab } = createSharedPerceptionBuffer(256);
    const layout = calculateBufferLayout(256);
    expect(sab.byteLength).toBe(layout.totalBytes);
  });

  it('should create with default 256 objects', () => {
    const { buffer } = createSharedPerceptionBuffer();
    expect(buffer).toBeInstanceOf(SharedPerceptionBuffer);
  });

  it('should create with small object count', () => {
    const { buffer, sab } = createSharedPerceptionBuffer(1);
    expect(buffer).toBeInstanceOf(SharedPerceptionBuffer);
    const layout = calculateBufferLayout(1);
    expect(sab.byteLength).toBe(layout.totalBytes);
  });
});

// =============================================================================
// READ PROTOCOL TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Read Protocol', () => {
  it('should return empty state when no data written', () => {
    const { buffer } = createSharedPerceptionBuffer(256);
    const state = buffer.readState();

    expect(state.sequence).toBe(0);
    expect(state.attentionScores).toEqual([]);
    expect(state.trackedObjectCount).toBe(0);
  });

  it('should detect new data via sequence number', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    expect(buffer.hasNewData()).toBe(false);

    writeToSAB(int32, float32, { sequence: 1, entryCount: 0 });
    expect(buffer.hasNewData()).toBe(true);
  });

  it('should read full state when new sequence detected', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 2,
      anomalyLevel: 0.3,
      focusX: 1.0,
      focusY: 2.0,
      focusZ: 3.0,
      focusConfidence: 0.8,
      avgSpikeRate: 0.5,
      totalSpikes: 42,
      currentHzX100: 1500,
      trackedObjects: 2,
      entries: [
        { attention: 0.9, spikeRate: 0.8, salience: 'alert', isAnomalous: true, objectIndex: 0 },
        { attention: 0.3, spikeRate: 0.2, salience: 'ambient', isAnomalous: false, objectIndex: 1 },
      ],
    });

    buffer.setObjectIdMap(['obj-A', 'obj-B']);
    const state = buffer.readState();

    expect(state.sequence).toBe(1);
    expect(state.trackedObjectCount).toBe(2);
    expect(state.globalAnomalyLevel).toBeCloseTo(0.3);
    expect(state.focusPoint.x).toBeCloseTo(1.0);
    expect(state.focusPoint.y).toBeCloseTo(2.0);
    expect(state.focusPoint.z).toBeCloseTo(3.0);
    expect(state.focusConfidence).toBeCloseTo(0.8);
    expect(state.averageSpikeRate).toBeCloseTo(0.5);
    expect(state.totalSpikes).toBe(42);
    expect(state.currentHz).toBeCloseTo(15.0);
  });

  it('should decode attention entries correctly', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 3,
      entries: [
        { attention: 0.95, spikeRate: 0.9, salience: 'alert', isAnomalous: true, objectIndex: 0 },
        { attention: 0.6, spikeRate: 0.5, salience: 'focus', isAnomalous: false, objectIndex: 1 },
        { attention: 0.1, spikeRate: 0.05, salience: 'background', isAnomalous: false, objectIndex: 2 },
      ],
    });

    buffer.setObjectIdMap(['cube', 'sphere', 'floor']);
    const state = buffer.readState();

    expect(state.attentionScores).toHaveLength(3);

    expect(state.attentionScores[0].objectId).toBe('cube');
    expect(state.attentionScores[0].attention).toBeCloseTo(0.95);
    expect(state.attentionScores[0].salience).toBe('alert');
    expect(state.attentionScores[0].isAnomalous).toBe(true);

    expect(state.attentionScores[1].objectId).toBe('sphere');
    expect(state.attentionScores[1].attention).toBeCloseTo(0.6);
    expect(state.attentionScores[1].salience).toBe('focus');
    expect(state.attentionScores[1].isAnomalous).toBe(false);

    expect(state.attentionScores[2].objectId).toBe('floor');
    expect(state.attentionScores[2].attention).toBeCloseTo(0.1);
    expect(state.attentionScores[2].salience).toBe('background');
  });

  it('should return cached state when no new data', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 1, entryCount: 1, trackedObjects: 5 });
    buffer.setObjectIdMap(['test']);

    const state1 = buffer.readState();
    const state2 = buffer.readState();

    // Should be the same reference (cached)
    expect(state1).toBe(state2);
    expect(state1.trackedObjectCount).toBe(5);
  });

  it('should update state when sequence advances', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 1, entryCount: 0, trackedObjects: 3 });
    const state1 = buffer.readState();
    expect(state1.trackedObjectCount).toBe(3);

    writeToSAB(int32, float32, { sequence: 2, entryCount: 0, trackedObjects: 7 });
    const state2 = buffer.readState();
    expect(state2.trackedObjectCount).toBe(7);

    // Should be different objects
    expect(state1).not.toBe(state2);
  });
});

// =============================================================================
// OBJECT ID MAP TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Object ID Map', () => {
  it('should map indices to object IDs', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 2,
      entries: [
        { attention: 0.8, spikeRate: 0.7, salience: 'focus', isAnomalous: false, objectIndex: 0 },
        { attention: 0.4, spikeRate: 0.3, salience: 'ambient', isAnomalous: false, objectIndex: 1 },
      ],
    });

    buffer.setObjectIdMap(['player', 'enemy']);
    const state = buffer.readState();

    expect(state.attentionScores[0].objectId).toBe('player');
    expect(state.attentionScores[1].objectId).toBe('enemy');
  });

  it('should use unknown-N for unmapped indices', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 1,
      entries: [
        { attention: 0.5, spikeRate: 0.4, salience: 'ambient', isAnomalous: false, objectIndex: 5 },
      ],
    });

    buffer.setObjectIdMap(['a', 'b']); // Only 2 IDs, but index 5
    const state = buffer.readState();

    expect(state.attentionScores[0].objectId).toBe('unknown-5');
  });

  it('should handle negative object indices', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 1,
      entries: [
        { attention: 0.5, spikeRate: 0.4, salience: 'ambient', isAnomalous: false, objectIndex: -1 },
      ],
    });

    const state = buffer.readState();
    expect(state.attentionScores[0].objectId).toBe('unknown--1');
  });
});

// =============================================================================
// METRICS TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Metrics', () => {
  it('should track read count', () => {
    const { buffer } = createSharedPerceptionBuffer(256);

    buffer.readState();
    buffer.readState();
    buffer.readState();

    const metrics = buffer.getMetrics();
    expect(metrics.totalReads).toBe(3);
  });

  it('should track update count', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 1, entryCount: 0 });
    buffer.readState(); // update 1

    buffer.readState(); // cache hit (no new data)

    writeToSAB(int32, float32, { sequence: 2, entryCount: 0 });
    buffer.readState(); // update 2

    const metrics = buffer.getMetrics();
    expect(metrics.totalReads).toBe(3);
    expect(metrics.totalUpdates).toBe(2);
  });

  it('should calculate hit rate', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 1, entryCount: 0 });
    buffer.readState(); // update (miss)
    buffer.readState(); // cache hit
    buffer.readState(); // cache hit
    buffer.readState(); // cache hit

    const metrics = buffer.getMetrics();
    // 4 reads, 1 update, hit rate = 3/4 = 0.75
    expect(metrics.hitRate).toBeCloseTo(0.75);
  });

  it('should track last sequence', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 42, entryCount: 0 });
    buffer.readState();

    const metrics = buffer.getMetrics();
    expect(metrics.lastSequence).toBe(42);
  });
});

// =============================================================================
// RESET TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Reset', () => {
  it('should reset to empty state', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 5, entryCount: 3, trackedObjects: 10 });
    buffer.readState();

    buffer.reset();

    const metrics = buffer.getMetrics();
    expect(metrics.totalReads).toBe(0);
    expect(metrics.totalUpdates).toBe(0);
    expect(metrics.lastSequence).toBe(0);

    const state = buffer.getLastState();
    expect(state.sequence).toBe(0);
    expect(state.trackedObjectCount).toBe(0);
  });

  it('should re-read data after reset', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, { sequence: 1, entryCount: 0, trackedObjects: 5 });
    buffer.readState();

    buffer.reset();

    // SAB still has sequence 1, so it should re-read
    const state = buffer.readState();
    expect(state.sequence).toBe(1);
    expect(state.trackedObjectCount).toBe(5);
  });
});

// =============================================================================
// SALIENCE DECODING TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Salience Decoding', () => {
  const testCases: Array<{ level: SalienceLevel; expected: SalienceLevel }> = [
    { level: 'background', expected: 'background' },
    { level: 'ambient', expected: 'ambient' },
    { level: 'focus', expected: 'focus' },
    { level: 'alert', expected: 'alert' },
  ];

  for (const tc of testCases) {
    it(`should decode salience level: ${tc.level}`, () => {
      const { sab, int32, float32 } = createTestSAB(256);
      const buffer = new SharedPerceptionBuffer(sab, 256);

      writeToSAB(int32, float32, {
        sequence: 1,
        entryCount: 1,
        entries: [
          { attention: 0.5, spikeRate: 0.3, salience: tc.level, isAnomalous: false, objectIndex: 0 },
        ],
      });

      buffer.setObjectIdMap(['test']);
      const state = buffer.readState();

      expect(state.attentionScores[0].salience).toBe(tc.expected);
    });
  }
});

// =============================================================================
// ANOMALY FLAG TESTS
// =============================================================================

describe('SharedPerceptionBuffer - Anomaly Flag', () => {
  it('should decode anomalous flag = true', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 1,
      entries: [
        { attention: 0.9, spikeRate: 0.85, salience: 'alert', isAnomalous: true, objectIndex: 0 },
      ],
    });

    buffer.setObjectIdMap(['anomalous-obj']);
    const state = buffer.readState();

    expect(state.attentionScores[0].isAnomalous).toBe(true);
  });

  it('should decode anomalous flag = false', () => {
    const { sab, int32, float32 } = createTestSAB(256);
    const buffer = new SharedPerceptionBuffer(sab, 256);

    writeToSAB(int32, float32, {
      sequence: 1,
      entryCount: 1,
      entries: [
        { attention: 0.3, spikeRate: 0.2, salience: 'ambient', isAnomalous: false, objectIndex: 0 },
      ],
    });

    buffer.setObjectIdMap(['normal-obj']);
    const state = buffer.readState();

    expect(state.attentionScores[0].isAnomalous).toBe(false);
  });
});
