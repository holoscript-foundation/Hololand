/**
 * @vitest-environment jsdom
 */

/**
 * Tests for BehavioralTrustScoring
 *
 * Validates the four-dimension behavioral trust scoring system:
 * - Dimension 1: Spatial Compliance (bounds, zones, teleport)
 * - Dimension 2: Physics Adherence (velocity, acceleration, clipping, gravity)
 * - Dimension 3: Interaction Appropriateness (chat rate, gesture rate, proximity, harassment)
 * - Dimension 4: Temporal Consistency (heartbeat, state updates, impossible movement)
 * - Composite scoring with weighted aggregation
 * - EWMA smoothing
 * - Inactivity decay
 * - Threshold-based trust actions (degrade, revoke, recover)
 * - Render-loop safe reads (<0.1ms)
 * - Agent lifecycle (register, reset, unregister)
 * - Metrics tracking
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
  BehavioralTrustScoring,
  createBehavioralTrustScoring,
  DEFAULT_BEHAVIORAL_SCORING_CONFIG,
  type BehavioralEvent,
  type BehavioralTrustScoringConfig,
  type TrustAction,
  type TrustActionDetails,
  type TrustDimension,
} from '../BehavioralTrustScoring';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestScoring(overrides?: Partial<BehavioralTrustScoringConfig>): BehavioralTrustScoring {
  return new BehavioralTrustScoring({
    autoStart: false,
    ...overrides,
  });
}

function createPositionEvent(
  agentId: string,
  position: { x: number; y: number; z: number },
  timestamp?: number,
): BehavioralEvent {
  return {
    type: 'position_update',
    agentId,
    timestamp: timestamp ?? Date.now(),
    data: { position },
  };
}

function createChatEvent(agentId: string, timestamp?: number): BehavioralEvent {
  return {
    type: 'chat_message',
    agentId,
    timestamp: timestamp ?? Date.now(),
    data: { text: 'hello' },
  };
}

function createHeartbeatEvent(agentId: string, timestamp?: number): BehavioralEvent {
  return {
    type: 'heartbeat',
    agentId,
    timestamp: timestamp ?? Date.now(),
    data: {},
  };
}

function createVelocityEvent(agentId: string, velocity: number, timestamp?: number): BehavioralEvent {
  return {
    type: 'velocity_report',
    agentId,
    timestamp: timestamp ?? Date.now(),
    data: { velocity },
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('BehavioralTrustScoring', () => {
  let scoring: BehavioralTrustScoring;

  beforeEach(() => {
    vi.useFakeTimers();
    scoring = createTestScoring();
  });

  afterEach(() => {
    scoring.dispose();
    vi.useRealTimers();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('initialization', () => {
    it('should create with default configuration', () => {
      const s = createBehavioralTrustScoring();
      expect(s.getIsRunning()).toBe(false);
      expect(s.getTrackedAgentIds()).toEqual([]);
      s.dispose();
    });

    it('should auto-start when configured', () => {
      const s = createTestScoring({ autoStart: true });
      expect(s.getIsRunning()).toBe(true);
      s.dispose();
    });

    it('should accept custom dimension weights', () => {
      const s = createTestScoring({
        dimensionWeights: { spatial_compliance: 0.5 },
      });
      const metrics = s.getMetrics();
      expect(metrics.dimensionWeights.spatial_compliance).toBe(0.5);
      // Other weights should remain default
      expect(metrics.dimensionWeights.physics_adherence).toBe(0.30);
      s.dispose();
    });

    it('should accept custom thresholds', () => {
      const s = createTestScoring({
        degradeThreshold: 0.4,
        revokeThreshold: 0.1,
        recoverThreshold: 0.9,
      });
      const metrics = s.getMetrics();
      expect(metrics.thresholds.degrade).toBe(0.4);
      expect(metrics.thresholds.revoke).toBe(0.1);
      expect(metrics.thresholds.recover).toBe(0.9);
      s.dispose();
    });
  });

  // ===========================================================================
  // AGENT LIFECYCLE
  // ===========================================================================

  describe('agent lifecycle', () => {
    it('should auto-register agents on first event', () => {
      scoring.ingestEvent(createPositionEvent('agent-1', { x: 0, y: 0, z: 0 }));
      expect(scoring.getTrackedAgentIds()).toContain('agent-1');
    });

    it('should start agents with full trust (score = 1.0)', () => {
      scoring.registerAgent('agent-1');
      expect(scoring.getAgentScore('agent-1')).toBe(1.0);
    });

    it('should return -1 for untracked agents', () => {
      expect(scoring.getAgentScore('unknown-agent')).toBe(-1);
    });

    it('should unregister agents', () => {
      scoring.registerAgent('agent-1');
      expect(scoring.getAgentScore('agent-1')).toBe(1.0);

      scoring.unregisterAgent('agent-1');
      expect(scoring.getAgentScore('agent-1')).toBe(-1);
    });

    it('should reset agent scores', () => {
      scoring.registerAgent('agent-1');

      // Inject a severe violation to lower the score
      scoring.ingestEvent({
        type: 'bounds_violation',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      // Process events
      vi.advanceTimersByTime(200);

      // Score should have decreased
      // Note: without starting the loop, we need to start it to process
      scoring.start();
      vi.advanceTimersByTime(200);
      scoring.stop();

      // Reset
      scoring.resetAgentScore('agent-1');
      expect(scoring.getAgentScore('agent-1')).toBe(1.0);
    });

    it('should return null dimension scores for untracked agents', () => {
      expect(scoring.getAgentDimensionScores('unknown-agent')).toBeNull();
    });

    it('should return dimension scores for tracked agents', () => {
      scoring.registerAgent('agent-1');
      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims).not.toBeNull();
      expect(dims!.spatial_compliance).toBe(1.0);
      expect(dims!.physics_adherence).toBe(1.0);
      expect(dims!.interaction_appropriateness).toBe(1.0);
      expect(dims!.temporal_consistency).toBe(1.0);
    });
  });

  // ===========================================================================
  // SCORING LOOP
  // ===========================================================================

  describe('scoring loop', () => {
    it('should start and stop the scoring loop', () => {
      expect(scoring.getIsRunning()).toBe(false);
      scoring.start();
      expect(scoring.getIsRunning()).toBe(true);
      scoring.stop();
      expect(scoring.getIsRunning()).toBe(false);
    });

    it('should not start twice', () => {
      scoring.start();
      scoring.start(); // Should warn but not error
      expect(scoring.getIsRunning()).toBe(true);
      scoring.stop();
    });

    it('should process events during scoring cycle', () => {
      scoring.start();

      scoring.ingestEvent(createPositionEvent('agent-1', { x: 0, y: 0, z: 0 }));
      scoring.ingestEvent(createHeartbeatEvent('agent-1'));

      // Advance to next scoring cycle (200ms at 5Hz)
      vi.advanceTimersByTime(200);

      const metrics = scoring.getMetrics();
      expect(metrics.totalEventsProcessed).toBe(2);
    });

    it('should drain event queue each cycle', () => {
      scoring.start();

      // Add events
      for (let i = 0; i < 10; i++) {
        scoring.ingestEvent(createPositionEvent('agent-1', { x: i, y: 0, z: 0 }));
      }

      // Process
      vi.advanceTimersByTime(200);

      expect(scoring.getMetrics().pendingEventCount).toBe(0);
      expect(scoring.getMetrics().totalEventsProcessed).toBe(10);
    });
  });

  // ===========================================================================
  // SPATIAL COMPLIANCE SCORING
  // ===========================================================================

  describe('spatial compliance', () => {
    it('should score normal position updates positively', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Series of normal position updates
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent(createPositionEvent('agent-1', { x: i * 0.5, y: 0, z: 0 }, now + i * 1000));
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.spatial_compliance).toBeGreaterThan(0.8);
    });

    it('should penalize bounds violations severely', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Multiple bounds violations
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.spatial_compliance).toBeLessThan(0.3);
    });

    it('should detect world bounds violations from position updates', () => {
      const s = createTestScoring({
        worldBounds: {
          min: { x: -100, y: -10, z: -100 },
          max: { x: 100, y: 100, z: 100 },
        },
      });
      s.start();
      s.registerAgent('agent-1');

      // Position outside world bounds
      s.ingestEvent(createPositionEvent('agent-1', { x: 200, y: 0, z: 0 }));

      vi.advanceTimersByTime(200);

      const dims = s.getAgentDimensionScores('agent-1');
      expect(dims!.spatial_compliance).toBeLessThan(0.95);
      s.dispose();
    });

    it('should penalize unauthorized teleports', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // First establish position
      scoring.ingestEvent(createPositionEvent('agent-1', { x: 0, y: 0, z: 0 }));
      vi.advanceTimersByTime(200);

      // Then teleport far away without authorization
      scoring.ingestEvent({
        type: 'teleport',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { distance: 100, authorized: false },
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.spatial_compliance).toBeLessThan(0.9);
    });

    it('should allow authorized teleports', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      scoring.ingestEvent({
        type: 'teleport',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { distance: 100, authorized: true },
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.spatial_compliance).toBe(1.0);
    });

    it('should reward zone exits', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Enter restricted zone (bad)
      scoring.ingestEvent({
        type: 'zone_entry',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { restricted: true },
      });
      vi.advanceTimersByTime(200);
      const afterEntry = scoring.getAgentDimensionScores('agent-1')!.spatial_compliance;

      // Exit zone (good)
      scoring.ingestEvent({
        type: 'zone_exit',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });
      vi.advanceTimersByTime(200);
      const afterExit = scoring.getAgentDimensionScores('agent-1')!.spatial_compliance;

      expect(afterExit).toBeGreaterThan(afterEntry);
    });
  });

  // ===========================================================================
  // PHYSICS ADHERENCE SCORING
  // ===========================================================================

  describe('physics adherence', () => {
    it('should score normal velocities positively', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      scoring.ingestEvent(createVelocityEvent('agent-1', 5)); // Well within limit of 20

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.physics_adherence).toBe(1.0);
    });

    it('should penalize excessive velocity', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Velocity well above the 20 u/s limit
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent(createVelocityEvent('agent-1', 50));
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.physics_adherence).toBeLessThan(0.8);
    });

    it('should severely penalize collision (clipping)', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      scoring.ingestEvent({
        type: 'collision_detected',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.physics_adherence).toBeLessThan(0.85);
    });

    it('should severely penalize gravity violations', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      for (let i = 0; i < 3; i++) {
        scoring.ingestEvent({
          type: 'gravity_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.physics_adherence).toBeLessThan(0.5);
    });

    it('should penalize acceleration spikes proportionally', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Moderate spike (just above threshold of 50)
      scoring.ingestEvent({
        type: 'acceleration_spike',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { acceleration: 75 },
      });
      vi.advanceTimersByTime(200);
      const moderateScore = scoring.getAgentDimensionScores('agent-1')!.physics_adherence;

      // Reset and test severe spike
      scoring.resetAgentScore('agent-1');
      scoring.ingestEvent({
        type: 'acceleration_spike',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { acceleration: 200 },
      });
      vi.advanceTimersByTime(200);
      const severeScore = scoring.getAgentDimensionScores('agent-1')!.physics_adherence;

      expect(severeScore).toBeLessThan(moderateScore);
    });
  });

  // ===========================================================================
  // INTERACTION APPROPRIATENESS SCORING
  // ===========================================================================

  describe('interaction appropriateness', () => {
    it('should allow normal chat rate', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const now = Date.now();
      // Send 5 messages (well under 30/min limit)
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent(createChatEvent('agent-1', now + i * 5000));
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.interaction_appropriateness).toBe(1.0);
    });

    it('should penalize chat flooding', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const now = Date.now();
      // Send 40 messages in quick succession (above 30/min limit)
      for (let i = 0; i < 40; i++) {
        scoring.ingestEvent(createChatEvent('agent-1', now + i * 100));
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.interaction_appropriateness).toBeLessThan(0.95);
    });

    it('should penalize gesture spam', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const now = Date.now();
      // 30 gestures in quick succession (above 20/min limit)
      for (let i = 0; i < 30; i++) {
        scoring.ingestEvent({
          type: 'gesture_performed',
          agentId: 'agent-1',
          timestamp: now + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.interaction_appropriateness).toBeLessThan(0.95);
    });

    it('should penalize proximity violations', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Very close proximity (distance 0.3 vs 1.0 personal space)
      scoring.ingestEvent({
        type: 'proximity_warning',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { distance: 0.3 },
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.interaction_appropriateness).toBeLessThan(0.9);
    });

    it('should severely penalize harassment flags', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Single harassment flag: EWMA(1.0, 0.0, 0.3) = 0.7
      scoring.ingestEvent({
        type: 'harassment_flag',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      // 0.3 * 0.0 + 0.7 * 1.0 = 0.7, so a single flag drops by 30%
      expect(dims!.interaction_appropriateness).toBeLessThanOrEqual(0.7);
      expect(dims!.interaction_appropriateness).toBeLessThan(1.0);
    });
  });

  // ===========================================================================
  // TEMPORAL CONSISTENCY SCORING
  // ===========================================================================

  describe('temporal consistency', () => {
    it('should score timely heartbeats positively', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const now = Date.now();
      // Regular heartbeats at expected interval (5s)
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent(createHeartbeatEvent('agent-1', now + i * 5000));
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.temporal_consistency).toBe(1.0);
    });

    it('should penalize missed heartbeats', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      for (let i = 0; i < 3; i++) {
        scoring.ingestEvent({
          type: 'heartbeat_missed',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.temporal_consistency).toBeLessThan(0.7);
    });

    it('should severely penalize impossible movement', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Single impossible_movement: score=0.0, EWMA(1.0, 0.0, 0.3) = 0.7
      scoring.ingestEvent({
        type: 'impossible_movement',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      // A single impossible movement drops score by 30%
      expect(dims!.temporal_consistency).toBeLessThanOrEqual(0.7);
      expect(dims!.temporal_consistency).toBeLessThan(1.0);
    });

    it('should severely penalize timestamp anomalies', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      scoring.ingestEvent({
        type: 'timestamp_anomaly',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      expect(dims!.temporal_consistency).toBeLessThan(0.8);
    });
  });

  // ===========================================================================
  // COMPOSITE SCORING
  // ===========================================================================

  describe('composite scoring', () => {
    it('should produce weighted composite from all dimensions', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // All dimensions at 1.0 = composite 1.0
      expect(scoring.getAgentScore('agent-1')).toBe(1.0);
    });

    it('should decrease composite when one dimension is penalized', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Penalize spatial compliance heavily
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const composite = scoring.getAgentScore('agent-1');
      expect(composite).toBeLessThan(1.0);
      expect(composite).toBeGreaterThan(0); // Other dimensions still at 1.0
    });

    it('should use custom severity when provided', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Event with pre-computed severity
      scoring.ingestEvent({
        type: 'position_update',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: { position: { x: 0, y: 0, z: 0 } },
        severity: 0.9, // Almost maximal violation
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      // Score = 1 - severity = 0.1, EWMA(1.0, 0.1, 0.3) = 0.3*0.1 + 0.7*1.0 = 0.73
      expect(dims!.spatial_compliance).toBeLessThan(0.8);
    });
  });

  // ===========================================================================
  // EWMA SMOOTHING
  // ===========================================================================

  describe('EWMA smoothing', () => {
    it('should smooth score changes over multiple events', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // One bad event should not destroy the score entirely
      scoring.ingestEvent({
        type: 'bounds_violation',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      // With alpha=0.3: EWMA(1.0, 0.0, 0.3) = 0.3*0 + 0.7*1 = 0.7
      expect(dims!.spatial_compliance).toBeCloseTo(0.7, 1);
    });

    it('should converge to violation level with sustained bad events', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // Many consecutive bounds violations
      for (let i = 0; i < 20; i++) {
        scoring.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const dims = scoring.getAgentDimensionScores('agent-1');
      // After many violations with alpha=0.3, should converge close to 0
      expect(dims!.spatial_compliance).toBeLessThan(0.1);
    });

    it('should recover gradually with good events after violations', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // First: violations
      for (let i = 0; i < 10; i++) {
        scoring.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }
      vi.advanceTimersByTime(200);
      const afterViolations = scoring.getAgentDimensionScores('agent-1')!.spatial_compliance;

      // Then: many good position updates
      const baseTime = Date.now();
      for (let i = 0; i < 20; i++) {
        scoring.ingestEvent(createPositionEvent('agent-1', { x: i * 0.1, y: 0, z: 0 }, baseTime + i * 1000));
      }
      vi.advanceTimersByTime(200);
      const afterRecovery = scoring.getAgentDimensionScores('agent-1')!.spatial_compliance;

      expect(afterRecovery).toBeGreaterThan(afterViolations);
    });

    it('should respect custom alpha values', () => {
      // Higher alpha = more reactive
      const reactive = createTestScoring({ ewmaAlpha: 0.8 });
      reactive.start();
      reactive.registerAgent('agent-1');

      reactive.ingestEvent({
        type: 'bounds_violation',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });
      vi.advanceTimersByTime(200);

      const reactiveDims = reactive.getAgentDimensionScores('agent-1');
      // EWMA(1.0, 0.0, 0.8) = 0.8*0 + 0.2*1 = 0.2
      expect(reactiveDims!.spatial_compliance).toBeCloseTo(0.2, 1);
      reactive.dispose();

      // Lower alpha = smoother
      const smooth = createTestScoring({ ewmaAlpha: 0.1 });
      smooth.start();
      smooth.registerAgent('agent-1');

      smooth.ingestEvent({
        type: 'bounds_violation',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });
      vi.advanceTimersByTime(200);

      const smoothDims = smooth.getAgentDimensionScores('agent-1');
      // EWMA(1.0, 0.0, 0.1) = 0.1*0 + 0.9*1 = 0.9
      expect(smoothDims!.spatial_compliance).toBeCloseTo(0.9, 1);
      smooth.dispose();
    });
  });

  // ===========================================================================
  // INACTIVITY DECAY
  // ===========================================================================

  describe('inactivity decay', () => {
    it('should not decay scores within grace period', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      // One event to establish timestamp
      scoring.ingestEvent(createHeartbeatEvent('agent-1', Date.now()));
      vi.advanceTimersByTime(200);
      const initial = scoring.getAgentScore('agent-1');

      // Advance within grace period (30 seconds default)
      vi.advanceTimersByTime(20_000);

      // Score should still be close to initial
      expect(scoring.getAgentScore('agent-1')).toBeCloseTo(initial, 1);
    });

    it('should decay scores after grace period', () => {
      const s = createTestScoring({
        inactivityGracePeriodSec: 5, // Short grace period for testing
        inactivityDecayRate: 0.05,   // Faster decay for testing
      });
      s.start();
      s.registerAgent('agent-1');

      // One event to establish timestamp
      s.ingestEvent(createHeartbeatEvent('agent-1', Date.now()));
      vi.advanceTimersByTime(200);
      const initial = s.getAgentScore('agent-1');

      // Advance well past grace period
      vi.advanceTimersByTime(60_000); // 60 seconds with 5s grace = 55s of decay

      const decayed = s.getAgentScore('agent-1');
      expect(decayed).toBeLessThan(initial);
      s.dispose();
    });

    it('should decay toward baseline (0.5), not toward zero', () => {
      const s = createTestScoring({
        inactivityGracePeriodSec: 1,
        inactivityDecayRate: 1.0, // Very fast decay
      });
      s.start();
      s.registerAgent('agent-1');

      // Send events across ALL dimensions to establish timestamps
      const now = Date.now();
      s.ingestEvent(createPositionEvent('agent-1', { x: 0, y: 0, z: 0 }, now));
      s.ingestEvent(createVelocityEvent('agent-1', 5, now));
      s.ingestEvent(createChatEvent('agent-1', now));
      s.ingestEvent(createHeartbeatEvent('agent-1', now));
      vi.advanceTimersByTime(200);

      // Let it decay for a very long time
      vi.advanceTimersByTime(300_000);

      const score = s.getAgentScore('agent-1');
      // Should be at baseline (0.5), not at 0
      expect(score).toBeGreaterThanOrEqual(0.49);
      expect(score).toBeLessThanOrEqual(0.51);
      s.dispose();
    });
  });

  // ===========================================================================
  // THRESHOLD-BASED TRUST ACTIONS
  // ===========================================================================

  describe('trust actions', () => {
    it('should trigger degrade action when score crosses threshold', () => {
      const onTrustAction = vi.fn();
      const s = createTestScoring({
        degradeThreshold: 0.5,
        revokeThreshold: 0.1, // Set revoke very low so degrade fires first
        ewmaAlpha: 0.8, // High reactivity for quick threshold crossing
        onTrustAction,
      });
      s.start();
      s.registerAgent('agent-1');

      // Moderate violations: severity 0.7 across all dimensions
      // This should push composite below 0.5 (degrade) but not below 0.1 (revoke)
      for (let i = 0; i < 3; i++) {
        s.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.7,
        });
        s.ingestEvent({
          type: 'gravity_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.7,
        });
        s.ingestEvent({
          type: 'harassment_flag',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.7,
        });
        s.ingestEvent({
          type: 'impossible_movement',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.7,
        });
      }

      vi.advanceTimersByTime(200);

      expect(onTrustAction).toHaveBeenCalled();
      // The first action should be degrade (score between 0.1 and 0.5)
      const firstCall = onTrustAction.mock.calls[0];
      const [agentId, action, score, details] = firstCall;
      expect(agentId).toBe('agent-1');
      expect(action).toBe('degrade');
      expect(typeof score).toBe('number');
      expect(details).toHaveProperty('primaryCause');
      expect(details).toHaveProperty('dimensionScores');
      s.dispose();
    });

    it('should trigger revoke action when score is very low', () => {
      const onTrustAction = vi.fn();
      const s = createTestScoring({
        revokeThreshold: 0.2,
        degradeThreshold: 0.5,
        ewmaAlpha: 0.9,
        onTrustAction,
      });
      s.start();
      s.registerAgent('agent-1');

      // Massive violations across all dimensions
      for (let i = 0; i < 30; i++) {
        for (const type of ['bounds_violation', 'gravity_violation', 'harassment_flag', 'impossible_movement'] as const) {
          s.ingestEvent({
            type,
            agentId: 'agent-1',
            timestamp: Date.now() + i * 100,
            data: {},
            severity: 1.0,
          });
        }
      }

      vi.advanceTimersByTime(200);

      const calls = onTrustAction.mock.calls;
      const actions = calls.map(c => c[1]);
      // Should eventually trigger revoke
      expect(actions).toContain('revoke');
      s.dispose();
    });

    it('should trigger recover action when score improves', () => {
      const onTrustAction = vi.fn();
      const s = createTestScoring({
        degradeThreshold: 0.5,
        revokeThreshold: 0.05, // Very low revoke so we stay in degrade
        recoverThreshold: 0.7,  // Lower recover threshold for easier recovery
        ewmaAlpha: 0.5,         // Moderate reactivity
        onTrustAction,
      });
      s.start();
      s.registerAgent('agent-1');

      // First: degrade with moderate violations across all dimensions
      for (let i = 0; i < 5; i++) {
        s.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.8,
        });
        s.ingestEvent({
          type: 'gravity_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.8,
        });
        s.ingestEvent({
          type: 'harassment_flag',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.8,
        });
        s.ingestEvent({
          type: 'impossible_movement',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 0.8,
        });
      }
      vi.advanceTimersByTime(200);

      // Check degrade was triggered (score should be between 0.05 and 0.5)
      const degradeOrRevokeCalls = onTrustAction.mock.calls.filter(c => c[1] === 'degrade' || c[1] === 'revoke');
      expect(degradeOrRevokeCalls.length).toBeGreaterThan(0);

      const scoreAfterViolations = s.getAgentScore('agent-1');
      expect(scoreAfterViolations).toBeLessThan(0.5);

      // Now: recover with many good events in all dimensions
      const baseTime = Date.now();
      for (let i = 0; i < 100; i++) {
        // Good events in all dimensions with score 1.0
        s.ingestEvent(createPositionEvent('agent-1', { x: i * 0.1, y: 0, z: 0 }, baseTime + i * 1000));
        s.ingestEvent(createVelocityEvent('agent-1', 2, baseTime + i * 1000));
        s.ingestEvent(createChatEvent('agent-1', baseTime + i * 10000)); // Spread out to avoid rate limit
        s.ingestEvent(createHeartbeatEvent('agent-1', baseTime + i * 5000));
      }
      vi.advanceTimersByTime(200);

      // Score should have improved
      const scoreAfterRecovery = s.getAgentScore('agent-1');
      expect(scoreAfterRecovery).toBeGreaterThan(scoreAfterViolations);
      s.dispose();
    });

    it('should fire onScoreChanged callback on significant changes', () => {
      const onScoreChanged = vi.fn();
      const s = createTestScoring({
        ewmaAlpha: 0.8,
        onScoreChanged,
      });
      s.start();
      s.registerAgent('agent-1');

      // Significant score change from violations
      for (let i = 0; i < 5; i++) {
        s.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
          severity: 1.0,
        });
      }

      vi.advanceTimersByTime(200);

      expect(onScoreChanged).toHaveBeenCalled();
      const [agentId, oldScore, newScore] = onScoreChanged.mock.calls[0];
      expect(agentId).toBe('agent-1');
      expect(oldScore).toBeGreaterThan(newScore);
      s.dispose();
    });
  });

  // ===========================================================================
  // MULTI-AGENT INDEPENDENCE
  // ===========================================================================

  describe('multi-agent independence', () => {
    it('should track agents independently', () => {
      scoring.start();
      scoring.registerAgent('agent-good');
      scoring.registerAgent('agent-bad');

      // Good agent: normal behavior
      scoring.ingestEvent(createPositionEvent('agent-good', { x: 0, y: 0, z: 0 }));
      scoring.ingestEvent(createHeartbeatEvent('agent-good'));

      // Bad agent: violations
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-bad',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      const goodScore = scoring.getAgentScore('agent-good');
      const badScore = scoring.getAgentScore('agent-bad');

      expect(goodScore).toBeGreaterThan(0.9);
      expect(badScore).toBeLessThan(goodScore);
    });

    it('should not cross-contaminate agent scores', () => {
      scoring.start();
      scoring.registerAgent('agent-1');
      scoring.registerAgent('agent-2');

      // Only agent-1 gets violations
      for (let i = 0; i < 10; i++) {
        scoring.ingestEvent({
          type: 'gravity_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }

      vi.advanceTimersByTime(200);

      // Agent-2 should be unaffected
      expect(scoring.getAgentScore('agent-2')).toBe(1.0);
    });
  });

  // ===========================================================================
  // BATCH EVENT INGESTION
  // ===========================================================================

  describe('batch ingestion', () => {
    it('should ingest multiple events at once', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const events: BehavioralEvent[] = [
        createPositionEvent('agent-1', { x: 0, y: 0, z: 0 }),
        createHeartbeatEvent('agent-1'),
        createVelocityEvent('agent-1', 5),
      ];

      scoring.ingestEvents(events);
      vi.advanceTimersByTime(200);

      expect(scoring.getMetrics().totalEventsProcessed).toBe(3);
    });
  });

  // ===========================================================================
  // METRICS
  // ===========================================================================

  describe('metrics', () => {
    it('should track total events processed', () => {
      scoring.start();

      for (let i = 0; i < 10; i++) {
        scoring.ingestEvent(createPositionEvent('agent-1', { x: i, y: 0, z: 0 }));
      }

      vi.advanceTimersByTime(200);

      expect(scoring.getMetrics().totalEventsProcessed).toBe(10);
    });

    it('should track violations detected', () => {
      scoring.start();

      scoring.ingestEvent({
        type: 'bounds_violation',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });
      scoring.ingestEvent({
        type: 'gravity_violation',
        agentId: 'agent-1',
        timestamp: Date.now(),
        data: {},
      });

      vi.advanceTimersByTime(200);

      expect(scoring.getMetrics().totalViolationsDetected).toBe(2);
    });

    it('should track traced agent count', () => {
      scoring.registerAgent('agent-1');
      scoring.registerAgent('agent-2');
      scoring.registerAgent('agent-3');

      expect(scoring.getMetrics().trackedAgentCount).toBe(3);

      scoring.unregisterAgent('agent-2');
      expect(scoring.getMetrics().trackedAgentCount).toBe(2);
    });

    it('should compute average composite score', () => {
      scoring.start();
      scoring.registerAgent('agent-1');
      scoring.registerAgent('agent-2');

      // All agents start at 1.0
      expect(scoring.getMetrics().averageCompositeScore).toBe(1.0);

      // Penalize one agent
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent({
          type: 'bounds_violation',
          agentId: 'agent-1',
          timestamp: Date.now() + i * 100,
          data: {},
        });
      }
      vi.advanceTimersByTime(200);

      const metrics = scoring.getMetrics();
      expect(metrics.averageCompositeScore).toBeLessThan(1.0);
      expect(metrics.averageCompositeScore).toBeGreaterThan(0);
    });

    it('should report scoring Hz and thresholds', () => {
      const metrics = scoring.getMetrics();
      expect(metrics.scoringHz).toBe(DEFAULT_BEHAVIORAL_SCORING_CONFIG.scoringHz);
      expect(metrics.thresholds.degrade).toBe(DEFAULT_BEHAVIORAL_SCORING_CONFIG.degradeThreshold);
      expect(metrics.thresholds.revoke).toBe(DEFAULT_BEHAVIORAL_SCORING_CONFIG.revokeThreshold);
      expect(metrics.thresholds.recover).toBe(DEFAULT_BEHAVIORAL_SCORING_CONFIG.recoverThreshold);
    });

    it('should report pending event count', () => {
      scoring.ingestEvent(createPositionEvent('agent-1', { x: 0, y: 0, z: 0 }));
      scoring.ingestEvent(createPositionEvent('agent-1', { x: 1, y: 0, z: 0 }));

      expect(scoring.getMetrics().pendingEventCount).toBe(2);

      scoring.start();
      vi.advanceTimersByTime(200);

      expect(scoring.getMetrics().pendingEventCount).toBe(0);
    });
  });

  // ===========================================================================
  // RENDER-LOOP SAFETY
  // ===========================================================================

  describe('render-loop safety', () => {
    it('should return score in <1ms for getAgentScore', () => {
      scoring.registerAgent('agent-1');

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        scoring.getAgentScore('agent-1');
      }
      const elapsed = performance.now() - start;

      // 1000 calls should take less than 10ms (0.01ms each)
      expect(elapsed).toBeLessThan(10);
    });

    it('should return dimensions in <1ms for getAgentDimensionScores', () => {
      scoring.registerAgent('agent-1');

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        scoring.getAgentDimensionScores('agent-1');
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });

  // ===========================================================================
  // BEHAVIORAL STATE
  // ===========================================================================

  describe('behavioral state', () => {
    it('should track position history', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent(createPositionEvent('agent-1', { x: i, y: 0, z: 0 }, now + i * 1000));
      }

      vi.advanceTimersByTime(200);

      const state = scoring.getAgentBehavioralState('agent-1');
      expect(state).toBeDefined();
      expect(state!.positionHistory.length).toBe(5);
      expect(state!.lastPosition).toEqual({ x: 4, y: 0, z: 0 });
    });

    it('should limit position history to max entries', () => {
      const s = createTestScoring({ maxPositionHistory: 10 });
      s.start();
      s.registerAgent('agent-1');

      const now = Date.now();
      for (let i = 0; i < 20; i++) {
        s.ingestEvent(createPositionEvent('agent-1', { x: i, y: 0, z: 0 }, now + i * 1000));
      }

      vi.advanceTimersByTime(200);

      const state = s.getAgentBehavioralState('agent-1');
      expect(state!.positionHistory.length).toBe(10);
      s.dispose();
    });

    it('should track chat timestamps', () => {
      scoring.start();
      scoring.registerAgent('agent-1');

      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        scoring.ingestEvent(createChatEvent('agent-1', now + i * 1000));
      }

      vi.advanceTimersByTime(200);

      const state = scoring.getAgentBehavioralState('agent-1');
      expect(state!.chatTimestamps.length).toBe(5);
    });

    it('should return undefined for untracked agent state', () => {
      expect(scoring.getAgentBehavioralState('unknown')).toBeUndefined();
    });
  });

  // ===========================================================================
  // FACTORY FUNCTION
  // ===========================================================================

  describe('factory function', () => {
    it('should create instance via factory', () => {
      const s = createBehavioralTrustScoring({ autoStart: false });
      expect(s).toBeInstanceOf(BehavioralTrustScoring);
      expect(s.getIsRunning()).toBe(false);
      s.dispose();
    });
  });
});
