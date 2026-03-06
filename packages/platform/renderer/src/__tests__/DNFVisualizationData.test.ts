/**
 * @vitest-environment jsdom
 */

/**
 * Tests for DNFVisualizationData
 *
 * Validates:
 * - Dashboard data generation from snapshots
 * - Heatmap pixel rendering (activation, output, input modes)
 * - Peak marker rendering
 * - Time series management
 * - Color map configuration
 * - Kernel visualization
 * - ARIA description generation
 * - Summary text generation
 */

import { describe, it, expect, vi } from 'vitest';

import {
  DNFVisualizationDataBuilder,
  createDNFVisualizationDataBuilder,
  DEFAULT_DNF_COLOR_MAP,
} from '../DNFVisualizationData';

import type {
  DNFTimeSample,
  DNFDashboardData,
  DNFColorMap,
} from '../DNFVisualizationData';

import type {
  DNFVisualizationSnapshot,
  DNFIntegrationMetrics,
} from '../DynamicNeuralFieldTypes';

import {
  createEmptyVisualizationSnapshot,
  createEmptyDNFStatistics,
} from '../DynamicNeuralFieldTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestSnapshot(
  width: number = 8,
  height: number = 8,
  overrides?: Partial<DNFVisualizationSnapshot>,
): DNFVisualizationSnapshot {
  const size = width * height;
  const activationHeatmap = new Float32Array(size);
  const outputHeatmap = new Float32Array(size);
  const inputOverlay = new Float32Array(size);

  // Create a gradient: -1 to 1 across the field
  for (let i = 0; i < size; i++) {
    activationHeatmap[i] = (i / (size - 1)) * 2 - 1; // -1 to 1
    outputHeatmap[i] = i / (size - 1); // 0 to 1
    inputOverlay[i] = i < size / 2 ? 0.5 : 0; // Half filled
  }

  return {
    snapshotId: 1,
    timestamp: performance.now(),
    label: 'test-snapshot',
    width,
    height,
    activationHeatmap,
    outputHeatmap,
    inputOverlay,
    peaks: [
      {
        position: [4, 4] as [number, number],
        normalizedPosition: [0.5, 0.5] as [number, number],
        amplitude: 3.0,
        width: 2.0,
        mass: 15.0,
        isStable: true,
        worldPosition: { x: 5, y: 0, z: 5 },
      },
    ],
    statistics: {
      ...createEmptyDNFStatistics(),
      meanActivation: -2.0,
      maxActivation: 3.0,
      minActivation: -5.0,
      stdActivation: 2.5,
      meanOutput: 0.2,
      activePositionCount: 10,
      activeFraction: 10 / size,
      peaks: [
        {
          position: [4, 4],
          normalizedPosition: [0.5, 0.5],
          amplitude: 3.0,
          width: 2.0,
          mass: 15.0,
          isStable: true,
        },
      ],
      totalInputStrength: 5.0,
    },
    performance: {
      stepTimeMs: 0.5,
      convolutionTimeMs: 0.3,
      currentHz: 5,
      totalTimesteps: 100,
    },
    ...overrides,
  };
}

function createTestMetrics(): DNFIntegrationMetrics {
  return {
    isActive: true,
    snnConnected: true,
    projectedObjectCount: 5,
    dnfHz: 5,
    snnHz: 10,
    avgStepTimeMs: 0.5,
    peakStepTimeMs: 1.2,
    totalTimesteps: 100,
    stablePeakCount: 1,
    globalSaliency: 0.2,
  };
}

// =============================================================================
// INITIALIZATION TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Initialization', () => {
  it('should create with default options', () => {
    const builder = createDNFVisualizationDataBuilder();
    expect(builder).toBeDefined();
  });

  it('should create with custom color map', () => {
    const builder = createDNFVisualizationDataBuilder({
      colorMap: {
        hotColor: [255, 0, 0, 255],
      },
    });
    expect(builder).toBeDefined();
  });

  it('should create with custom time series length', () => {
    const builder = createDNFVisualizationDataBuilder({
      maxTimeSeriesLength: 100,
    });
    expect(builder).toBeDefined();
  });
});

// =============================================================================
// DEFAULT COLOR MAP TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Color Map', () => {
  it('DEFAULT_DNF_COLOR_MAP should have valid RGBA values', () => {
    for (const key of ['coldColor', 'neutralColor', 'hotColor', 'peakColor', 'inputColor'] as const) {
      const color = DEFAULT_DNF_COLOR_MAP[key];
      expect(color).toHaveLength(4);
      for (const component of color) {
        expect(component).toBeGreaterThanOrEqual(0);
        expect(component).toBeLessThanOrEqual(255);
      }
    }
  });

  it('should allow color map updates', () => {
    const builder = createDNFVisualizationDataBuilder();
    expect(() => builder.setColorMap({ hotColor: [0, 255, 0, 255] })).not.toThrow();
  });
});

// =============================================================================
// DASHBOARD DATA GENERATION TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - buildDashboardData', () => {
  it('should produce valid dashboard data from a snapshot', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot();

    const data = builder.buildDashboardData(snapshot);

    expect(data.snapshot).toBe(snapshot);
    expect(data.activationPixels).toBeDefined();
    expect(data.outputPixels).toBeDefined();
    expect(data.inputPixels).toBeDefined();
    expect(data.timeSeries).toBeDefined();
    expect(data.metrics).toBeNull();
    expect(typeof data.ariaDescription).toBe('string');
    expect(typeof data.summaryText).toBe('string');
  });

  it('should include integration metrics when provided', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot();
    const metrics = createTestMetrics();

    const data = builder.buildDashboardData(snapshot, metrics);

    expect(data.metrics).toBe(metrics);
  });

  it('should generate RGBA pixels for activation heatmap', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot(4, 4);

    const data = builder.buildDashboardData(snapshot);

    // 4x4 field = 16 pixels * 4 channels = 64 bytes
    expect(data.activationPixels.length).toBe(4 * 4 * 4);
    expect(data.activationPixels).toBeInstanceOf(Uint8ClampedArray);
  });

  it('should generate RGBA pixels for output heatmap', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot(4, 4);

    const data = builder.buildDashboardData(snapshot);

    expect(data.outputPixels.length).toBe(4 * 4 * 4);
  });

  it('should generate RGBA pixels for input overlay', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot(4, 4);

    const data = builder.buildDashboardData(snapshot);

    expect(data.inputPixels.length).toBe(4 * 4 * 4);
  });

  it('activation heatmap should use diverging color map', () => {
    const builder = createDNFVisualizationDataBuilder();

    // Create snapshot with known activation values
    const snapshot = createTestSnapshot(2, 1);
    snapshot.activationHeatmap[0] = -1; // Cold
    snapshot.activationHeatmap[1] = 1;  // Hot

    const data = builder.buildDashboardData(snapshot);

    // Pixel 0 (cold): should be blue-ish
    const coldR = data.activationPixels[0];
    const coldB = data.activationPixels[2];

    // Pixel 1 (hot): should be red-ish
    const hotR = data.activationPixels[4];
    const hotB = data.activationPixels[6];

    // Hot should have more red than cold
    expect(hotR).toBeGreaterThan(coldR);
    // Cold should have more blue than hot
    expect(coldB).toBeGreaterThan(hotB);
  });

  it('output heatmap should go from neutral to hot', () => {
    const builder = createDNFVisualizationDataBuilder();

    const snapshot = createTestSnapshot(2, 1);
    snapshot.outputHeatmap[0] = 0; // Neutral
    snapshot.outputHeatmap[1] = 1; // Hot

    const data = builder.buildDashboardData(snapshot);

    // Hot pixel should be brighter
    const neutralR = data.outputPixels[0];
    const hotR = data.outputPixels[4];
    expect(hotR).toBeGreaterThan(neutralR);
  });

  it('input overlay should use alpha for intensity', () => {
    const builder = createDNFVisualizationDataBuilder();

    const snapshot = createTestSnapshot(2, 1);
    snapshot.inputOverlay[0] = 0;   // No input
    snapshot.inputOverlay[1] = 0.5; // Some input

    const data = builder.buildDashboardData(snapshot);

    // Input with value should have higher alpha
    const noInputA = data.inputPixels[3];
    const inputA = data.inputPixels[7];
    expect(inputA).toBeGreaterThan(noInputA);
  });
});

// =============================================================================
// PEAK MARKER TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Peak Markers', () => {
  it('should mark peaks on the activation heatmap', () => {
    const builder = createDNFVisualizationDataBuilder();

    const snapshot = createTestSnapshot(16, 16);
    snapshot.peaks = [
      {
        position: [8, 8] as [number, number],
        normalizedPosition: [0.5, 0.5] as [number, number],
        amplitude: 3.0,
        width: 2.0,
        mass: 15.0,
        isStable: false,
      },
    ];

    const data = builder.buildDashboardData(snapshot);

    // Check that the peak center pixel has the peak color
    const peakIdx = (8 * 16 + 8) * 4;
    const [pr, pg, pb] = DEFAULT_DNF_COLOR_MAP.peakColor;

    expect(data.activationPixels[peakIdx + 0]).toBe(pr);
    expect(data.activationPixels[peakIdx + 1]).toBe(pg);
    expect(data.activationPixels[peakIdx + 2]).toBe(pb);
  });

  it('should draw larger markers for stable peaks', () => {
    const builder = createDNFVisualizationDataBuilder();

    const snapshot = createTestSnapshot(16, 16);
    snapshot.peaks = [
      {
        position: [8, 8] as [number, number],
        normalizedPosition: [0.5, 0.5] as [number, number],
        amplitude: 3.0,
        width: 2.0,
        mass: 15.0,
        isStable: true,
      },
    ];

    const data = builder.buildDashboardData(snapshot);

    // Stable peaks should mark additional pixels (e.g., at offset 3)
    const [pr, pg, pb] = DEFAULT_DNF_COLOR_MAP.peakColor;
    const offset3Idx = (8 * 16 + 11) * 4; // (8+3, 8)
    expect(data.activationPixels[offset3Idx + 0]).toBe(pr);
  });
});

// =============================================================================
// TIME SERIES TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Time Series', () => {
  it('should accumulate time series samples', () => {
    const builder = createDNFVisualizationDataBuilder();

    for (let i = 0; i < 5; i++) {
      const snapshot = createTestSnapshot();
      snapshot.snapshotId = i;
      builder.buildDashboardData(snapshot);
    }

    const ts = builder.getTimeSeries();
    expect(ts).toHaveLength(5);
  });

  it('time series samples should have all required fields', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot();

    builder.buildDashboardData(snapshot);
    const ts = builder.getTimeSeries();

    expect(ts).toHaveLength(1);
    const sample = ts[0];

    expect(typeof sample.timestamp).toBe('number');
    expect(typeof sample.meanActivation).toBe('number');
    expect(typeof sample.maxActivation).toBe('number');
    expect(typeof sample.meanOutput).toBe('number');
    expect(typeof sample.peakCount).toBe('number');
    expect(typeof sample.stablePeakCount).toBe('number');
    expect(typeof sample.activeFraction).toBe('number');
    expect(typeof sample.stepTimeMs).toBe('number');
    expect(typeof sample.inputStrength).toBe('number');
  });

  it('should respect maxTimeSeriesLength', () => {
    const builder = createDNFVisualizationDataBuilder({
      maxTimeSeriesLength: 5,
    });

    for (let i = 0; i < 10; i++) {
      builder.buildDashboardData(createTestSnapshot());
    }

    const ts = builder.getTimeSeries();
    expect(ts).toHaveLength(5);
  });

  it('should clear time series', () => {
    const builder = createDNFVisualizationDataBuilder();

    builder.buildDashboardData(createTestSnapshot());
    expect(builder.getTimeSeries()).toHaveLength(1);

    builder.clearTimeSeries();
    expect(builder.getTimeSeries()).toHaveLength(0);
  });

  it('should include time series in dashboard data', () => {
    const builder = createDNFVisualizationDataBuilder();

    for (let i = 0; i < 3; i++) {
      builder.buildDashboardData(createTestSnapshot());
    }

    const data = builder.buildDashboardData(createTestSnapshot());
    expect(data.timeSeries).toHaveLength(4);
  });
});

// =============================================================================
// KERNEL VISUALIZATION TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Kernel Rendering', () => {
  it('should render kernel as RGBA pixels', () => {
    const builder = createDNFVisualizationDataBuilder();

    // Create a simple 3x3 kernel
    const kernel = new Float32Array([
      -1, -1, -1,
      -1, 8, -1,
      -1, -1, -1,
    ]);

    const pixels = builder.renderKernel(kernel, 3, 3);

    // 3x3 * 4 channels = 36 bytes
    expect(pixels.length).toBe(36);
    expect(pixels).toBeInstanceOf(Uint8ClampedArray);

    // Center pixel should be hot (positive value)
    const centerR = pixels[4 * 4 + 0]; // Pixel index 4 (center of 3x3)
    // Corner pixel should be cold (negative value)
    const cornerR = pixels[0 * 4 + 0]; // Pixel index 0

    // Center (positive) should be hotter than corner (negative)
    expect(centerR).toBeGreaterThan(cornerR);
  });

  it('should handle all-zero kernel', () => {
    const builder = createDNFVisualizationDataBuilder();
    const kernel = new Float32Array(9).fill(0);

    // Should not throw
    const pixels = builder.renderKernel(kernel, 3, 3);
    expect(pixels.length).toBe(36);
  });
});

// =============================================================================
// TEXT GENERATION TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Text Generation', () => {
  it('ARIA description should include field info', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot(16, 16);
    snapshot.label = 'spatial-attention';

    const data = builder.buildDashboardData(snapshot);

    expect(data.ariaDescription).toContain('Dynamic Neural Field');
    expect(data.ariaDescription).toContain('spatial-attention');
    expect(data.ariaDescription).toContain('16 by 16');
    expect(data.ariaDescription).toContain('peak');
  });

  it('ARIA description should include metrics when available', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot();
    const metrics = createTestMetrics();

    const data = builder.buildDashboardData(snapshot, metrics);

    expect(data.ariaDescription).toContain('5 Hz');
    expect(data.ariaDescription).toContain('connected');
  });

  it('summary text should be concise', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot();

    const data = builder.buildDashboardData(snapshot);

    expect(data.summaryText).toContain('DNF');
    expect(data.summaryText).toContain('Peaks');
    expect(data.summaryText).toContain('Active');
    expect(data.summaryText.length).toBeLessThan(200);
  });

  it('summary text should include Hz when metrics provided', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = createTestSnapshot();
    const metrics = createTestMetrics();

    const data = builder.buildDashboardData(snapshot, metrics);

    expect(data.summaryText).toContain('5Hz');
  });
});

// =============================================================================
// LAST SNAPSHOT TESTS
// =============================================================================

describe('DNFVisualizationDataBuilder - Last Snapshot', () => {
  it('should return empty snapshot initially', () => {
    const builder = createDNFVisualizationDataBuilder();
    const snapshot = builder.getLastSnapshot();
    expect(snapshot.snapshotId).toBe(0);
  });

  it('should return last processed snapshot', () => {
    const builder = createDNFVisualizationDataBuilder();

    const snapshot1 = createTestSnapshot();
    snapshot1.snapshotId = 42;
    builder.buildDashboardData(snapshot1);

    const snapshot2 = createTestSnapshot();
    snapshot2.snapshotId = 43;
    builder.buildDashboardData(snapshot2);

    expect(builder.getLastSnapshot().snapshotId).toBe(43);
  });
});
