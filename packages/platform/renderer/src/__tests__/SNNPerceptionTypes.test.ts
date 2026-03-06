/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SNNPerceptionTypes
 *
 * Validates:
 * - SharedArrayBuffer layout calculation
 * - Default configuration values
 * - Empty state factory
 * - Salience encoding/decoding round-trip
 * - SAB header field offsets
 */

import { describe, it, expect } from 'vitest';

import {
  calculateBufferLayout,
  createEmptySNNPerceptionState,
  DEFAULT_SNN_NETWORK_CONFIG,
  DEFAULT_WORKER_CONFIG,
  DEFAULT_BRIDGE_CONFIG,
  SAB_HEADER,
  SAB_ENTRY_SIZE,
  SALIENCE_ENCODING,
  SALIENCE_DECODING,
} from '../SNNPerceptionTypes';

import type {
  SNNPerceptionState,
  SharedBufferLayout,
  SalienceLevel,
} from '../SNNPerceptionTypes';

// =============================================================================
// BUFFER LAYOUT TESTS
// =============================================================================

describe('calculateBufferLayout', () => {
  it('should calculate correct buffer size for 256 objects', () => {
    const layout = calculateBufferLayout(256);

    // Header: 14 Int32 = 56 bytes
    const headerBytes = SAB_HEADER.HEADER_SIZE * 4;
    expect(headerBytes).toBe(56);

    // Attention: 256 * 4 floats * 4 bytes = 4096 bytes
    const attentionBytes = 256 * SAB_ENTRY_SIZE * 4;
    expect(attentionBytes).toBe(4096);

    // Total before alignment: 56 + 4096 = 4152
    // Aligned to 8 bytes: 4152 -> 4152 (already divisible by 8)
    expect(layout.totalBytes).toBe(4152);
    expect(layout.headerOffset).toBe(0);
    expect(layout.attentionOffset).toBe(56);
    expect(layout.maxAttentionEntries).toBe(256);
  });

  it('should calculate correct buffer size for 1 object', () => {
    const layout = calculateBufferLayout(1);
    const headerBytes = SAB_HEADER.HEADER_SIZE * 4;
    const attentionBytes = 1 * SAB_ENTRY_SIZE * 4;
    const total = headerBytes + attentionBytes;
    const aligned = Math.ceil(total / 8) * 8;

    expect(layout.totalBytes).toBe(aligned);
    expect(layout.maxAttentionEntries).toBe(1);
  });

  it('should align total size to 8 bytes', () => {
    for (let n = 1; n <= 100; n++) {
      const layout = calculateBufferLayout(n);
      expect(layout.totalBytes % 8).toBe(0);
    }
  });

  it('should increase monotonically with object count', () => {
    let prevSize = 0;
    for (let n = 1; n <= 50; n++) {
      const layout = calculateBufferLayout(n);
      expect(layout.totalBytes).toBeGreaterThanOrEqual(prevSize);
      prevSize = layout.totalBytes;
    }
  });
});

// =============================================================================
// SAB HEADER TESTS
// =============================================================================

describe('SAB_HEADER', () => {
  it('should have contiguous field offsets starting at 0', () => {
    expect(SAB_HEADER.SEQUENCE).toBe(0);
    expect(SAB_HEADER.ENTRY_COUNT).toBe(1);
    expect(SAB_HEADER.ANOMALY_LEVEL).toBe(2);
    expect(SAB_HEADER.FOCUS_X).toBe(3);
    expect(SAB_HEADER.FOCUS_Y).toBe(4);
    expect(SAB_HEADER.FOCUS_Z).toBe(5);
    expect(SAB_HEADER.FOCUS_CONFIDENCE).toBe(6);
    expect(SAB_HEADER.AVG_SPIKE_RATE).toBe(7);
    expect(SAB_HEADER.TOTAL_SPIKES).toBe(8);
    expect(SAB_HEADER.INFERENCE_DURATION_US).toBe(9);
    expect(SAB_HEADER.TIMESTAMP_LOW).toBe(10);
    expect(SAB_HEADER.TIMESTAMP_HIGH).toBe(11);
    expect(SAB_HEADER.CURRENT_HZ_X100).toBe(12);
    expect(SAB_HEADER.TRACKED_OBJECTS).toBe(13);
  });

  it('should have HEADER_SIZE equal to last field + 1', () => {
    expect(SAB_HEADER.HEADER_SIZE).toBe(14);
  });
});

// =============================================================================
// SALIENCE ENCODING TESTS
// =============================================================================

describe('Salience encoding/decoding', () => {
  it('should encode all salience levels', () => {
    expect(SALIENCE_ENCODING.background).toBe(0);
    expect(SALIENCE_ENCODING.ambient).toBe(1);
    expect(SALIENCE_ENCODING.focus).toBe(2);
    expect(SALIENCE_ENCODING.alert).toBe(3);
  });

  it('should decode all salience levels', () => {
    expect(SALIENCE_DECODING[0]).toBe('background');
    expect(SALIENCE_DECODING[1]).toBe('ambient');
    expect(SALIENCE_DECODING[2]).toBe('focus');
    expect(SALIENCE_DECODING[3]).toBe('alert');
  });

  it('should round-trip all salience levels', () => {
    const levels: SalienceLevel[] = ['background', 'ambient', 'focus', 'alert'];
    for (const level of levels) {
      const encoded = SALIENCE_ENCODING[level];
      const decoded = SALIENCE_DECODING[encoded];
      expect(decoded).toBe(level);
    }
  });
});

// =============================================================================
// DEFAULT CONFIGURATION TESTS
// =============================================================================

describe('DEFAULT_SNN_NETWORK_CONFIG', () => {
  it('should have input layer with 256 neurons', () => {
    expect(DEFAULT_SNN_NETWORK_CONFIG.inputLayer.neuronCount).toBe(256);
  });

  it('should have hidden layer with 128 neurons', () => {
    expect(DEFAULT_SNN_NETWORK_CONFIG.hiddenLayer.neuronCount).toBe(128);
  });

  it('should have output layer with 64 neurons', () => {
    expect(DEFAULT_SNN_NETWORK_CONFIG.outputLayer.neuronCount).toBe(64);
  });

  it('should have valid decay factors (0-1)', () => {
    expect(DEFAULT_SNN_NETWORK_CONFIG.inputLayer.decay).toBeGreaterThan(0);
    expect(DEFAULT_SNN_NETWORK_CONFIG.inputLayer.decay).toBeLessThan(1);
    expect(DEFAULT_SNN_NETWORK_CONFIG.hiddenLayer.decay).toBeGreaterThan(0);
    expect(DEFAULT_SNN_NETWORK_CONFIG.hiddenLayer.decay).toBeLessThan(1);
    expect(DEFAULT_SNN_NETWORK_CONFIG.outputLayer.decay).toBeGreaterThan(0);
    expect(DEFAULT_SNN_NETWORK_CONFIG.outputLayer.decay).toBeLessThan(1);
  });

  it('should have positive thresholds', () => {
    expect(DEFAULT_SNN_NETWORK_CONFIG.inputLayer.threshold).toBeGreaterThan(0);
    expect(DEFAULT_SNN_NETWORK_CONFIG.hiddenLayer.threshold).toBeGreaterThan(0);
    expect(DEFAULT_SNN_NETWORK_CONFIG.outputLayer.threshold).toBeGreaterThan(0);
  });

  it('should have 10 timesteps per inference', () => {
    expect(DEFAULT_SNN_NETWORK_CONFIG.timestepsPerInference).toBe(10);
  });
});

describe('DEFAULT_WORKER_CONFIG', () => {
  it('should support 256 objects', () => {
    expect(DEFAULT_WORKER_CONFIG.maxObjects).toBe(256);
  });

  it('should enable anomaly detection', () => {
    expect(DEFAULT_WORKER_CONFIG.enableAnomalyDetection).toBe(true);
  });

  it('should have anomaly threshold of 0.8', () => {
    expect(DEFAULT_WORKER_CONFIG.anomalyThreshold).toBe(0.8);
  });
});

describe('DEFAULT_BRIDGE_CONFIG', () => {
  it('should have 10Hz initial frequency', () => {
    expect(DEFAULT_BRIDGE_CONFIG.initialHz).toBe(10);
  });

  it('should have 1-30Hz range', () => {
    expect(DEFAULT_BRIDGE_CONFIG.minHz).toBe(1);
    expect(DEFAULT_BRIDGE_CONFIG.maxHz).toBe(30);
  });

  it('should enable adaptive frequency', () => {
    expect(DEFAULT_BRIDGE_CONFIG.adaptiveFrequency).toBe(true);
  });

  it('should enable distance sort', () => {
    expect(DEFAULT_BRIDGE_CONFIG.distanceSortInput).toBe(true);
  });
});

// =============================================================================
// EMPTY STATE FACTORY TESTS
// =============================================================================

describe('createEmptySNNPerceptionState', () => {
  it('should create state with empty attention scores', () => {
    const state = createEmptySNNPerceptionState();
    expect(state.attentionScores).toEqual([]);
  });

  it('should create state with zero tracked objects', () => {
    const state = createEmptySNNPerceptionState();
    expect(state.trackedObjectCount).toBe(0);
  });

  it('should create state with zero anomaly level', () => {
    const state = createEmptySNNPerceptionState();
    expect(state.globalAnomalyLevel).toBe(0);
  });

  it('should create state with origin focus point', () => {
    const state = createEmptySNNPerceptionState();
    expect(state.focusPoint).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('should create state with zero sequence', () => {
    const state = createEmptySNNPerceptionState();
    expect(state.sequence).toBe(0);
  });

  it('should create state with zero Hz', () => {
    const state = createEmptySNNPerceptionState();
    expect(state.currentHz).toBe(0);
  });

  it('should create independent instances', () => {
    const state1 = createEmptySNNPerceptionState();
    const state2 = createEmptySNNPerceptionState();
    state1.trackedObjectCount = 42;
    expect(state2.trackedObjectCount).toBe(0);
  });
});

// =============================================================================
// SAB ENTRY SIZE
// =============================================================================

describe('SAB_ENTRY_SIZE', () => {
  it('should be 4 (Float32 values per attention entry)', () => {
    expect(SAB_ENTRY_SIZE).toBe(4);
  });
});
