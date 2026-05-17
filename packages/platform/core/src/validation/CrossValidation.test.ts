/**
 * Cross-Validation Protocol — Test Suite
 *
 * Comprehensive tests for the 3-validator cross-validation protocol:
 *   1. PhysicsValidator — safety envelope enforcement
 *   2. MaterialsValidator — material schema conformance
 *   3. SchemaValidator — trait constraint checking
 *   4. CrossValidationEngine — 2-of-3 quorum consensus
 *   5. Edge cases and attack resistance
 *   6. Statistics tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PhysicsValidator, createPhysicsValidator } from './PhysicsValidator';
import { MaterialsValidator, createMaterialsValidator } from './MaterialsValidator';
import { SchemaValidator, createSchemaValidator } from './SchemaValidator';
import {
  CrossValidationEngine,
  createCrossValidationEngine,
  createCustomCrossValidationEngine,
  createStateDelta,
} from './CrossValidationEngine';

import type {
  StateDelta,
  PhysicsDeltaPayload,
  MaterialDeltaPayload,
  TraitDeltaPayload,
  TransformDeltaPayload,
  WorldDeltaPayload,
  ValidationResult,
} from './CrossValidationTypes';

// =============================================================================
// HELPERS
// =============================================================================

function makePhysicsDelta(
  payload: Partial<PhysicsDeltaPayload> = {},
  overrides: Partial<StateDelta> = {}
): StateDelta {
  return {
    id: `test-delta-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    agentId: 'test-agent',
    worldId: 'test-world',
    nodeId: 'test-node',
    category: 'physics',
    payload: { type: 'physics', ...payload },
    ...overrides,
  };
}

function makeMaterialDelta(payload: Partial<MaterialDeltaPayload> = {}): StateDelta {
  return {
    id: `test-delta-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    agentId: 'test-agent',
    worldId: 'test-world',
    nodeId: 'test-node',
    category: 'material',
    payload: { type: 'material', ...payload },
  };
}

function makeTraitDelta(
  payload: Partial<TraitDeltaPayload> & { existingTraits: readonly string[] }
): StateDelta {
  return {
    id: `test-delta-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    agentId: 'test-agent',
    worldId: 'test-world',
    nodeId: 'test-node',
    category: 'trait',
    payload: { type: 'trait', ...payload },
  };
}

function makeTransformDelta(payload: Partial<TransformDeltaPayload> = {}): StateDelta {
  return {
    id: `test-delta-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    agentId: 'test-agent',
    worldId: 'test-world',
    nodeId: 'test-node',
    category: 'transform',
    payload: { type: 'transform', ...payload },
  };
}

function makeWorldDelta(payload: Partial<WorldDeltaPayload> = {}): StateDelta {
  return {
    id: `test-delta-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    agentId: 'test-agent',
    worldId: 'test-world',
    nodeId: 'test-node',
    category: 'world',
    payload: { type: 'world', ...payload },
  };
}

// =============================================================================
// 1. PHYSICS VALIDATOR
// =============================================================================

describe('PhysicsValidator', () => {
  let validator: PhysicsValidator;

  beforeEach(() => {
    validator = createPhysicsValidator();
  });

  describe('velocity validation', () => {
    it('accepts velocity within safety envelope', () => {
      const delta = makePhysicsDelta({ velocity: [50, 50, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
      expect(result.violations).toHaveLength(0);
    });

    it('rejects velocity exceeding maxLinearVelocity', () => {
      const delta = makePhysicsDelta({ velocity: [200, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].constraint).toBe('maxLinearVelocity');
    });

    it('rejects NaN velocity components', () => {
      const delta = makePhysicsDelta({ velocity: [NaN, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations.some((v) => v.constraint === 'finite')).toBe(true);
    });

    it('rejects Infinity velocity components', () => {
      const delta = makePhysicsDelta({ velocity: [Infinity, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('accepts exactly-at-boundary velocity (100 m/s)', () => {
      const delta = makePhysicsDelta({ velocity: [100, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });
  });

  describe('angular velocity validation', () => {
    it('accepts angular velocity within bounds', () => {
      const delta = makePhysicsDelta({ angularVelocity: [1, 1, 1] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects angular velocity exceeding maxAngularVelocity', () => {
      // 4*PI ~= 12.57 rad/s, so 20 rad/s exceeds it
      const delta = makePhysicsDelta({ angularVelocity: [20, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('maxAngularVelocity');
    });
  });

  describe('force and impulse validation', () => {
    it('accepts force within bounds', () => {
      const delta = makePhysicsDelta({ force: [100, 200, 300] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects extreme force', () => {
      const delta = makePhysicsDelta({ force: [50000, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('maxForceMagnitude');
    });

    it('rejects extreme impulse', () => {
      const delta = makePhysicsDelta({ impulse: [10000, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('mass validation', () => {
    it('accepts valid mass', () => {
      const delta = makePhysicsDelta({ mass: 1.0 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects zero mass', () => {
      const delta = makePhysicsDelta({ mass: 0 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('minMass');
    });

    it('rejects negative mass', () => {
      const delta = makePhysicsDelta({ mass: -10 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects excessive mass', () => {
      const delta = makePhysicsDelta({ mass: 999999 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('maxMass');
    });

    it('rejects NaN mass', () => {
      const delta = makePhysicsDelta({ mass: NaN });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('gravity scale validation', () => {
    it('accepts zero-g (0.0)', () => {
      const delta = makePhysicsDelta({ gravityScale: 0 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects negative gravity scale', () => {
      const delta = makePhysicsDelta({ gravityScale: -5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects excessive gravity scale', () => {
      const delta = makePhysicsDelta({ gravityScale: 50 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('maxGravityScale');
    });
  });

  describe('position validation', () => {
    it('accepts position within world bounds', () => {
      const delta = makePhysicsDelta({ position: [100, 200, 300] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects position beyond world radius', () => {
      const delta = makePhysicsDelta({ position: [50000, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('maxPositionMagnitude');
    });
  });

  describe('cross-domain acceptance', () => {
    it('accepts material deltas (not physics domain)', () => {
      const delta = makeMaterialDelta({ metallic: 0.5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('accepts trait deltas (not physics domain)', () => {
      const delta = makeTraitDelta({ existingTraits: ['grabbable', 'physics'] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });
  });

  describe('transform validation', () => {
    it('accepts position within bounds via transform', () => {
      const delta = makeTransformDelta({ position: [100, 200, 300] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects position beyond world bounds via transform', () => {
      const delta = makeTransformDelta({ position: [50000, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects negative scale', () => {
      const delta = makeTransformDelta({ scale: [-1, 1, 1] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('warns about extreme scale', () => {
      const delta = makeTransformDelta({ scale: [2000, 1, 1] });
      const result = validator.validate(delta);
      // Warning, not error — still accepted
      expect(result.verdict).toBe('accept');
      expect(result.violations.some((v) => v.severity === 'warning')).toBe(true);
    });
  });

  describe('world validation', () => {
    it('accepts normal world gravity', () => {
      const delta = makeWorldDelta({ gravity: [0, -9.81, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects extreme world gravity', () => {
      const delta = makeWorldDelta({ gravity: [0, -99999, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('custom envelope', () => {
    it('uses custom strict envelope', () => {
      const strictValidator = createPhysicsValidator(
        Object.freeze({
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
        })
      );

      const delta = makePhysicsDelta({ velocity: [20, 0, 0] });
      const result = strictValidator.validate(delta);
      expect(result.verdict).toBe('reject'); // 20 > 10
    });
  });
});

// =============================================================================
// 2. MATERIALS VALIDATOR
// =============================================================================

describe('MaterialsValidator', () => {
  let validator: MaterialsValidator;

  beforeEach(() => {
    validator = createMaterialsValidator();
  });

  describe('material type validation', () => {
    it('accepts valid material type', () => {
      const delta = makeMaterialDelta({ materialType: 'pbr' });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('accepts HoloScript grammar material types', () => {
      const delta = makeMaterialDelta({ materialType: 'glass_material' });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects invalid material type', () => {
      const delta = makeMaterialDelta({ materialType: 'invalid_material' });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].constraint).toBe('validMaterialType');
    });
  });

  describe('PBR property validation', () => {
    it('accepts valid PBR properties', () => {
      const delta = makeMaterialDelta({
        metallic: 0.8,
        roughness: 0.2,
        baseColor: { r: 0.77, g: 0.77, b: 0.77 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects metallic > 1', () => {
      const delta = makeMaterialDelta({ metallic: 1.5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].property).toBe('metallic');
    });

    it('rejects metallic < 0', () => {
      const delta = makeMaterialDelta({ metallic: -0.5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects roughness > 1', () => {
      const delta = makeMaterialDelta({ roughness: 2.0 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects NaN metallic', () => {
      const delta = makeMaterialDelta({ metallic: NaN });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('color validation', () => {
    it('accepts valid linear-space color', () => {
      const delta = makeMaterialDelta({
        baseColor: { r: 0.5, g: 0.5, b: 0.5 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects color components > 1 (linear space)', () => {
      const delta = makeMaterialDelta({
        baseColor: { r: 2.0, g: 0.5, b: 0.5 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations[0].property).toBe('baseColor.r');
    });

    it('rejects negative color components', () => {
      const delta = makeMaterialDelta({
        baseColor: { r: -0.5, g: 0.5, b: 0.5 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('IOR validation', () => {
    it('accepts valid IOR (glass = 1.5)', () => {
      const delta = makeMaterialDelta({ ior: 1.5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects IOR < 1.0', () => {
      const delta = makeMaterialDelta({ ior: 0.5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('blend mode validation', () => {
    it('accepts valid blend mode', () => {
      const delta = makeMaterialDelta({ blendMode: 'blend' });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects invalid blend mode', () => {
      const delta = makeMaterialDelta({ blendMode: 'screen' });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('texture channel validation', () => {
    it('accepts valid texture channels', () => {
      const delta = makeMaterialDelta({
        textures: [
          { channel: 'baseColor', path: '/textures/wood.png' },
          { channel: 'normalMap', path: '/textures/wood_normal.png' },
        ],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects invalid texture channel', () => {
      const delta = makeMaterialDelta({
        textures: [{ channel: 'invalidChannel', path: '/textures/test.png' }],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects empty texture path', () => {
      const delta = makeMaterialDelta({
        textures: [{ channel: 'baseColor', path: '' }],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('volumetric material validation', () => {
    it('accepts valid volumetric properties', () => {
      const delta = makeMaterialDelta({
        volumetric: {
          volumeType: 'fog',
          density: 0.5,
          scattering: 0.3,
          absorption: 0.1,
        },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects invalid volume type', () => {
      const delta = makeMaterialDelta({
        volumetric: {
          volumeType: 'plasma',
          density: 0.5,
          scattering: 0.3,
          absorption: 0.1,
        },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects density > 1', () => {
      const delta = makeMaterialDelta({
        volumetric: {
          density: 2.0,
        },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('advanced PBR validation', () => {
    it('accepts valid sheen properties', () => {
      const delta = makeMaterialDelta({
        sheen: { intensity: 0.5, roughness: 0.3 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects sheen intensity > 1', () => {
      const delta = makeMaterialDelta({
        sheen: { intensity: 1.5, roughness: 0.3 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('accepts valid clearcoat properties', () => {
      const delta = makeMaterialDelta({
        clearcoat: { intensity: 0.8, roughness: 0.1 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('accepts valid iridescence properties', () => {
      const delta = makeMaterialDelta({
        iridescence: { intensity: 0.6, ior: 1.3 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects iridescence IOR < 1.0', () => {
      const delta = makeMaterialDelta({
        iridescence: { intensity: 0.6, ior: 0.5 },
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('cross-domain acceptance', () => {
    it('accepts physics deltas (not materials domain)', () => {
      const delta = makePhysicsDelta({ velocity: [50, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('accepts trait deltas (not materials domain)', () => {
      const delta = makeTraitDelta({ existingTraits: ['grabbable'] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });
  });
});

// =============================================================================
// 3. SCHEMA VALIDATOR
// =============================================================================

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = createSchemaValidator();
  });

  describe('requires constraints', () => {
    it('accepts valid trait combination (physics + collidable)', () => {
      const delta = makeTraitDelta({
        attach: ['physics'],
        existingTraits: ['collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects physics without collidable', () => {
      const delta = makeTraitDelta({
        attach: ['physics'],
        existingTraits: [],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations.some((v) => v.constraint === 'requires:collidable')).toBe(true);
    });

    it('rejects throwable without grabbable', () => {
      const delta = makeTraitDelta({
        attach: ['throwable'],
        existingTraits: ['physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations.some((v) => v.constraint === 'requires:grabbable')).toBe(true);
    });

    it('accepts full throwable chain (throwable + grabbable + physics + collidable)', () => {
      const delta = makeTraitDelta({
        attach: ['throwable'],
        existingTraits: ['grabbable', 'physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('rejects cloth without mesh', () => {
      const delta = makeTraitDelta({
        attach: ['cloth'],
        existingTraits: [],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects spatial_audio without audio', () => {
      const delta = makeTraitDelta({
        attach: ['spatial_audio'],
        existingTraits: [],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects norm_compliant without cultural_profile', () => {
      const delta = makeTraitDelta({
        attach: ['norm_compliant'],
        existingTraits: [],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('conflicts constraints', () => {
    it('rejects static + physics conflict', () => {
      const delta = makeTraitDelta({
        attach: ['static'],
        existingTraits: ['physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
      expect(result.violations.some((v) => v.constraint === 'conflicts:physics')).toBe(true);
    });

    it('rejects vr_only + ar_only conflict', () => {
      const delta = makeTraitDelta({
        attach: ['vr_only'],
        existingTraits: ['ar_only'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects invisible + hoverable conflict', () => {
      const delta = makeTraitDelta({
        attach: ['invisible'],
        existingTraits: ['hoverable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects local_only + networked conflict', () => {
      const delta = makeTraitDelta({
        attach: ['local_only'],
        existingTraits: ['networked', 'physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects urdf_robot + cloth conflict', () => {
      const delta = makeTraitDelta({
        attach: ['urdf_robot'],
        existingTraits: ['cloth', 'mesh'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });
  });

  describe('oneof constraints', () => {
    it('rejects multiple interaction modes (grabbable + clickable)', () => {
      const delta = makeTraitDelta({
        attach: ['clickable'],
        existingTraits: ['grabbable', 'physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('rejects multiple UI position modes', () => {
      const delta = makeTraitDelta({
        attach: ['ui_floating'],
        existingTraits: ['ui_anchored'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('reject');
    });

    it('accepts single interaction mode', () => {
      const delta = makeTraitDelta({
        attach: ['grabbable'],
        existingTraits: ['physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });
  });

  describe('detachment handling', () => {
    it('allows valid state after detachment', () => {
      // Remove physics from a node that has throwable -> should fail
      // because throwable requires grabbable which requires physics
      const delta = makeTraitDelta({
        detach: ['physics'],
        existingTraits: ['throwable', 'grabbable', 'physics', 'collidable'],
      });
      const result = validator.validate(delta);
      // After detach: throwable + grabbable + collidable
      // grabbable requires physics -> violation
      expect(result.verdict).toBe('reject');
    });

    it('accepts clean detachment', () => {
      // Remove throwable (no other trait requires it)
      const delta = makeTraitDelta({
        detach: ['throwable'],
        existingTraits: ['throwable', 'grabbable', 'physics', 'collidable'],
      });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });
  });

  describe('cross-domain acceptance', () => {
    it('accepts physics deltas (not schema domain)', () => {
      const delta = makePhysicsDelta({ velocity: [50, 0, 0] });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });

    it('accepts material deltas (not schema domain)', () => {
      const delta = makeMaterialDelta({ metallic: 0.5 });
      const result = validator.validate(delta);
      expect(result.verdict).toBe('accept');
    });
  });

  describe('constraint introspection', () => {
    it('reports constraint counts', () => {
      const counts = validator.getConstraintCounts();
      expect(counts.requires).toBeGreaterThan(0);
      expect(counts.conflicts).toBeGreaterThan(0);
      expect(counts.oneof).toBeGreaterThan(0);
    });

    it('has expected number of total constraints', () => {
      const constraints = validator.getConstraints();
      // We embedded 37 constraints
      expect(constraints.length).toBeGreaterThanOrEqual(35);
    });
  });
});

// =============================================================================
// 4. CROSS-VALIDATION ENGINE — 2-OF-3 QUORUM
// =============================================================================

describe('CrossValidationEngine', () => {
  let engine: CrossValidationEngine;

  beforeEach(() => {
    engine = createCrossValidationEngine();
  });

  describe('quorum consensus', () => {
    it('accepts physics delta within bounds (3/3 accept)', () => {
      const delta = makePhysicsDelta({ velocity: [10, 0, 0] });
      const result = engine.validate(delta);
      expect(result.accepted).toBe(true);
      expect(result.acceptCount).toBe(3);
      expect(result.rejectCount).toBe(0);
    });

    it('rejects physics delta exceeding bounds (physics rejects, 2/3 accept)', () => {
      const delta = makePhysicsDelta({ velocity: [200, 0, 0] });
      const result = engine.validate(delta);
      // Physics rejects, Materials accepts (not its domain), Schema accepts (not its domain)
      expect(result.accepted).toBe(true); // 2-of-3 quorum
      expect(result.acceptCount).toBe(2);
      expect(result.rejectCount).toBe(1);
    });

    it('accepts valid material delta (3/3 accept)', () => {
      const delta = makeMaterialDelta({
        materialType: 'pbr',
        metallic: 0.5,
        roughness: 0.3,
        baseColor: { r: 0.5, g: 0.5, b: 0.5 },
      });
      const result = engine.validate(delta);
      expect(result.accepted).toBe(true);
      expect(result.acceptCount).toBe(3);
    });

    it('still accepts material delta with invalid type (2/3: materials rejects)', () => {
      const delta = makeMaterialDelta({
        materialType: 'invalid_type',
        metallic: 0.5,
      });
      const result = engine.validate(delta);
      // Materials rejects, Physics accepts (not its domain), Schema accepts (not its domain)
      expect(result.accepted).toBe(true); // 2-of-3 quorum
      expect(result.rejectCount).toBe(1);
    });

    it('accepts valid trait delta (3/3 accept)', () => {
      const delta = makeTraitDelta({
        attach: ['physics'],
        existingTraits: ['collidable'],
      });
      const result = engine.validate(delta);
      expect(result.accepted).toBe(true);
    });

    it('still accepts trait delta with schema violation (2/3: schema rejects)', () => {
      const delta = makeTraitDelta({
        attach: ['physics'],
        existingTraits: [], // Missing collidable
      });
      const result = engine.validate(delta);
      // Schema rejects, Physics accepts (not its domain), Materials accepts (not its domain)
      expect(result.accepted).toBe(true); // 2-of-3 quorum
      expect(result.rejectCount).toBe(1);
    });
  });

  describe('composite deltas', () => {
    it('validates composite delta through all validators', () => {
      const delta: StateDelta = {
        id: 'composite-test',
        timestamp: new Date().toISOString(),
        agentId: 'test-agent',
        worldId: 'test-world',
        nodeId: 'test-node',
        category: 'composite',
        payload: {
          type: 'composite',
          deltas: [
            { type: 'physics', velocity: [200, 0, 0] }, // Physics reject
            { type: 'material', metallic: 1.5 }, // Materials reject
          ],
        },
      };
      const result = engine.validate(delta);
      // Physics rejects (velocity), Materials rejects (metallic), Schema accepts
      expect(result.accepted).toBe(false); // Only 1/3 accept
      expect(result.rejectCount).toBe(2);
    });
  });

  describe('statistics tracking', () => {
    it('tracks total deltas processed', () => {
      engine.validate(makePhysicsDelta({ velocity: [10, 0, 0] }));
      engine.validate(makePhysicsDelta({ velocity: [20, 0, 0] }));
      engine.validate(makePhysicsDelta({ velocity: [30, 0, 0] }));

      const stats = engine.getStats();
      expect(stats.totalDeltas).toBe(3);
      expect(stats.totalAccepted).toBe(3);
      expect(stats.acceptanceRate).toBe(1);
    });

    it('tracks per-validator stats', () => {
      engine.validate(makePhysicsDelta({ velocity: [200, 0, 0] }));

      const stats = engine.getStats();
      expect(stats.perValidator.physics.totalRejected).toBe(1);
      expect(stats.perValidator.materials.totalAccepted).toBe(1);
      expect(stats.perValidator.schema.totalAccepted).toBe(1);
    });

    it('tracks violation counts', () => {
      engine.validate(makePhysicsDelta({ velocity: [200, 0, 0] }));
      engine.validate(makePhysicsDelta({ velocity: [300, 0, 0] }));

      const stats = engine.getStats();
      expect(stats.topViolations.length).toBeGreaterThan(0);
    });

    it('resets stats correctly', () => {
      engine.validate(makePhysicsDelta({ velocity: [10, 0, 0] }));
      engine.resetStats();

      const stats = engine.getStats();
      expect(stats.totalDeltas).toBe(0);
      expect(stats.totalAccepted).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('invokes onValidation for each validator', () => {
      const onValidation = vi.fn();
      const callbackEngine = createCrossValidationEngine({ onValidation });

      callbackEngine.validate(makePhysicsDelta({ velocity: [10, 0, 0] }));

      // 3 validators = 3 calls
      expect(onValidation).toHaveBeenCalledTimes(3);
    });

    it('invokes onConsensus once per delta', () => {
      const onConsensus = vi.fn();
      const callbackEngine = createCrossValidationEngine({ onConsensus });

      callbackEngine.validate(makePhysicsDelta({ velocity: [10, 0, 0] }));

      expect(onConsensus).toHaveBeenCalledTimes(1);
      expect(onConsensus.mock.calls[0][0].accepted).toBe(true);
    });
  });

  describe('batch validation', () => {
    it('validates multiple deltas', () => {
      const deltas = [
        makePhysicsDelta({ velocity: [10, 0, 0] }),
        makePhysicsDelta({ velocity: [200, 0, 0] }),
        makeMaterialDelta({ metallic: 0.5 }),
      ];

      const results = engine.validateBatch(deltas);
      expect(results).toHaveLength(3);
      expect(results[0].accepted).toBe(true);
      expect(results[1].accepted).toBe(true); // 2/3 accept
      expect(results[2].accepted).toBe(true);
    });
  });

  describe('introspection', () => {
    it('reports 3 validators', () => {
      expect(engine.getValidatorCount()).toBe(3);
    });

    it('reports default quorum of 2', () => {
      expect(engine.getQuorum()).toBe(2);
    });

    it('lists validators with correct IDs', () => {
      const validators = engine.getValidators();
      const ids = validators.map((v) => v.id);
      expect(ids).toContain('physics');
      expect(ids).toContain('materials');
      expect(ids).toContain('schema');
    });
  });

  describe('custom quorum', () => {
    it('requires unanimous agreement with quorum 3', () => {
      const strictEngine = createCrossValidationEngine({ quorum: 3 });

      // Physics rejects, others accept — not unanimous
      const delta = makePhysicsDelta({ velocity: [200, 0, 0] });
      const result = strictEngine.validate(delta);
      expect(result.accepted).toBe(false);
      expect(result.quorum).toBe(3);
    });

    it('accepts with single validator approval when quorum is 1', () => {
      const lenientEngine = createCrossValidationEngine({ quorum: 1 });

      const delta: StateDelta = {
        id: 'multi-fail',
        timestamp: new Date().toISOString(),
        agentId: 'test-agent',
        worldId: 'test-world',
        nodeId: 'test-node',
        category: 'composite',
        payload: {
          type: 'composite',
          deltas: [
            { type: 'physics', velocity: [200, 0, 0] },
            { type: 'material', metallic: 1.5 },
          ],
        },
      };
      const result = lenientEngine.validate(delta);
      // Physics rejects, Materials rejects, Schema accepts
      expect(result.accepted).toBe(true); // 1/3 is enough
    });
  });
});

// =============================================================================
// 5. CUSTOM VALIDATORS
// =============================================================================

describe('Custom CrossValidationEngine', () => {
  it('works with custom validator set', () => {
    const alwaysAccept = {
      id: 'physics' as const,
      name: 'Always Accept',
      validate: (): ValidationResult => ({
        validatorId: 'physics',
        verdict: 'accept',
        reason: 'Always accepts',
        violations: [],
        durationMs: 0,
        deltaId: '',
      }),
    };

    const alwaysReject = {
      id: 'materials' as const,
      name: 'Always Reject',
      validate: (delta: StateDelta): ValidationResult => ({
        validatorId: 'materials',
        verdict: 'reject',
        reason: 'Always rejects',
        violations: [
          {
            property: 'test',
            proposedValue: 'test',
            constraint: 'test',
            severity: 'error' as const,
          },
        ],
        durationMs: 0,
        deltaId: delta.id,
      }),
    };

    const engine = createCustomCrossValidationEngine([alwaysAccept, alwaysReject], { quorum: 1 });

    const delta = makePhysicsDelta({});
    const result = engine.validate(delta);
    expect(result.accepted).toBe(true); // 1/2 accept, quorum is 1
  });

  it('throws if fewer than 2 validators', () => {
    expect(() => {
      createCustomCrossValidationEngine([
        {
          id: 'physics',
          name: 'Solo',
          validate: () => ({
            validatorId: 'physics',
            verdict: 'accept',
            reason: '',
            violations: [],
            durationMs: 0,
            deltaId: '',
          }),
        },
      ]);
    }).toThrow('at least 2 validators');
  });

  it('throws if quorum exceeds validator count', () => {
    expect(() => {
      createCrossValidationEngine({ quorum: 5 });
    }).toThrow();
  });
});

// =============================================================================
// 6. UTILITY: createStateDelta
// =============================================================================

describe('createStateDelta', () => {
  it('auto-generates ID and timestamp', () => {
    const delta = createStateDelta({
      agentId: 'agent-1',
      worldId: 'world-1',
      nodeId: 'node-1',
      category: 'physics',
      payload: { type: 'physics', velocity: [10, 0, 0] },
    });

    expect(delta.id).toBeTruthy();
    expect(delta.id).toMatch(/^delta_/);
    expect(delta.timestamp).toBeTruthy();
    expect(delta.agentId).toBe('agent-1');
  });

  it('generates unique IDs', () => {
    const d1 = createStateDelta({
      agentId: 'a',
      worldId: 'w',
      nodeId: 'n',
      category: 'physics',
      payload: { type: 'physics' },
    });
    const d2 = createStateDelta({
      agentId: 'a',
      worldId: 'w',
      nodeId: 'n',
      category: 'physics',
      payload: { type: 'physics' },
    });
    expect(d1.id).not.toBe(d2.id);
  });
});

// =============================================================================
// 7. AI AGENT ATTACK RESISTANCE
// =============================================================================

describe('AI agent attack resistance via cross-validation', () => {
  let engine: CrossValidationEngine;

  beforeEach(() => {
    engine = createCrossValidationEngine();
  });

  it('rejects extreme velocity injection', () => {
    const delta = makePhysicsDelta({ velocity: [999999, 999999, 999999] });
    const result = engine.validate(delta);
    // Physics rejects, but 2/3 still accept
    expect(result.results.find((r) => r.validatorId === 'physics')!.verdict).toBe('reject');
  });

  it('rejects NaN injection across physics', () => {
    const delta = makePhysicsDelta({
      velocity: [NaN, NaN, NaN],
      mass: NaN,
      gravityScale: NaN,
    });
    const result = engine.validate(delta);
    const physicsResult = result.results.find((r) => r.validatorId === 'physics')!;
    expect(physicsResult.verdict).toBe('reject');
    expect(physicsResult.violations.length).toBeGreaterThan(0);
  });

  it('rejects material property overflow', () => {
    const delta = makeMaterialDelta({
      metallic: 100,
      roughness: -50,
      baseColor: { r: 255, g: 255, b: 255 }, // sRGB values, not linear
    });
    const result = engine.validate(delta);
    const matResult = result.results.find((r) => r.validatorId === 'materials')!;
    expect(matResult.verdict).toBe('reject');
  });

  it('rejects impossible trait combinations', () => {
    // Try to be both VR-only and AR-only simultaneously
    const delta = makeTraitDelta({
      attach: ['vr_only', 'ar_only'],
      existingTraits: [],
    });
    const result = engine.validate(delta);
    const schemaResult = result.results.find((r) => r.validatorId === 'schema')!;
    expect(schemaResult.verdict).toBe('reject');
  });

  it('all three validators reject simultaneous multi-domain attack', () => {
    const delta: StateDelta = {
      id: 'multi-attack',
      timestamp: new Date().toISOString(),
      agentId: 'malicious-agent',
      worldId: 'target-world',
      nodeId: 'target-node',
      category: 'composite',
      payload: {
        type: 'composite',
        deltas: [
          { type: 'physics', velocity: [1e12, 0, 0], mass: -1 },
          { type: 'material', metallic: 999, roughness: NaN },
          { type: 'trait', attach: ['static', 'physics'], existingTraits: ['collidable'] },
        ],
      },
    };
    const result = engine.validate(delta);
    // All 3 validators should reject
    expect(result.accepted).toBe(false);
    expect(result.rejectCount).toBe(3);
    expect(result.allViolations.length).toBeGreaterThan(3);
  });
});
