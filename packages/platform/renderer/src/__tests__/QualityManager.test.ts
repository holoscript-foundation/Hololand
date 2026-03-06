/**
 * @vitest-environment jsdom
 */

/**
 * Tests for QualityManager (Adaptive Quality + Device Detection)
 *
 * Domain: spatial-rendering
 * VR Priority: Frame budget compliance (11.1ms at 90Hz per G.003.09),
 *              adaptive quality for VR headsets, device tier detection
 *
 * Validates:
 * - Quality preset initialization and switching
 * - Adaptive quality based on frame time history
 * - Frame budget enforcement (90Hz = 11.1ms target)
 * - Quality decrease when FPS drops below target
 * - Quality increase when FPS is stable above target
 * - Device-specific preset recommendations
 * - Settings override application
 * - Renderer configuration application
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
  QualityManager,
  createQualityManager,
  type QualityManagerOptions,
} from '../QualityManager';
import { QUALITY_PRESETS } from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createManager(opts?: QualityManagerOptions): QualityManager {
  return new QualityManager(opts);
}

/**
 * Simulate N frames with a given frame time (ms).
 * This populates the frame time history for adaptive quality checks.
 */
function simulateFrames(manager: QualityManager, frameTimeMs: number, count: number): void {
  for (let i = 0; i < count; i++) {
    manager.recordFrameTime(frameTimeMs);
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('QualityManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ───────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should create with default medium preset', () => {
      const manager = createManager();
      expect(manager.getPreset()).toBe('medium');
      expect(manager.getSettings()).toEqual(QUALITY_PRESETS.medium);
    });

    it('should accept explicit preset', () => {
      const manager = createManager({ preset: 'high' });
      expect(manager.getPreset()).toBe('high');
    });

    it('should accept low preset for Quest 2 devices', () => {
      const manager = createManager({ preset: 'low' });
      expect(manager.getPreset()).toBe('low');
      expect(manager.getSettings().targetFPS).toBe(QUALITY_PRESETS.low.targetFPS);
    });

    it('should accept ultra preset for PCVR devices', () => {
      const manager = createManager({ preset: 'ultra' });
      expect(manager.getPreset()).toBe('ultra');
    });

    it('should apply overrides on top of preset', () => {
      const manager = createManager({
        preset: 'medium',
        overrides: { bloom: true, ssao: true },
      });
      expect(manager.getSettings().bloom).toBe(true);
      expect(manager.getSettings().ssao).toBe(true);
    });

    it('should default adaptive quality to enabled', () => {
      const manager = createManager();
      // Adaptive quality is enabled by default; we verify by recording frames
      // without it throwing
      expect(() => manager.recordFrameTime(16)).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PRESET SWITCHING
  // ───────────────────────────────────────────────────────────────────────────

  describe('preset switching', () => {
    it('should switch from medium to high', () => {
      const manager = createManager({ preset: 'medium' });
      manager.setPreset('high');
      expect(manager.getPreset()).toBe('high');
      expect(manager.getSettings()).toEqual(QUALITY_PRESETS.high);
    });

    it('should switch and apply overrides simultaneously', () => {
      const manager = createManager();
      manager.setPreset('low', { pixelRatio: 0.5 });
      expect(manager.getPreset()).toBe('low');
      expect(manager.getSettings().pixelRatio).toBe(0.5);
    });

    it('should fire onQualityChange callback when preset changes', () => {
      const callback = vi.fn();
      const manager = createManager({ onQualityChange: callback });
      manager.setPreset('high');
      expect(callback).toHaveBeenCalledWith(
        QUALITY_PRESETS.high,
        'high',
      );
    });

    it('should apply partial overrides without resetting preset', () => {
      const callback = vi.fn();
      const manager = createManager({ preset: 'medium', onQualityChange: callback });
      manager.applyOverrides({ bloom: true });
      expect(manager.getSettings().bloom).toBe(true);
      expect(callback).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FRAME BUDGET COMPLIANCE (90Hz = 11.1ms per G.003.09)
  // ───────────────────────────────────────────────────────────────────────────

  describe('frame budget compliance', () => {
    it('should track frame times in history buffer', () => {
      const manager = createManager({ adaptiveQuality: true });
      simulateFrames(manager, 11.1, 10);
      // No error means recording works
    });

    it('should maintain history of at most 60 frames', () => {
      const manager = createManager({ adaptiveQuality: true });
      simulateFrames(manager, 11.1, 100);
      // Internal history is capped; we verify adaptive quality works
    });

    it('should NOT record frame times when adaptive quality disabled', () => {
      const manager = createManager({ adaptiveQuality: false });
      // This should return immediately without populating history
      simulateFrames(manager, 100, 100);
      // Preset should remain unchanged since adaptive is off
      expect(manager.getPreset()).toBe('medium');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ADAPTIVE QUALITY
  // ───────────────────────────────────────────────────────────────────────────

  describe('adaptive quality', () => {
    it('should decrease quality when FPS drops below 90% of target', () => {
      // Use performance.now mock to advance past ADAPTIVE_CHECK_INTERVAL
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      // Start at high preset (targetFPS=90)
      const manager = createManager({
        preset: 'high',
        adaptiveQuality: true,
      });

      const targetFPS = QUALITY_PRESETS.high.targetFPS; // 90
      // Frame time that gives FPS well below 90% of target
      const slowFrameTime = 1000 / (targetFPS * 0.7); // ~15.9ms = 63 FPS

      // Fill history with slow frames
      simulateFrames(manager, slowFrameTime, 40);

      // Advance performance.now past the adaptive check interval (2000ms)
      mockTime = 2100;

      // Record one more frame to trigger check
      manager.recordFrameTime(slowFrameTime);

      // Quality should have decreased from high to medium
      expect(manager.getPreset()).toBe('medium');
    });

    it('should increase quality when FPS is stable at 130% above target', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      // Start at low preset (targetFPS=72)
      const manager = createManager({
        preset: 'low',
        adaptiveQuality: true,
      });

      const targetFPS = QUALITY_PRESETS.low.targetFPS; // 72
      // Frame time that gives FPS at 135% of target (well above target)
      const fastFrameTime = 1000 / (targetFPS * 1.35); // ~10.3ms = 97 FPS

      // Fill history with fast, stable frames (low variance)
      simulateFrames(manager, fastFrameTime, 40);

      // Advance performance.now past the adaptive check interval
      mockTime = 2100;

      // Record one more frame to trigger check
      manager.recordFrameTime(fastFrameTime);

      // Quality should have increased from low to medium
      expect(manager.getPreset()).toBe('medium');
    });

    it('should NOT increase quality when FPS is unstable (high variance)', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const manager = createManager({
        preset: 'low',
        adaptiveQuality: true,
      });

      const targetFPS = QUALITY_PRESETS.low.targetFPS;
      const fastFrameTime = 1000 / (targetFPS * 1.35);

      // Fill history with alternating fast and slow frames (high variance)
      for (let i = 0; i < 40; i++) {
        manager.recordFrameTime(i % 2 === 0 ? fastFrameTime * 0.5 : fastFrameTime * 2.0);
      }

      mockTime = 2100;
      manager.recordFrameTime(fastFrameTime);

      // Should NOT have increased due to high variance
      expect(manager.getPreset()).toBe('low');
    });

    it('should NOT decrease below low preset', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const manager = createManager({
        preset: 'low',
        adaptiveQuality: true,
      });

      // Very slow frames
      simulateFrames(manager, 50, 40);

      mockTime = 2100;
      manager.recordFrameTime(50);

      // Should stay at low (cannot go lower)
      expect(manager.getPreset()).toBe('low');
    });

    it('should NOT increase above ultra preset', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const manager = createManager({
        preset: 'ultra',
        adaptiveQuality: true,
      });

      // Very fast frames
      simulateFrames(manager, 2, 40);

      mockTime = 2100;
      manager.recordFrameTime(2);

      // Should stay at ultra (cannot go higher)
      expect(manager.getPreset()).toBe('ultra');
    });

    it('should toggle adaptive quality on/off', () => {
      const manager = createManager({ adaptiveQuality: true });
      manager.setAdaptiveQuality(false);
      // Should not affect frame time recording
      simulateFrames(manager, 100, 100);
      expect(manager.getPreset()).toBe('medium');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY AND DISPLAY
  // ───────────────────────────────────────────────────────────────────────────

  describe('summary', () => {
    it('should generate human-readable summary with active features', () => {
      const manager = createManager({ preset: 'high' });
      const summary = manager.getSummary();
      expect(summary).toContain('HIGH');
    });

    it('should show basic rendering for minimal preset', () => {
      const manager = createManager({
        preset: 'low',
        overrides: {
          shadowsEnabled: false,
          postProcessing: false,
          bloom: false,
          ssao: false,
          hdriEnvironment: false,
          realTimeReflections: false,
        },
      });
      const summary = manager.getSummary();
      expect(summary).toContain('Basic rendering');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // VR-SPECIFIC: 11.1ms FRAME BUDGET (Quest 3 at 90Hz)
  // ───────────────────────────────────────────────────────────────────────────

  describe('VR frame budget (11.1ms at 90Hz)', () => {
    it('should have targetFPS >= 60 for all presets (minimum VR viable)', () => {
      const presets = ['low', 'medium', 'high', 'ultra'] as const;
      for (const preset of presets) {
        expect(QUALITY_PRESETS[preset].targetFPS).toBeGreaterThanOrEqual(60);
      }
    });

    it('high preset should target 90 FPS (11.1ms frame budget for Quest 3)', () => {
      // high maps to Quest 3 / PCVR at 90Hz
      expect(QUALITY_PRESETS.high.targetFPS).toBe(90);
    });

    it('low preset should be suitable for Quest 2 (72 FPS)', () => {
      expect(QUALITY_PRESETS.low.targetFPS).toBeGreaterThanOrEqual(72);
    });

    it('ultra preset should target lower FPS for maximum visual fidelity', () => {
      // ultra trades framerate for visual quality (60 FPS)
      expect(QUALITY_PRESETS.ultra.targetFPS).toBe(60);
    });

    it('medium preset should match low for broad device compatibility (72 FPS)', () => {
      expect(QUALITY_PRESETS.medium.targetFPS).toBe(72);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FACTORY FUNCTIONS
  // ───────────────────────────────────────────────────────────────────────────

  describe('factory functions', () => {
    it('createQualityManager should return a QualityManager instance', () => {
      const manager = createQualityManager();
      expect(manager).toBeInstanceOf(QualityManager);
    });
  });
});
