import { describe, it, expect } from 'vitest';
import {
  getEditorConfig,
  mergeEditorConfig,
  webStudioConfig,
  desktopIdeConfig,
} from '../src/components/MonacoEditor/editor-configs';

describe('Editor Configs', () => {
  describe('getEditorConfig', () => {
    it('returns web-studio config', () => {
      const config = getEditorConfig('web-studio');
      expect(config).toEqual(webStudioConfig);
    });

    it('returns desktop-ide config', () => {
      const config = getEditorConfig('desktop-ide');
      expect(config).toEqual(desktopIdeConfig);
    });

    it('defaults to web-studio for unknown context', () => {
      const config = getEditorConfig('unknown' as never);
      expect(config).toEqual(webStudioConfig);
    });
  });

  describe('webStudioConfig', () => {
    it('has word wrap enabled for browser viewports', () => {
      expect(webStudioConfig.editorOptions.wordWrap).toBe('on');
    });

    it('has a 500ms live parse debounce', () => {
      expect(webStudioConfig.liveParseDebounceMs).toBe(500);
    });

    it('limits file size to 512KB', () => {
      expect(webStudioConfig.maxFileSizeBytes).toBe(512 * 1024);
    });

    it('disables advanced features to save bundle size', () => {
      expect(webStudioConfig.features.goToDefinition).toBe(false);
      expect(webStudioConfig.features.findReferences).toBe(false);
      expect(webStudioConfig.features.codeActions).toBe(false);
      expect(webStudioConfig.features.terminalCommands).toBe(false);
      expect(webStudioConfig.features.gitDecorations).toBe(false);
    });

    it('enables basic features', () => {
      expect(webStudioConfig.features.completions).toBe(true);
      expect(webStudioConfig.features.hoverInfo).toBe(true);
      expect(webStudioConfig.features.diagnostics).toBe(true);
      expect(webStudioConfig.features.folding).toBe(true);
    });
  });

  describe('desktopIdeConfig', () => {
    it('has word wrap disabled for desktop', () => {
      expect(desktopIdeConfig.editorOptions.wordWrap).toBe('off');
    });

    it('has a faster 300ms live parse debounce', () => {
      expect(desktopIdeConfig.liveParseDebounceMs).toBe(300);
    });

    it('allows files up to 10MB', () => {
      expect(desktopIdeConfig.maxFileSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('enables all advanced features', () => {
      expect(desktopIdeConfig.features.goToDefinition).toBe(true);
      expect(desktopIdeConfig.features.findReferences).toBe(true);
      expect(desktopIdeConfig.features.codeActions).toBe(true);
      expect(desktopIdeConfig.features.terminalCommands).toBe(true);
      expect(desktopIdeConfig.features.gitDecorations).toBe(true);
      expect(desktopIdeConfig.features.outline).toBe(true);
    });

    it('has smooth scrolling and cursor animation', () => {
      expect(desktopIdeConfig.editorOptions.smoothScrolling).toBe(true);
      expect(desktopIdeConfig.editorOptions.cursorSmoothCaretAnimation).toBe('on');
    });
  });

  describe('mergeEditorConfig', () => {
    it('merges overrides on top of base config', () => {
      const merged = mergeEditorConfig('web-studio', {
        liveParseDebounceMs: 200,
      });
      expect(merged.liveParseDebounceMs).toBe(200);
      // Other values should remain from base
      expect(merged.editorOptions.wordWrap).toBe('on');
      expect(merged.features.completions).toBe(true);
    });

    it('merges editor options deeply', () => {
      const merged = mergeEditorConfig('web-studio', {
        editorOptions: { fontSize: 16 },
      });
      expect(merged.editorOptions.fontSize).toBe(16);
      // Other editor options preserved
      expect(merged.editorOptions.tabSize).toBe(2);
    });

    it('merges features deeply', () => {
      const merged = mergeEditorConfig('web-studio', {
        features: { goToDefinition: true },
      });
      expect(merged.features.goToDefinition).toBe(true);
      // Other features preserved
      expect(merged.features.completions).toBe(true);
    });
  });
});
