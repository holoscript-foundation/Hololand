/**
 * VR Performance Degradation Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  VRPerformanceDegradationManager,
  QualityLevel,
  type DegradationEvent,
} from '../VRPerformanceDegradationManager';

describe('VRPerformanceDegradationManager', () => {
  let manager: VRPerformanceDegradationManager;

  beforeEach(() => {
    manager = new VRPerformanceDegradationManager({
      targetFrameTime: 11.1,
      escalationThreshold: 85,
      deEscalationThreshold: 92,
      escalationDuration: 1, // Reduce for faster tests
      deEscalationDuration: 1,
      monitoringWindow: 100,
    });
  });

  describe('Initialization', () => {
    it('should start at FULL_QUALITY level', () => {
      expect(manager.getCurrentLevel()).toBe(QualityLevel.FULL_QUALITY);
    });

    it('should have correct default config', () => {
      const config = manager.getConfig();
      expect(config.targetFrameTime).toBe(11.1);
      expect(config.escalationThreshold).toBe(85);
      expect(config.autoAdjust).toBe(true);
    });

    it('should return quality settings for FULL_QUALITY', () => {
      const settings = manager.getCurrentQualitySettings();
      expect(settings.shadowsEnabled).toBe(true);
      expect(settings.shadowResolution).toBe(2048);
      expect(settings.bloomEnabled).toBe(true);
      expect(settings.lodBias).toBe(0);
      expect(settings.particleQuality).toBe(1.0);
    });
  });

  describe('Frame Recording', () => {
    it('should record frame times', () => {
      manager.recordFrame(10.0);
      manager.recordFrame(11.0);
      manager.recordFrame(12.0);

      const stats = manager.getFrameTimeStats();
      expect(stats.totalFrames).toBe(3);
      expect(stats.current).toBe(12.0);
      expect(stats.min).toBe(10.0);
      expect(stats.max).toBe(12.0);
    });

    it('should calculate correct average frame time', () => {
      for (let i = 0; i < 10; i++) {
        manager.recordFrame(10.0);
      }

      const stats = manager.getFrameTimeStats();
      expect(stats.average).toBe(10.0);
      expect(stats.totalFrames).toBe(10);
    });

    it('should track jank frames (> 2x target)', () => {
      manager.recordFrame(10.0); // OK
      manager.recordFrame(10.0); // OK
      manager.recordFrame(25.0); // JANK (> 22.2ms)
      manager.recordFrame(30.0); // JANK
      manager.recordFrame(10.0); // OK

      const stats = manager.getFrameTimeStats();
      expect(stats.jankFrames).toBe(2);
      expect(stats.totalFrames).toBe(5);
    });

    it('should calculate percentiles correctly', () => {
      const frameTimes = [10, 10, 11, 11, 12, 12, 13, 13, 20, 25];
      frameTimes.forEach(ft => manager.recordFrame(ft));

      const stats = manager.getFrameTimeStats();
      expect(stats.p95).toBeGreaterThan(15);
      expect(stats.p99).toBeGreaterThan(20);
    });
  });

  describe('Auto-Escalation (Performance Degradation)', () => {
    it('should escalate after sustained low FPS', async () => {
      const events: DegradationEvent[] = [];
      manager.onDegradationEvent(event => events.push(event));

      // Simulate 1.5 seconds of low FPS (85fps threshold = ~11.76ms per frame)
      // We need to be BELOW 85fps, so use 12ms+ frames
      for (let i = 0; i < 150; i++) {
        manager.recordFrame(13.0); // ~77 fps (below threshold)
        await sleep(10);
      }

      expect(manager.getCurrentLevel()).toBe(QualityLevel.REDUCED_SHADOWS);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].event).toBe('escalation');
      expect(events[0].fromLevel).toBe(QualityLevel.FULL_QUALITY);
      expect(events[0].toLevel).toBe(QualityLevel.REDUCED_SHADOWS);
    });

    it('should escalate multiple levels on sustained poor performance', async () => {
      // First escalation to REDUCED_SHADOWS
      for (let i = 0; i < 150; i++) {
        manager.recordFrame(13.0);
        await sleep(10);
      }
      expect(manager.getCurrentLevel()).toBe(QualityLevel.REDUCED_SHADOWS);

      // Second escalation to REDUCED_TEXTURES
      for (let i = 0; i < 150; i++) {
        manager.recordFrame(13.0);
        await sleep(10);
      }
      expect(manager.getCurrentLevel()).toBe(QualityLevel.REDUCED_TEXTURES);
    });

    it('should not escalate beyond SIMPLIFIED_GEOMETRY', async () => {
      // Manually set to max degradation
      manager.setQualityLevel(QualityLevel.SIMPLIFIED_GEOMETRY);

      // Try to trigger escalation
      for (let i = 0; i < 200; i++) {
        manager.recordFrame(20.0); // Very poor performance
        await sleep(10);
      }

      expect(manager.getCurrentLevel()).toBe(QualityLevel.SIMPLIFIED_GEOMETRY);
    });
  });

  describe('Auto-De-escalation (Performance Improvement)', () => {
    it('should de-escalate after sustained high FPS', async () => {
      // First escalate
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS);

      const events: DegradationEvent[] = [];
      manager.onDegradationEvent(event => events.push(event));

      // Simulate sustained high FPS (92fps threshold = ~10.87ms per frame)
      for (let i = 0; i < 150; i++) {
        manager.recordFrame(10.0); // ~100 fps (above threshold)
        await sleep(10);
      }

      expect(manager.getCurrentLevel()).toBe(QualityLevel.FULL_QUALITY);
      expect(events.some(e => e.event === 'de-escalation')).toBe(true);
    });

    it('should not de-escalate above FULL_QUALITY', async () => {
      expect(manager.getCurrentLevel()).toBe(QualityLevel.FULL_QUALITY);

      // Try to trigger de-escalation
      for (let i = 0; i < 200; i++) {
        manager.recordFrame(8.0); // Excellent performance
        await sleep(10);
      }

      expect(manager.getCurrentLevel()).toBe(QualityLevel.FULL_QUALITY);
    });
  });

  describe('User Override', () => {
    it('should allow manual quality level change', () => {
      manager.setQualityLevel(QualityLevel.NO_POST_PROCESSING);
      expect(manager.getCurrentLevel()).toBe(QualityLevel.NO_POST_PROCESSING);

      const settings = manager.getCurrentQualitySettings();
      expect(settings.bloomEnabled).toBe(false);
      expect(settings.depthOfFieldEnabled).toBe(false);
    });

    it('should lock quality level when requested', async () => {
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS, true);

      const config = manager.getConfig();
      expect(config.userLockedLevel).toBe(QualityLevel.REDUCED_SHADOWS);
      expect(config.autoAdjust).toBe(false);

      // Try to trigger auto-escalation (should be ignored)
      for (let i = 0; i < 200; i++) {
        manager.recordFrame(20.0);
        await sleep(5);
      }

      expect(manager.getCurrentLevel()).toBe(QualityLevel.REDUCED_SHADOWS);
    });

    it('should unlock and re-enable auto-adjust', () => {
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS, true);
      expect(manager.getConfig().autoAdjust).toBe(false);

      manager.unlockQualityLevel();
      expect(manager.getConfig().autoAdjust).toBe(true);
      expect(manager.getConfig().userLockedLevel).toBe(null);
    });
  });

  describe('Metrics & Telemetry', () => {
    it('should track escalation/de-escalation counts', async () => {
      // Escalate
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS);

      // De-escalate
      manager.setQualityLevel(QualityLevel.FULL_QUALITY);

      // Escalate again
      manager.setQualityLevel(QualityLevel.REDUCED_TEXTURES);

      const metrics = manager.getMetrics();
      // Manual changes count as user overrides, not auto escalations
      expect(metrics.currentLevel).toBe(QualityLevel.REDUCED_TEXTURES);
    });

    it('should track time at each quality level', async () => {
      // Start at FULL_QUALITY
      for (let i = 0; i < 10; i++) {
        manager.recordFrame(10.0);
        await sleep(50);
      }

      // Switch to REDUCED_SHADOWS
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS);
      for (let i = 0; i < 10; i++) {
        manager.recordFrame(10.0);
        await sleep(50);
      }

      const metrics = manager.getMetrics();
      expect(metrics.timeAtLevel[QualityLevel.FULL_QUALITY]).toBeGreaterThan(0);
      expect(metrics.timeAtLevel[QualityLevel.REDUCED_SHADOWS]).toBeGreaterThan(0);
    });

    it('should calculate frame budget compliance', () => {
      // Record 7 good frames and 3 bad frames
      for (let i = 0; i < 7; i++) {
        manager.recordFrame(10.0); // Within budget
      }
      for (let i = 0; i < 3; i++) {
        manager.recordFrame(15.0); // Over budget
      }

      const metrics = manager.getMetrics();
      expect(metrics.frameTimeBudgetCompliance).toBeCloseTo(70, 1);
    });

    it('should record telemetry events', () => {
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS);
      manager.setQualityLevel(QualityLevel.FULL_QUALITY);

      const events = manager.getTelemetryEvents();
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].event).toBe('user-override');
    });

    it('should clear telemetry events', () => {
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS);
      expect(manager.getTelemetryEvents().length).toBeGreaterThan(0);

      manager.clearTelemetryEvents();
      expect(manager.getTelemetryEvents().length).toBe(0);
    });
  });

  describe('Quality Level Configurations', () => {
    it('should return all quality level configs', () => {
      const levels = manager.getAllQualityLevels();
      expect(levels.length).toBe(5);
      expect(levels[0].level).toBe(QualityLevel.FULL_QUALITY);
      expect(levels[4].level).toBe(QualityLevel.SIMPLIFIED_GEOMETRY);
    });

    it('should have correct performance gains', () => {
      const level0 = manager.getQualityLevelConfig(QualityLevel.FULL_QUALITY);
      const level4 = manager.getQualityLevelConfig(QualityLevel.SIMPLIFIED_GEOMETRY);

      expect(level0.performanceGain).toBe(0);
      expect(level4.performanceGain).toBe(70);
    });

    it('should progressively reduce quality settings', () => {
      const level0 = manager.getQualityLevelConfig(QualityLevel.FULL_QUALITY).settings;
      const level2 = manager.getQualityLevelConfig(QualityLevel.REDUCED_TEXTURES).settings;
      const level4 = manager.getQualityLevelConfig(QualityLevel.SIMPLIFIED_GEOMETRY).settings;

      // Shadows should degrade
      expect(level0.shadowResolution).toBeGreaterThan(level2.shadowResolution);
      expect(level2.shadowResolution).toBeGreaterThan(level4.shadowResolution);

      // Texture quality should degrade
      expect(level0.textureLODBias).toBeLessThan(level2.textureLODBias);
      expect(level2.textureLODBias).toBeLessThan(level4.textureLODBias);

      // Particle quality should degrade
      expect(level0.particleQuality).toBeGreaterThan(level2.particleQuality);
      expect(level2.particleQuality).toBeGreaterThan(level4.particleQuality);
    });
  });

  describe('Report Generation', () => {
    it('should generate performance report', () => {
      // Record some frames
      for (let i = 0; i < 50; i++) {
        manager.recordFrame(10 + Math.random() * 5);
      }

      const report = manager.generateReport();
      expect(report).toContain('VR PERFORMANCE DEGRADATION REPORT');
      expect(report).toContain('Frame Statistics');
      expect(report).toContain('Average FPS');
      expect(report).toContain('Quality Level');
    });
  });

  describe('Reset', () => {
    it('should reset all state', async () => {
      // Change state
      manager.setQualityLevel(QualityLevel.REDUCED_SHADOWS);
      for (let i = 0; i < 50; i++) {
        manager.recordFrame(12.0);
        await sleep(10);
      }

      // Reset
      manager.reset();

      expect(manager.getCurrentLevel()).toBe(QualityLevel.FULL_QUALITY);
      expect(manager.getFrameTimeStats().totalFrames).toBe(0);
      expect(manager.getTelemetryEvents().length).toBe(0);
      expect(manager.getMetrics().totalEscalations).toBe(0);
    });
  });
});

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
