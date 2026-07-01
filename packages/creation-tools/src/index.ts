/**
 * @hololand/creation-tools
 *
 * MVP Creation Tools for the HoloLand platform.
 *
 * Provides a complete suite for creating, editing, previewing, and sharing
 * HoloScript 3D scenes:
 *
 * - **Editor**: Monaco-based HoloScript editor with syntax highlighting,
 *   auto-completion, error diagnostics, and live preview sync.
 *
 * - **Preview**: Real-time Three.js 3D scene renderer with object selection,
 *   camera controls, and performance monitoring.
 *
 * - **Templates**: Curated gallery of starter scene templates (empty room,
 *   forest, city block, gallery, game arena, and more).
 *
 * - **Assets**: Categorized asset library with drag-and-drop placement and
 *   automatic HoloScript code generation.
 *
 * - **Collaboration**: Real-time collaborative editing with remote cursors,
 *   user presence, and edit synchronization.
 *
 * - **Sharing**: One-click preview URL generation (hololand.io/preview/[hash]),
 *   QR code generation, social sharing, and file export.
 *
 * @example
 * ```typescript
 * import {
 *   SceneEditor,
 *   ScenePreview,
 *   TemplateGallery,
 *   AssetLibrary,
 *   CollaborativeEditor,
 *   SceneSharing,
 * } from '@hololand/creation-tools';
 *
 * // Initialize editor
 * const editor = new SceneEditor({ container: document.getElementById('editor')! });
 * await editor.initialize();
 *
 * // Initialize 3D preview
 * const preview = new ScenePreview({ canvas: document.getElementById('canvas')! as HTMLCanvasElement });
 * await preview.initialize();
 * preview.start();
 *
 * // Load a template
 * const gallery = new TemplateGallery();
 * const template = gallery.get('forest');
 * editor.setCode(template.code);
 *
 * // Share the scene
 * const sharing = new SceneSharing();
 * const result = await sharing.shareScene(editor.getCode());
 * console.log('Preview URL:', result.previewUrl);
 * ```
 */

// Editor
export { SceneEditor, parseHoloScript } from './editor';
export type {
  SceneEditorConfig,
  CursorPosition,
  ParseDiagnostic,
  ParseResult,
  SceneNode,
  EditorTab,
} from './editor';

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
} from './editor';

export type {
  MonacoLanguageDefinition,
  MonacoThemeDefinition,
} from './editor';

// Preview
export { ScenePreview } from './preview';
export type {
  ScenePreviewConfig,
  PreviewMetrics,
  PreviewObject,
} from './preview';

// Templates
export { TemplateGallery, STARTER_TEMPLATES } from './templates';
export type {
  SceneTemplate,
  TemplateCategory,
  TemplateFilter,
} from './templates';

// Assets
export { AssetLibrary } from './assets';
export type {
  AssetDefinition,
  AssetCategory,
  DragDropEvent,
  PlacedAsset,
} from './assets';

// Collaboration
export { CollaborativeEditor } from './collaboration';
export type {
  CollaboratorInfo,
  CursorPresence,
  SelectionRange,
  EditOperation,
  CollaborationConfig,
  ConnectionStatus,
} from './collaboration';

// Sharing
export { SceneSharing } from './sharing';
export type {
  ShareResult,
  OpenGraphMetadata,
  ShareConfig,
  ExportOptions,
} from './sharing';

// Feed (sovereign consumer feed — WS-2 consume half)
export {
  WorldFeed,
  seedFeedWorlds,
  seedTemplateToFeedWorld,
  isOpenableSovereignSceneUrl,
} from './feed';
export type {
  FeedWorld,
  OpenableWorld,
  ShareLinkResult,
  ShareLinkResolver,
  StoreWorldLister,
  WorldFeedConfig,
} from './feed';

// Version
export const CREATION_TOOLS_VERSION = '1.0.0';
