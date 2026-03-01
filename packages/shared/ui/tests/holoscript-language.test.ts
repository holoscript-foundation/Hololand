import { describe, it, expect } from 'vitest';
import {
  HOLOSCRIPT_KEYWORDS,
  HOLOSCRIPT_TRAITS,
  HOLOSCRIPT_EVENTS,
  HOLOSCRIPT_GEOMETRIES,
  HOLOSCRIPT_PROPERTIES,
  holoscriptMonarchLanguage,
  holoscriptDarkTheme,
  holoscriptLightTheme,
} from '../src/components/MonacoEditor/holoscript-language';

describe('HoloScript Language Definition', () => {
  describe('keywords', () => {
    it('includes core composition keywords', () => {
      expect(HOLOSCRIPT_KEYWORDS).toContain('composition');
      expect(HOLOSCRIPT_KEYWORDS).toContain('template');
      expect(HOLOSCRIPT_KEYWORDS).toContain('object');
      expect(HOLOSCRIPT_KEYWORDS).toContain('using');
    });

    it('includes control flow keywords', () => {
      expect(HOLOSCRIPT_KEYWORDS).toContain('if');
      expect(HOLOSCRIPT_KEYWORDS).toContain('else');
      expect(HOLOSCRIPT_KEYWORDS).toContain('for');
      expect(HOLOSCRIPT_KEYWORDS).toContain('while');
      expect(HOLOSCRIPT_KEYWORDS).toContain('return');
    });

    it('includes boolean and null literals', () => {
      expect(HOLOSCRIPT_KEYWORDS).toContain('true');
      expect(HOLOSCRIPT_KEYWORDS).toContain('false');
      expect(HOLOSCRIPT_KEYWORDS).toContain('null');
    });
  });

  describe('traits', () => {
    it('all traits start with @', () => {
      for (const trait of HOLOSCRIPT_TRAITS) {
        expect(trait).toMatch(/^@/);
      }
    });

    it('includes common VR interaction traits', () => {
      expect(HOLOSCRIPT_TRAITS).toContain('@grabbable');
      expect(HOLOSCRIPT_TRAITS).toContain('@clickable');
      expect(HOLOSCRIPT_TRAITS).toContain('@collidable');
      expect(HOLOSCRIPT_TRAITS).toContain('@physics');
    });

    it('includes networking traits', () => {
      expect(HOLOSCRIPT_TRAITS).toContain('@networked');
      expect(HOLOSCRIPT_TRAITS).toContain('@synced');
      expect(HOLOSCRIPT_TRAITS).toContain('@persistent');
    });
  });

  describe('events', () => {
    it('all events start with "on"', () => {
      for (const event of HOLOSCRIPT_EVENTS) {
        expect(event).toMatch(/^on[A-Z]/);
      }
    });

    it('includes core interaction events', () => {
      expect(HOLOSCRIPT_EVENTS).toContain('onClick');
      expect(HOLOSCRIPT_EVENTS).toContain('onGrab');
      expect(HOLOSCRIPT_EVENTS).toContain('onRelease');
    });
  });

  describe('geometries', () => {
    it('includes 3D primitives', () => {
      expect(HOLOSCRIPT_GEOMETRIES).toContain('cube');
      expect(HOLOSCRIPT_GEOMETRIES).toContain('sphere');
      expect(HOLOSCRIPT_GEOMETRIES).toContain('cylinder');
      expect(HOLOSCRIPT_GEOMETRIES).toContain('plane');
    });

    it('includes special types', () => {
      expect(HOLOSCRIPT_GEOMETRIES).toContain('text');
      expect(HOLOSCRIPT_GEOMETRIES).toContain('model');
      expect(HOLOSCRIPT_GEOMETRIES).toContain('humanoid');
    });
  });

  describe('properties', () => {
    it('includes spatial properties', () => {
      expect(HOLOSCRIPT_PROPERTIES).toContain('position');
      expect(HOLOSCRIPT_PROPERTIES).toContain('rotation');
      expect(HOLOSCRIPT_PROPERTIES).toContain('scale');
    });

    it('includes visual properties', () => {
      expect(HOLOSCRIPT_PROPERTIES).toContain('color');
      expect(HOLOSCRIPT_PROPERTIES).toContain('opacity');
      expect(HOLOSCRIPT_PROPERTIES).toContain('visible');
    });
  });

  describe('monarch tokenizer', () => {
    it('has a root tokenizer rule set', () => {
      expect(holoscriptMonarchLanguage.tokenizer.root).toBeDefined();
      expect(Array.isArray(holoscriptMonarchLanguage.tokenizer.root)).toBe(true);
    });

    it('has comment, string, and stringSingle states', () => {
      expect(holoscriptMonarchLanguage.tokenizer.comment).toBeDefined();
      expect(holoscriptMonarchLanguage.tokenizer.string).toBeDefined();
      expect(holoscriptMonarchLanguage.tokenizer.stringSingle).toBeDefined();
    });

    it('references keywords array', () => {
      expect(holoscriptMonarchLanguage.keywords).toBeDefined();
      expect((holoscriptMonarchLanguage.keywords as string[]).length).toBeGreaterThan(0);
    });
  });

  describe('themes', () => {
    it('dark theme inherits from vs-dark', () => {
      expect(holoscriptDarkTheme.base).toBe('vs-dark');
      expect(holoscriptDarkTheme.inherit).toBe(true);
    });

    it('light theme inherits from vs', () => {
      expect(holoscriptLightTheme.base).toBe('vs');
      expect(holoscriptLightTheme.inherit).toBe(true);
    });

    it('dark theme has HoloScript-specific cursor color', () => {
      expect(holoscriptDarkTheme.colors?.['editorCursor.foreground']).toBe('#00d4ff');
    });

    it('both themes define token rules for all token types', () => {
      const expectedTokens = ['keyword', 'keyword.trait', 'keyword.event', 'string', 'number', 'comment', 'identifier'];
      for (const theme of [holoscriptDarkTheme, holoscriptLightTheme]) {
        const tokenTypes = theme.rules.map((r) => r.token);
        for (const expected of expectedTokens) {
          expect(tokenTypes).toContain(expected);
        }
      }
    });
  });
});
