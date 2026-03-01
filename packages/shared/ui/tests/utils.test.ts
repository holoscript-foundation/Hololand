import { describe, it, expect } from 'vitest';
import { brandGradient, hexToRgba, mergeStyles } from '../src/utils/css';
import { darkTheme } from '../src/tokens/colors';

describe('CSS Utilities', () => {
  describe('brandGradient', () => {
    it('generates a linear gradient from brand colors', () => {
      const gradient = brandGradient(darkTheme);
      expect(gradient).toBe('linear-gradient(90deg, #00d4ff, #ffd700)');
    });

    it('supports custom direction', () => {
      const gradient = brandGradient(darkTheme, '135deg');
      expect(gradient).toBe('linear-gradient(135deg, #00d4ff, #ffd700)');
    });
  });

  describe('hexToRgba', () => {
    it('converts hex to rgba', () => {
      expect(hexToRgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(hexToRgba('#00ff00', 1)).toBe('rgba(0, 255, 0, 1)');
      expect(hexToRgba('#0000ff', 0)).toBe('rgba(0, 0, 255, 0)');
    });

    it('handles hex without # prefix', () => {
      expect(hexToRgba('ffffff', 1)).toBe('rgba(255, 255, 255, 1)');
    });

    it('handles the IDE background color', () => {
      expect(hexToRgba('#1e1e1e', 0.8)).toBe('rgba(30, 30, 30, 0.8)');
    });
  });

  describe('mergeStyles', () => {
    it('merges multiple style objects', () => {
      const result = mergeStyles(
        { color: 'red', fontSize: '12px' },
        { color: 'blue', padding: '4px' },
      );
      expect(result).toEqual({ color: 'blue', fontSize: '12px', padding: '4px' });
    });

    it('skips falsy values', () => {
      const result = mergeStyles(
        { color: 'red' },
        undefined,
        false,
        null,
        { padding: '4px' },
      );
      expect(result).toEqual({ color: 'red', padding: '4px' });
    });

    it('returns empty object for no arguments', () => {
      expect(mergeStyles()).toEqual({});
    });
  });
});
