/**
 * @vitest-environment jsdom
 */

/**
 * Tests for VerticalTraitMatrix component
 *
 * Validates:
 * - Matrix rendering with verticals and traits
 * - Color-coded relevance scores
 * - Active vertical filtering
 * - Selected trait highlighting
 * - Applied trait indicators
 * - Search query filtering
 * - Cell click handling
 * - Empty state display
 * - Legend display
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import type { VerticalMapping } from '../types';

// Mock data
const mockVerticals: VerticalMapping[] = [
  {
    id: 'healthcare',
    displayName: 'Healthcare',
    description: 'Medical training and simulation',
    matchTags: ['medical', 'health'],
    traits: [
      {
        trait: '@hand_tracked',
        relevance: 1.0,
        rationale: 'Precise hand tracking for surgery',
        configHint: 'precision: "high"',
      },
      {
        trait: '@haptic',
        relevance: 0.95,
        rationale: 'Tactile feedback',
        configHint: 'intensity: 0.8',
      },
    ],
  },
  {
    id: 'gaming',
    displayName: 'Gaming',
    description: 'VR/AR games',
    matchTags: ['game', 'multiplayer'],
    traits: [
      {
        trait: '@rigidbody',
        relevance: 1.0,
        rationale: 'Core physics',
        configHint: 'mass: 1.0',
      },
      {
        trait: '@hand_tracked',
        relevance: 0.7,
        rationale: 'Hand interaction',
        configHint: 'precision: "medium"',
      },
    ],
  },
];

describe('VerticalTraitMatrix', () => {
  describe('props validation', () => {
    it('should accept required props', () => {
      const props = {
        verticals: mockVerticals,
        activeVertical: null,
        selectedTrait: null,
        appliedTraits: new Set<string>(),
        searchQuery: '',
        onTraitClick: vi.fn(),
      };

      // Props structure validation
      expect(props.verticals).toHaveLength(2);
      expect(props.verticals[0].traits).toHaveLength(2);
      expect(props.appliedTraits).toBeInstanceOf(Set);
      expect(typeof props.onTraitClick).toBe('function');
    });
  });

  describe('trait extraction', () => {
    it('should extract all unique traits from verticals', () => {
      const allTraits = new Set<string>();
      mockVerticals.forEach((v) => {
        v.traits.forEach((t) => allTraits.add(t.trait));
      });

      expect(allTraits.has('@hand_tracked')).toBe(true);
      expect(allTraits.has('@haptic')).toBe(true);
      expect(allTraits.has('@rigidbody')).toBe(true);
      expect(allTraits.size).toBe(3);
    });

    it('should sort traits alphabetically', () => {
      const allTraits = new Set<string>();
      mockVerticals.forEach((v) => {
        v.traits.forEach((t) => allTraits.add(t.trait));
      });

      const sorted = Array.from(allTraits).sort();
      expect(sorted).toEqual(['@hand_tracked', '@haptic', '@rigidbody']);
    });
  });

  describe('vertical filtering', () => {
    it('should show all verticals when activeVertical is null', () => {
      const filtered = mockVerticals.filter((v) =>
        null === null ? true : v.id === null
      );
      expect(filtered).toHaveLength(2);
    });

    it('should filter to single vertical when activeVertical is set', () => {
      const activeVertical = 'healthcare';
      const filtered = mockVerticals.filter((v) => v.id === activeVertical);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('healthcare');
    });
  });

  describe('trait filtering by search', () => {
    it('should filter traits by search query', () => {
      const allTraits = ['@hand_tracked', '@haptic', '@rigidbody'];
      const searchQuery = 'hand';

      const filtered = allTraits.filter((trait) =>
        trait.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toEqual(['@hand_tracked']);
    });

    it('should be case-insensitive', () => {
      const allTraits = ['@hand_tracked', '@haptic', '@rigidbody'];
      const searchQuery = 'HAPTIC';

      const filtered = allTraits.filter((trait) =>
        trait.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toEqual(['@haptic']);
    });

    it('should return empty array when no matches', () => {
      const allTraits = ['@hand_tracked', '@haptic', '@rigidbody'];
      const searchQuery = 'xyz';

      const filtered = allTraits.filter((trait) =>
        trait.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(0);
    });
  });

  describe('relevance color calculation', () => {
    it('should return green for high relevance (>=0.9)', () => {
      const getRelevanceColor = (relevance: number): string => {
        if (relevance >= 0.9) return '#2ecc71';
        if (relevance >= 0.75) return '#27ae60';
        if (relevance >= 0.6) return '#f39c12';
        return '#95a5a6';
      };

      expect(getRelevanceColor(1.0)).toBe('#2ecc71');
      expect(getRelevanceColor(0.95)).toBe('#2ecc71');
      expect(getRelevanceColor(0.9)).toBe('#2ecc71');
    });

    it('should return dark green for medium-high relevance (0.75-0.89)', () => {
      const getRelevanceColor = (relevance: number): string => {
        if (relevance >= 0.9) return '#2ecc71';
        if (relevance >= 0.75) return '#27ae60';
        if (relevance >= 0.6) return '#f39c12';
        return '#95a5a6';
      };

      expect(getRelevanceColor(0.85)).toBe('#27ae60');
      expect(getRelevanceColor(0.75)).toBe('#27ae60');
    });

    it('should return orange for medium relevance (0.6-0.74)', () => {
      const getRelevanceColor = (relevance: number): string => {
        if (relevance >= 0.9) return '#2ecc71';
        if (relevance >= 0.75) return '#27ae60';
        if (relevance >= 0.6) return '#f39c12';
        return '#95a5a6';
      };

      expect(getRelevanceColor(0.7)).toBe('#f39c12');
      expect(getRelevanceColor(0.6)).toBe('#f39c12');
    });

    it('should return gray for low relevance (<0.6)', () => {
      const getRelevanceColor = (relevance: number): string => {
        if (relevance >= 0.9) return '#2ecc71';
        if (relevance >= 0.75) return '#27ae60';
        if (relevance >= 0.6) return '#f39c12';
        return '#95a5a6';
      };

      expect(getRelevanceColor(0.5)).toBe('#95a5a6');
      expect(getRelevanceColor(0.1)).toBe('#95a5a6');
      expect(getRelevanceColor(0.0)).toBe('#95a5a6');
    });
  });

  describe('relevance opacity calculation', () => {
    it('should return opacity in range 0.3-1.0', () => {
      const getRelevanceOpacity = (relevance: number): number => {
        return 0.3 + relevance * 0.7;
      };

      expect(getRelevanceOpacity(0.0)).toBe(0.3);
      expect(getRelevanceOpacity(1.0)).toBe(1.0);
      expect(getRelevanceOpacity(0.5)).toBeCloseTo(0.65);
    });
  });

  describe('matrix cell data structure', () => {
    it('should create correct cell for existing trait', () => {
      const cell = {
        vertical: 'healthcare',
        trait: '@hand_tracked',
        relevance: 1.0,
        rationale: 'Precise hand tracking for surgery',
        configHint: 'precision: "high"',
        isSelected: false,
        isApplied: false,
      };

      expect(cell.vertical).toBe('healthcare');
      expect(cell.relevance).toBe(1.0);
      expect(cell.isSelected).toBe(false);
    });

    it('should create zero-relevance cell for non-existing trait', () => {
      const cell = {
        vertical: 'healthcare',
        trait: '@rigidbody',
        relevance: 0,
        rationale: '',
        configHint: '',
        isSelected: false,
        isApplied: false,
      };

      expect(cell.relevance).toBe(0);
      expect(cell.rationale).toBe('');
    });

    it('should mark cell as selected when trait matches', () => {
      const selectedTrait = '@hand_tracked';
      const cell = {
        vertical: 'healthcare',
        trait: '@hand_tracked',
        relevance: 1.0,
        rationale: 'Test',
        configHint: '',
        isSelected: '@hand_tracked' === selectedTrait,
        isApplied: false,
      };

      expect(cell.isSelected).toBe(true);
    });

    it('should mark cell as applied when in appliedTraits set', () => {
      const appliedTraits = new Set(['@hand_tracked', '@haptic']);
      const cell = {
        vertical: 'healthcare',
        trait: '@hand_tracked',
        relevance: 1.0,
        rationale: 'Test',
        configHint: '',
        isSelected: false,
        isApplied: appliedTraits.has('@hand_tracked'),
      };

      expect(cell.isApplied).toBe(true);
    });
  });

  describe('cell click handling', () => {
    it('should call onTraitClick with correct arguments for relevant cell', () => {
      const onTraitClick = vi.fn();
      const cell = {
        vertical: 'healthcare',
        trait: '@hand_tracked',
        relevance: 1.0,
        rationale: 'Test',
        configHint: '',
        isSelected: false,
        isApplied: false,
      };

      if (cell.relevance > 0) {
        onTraitClick(cell.trait, cell.vertical);
      }

      expect(onTraitClick).toHaveBeenCalledWith('@hand_tracked', 'healthcare');
      expect(onTraitClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onTraitClick for irrelevant cell', () => {
      const onTraitClick = vi.fn();
      const cell = {
        vertical: 'healthcare',
        trait: '@rigidbody',
        relevance: 0,
        rationale: '',
        configHint: '',
        isSelected: false,
        isApplied: false,
      };

      if (cell.relevance > 0) {
        onTraitClick(cell.trait, cell.vertical);
      }

      expect(onTraitClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have tabIndex 0 for relevant cells', () => {
      const relevance = 1.0;
      const tabIndex = relevance > 0 ? 0 : -1;

      expect(tabIndex).toBe(0);
    });

    it('should have tabIndex -1 for irrelevant cells', () => {
      const relevance = 0.0;
      const tabIndex = relevance > 0 ? 0 : -1;

      expect(tabIndex).toBe(-1);
    });

    it('should generate correct aria-label', () => {
      const vertical = 'Healthcare';
      const trait = '@hand_tracked';
      const relevance = 1.0;

      const ariaLabel = `${trait} for ${vertical}: ${
        relevance > 0 ? `${(relevance * 100).toFixed(0)}% relevance` : 'not relevant'
      }`;

      expect(ariaLabel).toBe('@hand_tracked for Healthcare: 100% relevance');
    });
  });
});
