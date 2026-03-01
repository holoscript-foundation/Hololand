import { describe, it, expect } from 'vitest';
import {
  palette,
  darkTheme,
  lightTheme,
  themes,
  fontFamily,
  fontSize,
  spacing,
  shadow,
  transition,
  zIndex,
  borderRadius,
} from '../src/tokens';

describe('Design Tokens', () => {
  describe('palette', () => {
    it('should contain brand colors', () => {
      expect(palette.holoCyan).toBe('#00d4ff');
      expect(palette.holoGold).toBe('#ffd700');
    });

    it('should contain accent blue matching VS Code', () => {
      expect(palette.accentBlue).toBe('#007acc');
    });

    it('should contain all syntax highlighting colors', () => {
      expect(palette.syntaxKeyword).toBe('#569cd6');
      expect(palette.syntaxString).toBe('#ce9178');
      expect(palette.syntaxNumber).toBe('#b5cea8');
      expect(palette.syntaxComment).toBe('#6a9955');
      expect(palette.syntaxFunction).toBe('#dcdcaa');
      expect(palette.syntaxType).toBe('#4ec9b0');
      expect(palette.syntaxVariable).toBe('#9cdcfe');
      expect(palette.syntaxOperator).toBe('#c586c0');
    });
  });

  describe('themes', () => {
    it('should have both dark and light themes', () => {
      expect(themes.dark).toBeDefined();
      expect(themes.light).toBeDefined();
    });

    it('dark theme should use IDE colors', () => {
      expect(darkTheme.bgApp).toBe('#1e1e1e');
      expect(darkTheme.bgSurface).toBe('#252526');
      expect(darkTheme.borderDefault).toBe('#3c3c3c');
      expect(darkTheme.borderAccent).toBe('#007acc');
    });

    it('light theme should have light backgrounds', () => {
      expect(lightTheme.bgApp).toBe('#f5f5f5');
      expect(lightTheme.bgSurface).toBe('#ffffff');
    });

    it('both themes should implement the same interface', () => {
      const darkKeys = Object.keys(darkTheme).sort();
      const lightKeys = Object.keys(lightTheme).sort();
      expect(darkKeys).toEqual(lightKeys);
    });
  });

  describe('typography', () => {
    it('should use Inter as the sans font', () => {
      expect(fontFamily.sans).toContain('Inter');
    });

    it('should use JetBrains Mono as the mono font', () => {
      expect(fontFamily.mono).toContain('JetBrains Mono');
    });

    it('should have a proper font size scale', () => {
      const sizes = Object.values(fontSize);
      expect(sizes.length).toBeGreaterThan(5);
      // All should be rem values
      for (const size of sizes) {
        expect(size).toMatch(/^\d+(\.\d+)?rem$/);
      }
    });
  });

  describe('spacing', () => {
    it('should follow 4px grid system', () => {
      expect(spacing['1']).toBe('4px');
      expect(spacing['2']).toBe('8px');
      expect(spacing['3']).toBe('12px');
      expect(spacing['4']).toBe('16px');
    });

    it('should have a none value', () => {
      expect(spacing.none).toBe('0px');
    });
  });

  describe('shadows', () => {
    it('should have elevation levels from none to xl', () => {
      expect(shadow.none).toBe('none');
      expect(shadow.sm).toBeDefined();
      expect(shadow.md).toBeDefined();
      expect(shadow.lg).toBeDefined();
      expect(shadow.xl).toBeDefined();
    });
  });

  describe('transitions', () => {
    it('should have speed presets', () => {
      expect(transition.fast).toBeDefined();
      expect(transition.normal).toBeDefined();
      expect(transition.slow).toBeDefined();
    });
  });

  describe('zIndex', () => {
    it('should have increasing z-index levels', () => {
      expect(zIndex.base).toBeLessThan(zIndex.dropdown);
      expect(zIndex.dropdown).toBeLessThan(zIndex.sticky);
      expect(zIndex.sticky).toBeLessThan(zIndex.overlay);
      expect(zIndex.overlay).toBeLessThan(zIndex.modal);
      expect(zIndex.modal).toBeLessThan(zIndex.toast);
      expect(zIndex.toast).toBeLessThan(zIndex.loading);
    });
  });

  describe('borderRadius', () => {
    it('should have size presets', () => {
      expect(borderRadius.none).toBe('0px');
      expect(borderRadius.sm).toBe('3px');
      expect(borderRadius.md).toBe('4px');
      expect(borderRadius.lg).toBe('6px');
      expect(borderRadius.full).toBe('50%');
    });
  });
});
