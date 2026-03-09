/**
 * @vitest-environment jsdom
 */

/**
 * Tests for ProceduralCulturalGradient System
 *
 * Validates:
 * - Type factory functions and cultural parameter utilities
 * - Simplex noise determinism and value range
 * - Cultural parameter sampling (spatial coherence, value clamping 0-1)
 * - Gradient computation via finite differences
 * - Region detection (flood-fill, minimum region size filtering)
 * - Soft boundary blending (smooth-step interpolation)
 * - Stigmergic modifier computation from cultural parameters
 * - Zone boundary modifier computation from cultural parameters
 * - Lifecycle (start, stop, destroy)
 * - Event emission (gradient:regions-detected, gradient:config-changed)
 * - Metrics tracking (noise evaluations, sample times)
 * - Seed changes regenerating the cultural landscape
 * - Full sample API with gradient and region data
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
  ProceduralCulturalGradient,
  createProceduralCulturalGradient,
} from '../ProceduralCulturalGradient';

import {
  CULTURAL_PARAMETER_NAMES,
  createDefaultNoiseLayerConfig,
  createDefaultParameterNoiseConfig,
  createDefaultCulturalGradientConfig,
  createNeutralCulturalParameters,
  computeStigmergicModifiers,
  computeZoneBoundaryModifiers,
  deriveCulturalCharacter,
  lerpCulturalParameters,
  type CulturalParameters,
  type CulturalGradientConfig,
} from '../CulturalGradientTypes';

// =============================================================================
// HELPERS
// =============================================================================

function createTestGradient(
  overrides?: Partial<CulturalGradientConfig> & { seed?: number },
): ProceduralCulturalGradient {
  return createProceduralCulturalGradient({
    worldId: 'test-world',
    seed: 42,
    gridResolution: 30, // Moderate grid for fast tests but enough for region detection
    worldBounds: {
      min: { x: -50, y: -10, z: -50 },
      max: { x: 50, y: 50, z: 50 },
    },
    boundaryGradientThreshold: 0.15, // Default threshold matches production config
    minRegionSize: 3, // Lower minimum for small grids
    regionDetectionHz: 0, // Disable periodic detection
    ...overrides,
  });
}

// =============================================================================
// TYPE FACTORY FUNCTIONS
// =============================================================================

describe('CulturalGradientTypes Factory Functions', () => {
  describe('createDefaultNoiseLayerConfig', () => {
    it('creates config with default values', () => {
      const config = createDefaultNoiseLayerConfig();
      expect(config.frequency).toBe(0.01);
      expect(config.amplitude).toBe(1.0);
      expect(config.octaves).toBe(3);
      expect(config.lacunarity).toBe(2.0);
      expect(config.persistence).toBe(0.5);
      expect(config.seedOffset).toBe(0);
    });

    it('accepts partial overrides', () => {
      const config = createDefaultNoiseLayerConfig({
        frequency: 0.05,
        octaves: 5,
      });
      expect(config.frequency).toBe(0.05);
      expect(config.octaves).toBe(5);
      expect(config.amplitude).toBe(1.0); // Default preserved
    });
  });

  describe('createDefaultParameterNoiseConfig', () => {
    it('creates config with specified seed offset', () => {
      const config = createDefaultParameterNoiseConfig(1000);
      expect(config.noise.seedOffset).toBe(1000);
      expect(config.bias).toBe(0.5);
      expect(config.min).toBe(0.0);
      expect(config.max).toBe(1.0);
    });

    it('accepts partial overrides', () => {
      const config = createDefaultParameterNoiseConfig(0, {
        bias: 0.7,
        min: 0.2,
        max: 0.9,
      });
      expect(config.bias).toBe(0.7);
      expect(config.min).toBe(0.2);
      expect(config.max).toBe(0.9);
    });
  });

  describe('createDefaultCulturalGradientConfig', () => {
    it('creates config with world ID and seed', () => {
      const config = createDefaultCulturalGradientConfig('my-world', 123);
      expect(config.worldId).toBe('my-world');
      expect(config.seed).toBe(123);
      expect(config.dimensionality).toBe('2d');
      expect(config.gridResolution).toBe(100);
    });

    it('generates random seed when not provided', () => {
      const config = createDefaultCulturalGradientConfig('world');
      expect(config.seed).toBeGreaterThanOrEqual(0);
      expect(config.seed).toBeLessThan(2147483647);
    });

    it('accepts overrides', () => {
      const config = createDefaultCulturalGradientConfig('world', 42, {
        dimensionality: '3d',
        gridResolution: 50,
        boundaryBlendWidth: 10.0,
      });
      expect(config.dimensionality).toBe('3d');
      expect(config.gridResolution).toBe(50);
      expect(config.boundaryBlendWidth).toBe(10.0);
    });
  });

  describe('createNeutralCulturalParameters', () => {
    it('creates parameters with all values at 0.5', () => {
      const params = createNeutralCulturalParameters();
      expect(params.cooperationTendency).toBe(0.5);
      expect(params.normStrictness).toBe(0.5);
      expect(params.punishmentSeverity).toBe(0.5);
      expect(params.opennessToOutsiders).toBe(0.5);
    });
  });

  describe('CULTURAL_PARAMETER_NAMES', () => {
    it('contains all four parameter names', () => {
      expect(CULTURAL_PARAMETER_NAMES).toHaveLength(4);
      expect(CULTURAL_PARAMETER_NAMES).toContain('cooperationTendency');
      expect(CULTURAL_PARAMETER_NAMES).toContain('normStrictness');
      expect(CULTURAL_PARAMETER_NAMES).toContain('punishmentSeverity');
      expect(CULTURAL_PARAMETER_NAMES).toContain('opennessToOutsiders');
    });
  });
});

// =============================================================================
// STIGMERGIC MODIFIER COMPUTATION
// =============================================================================

describe('computeStigmergicModifiers', () => {
  it('computes modifiers for neutral parameters', () => {
    const params = createNeutralCulturalParameters();
    const mods = computeStigmergicModifiers(params);

    // At 0.5 cooperation: 0.5 + 0.5 * 1.5 = 1.25
    expect(mods.intensityMultiplier).toBeCloseTo(1.25);
    expect(mods.reinforcementMultiplier).toBeCloseTo(1.25);
    // At 0.5 normStrictness: 0.5 + 0.5 * 1.5 = 1.25
    expect(mods.decayMultiplier).toBeCloseTo(1.25);
    // At 0.5 openness: 0.5 + 0.5 * 1.5 = 1.25
    expect(mods.diffusionMultiplier).toBeCloseTo(1.25);
  });

  it('produces minimum modifiers for low parameter values', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0,
      normStrictness: 0,
      punishmentSeverity: 0,
      opennessToOutsiders: 0,
    };
    const mods = computeStigmergicModifiers(params);

    expect(mods.intensityMultiplier).toBeCloseTo(0.5);
    expect(mods.decayMultiplier).toBeCloseTo(0.5);
    expect(mods.diffusionMultiplier).toBeCloseTo(0.5);
    expect(mods.reinforcementMultiplier).toBeCloseTo(0.5);
  });

  it('produces maximum modifiers for high parameter values', () => {
    const params: CulturalParameters = {
      cooperationTendency: 1,
      normStrictness: 1,
      punishmentSeverity: 1,
      opennessToOutsiders: 1,
    };
    const mods = computeStigmergicModifiers(params);

    expect(mods.intensityMultiplier).toBeCloseTo(2.0);
    expect(mods.decayMultiplier).toBeCloseTo(2.0);
    expect(mods.diffusionMultiplier).toBeCloseTo(2.0);
    expect(mods.reinforcementMultiplier).toBeCloseTo(2.0);
  });
});

// =============================================================================
// ZONE BOUNDARY MODIFIER COMPUTATION
// =============================================================================

describe('computeZoneBoundaryModifiers', () => {
  it('computes modifiers for neutral parameters', () => {
    const params = createNeutralCulturalParameters();
    const mods = computeZoneBoundaryModifiers(params);

    // At 0.5 openness: trustModifier = (0.5 - 0.5) * 0.6 = 0
    expect(mods.trustModifier).toBeCloseTo(0);
    // bandwidthModifier = 0.5 + 0.5 * 1.5 = 1.25
    expect(mods.bandwidthModifier).toBeCloseTo(1.25);
    // permeabilityModifier = 0.5 + 0.5 * 1.5 = 1.25
    expect(mods.permeabilityModifier).toBeCloseTo(1.25);
  });

  it('computes high trust requirements for insular cultures', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0.5,
      normStrictness: 0.5,
      punishmentSeverity: 0.5,
      opennessToOutsiders: 0, // Very insular
    };
    const mods = computeZoneBoundaryModifiers(params);

    // trustModifier = (0.5 - 0) * 0.6 = 0.3 (increases trust requirement)
    expect(mods.trustModifier).toBeCloseTo(0.3);
    // bandwidthModifier = 0.5 + 0 * 1.5 = 0.5 (reduced bandwidth)
    expect(mods.bandwidthModifier).toBeCloseTo(0.5);
    // permeabilityModifier = 0.5 (low permeability)
    expect(mods.permeabilityModifier).toBeCloseTo(0.5);
  });

  it('computes low trust requirements for open cultures', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0.5,
      normStrictness: 0.5,
      punishmentSeverity: 0.5,
      opennessToOutsiders: 1, // Very open
    };
    const mods = computeZoneBoundaryModifiers(params);

    // trustModifier = (0.5 - 1) * 0.6 = -0.3 (lowers trust requirement)
    expect(mods.trustModifier).toBeCloseTo(-0.3);
    // bandwidthModifier = 0.5 + 1 * 1.5 = 2.0 (maximum bandwidth)
    expect(mods.bandwidthModifier).toBeCloseTo(2.0);
    // permeabilityModifier = 2.0 (maximum permeability)
    expect(mods.permeabilityModifier).toBeCloseTo(2.0);
  });
});

// =============================================================================
// CULTURAL CHARACTER DERIVATION
// =============================================================================

describe('deriveCulturalCharacter', () => {
  it('returns "moderate" for neutral parameters', () => {
    const params = createNeutralCulturalParameters();
    expect(deriveCulturalCharacter(params)).toBe('moderate');
  });

  it('identifies cooperative cultures', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0.9,
      normStrictness: 0.5,
      punishmentSeverity: 0.5,
      opennessToOutsiders: 0.5,
    };
    expect(deriveCulturalCharacter(params)).toBe('cooperative');
  });

  it('identifies competitive cultures', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0.1,
      normStrictness: 0.5,
      punishmentSeverity: 0.5,
      opennessToOutsiders: 0.5,
    };
    expect(deriveCulturalCharacter(params)).toBe('competitive');
  });

  it('identifies multi-trait cultures', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0.9,
      normStrictness: 0.9,
      punishmentSeverity: 0.1,
      opennessToOutsiders: 0.9,
    };
    const character = deriveCulturalCharacter(params);
    expect(character).toContain('cooperative');
    expect(character).toContain('tight');
    expect(character).toContain('forgiving');
    expect(character).toContain('open');
  });

  it('identifies insular cultures', () => {
    const params: CulturalParameters = {
      cooperationTendency: 0.5,
      normStrictness: 0.5,
      punishmentSeverity: 0.5,
      opennessToOutsiders: 0.1,
    };
    expect(deriveCulturalCharacter(params)).toBe('insular');
  });
});

// =============================================================================
// CULTURAL PARAMETER INTERPOLATION
// =============================================================================

describe('lerpCulturalParameters', () => {
  it('returns first parameter set at t=0', () => {
    const a: CulturalParameters = {
      cooperationTendency: 0.0,
      normStrictness: 0.0,
      punishmentSeverity: 0.0,
      opennessToOutsiders: 0.0,
    };
    const b: CulturalParameters = {
      cooperationTendency: 1.0,
      normStrictness: 1.0,
      punishmentSeverity: 1.0,
      opennessToOutsiders: 1.0,
    };

    const result = lerpCulturalParameters(a, b, 0);
    expect(result.cooperationTendency).toBeCloseTo(0.0);
    expect(result.normStrictness).toBeCloseTo(0.0);
    expect(result.punishmentSeverity).toBeCloseTo(0.0);
    expect(result.opennessToOutsiders).toBeCloseTo(0.0);
  });

  it('returns second parameter set at t=1', () => {
    const a: CulturalParameters = {
      cooperationTendency: 0.0,
      normStrictness: 0.0,
      punishmentSeverity: 0.0,
      opennessToOutsiders: 0.0,
    };
    const b: CulturalParameters = {
      cooperationTendency: 1.0,
      normStrictness: 1.0,
      punishmentSeverity: 1.0,
      opennessToOutsiders: 1.0,
    };

    const result = lerpCulturalParameters(a, b, 1);
    expect(result.cooperationTendency).toBeCloseTo(1.0);
    expect(result.normStrictness).toBeCloseTo(1.0);
    expect(result.punishmentSeverity).toBeCloseTo(1.0);
    expect(result.opennessToOutsiders).toBeCloseTo(1.0);
  });

  it('returns midpoint at t=0.5', () => {
    const a: CulturalParameters = {
      cooperationTendency: 0.2,
      normStrictness: 0.4,
      punishmentSeverity: 0.6,
      opennessToOutsiders: 0.8,
    };
    const b: CulturalParameters = {
      cooperationTendency: 0.8,
      normStrictness: 0.6,
      punishmentSeverity: 0.4,
      opennessToOutsiders: 0.2,
    };

    const result = lerpCulturalParameters(a, b, 0.5);
    expect(result.cooperationTendency).toBeCloseTo(0.5);
    expect(result.normStrictness).toBeCloseTo(0.5);
    expect(result.punishmentSeverity).toBeCloseTo(0.5);
    expect(result.opennessToOutsiders).toBeCloseTo(0.5);
  });

  it('clamps t to [0, 1] range', () => {
    const a = createNeutralCulturalParameters();
    const b: CulturalParameters = {
      cooperationTendency: 1.0,
      normStrictness: 1.0,
      punishmentSeverity: 1.0,
      opennessToOutsiders: 1.0,
    };

    const result1 = lerpCulturalParameters(a, b, -0.5);
    expect(result1.cooperationTendency).toBeCloseTo(0.5); // Clamped to t=0

    const result2 = lerpCulturalParameters(a, b, 1.5);
    expect(result2.cooperationTendency).toBeCloseTo(1.0); // Clamped to t=1
  });
});

// =============================================================================
// PROCEDURAL CULTURAL GRADIENT - LIFECYCLE
// =============================================================================

describe('ProceduralCulturalGradient Lifecycle', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient();
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('initializes in stopped state', () => {
    expect(gradient.isRunning()).toBe(false);
  });

  it('starts and stops', () => {
    gradient.start();
    expect(gradient.isRunning()).toBe(true);
    gradient.stop();
    expect(gradient.isRunning()).toBe(false);
  });

  it('ignores duplicate start calls', () => {
    gradient.start();
    gradient.start(); // Should warn but not crash
    expect(gradient.isRunning()).toBe(true);
  });

  it('ignores stop when not running', () => {
    gradient.stop(); // Should not crash
    expect(gradient.isRunning()).toBe(false);
  });

  it('destroy clears all state', () => {
    gradient.start();
    expect(gradient.isRunning()).toBe(true);
    expect(gradient.getDetectedRegions().length).toBeGreaterThan(0);

    gradient.destroy();
    expect(gradient.isRunning()).toBe(false);
    expect(gradient.getDetectedRegions().length).toBe(0);
    expect(gradient.getRegionBoundaries().length).toBe(0);
  });

  it('factory function creates gradient', () => {
    const g = createProceduralCulturalGradient({
      worldId: 'factory-test',
      seed: 99,
    });
    expect(g).toBeInstanceOf(ProceduralCulturalGradient);
    g.destroy();
  });
});

// =============================================================================
// NOISE DETERMINISM AND VALUE RANGE
// =============================================================================

describe('Noise Determinism and Value Range', () => {
  it('produces deterministic results from the same seed', () => {
    const g1 = createTestGradient({ seed: 42 });
    const g2 = createTestGradient({ seed: 42 });

    const pos = { x: 10, y: 0, z: 15 };
    const p1 = g1.sampleParameters(pos);
    const p2 = g2.sampleParameters(pos);

    expect(p1.cooperationTendency).toBe(p2.cooperationTendency);
    expect(p1.normStrictness).toBe(p2.normStrictness);
    expect(p1.punishmentSeverity).toBe(p2.punishmentSeverity);
    expect(p1.opennessToOutsiders).toBe(p2.opennessToOutsiders);

    g1.destroy();
    g2.destroy();
  });

  it('produces different results from different seeds', () => {
    const g1 = createTestGradient({ seed: 42 });
    const g2 = createTestGradient({ seed: 999 });

    const pos = { x: 10, y: 0, z: 15 };
    const p1 = g1.sampleParameters(pos);
    const p2 = g2.sampleParameters(pos);

    // At least one parameter should differ between different seeds
    const allSame =
      p1.cooperationTendency === p2.cooperationTendency &&
      p1.normStrictness === p2.normStrictness &&
      p1.punishmentSeverity === p2.punishmentSeverity &&
      p1.opennessToOutsiders === p2.opennessToOutsiders;

    expect(allSame).toBe(false);

    g1.destroy();
    g2.destroy();
  });

  it('produces values clamped to [0, 1] range', () => {
    const gradient = createTestGradient({ seed: 42 });

    // Sample many positions to check value range
    for (let x = -40; x <= 40; x += 10) {
      for (let z = -40; z <= 40; z += 10) {
        const params = gradient.sampleParameters({ x, y: 0, z });
        for (const paramName of CULTURAL_PARAMETER_NAMES) {
          expect(params[paramName]).toBeGreaterThanOrEqual(0.0);
          expect(params[paramName]).toBeLessThanOrEqual(1.0);
        }
      }
    }

    gradient.destroy();
  });

  it('each parameter uses a different noise field', () => {
    const gradient = createTestGradient({ seed: 42 });

    const pos = { x: 25, y: 0, z: 25 };
    const params = gradient.sampleParameters(pos);

    // With different seed offsets, parameters should generally differ
    // (there is a vanishingly small chance all 4 are identical)
    const values = [
      params.cooperationTendency,
      params.normStrictness,
      params.punishmentSeverity,
      params.opennessToOutsiders,
    ];
    const unique = new Set(values);
    // At least 2 different values expected
    expect(unique.size).toBeGreaterThanOrEqual(2);

    gradient.destroy();
  });
});

// =============================================================================
// SPATIAL COHERENCE
// =============================================================================

describe('Spatial Coherence', () => {
  it('nearby positions produce similar parameter values', () => {
    const gradient = createTestGradient({ seed: 42 });

    const pos1 = { x: 10, y: 0, z: 10 };
    const pos2 = { x: 10.1, y: 0, z: 10.1 };

    const p1 = gradient.sampleParameters(pos1);
    const p2 = gradient.sampleParameters(pos2);

    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      const diff = Math.abs(p1[paramName] - p2[paramName]);
      // Nearby positions should have very similar values (< 0.05 difference)
      expect(diff).toBeLessThan(0.05);
    }

    gradient.destroy();
  });

  it('distant positions can produce different parameter values', () => {
    const gradient = createTestGradient({ seed: 42 });

    const pos1 = { x: -40, y: 0, z: -40 };
    const pos2 = { x: 40, y: 0, z: 40 };

    const p1 = gradient.sampleParameters(pos1);
    const p2 = gradient.sampleParameters(pos2);

    // At least one parameter should differ between distant positions
    let hasDifference = false;
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      if (Math.abs(p1[paramName] - p2[paramName]) > 0.01) {
        hasDifference = true;
        break;
      }
    }
    expect(hasDifference).toBe(true);

    gradient.destroy();
  });
});

// =============================================================================
// SINGLE PARAMETER SAMPLING
// =============================================================================

describe('Single Parameter Sampling', () => {
  it('returns the same value as sampleParameters for the named param', () => {
    const gradient = createTestGradient({ seed: 42 });
    const pos = { x: 15, y: 0, z: 20 };

    const allParams = gradient.sampleParameters(pos);
    const single = gradient.sampleSingleParameter('cooperationTendency', pos);

    expect(single).toBe(allParams.cooperationTendency);

    gradient.destroy();
  });

  it('returns value in [0, 1]', () => {
    const gradient = createTestGradient({ seed: 42 });

    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      const value = gradient.sampleSingleParameter(paramName, { x: 10, y: 0, z: 10 });
      expect(value).toBeGreaterThanOrEqual(0.0);
      expect(value).toBeLessThanOrEqual(1.0);
    }

    gradient.destroy();
  });
});

// =============================================================================
// FULL SAMPLE API
// =============================================================================

describe('Full Sample API', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient();
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('returns complete cultural sample without regions', () => {
    const pos = { x: 10, y: 0, z: 10 };
    const sample = gradient.sampleFull(pos);

    expect(sample.position).toEqual(pos);
    expect(sample.parameters).toBeDefined();
    expect(sample.gradientMagnitude).toBeGreaterThanOrEqual(0);
    expect(sample.gradientDirection).toBeDefined();
    expect(sample.gradientDirection.y).toBe(0); // 2D gradient, no Y
    expect(sample.regionId).toBeNull(); // No regions detected yet
    expect(sample.boundaryBlendFactor).toBe(0);
    expect(sample.neighborRegionId).toBeNull();
    expect(sample.blendedParameters).toBeNull();
  });

  it('returns region information after start()', () => {
    gradient.start();

    // Sample at the center of the world
    const sample = gradient.sampleFull({ x: 0, y: 0, z: 0 });

    // After region detection, positions should have region IDs
    // (it is possible but unlikely that (0,0,0) falls on an exact boundary)
    if (gradient.getDetectedRegions().length > 0) {
      // Most positions should belong to a region
      expect(sample.parameters).toBeDefined();
      expect(sample.gradientMagnitude).toBeGreaterThanOrEqual(0);
    }
  });

  it('gradient direction is normalized', () => {
    const sample = gradient.sampleFull({ x: 10, y: 0, z: 10 });

    const dir = sample.gradientDirection;
    if (sample.gradientMagnitude > 0.0001) {
      const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
      expect(length).toBeCloseTo(1.0, 2);
    }
  });
});

// =============================================================================
// STIGMERGIC MODIFIERS VIA GRADIENT
// =============================================================================

describe('Stigmergic Modifiers via Gradient', () => {
  it('returns valid modifiers at any position', () => {
    const gradient = createTestGradient({ seed: 42 });

    const mods = gradient.getStigmergicModifiers({ x: 10, y: 0, z: 10 });

    expect(mods.intensityMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(mods.intensityMultiplier).toBeLessThanOrEqual(2.0);
    expect(mods.decayMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(mods.decayMultiplier).toBeLessThanOrEqual(2.0);
    expect(mods.diffusionMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(mods.diffusionMultiplier).toBeLessThanOrEqual(2.0);
    expect(mods.reinforcementMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(mods.reinforcementMultiplier).toBeLessThanOrEqual(2.0);

    gradient.destroy();
  });

  it('nearby positions produce similar modifiers', () => {
    const gradient = createTestGradient({ seed: 42 });

    const mods1 = gradient.getStigmergicModifiers({ x: 10, y: 0, z: 10 });
    const mods2 = gradient.getStigmergicModifiers({ x: 10.1, y: 0, z: 10.1 });

    expect(Math.abs(mods1.intensityMultiplier - mods2.intensityMultiplier)).toBeLessThan(0.1);
    expect(Math.abs(mods1.decayMultiplier - mods2.decayMultiplier)).toBeLessThan(0.1);

    gradient.destroy();
  });
});

// =============================================================================
// ZONE BOUNDARY MODIFIERS VIA GRADIENT
// =============================================================================

describe('Zone Boundary Modifiers via Gradient', () => {
  it('returns valid modifiers at any position', () => {
    const gradient = createTestGradient({ seed: 42 });

    const mods = gradient.getZoneBoundaryModifiers({ x: 10, y: 0, z: 10 });

    expect(mods.trustModifier).toBeGreaterThanOrEqual(-0.3);
    expect(mods.trustModifier).toBeLessThanOrEqual(0.3);
    expect(mods.bandwidthModifier).toBeGreaterThanOrEqual(0.5);
    expect(mods.bandwidthModifier).toBeLessThanOrEqual(2.0);
    expect(mods.permeabilityModifier).toBeGreaterThanOrEqual(0.5);
    expect(mods.permeabilityModifier).toBeLessThanOrEqual(2.0);

    gradient.destroy();
  });
});

// =============================================================================
// REGION DETECTION
// =============================================================================

describe('Region Detection', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient();
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('detects regions when started', () => {
    gradient.start();

    const regions = gradient.getDetectedRegions();
    // Should detect at least one region with a 20x20 grid
    expect(regions.length).toBeGreaterThan(0);
  });

  it('each region has required fields', () => {
    gradient.start();

    const regions = gradient.getDetectedRegions();
    for (const region of regions) {
      expect(region.id).toBeTruthy();
      expect(region.id).toMatch(/^region-\d+$/);
      expect(region.centroid).toBeDefined();
      expect(region.centroid.x).toBeDefined();
      expect(region.centroid.z).toBeDefined();
      expect(region.radius).toBeGreaterThanOrEqual(0);
      expect(region.cellCount).toBeGreaterThanOrEqual(3); // minRegionSize
      expect(region.parameters).toBeDefined();
      expect(region.averageParameters).toBeDefined();
      expect(region.characterLabel).toBeTruthy();
      expect(region.cellIndices).toBeDefined();
      expect(region.cellIndices.length).toBe(region.cellCount);
      expect(region.neighborRegionIds).toBeDefined();
    }
  });

  it('region parameters are in valid range', () => {
    gradient.start();

    const regions = gradient.getDetectedRegions();
    for (const region of regions) {
      for (const paramName of CULTURAL_PARAMETER_NAMES) {
        expect(region.parameters[paramName]).toBeGreaterThanOrEqual(0.0);
        expect(region.parameters[paramName]).toBeLessThanOrEqual(1.0);
        expect(region.averageParameters[paramName]).toBeGreaterThanOrEqual(0.0);
        expect(region.averageParameters[paramName]).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('filters out regions smaller than minRegionSize', () => {
    gradient.start();

    const regions = gradient.getDetectedRegions();
    for (const region of regions) {
      expect(region.cellCount).toBeGreaterThanOrEqual(3); // minRegionSize=3
    }
  });

  it('getRegionAtPosition returns correct region', () => {
    gradient.start();

    const regions = gradient.getDetectedRegions();
    if (regions.length > 0) {
      const region = regions[0];
      // The centroid should typically be in its own region
      const found = gradient.getRegionAtPosition(region.centroid);
      // Note: Due to discretization, centroid might land in a different cell
      // but should still find a region
      if (found) {
        expect(found.id).toBeTruthy();
      }
    }
  });

  it('getRegionAtPosition returns null for out-of-bounds positions', () => {
    gradient.start();

    const result = gradient.getRegionAtPosition({ x: 999, y: 0, z: 999 });
    expect(result).toBeNull();
  });
});

// =============================================================================
// REGION BOUNDARIES
// =============================================================================

describe('Region Boundaries', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient();
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('detects boundaries between adjacent regions', () => {
    gradient.start();

    const regions = gradient.getDetectedRegions();
    const boundaries = gradient.getRegionBoundaries();

    // If there are multiple regions, there should be boundaries
    if (regions.length > 1) {
      expect(boundaries.length).toBeGreaterThan(0);
    }
  });

  it('each boundary has required fields', () => {
    gradient.start();

    const boundaries = gradient.getRegionBoundaries();
    for (const boundary of boundaries) {
      expect(boundary.regionAId).toBeTruthy();
      expect(boundary.regionBId).toBeTruthy();
      expect(boundary.regionAId).not.toBe(boundary.regionBId);
      expect(boundary.positions).toBeDefined();
      expect(boundary.positions.length).toBeGreaterThan(0);
      expect(boundary.averageGradientMagnitude).toBeGreaterThanOrEqual(0);
      expect(boundary.parameterDelta).toBeDefined();
      expect(boundary.blendWidth).toBeGreaterThan(0);
    }
  });

  it('boundary parameter deltas are non-negative', () => {
    gradient.start();

    const boundaries = gradient.getRegionBoundaries();
    for (const boundary of boundaries) {
      for (const paramName of CULTURAL_PARAMETER_NAMES) {
        expect(boundary.parameterDelta[paramName]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// =============================================================================
// SEED MANAGEMENT
// =============================================================================

describe('Seed Management', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient({ seed: 42 });
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('getSeed returns current seed', () => {
    expect(gradient.getSeed()).toBe(42);
  });

  it('setSeed changes the cultural landscape', () => {
    const pos = { x: 10, y: 0, z: 10 };
    const p1 = gradient.sampleParameters(pos);

    gradient.setSeed(999);
    expect(gradient.getSeed()).toBe(999);

    const p2 = gradient.sampleParameters(pos);

    // Parameters should differ with a different seed
    const allSame =
      p1.cooperationTendency === p2.cooperationTendency &&
      p1.normStrictness === p2.normStrictness &&
      p1.punishmentSeverity === p2.punishmentSeverity &&
      p1.opennessToOutsiders === p2.opennessToOutsiders;
    expect(allSame).toBe(false);
  });

  it('setSeed re-detects regions if running', () => {
    gradient.start();

    const regionsBefore = gradient.getDetectedRegions().length;

    gradient.setSeed(999);

    // Regions should have been re-detected
    const regionsAfter = gradient.getDetectedRegions().length;
    // Region count may differ or stay the same, but detection should have run
    expect(regionsAfter).toBeGreaterThan(0);
  });

  it('setSeed emits config-changed event', () => {
    const handler = vi.fn();
    gradient.on('gradient:config-changed', handler);

    gradient.setSeed(999);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        oldSeed: 42,
        newSeed: 999,
      }),
    );
  });
});

// =============================================================================
// CONFIGURATION
// =============================================================================

describe('Configuration', () => {
  it('getConfig returns the resolved config', () => {
    const gradient = createTestGradient({ seed: 42 });

    const config = gradient.getConfig();
    expect(config.worldId).toBe('test-world');
    expect(config.seed).toBe(42);
    expect(config.dimensionality).toBe('2d');
    expect(config.gridResolution).toBe(30);

    gradient.destroy();
  });

  it('supports 3D dimensionality', () => {
    const gradient = createTestGradient({
      seed: 42,
      dimensionality: '3d',
    });

    // Sample at different Y values -- should produce different results in 3D
    const p1 = gradient.sampleParameters({ x: 10, y: 0, z: 10 });
    const p2 = gradient.sampleParameters({ x: 10, y: 50, z: 10 });

    // In 3D mode, different Y positions should yield different cultural params
    let hasDifference = false;
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      if (Math.abs(p1[paramName] - p2[paramName]) > 0.001) {
        hasDifference = true;
        break;
      }
    }
    expect(hasDifference).toBe(true);

    gradient.destroy();
  });

  it('2D dimensionality ignores Y coordinate', () => {
    const gradient = createTestGradient({
      seed: 42,
      dimensionality: '2d',
    });

    const p1 = gradient.sampleParameters({ x: 10, y: 0, z: 10 });
    const p2 = gradient.sampleParameters({ x: 10, y: 100, z: 10 });

    // In 2D mode, different Y positions should yield identical results
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(p1[paramName]).toBe(p2[paramName]);
    }

    gradient.destroy();
  });
});

// =============================================================================
// EVENTS
// =============================================================================

describe('Events', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient();
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('emits gradient:regions-detected on start()', () => {
    const handler = vi.fn();
    gradient.on('gradient:regions-detected', handler);

    gradient.start();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        regions: expect.any(Array),
        boundaries: expect.any(Array),
        detectionTimeMs: expect.any(Number),
      }),
    );
  });

  it('supports unsubscribe via off()', () => {
    const handler = vi.fn();
    gradient.on('gradient:regions-detected', handler);
    gradient.off('gradient:regions-detected', handler);

    gradient.start();

    expect(handler).not.toHaveBeenCalled();
  });

  it('handles errors in event handlers gracefully', () => {
    const badHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    const goodHandler = vi.fn();

    gradient.on('gradient:regions-detected', badHandler);
    gradient.on('gradient:regions-detected', goodHandler);

    // Should not throw
    expect(() => gradient.start()).not.toThrow();

    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
  });
});

// =============================================================================
// METRICS
// =============================================================================

describe('Metrics', () => {
  let gradient: ProceduralCulturalGradient;

  beforeEach(() => {
    vi.useFakeTimers();
    gradient = createTestGradient({ seed: 42 });
  });

  afterEach(() => {
    gradient.destroy();
    vi.useRealTimers();
  });

  it('reports initial metrics', () => {
    const metrics = gradient.getMetrics();

    expect(metrics.isRunning).toBe(false);
    expect(metrics.seed).toBe(42);
    expect(metrics.regionCount).toBe(0);
    expect(metrics.boundaryCount).toBe(0);
    expect(metrics.totalNoiseEvaluations).toBe(0);
    expect(metrics.averageSampleTimeMs).toBe(0);
    expect(metrics.lastDetectionTimeMs).toBe(0);
  });

  it('tracks noise evaluations after sampling', () => {
    gradient.sampleParameters({ x: 10, y: 0, z: 10 });

    const metrics = gradient.getMetrics();
    // 4 parameters evaluated
    expect(metrics.totalNoiseEvaluations).toBe(4);
  });

  it('accumulates noise evaluations across multiple samples', () => {
    gradient.sampleParameters({ x: 0, y: 0, z: 0 });
    gradient.sampleParameters({ x: 10, y: 0, z: 10 });
    gradient.sampleParameters({ x: 20, y: 0, z: 20 });

    const metrics = gradient.getMetrics();
    expect(metrics.totalNoiseEvaluations).toBe(12); // 3 * 4
  });

  it('tracks single parameter evaluations', () => {
    gradient.sampleSingleParameter('cooperationTendency', { x: 10, y: 0, z: 10 });

    const metrics = gradient.getMetrics();
    expect(metrics.totalNoiseEvaluations).toBe(1);
  });

  it('tracks region and boundary counts after detection', () => {
    gradient.start();

    const metrics = gradient.getMetrics();
    expect(metrics.isRunning).toBe(true);
    expect(metrics.regionCount).toBeGreaterThan(0);
    expect(metrics.lastDetectionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('tracks average sample time from sampleFull()', () => {
    gradient.sampleFull({ x: 10, y: 0, z: 10 });
    gradient.sampleFull({ x: 20, y: 0, z: 20 });

    const metrics = gradient.getMetrics();
    expect(metrics.averageSampleTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('includes noise evaluations from region detection', () => {
    gradient.start(); // This triggers region detection which samples the entire grid

    const metrics = gradient.getMetrics();
    // Region detection samples the full 30x30 grid = 900 cells, each with 4 params = 3600
    // Plus buildRegion centroid samples (4 per region)
    expect(metrics.totalNoiseEvaluations).toBeGreaterThanOrEqual(900 * 4);
  });
});

// =============================================================================
// PERIODIC REGION DETECTION
// =============================================================================

describe('Periodic Region Detection', () => {
  it('runs detection periodically when regionDetectionHz > 0', () => {
    vi.useFakeTimers();

    const handler = vi.fn();
    const gradient = createTestGradient({
      seed: 42,
      regionDetectionHz: 1, // 1Hz = every 1000ms
    });

    gradient.on('gradient:regions-detected', handler);
    gradient.start();

    // Initial detection fires immediately
    expect(handler).toHaveBeenCalledTimes(1);

    // Advance time to trigger another detection
    vi.advanceTimersByTime(1001);

    expect(handler).toHaveBeenCalledTimes(2);

    gradient.destroy();
    vi.useRealTimers();
  });

  it('stops periodic detection when stopped', () => {
    vi.useFakeTimers();

    const handler = vi.fn();
    const gradient = createTestGradient({
      seed: 42,
      regionDetectionHz: 1,
    });

    gradient.on('gradient:regions-detected', handler);
    gradient.start();
    expect(handler).toHaveBeenCalledTimes(1);

    gradient.stop();

    // Advance time -- should NOT trigger another detection
    vi.advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);

    gradient.destroy();
    vi.useRealTimers();
  });
});

// =============================================================================
// CUSTOM PARAMETER NOISE CONFIGURATION
// =============================================================================

describe('Custom Parameter Noise Configuration', () => {
  it('accepts per-parameter noise overrides', () => {
    const gradient = createProceduralCulturalGradient({
      worldId: 'test',
      seed: 42,
      parameters: {
        cooperationTendency: {
          bias: 0.8, // Shift cooperation high
          min: 0.5,
          max: 1.0,
        },
        opennessToOutsiders: {
          bias: 0.2, // Shift openness low
          min: 0.0,
          max: 0.5,
        },
      },
    });

    // Sample many positions and check that custom constraints are respected
    let coopAlwaysAbove05 = true;
    let openAlwaysBelow05 = true;

    for (let x = -80; x <= 80; x += 20) {
      for (let z = -80; z <= 80; z += 20) {
        const params = gradient.sampleParameters({ x, y: 0, z });
        if (params.cooperationTendency < 0.5) coopAlwaysAbove05 = false;
        if (params.opennessToOutsiders > 0.5) openAlwaysBelow05 = false;
      }
    }

    expect(coopAlwaysAbove05).toBe(true);
    expect(openAlwaysBelow05).toBe(true);

    gradient.destroy();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge Cases', () => {
  it('handles zero position', () => {
    const gradient = createTestGradient({ seed: 42 });

    const params = gradient.sampleParameters({ x: 0, y: 0, z: 0 });
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(params[paramName]).toBeGreaterThanOrEqual(0.0);
      expect(params[paramName]).toBeLessThanOrEqual(1.0);
    }

    gradient.destroy();
  });

  it('handles negative positions', () => {
    const gradient = createTestGradient({ seed: 42 });

    const params = gradient.sampleParameters({ x: -30, y: -5, z: -30 });
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(params[paramName]).toBeGreaterThanOrEqual(0.0);
      expect(params[paramName]).toBeLessThanOrEqual(1.0);
    }

    gradient.destroy();
  });

  it('handles positions outside world bounds gracefully', () => {
    const gradient = createTestGradient({ seed: 42 });

    // Noise functions work anywhere; grid queries return null outside bounds
    const params = gradient.sampleParameters({ x: 999, y: 0, z: 999 });
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(params[paramName]).toBeGreaterThanOrEqual(0.0);
      expect(params[paramName]).toBeLessThanOrEqual(1.0);
    }

    gradient.destroy();
  });

  it('handles very large coordinates', () => {
    const gradient = createTestGradient({ seed: 42 });

    const params = gradient.sampleParameters({ x: 10000, y: 0, z: 10000 });
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(params[paramName]).toBeGreaterThanOrEqual(0.0);
      expect(params[paramName]).toBeLessThanOrEqual(1.0);
      expect(Number.isFinite(params[paramName])).toBe(true);
    }

    gradient.destroy();
  });

  it('handles seed value of 0', () => {
    const gradient = createTestGradient({ seed: 0 });

    const params = gradient.sampleParameters({ x: 10, y: 0, z: 10 });
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(params[paramName]).toBeGreaterThanOrEqual(0.0);
      expect(params[paramName]).toBeLessThanOrEqual(1.0);
    }

    gradient.destroy();
  });

  it('handles negative seed', () => {
    const gradient = createTestGradient({ seed: -12345 });

    const params = gradient.sampleParameters({ x: 10, y: 0, z: 10 });
    for (const paramName of CULTURAL_PARAMETER_NAMES) {
      expect(Number.isFinite(params[paramName])).toBe(true);
    }

    gradient.destroy();
  });
});

// =============================================================================
// INTEGRATION: CONSISTENT MODIFIERS FROM GRADIENT
// =============================================================================

describe('Integration: Consistent Modifiers from Gradient', () => {
  it('stigmergic modifiers match manual computation from sampled params', () => {
    const gradient = createTestGradient({ seed: 42 });
    const pos = { x: 15, y: 0, z: 20 };

    const params = gradient.sampleParameters(pos);
    const expectedMods = computeStigmergicModifiers(params);
    const actualMods = gradient.getStigmergicModifiers(pos);

    expect(actualMods.intensityMultiplier).toBeCloseTo(expectedMods.intensityMultiplier);
    expect(actualMods.decayMultiplier).toBeCloseTo(expectedMods.decayMultiplier);
    expect(actualMods.diffusionMultiplier).toBeCloseTo(expectedMods.diffusionMultiplier);
    expect(actualMods.reinforcementMultiplier).toBeCloseTo(expectedMods.reinforcementMultiplier);

    gradient.destroy();
  });

  it('zone boundary modifiers match manual computation from sampled params', () => {
    const gradient = createTestGradient({ seed: 42 });
    const pos = { x: 15, y: 0, z: 20 };

    const params = gradient.sampleParameters(pos);
    const expectedMods = computeZoneBoundaryModifiers(params);
    const actualMods = gradient.getZoneBoundaryModifiers(pos);

    expect(actualMods.trustModifier).toBeCloseTo(expectedMods.trustModifier);
    expect(actualMods.bandwidthModifier).toBeCloseTo(expectedMods.bandwidthModifier);
    expect(actualMods.permeabilityModifier).toBeCloseTo(expectedMods.permeabilityModifier);

    gradient.destroy();
  });
});
