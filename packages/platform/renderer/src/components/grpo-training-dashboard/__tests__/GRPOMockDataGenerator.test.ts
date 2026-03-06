/**
 * @vitest-environment jsdom
 */

/**
 * Tests for GRPOMockDataGenerator
 *
 * Validates:
 * - Lifecycle (start, stop, tick)
 * - Event emission with correct types
 * - Training trajectory realism (rewards improve, KL oscillates)
 * - Periodic event scheduling (completions, forgetting, GPU)
 * - Training completion at totalSteps
 * - Snapshot generation for initial hydration
 * - Seeded random for reproducibility
 * - Step advancement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GRPOMockDataGenerator } from '../GRPOMockDataGenerator';
import type { GRPOEvent } from '../GRPOEventEmitter';

// =============================================================================
// HELPERS
// =============================================================================

function collectEvents(count: number, generator: GRPOMockDataGenerator): GRPOEvent[] {
  const events: GRPOEvent[] = [];
  generator.start((event) => events.push(event));
  for (let i = 0; i < count; i++) {
    generator.tick();
  }
  generator.stop();
  return events;
}

// =============================================================================
// TESTS
// =============================================================================

describe('GRPOMockDataGenerator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------

  describe('lifecycle', () => {
    it('starts and emits initial status and params', () => {
      const events: GRPOEvent[] = [];
      const generator = new GRPOMockDataGenerator({ totalSteps: 1000, intervalMs: 100000 });
      generator.start((event) => events.push(event));

      // start() emits status + params
      const statusEvents = events.filter((e) => e.type === 'status');
      const paramsEvents = events.filter((e) => e.type === 'params');
      expect(statusEvents).toHaveLength(1);
      expect(paramsEvents).toHaveLength(1);

      if (statusEvents[0].type === 'status') {
        expect(statusEvents[0].status).toBe('running');
      }

      generator.stop();
    });

    it('reports isRunning correctly', () => {
      const generator = new GRPOMockDataGenerator({ intervalMs: 100000 });
      expect(generator.isRunning).toBe(false);

      generator.start();
      expect(generator.isRunning).toBe(true);

      generator.stop();
      expect(generator.isRunning).toBe(false);
    });

    it('does not start twice', () => {
      const events: GRPOEvent[] = [];
      const generator = new GRPOMockDataGenerator({ intervalMs: 100000 });
      generator.start((event) => events.push(event));

      const countAfterFirstStart = events.length;
      generator.start((event) => events.push(event)); // no-op

      // Should not emit additional start events
      expect(events.length).toBe(countAfterFirstStart);

      generator.stop();
    });

    it('stop is idempotent', () => {
      const generator = new GRPOMockDataGenerator({ intervalMs: 100000 });
      generator.start();
      generator.stop();
      expect(() => generator.stop()).not.toThrow();
    });
  });

  // ---------------------------------------------------
  // TICK / EVENT EMISSION
  // ---------------------------------------------------

  describe('tick and event emission', () => {
    it('emits reward, kl, and progress events on every tick', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 10000,
        stepsPerInterval: 10,
        completionEveryNSteps: 200,
        forgettingEveryNSteps: 500,
        gpuEveryNSteps: 50,
        intervalMs: 100000,
      });
      const events = collectEvents(1, generator);

      const types = events.map((e) => e.type);
      expect(types).toContain('reward');
      expect(types).toContain('kl');
      expect(types).toContain('progress');
    });

    it('advances step on each tick', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        intervalMs: 100000,
      });
      expect(generator.step).toBe(0);

      generator.start();
      generator.tick();
      expect(generator.step).toBe(10);

      generator.tick();
      expect(generator.step).toBe(20);

      generator.stop();
    });

    it('emits GPU stats at configured intervals', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 10000,
        stepsPerInterval: 50,
        gpuEveryNSteps: 50,
        intervalMs: 100000,
      });
      const events = collectEvents(1, generator);

      const gpuEvents = events.filter((e) => e.type === 'gpu');
      expect(gpuEvents.length).toBeGreaterThanOrEqual(1);

      if (gpuEvents[0].type === 'gpu') {
        expect(gpuEvents[0].stats.gpuUtilization).toBeGreaterThan(0);
        expect(gpuEvents[0].stats.memoryTotalGB).toBe(24);
      }
    });

    it('emits completion groups at configured intervals', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 10000,
        stepsPerInterval: 200,
        completionEveryNSteps: 200,
        intervalMs: 100000,
      });
      const events = collectEvents(1, generator);

      const completionEvents = events.filter((e) => e.type === 'completion');
      expect(completionEvents.length).toBeGreaterThanOrEqual(1);

      if (completionEvents[0].type === 'completion') {
        expect(completionEvents[0].group.best.totalScore).toBeGreaterThan(
          completionEvents[0].group.worst.totalScore,
        );
      }
    });

    it('emits forgetting metrics at configured intervals', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 10000,
        stepsPerInterval: 500,
        forgettingEveryNSteps: 500,
        intervalMs: 100000,
      });
      const events = collectEvents(1, generator);

      const forgettingEvents = events.filter((e) => e.type === 'forgetting');
      expect(forgettingEvents.length).toBeGreaterThanOrEqual(1);

      if (forgettingEvents[0].type === 'forgetting') {
        expect(forgettingEvents[0].metrics.oplora.constraintValue).toBeGreaterThan(0);
        expect(forgettingEvents[0].metrics.humanEvalBaseline).toBe(0.68);
      }
    });
  });

  // ---------------------------------------------------
  // TRAINING TRAJECTORY REALISM
  // ---------------------------------------------------

  describe('training trajectory realism', () => {
    it('rewards improve over training', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 42,
        intervalMs: 100000,
      });
      const events = collectEvents(90, generator); // 90 ticks = step 900

      const rewardEvents = events.filter((e) => e.type === 'reward');
      expect(rewardEvents.length).toBeGreaterThan(10);

      // Compare early vs late composite scores
      const early = rewardEvents.slice(0, 5);
      const late = rewardEvents.slice(-5);

      const earlyAvg = early.reduce((sum, e) => {
        if (e.type === 'reward') return sum + e.point.rewards.composite;
        return sum;
      }, 0) / early.length;

      const lateAvg = late.reduce((sum, e) => {
        if (e.type === 'reward') return sum + e.point.rewards.composite;
        return sum;
      }, 0) / late.length;

      expect(lateAvg).toBeGreaterThan(earlyAvg);
    });

    it('KL divergence values are within reasonable range', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 42,
        intervalMs: 100000,
      });
      const events = collectEvents(50, generator);

      const klEvents = events.filter((e) => e.type === 'kl');
      for (const event of klEvents) {
        if (event.type === 'kl') {
          expect(event.point.kl).toBeGreaterThanOrEqual(0);
          expect(event.point.kl).toBeLessThan(0.1); // Reasonable upper bound
          expect(event.point.beta).toBe(0.04);
        }
      }
    });

    it('reward values are clamped between 0 and 1', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 42,
        intervalMs: 100000,
      });
      const events = collectEvents(90, generator);

      const rewardEvents = events.filter((e) => e.type === 'reward');
      for (const event of rewardEvents) {
        if (event.type === 'reward') {
          for (const value of Object.values(event.point.rewards)) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          }
        }
      }
    });
  });

  // ---------------------------------------------------
  // TRAINING COMPLETION
  // ---------------------------------------------------

  describe('training completion', () => {
    it('emits completed status when reaching totalSteps', () => {
      const events: GRPOEvent[] = [];
      const generator = new GRPOMockDataGenerator({
        totalSteps: 50,
        stepsPerInterval: 10,
        intervalMs: 100000,
      });
      generator.start((event) => events.push(event));

      // Tick 5 times: step goes 10, 20, 30, 40, 50
      for (let i = 0; i < 5; i++) {
        generator.tick();
      }

      const statusEvents = events.filter((e) => e.type === 'status');
      const completedEvent = statusEvents.find(
        (e) => e.type === 'status' && e.status === 'completed',
      );
      expect(completedEvent).toBeDefined();
      expect(generator.isRunning).toBe(false);
    });

    it('stops automatically after completion', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 20,
        stepsPerInterval: 10,
        intervalMs: 100000,
      });
      generator.start();

      generator.tick(); // step 10
      expect(generator.isRunning).toBe(true);

      generator.tick(); // step 20 = totalSteps
      expect(generator.isRunning).toBe(false);
    });
  });

  // ---------------------------------------------------
  // SNAPSHOT GENERATION
  // ---------------------------------------------------

  describe('snapshot generation', () => {
    it('generates a valid snapshot with historical data', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 10000,
        seed: 42,
      });
      const snapshot = generator.generateSnapshot(100);

      expect(snapshot.type).toBe('snapshot');
      if (snapshot.type === 'snapshot') {
        expect(snapshot.rewardHistory).toBeDefined();
        expect(Array.isArray(snapshot.rewardHistory)).toBe(true);
        expect(snapshot.rewardHistory!.length).toBe(100);

        expect(snapshot.klHistory).toBeDefined();
        expect(Array.isArray(snapshot.klHistory)).toBe(true);
        expect(snapshot.klHistory!.length).toBe(100);

        expect(snapshot.completionGroups).toBeDefined();
        expect(Array.isArray(snapshot.completionGroups)).toBe(true);
        expect(snapshot.completionGroups!.length).toBeGreaterThan(0);

        expect(snapshot.trainingStatus).toBe('running');
        expect(snapshot.gpuStats).toBeDefined();
        expect(snapshot.connected).toBe(true);
      }
    });

    it('snapshot rewards have valid structure', () => {
      const generator = new GRPOMockDataGenerator({ seed: 42 });
      const snapshot = generator.generateSnapshot(10);

      if (snapshot.type === 'snapshot' && snapshot.rewardHistory) {
        for (const point of snapshot.rewardHistory) {
          expect(point.step).toBeGreaterThanOrEqual(0);
          expect(point.rewards.testPassReward).toBeGreaterThanOrEqual(0);
          expect(point.rewards.composite).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ---------------------------------------------------
  // SEEDED RANDOM
  // ---------------------------------------------------

  describe('seeded random', () => {
    it('produces reproducible output with same seed', () => {
      const gen1 = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 12345,
        intervalMs: 100000,
      });
      const events1 = collectEvents(10, gen1);

      const gen2 = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 12345,
        intervalMs: 100000,
      });
      const events2 = collectEvents(10, gen2);

      const rewards1 = events1.filter((e) => e.type === 'reward');
      const rewards2 = events2.filter((e) => e.type === 'reward');

      expect(rewards1.length).toBe(rewards2.length);
      for (let i = 0; i < rewards1.length; i++) {
        if (rewards1[i].type === 'reward' && rewards2[i].type === 'reward') {
          expect(rewards1[i].point.rewards.composite).toBe(
            rewards2[i].point.rewards.composite,
          );
        }
      }
    });

    it('produces different output with different seeds', () => {
      const gen1 = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 11111,
        intervalMs: 100000,
      });
      const events1 = collectEvents(5, gen1);

      const gen2 = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 10,
        seed: 99999,
        intervalMs: 100000,
      });
      const events2 = collectEvents(5, gen2);

      const rewards1 = events1.filter((e) => e.type === 'reward');
      const rewards2 = events2.filter((e) => e.type === 'reward');

      // At least some values should differ
      let anyDifferent = false;
      for (let i = 0; i < Math.min(rewards1.length, rewards2.length); i++) {
        if (rewards1[i].type === 'reward' && rewards2[i].type === 'reward') {
          if (rewards1[i].point.rewards.composite !== rewards2[i].point.rewards.composite) {
            anyDifferent = true;
            break;
          }
        }
      }
      expect(anyDifferent).toBe(true);
    });
  });

  // ---------------------------------------------------
  // PROGRESS TRACKING
  // ---------------------------------------------------

  describe('progress tracking', () => {
    it('emits accurate progress events', () => {
      const generator = new GRPOMockDataGenerator({
        totalSteps: 1000,
        stepsPerInterval: 100,
        intervalMs: 100000,
      });
      const events = collectEvents(5, generator);

      const progressEvents = events.filter((e) => e.type === 'progress');
      expect(progressEvents.length).toBeGreaterThan(0);

      // Last progress should show step 500
      const lastProgress = progressEvents[progressEvents.length - 1];
      if (lastProgress.type === 'progress') {
        expect(lastProgress.progress.currentStep).toBe(500);
        expect(lastProgress.progress.totalSteps).toBe(1000);
      }
    });
  });
});
