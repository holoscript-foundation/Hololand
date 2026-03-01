/**
 * Monaco Editor Dual Configuration
 *
 * Provides preset configurations for two distinct contexts:
 * 1. Web Studio - Browser-based playground with live preview
 * 2. Desktop IDE - Full-featured desktop development environment
 *
 * Both share the HoloScript language definition but differ in
 * editor capabilities, performance budgets, and feature sets.
 */
import type * as monaco from 'monaco-editor';

export type EditorContext = 'web-studio' | 'desktop-ide';

export interface HoloEditorConfig {
  /** Monaco editor construction options */
  editorOptions: monaco.editor.IStandaloneEditorConstructionOptions;
  /** Whether to enable minimap */
  minimapEnabled: boolean;
  /** Whether to enable the diff editor */
  diffEditorEnabled: boolean;
  /** Auto-save debounce interval in ms */
  autoSaveDebounceMs: number;
  /** Live parse/validate debounce interval in ms */
  liveParseDebounceMs: number;
  /** Maximum file size to load (bytes) */
  maxFileSizeBytes: number;
  /** Features enabled for this context */
  features: {
    /** IntelliSense / autocomplete */
    completions: boolean;
    /** Inline hover documentation */
    hoverInfo: boolean;
    /** Go to definition */
    goToDefinition: boolean;
    /** Find all references */
    findReferences: boolean;
    /** Code folding */
    folding: boolean;
    /** Bracket pair colorization */
    bracketPairColorization: boolean;
    /** Code actions (quick fixes) */
    codeActions: boolean;
    /** Symbol outline */
    outline: boolean;
    /** Multi-cursor editing */
    multiCursor: boolean;
    /** Integrated terminal commands */
    terminalCommands: boolean;
    /** Git integration markers */
    gitDecorations: boolean;
    /** Diagnostic markers from LSP */
    diagnostics: boolean;
    /** Cross-file compilation targets panel */
    compilationTargets: boolean;
  };
}

/**
 * Shared editor options common to both contexts.
 */
const sharedEditorOptions: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {
  language: 'holoscript',
  theme: 'holoscript-dark',
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
  automaticLayout: true,
  tabSize: 2,
  scrollBeyondLastLine: false,
  renderLineHighlight: 'all',
  bracketPairColorization: { enabled: true },
  guides: { bracketPairs: true, indentation: true },
  suggest: { showKeywords: true, showSnippets: true },
  padding: { top: 8 },
};

/**
 * Web Studio configuration.
 *
 * Optimized for browser performance with a balanced feature set.
 * Smaller fonts, minimap enabled but compact, word wrap on for
 * narrow viewports, limited features to keep bundle size down.
 */
export const webStudioConfig: HoloEditorConfig = {
  editorOptions: {
    ...sharedEditorOptions,
    fontSize: 14,
    lineHeight: 1.6,
    minimap: { enabled: true, scale: 2 },
    wordWrap: 'on',
    // Lighter features for browser
    lightbulb: { enabled: 'off' as unknown as monaco.editor.ShowLightbulbIconMode },
    quickSuggestions: true,
    parameterHints: { enabled: true },
    formatOnPaste: false,
    formatOnType: false,
    linkedEditing: false,
    inlayHints: { enabled: 'off' as unknown as monaco.editor.ShowLightbulbIconMode },
  },
  minimapEnabled: true,
  diffEditorEnabled: false,
  autoSaveDebounceMs: 2000,
  liveParseDebounceMs: 500,
  maxFileSizeBytes: 512 * 1024, // 512 KB

  features: {
    completions: true,
    hoverInfo: true,
    goToDefinition: false,
    findReferences: false,
    folding: true,
    bracketPairColorization: true,
    codeActions: false,
    outline: false,
    multiCursor: true,
    terminalCommands: false,
    gitDecorations: false,
    diagnostics: true,
    compilationTargets: true,
  },
};

/**
 * Desktop IDE configuration.
 *
 * Full-featured editor configuration for the Electron/Tauri desktop app.
 * Larger font, all language features enabled, diff editor support,
 * integration with LSP, git decorations, and terminal commands.
 */
export const desktopIdeConfig: HoloEditorConfig = {
  editorOptions: {
    ...sharedEditorOptions,
    fontSize: 15,
    lineHeight: 1.7,
    minimap: { enabled: true, scale: 1, renderCharacters: true },
    wordWrap: 'off',
    // Full features for desktop
    lightbulb: { enabled: 'onCode' as unknown as monaco.editor.ShowLightbulbIconMode },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    parameterHints: { enabled: true, cycle: true },
    formatOnPaste: true,
    formatOnType: true,
    linkedEditing: true,
    inlayHints: { enabled: 'on' as unknown as monaco.editor.ShowLightbulbIconMode },
    // Desktop-specific
    mouseWheelZoom: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'selection',
    renderControlCharacters: true,
  },
  minimapEnabled: true,
  diffEditorEnabled: true,
  autoSaveDebounceMs: 1000,
  liveParseDebounceMs: 300,
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB

  features: {
    completions: true,
    hoverInfo: true,
    goToDefinition: true,
    findReferences: true,
    folding: true,
    bracketPairColorization: true,
    codeActions: true,
    outline: true,
    multiCursor: true,
    terminalCommands: true,
    gitDecorations: true,
    diagnostics: true,
    compilationTargets: true,
  },
};

/**
 * Get the editor configuration for a given context.
 */
export function getEditorConfig(context: EditorContext): HoloEditorConfig {
  switch (context) {
    case 'web-studio':
      return webStudioConfig;
    case 'desktop-ide':
      return desktopIdeConfig;
    default:
      return webStudioConfig;
  }
}

/**
 * Merge a partial config override on top of a context preset.
 * Useful for user preferences that override defaults.
 */
export function mergeEditorConfig(
  context: EditorContext,
  overrides: Partial<HoloEditorConfig>,
): HoloEditorConfig {
  const base = getEditorConfig(context);
  return {
    ...base,
    ...overrides,
    editorOptions: {
      ...base.editorOptions,
      ...overrides.editorOptions,
    },
    features: {
      ...base.features,
      ...overrides.features,
    },
  };
}
