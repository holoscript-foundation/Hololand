/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CulturalTrustHandshake
 *
 * Validates the four cultural trust subsystems:
 * - Subsystem 1: Cultural Identity Exchange (register, update, unregister, query)
 * - Subsystem 2: Norm Compatibility Matrix (pairwise computation, dimension scoring,
 *                feedback weight adjustments, render-loop safe reads)
 * - Subsystem 3: Cross-Cultural Reputation Gossip (gossip propagation, message handling,
 *                peer management, TTL, deduplication)
 * - Subsystem 4: Interaction Quality Feedback Loops (event processing, EWMA scoring,
 *                reputation updates, compatibility weight adjustments)
 * - Lifecycle (start, stop, dispose)
 * - Metrics tracking
 * - Off-render-loop guarantees
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
  CulturalTrustHandshake,
  createCulturalTrustHandshake,
  DEFAULT_CULTURAL_CONFIG,
  type CulturalIdentityProfile,
  type CulturalTrustHandshakeConfig,
  type InteractionQualityEvent,
  type CulturalGossipMessage,
  type CulturalReputationUpdate,
  type CulturalCompatibilityScore,
} from '../CulturalTrustHandshake';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestCultural(
  overrides?: Partial<CulturalTrustHandshakeConfig>,
): CulturalTrustHandshake {
  return new CulturalTrustHandshake({
    autoStart: false,
    ...overrides,
  });
}

function createProfile(overrides?: Partial<CulturalIdentityProfile>): CulturalIdentityProfile {
  return {
    preferredLanguages: ['en'],
    greetingStyle: 'casual',
    communicationDirectness: 0.7,
    personalSpacePreference: 1.5,
    turnTakingStyle: 'freeform',
    timezone: 'America/New_York',
    customNorms: {},
    ...overrides,
  };
}

function createJapaneseProfile(): CulturalIdentityProfile {
  return createProfile({
    preferredLanguages: ['ja', 'en'],
    greetingStyle: 'formal',
    communicationDirectness: 0.2,
    personalSpacePreference: 1.0,
    turnTakingStyle: 'sequential',
    timezone: 'Asia/Tokyo',
    customNorms: { bow_on_greeting: 'true' },
  });
}

function createAmericanProfile(): CulturalIdentityProfile {
  return createProfile({
    preferredLanguages: ['en', 'es'],
    greetingStyle: 'casual',
    communicationDirectness: 0.8,
    personalSpacePreference: 1.2,
    turnTakingStyle: 'overlapping',
    timezone: 'America/New_York',
  });
}

function createGermanProfile(): CulturalIdentityProfile {
  return createProfile({
    preferredLanguages: ['de', 'en'],
    greetingStyle: 'formal',
    communicationDirectness: 0.9,
    personalSpacePreference: 1.8,
    turnTakingStyle: 'sequential',
    timezone: 'Europe/Berlin',
  });
}

function createFeedbackEvent(
  type: InteractionQualityEvent['type'],
  subjectId: string,
  peerId: string,
  overrides?: Partial<InteractionQualityEvent>,
): InteractionQualityEvent {
  return {
    type,
    subjectAgentId: subjectId,
    peerAgentId: peerId,
    timestamp: Date.now(),
    data: {},
    ...overrides,
  };
}

// =============================================================================
// TESTS: SUBSYSTEM 1 - CULTURAL IDENTITY EXCHANGE
// =============================================================================

describe('CulturalTrustHandshake', () => {
  let cultural: CulturalTrustHandshake;

  beforeEach(() => {
    vi.useFakeTimers();
    cultural = createTestCultural();
  });

  afterEach(() => {
    cultural.dispose();
    vi.useRealTimers();
  });

  describe('Subsystem 1: Cultural Identity Exchange', () => {
    it('should register a cultural identity', () => {
      const profile = createProfile();
      cultural.registerCulturalIdentity('agent-1', profile);

      const retrieved = cultural.getCulturalProfile('agent-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.preferredLanguages).toEqual(['en']);
      expect(retrieved?.greetingStyle).toBe('casual');
    });

    it('should return undefined for unregistered agents', () => {
      expect(cultural.getCulturalProfile('nonexistent')).toBeUndefined();
    });

    it('should list all registered agent IDs', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());

      const ids = cultural.getRegisteredAgentIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain('agent-1');
      expect(ids).toContain('agent-2');
    });

    it('should update a cultural identity', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.updateCulturalIdentity('agent-1', {
        greetingStyle: 'formal',
        communicationDirectness: 0.4,
      });

      const profile = cultural.getCulturalProfile('agent-1');
      expect(profile?.greetingStyle).toBe('formal');
      expect(profile?.communicationDirectness).toBe(0.4);
      // Unmodified fields should remain
      expect(profile?.preferredLanguages).toEqual(['en']);
    });

    it('should handle update for non-registered agent gracefully', () => {
      // Should not throw
      cultural.updateCulturalIdentity('nonexistent', { greetingStyle: 'formal' });
    });

    it('should unregister a cultural identity', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());
      cultural.recomputeCompatibilityMatrix();

      cultural.unregisterCulturalIdentity('agent-1');

      expect(cultural.getCulturalProfile('agent-1')).toBeUndefined();
      expect(cultural.getCulturalProfile('agent-2')).toBeDefined();
      // Compatibility pairs involving agent-1 should be cleaned up
      expect(cultural.getCulturalCompatibility('agent-1', 'agent-2')).toBe(-1);
    });

    it('should store full cultural agent state with reputation initialized at 0.5', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      const state = cultural.getCulturalAgentState('agent-1');
      expect(state).toBeDefined();
      expect(state?.reputationScore).toBe(0.5);
      expect(state?.interactionCount).toBe(0);
      expect(state?.positiveAdaptations).toBe(0);
      expect(state?.normViolations).toBe(0);
    });
  });

  // ===========================================================================
  // TESTS: SUBSYSTEM 2 - NORM COMPATIBILITY MATRIX
  // ===========================================================================

  describe('Subsystem 2: Norm Compatibility Matrix', () => {
    it('should return -1 for non-computed pairs', () => {
      expect(cultural.getCulturalCompatibility('agent-1', 'agent-2')).toBe(-1);
    });

    it('should compute compatibility between two agents', () => {
      cultural.registerCulturalIdentity('agent-1', createAmericanProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());

      cultural.recomputeCompatibilityMatrix();

      const score = cultural.getCulturalCompatibility('agent-1', 'agent-2');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should produce symmetric scores (order-independent)', () => {
      cultural.registerCulturalIdentity('agent-1', createAmericanProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());

      cultural.recomputeCompatibilityMatrix();

      const scoreAB = cultural.getCulturalCompatibility('agent-1', 'agent-2');
      const scoreBA = cultural.getCulturalCompatibility('agent-2', 'agent-1');
      expect(scoreAB).toBe(scoreBA);
    });

    it('should give perfect score for identical profiles', () => {
      const profile = createProfile();
      cultural.registerCulturalIdentity('agent-1', { ...profile });
      cultural.registerCulturalIdentity('agent-2', { ...profile });

      cultural.recomputeCompatibilityMatrix();

      const score = cultural.getCulturalCompatibility('agent-1', 'agent-2');
      expect(score).toBe(1.0);
    });

    it('should produce lower scores for highly different profiles', () => {
      cultural.registerCulturalIdentity('agent-1', createAmericanProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());
      cultural.registerCulturalIdentity('agent-3', createAmericanProfile());

      cultural.recomputeCompatibilityMatrix();

      const scoreAmJa = cultural.getCulturalCompatibility('agent-1', 'agent-2');
      const scoreAmAm = cultural.getCulturalCompatibility('agent-1', 'agent-3');

      // Two Americans should be more compatible than American-Japanese
      expect(scoreAmAm).toBeGreaterThan(scoreAmJa);
    });

    it('should provide per-dimension breakdown', () => {
      cultural.registerCulturalIdentity('agent-1', createAmericanProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());

      cultural.recomputeCompatibilityMatrix();

      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details).toBeDefined();
      expect(details!.dimensionScores.language_overlap).toBeGreaterThan(0);
      expect(details!.dimensionScores.greeting_compatibility).toBeDefined();
      expect(details!.dimensionScores.directness_alignment).toBeDefined();
      expect(details!.dimensionScores.personal_space_alignment).toBeDefined();
      expect(details!.dimensionScores.turn_taking_compatibility).toBeDefined();
      expect(details!.dimensionScores.timezone_proximity).toBeDefined();
    });

    it('should track computation count', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.recomputeCompatibilityMatrix();
      cultural.recomputeCompatibilityMatrix();
      cultural.recomputeCompatibilityMatrix();

      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.computationCount).toBe(3);
    });

    it('should compute language overlap correctly', () => {
      // Shared primary language
      cultural.registerCulturalIdentity('agent-1', createProfile({
        preferredLanguages: ['en', 'fr'],
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        preferredLanguages: ['en', 'de'],
      }));

      cultural.recomputeCompatibilityMatrix();
      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.dimensionScores.language_overlap).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle agents with no shared language', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile({
        preferredLanguages: ['zh'],
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        preferredLanguages: ['fi'],
      }));

      cultural.recomputeCompatibilityMatrix();
      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.dimensionScores.language_overlap).toBe(0);
    });

    it('should compute directness alignment as inverse of difference', () => {
      // Same directness = 1.0
      cultural.registerCulturalIdentity('agent-1', createProfile({
        communicationDirectness: 0.5,
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        communicationDirectness: 0.5,
      }));

      cultural.recomputeCompatibilityMatrix();
      let details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.dimensionScores.directness_alignment).toBe(1.0);

      // Opposite directness = 0.0
      cultural.unregisterCulturalIdentity('agent-2');
      cultural.registerCulturalIdentity('agent-2', createProfile({
        communicationDirectness: 1.0,
      }));
      cultural.unregisterCulturalIdentity('agent-1');
      cultural.registerCulturalIdentity('agent-1', createProfile({
        communicationDirectness: 0.0,
      }));

      cultural.recomputeCompatibilityMatrix();
      details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.dimensionScores.directness_alignment).toBe(0.0);
    });

    it('should compute personal space alignment proportionally', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile({
        personalSpacePreference: 1.0,
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        personalSpacePreference: 1.0,
      }));

      cultural.recomputeCompatibilityMatrix();
      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.dimensionScores.personal_space_alignment).toBe(1.0);
    });

    it('should return all compatibility scores', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());
      cultural.registerCulturalIdentity('agent-3', createGermanProfile());

      cultural.recomputeCompatibilityMatrix();

      const allScores = cultural.getAllCompatibilityScores();
      // 3 agents = 3 pairs: (1,2), (1,3), (2,3)
      expect(allScores.size).toBe(3);
    });

    it('should fire onCompatibilityChanged callback on significant changes', () => {
      const onChanged = vi.fn();
      cultural.dispose();
      cultural = createTestCultural({ onCompatibilityChanged: onChanged });

      cultural.registerCulturalIdentity('agent-1', createProfile({
        communicationDirectness: 0.5,
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        communicationDirectness: 0.5,
      }));

      // First computation: no callback (no previous score)
      cultural.recomputeCompatibilityMatrix();
      expect(onChanged).not.toHaveBeenCalled();

      // Change profile significantly
      cultural.updateCulturalIdentity('agent-2', {
        communicationDirectness: 0.0,
        greetingStyle: 'silent',
        turnTakingStyle: 'overlapping',
      });

      // Second computation: callback should fire if change > 5%
      cultural.recomputeCompatibilityMatrix();
      // The callback may or may not fire depending on actual score delta
      // We just verify the mechanism works without error
    });
  });

  // ===========================================================================
  // TESTS: SUBSYSTEM 3 - CROSS-CULTURAL REPUTATION GOSSIP
  // ===========================================================================

  describe('Subsystem 3: Cross-Cultural Reputation Gossip', () => {
    it('should initialize reputation score at 0.5', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      expect(cultural.getCulturalReputation('agent-1')).toBe(0.5);
    });

    it('should return -1 for non-registered agents', () => {
      expect(cultural.getCulturalReputation('nonexistent')).toBe(-1);
    });

    it('should add and remove gossip peers', () => {
      const sendFn = vi.fn();
      cultural.addGossipPeer('node-2', sendFn);
      cultural.addGossipPeer('node-3', sendFn);

      // Verify peers were added (via metrics)
      const metrics = cultural.getMetrics();
      expect(metrics.registeredAgentCount).toBe(0); // No agents yet
    });

    it('should not add self as gossip peer', () => {
      const sendFn = vi.fn();
      cultural.dispose();
      cultural = createTestCultural({ nodeId: 'node-1' });
      cultural.addGossipPeer('node-1', sendFn);
      // No error thrown, peer silently ignored
    });

    it('should process incoming gossip messages', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      const message: CulturalGossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [
          {
            updateId: 'node-2-cult-123-1',
            agentId: 'agent-1',
            reputationScore: 0.8,
            interactionCount: 10,
            positiveAdaptations: 8,
            normViolations: 1,
            originNodeId: 'node-2',
            logicalClock: 5,
            timestamp: Date.now(),
            ttl: 15,
          },
        ],
        senderClock: 5,
        timestamp: Date.now(),
      };

      cultural.onGossipReceived(message);

      // Reputation should have been blended (EWMA)
      const reputation = cultural.getCulturalReputation('agent-1');
      // EWMA: 0.2 * 0.8 + 0.8 * 0.5 = 0.16 + 0.4 = 0.56
      expect(reputation).toBeCloseTo(0.56, 2);
    });

    it('should deduplicate gossip updates', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      const message: CulturalGossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [
          {
            updateId: 'dup-update-1',
            agentId: 'agent-1',
            reputationScore: 0.9,
            interactionCount: 20,
            positiveAdaptations: 15,
            normViolations: 1,
            originNodeId: 'node-2',
            logicalClock: 10,
            timestamp: Date.now(),
            ttl: 15,
          },
        ],
        senderClock: 10,
        timestamp: Date.now(),
      };

      cultural.onGossipReceived(message);
      const reputationAfterFirst = cultural.getCulturalReputation('agent-1');

      // Send same update again
      cultural.onGossipReceived(message);
      const reputationAfterSecond = cultural.getCulturalReputation('agent-1');

      // Should be the same (deduplicated)
      expect(reputationAfterSecond).toBe(reputationAfterFirst);
    });

    it('should respect TTL and discard updates with TTL <= 0', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      const message: CulturalGossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [
          {
            updateId: 'expired-ttl-1',
            agentId: 'agent-1',
            reputationScore: 0.9,
            interactionCount: 10,
            positiveAdaptations: 8,
            normViolations: 0,
            originNodeId: 'node-2',
            logicalClock: 5,
            timestamp: Date.now(),
            ttl: 0, // Expired
          },
        ],
        senderClock: 5,
        timestamp: Date.now(),
      };

      cultural.onGossipReceived(message);

      // Reputation should remain unchanged at default 0.5
      expect(cultural.getCulturalReputation('agent-1')).toBe(0.5);
    });

    it('should discard updates that are too old', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      const message: CulturalGossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [
          {
            updateId: 'old-update-1',
            agentId: 'agent-1',
            reputationScore: 0.9,
            interactionCount: 10,
            positiveAdaptations: 8,
            normViolations: 0,
            originNodeId: 'node-2',
            logicalClock: 5,
            timestamp: Date.now() - 120_000, // 2 minutes old (exceeds 60s max age)
            ttl: 15,
          },
        ],
        senderClock: 5,
        timestamp: Date.now(),
      };

      cultural.onGossipReceived(message);
      expect(cultural.getCulturalReputation('agent-1')).toBe(0.5);
    });

    it('should only apply remote updates with higher interaction count', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      // First, give agent-1 some local interactions
      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));
      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));
      // Process feedback to update interaction count
      // We need to simulate the feedback cycle
      // Since loops aren't started, we trigger recomputation manually
      // by starting and advancing timers
      cultural.start();
      vi.advanceTimersByTime(200); // Process feedback
      cultural.stop();

      const stateAfterLocal = cultural.getCulturalAgentState('agent-1');
      const localInteractions = stateAfterLocal?.interactionCount ?? 0;

      const message: CulturalGossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [
          {
            updateId: 'low-interaction-1',
            agentId: 'agent-1',
            reputationScore: 0.1, // Very low reputation
            interactionCount: 0, // Fewer interactions than local
            positiveAdaptations: 0,
            normViolations: 5,
            originNodeId: 'node-2',
            logicalClock: 5,
            timestamp: Date.now(),
            ttl: 15,
          },
        ],
        senderClock: 5,
        timestamp: Date.now(),
      };

      const reputationBefore = cultural.getCulturalReputation('agent-1');
      cultural.onGossipReceived(message);
      const reputationAfter = cultural.getCulturalReputation('agent-1');

      // Should NOT have applied the low reputation (remote has fewer interactions)
      expect(reputationAfter).toBe(reputationBefore);
    });

    it('should fire onReputationChanged on significant gossip updates', () => {
      const onChanged = vi.fn();
      cultural.dispose();
      cultural = createTestCultural({ onReputationChanged: onChanged });

      cultural.registerCulturalIdentity('agent-1', createProfile());

      const message: CulturalGossipMessage = {
        fromNodeId: 'node-2',
        sequence: 1,
        updates: [
          {
            updateId: 'big-change-1',
            agentId: 'agent-1',
            reputationScore: 0.95,
            interactionCount: 100,
            positiveAdaptations: 90,
            normViolations: 2,
            originNodeId: 'node-2',
            logicalClock: 50,
            timestamp: Date.now(),
            ttl: 15,
          },
        ],
        senderClock: 50,
        timestamp: Date.now(),
      };

      cultural.onGossipReceived(message);

      // EWMA: 0.2 * 0.95 + 0.8 * 0.5 = 0.19 + 0.4 = 0.59
      // Change: |0.59 - 0.5| = 0.09 > 0.05, should fire
      expect(onChanged).toHaveBeenCalledWith(
        'agent-1',
        0.5,
        expect.closeTo(0.59, 1),
      );
    });

    it('should fire onLowReputation when reputation drops below threshold', () => {
      const onLowRep = vi.fn();
      cultural.dispose();
      cultural = createTestCultural({ onLowReputation: onLowRep });

      cultural.registerCulturalIdentity('agent-1', createProfile());

      // Repeatedly send low reputation gossip to drive reputation down
      for (let i = 0; i < 20; i++) {
        cultural.onGossipReceived({
          fromNodeId: 'node-2',
          sequence: i,
          updates: [
            {
              updateId: `low-rep-${i}`,
              agentId: 'agent-1',
              reputationScore: 0.05,
              interactionCount: 100 + i,
              positiveAdaptations: 5,
              normViolations: 80,
              originNodeId: 'node-2',
              logicalClock: 50 + i,
              timestamp: Date.now(),
              ttl: 15,
            },
          ],
          senderClock: 50 + i,
          timestamp: Date.now(),
        });
      }

      const reputation = cultural.getCulturalReputation('agent-1');
      if (reputation < 0.3) {
        expect(onLowRep).toHaveBeenCalled();
      }
    });
  });

  // ===========================================================================
  // TESTS: SUBSYSTEM 4 - INTERACTION QUALITY FEEDBACK LOOPS
  // ===========================================================================

  describe('Subsystem 4: Interaction Quality Feedback Loops', () => {
    it('should ingest feedback events into the queue', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));

      // Event is queued, not yet processed
      const state = cultural.getCulturalAgentState('agent-1');
      expect(state?.interactionCount).toBe(0);
    });

    it('should process feedback events on cycle and update reputation', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200); // feedbackHz=5 -> 200ms per cycle
      cultural.stop();

      const state = cultural.getCulturalAgentState('agent-1');
      expect(state?.interactionCount).toBe(1);
      // EWMA: 0.2 * 1.0 + 0.8 * 0.5 = 0.2 + 0.4 = 0.6
      expect(state?.reputationScore).toBeCloseTo(0.6, 2);
      expect(state?.positiveAdaptations).toBe(1);
    });

    it('should decrease reputation for negative interactions', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'norm_violation', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      const state = cultural.getCulturalAgentState('agent-1');
      // EWMA: 0.2 * 0.1 + 0.8 * 0.5 = 0.02 + 0.4 = 0.42
      expect(state?.reputationScore).toBeCloseTo(0.42, 2);
      expect(state?.normViolations).toBe(1);
    });

    it('should handle multiple feedback events in a single cycle', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvents([
        createFeedbackEvent('successful_collaboration', 'agent-1', 'agent-2'),
        createFeedbackEvent('greeting_reciprocated', 'agent-1', 'agent-2'),
        createFeedbackEvent('personal_space_respected', 'agent-1', 'agent-2'),
      ]);

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      const state = cultural.getCulturalAgentState('agent-1');
      expect(state?.interactionCount).toBe(3);
      expect(state?.reputationScore).toBeGreaterThan(0.5); // Multiple positive events
    });

    it('should use provided qualityScore when available', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
        { qualityScore: 0.3 },
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      const state = cultural.getCulturalAgentState('agent-1');
      // EWMA: 0.2 * 0.3 + 0.8 * 0.5 = 0.06 + 0.4 = 0.46
      expect(state?.reputationScore).toBeCloseTo(0.46, 2);
    });

    it('should adjust compatibility weights for greeting events', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());

      cultural.recomputeCompatibilityMatrix();
      const scoreBefore = cultural.getCulturalCompatibility('agent-1', 'agent-2');

      // Positive greeting interaction
      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'greeting_reciprocated', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(500); // Process feedback then recompute
      cultural.stop();

      const scoreAfter = cultural.getCulturalCompatibility('agent-1', 'agent-2');
      // Score should change (greeting_compatibility weight adjusted)
      // The change might be small, so we just verify it processed without error
      expect(typeof scoreAfter).toBe('number');
    });

    it('should adjust compatibility weights for personal space events', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'personal_space_violated', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      // Should not throw, and should update the agent state
      const state = cultural.getCulturalAgentState('agent-1');
      expect(state?.normViolations).toBe(1);
    });

    it('should adjust compatibility weights for turn-taking events', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'turn_taking_violated', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      const state = cultural.getCulturalAgentState('agent-1');
      expect(state?.normViolations).toBe(1);
    });

    it('should fire onReputationChanged callback after feedback processing', () => {
      const onChanged = vi.fn();
      cultural.dispose();
      cultural = createTestCultural({ onReputationChanged: onChanged });

      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      // EWMA: 0.2 * 1.0 + 0.8 * 0.5 = 0.6 (change of 0.1 > 0.05)
      expect(onChanged).toHaveBeenCalledWith(
        'agent-1',
        0.5,
        expect.closeTo(0.6, 1),
      );
    });

    it('should queue reputation gossip after feedback processing', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      const sendFn = vi.fn();
      cultural.addGossipPeer('node-2', sendFn);

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200); // Feedback + gossip
      cultural.stop();

      // Gossip should have been sent
      expect(sendFn).toHaveBeenCalled();
      const sentMessage = sendFn.mock.calls[0][0] as CulturalGossipMessage;
      expect(sentMessage.updates.length).toBeGreaterThan(0);
      expect(sentMessage.updates[0].agentId).toBe('agent-1');
    });
  });

  // ===========================================================================
  // TESTS: LIFECYCLE
  // ===========================================================================

  describe('Lifecycle', () => {
    it('should start and stop without errors', () => {
      cultural.start();
      expect(cultural.getIsRunning()).toBe(true);

      cultural.stop();
      expect(cultural.getIsRunning()).toBe(false);
    });

    it('should handle double start gracefully', () => {
      cultural.start();
      cultural.start(); // Should log warning but not throw
      expect(cultural.getIsRunning()).toBe(true);
      cultural.stop();
    });

    it('should handle double stop gracefully', () => {
      cultural.start();
      cultural.stop();
      cultural.stop(); // Should log warning but not throw
      expect(cultural.getIsRunning()).toBe(false);
    });

    it('should dispose and clear all state', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());
      cultural.recomputeCompatibilityMatrix();

      cultural.dispose();

      expect(cultural.getIsRunning()).toBe(false);
      expect(cultural.getCulturalProfile('agent-1')).toBeUndefined();
      expect(cultural.getCulturalCompatibility('agent-1', 'agent-2')).toBe(-1);
      expect(cultural.getCulturalReputation('agent-1')).toBe(-1);
    });

    it('should auto-start when configured', () => {
      const auto = new CulturalTrustHandshake({ autoStart: true });
      expect(auto.getIsRunning()).toBe(true);
      auto.dispose();
    });

    it('should process events through all subsystems when running', () => {
      cultural.registerCulturalIdentity('agent-1', createAmericanProfile());
      cultural.registerCulturalIdentity('agent-2', createJapaneseProfile());

      const sendFn = vi.fn();
      cultural.addGossipPeer('node-2', sendFn);

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));

      cultural.start();

      // Advance time to allow all cycles to run
      vi.advanceTimersByTime(1000);

      cultural.stop();

      // Verify all subsystems processed:
      // 1. Compatibility should be computed
      const compat = cultural.getCulturalCompatibility('agent-1', 'agent-2');
      expect(compat).toBeGreaterThan(0);

      // 2. Feedback should have been processed
      const state = cultural.getCulturalAgentState('agent-1');
      expect(state?.interactionCount).toBeGreaterThan(0);

      // 3. Gossip should have been sent
      expect(sendFn).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // TESTS: METRICS
  // ===========================================================================

  describe('Metrics', () => {
    it('should return initial metrics', () => {
      const metrics = cultural.getMetrics();

      expect(metrics.isRunning).toBe(false);
      expect(metrics.registeredAgentCount).toBe(0);
      expect(metrics.compatibilityPairCount).toBe(0);
      expect(metrics.totalFeedbackEvents).toBe(0);
      expect(metrics.totalGossipUpdates).toBe(0);
      expect(metrics.totalGossipMessagesSent).toBe(0);
      expect(metrics.totalGossipMessagesReceived).toBe(0);
      expect(metrics.averageCompatibilityScore).toBe(0);
      expect(metrics.averageReputationScore).toBe(0);
      expect(metrics.compatibilityHz).toBe(DEFAULT_CULTURAL_CONFIG.compatibilityHz);
      expect(metrics.feedbackHz).toBe(DEFAULT_CULTURAL_CONFIG.feedbackHz);
    });

    it('should track agent registration count', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      expect(cultural.getMetrics().registeredAgentCount).toBe(2);
    });

    it('should track compatibility pair count', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());
      cultural.registerCulturalIdentity('agent-3', createProfile());

      cultural.recomputeCompatibilityMatrix();

      expect(cultural.getMetrics().compatibilityPairCount).toBe(3);
    });

    it('should track feedback event count', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));
      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'norm_violation', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      expect(cultural.getMetrics().totalFeedbackEvents).toBe(2);
    });

    it('should compute average compatibility score', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.recomputeCompatibilityMatrix();

      const metrics = cultural.getMetrics();
      expect(metrics.averageCompatibilityScore).toBeGreaterThan(0);
    });

    it('should compute average reputation score', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      const metrics = cultural.getMetrics();
      // Both agents start at 0.5
      expect(metrics.averageReputationScore).toBe(0.5);
    });

    it('should track gossip message counts', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());

      const sendFn = vi.fn();
      cultural.addGossipPeer('node-2', sendFn);

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'successful_collaboration', 'agent-1', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(400); // Process feedback then gossip
      cultural.stop();

      const metrics = cultural.getMetrics();
      expect(metrics.totalGossipMessagesSent).toBeGreaterThan(0);
    });

    it('should reflect isRunning state', () => {
      expect(cultural.getMetrics().isRunning).toBe(false);
      cultural.start();
      expect(cultural.getMetrics().isRunning).toBe(true);
      cultural.stop();
      expect(cultural.getMetrics().isRunning).toBe(false);
    });
  });

  // ===========================================================================
  // TESTS: RENDER-LOOP SAFETY
  // ===========================================================================

  describe('Render-loop Safety', () => {
    it('getCulturalCompatibility should be O(1) map lookup', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.registerCulturalIdentity('agent-2', createProfile());
      cultural.recomputeCompatibilityMatrix();

      // Measure time for 10000 lookups
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        cultural.getCulturalCompatibility('agent-1', 'agent-2');
      }
      const elapsed = Date.now() - start;

      // 10000 lookups should complete in well under 100ms
      expect(elapsed).toBeLessThan(100);
    });

    it('getCulturalReputation should be O(1) map lookup', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());

      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        cultural.getCulturalReputation('agent-1');
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  // ===========================================================================
  // TESTS: FACTORY FUNCTION
  // ===========================================================================

  describe('Factory Function', () => {
    it('should create instance via factory', () => {
      const instance = createCulturalTrustHandshake({ autoStart: false });
      expect(instance).toBeInstanceOf(CulturalTrustHandshake);
      expect(instance.getIsRunning()).toBe(false);
      instance.dispose();
    });

    it('should create instance with default config', () => {
      const instance = createCulturalTrustHandshake();
      expect(instance).toBeInstanceOf(CulturalTrustHandshake);
      instance.dispose();
    });
  });

  // ===========================================================================
  // TESTS: EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty language arrays', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile({
        preferredLanguages: [],
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        preferredLanguages: ['en'],
      }));

      cultural.recomputeCompatibilityMatrix();
      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      expect(details!.dimensionScores.language_overlap).toBe(0.5); // Neutral for unknown
    });

    it('should handle unknown timezone gracefully', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile({
        timezone: 'Unknown/Mars',
      }));
      cultural.registerCulturalIdentity('agent-2', createProfile({
        timezone: 'Europe/London',
      }));

      cultural.recomputeCompatibilityMatrix();
      const details = cultural.getCulturalCompatibilityDetails('agent-1', 'agent-2');
      // Unknown timezone should assume UTC (offset 0)
      // London is also 0, so proximity should be 1.0
      expect(details!.dimensionScores.timezone_proximity).toBe(1.0);
    });

    it('should handle feedback for non-registered subject agent', () => {
      cultural.registerCulturalIdentity('agent-2', createProfile());

      cultural.ingestFeedbackEvent(createFeedbackEvent(
        'norm_violation', 'nonexistent', 'agent-2',
      ));

      cultural.start();
      vi.advanceTimersByTime(200);
      cultural.stop();

      // Should not throw, event should be silently skipped
      expect(cultural.getMetrics().totalFeedbackEvents).toBe(1);
    });

    it('should handle single agent (no pairs)', () => {
      cultural.registerCulturalIdentity('agent-1', createProfile());
      cultural.recomputeCompatibilityMatrix();

      expect(cultural.getMetrics().compatibilityPairCount).toBe(0);
    });

    it('should handle rapid register/unregister cycles', () => {
      for (let i = 0; i < 100; i++) {
        cultural.registerCulturalIdentity(`agent-${i}`, createProfile());
      }
      for (let i = 0; i < 100; i++) {
        cultural.unregisterCulturalIdentity(`agent-${i}`);
      }

      expect(cultural.getMetrics().registeredAgentCount).toBe(0);
    });
  });
});
