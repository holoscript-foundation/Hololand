/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AdaptiveFrameRateManager
 *
 * Validates:
 * - Lifecycle management (start, stop, dispose)
 * - Frame loop integration (onFrameStart, onFrameEnd)
 * - AI inference mode switching (90Hz when active, 144Hz when inactive)
 * - Thermal state classification (cool, warm, hot, critical)
 * - Gradual frame rate degradation (144 -> 120 -> 90 -> 72 Hz)
 * - Gradual frame rate upgrade with stability windows
 * - Manual override via setTargetHz
 * - Telemetry metrics for performance dashboard
 * - Memory pressure detection
 * - Change cooldown enforcement
 * - Change history recording
 * - Edge cases (empty windows, invalid tiers, double start/stop)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  AdaptiveFrameRateManager,
  createAdaptiveFrameRateManager,
  FRAME_RATE_TIERS,
} from '../AdaptiveFrameRateManager';

import type {
  FrameRateTier,
} from '../AdaptiveFrameRateManager';

import { logger } from '../logger';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Shared mock time state. performance.now() will always return this value.
 * Helpers advance it as needed.
 */
let mockTime = 1000;

/**
 * Set up the performance.now() mock to always return the current mockTime.
 * Must be called in beforeEach.
 */
function setupTimeMock(): void {
  mockTime = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
}

/**
 * Simulate N frames with a specific average frame time.
 * Advances the shared mockTime between onFrameStart and onFrameEnd.
 */
function simulateStableFrames(
  manager: AdaptiveFrameRateManager,
  frameCount: number,
  frameTimeMs: number,
  startTime?: number,
): number {
  if (startTime !== undefined) {
    mockTime = startTime;
  }

  for (let i = 0; i < frameCount; i++) {
    // onFrameStart records mockTime
    manager.onFrameStart();

    // Advance time by frame duration
    mockTime += frameTimeMs;

    // onFrameEnd records mockTime (which is now frameTimeMs later)
    manager.onFrameEnd();

    // Small gap between frames
    mockTime += 0.5;
  }

  return mockTime;
}

/**
 * Simulate frames with high variance (thermal stress indicator).
 */
function simulateHighVarianceFrames(
  manager: AdaptiveFrameRateManager,
  frameCount: number,
  baseFrameTimeMs: number,
  startTime?: number,
): number {
  if (startTime !== undefined) {
    mockTime = startTime;
  }

  for (let i = 0; i < frameCount; i++) {
    // Alternate between very fast and very slow frames -> high CV
    const isEven = i % 2 === 0;
    const thisFrameTime = isEven
      ? baseFrameTimeMs * 0.5  // Half the base time
      : baseFrameTimeMs * 1.5; // 1.5x the base time

    manager.onFrameStart();
    mockTime += thisFrameTime;
    manager.onFrameEnd();
    mockTime += 0.5;
  }

  return mockTime;
}

// =============================================================================
// TESTS
// =============================================================================

describe('AdaptiveFrameRateManager', () => {
  let manager: AdaptiveFrameRateManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    setupTimeMock();
  });

  afterEach(() => {
    if (manager) {
      manager.dispose();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // CONSTRUCTION AND LIFECYCLE
  // ===========================================================================

  describe('Construction', () => {
    it('should create with default configuration', () => {
      manager = new AdaptiveFrameRateManager();

      expect(manager.getCurrentHz()).toBe(90);
      expect(manager.getTargetHz()).toBe(90);
      expect(manager.getIsRunning()).toBe(false);
      expect(manager.getRenderingMode()).toBe('render_only');
      expect(manager.getThermalState()).toBe('cool');
    });

    it('should create with custom initial frame rate', () => {
      manager = new AdaptiveFrameRateManager({ initialHz: 144 });
      expect(manager.getCurrentHz()).toBe(144);
      expect(manager.getTargetHz()).toBe(144);
    });

    it('should create with custom AI active and render-only rates', () => {
      manager = new AdaptiveFrameRateManager({
        aiActiveHz: 72,
        renderOnlyHz: 120,
      });

      expect(manager.getCurrentHz()).toBe(90); // Default initial
    });

    it('should auto-start when configured', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });
      expect(manager.getIsRunning()).toBe(true);
    });

    it('should use factory function', () => {
      manager = createAdaptiveFrameRateManager({ initialHz: 120 });
      expect(manager.getCurrentHz()).toBe(120);
    });
  });

  describe('Lifecycle', () => {
    it('should start monitoring', () => {
      manager = new AdaptiveFrameRateManager();
      manager.start();
      expect(manager.getIsRunning()).toBe(true);
    });

    it('should stop monitoring', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });
      expect(manager.getIsRunning()).toBe(true);
      manager.stop();
      expect(manager.getIsRunning()).toBe(false);
    });

    it('should warn on double start', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });
      manager.start();
      expect(logger.warn).toHaveBeenCalledWith(
        '[AdaptiveFrameRateManager] Already running',
      );
    });

    it('should warn on double stop', () => {
      manager = new AdaptiveFrameRateManager();
      manager.stop();
      expect(logger.warn).toHaveBeenCalledWith(
        '[AdaptiveFrameRateManager] Already stopped',
      );
    });

    it('should dispose and release resources', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });
      manager.dispose();
      expect(manager.getIsRunning()).toBe(false);
    });
  });

  // ===========================================================================
  // FRAME LOOP INTEGRATION
  // ===========================================================================

  describe('Frame Loop Integration', () => {
    it('should record frame times via onFrameStart/onFrameEnd', () => {
      manager = new AdaptiveFrameRateManager({
        autoStart: true,
        evaluationIntervalFrames: 10,
      });

      // Simulate 5 frames (below evaluation threshold)
      simulateStableFrames(manager, 5, 6.9);

      const metrics = manager.getMetrics();
      expect(metrics.isRunning).toBe(true);
    });

    it('should not record frames when stopped', () => {
      manager = new AdaptiveFrameRateManager();
      // Not started, so onFrameEnd should be a no-op

      manager.onFrameStart();
      mockTime += 7;
      manager.onFrameEnd();

      // No evaluation should have happened since not running
      const metrics = manager.getMetrics();
      expect(metrics.averageFrameTimeMs).toBe(0);
    });

    it('should calculate frame budget correctly for each tier', () => {
      manager = new AdaptiveFrameRateManager({ initialHz: 144 });
      expect(manager.getFrameBudgetMs()).toBeCloseTo(1000 / 144, 1);

      manager = new AdaptiveFrameRateManager({ initialHz: 120 });
      expect(manager.getFrameBudgetMs()).toBeCloseTo(1000 / 120, 1);

      manager = new AdaptiveFrameRateManager({ initialHz: 90 });
      expect(manager.getFrameBudgetMs()).toBeCloseTo(1000 / 90, 1);

      manager = new AdaptiveFrameRateManager({ initialHz: 72 });
      expect(manager.getFrameBudgetMs()).toBeCloseTo(1000 / 72, 1);
    });
  });

  // ===========================================================================
  // AI INFERENCE MODE SWITCHING
  // ===========================================================================

  describe('AI Inference Mode', () => {
    it('should switch to ai_active mode when AI starts', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
      });

      manager.setAIInferenceActive(true);
      expect(manager.getRenderingMode()).toBe('ai_active');
    });

    it('should switch back to render_only mode when AI stops', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
      });

      manager.setAIInferenceActive(true);
      expect(manager.getRenderingMode()).toBe('ai_active');

      manager.setAIInferenceActive(false);
      expect(manager.getRenderingMode()).toBe('render_only');
    });

    it('should drop to aiActiveHz when AI inference starts', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        aiActiveHz: 90,
        autoStart: true,
        onFrameRateChange,
      });

      manager.setAIInferenceActive(true);

      expect(manager.getCurrentHz()).toBe(90);
      expect(onFrameRateChange).toHaveBeenCalledWith(
        144, 90, 'ai_inference_started',
      );
    });

    it('should not change if already at or below aiActiveHz', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 72,
        aiActiveHz: 90,
        autoStart: true,
        onFrameRateChange,
      });

      manager.setAIInferenceActive(true);

      // Should NOT have changed because 72 < 90 (already lower)
      expect(manager.getCurrentHz()).toBe(72);
      expect(onFrameRateChange).not.toHaveBeenCalled();
    });

    it('should upgrade one tier when AI stops and thermal is cool', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        renderOnlyHz: 144,
        autoStart: true,
        onFrameRateChange,
      });

      // Start AI
      manager.setAIInferenceActive(true);
      onFrameRateChange.mockClear();

      // Stop AI - should upgrade one tier (90 -> 120)
      manager.setAIInferenceActive(false);

      expect(manager.getCurrentHz()).toBe(120);
      expect(onFrameRateChange).toHaveBeenCalledWith(
        90, 120, 'ai_inference_stopped',
      );
    });

    it('should not change if same mode is set again', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        onFrameRateChange,
      });

      manager.setAIInferenceActive(false); // already render_only
      expect(onFrameRateChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // THERMAL STATE CLASSIFICATION
  // ===========================================================================

  describe('Thermal State Classification', () => {
    it('should classify as cool when frame times are stable and within budget', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        varianceThresholdCV: 0.15,
        budgetUtilizationThreshold: 0.85,
        changeCooldownMs: 0, // No cooldown for testing
      });

      // 11.1ms budget at 90Hz, frame times of 6ms = ~54% utilization, cool
      simulateStableFrames(manager, 10, 6.0);

      expect(manager.getThermalState()).toBe('cool');
    });

    it('should classify as warm when utilization approaches threshold', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        varianceThresholdCV: 0.15,
        budgetUtilizationThreshold: 0.85,
        changeCooldownMs: 0,
      });

      // 11.1ms budget at 90Hz, frame times of ~9.5ms = ~85.6% utilization, warm
      simulateStableFrames(manager, 10, 9.5);

      expect(manager.getThermalState()).toBe('warm');
    });

    it('should classify as hot when utilization exceeds 95%', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        varianceThresholdCV: 0.15,
        budgetUtilizationThreshold: 0.85,
        changeCooldownMs: 0,
      });

      // 11.1ms budget at 90Hz, frame times of ~10.7ms = ~96.4% utilization, hot
      simulateStableFrames(manager, 10, 10.7);

      expect(manager.getThermalState()).toBe('hot');
    });

    it('should classify as critical when utilization exceeds 98%', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        varianceThresholdCV: 0.15,
        budgetUtilizationThreshold: 0.85,
        changeCooldownMs: 0,
      });

      // 11.1ms budget at 90Hz, frame times of ~11.0ms = ~99.1% utilization, critical
      simulateStableFrames(manager, 10, 11.0);

      expect(manager.getThermalState()).toBe('critical');
    });

    it('should call onThermalStateChange when thermal state changes', () => {
      const onThermalStateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        changeCooldownMs: 0,
        onThermalStateChange,
      });

      // Start with cool frame times, then switch to hot
      simulateStableFrames(manager, 10, 6.0); // cool eval
      onThermalStateChange.mockClear();

      // Now hot frame times
      simulateStableFrames(manager, 10, 10.7, 2000);

      expect(onThermalStateChange).toHaveBeenCalled();
      const [oldState, newState] = onThermalStateChange.mock.calls[0];
      expect(oldState).toBe('cool');
      // Should be 'hot' or 'critical' depending on exact utilization
      expect(['hot', 'critical']).toContain(newState);
    });
  });

  // ===========================================================================
  // GRADUAL FRAME RATE DEGRADATION
  // ===========================================================================

  describe('Thermal Downgrade', () => {
    it('should downgrade from 144 to 120 after sustained stress', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        downgradeStressWindows: 2,
        changeCooldownMs: 0,
        onFrameRateChange,
      });

      // 6.94ms budget at 144Hz. Frame times of 6.8ms = ~98% utilization = critical
      // Two consecutive stressed windows should trigger downgrade
      let time = 1000;
      time = simulateStableFrames(manager, 10, 6.8, time);  // Window 1: critical
      time = simulateStableFrames(manager, 10, 6.8, time);  // Window 2: critical -> downgrade

      expect(manager.getCurrentHz()).toBe(120);
      expect(onFrameRateChange).toHaveBeenCalledWith(
        144, 120, expect.any(String),
      );
    });

    it('should downgrade only one tier at a time', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        downgradeStressWindows: 2,
        changeCooldownMs: 0,
        onFrameRateChange,
      });

      // Extremely long frame times -> critical thermal
      let time = 1000;
      time = simulateStableFrames(manager, 10, 6.8, time);
      time = simulateStableFrames(manager, 10, 6.8, time);

      // Should have dropped to 120, not directly to 90 or 72
      expect(manager.getCurrentHz()).toBe(120);

      // Continue stress to drop to 90
      // At 120Hz, budget is 8.33ms. 8.2ms = ~98.4% = critical
      time = simulateStableFrames(manager, 10, 8.2, time);
      time = simulateStableFrames(manager, 10, 8.2, time);

      expect(manager.getCurrentHz()).toBe(90);
    });

    it('should not downgrade below 72Hz', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 72,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        downgradeStressWindows: 2,
        changeCooldownMs: 0,
      });

      // 13.89ms budget at 72Hz, frame times of 13.7ms = ~98.6% = critical
      let time = 1000;
      time = simulateStableFrames(manager, 10, 13.7, time);
      time = simulateStableFrames(manager, 10, 13.7, time);

      // Should stay at 72 (minimum)
      expect(manager.getCurrentHz()).toBe(72);
    });

    it('should not downgrade if thermal throttling is disabled', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: false,
        changeCooldownMs: 0,
      });

      // Even with extreme frame times, no downgrade
      let time = 1000;
      time = simulateStableFrames(manager, 10, 6.8, time);
      time = simulateStableFrames(manager, 10, 6.8, time);

      expect(manager.getCurrentHz()).toBe(144);
    });
  });

  // ===========================================================================
  // GRADUAL FRAME RATE UPGRADE
  // ===========================================================================

  describe('Thermal Upgrade', () => {
    it('should upgrade after sustained stability windows', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        renderOnlyHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        upgradeStabilityWindows: 3,
        changeCooldownMs: 0,
        onFrameRateChange,
      });

      // At 90Hz, budget is 11.1ms. Frame times of 5ms = ~45% utilization = cool
      let time = 1000;
      time = simulateStableFrames(manager, 10, 5.0, time);   // Window 1: cool
      time = simulateStableFrames(manager, 10, 5.0, time);   // Window 2: cool
      time = simulateStableFrames(manager, 10, 5.0, time);   // Window 3: cool -> upgrade

      expect(manager.getCurrentHz()).toBe(120);
      expect(onFrameRateChange).toHaveBeenCalledWith(
        90, 120, 'thermal_upgrade',
      );
    });

    it('should upgrade only one tier at a time', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 72,
        renderOnlyHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        upgradeStabilityWindows: 3,
        changeCooldownMs: 0,
        onFrameRateChange,
      });

      // At 72Hz, budget is 13.89ms. Frame times of 5ms = ~36% utilization = cool
      let time = 1000;
      time = simulateStableFrames(manager, 10, 5.0, time);
      time = simulateStableFrames(manager, 10, 5.0, time);
      time = simulateStableFrames(manager, 10, 5.0, time);

      // Should upgrade from 72 to 90 (one tier only)
      expect(manager.getCurrentHz()).toBe(90);
    });

    it('should not upgrade above the mode target (aiActiveHz)', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 72,
        aiActiveHz: 90,
        renderOnlyHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        upgradeStabilityWindows: 3,
        changeCooldownMs: 0,
      });

      // Set AI active mode
      manager.setAIInferenceActive(true);

      // Simulate cool conditions to trigger upgrade
      let time = 1000;
      time = simulateStableFrames(manager, 10, 5.0, time);
      time = simulateStableFrames(manager, 10, 5.0, time);
      time = simulateStableFrames(manager, 10, 5.0, time);

      // Should upgrade to 90 max (aiActiveHz), not beyond
      expect(manager.getCurrentHz()).toBe(90);

      // Continue cool conditions - should not upgrade further (capped by aiActiveHz)
      time = simulateStableFrames(manager, 10, 5.0, time);
      time = simulateStableFrames(manager, 10, 5.0, time);
      time = simulateStableFrames(manager, 10, 5.0, time);

      expect(manager.getCurrentHz()).toBe(90);
    });

    it('should reset stability counter when warm frames appear', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        renderOnlyHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        upgradeStabilityWindows: 3,
        changeCooldownMs: 0,
      });

      // Two cool windows
      let time = 1000;
      time = simulateStableFrames(manager, 10, 5.0, time);  // cool
      time = simulateStableFrames(manager, 10, 5.0, time);  // cool

      // Now a warm window (9.5ms at 90Hz = ~85.6% util)
      time = simulateStableFrames(manager, 10, 9.5, time);  // warm -> resets counter

      // Resume cool - need 3 more consecutive cool windows
      time = simulateStableFrames(manager, 10, 5.0, time);  // cool
      time = simulateStableFrames(manager, 10, 5.0, time);  // cool

      // Still at 90 (only 2 consecutive cool windows after reset)
      expect(manager.getCurrentHz()).toBe(90);

      // Third consecutive cool window -> upgrade
      time = simulateStableFrames(manager, 10, 5.0, time);
      expect(manager.getCurrentHz()).toBe(120);
    });
  });

  // ===========================================================================
  // MANUAL OVERRIDE
  // ===========================================================================

  describe('Manual Override', () => {
    it('should set target frame rate via setTargetHz', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        onFrameRateChange,
      });

      manager.setTargetHz(120);

      expect(manager.getCurrentHz()).toBe(120);
      expect(onFrameRateChange).toHaveBeenCalledWith(
        90, 120, 'manual_override',
      );
    });

    it('should warn on invalid frame rate tier', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });

      manager.setTargetHz(60 as FrameRateTier);

      expect(logger.warn).toHaveBeenCalledWith(
        '[AdaptiveFrameRateManager] Invalid frame rate tier',
        { hz: 60 },
      );
    });

    it('should not change if already at target', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        onFrameRateChange,
      });

      manager.setTargetHz(90);

      expect(onFrameRateChange).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // CHANGE COOLDOWN
  // ===========================================================================

  describe('Change Cooldown', () => {
    it('should enforce cooldown between frame rate changes', () => {
      // Start mock time well past the initial cooldown (lastChangeTimestamp=0)
      mockTime = 10000;

      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        downgradeStressWindows: 1,
        changeCooldownMs: 5000, // 5 second cooldown
      });

      // First stressed window should trigger downgrade (well past initial cooldown)
      let time = simulateStableFrames(manager, 10, 6.8);

      expect(manager.getCurrentHz()).toBe(120);

      // Second stressed window within cooldown should NOT trigger another downgrade.
      // The downgrade just happened, so we're within the 5s cooldown window.
      // At 120Hz budget is 8.33ms. Use 8.2ms (~98.4% util) = critical
      time = simulateStableFrames(manager, 10, 8.2);

      // Should still be at 120 due to cooldown
      expect(manager.getCurrentHz()).toBe(120);

      // Advance past cooldown
      mockTime += 6000;

      // Now another stressed window should trigger downgrade
      time = simulateStableFrames(manager, 10, 8.2);
      expect(manager.getCurrentHz()).toBe(90);
    });
  });

  // ===========================================================================
  // TELEMETRY METRICS
  // ===========================================================================

  describe('Telemetry', () => {
    it('should provide comprehensive metrics', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
      });

      const metrics = manager.getMetrics();

      expect(metrics).toMatchObject({
        isRunning: true,
        currentHz: 90,
        targetHz: 90,
        renderingMode: 'render_only',
        thermalState: 'cool',
        totalFrameRateChanges: 0,
        consecutiveStableWindows: 0,
        consecutiveStressedWindows: 0,
        lastMemoryUsageBytes: 0,
      });

      expect(metrics.timeInTierMs).toBeDefined();
      expect(metrics.changeHistory).toEqual([]);
    });

    it('should track total frame rate changes', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
      });

      manager.setTargetHz(120);
      manager.setTargetHz(144);

      const metrics = manager.getMetrics();
      expect(metrics.totalFrameRateChanges).toBe(2);
    });

    it('should record change history', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
      });

      manager.setTargetHz(120);
      manager.setTargetHz(144);

      const metrics = manager.getMetrics();
      expect(metrics.changeHistory).toHaveLength(2);
      expect(metrics.changeHistory[0].fromHz).toBe(90);
      expect(metrics.changeHistory[0].toHz).toBe(120);
      expect(metrics.changeHistory[0].reason).toBe('manual_override');
      expect(metrics.changeHistory[1].fromHz).toBe(120);
      expect(metrics.changeHistory[1].toHz).toBe(144);
    });

    it('should limit change history to 20 entries', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
      });

      // Create more than 20 changes by toggling back and forth
      for (let i = 0; i < 25; i++) {
        const target: FrameRateTier = i % 2 === 0 ? 120 : 90;
        manager.setTargetHz(target);
      }

      const metrics = manager.getMetrics();
      expect(metrics.changeHistory.length).toBeLessThanOrEqual(20);
    });

    it('should track time in each tier', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
      });

      const metrics = manager.getMetrics();

      // Should have time tracked for 90Hz tier (current tier)
      expect(metrics.timeInTierMs[90]).toBeGreaterThanOrEqual(0);
      // Other tiers should be 0
      expect(metrics.timeInTierMs[144]).toBe(0);
      expect(metrics.timeInTierMs[120]).toBe(0);
      expect(metrics.timeInTierMs[72]).toBe(0);
    });

    it('should track average frame time', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 100, // High to avoid evaluation during test
      });

      // Simulate some frames with known times
      simulateStableFrames(manager, 5, 8.0);

      const metrics = manager.getMetrics();
      expect(metrics.averageFrameTimeMs).toBeCloseTo(8.0, 0);
    });

    it('should track frame time variance CV', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 100, // High to avoid evaluation during test
      });

      // Simulate frames with zero variance
      simulateStableFrames(manager, 10, 8.0);

      const metrics = manager.getMetrics();
      // With perfectly stable frames, CV should be 0
      expect(metrics.frameTimeVarianceCV).toBeCloseTo(0, 2);
    });

    it('should track budget utilization', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 100,
      });

      // At 90Hz, budget = 11.1ms. Frame time 8ms = ~72% utilization
      simulateStableFrames(manager, 10, 8.0);

      const metrics = manager.getMetrics();
      expect(metrics.budgetUtilization).toBeCloseTo(8.0 / 11.111, 1);
    });
  });

  // ===========================================================================
  // FRAME RATE TIERS
  // ===========================================================================

  describe('Frame Rate Tiers', () => {
    it('should define all four tiers in descending order', () => {
      expect(FRAME_RATE_TIERS).toEqual([144, 120, 90, 72]);
    });

    it('should iterate tiers correctly for degradation', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        downgradeStressWindows: 1,
        changeCooldownMs: 0,
      });

      const changes: FrameRateTier[] = [144];

      // Progressively stress test through all tiers
      let time = 1000;

      // Tier 144Hz: budget 6.94ms. Stress: 6.8ms (~98% util) = critical
      time = simulateStableFrames(manager, 10, 6.8, time);
      changes.push(manager.getCurrentHz());

      // Tier 120Hz: budget 8.33ms. Stress: 8.2ms (~98.4% util) = critical
      time = simulateStableFrames(manager, 10, 8.2, time);
      changes.push(manager.getCurrentHz());

      // Tier 90Hz: budget 11.1ms. Stress: 10.9ms (~98.2% util) = critical
      time = simulateStableFrames(manager, 10, 10.9, time);
      changes.push(manager.getCurrentHz());

      // Tier 72Hz: already minimum
      time = simulateStableFrames(manager, 10, 13.7, time);
      changes.push(manager.getCurrentHz());

      expect(changes).toEqual([144, 120, 90, 72, 72]);
    });
  });

  // ===========================================================================
  // HIGH VARIANCE DETECTION
  // ===========================================================================

  describe('High Variance Detection', () => {
    it('should detect high frame time variance as thermal stress', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        varianceThresholdCV: 0.15,
        downgradeStressWindows: 2,
        changeCooldownMs: 0,
      });

      // High variance frames at 144Hz: alternate between 3ms and 6ms
      // Mean ~4.5ms, budget 6.94ms. Util ~65% = OK
      // But CV = stddev/mean ~= 0.33/0.65 = high
      let time = 1000;
      time = simulateHighVarianceFrames(manager, 10, 5.0, time);
      time = simulateHighVarianceFrames(manager, 10, 5.0, time);

      // High variance should eventually register as warm or higher
      const state = manager.getThermalState();
      expect(['warm', 'hot', 'critical']).toContain(state);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle zero frame times gracefully', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 10,
      });

      // Simulate frames where onFrameEnd returns immediately after onFrameStart
      for (let i = 0; i < 10; i++) {
        manager.onFrameStart();
        // Do NOT advance mockTime -- zero frame time
        manager.onFrameEnd();
        mockTime += 0.5; // Small gap between frames
      }

      // Should not crash
      const metrics = manager.getMetrics();
      expect(metrics.isRunning).toBe(true);
    });

    it('should handle dispose while running', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });

      // Should not throw
      expect(() => manager.dispose()).not.toThrow();
      expect(manager.getIsRunning()).toBe(false);
    });

    it('should handle metrics on disposed manager', () => {
      manager = new AdaptiveFrameRateManager({ autoStart: true });
      manager.dispose();

      const metrics = manager.getMetrics();
      expect(metrics.isRunning).toBe(false);
    });

    it('should not evaluate when no frames have been recorded', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 90,
        autoStart: true,
        evaluationIntervalFrames: 5,
      });

      // Don't simulate any frames - just get metrics
      const metrics = manager.getMetrics();
      expect(metrics.averageFrameTimeMs).toBe(0);
      expect(metrics.frameTimeVarianceCV).toBe(0);
    });
  });

  // ===========================================================================
  // COMBINED SCENARIOS
  // ===========================================================================

  describe('Combined Scenarios', () => {
    it('should handle AI start -> thermal stress -> AI stop -> recovery', () => {
      const onFrameRateChange = vi.fn();
      manager = new AdaptiveFrameRateManager({
        initialHz: 144,
        aiActiveHz: 90,
        renderOnlyHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        downgradeStressWindows: 2,
        upgradeStabilityWindows: 3,
        changeCooldownMs: 0,
        onFrameRateChange,
      });

      // Step 1: AI starts -> drop to 90Hz
      manager.setAIInferenceActive(true);
      expect(manager.getCurrentHz()).toBe(90);
      expect(manager.getRenderingMode()).toBe('ai_active');

      // Step 2: Thermal stress at 90Hz -> drop to 72Hz
      let time = simulateStableFrames(manager, 10, 10.9); // ~98% util
      time = simulateStableFrames(manager, 10, 10.9);     // -> downgrade

      expect(manager.getCurrentHz()).toBe(72);

      // Step 3: AI stops. Thermal is still hot/critical from stress above,
      // so immediate upgrade is blocked by thermal state check.
      onFrameRateChange.mockClear();
      manager.setAIInferenceActive(false);
      expect(manager.getRenderingMode()).toBe('render_only');
      // Won't upgrade immediately because thermal state is not 'cool'
      expect(manager.getCurrentHz()).toBe(72);

      // Step 4: Cool frames bring thermal back to cool, then upgrade
      time = simulateStableFrames(manager, 10, 5.0); // cool -> resets thermal
      time = simulateStableFrames(manager, 10, 5.0); // cool
      time = simulateStableFrames(manager, 10, 5.0); // cool -> upgrade to 90

      expect(manager.getCurrentHz()).toBe(90);

      // Continue cool -> upgrade to 120
      time = simulateStableFrames(manager, 10, 5.0);
      time = simulateStableFrames(manager, 10, 5.0);
      time = simulateStableFrames(manager, 10, 5.0);

      expect(manager.getCurrentHz()).toBe(120);

      // Continue cool -> upgrade to 144
      time = simulateStableFrames(manager, 10, 5.0);
      time = simulateStableFrames(manager, 10, 5.0);
      time = simulateStableFrames(manager, 10, 5.0);

      expect(manager.getCurrentHz()).toBe(144);
    });

    it('should respect aiActiveHz ceiling during AI mode upgrades', () => {
      manager = new AdaptiveFrameRateManager({
        initialHz: 72,
        aiActiveHz: 90,
        renderOnlyHz: 144,
        autoStart: true,
        evaluationIntervalFrames: 10,
        thermalThrottling: true,
        upgradeStabilityWindows: 3,
        changeCooldownMs: 0,
      });

      // Set AI active
      manager.setAIInferenceActive(true);

      // Cool conditions -> should upgrade from 72 to 90 but not beyond
      let time = 1000;
      for (let i = 0; i < 20; i++) {
        time = simulateStableFrames(manager, 10, 5.0, time);
      }

      expect(manager.getCurrentHz()).toBe(90);
    });
  });

  // ===========================================================================
  // FACTORY FUNCTION
  // ===========================================================================

  describe('createAdaptiveFrameRateManager', () => {
    it('should create a manager with default config', () => {
      manager = createAdaptiveFrameRateManager();
      expect(manager).toBeInstanceOf(AdaptiveFrameRateManager);
      expect(manager.getCurrentHz()).toBe(90);
    });

    it('should create a manager with custom config', () => {
      manager = createAdaptiveFrameRateManager({
        initialHz: 144,
        aiActiveHz: 120,
        renderOnlyHz: 144,
        thermalThrottling: false,
      });

      expect(manager.getCurrentHz()).toBe(144);
    });
  });
});
