/**
 * HoloScript Scene Editor Module
 *
 * Provides the Monaco-based code editor with full HoloScript language support,
 * including syntax highlighting, auto-completion, error diagnostics, and
 * live preview synchronization.
 */

export {
  SceneEditor,
  parseHoloScript,
} from './SceneEditor';

export type {
  SceneEditorConfig,
  CursorPosition,
  ParseDiagnostic,
  ParseResult,
  SceneNode,
  EditorTab,
} from './SceneEditor';

export {
  createHoloScriptLanguageDefinition,
  createHoloScriptDarkTheme,
  createHoloScriptLightTheme,
  createHoloScriptCompletionProvider,
  createHoloScriptHoverProvider,
  HOLOSCRIPT_KEYWORDS,
  HOLOSCRIPT_TRAITS,
  HOLOSCRIPT_EVENTS,
  HOLOSCRIPT_GEOMETRIES,
  HOLOSCRIPT_PROPERTIES,
} from './HoloScriptLanguage';

export type {
  MonacoLanguageDefinition,
  MonacoThemeDefinition,
} from './HoloScriptLanguage';
