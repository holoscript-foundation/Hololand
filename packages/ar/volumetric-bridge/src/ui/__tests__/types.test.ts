/**
 * Tests for UI type definitions and LOD_TIER_MAPPINGS constants
 *
 * Validates:
 * - LOD_TIER_MAPPINGS has all four tiers
 * - Each tier has required properties
 * - Octree depth increases with quality
 * - Gaussian budget increases with quality (ultra = 0 for unlimited)
 * - Max distance increases with quality
 * - Estimated memory increases with quality
 *
 * @module volumetric-bridge/ui/__tests__
 */

import { describe, it, expect } from 'vitest';
import { LOD_TIER_MAPPINGS } from '../types';
import type { LODQualityTier } from '../types';

describe('LOD_TIER_MAPPINGS', () => {
  const tiers: LODQualityTier[] = ['low', 'medium', 'high', 'ultra'];

  it('has all four quality tiers', () => {
    for (const tier of tiers) {
      expect(LOD_TIER_MAPPINGS[tier]).toBeDefined();
    }
  });

  it('each tier has the correct tier property', () => {
    for (const tier of tiers) {
      expect(LOD_TIER_MAPPINGS[tier].tier).toBe(tier);
    }
  });

  it('each tier has a non-empty label', () => {
    for (const tier of tiers) {
      expect(LOD_TIER_MAPPINGS[tier].label.length).toBeGreaterThan(0);
    }
  });

  it('each tier has a non-empty description', () => {
    for (const tier of tiers) {
      expect(LOD_TIER_MAPPINGS[tier].description.length).toBeGreaterThan(0);
    }
  });

  it('octree depth increases from low to ultra', () => {
    expect(LOD_TIER_MAPPINGS.low.octreeDepth).toBeLessThan(LOD_TIER_MAPPINGS.medium.octreeDepth);
    expect(LOD_TIER_MAPPINGS.medium.octreeDepth).toBeLessThan(LOD_TIER_MAPPINGS.high.octreeDepth);
    expect(LOD_TIER_MAPPINGS.high.octreeDepth).toBeLessThan(LOD_TIER_MAPPINGS.ultra.octreeDepth);
  });

  it('Gaussian budget increases from low to high', () => {
    expect(LOD_TIER_MAPPINGS.low.gaussianBudget).toBeLessThan(LOD_TIER_MAPPINGS.medium.gaussianBudget);
    expect(LOD_TIER_MAPPINGS.medium.gaussianBudget).toBeLessThan(LOD_TIER_MAPPINGS.high.gaussianBudget);
  });

  it('ultra tier has 0 budget (unlimited)', () => {
    expect(LOD_TIER_MAPPINGS.ultra.gaussianBudget).toBe(0);
  });

  it('max distance increases from low to ultra', () => {
    expect(LOD_TIER_MAPPINGS.low.maxDistance).toBeLessThan(LOD_TIER_MAPPINGS.medium.maxDistance);
    expect(LOD_TIER_MAPPINGS.medium.maxDistance).toBeLessThan(LOD_TIER_MAPPINGS.high.maxDistance);
    expect(LOD_TIER_MAPPINGS.high.maxDistance).toBeLessThan(LOD_TIER_MAPPINGS.ultra.maxDistance);
  });

  it('estimated memory increases from low to ultra', () => {
    expect(LOD_TIER_MAPPINGS.low.estimatedMemoryMB).toBeLessThan(LOD_TIER_MAPPINGS.medium.estimatedMemoryMB);
    expect(LOD_TIER_MAPPINGS.medium.estimatedMemoryMB).toBeLessThan(LOD_TIER_MAPPINGS.high.estimatedMemoryMB);
    expect(LOD_TIER_MAPPINGS.high.estimatedMemoryMB).toBeLessThan(LOD_TIER_MAPPINGS.ultra.estimatedMemoryMB);
  });

  it('target FPS decreases from low to ultra (quality vs performance tradeoff)', () => {
    expect(LOD_TIER_MAPPINGS.low.targetFPS).toBeGreaterThanOrEqual(LOD_TIER_MAPPINGS.medium.targetFPS);
    expect(LOD_TIER_MAPPINGS.medium.targetFPS).toBeGreaterThanOrEqual(LOD_TIER_MAPPINGS.high.targetFPS);
    expect(LOD_TIER_MAPPINGS.high.targetFPS).toBeGreaterThanOrEqual(LOD_TIER_MAPPINGS.ultra.targetFPS);
  });

  it('low tier budget matches VR_CONSERVATIVE_CONFIG', () => {
    // Low tier: 50K Gaussians (conservative mobile VR)
    expect(LOD_TIER_MAPPINGS.low.gaussianBudget).toBe(50_000);
  });

  it('medium tier budget matches VR_CONSERVATIVE_CONFIG', () => {
    // Medium tier: 100K (Quest 3 at 90fps conservative)
    expect(LOD_TIER_MAPPINGS.medium.gaussianBudget).toBe(100_000);
  });

  it('high tier budget matches VR_OPTIMIZED_CONFIG', () => {
    // High tier: 180K (Quest 3 at 72fps optimized)
    expect(LOD_TIER_MAPPINGS.high.gaussianBudget).toBe(180_000);
  });

  it('power law exponent is valid for all tiers', () => {
    for (const tier of tiers) {
      const exponent = LOD_TIER_MAPPINGS[tier].powerLawExponent;
      expect(exponent).toBeGreaterThanOrEqual(1.0);
      expect(exponent).toBeLessThanOrEqual(3.0);
    }
  });
});
