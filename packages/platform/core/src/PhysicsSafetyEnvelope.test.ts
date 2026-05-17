/**
 * PhysicsSafetyEnvelope + PhysicsSafetyEnforcer — Test Suite
 *
 * Comprehensive tests for immutable physics safety bounds enforcement.
 * Covers:
 *   1. Envelope immutability (Object.freeze)
 *   2. Clamping functions (scalar and vector)
 *   3. Individual enforcement functions (velocity, angular, force, etc.)
 *   4. PhysicsSafetyEnforcer wrapping PhysicsProvider
 *   5. Edge cases (NaN, Infinity, negative, zero vectors)
 *   6. Statistics and monitoring
 *   7. Envelope self-validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  PHYSICS_SAFETY_ENVELOPE,
  clampSymmetric,
  clampRange,
  vectorMagnitude,
  clampVectorMagnitude,
  enforceLinearVelocity,
  enforceAngularVelocity,
  enforceForce,
  enforceImpulse,
  enforceGravityScale,
  enforceMass,
  enforcePosition,
  validateEnvelope,
  type PhysicsSafetyBounds,
} from './PhysicsSafetyEnvelope';

import {
  PhysicsSafetyEnforcer,
  createPhysicsSafetyEnforcer,
  wrapWithSafetyEnvelope,
} from './PhysicsSafetyEnforcer';

// =============================================================================
// 1. ENVELOPE IMMUTABILITY
// =============================================================================

describe('PHYSICS_SAFETY_ENVELOPE immutability', () => {
  it('is frozen and cannot be mutated', () => {
    expect(Object.isFrozen(PHYSICS_SAFETY_ENVELOPE)).toBe(true);

    // Attempting to mutate should throw in strict mode or silently fail
    expect(() => {
      (PHYSICS_SAFETY_ENVELOPE as any).maxLinearVelocity = 999999;
    }).toThrow();
  });

  it('has all required fields with positive/valid values', () => {
    expect(PHYSICS_SAFETY_ENVELOPE.maxLinearVelocity).toBeGreaterThan(0);
    expect(PHYSICS_SAFETY_ENVELOPE.maxAngularVelocity).toBeGreaterThan(0);
    expect(PHYSICS_SAFETY_ENVELOPE.maxForceMagnitude).toBeGreaterThan(0);
    expect(PHYSICS_SAFETY_ENVELOPE.maxImpulseMagnitude).toBeGreaterThan(0);
    expect(PHYSICS_SAFETY_ENVELOPE.minGravityScale).toBeGreaterThanOrEqual(0);
    expect(PHYSICS_SAFETY_ENVELOPE.maxGravityScale).toBeGreaterThan(
      PHYSICS_SAFETY_ENVELOPE.minGravityScale
    );
    expect(PHYSICS_SAFETY_ENVELOPE.minMass).toBeGreaterThan(0);
    expect(PHYSICS_SAFETY_ENVELOPE.maxMass).toBeGreaterThan(PHYSICS_SAFETY_ENVELOPE.minMass);
    expect(PHYSICS_SAFETY_ENVELOPE.maxPositionMagnitude).toBeGreaterThan(0);
    expect(PHYSICS_SAFETY_ENVELOPE.maxAcceleration).toBeGreaterThan(0);
  });

  it('derives from HoloScript trait defaults with 2x safety margin', () => {
    // ThrowableTrait.max_velocity default = 50, so platform cap = 100
    expect(PHYSICS_SAFETY_ENVELOPE.maxLinearVelocity).toBe(100);
    // ThrowableTrait.gravityScale default = 1, platform cap = 10
    expect(PHYSICS_SAFETY_ENVELOPE.maxGravityScale).toBe(10);
  });

  it('passes self-validation', () => {
    const errors = validateEnvelope(PHYSICS_SAFETY_ENVELOPE);
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// 2. CLAMPING FUNCTIONS
// =============================================================================

describe('clampSymmetric', () => {
  it('clamps positive values above max', () => {
    expect(clampSymmetric(200, 100)).toBe(100);
  });

  it('clamps negative values below -max', () => {
    expect(clampSymmetric(-200, 100)).toBe(-100);
  });

  it('passes through values within range', () => {
    expect(clampSymmetric(50, 100)).toBe(50);
    expect(clampSymmetric(-50, 100)).toBe(-50);
    expect(clampSymmetric(0, 100)).toBe(0);
  });

  it('handles NaN by returning 0', () => {
    expect(clampSymmetric(NaN, 100)).toBe(0);
  });

  it('handles Infinity by clamping', () => {
    expect(clampSymmetric(Infinity, 100)).toBe(0); // Not finite => 0
    expect(clampSymmetric(-Infinity, 100)).toBe(0);
  });
});

describe('clampRange', () => {
  it('clamps below minimum', () => {
    expect(clampRange(-5, 0, 100)).toBe(0);
  });

  it('clamps above maximum', () => {
    expect(clampRange(200, 0, 100)).toBe(100);
  });

  it('passes through values within range', () => {
    expect(clampRange(50, 0, 100)).toBe(50);
  });

  it('handles NaN by returning min', () => {
    expect(clampRange(NaN, 0.001, 100)).toBe(0.001);
  });
});

describe('vectorMagnitude', () => {
  it('computes magnitude of array vector', () => {
    expect(vectorMagnitude([3, 4, 0])).toBeCloseTo(5);
    expect(vectorMagnitude([0, 0, 0])).toBe(0);
    expect(vectorMagnitude([1, 1, 1])).toBeCloseTo(Math.sqrt(3));
  });

  it('computes magnitude of object vector', () => {
    expect(vectorMagnitude({ x: 3, y: 4, z: 0 })).toBeCloseTo(5);
    expect(vectorMagnitude({ x: 0, y: 0, z: 0 })).toBe(0);
  });
});

describe('clampVectorMagnitude', () => {
  it('clamps vectors that exceed max magnitude', () => {
    const result = clampVectorMagnitude([200, 0, 0], 100);
    expect(result).toEqual([100, 0, 0]);
  });

  it('preserves direction when clamping', () => {
    const result = clampVectorMagnitude([300, 400, 0], 5);
    const mag = Math.sqrt(result[0] ** 2 + result[1] ** 2 + result[2] ** 2);
    expect(mag).toBeCloseTo(5);
    // Direction should be preserved: 3:4 ratio
    expect(result[0] / result[1]).toBeCloseTo(3 / 4);
  });

  it('passes through vectors within max magnitude', () => {
    const result = clampVectorMagnitude([3, 4, 0], 100);
    expect(result).toEqual([3, 4, 0]);
  });

  it('handles zero vector', () => {
    const result = clampVectorMagnitude([0, 0, 0], 100);
    expect(result).toEqual([0, 0, 0]);
  });

  it('handles NaN components by zeroing them', () => {
    const result = clampVectorMagnitude([NaN, 5, NaN], 100);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(5);
    expect(result[2]).toBe(0);
  });

  it('handles Infinity components by zeroing them', () => {
    const result = clampVectorMagnitude([Infinity, 0, 0], 100);
    expect(result).toEqual([0, 0, 0]);
  });

  it('works with object-form vectors', () => {
    const result = clampVectorMagnitude({ x: 200, y: 0, z: 0 }, 100);
    expect(result).toEqual([100, 0, 0]);
  });

  it('always returns array form', () => {
    const result = clampVectorMagnitude({ x: 1, y: 2, z: 3 }, 100);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });
});

// =============================================================================
// 3. INDIVIDUAL ENFORCEMENT FUNCTIONS
// =============================================================================

describe('enforceLinearVelocity', () => {
  it('clamps velocity above max and reports clamping', () => {
    const result = enforceLinearVelocity([200, 0, 0]);
    expect(result.clamped).toBe(true);
    expect(vectorMagnitude(result.value)).toBeCloseTo(100);
    expect(result.event).toBeDefined();
    expect(result.event!.parameter).toBe('maxLinearVelocity');
    expect(result.event!.requestedValue).toBeCloseTo(200);
  });

  it('passes through velocity within bounds', () => {
    const result = enforceLinearVelocity([10, 20, 30]);
    expect(result.clamped).toBe(false);
    expect(result.value).toEqual([10, 20, 30]);
    expect(result.event).toBeUndefined();
  });

  it('includes nodeId and source in clamp event', () => {
    const result = enforceLinearVelocity([999, 0, 0], undefined, 'ball_01', 'throwable');
    expect(result.event!.nodeId).toBe('ball_01');
    expect(result.event!.source).toBe('throwable');
  });
});

describe('enforceAngularVelocity', () => {
  it('clamps angular velocity above max', () => {
    // 4*PI ~= 12.57, so [20, 0, 0] exceeds it
    const result = enforceAngularVelocity([20, 0, 0]);
    expect(result.clamped).toBe(true);
    expect(vectorMagnitude(result.value)).toBeCloseTo(4 * Math.PI);
    expect(result.event!.parameter).toBe('maxAngularVelocity');
  });

  it('passes through angular velocity within bounds', () => {
    const result = enforceAngularVelocity([1, 1, 1]);
    expect(result.clamped).toBe(false);
  });
});

describe('enforceForce', () => {
  it('clamps force magnitude above max', () => {
    const result = enforceForce([50000, 0, 0]);
    expect(result.clamped).toBe(true);
    expect(vectorMagnitude(result.value)).toBeCloseTo(10000);
  });

  it('passes through force within bounds', () => {
    const result = enforceForce([100, 200, 300]);
    expect(result.clamped).toBe(false);
  });
});

describe('enforceImpulse', () => {
  it('clamps impulse magnitude above max', () => {
    const result = enforceImpulse([10000, 0, 0]);
    expect(result.clamped).toBe(true);
    expect(vectorMagnitude(result.value)).toBeCloseTo(5000);
  });
});

describe('enforceGravityScale', () => {
  it('clamps gravity scale above max', () => {
    const result = enforceGravityScale(50);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(10);
    expect(result.event!.parameter).toBe('maxGravityScale');
  });

  it('allows zero-g', () => {
    const result = enforceGravityScale(0);
    expect(result.clamped).toBe(false);
    expect(result.value).toBe(0);
  });

  it('clamps negative gravity to min', () => {
    const result = enforceGravityScale(-5);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(0);
    expect(result.event!.parameter).toBe('minGravityScale');
  });

  it('passes through normal gravity', () => {
    const result = enforceGravityScale(1.0);
    expect(result.clamped).toBe(false);
    expect(result.value).toBe(1.0);
  });

  it('handles NaN', () => {
    const result = enforceGravityScale(NaN);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(0); // NaN -> min (0)
  });
});

describe('enforceMass', () => {
  it('clamps mass below minimum', () => {
    const result = enforceMass(0);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(0.001);
  });

  it('clamps mass above maximum', () => {
    const result = enforceMass(999999);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(100000);
  });

  it('passes through valid mass', () => {
    const result = enforceMass(1.0);
    expect(result.clamped).toBe(false);
    expect(result.value).toBe(1.0);
  });

  it('prevents negative mass', () => {
    const result = enforceMass(-10);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(0.001);
  });
});

describe('enforcePosition', () => {
  it('clamps position beyond world boundary', () => {
    const result = enforcePosition([50000, 0, 0]);
    expect(result.clamped).toBe(true);
    expect(vectorMagnitude(result.value)).toBeCloseTo(10000);
  });

  it('passes through position within bounds', () => {
    const result = enforcePosition([100, 200, 300]);
    expect(result.clamped).toBe(false);
  });
});

// =============================================================================
// 4. PHYSICS SAFETY ENFORCER (Provider Wrapper)
// =============================================================================

describe('PhysicsSafetyEnforcer', () => {
  let mockProvider: {
    applyVelocity: ReturnType<typeof vi.fn>;
    applyAngularVelocity: ReturnType<typeof vi.fn>;
    setKinematic: ReturnType<typeof vi.fn>;
    raycast: ReturnType<typeof vi.fn>;
  };
  let enforcer: PhysicsSafetyEnforcer;
  let clampCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockProvider = {
      applyVelocity: vi.fn(),
      applyAngularVelocity: vi.fn(),
      setKinematic: vi.fn(),
      raycast: vi.fn(() => null),
    };

    clampCallback = vi.fn();

    enforcer = createPhysicsSafetyEnforcer({
      provider: mockProvider,
      onClamp: clampCallback,
      warnOnClamp: false, // Suppress console noise in tests
    });
  });

  it('forwards safe velocity values to inner provider', () => {
    enforcer.applyVelocity('node1', [10, 20, 30]);
    expect(mockProvider.applyVelocity).toHaveBeenCalledWith('node1', [10, 20, 30]);
    expect(clampCallback).not.toHaveBeenCalled();
  });

  it('clamps unsafe velocity before forwarding', () => {
    enforcer.applyVelocity('node1', [500, 0, 0]);

    // Should forward clamped value
    const [nodeId, velocity] = mockProvider.applyVelocity.mock.calls[0];
    expect(nodeId).toBe('node1');
    const mag = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
    expect(mag).toBeCloseTo(100);

    // Should invoke clamp callback
    expect(clampCallback).toHaveBeenCalledTimes(1);
    expect(clampCallback.mock.calls[0][0].parameter).toBe('maxLinearVelocity');
  });

  it('clamps unsafe angular velocity before forwarding', () => {
    enforcer.applyAngularVelocity('node1', [100, 0, 0]);

    const [, angVel] = mockProvider.applyAngularVelocity.mock.calls[0];
    const mag = Math.sqrt(angVel[0] ** 2 + angVel[1] ** 2 + angVel[2] ** 2);
    expect(mag).toBeCloseTo(4 * Math.PI);
    expect(clampCallback).toHaveBeenCalledTimes(1);
  });

  it('passes through setKinematic unchanged', () => {
    enforcer.setKinematic('node1', true);
    expect(mockProvider.setKinematic).toHaveBeenCalledWith('node1', true);
  });

  it('passes through raycast unchanged', () => {
    enforcer.raycast([0, 0, 0], [0, 1, 0], 100);
    expect(mockProvider.raycast).toHaveBeenCalledWith([0, 0, 0], [0, 1, 0], 100);
  });

  it('tracks statistics correctly', () => {
    // 2 safe calls
    enforcer.applyVelocity('n1', [10, 0, 0]);
    enforcer.applyVelocity('n2', [20, 0, 0]);
    // 1 clamped call
    enforcer.applyVelocity('n3', [500, 0, 0]);
    // 1 clamped angular
    enforcer.applyAngularVelocity('n4', [100, 0, 0]);

    const stats = enforcer.getStats();
    expect(stats.totalCalls).toBe(4);
    expect(stats.totalClamped).toBe(2);
    expect(stats.clampRate).toBeCloseTo(0.5);
    expect(stats.clampsByParameter['maxLinearVelocity']).toBe(1);
    expect(stats.clampsByParameter['maxAngularVelocity']).toBe(1);
    expect(stats.recentClamps).toHaveLength(2);
  });

  it('bounds clamp history to maxHistory', () => {
    const smallEnforcer = createPhysicsSafetyEnforcer({
      provider: mockProvider,
      maxHistory: 5,
      warnOnClamp: false,
    });

    // Generate 10 clamp events
    for (let i = 0; i < 10; i++) {
      smallEnforcer.applyVelocity(`node${i}`, [500, 0, 0]);
    }

    const stats = smallEnforcer.getStats();
    expect(stats.recentClamps).toHaveLength(5);
    expect(stats.totalClamped).toBe(10);
  });

  it('resets stats correctly', () => {
    enforcer.applyVelocity('n1', [500, 0, 0]);
    expect(enforcer.getStats().totalClamped).toBe(1);

    enforcer.resetStats();
    const stats = enforcer.getStats();
    expect(stats.totalCalls).toBe(0);
    expect(stats.totalClamped).toBe(0);
    expect(stats.recentClamps).toHaveLength(0);
  });

  it('returns the safety envelope', () => {
    const envelope = enforcer.getEnvelope();
    expect(envelope).toBe(PHYSICS_SAFETY_ENVELOPE);
    expect(Object.isFrozen(envelope)).toBe(true);
  });
});

describe('wrapWithSafetyEnvelope', () => {
  it('creates enforcer with default envelope', () => {
    const mock = {
      applyVelocity: vi.fn(),
      applyAngularVelocity: vi.fn(),
      setKinematic: vi.fn(),
      raycast: vi.fn(() => null),
    };

    const enforcer = wrapWithSafetyEnvelope(mock);
    expect(enforcer.getEnvelope()).toBe(PHYSICS_SAFETY_ENVELOPE);
  });
});

// =============================================================================
// 5. EDGE CASES
// =============================================================================

describe('edge cases', () => {
  it('handles all-NaN velocity vector', () => {
    const result = enforceLinearVelocity([NaN, NaN, NaN]);
    expect(result.value).toEqual([0, 0, 0]);
    // NaN magnitude is 0, so not clamped
    expect(result.clamped).toBe(false);
  });

  it('handles mixed NaN/valid velocity', () => {
    const result = enforceLinearVelocity([NaN, 50, NaN]);
    // After NaN -> 0, vector is [0, 50, 0], magnitude 50 < 100
    expect(result.value).toEqual([0, 50, 0]);
    expect(result.clamped).toBe(false);
  });

  it('handles Infinity velocity', () => {
    const result = enforceLinearVelocity([Infinity, 0, 0]);
    // Infinity -> 0, vector is [0, 0, 0], sanitized counts as clamped
    expect(result.value).toEqual([0, 0, 0]);
    expect(result.clamped).toBe(true);
  });

  it('handles exactly-at-boundary velocity', () => {
    // Magnitude exactly 100
    const result = enforceLinearVelocity([100, 0, 0]);
    expect(result.clamped).toBe(false);
    expect(result.value).toEqual([100, 0, 0]);
  });

  it('handles very small velocity (near zero)', () => {
    const result = enforceLinearVelocity([0.0001, 0, 0]);
    expect(result.clamped).toBe(false);
    expect(result.value).toEqual([0.0001, 0, 0]);
  });

  it('handles negative velocity components (direction preserved)', () => {
    const result = enforceLinearVelocity([-500, 0, 0]);
    expect(result.clamped).toBe(true);
    expect(result.value[0]).toBeCloseTo(-100);
    expect(result.value[1]).toBe(0);
    expect(result.value[2]).toBe(0);
  });

  it('preserves 3D direction when clamping', () => {
    // Vector [300, 400, 0] has magnitude 500, will be clamped to 100
    const result = enforceLinearVelocity([300, 400, 0]);
    expect(result.clamped).toBe(true);
    const mag = vectorMagnitude(result.value);
    expect(mag).toBeCloseTo(100);
    // Direction ratio should be 3:4
    expect(result.value[0] / result.value[1]).toBeCloseTo(3 / 4);
  });
});

// =============================================================================
// 6. CUSTOM ENVELOPES
// =============================================================================

describe('custom envelope', () => {
  const strictEnvelope: PhysicsSafetyBounds = Object.freeze({
    maxLinearVelocity: 10,
    maxAngularVelocity: Math.PI,
    maxForceMagnitude: 100,
    maxImpulseMagnitude: 50,
    minGravityScale: 0,
    maxGravityScale: 2,
    minMass: 0.01,
    maxMass: 1000,
    maxPositionMagnitude: 100,
    maxAcceleration: 50,
  });

  it('enforces custom strict envelope on velocity', () => {
    const result = enforceLinearVelocity([20, 0, 0], strictEnvelope);
    expect(result.clamped).toBe(true);
    expect(vectorMagnitude(result.value)).toBeCloseTo(10);
  });

  it('enforces custom strict envelope on gravity', () => {
    const result = enforceGravityScale(5, strictEnvelope);
    expect(result.clamped).toBe(true);
    expect(result.value).toBe(2);
  });

  it('PhysicsSafetyEnforcer can use custom envelope', () => {
    const mock = {
      applyVelocity: vi.fn(),
      applyAngularVelocity: vi.fn(),
      setKinematic: vi.fn(),
      raycast: vi.fn(() => null),
    };

    const enforcer = createPhysicsSafetyEnforcer({
      provider: mock,
      envelope: strictEnvelope,
      warnOnClamp: false,
    });

    enforcer.applyVelocity('n1', [20, 0, 0]);

    const [, velocity] = mock.applyVelocity.mock.calls[0];
    expect(vectorMagnitude(velocity)).toBeCloseTo(10);
    expect(enforcer.getEnvelope()).toBe(strictEnvelope);
  });
});

// =============================================================================
// 7. ENVELOPE VALIDATION
// =============================================================================

describe('validateEnvelope', () => {
  it('accepts valid envelope', () => {
    expect(validateEnvelope(PHYSICS_SAFETY_ENVELOPE)).toHaveLength(0);
  });

  it('rejects zero maxLinearVelocity', () => {
    const bad = { ...PHYSICS_SAFETY_ENVELOPE, maxLinearVelocity: 0 };
    const errors = validateEnvelope(bad);
    expect(errors).toContain('maxLinearVelocity must be positive');
  });

  it('rejects negative maxAngularVelocity', () => {
    const bad = { ...PHYSICS_SAFETY_ENVELOPE, maxAngularVelocity: -1 };
    const errors = validateEnvelope(bad);
    expect(errors).toContain('maxAngularVelocity must be positive');
  });

  it('rejects maxGravityScale <= minGravityScale', () => {
    const bad = { ...PHYSICS_SAFETY_ENVELOPE, maxGravityScale: 0, minGravityScale: 0 };
    const errors = validateEnvelope(bad);
    expect(errors).toContain('maxGravityScale must exceed minGravityScale');
  });

  it('rejects non-positive minMass', () => {
    const bad = { ...PHYSICS_SAFETY_ENVELOPE, minMass: 0 };
    const errors = validateEnvelope(bad);
    expect(errors).toContain('minMass must be positive');
  });

  it('rejects maxMass <= minMass', () => {
    const bad = { ...PHYSICS_SAFETY_ENVELOPE, maxMass: 0.001, minMass: 0.001 };
    const errors = validateEnvelope(bad);
    expect(errors).toContain('maxMass must exceed minMass');
  });

  it('rejects negative minGravityScale', () => {
    const bad = { ...PHYSICS_SAFETY_ENVELOPE, minGravityScale: -1 };
    const errors = validateEnvelope(bad);
    expect(errors).toContain('minGravityScale must be non-negative');
  });
});

// =============================================================================
// 8. ENFORCER EXTENDED METHODS
// =============================================================================

describe('PhysicsSafetyEnforcer extended methods', () => {
  let mockProvider: {
    applyVelocity: ReturnType<typeof vi.fn>;
    applyAngularVelocity: ReturnType<typeof vi.fn>;
    setKinematic: ReturnType<typeof vi.fn>;
    raycast: ReturnType<typeof vi.fn>;
  };
  let enforcer: PhysicsSafetyEnforcer;

  beforeEach(() => {
    mockProvider = {
      applyVelocity: vi.fn(),
      applyAngularVelocity: vi.fn(),
      setKinematic: vi.fn(),
      raycast: vi.fn(() => null),
    };

    enforcer = createPhysicsSafetyEnforcer({
      provider: mockProvider,
      warnOnClamp: false,
    });
  });

  it('enforceAndApplyForce clamps and returns safe value', () => {
    const result = enforcer.enforceAndApplyForce('n1', [50000, 0, 0]);
    expect(vectorMagnitude(result)).toBeCloseTo(10000);
    expect(enforcer.getStats().totalClamped).toBe(1);
  });

  it('enforceAndApplyImpulse clamps and returns safe value', () => {
    const result = enforcer.enforceAndApplyImpulse('n1', [20000, 0, 0]);
    expect(vectorMagnitude(result)).toBeCloseTo(5000);
    expect(enforcer.getStats().totalClamped).toBe(1);
  });
});

// =============================================================================
// 9. AI AGENT ATTACK SCENARIOS
// =============================================================================

describe('AI agent attack resistance', () => {
  let mockProvider: {
    applyVelocity: ReturnType<typeof vi.fn>;
    applyAngularVelocity: ReturnType<typeof vi.fn>;
    setKinematic: ReturnType<typeof vi.fn>;
    raycast: ReturnType<typeof vi.fn>;
  };
  let enforcer: PhysicsSafetyEnforcer;

  beforeEach(() => {
    mockProvider = {
      applyVelocity: vi.fn(),
      applyAngularVelocity: vi.fn(),
      setKinematic: vi.fn(),
      raycast: vi.fn(() => null),
    };

    enforcer = createPhysicsSafetyEnforcer({
      provider: mockProvider,
      warnOnClamp: false,
    });
  });

  it('resists extreme velocity injection (999999 m/s)', () => {
    enforcer.applyVelocity('victim', [999999, 999999, 999999]);
    const [, vel] = mockProvider.applyVelocity.mock.calls[0];
    const mag = vectorMagnitude(vel);
    expect(mag).toBeCloseTo(100);
    expect(mag).toBeLessThanOrEqual(100.01); // Float precision
  });

  it('resists extreme angular velocity injection', () => {
    enforcer.applyAngularVelocity('victim', [1000, 1000, 1000]);
    const [, angVel] = mockProvider.applyAngularVelocity.mock.calls[0];
    const mag = vectorMagnitude(angVel);
    expect(mag).toBeCloseTo(4 * Math.PI);
  });

  it('resists NaN injection (physics engine crash vector)', () => {
    enforcer.applyVelocity('victim', [NaN, NaN, NaN]);
    const [, vel] = mockProvider.applyVelocity.mock.calls[0];
    expect(vel).toEqual([0, 0, 0]);
  });

  it('resists Infinity injection', () => {
    enforcer.applyVelocity('victim', [Infinity, -Infinity, Infinity]);
    const [, vel] = mockProvider.applyVelocity.mock.calls[0];
    expect(vel).toEqual([0, 0, 0]);
  });

  it('resists extreme force injection', () => {
    const result = enforcer.enforceAndApplyForce('victim', [1e12, 0, 0]);
    expect(vectorMagnitude(result)).toBeCloseTo(10000);
  });

  it('resists gravity scale manipulation', () => {
    const result = enforceGravityScale(1e6);
    expect(result.value).toBe(10);
    expect(result.clamped).toBe(true);
  });

  it('resists negative mass injection (division by zero vector)', () => {
    const result = enforceMass(-1000);
    expect(result.value).toBe(0.001);
    expect(result.clamped).toBe(true);
  });

  it('resists zero mass injection', () => {
    const result = enforceMass(0);
    expect(result.value).toBe(0.001);
    expect(result.clamped).toBe(true);
  });

  it('cannot mutate the safety envelope', () => {
    const envelope = enforcer.getEnvelope();
    expect(() => {
      (envelope as any).maxLinearVelocity = 1e12;
    }).toThrow();
    // Verify it's still the original value
    expect(envelope.maxLinearVelocity).toBe(100);
  });
});
