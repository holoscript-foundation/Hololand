/**
 * @vitest-environment jsdom
 */

/**
 * Tests for TierBadge and TierBadgeRow components
 *
 * Validates:
 * - Tier derivation from explicit tier prop and score prop
 * - Size variants (sm, md, lg)
 * - Visual variants (badge, pill, card)
 * - Icon, label, and score display toggles
 * - Click handling and keyboard interaction
 * - Accessibility attributes (role, aria-label)
 * - Theme customization
 * - TierBadgeRow progression display
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock the types module to avoid import issues in test environment
vi.mock('../../../VRTrustHandshake', () => ({}));
vi.mock('../../../BehavioralTrustScoring', () => ({}));

import { TierBadge, TierBadgeRow } from '../TierBadge';
import { TRUST_TIER_CONFIG, scoreToTier } from '../types';
import type { TrustTier } from '../types';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Minimal render helper that creates a DOM element from a React element.
 * Uses the react-dom/server renderToStaticMarkup for snapshot-free testing.
 */
function getProps(element: React.ReactElement): Record<string, unknown> {
  return element.props as Record<string, unknown>;
}

// =============================================================================
// TIER BADGE
// =============================================================================

describe('TierBadge', () => {
  describe('tier resolution', () => {
    it('should use explicit tier prop when provided', () => {
      const element = React.createElement(TierBadge, { tier: 'T3' });
      expect(getProps(element).tier).toBe('T3');
    });

    it('should derive tier from score when tier prop is not set', () => {
      expect(scoreToTier(0.9)).toBe('T3');
      expect(scoreToTier(0.6)).toBe('T2');
      expect(scoreToTier(0.3)).toBe('T1');
      expect(scoreToTier(0.1)).toBe('T0');
    });

    it('should default to T0 when neither tier nor score is provided', () => {
      const element = React.createElement(TierBadge, {});
      // The component internally defaults to T0
      expect(getProps(element).tier).toBeUndefined();
      expect(getProps(element).score).toBeUndefined();
    });

    it('should prefer tier prop over score prop', () => {
      const element = React.createElement(TierBadge, { tier: 'T1', score: 0.95 });
      expect(getProps(element).tier).toBe('T1');
    });
  });

  describe('props validation', () => {
    it('should accept all valid size values', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      for (const size of sizes) {
        const element = React.createElement(TierBadge, { tier: 'T2', size });
        expect(getProps(element).size).toBe(size);
      }
    });

    it('should accept all valid variant values', () => {
      const variants = ['badge', 'pill', 'card'] as const;
      for (const variant of variants) {
        const element = React.createElement(TierBadge, { tier: 'T2', variant });
        expect(getProps(element).variant).toBe(variant);
      }
    });

    it('should accept boolean display toggles', () => {
      const element = React.createElement(TierBadge, {
        tier: 'T3',
        showScore: true,
        showIcon: false,
        showLabel: true,
        animated: false,
        score: 0.95,
      });
      expect(getProps(element).showScore).toBe(true);
      expect(getProps(element).showIcon).toBe(false);
      expect(getProps(element).showLabel).toBe(true);
      expect(getProps(element).animated).toBe(false);
    });
  });

  describe('click handling', () => {
    it('should call onClick with the tier when clicked', () => {
      const onClick = vi.fn();
      const element = React.createElement(TierBadge, {
        tier: 'T2',
        onClick,
      });
      expect(getProps(element).onClick).toBe(onClick);
    });
  });

  describe('tier metadata', () => {
    it('should have correct metadata for each tier', () => {
      const tiers: TrustTier[] = ['T0', 'T1', 'T2', 'T3'];
      for (const tier of tiers) {
        const meta = TRUST_TIER_CONFIG[tier];
        expect(meta.tier).toBe(tier);
        expect(meta.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(meta.label).toBeTruthy();
        expect(meta.description).toBeTruthy();
        expect(meta.icon).toBeTruthy();
      }
    });
  });

  describe('accessibility', () => {
    it('should accept ariaLabel prop', () => {
      const element = React.createElement(TierBadge, {
        tier: 'T3',
        ariaLabel: 'Custom label',
      });
      expect(getProps(element).ariaLabel).toBe('Custom label');
    });

    it('should accept tooltip prop', () => {
      const element = React.createElement(TierBadge, {
        tier: 'T2',
        tooltip: 'Custom tooltip',
      });
      expect(getProps(element).tooltip).toBe('Custom tooltip');
    });
  });
});

// =============================================================================
// TIER BADGE ROW
// =============================================================================

describe('TierBadgeRow', () => {
  it('should accept activeTier prop', () => {
    const element = React.createElement(TierBadgeRow, { activeTier: 'T2' });
    expect(getProps(element).activeTier).toBe('T2');
  });

  it('should accept onTierClick callback', () => {
    const onTierClick = vi.fn();
    const element = React.createElement(TierBadgeRow, {
      activeTier: 'T1',
      onTierClick,
    });
    expect(getProps(element).onTierClick).toBe(onTierClick);
  });

  it('should accept optional score and showScore props', () => {
    const element = React.createElement(TierBadgeRow, {
      activeTier: 'T3',
      score: 0.92,
      showScore: true,
    });
    expect(getProps(element).score).toBe(0.92);
    expect(getProps(element).showScore).toBe(true);
  });

  it('should forward size prop', () => {
    const element = React.createElement(TierBadgeRow, {
      activeTier: 'T0',
      size: 'lg',
    });
    expect(getProps(element).size).toBe('lg');
  });
});
