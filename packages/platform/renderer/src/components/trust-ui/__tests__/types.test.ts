/**
 * @vitest-environment jsdom
 */

/**
 * Tests for trust-ui/types
 *
 * Validates:
 * - Trust tier configuration constants
 * - Score-to-tier mapping function
 * - TrustLevel-to-tier mapping function
 * - Capability display configuration
 * - Default theme values
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../VRTrustHandshake', () => ({}));
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import {
  TRUST_TIER_CONFIG,
  CAPABILITY_DISPLAY_CONFIG,
  DEFAULT_TRUST_UI_THEME,
  scoreToTier,
  trustLevelToTier,
  getTierMeta,
} from '../types';
import type {
  TrustTier,
  TrustTierMeta,
  ReputationDataPoint,
  RevocationAlert,
} from '../types';

// =============================================================================
// TRUST TIER CONFIG
// =============================================================================

describe('TRUST_TIER_CONFIG', () => {
  it('should define all four tiers', () => {
    expect(TRUST_TIER_CONFIG).toHaveProperty('T0');
    expect(TRUST_TIER_CONFIG).toHaveProperty('T1');
    expect(TRUST_TIER_CONFIG).toHaveProperty('T2');
    expect(TRUST_TIER_CONFIG).toHaveProperty('T3');
  });

  it('should have contiguous score ranges covering 0 to 1', () => {
    expect(TRUST_TIER_CONFIG.T0.minScore).toBe(0);
    expect(TRUST_TIER_CONFIG.T0.maxScore).toBe(TRUST_TIER_CONFIG.T1.minScore);
    expect(TRUST_TIER_CONFIG.T1.maxScore).toBe(TRUST_TIER_CONFIG.T2.minScore);
    expect(TRUST_TIER_CONFIG.T2.maxScore).toBe(TRUST_TIER_CONFIG.T3.minScore);
    expect(TRUST_TIER_CONFIG.T3.maxScore).toBe(1.0);
  });

  it('should have unique colors for each tier', () => {
    const colors = Object.values(TRUST_TIER_CONFIG).map((c) => c.color);
    expect(new Set(colors).size).toBe(4);
  });

  it('should have valid labels for all tiers', () => {
    expect(TRUST_TIER_CONFIG.T0.label).toBe('Untrusted');
    expect(TRUST_TIER_CONFIG.T1.label).toBe('Basic');
    expect(TRUST_TIER_CONFIG.T2.label).toBe('Verified');
    expect(TRUST_TIER_CONFIG.T3.label).toBe('Trusted');
  });

  it('should have non-empty descriptions and icons for all tiers', () => {
    for (const tier of Object.values(TRUST_TIER_CONFIG)) {
      expect(tier.description.length).toBeGreaterThan(0);
      expect(tier.icon.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// scoreToTier
// =============================================================================

describe('scoreToTier', () => {
  it('should return T0 for scores below 0.25', () => {
    expect(scoreToTier(0)).toBe('T0');
    expect(scoreToTier(0.1)).toBe('T0');
    expect(scoreToTier(0.24)).toBe('T0');
  });

  it('should return T1 for scores from 0.25 to 0.49', () => {
    expect(scoreToTier(0.25)).toBe('T1');
    expect(scoreToTier(0.3)).toBe('T1');
    expect(scoreToTier(0.49)).toBe('T1');
  });

  it('should return T2 for scores from 0.5 to 0.79', () => {
    expect(scoreToTier(0.5)).toBe('T2');
    expect(scoreToTier(0.6)).toBe('T2');
    expect(scoreToTier(0.79)).toBe('T2');
  });

  it('should return T3 for scores from 0.8 to 1.0', () => {
    expect(scoreToTier(0.8)).toBe('T3');
    expect(scoreToTier(0.9)).toBe('T3');
    expect(scoreToTier(1.0)).toBe('T3');
  });

  it('should handle edge cases', () => {
    expect(scoreToTier(-0.1)).toBe('T0');
    expect(scoreToTier(1.5)).toBe('T3');
  });
});

// =============================================================================
// trustLevelToTier
// =============================================================================

describe('trustLevelToTier', () => {
  it('should map trusted to T3', () => {
    expect(trustLevelToTier('trusted')).toBe('T3');
  });

  it('should map verified to T2', () => {
    expect(trustLevelToTier('verified')).toBe('T2');
  });

  it('should map pending to T1', () => {
    expect(trustLevelToTier('pending')).toBe('T1');
  });

  it('should map degraded to T1', () => {
    expect(trustLevelToTier('degraded')).toBe('T1');
  });

  it('should map none to T0', () => {
    expect(trustLevelToTier('none')).toBe('T0');
  });

  it('should map revoked to T0', () => {
    expect(trustLevelToTier('revoked')).toBe('T0');
  });
});

// =============================================================================
// getTierMeta
// =============================================================================

describe('getTierMeta', () => {
  it('should return correct metadata for each tier', () => {
    const tiers: TrustTier[] = ['T0', 'T1', 'T2', 'T3'];
    for (const tier of tiers) {
      const meta = getTierMeta(tier);
      expect(meta.tier).toBe(tier);
      expect(meta.color).toBeTruthy();
      expect(meta.label).toBeTruthy();
    }
  });

  it('should return the same object as TRUST_TIER_CONFIG', () => {
    expect(getTierMeta('T3')).toBe(TRUST_TIER_CONFIG.T3);
  });
});

// =============================================================================
// CAPABILITY_DISPLAY_CONFIG
// =============================================================================

describe('CAPABILITY_DISPLAY_CONFIG', () => {
  it('should define all seven capabilities', () => {
    expect(Object.keys(CAPABILITY_DISPLAY_CONFIG)).toHaveLength(7);
  });

  it('should have valid categories for all capabilities', () => {
    const validCategories = new Set(['read', 'write', 'admin']);
    for (const cap of Object.values(CAPABILITY_DISPLAY_CONFIG)) {
      expect(validCategories.has(cap.category)).toBe(true);
    }
  });

  it('should have non-empty labels and descriptions', () => {
    for (const cap of Object.values(CAPABILITY_DISPLAY_CONFIG)) {
      expect(cap.label.length).toBeGreaterThan(0);
      expect(cap.description.length).toBeGreaterThan(0);
    }
  });

  it('should have valid required tiers', () => {
    const validTiers = new Set<TrustTier>(['T0', 'T1', 'T2', 'T3']);
    for (const cap of Object.values(CAPABILITY_DISPLAY_CONFIG)) {
      expect(validTiers.has(cap.requiredTier)).toBe(true);
    }
  });

  it('should require higher tiers for admin capabilities', () => {
    expect(CAPABILITY_DISPLAY_CONFIG.admin.requiredTier).toBe('T3');
    expect(CAPABILITY_DISPLAY_CONFIG.modify_world.requiredTier).toBe('T3');
  });
});

// =============================================================================
// DEFAULT_TRUST_UI_THEME
// =============================================================================

describe('DEFAULT_TRUST_UI_THEME', () => {
  it('should have a valid font family', () => {
    expect(DEFAULT_TRUST_UI_THEME.fontFamily).toContain('system-ui');
  });

  it('should have a font scale of 1.0', () => {
    expect(DEFAULT_TRUST_UI_THEME.fontScale).toBe(1.0);
  });

  it('should have valid color values', () => {
    expect(DEFAULT_TRUST_UI_THEME.textPrimary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_TRUST_UI_THEME.textSecondary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_TRUST_UI_THEME.borderColor).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
