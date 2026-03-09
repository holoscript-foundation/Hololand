/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CulturalHealthTypes
 *
 * Validates factory functions, type defaults, and utility functions
 * for the cultural health monitoring type system.
 */

import { describe, it, expect } from 'vitest';

import {
  DEFAULT_CULTURAL_HEALTH_CONFIG,
  createEmptyTrackedNorm,
  createEmptyCooperationIndex,
  createEmptyCulturalDriftVector,
  createEmptyCulturalDriftState,
  createEmptyBoundaryPermeabilityState,
  createEmptyMetanormEmergenceState,
  createEmptyCulturalHealthState,
  stateToSnapshot,
  createCulturalAlertId,
  type CulturalHealthState,
  type TrackedNorm,
  type CooperationIndex,
  type CulturalDriftState,
  type CulturalDimension,
  type NormLifecycleState,
} from '../CulturalHealthTypes';

// =============================================================================
// DEFAULTS
// =============================================================================

describe('DEFAULT_CULTURAL_HEALTH_CONFIG', () => {
  it('should have sensible default monitor frequency', () => {
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.monitorHz).toBe(2);
  });

  it('should have sensible EWMA alpha', () => {
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.ewmaAlpha).toBeGreaterThan(0);
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.ewmaAlpha).toBeLessThan(1);
  });

  it('should have norm adoption thresholds in ascending order', () => {
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.emergingThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.establishingThreshold,
    );
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.establishingThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.establishedThreshold,
    );
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.establishedThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.entrenchedThreshold,
    );
  });

  it('should have cooperation thresholds in ascending order', () => {
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.strainedThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.stableThreshold,
    );
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.stableThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.thrivingThreshold,
    );
  });

  it('should have boundary permeability thresholds in ascending order', () => {
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.semiPermeableBoundaryThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.permeableBoundaryThreshold,
    );
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.permeableBoundaryThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.openBoundaryThreshold,
    );
  });

  it('should have metanorm thresholds in ascending order', () => {
    expect(DEFAULT_CULTURAL_HEALTH_CONFIG.crystallizedThreshold).toBeLessThan(
      DEFAULT_CULTURAL_HEALTH_CONFIG.institutionalThreshold,
    );
  });
});

// =============================================================================
// TRACKED NORM FACTORY
// =============================================================================

describe('createEmptyTrackedNorm', () => {
  it('should create a norm with the given id', () => {
    const norm = createEmptyTrackedNorm('greeting-protocol');
    expect(norm.normId).toBe('greeting-protocol');
  });

  it('should use normId as description when description not provided', () => {
    const norm = createEmptyTrackedNorm('greeting-protocol');
    expect(norm.description).toBe('greeting-protocol');
  });

  it('should use custom description when provided', () => {
    const norm = createEmptyTrackedNorm('greeting-protocol', 'Agents must greet on entry');
    expect(norm.description).toBe('Agents must greet on entry');
  });

  it('should start in proposed lifecycle state', () => {
    const norm = createEmptyTrackedNorm('test-norm');
    expect(norm.lifecycleState).toBe('proposed');
  });

  it('should start with zero adherents and adoption rate', () => {
    const norm = createEmptyTrackedNorm('test-norm');
    expect(norm.adherentCount).toBe(0);
    expect(norm.adoptionRate).toBe(0);
    expect(norm.smoothedAdoptionRate).toBe(0);
  });

  it('should start with zero violations and enforcement', () => {
    const norm = createEmptyTrackedNorm('test-norm');
    expect(norm.enforcementCount).toBe(0);
    expect(norm.violationCount).toBe(0);
    expect(norm.enforcementRatio).toBe(0);
  });

  it('should have empty adoption trend', () => {
    const norm = createEmptyTrackedNorm('test-norm');
    expect(norm.adoptionTrend).toEqual([]);
  });

  it('should set firstObservedTimestamp', () => {
    const before = Date.now();
    const norm = createEmptyTrackedNorm('test-norm');
    const after = Date.now();
    expect(norm.firstObservedTimestamp).toBeGreaterThanOrEqual(before);
    expect(norm.firstObservedTimestamp).toBeLessThanOrEqual(after);
  });
});

// =============================================================================
// COOPERATION INDEX FACTORY
// =============================================================================

describe('createEmptyCooperationIndex', () => {
  it('should start with zero counts', () => {
    const index = createEmptyCooperationIndex();
    expect(index.cooperationOffers).toBe(0);
    expect(index.cooperationAcceptances).toBe(0);
    expect(index.defections).toBe(0);
  });

  it('should start with cooperation ratio of 1.0 (fully cooperative)', () => {
    const index = createEmptyCooperationIndex();
    expect(index.cooperationRatio).toBe(1.0);
    expect(index.smoothedCooperationRatio).toBe(1.0);
  });

  it('should start with stable health', () => {
    const index = createEmptyCooperationIndex();
    expect(index.health).toBe('stable');
  });

  it('should have empty cooperation trend', () => {
    const index = createEmptyCooperationIndex();
    expect(index.cooperationTrend).toEqual([]);
  });
});

// =============================================================================
// CULTURAL DRIFT VECTOR FACTORY
// =============================================================================

describe('createEmptyCulturalDriftVector', () => {
  it('should create a vector for the given dimension', () => {
    const vector = createEmptyCulturalDriftVector('risk_tolerance');
    expect(vector.dimension).toBe('risk_tolerance');
  });

  it('should start at neutral position (0)', () => {
    const vector = createEmptyCulturalDriftVector('competition_cooperation');
    expect(vector.currentPosition).toBe(0);
    expect(vector.previousPosition).toBe(0);
  });

  it('should have zero drift rate', () => {
    const vector = createEmptyCulturalDriftVector('hierarchy_egalitarianism');
    expect(vector.driftRate).toBe(0);
    expect(vector.smoothedDriftRate).toBe(0);
    expect(vector.magnitude).toBe(0);
  });

  it('should start with maximum stability', () => {
    const vector = createEmptyCulturalDriftVector('innovation_tradition');
    expect(vector.stability).toBe(1.0);
  });

  it('should have empty position trend', () => {
    const vector = createEmptyCulturalDriftVector('individualism_collectivism');
    expect(vector.positionTrend).toEqual([]);
  });
});

// =============================================================================
// CULTURAL DRIFT STATE FACTORY
// =============================================================================

describe('createEmptyCulturalDriftState', () => {
  it('should have all five cultural dimensions', () => {
    const state = createEmptyCulturalDriftState();
    const dimensions: CulturalDimension[] = [
      'individualism_collectivism',
      'risk_tolerance',
      'hierarchy_egalitarianism',
      'competition_cooperation',
      'innovation_tradition',
    ];

    for (const dim of dimensions) {
      expect(state.dimensions[dim]).toBeDefined();
      expect(state.dimensions[dim].dimension).toBe(dim);
    }
  });

  it('should start with full stability', () => {
    const state = createEmptyCulturalDriftState();
    expect(state.overallStability).toBe(1.0);
  });

  it('should start with zero drift magnitude', () => {
    const state = createEmptyCulturalDriftState();
    expect(state.totalDriftMagnitude).toBe(0);
  });

  it('should not be transitioning initially', () => {
    const state = createEmptyCulturalDriftState();
    expect(state.isTransitioning).toBe(false);
  });
});

// =============================================================================
// BOUNDARY PERMEABILITY STATE FACTORY
// =============================================================================

describe('createEmptyBoundaryPermeabilityState', () => {
  it('should start with no boundaries', () => {
    const state = createEmptyBoundaryPermeabilityState();
    expect(state.boundaries).toEqual([]);
    expect(state.groupCount).toBe(0);
  });

  it('should start with zero permeability', () => {
    const state = createEmptyBoundaryPermeabilityState();
    expect(state.averagePermeability).toBe(0);
  });

  it('should have no extreme boundaries', () => {
    const state = createEmptyBoundaryPermeabilityState();
    expect(state.mostPermeableBoundary).toBeNull();
    expect(state.leastPermeableBoundary).toBeNull();
  });

  it('should start with closed overall permeability', () => {
    const state = createEmptyBoundaryPermeabilityState();
    expect(state.overallPermeability).toBe('closed');
  });
});

// =============================================================================
// METANORM EMERGENCE STATE FACTORY
// =============================================================================

describe('createEmptyMetanormEmergenceState', () => {
  it('should start with no metanorms', () => {
    const state = createEmptyMetanormEmergenceState();
    expect(state.metanorms).toEqual([]);
    expect(state.activeMetanormCount).toBe(0);
    expect(state.emergingMetanormCount).toBe(0);
    expect(state.decayingMetanormCount).toBe(0);
  });

  it('should start with zero density', () => {
    const state = createEmptyMetanormEmergenceState();
    expect(state.metanormDensity).toBe(0);
  });

  it('should not have strong metanorms initially', () => {
    const state = createEmptyMetanormEmergenceState();
    expect(state.hasStrongMetanorms).toBe(false);
  });
});

// =============================================================================
// CULTURAL HEALTH STATE FACTORY
// =============================================================================

describe('createEmptyCulturalHealthState', () => {
  it('should have an empty norms map', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.norms.size).toBe(0);
  });

  it('should have all lifecycle counts at zero', () => {
    const state = createEmptyCulturalHealthState();
    const allStates: NormLifecycleState[] = [
      'proposed', 'emerging', 'establishing', 'established', 'entrenched', 'declining', 'abandoned',
    ];
    for (const s of allStates) {
      expect(state.normLifecycleCounts[s]).toBe(0);
    }
  });

  it('should have population cooperation initialized', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.populationCooperation).toBeDefined();
    expect(state.populationCooperation.cooperationRatio).toBe(1.0);
  });

  it('should have empty group cooperation map', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.groupCooperation.size).toBe(0);
  });

  it('should have cultural drift initialized with all dimensions', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.culturalDrift).toBeDefined();
    expect(state.culturalDrift.overallStability).toBe(1.0);
  });

  it('should have boundary permeability initialized', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.boundaryPermeability).toBeDefined();
    expect(state.boundaryPermeability.overallPermeability).toBe('closed');
  });

  it('should have metanorm emergence initialized', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.metanormEmergence).toBeDefined();
    expect(state.metanormEmergence.hasStrongMetanorms).toBe(false);
  });

  it('should start with health score of 1.0', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.overallHealthScore).toBe(1.0);
  });

  it('should start with sequence 0', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.sequence).toBe(0);
  });

  it('should start as not live', () => {
    const state = createEmptyCulturalHealthState();
    expect(state.isLive).toBe(false);
  });
});

// =============================================================================
// STATE TO SNAPSHOT CONVERSION
// =============================================================================

describe('stateToSnapshot', () => {
  it('should convert Maps to plain objects', () => {
    const state = createEmptyCulturalHealthState();

    // Add a norm to the state
    state.norms.set('test-norm', createEmptyTrackedNorm('test-norm', 'Test'));
    state.groupCooperation.set('group-1', createEmptyCooperationIndex());

    const snapshot = stateToSnapshot(state);

    // Norms should be a plain object, not a Map
    expect(snapshot.norms).toBeDefined();
    expect(snapshot.norms['test-norm']).toBeDefined();
    expect(snapshot.norms['test-norm'].normId).toBe('test-norm');

    // Group cooperation should be a plain object
    expect(snapshot.groupCooperation).toBeDefined();
    expect(snapshot.groupCooperation['group-1']).toBeDefined();
  });

  it('should preserve all scalar fields', () => {
    const state = createEmptyCulturalHealthState();
    state.averageAdoptionRate = 0.75;
    state.populationSize = 100;
    state.groupCount = 5;
    state.overallHealthScore = 0.82;
    state.sequence = 42;
    state.lastUpdateTimestamp = 1234567890;
    state.isLive = true;

    const snapshot = stateToSnapshot(state);

    expect(snapshot.averageAdoptionRate).toBe(0.75);
    expect(snapshot.populationSize).toBe(100);
    expect(snapshot.groupCount).toBe(5);
    expect(snapshot.overallHealthScore).toBe(0.82);
    expect(snapshot.sequence).toBe(42);
    expect(snapshot.lastUpdateTimestamp).toBe(1234567890);
    expect(snapshot.isLive).toBe(true);
  });

  it('should copy normLifecycleCounts', () => {
    const state = createEmptyCulturalHealthState();
    state.normLifecycleCounts.established = 3;
    state.normLifecycleCounts.emerging = 2;

    const snapshot = stateToSnapshot(state);
    expect(snapshot.normLifecycleCounts.established).toBe(3);
    expect(snapshot.normLifecycleCounts.emerging).toBe(2);
  });

  it('should preserve cultural drift state', () => {
    const state = createEmptyCulturalHealthState();
    state.culturalDrift.overallStability = 0.65;
    state.culturalDrift.isTransitioning = true;

    const snapshot = stateToSnapshot(state);
    expect(snapshot.culturalDrift.overallStability).toBe(0.65);
    expect(snapshot.culturalDrift.isTransitioning).toBe(true);
  });

  it('should be JSON serializable', () => {
    const state = createEmptyCulturalHealthState();
    state.norms.set('n1', createEmptyTrackedNorm('n1'));
    state.groupCooperation.set('g1', createEmptyCooperationIndex());

    const snapshot = stateToSnapshot(state);
    const json = JSON.stringify(snapshot);
    const parsed = JSON.parse(json);

    expect(parsed.norms.n1.normId).toBe('n1');
    expect(parsed.groupCooperation.g1.cooperationRatio).toBe(1.0);
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

describe('createCulturalAlertId', () => {
  it('should generate unique IDs', () => {
    const id1 = createCulturalAlertId();
    const id2 = createCulturalAlertId();
    expect(id1).not.toBe(id2);
  });

  it('should start with "cultural-alert-" prefix', () => {
    const id = createCulturalAlertId();
    expect(id.startsWith('cultural-alert-')).toBe(true);
  });

  it('should contain a timestamp component', () => {
    const id = createCulturalAlertId();
    // Format: cultural-alert-{timestamp}-{random}
    const parts = id.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });
});
