import { describe, it, expect, beforeEach } from 'vitest';
import { PowerMonitor, DEFAULT_POWER_MONITOR_CONFIG } from '../PowerMonitor';
import type { PowerMetrics, ClassificationResult, AkidaDeviceInfo, SemanticClass } from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createPowerMetrics(overrides: Partial<PowerMetrics> = {}): PowerMetrics {
  return {
    timestamp: Date.now(),
    powerMw: 250,
    npuPowerMw: 200,
    ioPowerMw: 50,
    temperatureC: 45,
    inferenceLatencyMs: 8,
    framesPerSecond: 30,
    totalFramesProcessed: 100,
    utilizationPercent: 75,
    availableSramBytes: 4 * 1024 * 1024,
    modelLoaded: true,
    ...overrides,
  };
}

function createClassificationResult(overrides: Partial<ClassificationResult> = {}): ClassificationResult {
  return {
    frameId: 1,
    timestamp: Date.now(),
    pointClassifications: [],
    segments: [],
    akidaLatencyMs: 5,
    totalLatencyMs: 10,
    source: 'akida',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('PowerMonitor', () => {
  let monitor: PowerMonitor;

  beforeEach(() => {
    monitor = new PowerMonitor();
  });

  describe('constructor', () => {
    it('creates with default config', () => {
      const snapshot = monitor.getSnapshot();
      expect(snapshot.connectionState).toBe('disconnected');
      expect(snapshot.activeBackend).toBe('none');
      expect(snapshot.totalFrames).toBe(0);
    });

    it('accepts custom config', () => {
      const m = new PowerMonitor({ maxHistorySamples: 100, rollingWindowSize: 10 });
      expect(m.getSnapshot().totalFrames).toBe(0);
    });
  });

  describe('recordPowerMetrics', () => {
    it('updates latest power metrics', () => {
      const metrics = createPowerMetrics({ powerMw: 275 });
      monitor.recordPowerMetrics(metrics);

      const snapshot = monitor.getSnapshot();
      expect(snapshot.latestPowerMetrics).toBeDefined();
      expect(snapshot.latestPowerMetrics!.powerMw).toBe(275);
    });

    it('updates rolling average power', () => {
      monitor.recordPowerMetrics(createPowerMetrics({ powerMw: 200 }));
      monitor.recordPowerMetrics(createPowerMetrics({ powerMw: 300 }));

      const snapshot = monitor.getSnapshot();
      expect(snapshot.avgPowerMw).toBeCloseTo(250, 0);
    });

    it('updates rolling average FPS', () => {
      monitor.recordPowerMetrics(createPowerMetrics({ framesPerSecond: 20 }));
      monitor.recordPowerMetrics(createPowerMetrics({ framesPerSecond: 40 }));

      const snapshot = monitor.getSnapshot();
      expect(snapshot.avgFps).toBeCloseTo(30, 0);
    });

    it('adds to power history', () => {
      monitor.recordPowerMetrics(createPowerMetrics());
      monitor.recordPowerMetrics(createPowerMetrics());
      monitor.recordPowerMetrics(createPowerMetrics());

      const snapshot = monitor.getSnapshot();
      expect(snapshot.powerHistory).toHaveLength(3);
    });

    it('adds to FPS history', () => {
      monitor.recordPowerMetrics(createPowerMetrics());

      const snapshot = monitor.getSnapshot();
      expect(snapshot.fpsHistory).toHaveLength(1);
    });
  });

  describe('recordClassification', () => {
    it('updates total frames counter', () => {
      monitor.recordClassification(createClassificationResult());
      monitor.recordClassification(createClassificationResult());

      expect(monitor.getSnapshot().totalFrames).toBe(2);
    });

    it('updates rolling average latency', () => {
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 10 }));
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 20 }));

      expect(monitor.getSnapshot().avgEndToEndLatencyMs).toBeCloseTo(15, 0);
    });

    it('adds to latency history', () => {
      monitor.recordClassification(createClassificationResult());
      monitor.recordClassification(createClassificationResult());

      expect(monitor.getSnapshot().latencyHistory).toHaveLength(2);
    });
  });

  describe('state management', () => {
    it('sets connection state', () => {
      monitor.setConnectionState('streaming');
      expect(monitor.getSnapshot().connectionState).toBe('streaming');
    });

    it('sets active backend', () => {
      monitor.setActiveBackend('akida');
      expect(monitor.getSnapshot().activeBackend).toBe('akida');
    });

    it('sets device info', () => {
      const info: AkidaDeviceInfo = {
        model: 'AKD1500',
        firmwareVersion: '1.0.0',
        numNPEs: 80,
        totalSramBytes: 4 * 1024 * 1024,
        supportedModels: ['pointnet2_ssg'],
        maxPointsPerInference: 65536,
        serialNumber: 'AK-001',
      };
      monitor.setDeviceInfo(info);

      expect(monitor.getSnapshot().deviceInfo).toBeDefined();
      expect(monitor.getSnapshot().deviceInfo!.model).toBe('AKD1500');
    });

    it('sets entity counts', () => {
      monitor.setEntityCounts(5, {
        [1 as SemanticClass]: 2,
        [4 as SemanticClass]: 3,
      });

      const snapshot = monitor.getSnapshot();
      expect(snapshot.trackedEntityCount).toBe(5);
      expect(snapshot.entityCountsByClass[1 as SemanticClass]).toBe(2);
      expect(snapshot.entityCountsByClass[4 as SemanticClass]).toBe(3);
    });
  });

  describe('alerts and thresholds', () => {
    it('detects power budget exceeded', () => {
      // Within budget
      monitor.recordPowerMetrics(createPowerMetrics({ powerMw: 250 }));
      expect(monitor.isPowerBudgetExceeded()).toBe(false);

      // Clear and exceed budget
      monitor.reset();
      monitor.recordPowerMetrics(createPowerMetrics({ powerMw: 350 }));
      expect(monitor.isPowerBudgetExceeded()).toBe(true);
    });

    it('detects high latency', () => {
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 10 }));
      expect(monitor.isLatencyHigh(33)).toBe(false);

      monitor.reset();
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 50 }));
      expect(monitor.isLatencyHigh(33)).toBe(true);
    });

    it('detects low FPS', () => {
      monitor.recordPowerMetrics(createPowerMetrics({ framesPerSecond: 30 }));
      expect(monitor.isFpsLow(15)).toBe(false);

      monitor.reset();
      monitor.recordPowerMetrics(createPowerMetrics({ framesPerSecond: 10 }));
      expect(monitor.isFpsLow(15)).toBe(true);
    });

    it('returns zero FPS as not low (no data)', () => {
      expect(monitor.isFpsLow(15)).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('returns healthy when all good', () => {
      monitor.setConnectionState('streaming');
      monitor.recordPowerMetrics(createPowerMetrics({ powerMw: 200, framesPerSecond: 30 }));
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 10 }));

      const health = monitor.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
    });

    it('returns degraded with one issue', () => {
      monitor.setConnectionState('streaming');
      monitor.recordPowerMetrics(createPowerMetrics({ powerMw: 350 })); // Over budget
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 10 }));

      const health = monitor.getHealthStatus();
      expect(health.status).toBe('degraded');
      expect(health.issues.length).toBeGreaterThan(0);
    });

    it('returns critical with multiple issues', () => {
      monitor.setConnectionState('error');
      monitor.recordPowerMetrics(createPowerMetrics({
        powerMw: 500,
        framesPerSecond: 5,
        temperatureC: 90,
      }));
      monitor.recordClassification(createClassificationResult({ totalLatencyMs: 100 }));

      const health = monitor.getHealthStatus();
      expect(health.status).toBe('critical');
      expect(health.issues.length).toBeGreaterThan(2);
    });

    it('flags disconnected state', () => {
      monitor.setConnectionState('disconnected');
      const health = monitor.getHealthStatus();
      expect(health.issues.some(i => i.includes('disconnected'))).toBe(true);
    });

    it('flags high temperature', () => {
      monitor.setConnectionState('streaming');
      monitor.recordPowerMetrics(createPowerMetrics({ temperatureC: 85 }));

      const health = monitor.getHealthStatus();
      expect(health.issues.some(i => i.includes('temperature'))).toBe(true);
    });
  });

  describe('snapshot', () => {
    it('reports uptime', () => {
      const snapshot = monitor.getSnapshot();
      expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('returns copies of history arrays (immutable)', () => {
      monitor.recordPowerMetrics(createPowerMetrics());

      const snap1 = monitor.getSnapshot();
      const snap2 = monitor.getSnapshot();

      expect(snap1.powerHistory).not.toBe(snap2.powerHistory);
      expect(snap1.latencyHistory).not.toBe(snap2.latencyHistory);
      expect(snap1.fpsHistory).not.toBe(snap2.fpsHistory);
    });

    it('returns copy of entity counts', () => {
      monitor.setEntityCounts(3, { [1 as SemanticClass]: 3 });
      const snap = monitor.getSnapshot();

      // Mutating the snapshot should not affect monitor
      snap.entityCountsByClass[1 as SemanticClass] = 999;
      expect(monitor.getSnapshot().entityCountsByClass[1 as SemanticClass]).toBe(3);
    });
  });

  describe('history trimming', () => {
    it('trims history to maxHistorySamples', () => {
      const m = new PowerMonitor({ maxHistorySamples: 5 });

      for (let i = 0; i < 10; i++) {
        m.recordPowerMetrics(createPowerMetrics());
      }

      const snapshot = m.getSnapshot();
      expect(snapshot.powerHistory.length).toBeLessThanOrEqual(5);
      expect(snapshot.fpsHistory.length).toBeLessThanOrEqual(5);
    });

    it('trims latency history', () => {
      const m = new PowerMonitor({ maxHistorySamples: 3 });

      for (let i = 0; i < 10; i++) {
        m.recordClassification(createClassificationResult());
      }

      expect(m.getSnapshot().latencyHistory.length).toBeLessThanOrEqual(3);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      monitor.recordPowerMetrics(createPowerMetrics());
      monitor.recordClassification(createClassificationResult());
      monitor.setConnectionState('streaming');

      monitor.reset();

      const snapshot = monitor.getSnapshot();
      expect(snapshot.totalFrames).toBe(0);
      expect(snapshot.avgPowerMw).toBe(0);
      expect(snapshot.avgFps).toBe(0);
      expect(snapshot.avgEndToEndLatencyMs).toBe(0);
      expect(snapshot.latencyHistory).toHaveLength(0);
      expect(snapshot.powerHistory).toHaveLength(0);
      expect(snapshot.fpsHistory).toHaveLength(0);
    });
  });
});
